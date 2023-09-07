import "./css/style.css";
import OBR, { Image, Shape, buildShape } from "@owlbear-rodeo/sdk";
import { sceneCache } from './utilities/globals';
import { isBackgroundBorder, isBackgroundImage, isTokenWithVision, isVisionFog } from './utilities/itemFilters';
import { setupContextMenus, createActions, createMode, createTool, onSceneDataChange } from './tools/visionTool';
import { Constants } from "./utilities/constants";

// Create the extension page


// Find all Page Elements
const app = document.getElementById('app')! as HTMLDivElement;
app.innerHTML = `
  <div>
    <div>
      <div class="title">Smoke! x Dynamic Fog&nbsp;&nbsp;</div>
      <input type="checkbox" id="vision_checkbox" class="large">
    </div>
    <hr>
    <div style="text-align: center;">
      <p><span id="map_size">Boundary Size: 
      <input type="number" id="mapWidth" name="Width" min="10" max="500"/> x 
      <input type="number" id="mapHeight" name="Height" min="10" max="500"/>
      <input type="button" id="mapSubmit" value="Update"/></span></p>
      <hr>
      <div class="visionTitle">Vision Radius</div>
      <p id="no_tokens_message">Enable vision on your character tokens.</p>
      <div id="token_list_div" style="display: block;">
        <table style="margin: auto; padding: 0;"><tbody id="token_list">
        </tbody></table>
      </div>
      </div>
    <div id="debug_div" style="display: none;">
      <br><hr><br>
      <h2>Debug</h2>
      <h3>Performance Info</h3>
      <ul>
        <li><p>Compute time: <span id=compute_time>N/A</span></p></li>
        <li><p>Communication time: <span id=communication_time>N/A</span></p></li>
        <li><p>Cache hits/misses: <span id=cache_hits>?</span>/<span id=cache_misses>?</span></p></li>
      </ul>
    </div>
  </div>
`;
app.style.textAlign = "left";
app.parentElement!.style.placeItems = "start";

const visionCheckbox = document.getElementById("vision_checkbox")! as HTMLInputElement;
const table = document.getElementById("token_list")! as HTMLDivElement;
const message = document.getElementById("no_tokens_message")! as HTMLParagraphElement;
const mapHeight = document.getElementById("mapHeight")! as HTMLInputElement;
const mapWidth = document.getElementById("mapWidth")! as HTMLInputElement;
const mapSubmit = document.getElementById("mapSubmit")! as HTMLInputElement;
// const snapSense = document.getElementById("snapSense")! as HTMLInputElement;
// const snapSubmit = document.getElementById("snapSubmit")! as HTMLInputElement;
    //   <span id="snap_degree">Snap Sensitity (1-10):
    //   <input type="number" id="snapSense" name="Snap" value="10" min="1" max="10"/>
    //   <input type="button" id="snapSubmit" value="Update"/></span></p>

async function setButtonHandler()
{
    // The visionCheckbox element is responsible for toggling vision updates
    visionCheckbox.addEventListener("click", async (event: MouseEvent) =>
    {
        if (!sceneCache.ready || !event.target)
        {
            event.preventDefault();
            return;
        }

        const target = event.target as HTMLInputElement;
        await OBR.scene.setMetadata({ [`${Constants.EXTENSIONID}/visionEnabled`]: target.checked });
    }, false);
}

