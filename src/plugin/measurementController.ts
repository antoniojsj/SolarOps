import EventEmitter from "./shared/EventEmitter";
import {
  GROUP_NAME_ATTACHED,
  GROUP_NAME_DETACHED,
  VERSION
} from "./shared/constants";

import {
  Alignments,
  ExchangeStoreValues,
  NodeSelection,
  PluginNodeData,
  SurroundingSettings,
  TooltipPositions
} from "./shared/interfaces";

import { createFill } from "./measurement/fill"; // Adjusted path
import {
  appendElementsToGroup,
  isPartOfAttachedGroup
} from "./measurement/helper"; // Adjusted path
import { createLine } from "./measurement/line"; // Adjusted path
import {
  createPaddingLine,
  getPadding,
  removePaddingGroup
} from "./measurement/padding"; // Adjusted path
import { drawSpacing, getSpacing, setSpacing } from "./measurement/spacing"; // Adjusted path
import { getState } from "./measurement/store"; // Adjusted path
import { setTooltip } from "./measurement/tooltip"; // Adjusted path

// Type for note data
interface NoteData {
  text: string;
  type: string;
  color: string;
}

figma.skipInvisibleInstanceChildren = true;

// This part will be handled by SolarOps's main controller, not here.
// figma.showUI(__html__, {
//   width: 285,
//   height: 562,
//   themeColors: true,
// });

// figma.root.setRelaunchData({
//   open: '',
// });

// Add note to the canvas
export const addNote = async (noteData: NoteData) => {
  try {
    // Create a frame for the note
    const noteFrame = figma.createFrame();
    noteFrame.name = `Note: ${noteData.type}`;

    // Set the size and style
    noteFrame.resize(240, 120);
    noteFrame.fills = [
      {
        type: "SOLID",
        color: { r: 0.1, g: 0.1, b: 0.1 },
        opacity: 0.9
      }
    ];
    noteFrame.cornerRadius = 8;
    noteFrame.strokes = [
      {
        type: "SOLID",
        color: hexToRgb(noteData.color) || { r: 0.5, g: 0.5, b: 0.5 },
        opacity: 1
      }
    ];
    noteFrame.strokeWeight = 2;

    // Add a header with the note type
    const headerContainer = figma.createFrame();
    headerContainer.name = "Note Header Container";
    headerContainer.layoutMode = "HORIZONTAL";
    headerContainer.layoutSizingHorizontal = "HUG";
    headerContainer.layoutSizingVertical = "HUG";
    headerContainer.counterAxisAlignItems = "CENTER";
    headerContainer.primaryAxisAlignItems = "MIN"; // Alinha o conteúdo à esquerda
    headerContainer.paddingTop = 4;
    headerContainer.paddingBottom = 4;
    headerContainer.paddingLeft = 8;
    headerContainer.paddingRight = 8;
    headerContainer.cornerRadius = 4;
    headerContainer.layoutAlign = "INHERIT"; // Herda o alinhamento do pai
    headerContainer.fills = [
      {
        type: "SOLID",
        color: hexToRgb(noteData.color) || { r: 1, g: 1, b: 1 },
        opacity: 0.08 // 8% de opacidade
      }
    ];

    const header = figma.createText();
    await figma.loadFontAsync({ family: "Inter", style: "Bold" });
    header.name = "Note Header";
    header.characters = noteData.type.toUpperCase();
    header.fontSize = 10;
    header.letterSpacing = { value: 1, unit: "PIXELS" };
    header.textCase = "UPPER";
    header.fills = [
      {
        type: "SOLID",
        color: hexToRgb(noteData.color) || { r: 1, g: 1, b: 1 },
        opacity: 1
      }
    ];

    // Adiciona o texto ao container do cabeçalho
    headerContainer.appendChild(header);

    // Remove formatação Markdown do texto
    const removeMarkdown = (text: string): string => {
      return text
        .replace(/\*\*(.*?)\*\*/g, "$1") // Remove **negrito**
        .replace(/(?:\*|_)(.*?)(?:\*|_)/g, "$1"); // Remove *itálico* ou _itálico_
    };

    // Cria o texto da nota
    const noteText = figma.createText();
    noteText.name = "Note Content";
    noteText.characters = removeMarkdown(noteData.text);
    noteText.fontSize = 12;
    noteText.fills = [
      {
        type: "SOLID",
        color: { r: 1, g: 1, b: 1 },
        opacity: 0.9
      }
    ];
    noteText.textAutoResize = "HEIGHT";

    // Position elements
    noteFrame.layoutMode = "VERTICAL";
    noteFrame.counterAxisAlignItems = "MIN"; // Alinha itens à esquerda
    noteFrame.itemSpacing = 0; // Removido o espaçamento padrão para controlar manualmente
    noteFrame.horizontalPadding = 16;
    noteFrame.verticalPadding = 16;

    // Add elements to frame
    noteFrame.appendChild(headerContainer);

    // Adiciona um frame vazio como espaçador
    const spacer = figma.createFrame();
    spacer.name = "Spacer";
    spacer.resize(1, 24); // 24px de altura
    spacer.fills = [];
    spacer.layoutGrow = 0; // Impede que o spacer cresça

    // Configura o texto para ocupar toda a largura e alinhar à esquerda
    noteText.layoutAlign = "STRETCH";
    noteText.textAlignHorizontal = "LEFT";

    noteFrame.appendChild(spacer);
    noteFrame.appendChild(noteText);

    // Position the note near the center of the viewport
    const viewportCenter = {
      x: figma.viewport.center.x,
      y: figma.viewport.center.y
    };

    noteFrame.x = viewportCenter.x - noteFrame.width / 2;
    noteFrame.y = viewportCenter.y - noteFrame.height / 2;

    // Add to current page
    figma.currentPage.appendChild(noteFrame);

    // Select the new note
    figma.currentPage.selection = [noteFrame];

    return true;
  } catch (error) {
    console.error("Error creating note:", error);
    return false;
  }
};

