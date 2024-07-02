import OBR, { Grid, Item, Image, Metadata, Player, Theme, Fog } from "@owlbear-rodeo/sdk";
import * as Utilities from './bsUtilities';
import { Constants } from "./bsConstants";
import { AddBorderIfNoAutoDetect } from "../smokeVisionUI";
import { SMOKEMAIN } from "../smokeMain";
import { UpdateMaps } from "../tools/import";
import { toggleDoor } from "../tools/doorTool";
import { InitializeScene } from "../smokeInitializeScene";
import { OnSceneDataChange } from "../tools/smokeVisionProcess";
import { finishDrawing as FinishLineDrawing, cancelDrawing as CancelLineDrawing, undoLastPoint as UndoLinePoint } from "../tools/visionLineMode";
import { finishDrawing as FinishPolyDrawing, cancelDrawing as CancelPolyDrawing, undoLastPoint as UndoPolygonPoint } from "../tools/visionPolygonMode";
import { finishDrawing as FinishElevationDrawing, cancelDrawing as CancelElevationDrawing, undoLastPoint as UndoElevationPoint } from "../tools/elevationMode";
import { ObjectCache } from "./cache";
import SmokeWorker from "../tools/worker?worker";
import { SPECTRE } from "../spectreMain";

class BSCache
{
    // Cache Names
    static PLAYER = "PLAYER";
    static PARTY = "PARTY";
    static SCENEITEMS = "SCENEITEMS";
    static SCENELOCAL = "SCENELOCAL";
    static SCENEMETA = "SCENEMETADATA";
    static SCENEGRID = "SCENEGRID";
    static SCENEFOG = "SCENEFOG";
    static ROOMMETA = "ROOMMETADATA";

    playerId: string;
    playerColor: string;
    playerName: string;
    playerMetadata: {};
    playerRole: "GM" | "PLAYER";

    party: Player[];
    lastParty: Player[];

    fogFilled: boolean;
    fogColor: string;
    fogStroke: number;

    gridDpi: number;
    gridScale: number; // IE; 5   ft
    gridSnap: number;
    gridType: string; // IE; ft (of 5ft)

    storedMetaItems: Item[];

    baseMELDepth: number;

    sceneItems: Item[];
    sceneLocal: Item[];
    sceneSelected: string[];
    sceneMetadata: Metadata;
    sceneReady: boolean;
    sceneInitialized: boolean;

    roomMetadata: Metadata;

    theme: any;

    caches: string[];
    playerShadowCache: ObjectCache;

    localGhosts: Image[];
    snap: boolean;
    torchActive: boolean;

    previousVisionShapes: string;
    previousAutohideItems: string;
    previousPlayersWithVision: string;
    previousSize: number[] = [];
    previousVisionEnabled: boolean;
    previousMap: string;
    previousAutodetectEnabled: boolean;
    previousFowEnabled: boolean;
    previousPersistenceEnabled: boolean;
    previousFowColor: string;

    busy: boolean;
    workers: Worker[];
    workersSetup: boolean;

    toolStarted: boolean;

    //handlers
    sceneMetadataHandler?: () => void;
    sceneItemsHandler?: () => void;
    sceneLocalHandler?: () => void;
    sceneGridHandler?: () => void;
    sceneReadyHandler?: () => void;
    playerHandler?: () => void;
    partyHandler?: () => void;
    themeHandler?: () => void;
    roomHandler?: () => void;
    fogHandler?: () => void;
    throttledProcessData;

    constructor(caches: string[])
    {
        this.playerId = "";
        this.playerName = "";
        this.playerColor = "";
        this.playerMetadata = {};
        this.playerRole = "PLAYER";
        this.party = [];
        this.lastParty = [];
        this.fogFilled = false;
        this.fogColor = "#000";
        this.fogStroke = 5;
        this.storedMetaItems = [];
        this.sceneItems = [];
        this.sceneLocal = [];
        this.sceneSelected = [];
        this.sceneMetadata = {};
        this.gridDpi = 0;
        this.gridScale = 5;
        this.gridSnap = 10;
        this.gridType = "ft";
        this.sceneReady = false;
        this.sceneInitialized = false;
        this.theme = "DARK";
        this.roomMetadata = {};
        this.localGhosts = [];
        this.snap = false;
        this.busy = false;
        this.torchActive = false;
        this.toolStarted = false;
        this.baseMELDepth = 0;

        this.caches = caches;
        this.playerShadowCache = new ObjectCache(false);
        this.previousVisionShapes = "";
        this.previousAutohideItems = "";
        this.previousPlayersWithVision = "";
        this.previousSize = [];
        this.previousVisionEnabled = false;
        this.previousMap = "";
        this.previousAutodetectEnabled = false;
        this.previousFowEnabled = false;
        this.previousPersistenceEnabled = false;
        this.previousFowColor = "";
        this.workers = [];
        this.workersSetup = false;
        
        this.throttledProcessData = Utilities.ThrottleWithTrailing(OnSceneDataChange, 500);
    }