function updateUI(items: Image[])
{
    const playersWithVision = items.filter(isTokenWithVision);

    if (sceneCache.metadata)
        visionCheckbox.checked = sceneCache.metadata[`${Constants.EXTENSIONID}/visionEnabled`] == true;

    if (playersWithVision.length > 0)
        message.style.display = "none";
    else
        message.style.display = "block";

    const tokenTableEntries = document.getElementsByClassName("token-table-entry");
    const toRemove = [];
    for (const token of tokenTableEntries)
    {
        const tokenId = token.id.slice(3);
        if (playersWithVision.find(player => player.id === tokenId) === undefined)
            toRemove.push(token);
    }
    for (const token of toRemove)
        token.remove();

    for (const player of playersWithVision)
    {
        const tr = document.getElementById(`tr-${player.id}`);
        if (tr)
        {
            // Update with current information
            const name = tr.getElementsByClassName("token-name")[0] as HTMLTableRowElement;
            const rangeInput = tr.getElementsByClassName("token-vision-range")[0] as HTMLInputElement;
            const unlimitedCheckbox = tr.getElementsByClassName("unlimited-vision")[0] as HTMLInputElement;

            if (name) name.innerText = player.name;
            if (rangeInput)
            {
                if (!unlimitedCheckbox.checked)
                    rangeInput.value = player.metadata[`${Constants.EXTENSIONID}/visionRange`] ? player.metadata[`${Constants.EXTENSIONID}/visionRange`] as string : Constants.VISIONDEFAULT;
            }
            if (unlimitedCheckbox)
            {
                unlimitedCheckbox.checked = !player.metadata[`${Constants.EXTENSIONID}/visionRange`];
            }
            if (unlimitedCheckbox.checked)
                rangeInput.setAttribute("disabled", "disabled");
            else
                rangeInput.removeAttribute("disabled");
        }
        else
        {
            // Create new item for this token
            const newTr = document.createElement("tr");
            newTr.id = `tr-${player.id}`;
            newTr.className = "token-table-entry";
            newTr.innerHTML = `<td class="token-name">${player.name}</td><td><input class="token-vision-range" type="number" value=${Constants.VISIONDEFAULT}><span class="unit">ft</span></td><td>&nbsp;&nbsp;&infin;&nbsp<input type="checkbox" class="unlimited-vision"></td>`;
            table.appendChild(newTr);

            // Register event listeners
            const rangeInput = newTr.getElementsByClassName("token-vision-range")[0] as HTMLInputElement;
            const unlimitedCheckbox = newTr.getElementsByClassName("unlimited-vision")[0] as HTMLInputElement;
            rangeInput.addEventListener("change", async event =>
            {
                if (!event || !event.target) return;

                const target = event.target as HTMLInputElement;
                const value = parseInt(target.value);
                if (value < 0)
                    target.value = "0";
                if (value > 999)
                    target.value = "999";
                await OBR.scene.items.updateItems([player], items =>
                {
                    items[0].metadata[`${Constants.EXTENSIONID}/visionRange`] = value;
                });
            }, false);
            unlimitedCheckbox.addEventListener("click", async event =>
            {
                if (!event || !event.target) return;

                let value = 0;
                const target = event.target as HTMLInputElement;
                if (target.checked)
                    rangeInput.setAttribute("disabled", "disabled");
                else
                {
                    value = parseInt(rangeInput.value);
                    rangeInput.removeAttribute("disabled");
                }
                await OBR.scene.items.updateItems([player], items =>
                {
                    items[0].metadata[`${Constants.EXTENSIONID}/visionRange`] = value;
                });
            }, false);
        }
    }
}