// Helper function to convert hex color to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  // Remove # if present
  hex = hex.replace(/^#/, "");

  // Parse r, g, b values
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;

  return {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  };
}

export const getPluginData = (node, name) => {
  const data = node.getPluginData(name);
  if (!data) {
    return null;
  }

  return JSON.parse(data);
};

const getAllMeasurementNodes = async (
  node,
  pageId = "",
  pageName = "",
  measureData = []
) => {
  if (node.type === "PAGE") {
    pageId = node.id;
    pageName = node.name;
  }

  let type = null;
  let componentId = null;

  const storedData = node.getPluginDataKeys();

  if (node.type === "INSTANCE") {
    try {
      const mainComp = await node.getMainComponentAsync();
      componentId = mainComp ? mainComp.id : null;
    } catch (e) {
      // Main component is not available, which is fine.
    }
  }

  if (node.name === GROUP_NAME_DETACHED) {
    type = "GROUP_DETACHED";
  }
  if (node.name === GROUP_NAME_ATTACHED) {
    type = "GROUP_ATTACHED";
  }
  if (storedData.includes("padding")) {
    type = "PADDING";
  }
  if (storedData.includes("spacing")) {
    type = "SPACING";
  }
  if (storedData.includes("data")) {
    const data = node.getPluginData("data");

    if (data && data !== "{}") {
      type = "DATA";
    }
  }

  if (type) {
    measureData.push({
      pageId,
      pageName,
      type,
      componentId,
      id: node.id,
      name: node.name
    });
  }

  if ("children" in node) {
    for (const child of node.children) {
      await getAllMeasurementNodes(child, pageId, pageName, measureData);
    }
  }

  return measureData;
};

EventEmitter.answer(
  "file measurements",
  async () => await getAllMeasurementNodes(figma.root)
);

EventEmitter.answer("remove all measurements", async () => {
  const measurements = await getAllMeasurementNodes(figma.root);

  for (const measurement of measurements) {
    const node = await figma.getNodeByIdAsync(measurement.id);
    if (!node) {
      continue;
    }

    if (measurement.type.includes("GROUP_")) {
      node.remove();
    } else {
      await removeDataFromNode(node);
    }
  }

  return true;
});

const removeDataFromNode = async node => {
  if (Array.isArray(node)) {
    for (const id of node) {
      await removeDataFromNode(id);
    }
  } else {
    if (typeof node === "string") {
      node = await figma.getNodeByIdAsync(node);
    }

    try {
      const raw = node.getPluginData("data");
      const data = raw && raw !== "" ? JSON.parse(raw) : {};
      const connected = Array.isArray(data.connectedNodes)
        ? data.connectedNodes
        : [];
      for (const id of connected) {
        const rn = await figma.getNodeByIdAsync(id);
        if (rn && !rn.removed) rn.remove();
      }
    } catch (e) {
      console.log("failed to remove connected node", e);
    }

    node.setPluginData("padding", "");
    node.setPluginData("spacing", "");
    node.setPluginData("data", "{}");
    node.setPluginData("parent", "");
  }
};