    public async RefreshCache()
    {
        if (this.caches.includes(BSCache.PLAYER))
        {
            this.playerId = await OBR.player.getId();
            this.playerName = await OBR.player.getName();
            this.playerColor = await OBR.player.getColor();
            this.playerMetadata = await OBR.player.getMetadata();
            this.playerRole = await OBR.player.getRole();
        }

        if (this.caches.includes(BSCache.PARTY))
        {
            this.party = await OBR.party.getPlayers();
        }

        if (this.caches.includes(BSCache.SCENEFOG))
        {
            if (this.sceneReady)
            {
                this.fogColor = await OBR.scene.fog.getColor();
                this.fogFilled = await OBR.scene.fog.getFilled();
            }
        }

        if (this.caches.includes(BSCache.SCENEITEMS))
        {
            if (this.sceneReady)
            {
                this.sceneItems = await OBR.scene.items.getItems();
                this.sceneLocal = await OBR.scene.local.getItems();
            }
        }

        if (this.caches.includes(BSCache.SCENEMETA))
        {
            if (this.sceneReady)
            {
                this.sceneMetadata = await OBR.scene.getMetadata();
                const savedItems = this.sceneMetadata[`${Constants.EXTENSIONID}/stored`];
                if (savedItems)
                {
                    this.storedMetaItems = savedItems as Item[];
                }
            }
        }

        if (this.caches.includes(BSCache.SCENEGRID))
        {
            if (this.sceneReady)
            {
                this.gridDpi = await OBR.scene.grid.getDpi();
                const gridScale = await OBR.scene.grid.getScale();
                this.gridScale = gridScale.parsed?.multiplier ?? 5;
                this.gridType = gridScale.parsed.unit;
            }
        }

        if (this.caches.includes(BSCache.ROOMMETA))
        {
            if (this.sceneReady) this.roomMetadata = await OBR.room.getMetadata();
        }
    }

