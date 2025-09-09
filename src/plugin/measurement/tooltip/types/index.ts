import { SetTooltipOptions, TooltipSettings } from "../../../shared/interfaces";
import { createTooltipTextNode } from "../../helper";

import { cornerRadius } from "./parts/cornerRadius";
import { effects } from "./parts/effects";
import { fills } from "./parts/fills";
import { fontName } from "./parts/font-name";
import { height } from "./parts/height";
import { name } from "./parts/name";
import { opacity } from "./parts/opacity";
import { pointCount } from "./parts/point-count";
import { strokes } from "./parts/strokes";
import { variantProperties } from "./parts/variant-properties";
import { width } from "./parts/width";

export const addNode = async (
  parent: SceneNode,
  node: SceneNode,
  settings: SetTooltipOptions
) => {
  const flags: TooltipSettings = settings.flags;
  // Add content to parent
  if (flags.name) {
    name(node, parent, settings);
  }
  if (flags.variants) {
    variantProperties(node, parent, settings);
  }
  if (flags.width) {
    width(node, parent, settings);
  }
  if (flags.height) {
    height(node, parent, settings);
  }
  // Padding e Gap (sempre mostrar; se não existir, 0px)
  try {
    const fontSize =
      settings && (settings as any).labelFontSize
        ? (settings as any).labelFontSize
        : 12;
    const fontColor =
      settings && (settings as any).fontColor
        ? (settings as any).fontColor
        : "#FFFFFF";

    let pTop = 0,
      pRight = 0,
      pBottom = 0,
      pLeft = 0;

    const anyNode: any = node as any;
    if ("paddingTop" in anyNode && typeof anyNode.paddingTop === "number")
      pTop = anyNode.paddingTop || 0;
    if ("paddingRight" in anyNode && typeof anyNode.paddingRight === "number")
      pRight = anyNode.paddingRight || 0;
    if ("paddingBottom" in anyNode && typeof anyNode.paddingBottom === "number")
      pBottom = anyNode.paddingBottom || 0;
    if ("paddingLeft" in anyNode && typeof anyNode.paddingLeft === "number")
      pLeft = anyNode.paddingLeft || 0;

    let gap = 0;
    if (
      "itemSpacing" in anyNode &&
      typeof anyNode.itemSpacing === "number" &&
      "layoutMode" in anyNode &&
      anyNode.layoutMode &&
      anyNode.layoutMode !== "NONE"
    ) {
      gap = anyNode.itemSpacing || 0;
    }

    // Ícone de Padding (border_style)
    const padIconSvg = `<svg width="16" height="16" viewBox="0 -960 960 960" xmlns="http://www.w3.org/2000/svg" fill="#8C8C8C"><path d="M280-120v-80h80v80h-80Zm160 0v-80h80v80h-80Zm160 0v-80h80v80h-80Zm160 0v-80h80v80h-80Zm0-160v-80h80v80h-80Zm0-160v-80h80v80h-80Zm0-160v-80h80v80h-80ZM120-120v-720h720v80H200v640h-80Z"/></svg>`;
    const padIcon = figma.createNodeFromSvg(padIconSvg);
    const padText = createTooltipTextNode({ fontColor, fontSize });
    padText.x += 20;
    padText.y += 1.5;
    padText.characters = `Padding: ${Math.round(pTop)}px, ${Math.round(
      pRight
    )}px, ${Math.round(pBottom)}px, ${Math.round(pLeft)}px`;
    const padGroup = figma.group([padIcon, padText], parent as FrameNode);
    padGroup.expanded = false;

    // Ícone de Gap (horizontal_distribute)
    const gapIconSvg = `<svg width="16" height="16" viewBox="0 -960 960 960" xmlns="http://www.w3.org/2000/svg" fill="#8C8C8C"><path d="M80-80v-800h80v800H80Zm340-200v-400h120v400H420ZM800-80v-800h80v800h-80Z"/></svg>`;
    const gapIcon = figma.createNodeFromSvg(gapIconSvg);
    const gapText = createTooltipTextNode({ fontColor, fontSize });
    gapText.x += 20;
    gapText.y += 1.5;
    gapText.characters = `Gap: ${Math.round(gap)}px`;
    const gapGroup = figma.group([gapIcon, gapText], parent as FrameNode);
    gapGroup.expanded = false;

    // Layout (modo Horizontal/Vertical/Nenhum)
    let layoutLabel = "None";
    if ("layoutMode" in anyNode && anyNode.layoutMode) {
      layoutLabel =
        String(anyNode.layoutMode).toUpperCase() === "HORIZONTAL"
          ? "Horizontal"
          : String(anyNode.layoutMode).toUpperCase() === "VERTICAL"
          ? "Vertical"
          : "None";
    }
    // Escolher ícone conforme modo (horizontal/vertical)
    const layoutIconSvg =
      layoutLabel === "Horizontal"
        ? `<svg width="16" height="16" viewBox="0 -960 960 960" xmlns="http://www.w3.org/2000/svg" fill="#8C8C8C"><path d="M80-80v-800h80v800H80Zm340-200v-400h120v400H420ZM800-80v-800h80v800h-80Z"/></svg>`
        : `<svg width="16" height="16" viewBox="0 -960 960 960" xmlns="http://www.w3.org/2000/svg" fill="#8C8C8C"><path d="M80-80v-80h800v80H80Zm200-340v-120h400v120H280ZM80-800v-80h800v80H80Z"/></svg>`;
    const layoutIcon = figma.createNodeFromSvg(layoutIconSvg);
    const layoutText = createTooltipTextNode({ fontColor, fontSize });
    layoutText.x += 20;
    layoutText.y += 1.5;
    layoutText.characters = `Layout: ${layoutLabel}`;
    const layoutGroup = figma.group(
      [layoutIcon, layoutText],
      parent as FrameNode
    );
    layoutGroup.expanded = false;

    // Wrap (quando houver Auto Layout com quebra de linha)
    let wrapOn = false;
    if ("layoutWrap" in anyNode) {
      const v = anyNode.layoutWrap;
      wrapOn =
        (typeof v === "string" && String(v).toUpperCase() === "WRAP") ||
        (typeof v === "boolean" && v === true);
    }
    const wrapIconSvg = `<svg width="16" height="16" viewBox="0 -960 960 960" xmlns="http://www.w3.org/2000/svg" fill="#8C8C8C"><path d="M120-120v-720h720v80H200v640h-80Z"/></svg>`; // bordas genéricas
    const wrapIcon = figma.createNodeFromSvg(wrapIconSvg);
    const wrapText = createTooltipTextNode({ fontColor, fontSize });
    wrapText.x += 20;
    wrapText.y += 1.5;
    wrapText.characters = `Wrap: ${wrapOn ? "Yes" : "No"}`;
    const wrapGroup = figma.group([wrapIcon, wrapText], parent as FrameNode);
    wrapGroup.expanded = false;

    // Grid (quando houver layoutGrids)
    let hasGrid = false;
    if (
      "layoutGrids" in anyNode &&
      Array.isArray(anyNode.layoutGrids) &&
      anyNode.layoutGrids.length > 0
    ) {
      hasGrid = true;
    }
    const gridIconSvg = `<svg width=\"16\" height=\"16\" viewBox=\"0 -960 960 960\" xmlns=\"http://www.w3.org/2000/svg\" fill=\"#8C8C8C\"><path d=\"M480-118 120-398l66-50 294 228 294-228 66 50-360 280Zm0-202L120-600l360-280 360 280-360 280Zm0-280Zm0 178 230-178-230-178-230 178 230 178Z\"/></svg>`;
    const gridIcon = figma.createNodeFromSvg(gridIconSvg);
    const gridText = createTooltipTextNode({ fontColor, fontSize });
    gridText.x += 20;
    gridText.y += 1.5;
    gridText.characters = `Grid: ${hasGrid ? "Yes" : "No"}`;
    const gridGroup = figma.group([gridIcon, gridText], parent as FrameNode);
    gridGroup.expanded = false;
  } catch {}
  if (flags.color) {
    fills(node, parent, settings);
  }
  if (flags.cornerRadius) {
    cornerRadius(node, parent, settings);
  }
  if (flags.stroke) {
    await strokes(node, parent, settings);
  }
  if (flags.opacity) {
    opacity(node, parent, settings);
  }
  if (flags.fontName && node.type === "TEXT") {
    await fontName(node, parent, flags.fontSize, settings.fontPattern);
  }
  if (flags.points) {
    pointCount(node, parent, settings);
  }
  if (flags.effects) {
    await effects(node, parent, settings);
  }
};