// Cria um balão de anotações (propriedades) ao redor do node, em uma posição dada
export const createBalloonForNode = async (
  node: SceneNode,
  position: "left" | "right" | "top" | "bottom"
) => {
  if (!node) {
    try {
      figma.notify("Nenhum nó selecionado para criar balão.");
    } catch {}
    return;
  }
  let state: any = {};
  try {
    state = await getState();
  } catch (e) {
    state = {};
  }
  const positionMap: Record<string, TooltipPositions> = {
    left: TooltipPositions.LEFT,
    right: TooltipPositions.RIGHT,
    top: TooltipPositions.TOP,
    bottom: TooltipPositions.BOTTOM
  };

  // Garantir que os principais campos apareçam no balão
  const base = state && state.tooltip ? state.tooltip : ({} as any);
  const flags = {
    width: true,
    height: true,
    fontName: Boolean(base.fontName),
    fontSize: Boolean(base.fontSize),
    color: true,
    opacity: true,
    stroke: Boolean(base.stroke),
    cornerRadius: true,
    points: Boolean(base.points),
    name: true,
    variants: Boolean(base.variants),
    effects: Boolean(base.effects),
    onlyEffectStyle: Boolean(base.onlyEffectStyle)
  };

  let tooltip: FrameNode | GroupNode | null = null;
  try {
    tooltip = (await setTooltip(
      {
        flags,
        offset: 16,
        position: positionMap[position]
          ? positionMap[position]
          : TooltipPositions.RIGHT,
        labelPattern: state && state.labelPattern ? state.labelPattern : "",
        fontPattern: state && state.fontPattern ? state.fontPattern : "",
        backgroundColor: "#000000",
        fontColor: "#FFFFFF",
        labelFontSize: 12
      },
      node
    )) as any;
  } catch (e) {
    try {
      console.error("[measurementController] setTooltip error", e);
    } catch {}
    try {
      figma.notify("Erro ao montar balão de anotação.");
    } catch {}
    tooltip = null;
  }

  if (tooltip) {
    // anexar ao canvas e nomear; visibilidade será controlada por varredura de nomes
    try {
      figma.currentPage.appendChild(tooltip);
    } catch {}
    try {
      (tooltip as FrameNode).name = `Annotation (${position})`;
    } catch {}
    tooltip.visible = true;
  } else {
    try {
      figma.notify("Não foi possível criar o balão.");
    } catch {}
  }
};

EventEmitter.on("remove node measurement", nodeId =>
  removeDataFromNode(nodeId)
);

EventEmitter.on("notify", ({ message, options }) =>
  figma.notify(message, options)
);

EventEmitter.on("focus node", async payload => {
  console.log(payload);
  try {
    const page = (await figma.getNodeByIdAsync(payload.pageId)) as PageNode;
    await figma.setCurrentPageAsync(page);
  } catch {
    console.log("Page not found");
  }
  const node = figma.currentPage.findOne(n => n.id === payload.id);

  const padding = node.getPluginData("padding");
  const spacing = node.getPluginData("spacing");
  const toolData = node.getPluginData("data");

  console.log(
    node,
    {
      padding,
      spacing,
      toolData
    },
    node.getPluginDataKeys()
  );

  figma.currentPage.selection = [node];
  figma.viewport.scrollAndZoomIntoView([node]);
});

const getSelectionArray = async (): Promise<NodeSelection> => {
  const state = await getState();

  const nodes = [];
  const paddingNodes = [];
  const spacingNodes = [];

  for (const node of figma.currentPage.selection) {
    if (node) {
      let data = {};

      try {
        data = JSON.parse(node.getPluginData("data"));
      } catch {
        data = {};
      }

      const spacing = getSpacing(node);
      const spacings = state.detached ? 0 : Object.keys(spacing).length;
      const padding = getPadding(node);

      const x = node.x;
      const y = node.y;

      const nodeData = {
        id: node.id,
        type: node.type,
        x: x,
        y: y,
        x2: x + node.width,
        y2: y + node.height,
        width: node.width,
        height: node.height
      };

      nodes.push({
        ...nodeData,
        padding,
        hasSpacing: spacings > 0 && figma.currentPage.selection.length === 1,
        data
      });

      if (figma.currentPage.selection.length === 2) {
        paddingNodes.push({
          ...nodeData,
          padding,
          data
        });

        spacingNodes.push({
          ...nodeData,
          spacing,
          data
        });
      }
    }
  }

  return {
    nodes,
    padding: paddingNodes,
    spacing: spacingNodes
  };
};