    public async InitializeCache()
    {
        // Always Cache
        if (import.meta.hot)
        {
            import.meta.hot.accept();
            import.meta.hot.dispose(() =>
            {
                // Terminate existing workers if we're in a hot relaod
                this.workers.forEach(worker => worker.terminate());
            });
        }
        this.CreateWorkers();
        this.sceneReady = await OBR.scene.isReady();
        this.theme = await OBR.theme.getTheme();

        Utilities.SetThemeMode(this.theme, document);

        if (this.caches.includes(BSCache.PLAYER))
        {
            this.playerId = await OBR.player.getId();
            this.playerName = await OBR.player.getName();
            this.playerColor = await OBR.player.getColor();
            this.playerMetadata = await OBR.player.getMetadata();
            this.playerRole = await OBR.player.getRole();
        }

        if (this.caches.includes(BSCache.PARTY))
        {
            this.party = await OBR.party.getPlayers();
        }

        if (this.caches.includes(BSCache.SCENEFOG))
        {
            if (this.sceneReady)
            {
                this.fogColor = await OBR.scene.fog.getColor();
                this.fogFilled = await OBR.scene.fog.getFilled();
            }
        }

        if (this.caches.includes(BSCache.SCENEITEMS))
        {
            if (this.sceneReady)
            {
                this.sceneItems = await OBR.scene.items.getItems();
                this.sceneLocal = await OBR.scene.local.getItems();
            }
        }

        if (this.caches.includes(BSCache.SCENEMETA))
        {
            if (this.sceneReady)
            {
                this.sceneMetadata = await OBR.scene.getMetadata();
                const savedItems = this.sceneMetadata[`${Constants.EXTENSIONID}/stored`];
                if (savedItems)
                {
                    this.storedMetaItems = savedItems as Item[];
                }
            }
        }

        if (this.caches.includes(BSCache.SCENEGRID))
        {
            if (this.sceneReady)
            {
                this.gridDpi = await OBR.scene.grid.getDpi();
                const gridScale = await OBR.scene.grid.getScale();
                this.gridScale = gridScale.parsed?.multiplier ?? 5;
                this.gridType = gridScale.parsed.unit;
            }
        }

        if (this.caches.includes(BSCache.ROOMMETA))
        {
            if (this.sceneReady) this.roomMetadata = await OBR.room.getMetadata();
        }

        // This broadcast channel is solely being used to listen for Persistence Reset calls from the GM(s).
        const broadcastHandler = OBR.broadcast.onMessage(Constants.RESETID, async (data) =>
        {
            if (data.data)
            {
                await SMOKEMAIN.ResetPersistence();
            }
        });

        const elevationHandler = OBR.broadcast.onMessage(`${Constants.EXTENSIONID}/ELEVATIONEVENT`, (data) =>
        {
            switch (data.data)
            {
                case "CANCEL": CancelElevationDrawing();
                    break;
                case "FINISH": FinishElevationDrawing();
                    break;
                case "UNDO": UndoElevationPoint();
                    break;
                default:
                    break;
            }
        });

        const lineHandler = OBR.broadcast.onMessage(`${Constants.EXTENSIONID}/LINEEVENT`, (data) =>
        {
            switch (data.data)
            {
                case "CANCEL": CancelLineDrawing();
                    break;
                case "FINISH": FinishLineDrawing();
                    break;
                case "UNDO": UndoLinePoint();
                    break;
                default:
                    break;
            }
        });

        const polyHandler = OBR.broadcast.onMessage(`${Constants.EXTENSIONID}/POLYGONEVENT`, (data) =>
        {
            switch (data.data)
            {
                case "CANCEL": CancelPolyDrawing();
                    break;
                case "FINISH": FinishPolyDrawing();
                    break;
                case "UNDO": UndoPolygonPoint();
                    break;
                default:
                    break;
            }
        });

        await this.SaveUserToScene();
    }

    public CreateWorkers()
    {
        const maxWorkers = 16;
        const workerTotal = Math.min(navigator.hardwareConcurrency ?? 1, maxWorkers);

        for (let i = 0; i < workerTotal; i++)
        {
            const worker = new SmokeWorker();
            this.workers.push(worker);
        }
    }

    public async SaveUserToScene()
    {
        // Safeguard this from loops
        await OBR.scene.setMetadata({
            [`${Constants.EXTENSIONID}/USER-${this.playerId}`]:
            {
                role: this.playerRole,
                name: this.playerName,
                color: this.playerColor
            }
        });
    }

    public KillHandlers()
    {
        if (this.caches.includes(BSCache.SCENEMETA) && this.sceneMetadataHandler !== undefined) this.sceneMetadataHandler!();
        if (this.caches.includes(BSCache.SCENEITEMS) && this.sceneItemsHandler !== undefined) this.sceneItemsHandler!();
        if (this.caches.includes(BSCache.SCENEITEMS) && this.sceneLocalHandler !== undefined) this.sceneLocalHandler!();
        if (this.caches.includes(BSCache.SCENEGRID) && this.sceneGridHandler !== undefined) this.sceneGridHandler!();
        if (this.caches.includes(BSCache.PLAYER) && this.playerHandler !== undefined) this.playerHandler!();
        if (this.caches.includes(BSCache.PARTY) && this.partyHandler !== undefined) this.partyHandler!();
        if (this.caches.includes(BSCache.ROOMMETA) && this.roomHandler !== undefined) this.roomHandler!();
        if (this.caches.includes(BSCache.SCENEFOG) && this.fogHandler !== undefined) this.fogHandler!();

        if (this.themeHandler !== undefined) this.themeHandler!();
    }