async function initScene(playerRole: string): Promise<void>
{
    let fogFilled, fogColor;
    [sceneCache.items, sceneCache.metadata, sceneCache.gridDpi, sceneCache.gridScale, fogFilled, fogColor] = await Promise.all([
        OBR.scene.items.getItems() as Promise<Image[]>,
        OBR.scene.getMetadata(),
        OBR.scene.grid.getDpi(),
        OBR.scene.grid.getScale(),
        OBR.scene.fog.getFilled(),
        OBR.scene.fog.getColor()
    ]);
    await OBR.scene.items.deleteItems(sceneCache.items.filter(isVisionFog).map(x => x.id));

    sceneCache.gridScale = sceneCache.gridScale.parsed.multiplier;
    sceneCache.fog = { filled: fogFilled, style: { color: fogColor, strokeWidth: 5 } };

    let image = undefined;
    if (sceneCache.items.filter(isBackgroundImage).length == 0)
    {
        // If no scene map is cached, query all of the maps available and choose the biggest.
        const images = sceneCache.items.filter(item => item.layer == "MAP" && item.type == "IMAGE");
        const areas = images.map(image => image.image.width * image.image.height / Math.pow(image.grid.dpi, 2));
        image = images[areas.indexOf(Math.max(...areas))];
    }

    let drawing = undefined;
    if (sceneCache.items.filter(isBackgroundBorder).length == 0)
    {
        drawing = buildShape().width(sceneCache.gridDpi * 30).height(sceneCache.gridDpi * 30).shapeType("RECTANGLE").visible(true).locked(false).strokeColor("pink").fillOpacity(0).strokeDash([200, 500]).strokeWidth(50).build() as any;
        drawing.metadata[`${Constants.EXTENSIONID}/isBackgroundImage`] = true;
        drawing.id = Constants.GRIDID;
        sceneCache.items.push(drawing);
    }

    if (playerRole == "GM")
    {
        if (drawing)
        {
            await OBR.scene.items.addItems([drawing]);
        }
        mapSubmit.onclick = async () =>
        {
            await OBR.scene.items.updateItems([Constants.GRIDID], items =>
                {
                    for (const item of items)
                    {
                        const shape = item as Shape;
                        shape.width = (sceneCache.gridDpi * (+mapWidth.value));
                        shape.height = (sceneCache.gridDpi * (+mapHeight.value));
                    }
                });
        };
        // snapSubmit.onclick = async () =>
        // {
        //     sceneCache.gridSnap = (11 - +snapSense.value) * .1;
        // };

        updateUI(sceneCache.items);

        // If an image is decided on, update it's metadata to be the chosen one
        if (image !== undefined)
        {
            await OBR.scene.items.updateItems([image], items =>
            {
                items[0].metadata[`${Constants.EXTENSIONID}/isBackgroundImage`] = true;
            });
        }
    }
}

// Setup extension add-ons
OBR.onReady(async () =>
{
    await OBR.player.getRole().then(async value =>
    {
        // Allow the extension to load for any player
        // This is now needed because each player updates their own
        // local fog paths.
        if (value == "GM")
        {
            sceneCache.role = "GM";
            await setButtonHandler();
            await setupContextMenus();
            await createTool();
            await createMode();
            createActions();
        }

        OBR.scene.fog.onChange(fog =>
        {
            sceneCache.fog = fog;
        });

        OBR.scene.items.onChange(items =>
        {
            const iItems = items as Image[];
            sceneCache.items = iItems;
            if (sceneCache.ready)
            {
                if (value == "GM") updateUI(iItems);
                onSceneDataChange();
            }
        });

        sceneCache.userId = await OBR.player.getId();
        sceneCache.players = await OBR.party.getPlayers();
        OBR.party.onChange(players =>
        {
            sceneCache.players = players;
        });

        OBR.scene.grid.onChange(grid =>
        {
            sceneCache.gridDpi = grid.dpi;
            sceneCache.gridScale = parseInt(grid.scale);
            if (sceneCache.ready)
                onSceneDataChange();
        });

        OBR.scene.onMetadataChange(metadata =>
        {
            sceneCache.metadata = metadata;
            if (sceneCache.ready)
                onSceneDataChange();
        });

        OBR.scene.onReadyChange(ready =>
        {
            sceneCache.ready = ready;
            if (ready)
            {
                initScene(value);
                onSceneDataChange();
            }
            else if (value == "GM")
                updateUI([]);
        });

        sceneCache.ready = await OBR.scene.isReady();
        if (sceneCache.ready)
        {
            initScene(value);
            onSceneDataChange();
        }
        else if (value == "GM")
            updateUI([]);
    }
    )
});