export const sendSelection = () =>
  getSelectionArray().then(selection =>
    EventEmitter.emit<NodeSelection>("selection", selection)
  );

EventEmitter.on("resize", ({ width, height }) =>
  figma.ui.resize(width, height)
);

// Handle add-note message
EventEmitter.on("add-note", async (noteData: NoteData) => {
  const success = await addNote(noteData);
  if (!success) {
    figma.notify("Erro ao adicionar a nota. Por favor, tente novamente.");
  }
});

EventEmitter.answer("current selection", async () => getSelectionArray());

// Removed: setMeasurements (handled by original measurement module). This controller exposes discrete factories only.

let measurementNodes: SceneNode[] = [];

export const createMeasurement = async (
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  mode: "distance" | "angle" = "distance"
) => {
  const dx = endX - startX;
  const dy = endY - startY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Vetor unitário ao longo da linha e perpendicular para ticks
  const ux = distance ? dx / distance : 1;
  const uy = distance ? dy / distance : 0;
  const px = -uy; // perpendicular
  const py = ux;

  // Texto (distância ou ângulo)
  const text = figma.createText();
  try {
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    text.fontName = { family: "Inter", style: "Regular" };
  } catch {
    try {
      await figma.loadFontAsync({ family: "Roboto", style: "Regular" });
      text.fontName = { family: "Roboto", style: "Regular" } as FontName;
    } catch {}
  }
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;
  text.fontSize = 12;
  text.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
  // Garantir legibilidade
  text.blendMode = "NORMAL";
  try {
    text.effects = [
      {
        type: "DROP_SHADOW",
        radius: 1,
        color: { r: 0, g: 0, b: 0, a: 0.4 },
        offset: { x: 0, y: 1 },
        visible: true,
        blendMode: "NORMAL"
      } as any
    ];
  } catch {}
  if (mode === "angle") {
    // Ângulo relativo ao eixo X
    const angleDeg = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
    text.characters = `${angleDeg}°`;
  } else {
    text.characters = `${Math.round(distance)}px`;
  }
  // Após definir characters, width/height ficam corretos. Centralizar texto.
  text.x = midX - text.width / 2;
  text.y = midY - text.height / 2 - 14;

  // Background do texto (atrás do texto)
  const textBackground = figma.createRectangle();
  // width/height dependem dos glyphs carregados, usar fallback mínimo
  const tWidth = Math.max(20, text.width);
  const tHeight = Math.max(10, text.height);
  textBackground.resize(tWidth + 8, tHeight + 4);
  textBackground.cornerRadius = 3;
  textBackground.fills = [
    { type: "SOLID", color: { r: 0, g: 0, b: 0 }, opacity: 0.7 }
  ];
  textBackground.blendMode = "NORMAL";
  // Centraliza o fundo exatamente em relação ao texto
  textBackground.x = text.x + text.width / 2 - (tWidth + 8) / 2;
  textBackground.y = text.y + text.height / 2 - (tHeight + 4) / 2;

  // Garantir z-order: texto acima do fundo
  try {
    figma.currentPage.appendChild(textBackground);
  } catch {}
  try {
    figma.currentPage.appendChild(text);
  } catch {}

  // Calcular gap: metade do bg + margem 4px em cada lado
  const bgWidth = tWidth + 8;
  const halfGap = bgWidth / 2 + 4;

  // Linhas divididas em duas partes (antes e depois do bg)
  const leftLen = Math.max(0, distance / 2 - halfGap);
  const rightLen = Math.max(0, distance / 2 - halfGap);

  const leftVec = figma.createVector();
  leftVec.vectorPaths = [
    { windingRule: "NONE", data: `M 0 0 L ${ux * leftLen} ${uy * leftLen}` }
  ];
  leftVec.strokes = [
    {
      type: "SOLID",
      color: { r: 59 / 255, g: 130 / 255, b: 246 / 255 },
      opacity: 1
    }
  ];
  leftVec.strokeWeight = 2;
  leftVec.strokeCap = "ROUND";
  leftVec.x = midX - ux * (halfGap + leftLen);
  leftVec.y = midY - uy * (halfGap + leftLen);

  const rightVec = figma.createVector();
  rightVec.vectorPaths = [
    { windingRule: "NONE", data: `M 0 0 L ${ux * rightLen} ${uy * rightLen}` }
  ];
  rightVec.strokes = [
    {
      type: "SOLID",
      color: { r: 59 / 255, g: 130 / 255, b: 246 / 255 },
      opacity: 1
    }
  ];
  rightVec.strokeWeight = 2;
  rightVec.strokeCap = "ROUND";
  rightVec.x = midX + ux * halfGap;
  rightVec.y = midY + uy * halfGap;

  // Ticks nas pontas
  const tickSize = 6;
  const makeTick = (cx: number, cy: number) => {
    const tx = (px * tickSize) / 2;
    const ty = (py * tickSize) / 2;
    const v = figma.createVector();
    v.vectorPaths = [
      { windingRule: "NONE", data: `M ${-tx} ${-ty} L ${tx} ${ty}` }
    ];
    v.strokes = [
      {
        type: "SOLID",
        color: { r: 59 / 255, g: 130 / 255, b: 246 / 255 },
        opacity: 1
      }
    ];
    v.strokeWeight = 2;
    v.strokeCap = "ROUND";
    v.x = cx;
    v.y = cy;
    return v;
  };

  const startTick = makeTick(startX, startY);
  const endTick = makeTick(endX, endY);

  const group = figma.group(
    [leftVec, rightVec, startTick, endTick, textBackground, text],
    figma.currentPage
  );
  group.name = `Measurement (${Math.round(distance)}px)`;
  group.locked = true;
  // Garantir que fique no topo da pilha
  try {
    figma.currentPage.appendChild(group);
  } catch {}
  // Reordenar filhos: fundo atrás (index 0) e texto no topo
  try {
    if (text.parent === group) group.appendChild(text);
    if (textBackground.parent === group) group.insertChild(0, textBackground);
  } catch {}

  measurementNodes.push(group);
};