    public SetupHandlers()
    {
        if (this.sceneMetadataHandler === undefined || this.sceneMetadataHandler.length === 0)
        {
            if (this.caches.includes(BSCache.SCENEMETA))
            {
                this.sceneMetadataHandler = OBR.scene.onMetadataChange(async (metadata) =>
                {
                    this.sceneMetadata = metadata;
                    await this.OnSceneMetadataChanges(metadata);
                });
            }
        }

        if (this.sceneItemsHandler === undefined || this.sceneItemsHandler.length === 0)
        {
            if (this.caches.includes(BSCache.SCENEITEMS))
            {
                this.sceneItemsHandler = OBR.scene.items.onChange(async (items) =>
                {
                    // Store the items first, as subsequent calls throughout will check the cache.
                    this.sceneItems = items;
                    await this.OnSceneItemsChange(items);
                });

                // Smoke uses Local A lot
                this.sceneLocalHandler = OBR.scene.local.onChange(async (localItems) =>
                {
                    this.sceneLocal = localItems;
                    await this.OnSceneLocalChange(localItems);
                });
            }
        }

        if (this.sceneGridHandler === undefined || this.sceneGridHandler.length === 0)
        {
            if (this.caches.includes(BSCache.SCENEGRID))
            {
                this.sceneGridHandler = OBR.scene.grid.onChange(async (grid) =>
                {
                    await this.OnSceneGridChange(grid);
                    this.gridDpi = grid.dpi;
                    this.gridScale = parseInt(grid.scale);
                });
            }
        }

        if (this.playerHandler === undefined || this.playerHandler.length === 0)
        {
            if (this.caches.includes(BSCache.PLAYER))
            {
                this.playerHandler = OBR.player.onChange(async (player) =>
                {
                    const oldRole = this.playerRole;
                    let updateScenePlayerData = false;
                    if (this.playerName !== player.name
                        || this.playerColor !== player.color
                        || this.playerRole !== player.role)
                    {
                        updateScenePlayerData = true;
                    }

                    this.playerName = player.name;
                    this.playerColor = player.color;
                    this.playerId = player.id;
                    this.playerRole = player.role;
                    this.playerMetadata = player.metadata;
                    await this.OnPlayerChange(player, oldRole);

                    if (updateScenePlayerData)
                    {
                        await this.SaveUserToScene();
                    }
                });
            }
        }

        if (this.partyHandler === undefined || this.partyHandler.length === 0)
        {
            if (this.caches.includes(BSCache.PARTY))
            {
                this.partyHandler = OBR.party.onChange(async (party) =>
                {
                    this.party = party.filter(x => x.id !== "");
                    await this.OnPartyChange(party);
                });
            }
        }

        if (this.roomHandler === undefined || this.roomHandler.length === 0)
        {
            if (this.caches.includes(BSCache.ROOMMETA))
            {
                this.roomHandler = OBR.room.onMetadataChange(async (metadata) =>
                {
                    await this.OnRoomMetadataChange(metadata);
                    this.roomMetadata = metadata;
                });
            }
        }

        if (this.fogHandler === undefined || this.fogHandler.length === 0)
        {
            if (this.caches.includes(BSCache.ROOMMETA))
            {
                this.fogHandler = OBR.scene.fog.onChange(async (fog) =>
                {
                    await this.OnFogChange(fog);
                    this.fogColor = fog.style.color;
                    this.fogFilled = fog.filled;
                });
            }
        }

        if (this.themeHandler === undefined)
        {
            this.themeHandler = OBR.theme.onChange(async (theme) =>
            {
                this.theme = theme.mode;
                await this.OnThemeChange(theme);
            });
        }

        // Only setup if we don't have one, never kill
        if (this.sceneReadyHandler === undefined)
        {
            this.sceneReadyHandler = OBR.scene.onReadyChange(async (ready) =>
            {
                this.sceneReady = ready;

                if (ready)
                {
                    await this.SaveUserToScene();
                    await this.RefreshCache();
                }
                else
                {
                    SPECTRE.ClearGhostList();
                    this.KillHandlers();

                    this.toolStarted = false;
                    await OBR.tool.setMetadata(`${Constants.EXTENSIONID}/vision-tool`,
                        {
                            [`${Constants.EXTENSIONID}/elevationEditor`]: false
                        });

                    this.sceneItems = [];
                    this.sceneMetadata = {};
                }
                await this.OnSceneReadyChange(ready);
            });
        }
    }

    public async OnSceneMetadataChanges(metadata: Metadata)
    {
        this.baseMELDepth = metadata[`${Constants.EXTENSIONID}/defaultMELDepth`] as number ?? 0;
        if (this.playerRole === "GM")
        {
            await AddBorderIfNoAutoDetect();
        }
        await OnSceneDataChange();
    }


