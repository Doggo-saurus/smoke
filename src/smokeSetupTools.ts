import OBR from "@owlbear-rodeo/sdk";
import { lineMode } from "./tools/visionLineMode";
import { polygonMode } from "./tools/visionPolygonMode";
import { brushMode } from "./tools/visionBrushMode";
import { Constants } from "./utilities/bsConstants";
import { elevationMode } from "./tools/elevationMode";

export async function SetupTools(): Promise<void>
{
    // This is the tool the extension offers to draw vision liens
    await OBR.tool.create({
        id: `${Constants.EXTENSIONID}/vision-tool`,
        icons: [
            {
                icon: "/icon.svg",
                label: "Setup Vision",
            },
        ],
        defaultMetadata: { [`${Constants.EXTENSIONID}/elevationEditor`]: false },
        async onClick()
        {
            await OBR.tool.activateTool(`${Constants.EXTENSIONID}/vision-tool`);
            // Default metadata doesn't change the state per tool click,
            // so forcefully resetting or it'll blank the metadata grab
            await OBR.tool.setMetadata(`${Constants.EXTENSIONID}/vision-tool`,
                {
                    [`${Constants.EXTENSIONID}/elevationEditor`]: false
                });
        },
    });

    // Create "add polygon" mode
    await OBR.tool.createMode({
        id: `${Constants.EXTENSIONID}/add-vision-polygon-mode`,
        icons: [
            {
                icon: "/object.svg",
                label: "Add Obstruction Object",
                filter: {
                    activeTools: [`${Constants.EXTENSIONID}/vision-tool`],
                },
            },
        ],
        onToolDown: polygonMode.onToolClick,
        onToolMove: polygonMode.onToolMove,
        onKeyDown: polygonMode.onKeyDown,
        preventDrag: { dragging: false }
    });

    // Create "add line" mode
    await OBR.tool.createMode({
        id: `${Constants.EXTENSIONID}/add-vision-line-mode`,
        icons: [
            {
                icon: "/line.svg",
                label: "Add Obstruction Line",
                filter: {
                    activeTools: [`${Constants.EXTENSIONID}/vision-tool`],
                },
            },
        ],
        onToolDown: lineMode.onToolClick, // Tool 'click' is slightly less responsive compared to check for the down state, clearly this wont allow dragging
        onToolMove: lineMode.onToolMove,
        onKeyDown: lineMode.onKeyDown,
        preventDrag: { dragging: false }
    });

    // Create "brush" mode
    await OBR.tool.createMode({
        id: `${Constants.EXTENSIONID}/add-vision-brush-mode`,
        icons: [
            {
                icon: "/brush.svg",
                label: "Paint Obstructions by Grid",
                filter: {
                    activeTools: [`${Constants.EXTENSIONID}/vision-tool`],
                },
            },
        ],
        onToolDown: brushMode.onActivate,
        onToolUp: brushMode.onDeactivate,
        onToolDragStart: brushMode.onDragStart,
        onToolDragMove: brushMode.onDragMove,
        onToolDragEnd: brushMode.onDragEnd,
        onToolDragCancel: brushMode.onDragCancel,
    });

    // Create "Elevation" mode
    await OBR.tool.createMode({
        id: `${Constants.EXTENSIONID}/enter-elevation-mode-1`,
        icons: [
            {
                icon: "/mountain1.svg",
                label: "Create Map Elevation Layer-1",
                filter: {
                    activeTools: [`${Constants.EXTENSIONID}/vision-tool`],
                },
            },
        ],
        disabled:
        {
            metadata: [{ key: [`${Constants.EXTENSIONID}/elevationEditor`], value: false }]
        },
        onToolDown: (context, event) => { elevationMode.onToolClick(context, event, 1) },
        onToolMove: elevationMode.onToolMove,
        onKeyDown: (context, event) => { elevationMode.onKeyDown(context, event, 1) },
        preventDrag: { dragging: true }
    });
    await OBR.tool.createMode({
        id: `${Constants.EXTENSIONID}/enter-elevation-mode-2`,
        icons: [
            {
                icon: "/mountain2.svg",
                label: "Create Map Elevation Layer-2",
                filter: {
                    activeTools: [`${Constants.EXTENSIONID}/vision-tool`],
                },
            },
        ],
        disabled:
        {
            metadata: [{ key: [`${Constants.EXTENSIONID}/elevationEditor`], value: false }]
        },
        onToolDown: (context, event) => { elevationMode.onToolClick(context, event, 2) },
        onToolMove: elevationMode.onToolMove,
        onKeyDown: (context, event) => { elevationMode.onKeyDown(context, event, 2) },
        preventDrag: { dragging: true }
    });
    await OBR.tool.createMode({
        id: `${Constants.EXTENSIONID}/enter-elevation-mode-3`,
        icons: [
            {
                icon: "/mountain3.svg",
                label: "Create Map Elevation Layer-3",
                filter: {
                    activeTools: [`${Constants.EXTENSIONID}/vision-tool`],
                },
            },
        ],
        disabled:
        {
            metadata: [{ key: [`${Constants.EXTENSIONID}/elevationEditor`], value: false }]
        },
        onToolDown: (context, event) => { elevationMode.onToolClick(context, event, 3) },
        onToolMove: elevationMode.onToolMove,
        onKeyDown: (context, event) => { elevationMode.onKeyDown(context, event, 3) },
        preventDrag: { dragging: true }
    });
    await OBR.tool.createMode({
        id: `${Constants.EXTENSIONID}/enter-elevation-mode-4`,
        icons: [
            {
                icon: "/mountain4.svg",
                label: "Create Map Elevation Layer-4",
                filter: {
                    activeTools: [`${Constants.EXTENSIONID}/vision-tool`],
                },
            },
        ],
        disabled:
        {
            metadata: [{ key: [`${Constants.EXTENSIONID}/elevationEditor`], value: false }]
        },
        onToolDown: (context, event) => { elevationMode.onToolClick(context, event, 4) },
        onToolMove: elevationMode.onToolMove,
        onKeyDown: (context, event) => { elevationMode.onKeyDown(context, event, 4) },
        preventDrag: { dragging: true }
    });
    await OBR.tool.createMode({
        id: `${Constants.EXTENSIONID}/enter-elevation-mode-5`,
        icons: [
            {
                icon: "/mountain5.svg",
                label: "Create Map Elevation Layer-5",
                filter: {
                    activeTools: [`${Constants.EXTENSIONID}/vision-tool`],
                },
            },
        ],
        disabled:
        {
            metadata: [{ key: [`${Constants.EXTENSIONID}/elevationEditor`], value: false }]
        },
        onToolDown: (context, event) => { elevationMode.onToolClick(context, event, 5) },
        onToolMove: elevationMode.onToolMove,
        onKeyDown: (context, event) => { elevationMode.onKeyDown(context, event, 5) },
        preventDrag: { dragging: true }
    });

    await OBR.tool.createAction({
        id: `${Constants.EXTENSIONID}/enter-elevation-mode`,
        icons: [
            {
                icon: "/eyeclosed.svg",
                label: "Activate Elevation Editor",
                filter: {
                    activeTools: [`${Constants.EXTENSIONID}/vision-tool`],
                    metadata: [{ key: [`${Constants.EXTENSIONID}/elevationEditor`], value: true, operator: "!=" }]
                },
            },
            {
                icon: "/eyeopen.svg",
                label: "De-Activate Elevation Editor",
                filter: {
                    activeTools: [`${Constants.EXTENSIONID}/vision-tool`],
                    metadata: [{ key: [`${Constants.EXTENSIONID}/elevationEditor`], value: true, operator: "==" }]
                },
            },
        ],
        onClick: elevationMode.enterEditMode,
    });
}