// Desenha arco de ângulo (quarter circle) nos cantos do node
export const createAnglePresetForNode = async (
  node: SceneNode,
  corner: AngleCorner,
  radius: number = 24
) => {
  const { x, y, w, h } = getNodeAbs(node as any);
  // Obter vetores base e canto real via matriz
  const m = (node as any).absoluteTransform as [
    [number, number, number],
    [number, number, number]
  ];
  const a = m[0][0],
    c = m[0][1],
    e = m[0][2];
  const b = m[1][0],
    d = m[1][1],
    f = m[1][2];
  const lenX = Math.hypot(a, b) || 1;
  const lenY = Math.hypot(c, d) || 1;
  const ux = { x: a / lenX, y: b / lenX };
  const uy = { x: c / lenY, y: d / lenY };
  const topLeft = { cx: e, cy: f };
  const topRight = { cx: e + a * w, cy: f + b * w };
  const bottomLeft = { cx: e + c * h, cy: f + d * h };
  const bottomRight = { cx: e + a * w + c * h, cy: f + b * w + d * h };
  const corners: Array<{
    key: Exclude<AngleCorner, "all">;
    cx: number;
    cy: number;
  }> = [
    { key: "top-left", cx: topLeft.cx, cy: topLeft.cy },
    { key: "top-right", cx: topRight.cx, cy: topRight.cy },
    { key: "bottom-left", cx: bottomLeft.cx, cy: bottomLeft.cy },
    { key: "bottom-right", cx: bottomRight.cx, cy: bottomRight.cy }
  ];

  const targets =
    corner === "all" ? corners : corners.filter(c => c.key === corner);
  const color = { r: 59 / 255, g: 130 / 255, b: 246 / 255 };
  const inset = 8; // 8px de distância do canto (agora para FORA)

  for (const t of targets) {
    // Sinais por canto (bissetriz): +,+ TL | -,+ TR | +,- BL | -,- BR
    let sx = 1,
      sy = 1;
    if (t.key === "top-left") {
      sx = 1;
      sy = 1;
    } else if (t.key === "top-right") {
      sx = -1;
      sy = 1;
    } else if (t.key === "bottom-left") {
      sx = 1;
      sy = -1;
    } else {
      sx = -1;
      sy = -1;
    }

    // Centro do arco para FORA do objeto: mover -inset nas direções de ux/uy
    const cx2 = t.cx - sx * ux.x * inset - sy * uy.x * inset;
    const cy2 = t.cy - sx * ux.y * inset - sy * uy.y * inset;

    // Helpers para ponto no arco (0..pi/2)
    const pointAt = (theta: number) => ({
      x:
        sx * ux.x * (Math.cos(theta) * radius) +
        sy * uy.x * (Math.sin(theta) * radius),
      y:
        sx * ux.y * (Math.cos(theta) * radius) +
        sy * uy.y * (Math.sin(theta) * radius)
    });

    // Carregar fonte e preparar label (valor do corner radius)
    const text = figma.createText();
    try {
      await figma.loadFontAsync({ family: "Inter", style: "Regular" });
      text.fontName = { family: "Inter", style: "Regular" };
    } catch {}
    let rValue = 0;
    const anyNode = node as any;
    if (
      "cornerRadius" in anyNode &&
      typeof anyNode.cornerRadius === "number" &&
      isFinite(anyNode.cornerRadius)
    ) {
      rValue = anyNode.cornerRadius || 0;
    }
    if ("topLeftRadius" in anyNode && t.key === "top-left")
      rValue = anyNode.topLeftRadius || 0;
    if ("topRightRadius" in anyNode && t.key === "top-right")
      rValue = anyNode.topRightRadius || 0;
    if ("bottomLeftRadius" in anyNode && t.key === "bottom-left")
      rValue = anyNode.bottomLeftRadius || 0;
    if ("bottomRightRadius" in anyNode && t.key === "bottom-right")
      rValue = anyNode.bottomRightRadius || 0;
    const value = `${Math.round(rValue)}px`;
    text.fontSize = 12;
    text.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
    try {
      (text as any).effects = [
        {
          type: "DROP_SHADOW",
          radius: 1,
          color: { r: 0, g: 0, b: 0, a: 0.4 },
          offset: { x: 0, y: 1 },
          visible: true,
          blendMode: "NORMAL"
        }
      ];
    } catch {}
    text.characters = value;

    // Background da label
    const bg = figma.createRectangle();
    const bw = Math.max(20, text.width);
    const bh = Math.max(10, text.height);
    bg.resize(bw + 8, bh + 4);
    bg.cornerRadius = 3;
    bg.fills = [{ type: "SOLID", color: { r: 0, g: 0, b: 0 }, opacity: 0.7 }];

    // Colocar label no meio do arco (45°), depois calculamos gap do arco
    const midTheta = Math.PI / 4; // 45°
    const mid = pointAt(midTheta);
    const lx = cx2 + mid.x;
    const ly = cy2 + mid.y;
    text.x = lx - text.width / 2;
    text.y = ly - text.height / 2;
    bg.x = text.x + text.width / 2 - (bw + 8) / 2;
    bg.y = text.y + text.height / 2 - (bh + 4) / 2;

    // Gap angular em volta da label: metade do bg + 4px em cada lado
    const halfGapLen = (bw + 8) / 2 + 4;
    const gapAngle = Math.min(halfGapLen / radius, (Math.PI / 2) * 0.4); // limitar
    const startA = 0;
    const endA = Math.PI / 2;
    const leftEnd = midTheta - gapAngle;
    const rightStart = midTheta + gapAngle;

    // Construir dois vetores para o arco dividido
    const buildPath = (from: number, to: number) => {
      const segs = 20;
      let d = "";
      for (let i = 0; i <= segs; i++) {
        const tval = i / segs;
        const a = from + (to - from) * tval;
        const p = pointAt(a);
        d += (i === 0 ? "M " : " L ") + p.x + " " + p.y;
      }
      return d;
    };

    const arc1 = figma.createVector();
    arc1.vectorPaths = [
      {
        windingRule: "NONE",
        data: buildPath(startA, Math.max(startA, leftEnd))
      }
    ];
    arc1.strokes = [{ type: "SOLID", color, opacity: 1 }];
    arc1.strokeWeight = 2;
    arc1.strokeCap = "ROUND";
    arc1.x = cx2;
    arc1.y = cy2;

    const arc2 = figma.createVector();
    arc2.vectorPaths = [
      { windingRule: "NONE", data: buildPath(Math.min(endA, rightStart), endA) }
    ];
    arc2.strokes = [{ type: "SOLID", color, opacity: 1 }];
    arc2.strokeWeight = 2;
    arc2.strokeCap = "ROUND";
    arc2.x = cx2;
    arc2.y = cy2;

    const group = figma.group([arc1, arc2, bg, text], figma.currentPage);
    group.name = `Angle (${value})`;
    group.locked = true;
    try {
      figma.currentPage.appendChild(group);
    } catch {}
    try {
      if (text.parent === group) group.appendChild(text);
      if (bg.parent === group) group.insertChild(0, bg);
    } catch {}

    measurementNodes.push(group);
  }
};