    public async OnSceneItemsChange(_items: Item[])
    {
        if (this.playerRole === "GM")
        {
            await SMOKEMAIN.UpdateUI();
            await UpdateMaps(SMOKEMAIN.mapAlign!);
        }
        else
        {
            SMOKEMAIN.UpdatePlayerVisionList();
        }
        //await OnSceneDataChange();
        this.throttledProcessData();
    }

    public async OnSceneLocalChange(_items: Item[])
    {
        SPECTRE.debouncedLocalChanges(BSCACHE.sceneLocal);
    }

    public async OnSceneGridChange(_grid: Grid)
    {
        await OnSceneDataChange();
    }

    public async OnSceneReadyChange(ready: boolean)
    {
        if (ready)
        {
            //Turn off all handlers before Initializing a scene to avoid triggering updates with race conditions
            await InitializeScene();
            this.SetupHandlers();
            await OnSceneDataChange();

            if (this.playerRole === "GM")
            {
                await AddBorderIfNoAutoDetect();
            }
        }
        else
        {
            if (this.playerRole === "GM")
            {
                this.sceneInitialized = false;
                await SMOKEMAIN.UpdateUI();
            }
        }
    }

    public async OnPlayerChange(player: Player, oldRole: string)
    {
        if (this.playerRole !== oldRole)
        {
            await SMOKEMAIN.SoftReset();
            if (player.role === "GM")
            {
                await OBR.action.setHeight(510);
                await OBR.action.setWidth(420);
            }
            else
            {
                SMOKEMAIN.UpdatePlayerVisionList();
            }

        }

        const tokens = document.querySelectorAll(".token-table-entry");
        for (let token of tokens)
        {
            let tokenId = token.id.substring(3);
            if (player.selection !== undefined && player.selection.includes(tokenId))
            {
                token.classList.add("token-table-selected");
            } else
            {
                token.classList.remove("token-table-selected");
            }
        }

        if (player.selection !== undefined && player.selection.length === 1)
        {
            toggleDoor(player.selection[0]);
        }

        const metadata = player.metadata as Metadata;
        const lineToolMeta = metadata[`${Constants.EXTENSIONID}/finishLine`] ?? false;
        if (lineToolMeta === true)
        {
            FinishLineDrawing();
        }
        const lineToolMetaOther = metadata[`${Constants.EXTENSIONID}/cancelLine`] ?? false;
        if (lineToolMetaOther === true)
        {
            CancelLineDrawing();
        }

        const polyToolMeta = metadata[`${Constants.EXTENSIONID}/finishPoly`] ?? false;
        if (polyToolMeta === true)
        {
            FinishPolyDrawing();
        }
        const polyToolMetaOther = metadata[`${Constants.EXTENSIONID}/cancelPoly`] ?? false;
        if (polyToolMetaOther === true)
        {
            CancelPolyDrawing();
        }
    }

    public async OnPartyChange(_party: Player[])
    {
        if (this.playerRole === "PLAYER")
        {

        }
        else
        {
            const playerContextMenu = document.getElementById("playerListing")!;
            playerContextMenu.innerHTML = "";
            playerContextMenu.appendChild(SMOKEMAIN.GetEmptyContextItem());

            for (const player of this.party)
            {
                const listItem = document.createElement("li");
                listItem.id = player.id;
                listItem.textContent = player.name;
                listItem.style.color = player.color;
                playerContextMenu.appendChild(listItem);
            }
            SPECTRE.UpdateSpectreTargets();
            SMOKEMAIN.UpdatePlayerProcessUI();
        }
    }

    public async OnFogChange(_fog: Fog)
    {
    }

    public async OnRoomMetadataChange(_metadata: Metadata)
    {
    }

    public async OnThemeChange(theme: Theme)
    {
        Utilities.SetThemeMode(theme, document);
    }

    public async ToggleBusy(on: boolean)
    {
        await OBR.action.setBadgeText(on ? "⏱️" : undefined);
        BSCACHE.busy = on;
    }
}
// Set the handlers needed for this Extension
export const BSCACHE = new BSCache([BSCache.SCENEITEMS, BSCache.SCENEMETA, BSCache.SCENEFOG, BSCache.SCENEGRID, BSCache.PLAYER, BSCache.PARTY]);