// Cria label de área para um nó
export const createAreaMeasurementForNode = async (node: SceneNode) => {
  const w = "width" in node ? node.width : 0;
  const h = "height" in node ? node.height : 0;
  const area = Math.round(w * h);

  // Centro absoluto do nó
  const m = (node as any).absoluteTransform as [
    [number, number, number],
    [number, number, number]
  ];
  const absX = m[0][2];
  const absY = m[1][2];
  const cx = absX + w / 2;
  const cy = absY + h / 2;

  const text = figma.createText();
  try {
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    text.fontName = { family: "Inter", style: "Regular" };
  } catch {}
  text.fontSize = 12;
  text.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
  text.characters = `${Math.round(w)} × ${Math.round(h)} = ${area} px²`;
  // Definir characters antes de centralizar
  // Centralizar texto no centro do nó
  text.x = cx - text.width / 2;
  text.y = cy - text.height / 2;

  const tWidth = Math.max(40, text.width);
  const tHeight = Math.max(12, text.height);
  const textBackground = figma.createRectangle();
  textBackground.resize(tWidth + 10, tHeight + 6);
  textBackground.cornerRadius = 4;
  textBackground.fills = [
    { type: "SOLID", color: { r: 0, g: 0, b: 0 }, opacity: 0.7 }
  ];
  textBackground.x = text.x + text.width / 2 - (tWidth + 10) / 2;
  textBackground.y = text.y + text.height / 2 - (tHeight + 6) / 2;

  const group = figma.group([text, textBackground], figma.currentPage);
  group.name = `Area (${area} px²)`;
  group.locked = true;
  try {
    figma.currentPage.appendChild(group);
  } catch {}
  // Reordenar: texto no topo, fundo atrás
  try {
    if (text.parent === group) group.appendChild(text);
    if (textBackground.parent === group) group.insertChild(0, textBackground);
  } catch {}
  measurementNodes.push(group);
};

export const clearMeasurements = () => {
  measurementNodes.forEach(node => {
    if (!node.removed) {
      node.remove();
    }
  });
  measurementNodes = [];
};

// Mostra/oculta todas as medições da página atual
export const setMeasurementsVisible = (visible: boolean) => {
  try {
    // Primeiro, usar o array em memória
    for (const node of measurementNodes) {
      if (!node.removed) node.visible = visible;
    }
    // Depois, varrer a página para casos criados antes/reload do plugin
    const candidates = figma.currentPage.findAll(
      n =>
        typeof n.name === "string" &&
        (n.name.startsWith("Measurement (") ||
          n.name.startsWith("Dimension (") ||
          n.name.startsWith("Area (") ||
          n.name.startsWith("Angle (") ||
          n.name.startsWith("Tooltip ") ||
          n.name.startsWith("Annotation ("))
    );
    for (const n of candidates) {
      (n as SceneNode).visible = visible;
    }
  } catch (e) {
    console.warn("[measurementController] setMeasurementsVisible error", e);
  }
};

type PresetPosition =
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "h-center"
  | "v-center";
type AngleCorner =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "all";

function getNodeAbs(node: any) {
  const m = node.absoluteTransform as [
    [number, number, number],
    [number, number, number]
  ];
  const x = m[0][2];
  const y = m[1][2];
  const w = "width" in node ? node.width : 0;
  const h = "height" in node ? node.height : 0;
  return { x, y, w, h };
}

export const createPresetMeasurementForNode = async (
  node: SceneNode,
  position: PresetPosition,
  offset = 10,
  strokeCap: StrokeCap = "NONE"
) => {
  const { x, y, w, h } = getNodeAbs(node as any);

  let startX = 0,
    startY = 0,
    endX = 0,
    endY = 0;
  let labelX = 0,
    labelY = 0;
  let labelText = "";

  if (position === "top") {
    startX = x;
    startY = y - offset;
    endX = x + w;
    endY = y - offset;
    labelX = x + w / 2;
    labelY = y - offset;
    labelText = `${Math.round(w)}px`;
  } else if (position === "bottom") {
    startX = x;
    startY = y + h + offset;
    endX = x + w;
    endY = y + h + offset;
    labelX = x + w / 2;
    labelY = y + h + offset;
    labelText = `${Math.round(w)}px`;
  } else if (position === "h-center") {
    const cy = y + h / 2;
    startX = x;
    startY = cy;
    endX = x + w;
    endY = cy;
    labelX = x + w / 2;
    labelY = cy;
    labelText = `${Math.round(w)}px`;
  } else if (position === "left") {
    startX = x - offset;
    startY = y;
    endX = x - offset;
    endY = y + h;
    labelX = x - offset;
    labelY = y + h / 2;
    labelText = `${Math.round(h)}px`;
  } else if (position === "right") {
    startX = x + w + offset;
    startY = y;
    endX = x + w + offset;
    endY = y + h;
    labelX = x + w + offset;
    labelY = y + h / 2;
    labelText = `${Math.round(h)}px`;
  } else if (position === "v-center") {
    const cx = x + w / 2;
    startX = cx;
    startY = y;
    endX = cx;
    endY = y + h;
    labelX = cx;
    labelY = y + h / 2;
    labelText = `${Math.round(h)}px`;
  }

  // Texto centralizado
  const text = figma.createText();
  try {
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    text.fontName = { family: "Inter", style: "Regular" };
  } catch {}
  text.fontSize = 12;
  text.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
  text.characters = labelText;
  text.x = labelX - text.width / 2;
  text.y = labelY - text.height / 2;

  const bg = figma.createRectangle();
  const bw = Math.max(20, text.width);
  const bh = Math.max(10, text.height);
  bg.resize(bw + 8, bh + 4);
  bg.cornerRadius = 3;
  bg.fills = [{ type: "SOLID", color: { r: 0, g: 0, b: 0 }, opacity: 0.7 }];
  bg.blendMode = "NORMAL";
  bg.x = text.x + text.width / 2 - (bw + 8) / 2;
  bg.y = text.y + text.height / 2 - (bh + 4) / 2;

  // Garantir z-order: texto acima do fundo
  try {
    figma.currentPage.appendChild(bg);
  } catch {}
  try {
    figma.currentPage.appendChild(text);
  } catch {}

  // Dividir linha em duas com gap de 4px em cada lado do bg
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;
  const dx = endX - startX;
  const dy = endY - startY;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux; // perpendicular para ticks
  const halfGap = (bw + 8) / 2 + 4;

  const leftLen = Math.max(0, len / 2 - halfGap);
  const rightLen = Math.max(0, len / 2 - halfGap);

  const leftVec = figma.createVector();
  leftVec.vectorPaths = [
    { windingRule: "NONE", data: `M 0 0 L ${ux * leftLen} ${uy * leftLen}` }
  ];
  leftVec.strokes = [
    {
      type: "SOLID",
      color: { r: 59 / 255, g: 130 / 255, b: 246 / 255 },
      opacity: 1
    }
  ];
  leftVec.strokeWeight = 2;
  leftVec.x = midX - ux * (halfGap + leftLen);
  leftVec.y = midY - uy * (halfGap + leftLen);

  const rightVec = figma.createVector();
  rightVec.vectorPaths = [
    { windingRule: "NONE", data: `M 0 0 L ${ux * rightLen} ${uy * rightLen}` }
  ];
  rightVec.strokes = [
    {
      type: "SOLID",
      color: { r: 59 / 255, g: 130 / 255, b: 246 / 255 },
      opacity: 1
    }
  ];
  rightVec.strokeWeight = 2;
  rightVec.x = midX + ux * halfGap;
  rightVec.y = midY + uy * halfGap;

  const groupNodes = [leftVec, rightVec, bg, text];

  // Definir o strokeCap para os vetores
  leftVec.strokeCap = strokeCap || "NONE";
  rightVec.strokeCap = strokeCap || "NONE";

  const group = figma.group(groupNodes, figma.currentPage);
  group.name = `Dimension (${labelText})`;
  group.locked = true;
  try {
    figma.currentPage.appendChild(group);
  } catch {}
  // Reordenar para garantir z-index correto
  try {
    if (text.parent === group) group.appendChild(text);
    if (bg.parent === group) group.insertChild(0, bg);
  } catch {}
  measurementNodes.push(group);
};

// Removed initializeMeasurementController; not needed in this consolidated controller.
