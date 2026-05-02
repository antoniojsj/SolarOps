/// <reference types="@figma/plugin-typings" />

import { safeFetch, fetchWithRetry, isUrlAllowed } from "./networkConfig";

type SerializedRect = { x: number; y: number; width: number; height: number };

type SerializedNode =
  | {
      nodeType: "text";
      text: string;
      rect: SerializedRect;
      styles: Record<string, string>;
    }
  | {
      nodeType: "element";
      tagName: string;
      attrs: Record<string, string>;
      rect: SerializedRect;
      styles: Record<string, string>;
      imageUrl?: string;
      imageData?: string;
      isIcon?: boolean;
      iconName?: string;
      children: SerializedNode[];
    };

interface RGBWithAlpha extends RGB {
  a?: number;
}

function parseGradient(gradientStr: string): GradientPaint | null {
  if (!gradientStr) return null;

  const gradient =
    extractCssFunction(gradientStr, "linear-gradient") ||
    extractCssFunction(gradientStr, "radial-gradient");
  if (!gradient) return null;

  const parts = splitCssList(gradient.content)
    .map(s => s.trim())
    .filter(Boolean);
  const colorStopParts = stripGradientHints(parts);
  const colorStops = normalizeGradientStops(colorStopParts);
  if (colorStops.length === 0) return null;

  if (gradient.name === "radial-gradient") {
    const center = parseRadialGradientCenter(parts[0] || "");
    return {
      type: "GRADIENT_RADIAL",
      gradientStops: colorStops,
      gradientTransform: [
        [1, 0, center.x - 0.5],
        [0, 1, center.y - 0.5]
      ]
    };
  }

  const first = parts[0] || "";
  const angle = parseLinearGradientAngle(first);
  return {
    type: "GRADIENT_LINEAR",
    gradientStops: colorStops,
    gradientTransform: gradientTransformForCssAngle(angle)
  };
}

function stripGradientHints(parts: string[]) {
  return parts.filter(part =>
    /(rgba?\([^)]+\)|hsla?\([^)]+\)|#[0-9a-fA-F]{3,8}|transparent)/i.test(part)
  );
}

function parseRadialGradientCenter(part: string) {
  const match = part.match(/at\s+(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%/i);
  if (!match) return { x: 0.5, y: 0.5 };
  return {
    x: Math.max(0, Math.min(1, parseFloat(match[1]) / 100)),
    y: Math.max(0, Math.min(1, parseFloat(match[2]) / 100))
  };
}

function extractCssFunction(value: string, functionName: string) {
  const start = value.toLowerCase().indexOf(`${functionName}(`);
  if (start === -1) return null;
  const contentStart = start + functionName.length + 1;
  let depth = 1;
  for (let i = contentStart; i < value.length; i++) {
    const ch = value[i];
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (depth === 0) {
      return {
        name: functionName,
        content: value.slice(contentStart, i)
      };
    }
  }
  return null;
}

function splitCssList(value: string) {
  const parts: string[] = [];
  let current = "";
  let depth = 0;
  for (const ch of value) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current) parts.push(current);
  return parts;
}

function parseLinearGradientAngle(part: string) {
  const lower = part.toLowerCase();
  const angleMatch = lower.match(/(-?\d+(?:\.\d+)?)deg/);
  if (angleMatch) return parseFloat(angleMatch[1]);
  if (lower.includes("to right")) return 90;
  if (lower.includes("to left")) return 270;
  if (lower.includes("to bottom")) return 180;
  if (lower.includes("to top")) return 0;
  return 180;
}

function gradientTransformForCssAngle(angle: number): Transform {
  const rad = (angle - 90) * (Math.PI / 180);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return [
    [cos, sin, 0.5 - (cos + sin) / 2],
    [-sin, cos, 0.5 - (cos - sin) / 2]
  ];
}

function normalizeGradientStops(parts: string[]): ColorStop[] {
  const stops = parts
    .map(part => {
      const colorMatch = part.match(
        /(rgba?\([^)]+\)|hsla?\([^)]+\)|#[0-9a-fA-F]{3,8}|transparent|[a-zA-Z]+)/
      );
      if (!colorMatch) return null;
      const color = parseColor(colorMatch[1]);
      if (!color) return null;
      const rest = part.slice(colorMatch.index! + colorMatch[1].length);
      const positionMatch = rest.match(/(-?\d+(?:\.\d+)?)%/);
      const position = positionMatch ? parseFloat(positionMatch[1]) / 100 : NaN;
      return {
        color: { r: color.r, g: color.g, b: color.b, a: color.a ?? 1 },
        position
      };
    })
    .filter(Boolean) as ColorStop[];

  if (stops.length === 1) {
    stops.push({ ...stops[0], position: 1 });
    // @ts-ignore - position is readonly in ColorStop but we need to set it
    stops[0].position = 0;
  }

  const lastIndex = stops.length - 1;
  for (let i = 0; i < stops.length; i++) {
    if (!Number.isFinite(stops[i].position)) {
      // @ts-ignore - position is readonly in ColorStop but we need to set it
      stops[i].position = lastIndex === 0 ? 0 : i / lastIndex;
    }
    // @ts-ignore - position is readonly in ColorStop but we need to set it
    stops[i].position = Math.max(0, Math.min(1, stops[i].position));
  }

  const sortedStops = stops.sort((a, b) => a.position - b.position);
  if (sortedStops[0]?.position > 0) {
    sortedStops.unshift({ ...sortedStops[0], position: 0 });
  }
  const lastStop = sortedStops[sortedStops.length - 1];
  if (lastStop && lastStop.position < 1) {
    sortedStops.push({ ...lastStop, position: 1 });
  }
  return sortedStops;
}

function parseColor(colorStr: string): RGBWithAlpha | null {
  if (!colorStr) return null;
  const lower = colorStr.toLowerCase().trim();
  if (lower === "transparent") return { r: 0, g: 0, b: 0, a: 0 };

  const rgbMatch = lower.match(/^rgba?\((.*)\)$/i);
  if (rgbMatch) {
    const normalized = rgbMatch[1].replace(/\s*\/\s*/, " ");
    const raw = normalized.includes(",")
      ? normalized.split(",")
      : normalized.trim().split(/\s+/);
    if (raw.length < 3) return null;
    const parseChannel = (value: string) => {
      const n = parseFloat(value);
      return value.includes("%")
        ? Math.min(100, n) / 100
        : Math.min(255, n) / 255;
    };
    const r = parseChannel(raw[0]);
    const g = parseChannel(raw[1]);
    const b = parseChannel(raw[2]);
    const a = raw[3] ? parseAlpha(raw[3]) : 1;
    return { r, g, b, a };
  }

  if (colorStr.startsWith("#")) {
    const hex = colorStr.slice(1);
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16) / 255;
      const g = parseInt(hex[1] + hex[1], 16) / 255;
      const b = parseInt(hex[2] + hex[2], 16) / 255;
      return { r, g, b, a: 1 };
    }
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      return { r, g, b, a: 1 };
    }
    if (hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      const a = parseInt(hex.slice(6, 8), 16) / 255;
      return { r, g, b, a };
    }
  }

  // Handle named colors (CSS color names) including Tailwind custom colors
  const namedColors: Record<string, [number, number, number]> = {
    black: [0, 0, 0],
    white: [255, 255, 255],
    red: [255, 0, 0],
    green: [0, 128, 0],
    blue: [0, 0, 255],
    yellow: [255, 255, 0],
    cyan: [0, 255, 255],
    magenta: [255, 0, 255],
    gray: [128, 128, 128],
    grey: [128, 128, 128],
    "slate-900": [15, 23, 42],
    "slate-50": [248, 250, 252],
    "slate-400": [148, 163, 184],
    "slate-500": [100, 116, 139],
    "slate-950": [2, 6, 23],
    // Tailwind custom colors from the test HTML
    primary: [0, 74, 198],
    background: [248, 249, 250],
    surface: [248, 249, 250],
    "on-surface": [25, 28, 29],
    "on-background": [25, 28, 29],
    "surface-container": [237, 238, 239],
    "surface-container-lowest": [255, 255, 255],
    "surface-container-low": [243, 244, 245],
    "surface-container-high": [231, 232, 233],
    "surface-container-highest": [225, 227, 228],
    "outline-variant": [195, 198, 215],
    "on-surface-variant": [67, 70, 85],
    "primary-container": [37, 99, 235],
    "on-primary": [255, 255, 255],
    tertiary: [0, 98, 66],
    "tertiary-container": [0, 125, 85],
    "on-tertiary": [255, 255, 255],
    "on-tertiary-container": [189, 255, 219],
    error: [186, 26, 26],
    "on-error": [255, 255, 255],
    "secondary-fixed-dim": [189, 199, 217],
    "on-primary-fixed": [0, 23, 75],
    "surface-tint": [0, 83, 219],
    secondary: [85, 95, 111],
    "secondary-container": [214, 224, 243],
    "on-secondary-container": [89, 99, 115],
    "secondary-fixed": [217, 227, 246],
    "primary-fixed-dim": [180, 197, 255],
    "surface-variant": [225, 227, 228],
    "on-tertiary-fixed": [0, 33, 19],
    "on-primary-container": [238, 239, 255],
    "on-primary-fixed-variant": [0, 62, 168],
    "tertiary-fixed": [111, 251, 190],
    "tertiary-fixed-dim": [78, 222, 163],
    "inverse-on-surface": [240, 241, 242],
    "primary-fixed": [219, 225, 255],
    "on-secondary-fixed-variant": [61, 71, 86],
    "on-secondary-fixed": [18, 28, 42],
    "on-tertiary-fixed-variant": [0, 82, 54],
    "error-container": [255, 218, 214],
    "on-error-container": [147, 0, 10],
    "inverse-surface": [46, 49, 50],
    "on-secondary": [255, 255, 255],
    "inverse-primary": [180, 197, 255]
  };

  if (namedColors[lower]) {
    const [r, g, b] = namedColors[lower];
    return { r: r / 255, g: g / 255, b: b / 255, a: 1 };
  }

  return null;
}

function parseAlpha(value: string) {
  const n = parseFloat(value);
  if (!Number.isFinite(n)) return 1;
  return value.includes("%")
    ? Math.max(0, Math.min(1, n / 100))
    : Math.max(0, Math.min(1, n));
}

function applyTextTransform(text: string, transform?: string) {
  switch ((transform || "").toLowerCase()) {
    case "uppercase":
      return text.toUpperCase();
    case "lowercase":
      return text.toLowerCase();
    case "capitalize":
      return text.replace(/\b\p{L}/gu, char => char.toUpperCase());
    default:
      return text;
  }
}

function mapTextAlign(align?: string): TextNode["textAlignHorizontal"] {
  if (!align || align === "normal" || align === "start") return "LEFT";
  switch ((align || "").toLowerCase()) {
    case "center":
      return "CENTER";
    case "right":
    case "end":
      return "RIGHT";
    case "justify":
      return "JUSTIFIED";
    default:
      return "LEFT";
  }
}

function mapComputedTextAlign(
  styles: Record<string, string>
): TextNode["textAlignHorizontal"] {
  if (
    styles.display.includes("flex") &&
    styles.justifyContent === "center" &&
    styles.alignItems === "center"
  ) {
    return "CENTER";
  }
  return mapTextAlign(styles.textAlign);
}

function pxToNumber(px: string | undefined): number {
  if (!px) return 0;
  const n = parseFloat(px.replace("px", ""));
  return Number.isFinite(n) ? n : 0;
}

function isTransparentColor(c?: string) {
  if (!c) return true;
  const parsed = parseColor(c);
  return !parsed || parsed.a === 0;
}

function firstNonTransparentBorderColor(
  styles: Record<string, string>
): string | undefined {
  const candidates = [
    styles.borderTopColor,
    styles.borderRightColor,
    styles.borderBottomColor,
    styles.borderLeftColor,
    styles.borderColor // fallback para border shorthand
  ];
  return candidates.find(c => c && !isTransparentColor(c));
}

function maxBorderWidth(styles: Record<string, string>) {
  const widths = [
    pxToNumber(styles.borderTopWidth),
    pxToNumber(styles.borderRightWidth),
    pxToNumber(styles.borderBottomWidth),
    pxToNumber(styles.borderLeftWidth),
    pxToNumber(styles.borderWidth) // fallback para border shorthand
  ];
  return Math.max(...widths.filter(w => w > 0), 0);
}

function parseBorderRadius(
  styles: Record<string, string>,
  width: number,
  height: number
) {
  // computedStyle.borderRadius can be like "12px" or "12px 12px 0px 0px"
  const raw = styles.borderRadius;
  if (!raw) return 0;
  const first = raw.split(" ")[0];
  const r = pxToNumber(first);
  const max = Math.min(width, height) / 2;
  return Math.max(0, Math.min(r, max));
}

function parseBoxShadows(
  boxShadow?: string
): Array<DropShadowEffect | InnerShadowEffect> {
  if (!boxShadow || boxShadow === "none") return [];

  const effects: Array<DropShadowEffect | InnerShadowEffect> = [];
  for (const rawShadow of splitCssList(boxShadow)) {
    const shadow = rawShadow.trim();
    if (!shadow || shadow === "none") continue;

    const isInset = /\binset\b/i.test(shadow);
    const colorMatch = shadow.match(
      /(rgba?\([^)]+\)|#[0-9a-fA-F]{3,8}|transparent|[a-zA-Z]+)/
    );
    const color = colorMatch ? parseColor(colorMatch[1]) : null;
    if (!color) continue;

    const withoutColor = shadow
      .replace(colorMatch![0], "")
      .replace(/\binset\b/i, "")
      .trim();
    const lengths = withoutColor.match(/-?\d+(?:\.\d+)?px/g) || [];
    if (lengths.length < 2) continue;

    const offsetX = pxToNumber(lengths[0]);
    const offsetY = pxToNumber(lengths[1]);
    const blur = lengths[2] ? Math.max(0, pxToNumber(lengths[2])) : 0;
    const spread = lengths[3] ? pxToNumber(lengths[3]) : 0;
    const base = {
      color: { r: color.r, g: color.g, b: color.b, a: color.a ?? 1 },
      offset: { x: offsetX, y: offsetY },
      radius: blur,
      spread,
      visible: true,
      blendMode: "NORMAL" as const
    };

    effects.push(
      isInset
        ? { ...base, type: "INNER_SHADOW" }
        : { ...base, type: "DROP_SHADOW" }
    );
  }

  return effects;
}

function parseBlurEffects(styles: Record<string, string>): Effect[] {
  const effects: Effect[] = [];
  const backdrop = styles.backdropFilter || styles.webkitBackdropFilter || "";
  const layer = styles.filter || "";
  const backdropBlur = backdrop.match(/blur\((\d+(?:\.\d+)?)px\)/i);
  const layerBlur = layer.match(/blur\((\d+(?:\.\d+)?)px\)/i);

  if (backdropBlur) {
    // @ts-ignore - BACKGROUND_BLUR format may vary by Figma API version
    effects.push({
      type: "BACKGROUND_BLUR",
      radius: parseFloat(backdropBlur[1]),
      visible: true
    } as any);
  }

  if (layerBlur) {
    // @ts-ignore - LAYER_BLUR format may vary by Figma API version
    effects.push({
      type: "LAYER_BLUR",
      radius: parseFloat(layerBlur[1]),
      visible: true
    } as any);
  }

  return effects;
}

function applyEffectsSafely(frame: FrameNode, effects: Effect[]) {
  if (effects.length === 0) return;
  try {
    frame.effects = effects;
  } catch (error) {
    console.warn(
      "[domImporter] Failed to apply effects; retrying one by one",
      error
    );
    const accepted: Effect[] = [];
    for (const effect of effects) {
      try {
        frame.effects = [...accepted, effect];
        accepted.push(effect);
      } catch (effectError) {
        console.warn(
          "[domImporter] Skipping unsupported effect",
          effect,
          effectError
        );
      }
    }
  }
}

function applyFillsSafely(
  frame: FrameNode,
  fills: Paint[],
  fallback?: Paint[]
) {
  try {
    frame.fills = fills;
  } catch (error) {
    console.warn("[domImporter] Failed to apply fills; using fallback", error);
    frame.fills = fallback || [];
  }
}

function createSingleBorderLine(
  frame: FrameNode,
  side: string,
  width: number,
  colorCss?: string
) {
  const color = colorCss ? parseColor(colorCss) : null;
  const line = figma.createVector();
  line.name = `border-${side}`;

  if (side === "left" || side === "right") {
    line.vectorPaths = [
      {
        windingRule: "NONE",
        data: `M 0 0 L 0 ${frame.height}`
      }
    ];
    line.x = side === "right" ? frame.width : 0;
    line.y = 0;
  } else {
    line.vectorPaths = [
      {
        windingRule: "NONE",
        data: `M 0 0 L ${frame.width} 0`
      }
    ];
    line.x = 0;
    line.y = side === "bottom" ? frame.height : 0;
  }

  line.strokes = [
    color
      ? {
          type: "SOLID",
          color: { r: color.r, g: color.g, b: color.b },
          opacity: color.a ?? 1
        }
      : { type: "SOLID", color: { r: 0.93, g: 0.93, b: 0.93 }, opacity: 1 }
  ];
  line.strokeWeight = Math.max(1, width);
  line.strokeCap = "NONE";
  frame.appendChild(line);
}

async function safeLoadFont(
  fontFamily: string | undefined,
  fontWeight: string | undefined
) {
  // Attempt: first font in font-family list; fallback to Inter.
  const familyCandidates: string[] = [];
  if (fontFamily) {
    for (const raw of fontFamily.split(",")) {
      const f = raw.trim().replace(/^["']|["']$/g, "");
      if (f) familyCandidates.push(f);
    }
  }
  if (!familyCandidates.includes("Inter")) familyCandidates.push("Inter");

  const weight = parseInt(fontWeight || "400", 10);
  const styleCandidates: string[] = [];
  if (Number.isFinite(weight)) {
    if (weight >= 900) styleCandidates.push("Black");
    if (weight >= 700) styleCandidates.push("Bold");
    if (weight >= 600) styleCandidates.push("Semi Bold", "Semibold");
    if (weight >= 500) styleCandidates.push("Medium");
  }
  styleCandidates.push("Regular");

  for (const family of familyCandidates) {
    for (const style of styleCandidates) {
      try {
        await figma.loadFontAsync({ family, style });
        return { family, style };
      } catch {
        // try next
      }
    }
  }
  // Last resort
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  return { family: "Inter", style: "Regular" };
}

async function createImageFillFromUrl(url: string): Promise<Paint[] | null> {
  try {
    // Check if URL is from an allowed domain
    if (!isUrlAllowed(url)) {
      console.warn("[domImporter] Image URL not from whitelisted domain:", url);
      return null;
    }

    const res = await fetchWithRetry(url, { timeout: 12000, retries: 3 });
    if (!res.ok) {
      console.warn(
        "[domImporter] Failed to fetch image (status " + res.status + "):",
        url
      );
      return null;
    }
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    const img = figma.createImage(bytes);
    const paint: ImagePaint = {
      type: "IMAGE",
      imageHash: img.hash,
      scaleMode: "FILL"
    };
    return [paint];
  } catch (e) {
    console.warn("[domImporter] Failed to fetch image:", url, e);
    return null;
  }
}

function imageDataUrlToBytes(dataUrl: string): Uint8Array | null {
  if (!dataUrl.startsWith("data:")) return null;
  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex === -1) return null;
  const base64 = dataUrl.slice(commaIndex + 1);
  try {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

function isFlex(styles: Record<string, string>) {
  return (styles.display || "").includes("flex");
}

function mapJustifyContent(
  justify?: string
): FrameNode["primaryAxisAlignItems"] {
  switch ((justify || "").toLowerCase()) {
    case "center":
      return "CENTER";
    case "flex-end":
    case "end":
      return "MAX";
    case "space-between":
      return "SPACE_BETWEEN";
    case "space-around":
    case "space-evenly":
      return "SPACE_BETWEEN";
    default:
      return "MIN";
  }
}

function mapAlignItems(align?: string): FrameNode["counterAxisAlignItems"] {
  switch ((align || "").toLowerCase()) {
    case "center":
      return "CENTER";
    case "flex-end":
    case "end":
      return "MAX";
    case "baseline":
      return "BASELINE";
    default:
      return "MIN";
  }
}

function getFlexDirection(
  styles: Record<string, string>
): "HORIZONTAL" | "VERTICAL" {
  const dir = (styles.flexDirection || "").toLowerCase();
  if (dir.includes("row")) return "HORIZONTAL";
  return "VERTICAL";
}

function getGap(styles: Record<string, string>) {
  // Use main-axis gap if available
  const gap = styles.gap && styles.gap !== "normal" ? styles.gap : undefined;
  if (gap) return pxToNumber(gap);
  const rowGap =
    styles.rowGap && styles.rowGap !== "normal" ? styles.rowGap : undefined;
  const columnGap =
    styles.columnGap && styles.columnGap !== "normal"
      ? styles.columnGap
      : undefined;
  // We'll just pick the larger as a heuristic
  return Math.max(pxToNumber(rowGap), pxToNumber(columnGap));
}

function hasAutoHorizontalMargins(styles: Record<string, string>) {
  return styles.marginLeft === "auto" && styles.marginRight === "auto";
}

function normalizeMaterialSymbolName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

async function tryCreateMaterialSymbolVector(
  iconName: string,
  colorCss: string | undefined,
  targetWidth: number,
  targetHeight: number
): Promise<SceneNode | null> {
  const normalized = normalizeMaterialSymbolName(iconName);
  if (!normalized) return null;

  // Unofficial but widely used gstatic endpoint pattern
  const svgUrl = `https://fonts.gstatic.com/s/i/short-term/release/materialsymbolsoutlined/${normalized}/default/24px.svg`;
  try {
    const res = await fetchWithRetry(svgUrl, { timeout: 5000, retries: 2 });
    if (!res.ok) {
      console.warn(
        "[domImporter] Failed to fetch material symbol (status " +
          res.status +
          "):",
        svgUrl
      );
      return null;
    }
    const svgText = await res.text();
    const node = figma.createNodeFromSvg(svgText);

    // Apply color (best-effort) by setting fills on vector descendants
    const c = colorCss ? parseColor(colorCss) : null;
    if (c) {
      const paint: SolidPaint = {
        type: "SOLID",
        color: { r: c.r, g: c.g, b: c.b },
        opacity: c.a ?? 1
      };
      const stack: SceneNode[] = [node as any];
      while (stack.length) {
        const cur = stack.pop()!;
        if ("children" in cur) {
          // @ts-ignore
          for (const ch of cur.children) stack.push(ch);
        }
        if ("fills" in cur) {
          try {
            // @ts-ignore
            cur.fills = [paint];
          } catch {
            // ignore
          }
        }
      }
    }

    // Resize to match the icon rect
    if ("resizeWithoutConstraints" in node) {
      // @ts-ignore
      node.resizeWithoutConstraints(
        Math.max(1, targetWidth),
        Math.max(1, targetHeight)
      );
    }
    return node as any;
  } catch (e) {
    console.warn(
      "[domImporter] Failed to fetch/create material symbol SVG",
      svgUrl,
      e
    );
    return null;
  }
}

function applyAutoLayoutFromChildren(
  frame: FrameNode,
  styles: Record<string, string>,
  childStylesMap: Map<SceneNode, Record<string, string>>
) {
  if (frame.children.length < 1) return;

  const display = styles.display || "";
  const isFlexbox = display.includes("flex");

  console.log(
    `[applyAutoLayout] Frame: ${frame.name}, display: ${display}, isFlexbox: ${isFlexbox}`
  );

  // Only apply to flexbox containers
  if (!isFlexbox) return;

  try {
    // Set layoutMode based on flex-direction
    const flexDirection = styles.flexDirection || "column";
    if (flexDirection.includes("row")) {
      frame.layoutMode = "HORIZONTAL";
    } else {
      frame.layoutMode = "VERTICAL";
    }

    console.log(`[applyAutoLayout] layoutMode set to: ${frame.layoutMode}`);

    // Set spacing from gap
    const gap = pxToNumber(styles.gap);
    const rowGap = pxToNumber(styles.rowGap);
    const columnGap = pxToNumber(styles.columnGap);

    if (frame.layoutMode === "VERTICAL") {
      frame.itemSpacing = rowGap > 0 ? rowGap : gap;
    } else {
      frame.itemSpacing = columnGap > 0 ? columnGap : gap;
    }

    // Set padding
    const paddingTop = pxToNumber(styles.paddingTop);
    const paddingBottom = pxToNumber(styles.paddingBottom);
    const paddingLeft = pxToNumber(styles.paddingLeft);
    const paddingRight = pxToNumber(styles.paddingRight);

    frame.paddingTop = paddingTop;
    frame.paddingBottom = paddingBottom;
    frame.paddingLeft = paddingLeft;
    frame.paddingRight = paddingRight;

    console.log(
      `[applyAutoLayout] itemSpacing: ${frame.itemSpacing}, padding: ${paddingTop},${paddingBottom},${paddingLeft},${paddingRight}`
    );

    // Set children properties with error handling
    for (const child of frame.children) {
      try {
        const childStyles = childStylesMap.get(child) || {};

        if (child.type === "FRAME") {
          const childFrame = child as FrameNode;
          const flex = childStyles.flex || "";
          const flexGrow = childStyles.flexGrow || "";

          // flex: 1 or flexGrow > 0 → Fill container (STRETCH)
          if (
            flex === "1" ||
            flexGrow === "1" ||
            flexGrow === "1 1 0%" ||
            (flexGrow && parseFloat(flexGrow) > 0)
          ) {
            childFrame.layoutAlign = "STRETCH";
          }
        } else if (child.type === "TEXT") {
          const textNode = child as TextNode;
          // Text elements - STRETCH in vertical layouts to fill container width
          if (frame.layoutMode === "VERTICAL") {
            textNode.layoutAlign = "STRETCH";
          }
        }
      } catch (childError) {
        console.warn(
          `[applyAutoLayout] Error setting child properties for ${child.name}:`,
          childError
        );
      }
    }
  } catch (error) {
    console.error(
      `[applyAutoLayout] Error applying auto layout to frame ${frame.name}:`,
      error
    );
  }
}

async function importNode(
  node: SerializedNode,
  parent: FrameNode,
  parentAbs: { x: number; y: number },
  parentIsAutoLayout: boolean
): Promise<SceneNode | null> {
  if (node.nodeType === "text") {
    const t = figma.createText();
    const font = await safeLoadFont(
      node.styles.fontFamily,
      node.styles.fontWeight
    );
    t.fontName = font;
    t.characters = applyTextTransform(node.text, node.styles.textTransform);

    const fontSize = pxToNumber(node.styles.fontSize);
    if (fontSize > 0) t.fontSize = fontSize;

    const lineHeight = pxToNumber(node.styles.lineHeight);
    if (lineHeight > 0) {
      t.lineHeight = { value: lineHeight, unit: "PIXELS" };
    }

    const color = parseColor(node.styles.color || "");
    if (color) {
      t.fills = [
        {
          type: "SOLID",
          color: { r: color.r, g: color.g, b: color.b },
          opacity: color.a ?? 1
        }
      ];
    }

    const opacity = parseFloat(node.styles.opacity || "1");
    if (Number.isFinite(opacity)) t.opacity = opacity;

    parent.appendChild(t);

    t.textAlignHorizontal = mapComputedTextAlign(node.styles);
    if (node.styles.whiteSpace !== "nowrap" && node.rect.width > 1) {
      try {
        t.textAutoResize = "HEIGHT";
        t.resizeWithoutConstraints(
          Math.max(1, node.rect.width),
          Math.max(1, node.rect.height)
        );
      } catch (error) {
        console.warn("[domImporter] Failed to size text node", error);
      }
    }

    if (!parentIsAutoLayout) {
      t.x = node.rect.x - parentAbs.x;
      t.y = node.rect.y - parentAbs.y;
    }
    return t;
  }

  // ============================================================
  // TRATAMENTO ESPECIAL DE ÍCONES: SEM FILLS DE FUNDO
  // ============================================================
  if (node.isIcon && node.iconName && node.imageData) {
    console.log(
      `[domImporter] Processando ícone: ${node.iconName}, size: ${node.rect.width}x${node.rect.height}`
    );
    const bytes = imageDataUrlToBytes(node.imageData);
    if (bytes) {
      try {
        const img = figma.createImage(bytes);

        // Criar frame para o ícone COM CUIDADO
        const iconFrame = figma.createFrame();
        iconFrame.name = `icon-${node.iconName}`;

        // Resize DEPOIS de adicionar a imagem, não antes
        // Isso evita que Figma aplique fills padrão

        // Limpar qualquer fill padrão
        iconFrame.fills = [];

        // Adicionar APENAS a imagem como fill
        const imagePaint: ImagePaint = {
          type: "IMAGE",
          imageHash: img.hash,
          scaleMode: "FILL"
        };
        iconFrame.fills = [imagePaint];

        // AGORA redimensionar o frame
        const w = Math.max(2, node.rect.width); // Mínimo de 2px
        const h = Math.max(2, node.rect.height);
        iconFrame.resizeWithoutConstraints(w, h);

        // Aplicar apenas opacity
        const opacity = parseFloat(node.styles.opacity || "1");
        if (Number.isFinite(opacity)) {
          iconFrame.opacity = opacity;
        }

        parent.appendChild(iconFrame);
        iconFrame.x = node.rect.x - parentAbs.x;
        iconFrame.y = node.rect.y - parentAbs.y;

        console.log(
          `[domImporter] Ícone criado com sucesso em (${iconFrame.x}, ${iconFrame.y})`
        );
        return iconFrame;
      } catch (e) {
        console.warn("[domImporter] Falha ao criar imagem de ícone:", e);
        // Continua para fallback
      }
    } else {
      console.warn(`[domImporter] Ícone sem bytes: ${node.iconName}`);
    }
  }

  // FALLBACK: SVG do Material Symbols para ícones sem imageData
  if (node.isIcon && node.iconName) {
    const iconVec = await tryCreateMaterialSymbolVector(
      node.iconName,
      node.styles.color,
      node.rect.width,
      node.rect.height
    );
    if (iconVec) {
      parent.appendChild(iconVec as any);
      (iconVec as any).x = node.rect.x - parentAbs.x;
      (iconVec as any).y = node.rect.y - parentAbs.y;
      return iconVec as any;
    }
  }

  // ============================================================
  // ELEMENTOS NORMAIS: criar frame com estilos
  // ============================================================

  // DETECÇÃO DE DIVIDERS: elementos que são apenas linhas (border-top, border-bottom, etc)
  const isDivider =
    node.rect.height < 3 &&
    maxBorderWidth(node.styles) > 0 &&
    (isTransparentColor(node.styles.backgroundColor) ||
      !node.styles.backgroundColor);

  // DETECÇÃO DE BORDA ÚNICA: elementos com apenas uma borda (top, bottom, left ou right)
  const hasSingleBorder = (() => {
    const borders = [
      {
        side: "top",
        width: pxToNumber(node.styles.borderTopWidth),
        color: node.styles.borderTopColor
      },
      {
        side: "bottom",
        width: pxToNumber(node.styles.borderBottomWidth),
        color: node.styles.borderBottomColor
      },
      {
        side: "left",
        width: pxToNumber(node.styles.borderLeftWidth),
        color: node.styles.borderLeftColor
      },
      {
        side: "right",
        width: pxToNumber(node.styles.borderRightWidth),
        color: node.styles.borderRightColor
      }
    ];
    const nonZeroBorders = borders.filter(b => b.width > 0);
    return nonZeroBorders.length === 1 ? nonZeroBorders[0] : null;
  })();
  const shouldRenderAsLine =
    isDivider ||
    node.tagName === "hr" ||
    (hasSingleBorder && node.children.length === 0);

  // Só transformar em linha quando o elemento não carrega conteúdo.
  // Containers como section-header/step usam border-bottom e precisam manter filhos.
  if (shouldRenderAsLine) {
    let borderW, borderC, borderSide;

    if (hasSingleBorder) {
      borderW = hasSingleBorder.width;
      borderC = hasSingleBorder.color;
      borderSide = hasSingleBorder.side;
    } else {
      borderW = maxBorderWidth(node.styles) || 1;
      borderC =
        firstNonTransparentBorderColor(node.styles) || node.styles.borderColor;
      borderSide = "bottom"; // default para dividers
    }

    const c = borderC ? parseColor(borderC) : null;

    // Criar linha vetorial
    const line = figma.createVector();
    line.name = node.tagName;

    // Definir posição e direção da linha baseado na borda
    let lineX, lineY, lineW, lineH;
    const opacity = parseFloat(node.styles.opacity || "1");

    if (borderSide === "top") {
      line.vectorPaths = [
        {
          windingRule: "NONE",
          data: `M 0 0 L ${node.rect.width} 0`
        }
      ];
      lineX = node.rect.x - parentAbs.x;
      lineY = node.rect.y - parentAbs.y;
    } else if (borderSide === "bottom") {
      line.vectorPaths = [
        {
          windingRule: "NONE",
          data: `M 0 0 L ${node.rect.width} 0`
        }
      ];
      lineX = node.rect.x - parentAbs.x;
      lineY = node.rect.y - parentAbs.y + node.rect.height;
    } else if (borderSide === "left") {
      line.vectorPaths = [
        {
          windingRule: "NONE",
          data: `M 0 0 L 0 ${node.rect.height}`
        }
      ];
      lineX = node.rect.x - parentAbs.x;
      lineY = node.rect.y - parentAbs.y;
    } else if (borderSide === "right") {
      line.vectorPaths = [
        {
          windingRule: "NONE",
          data: `M 0 0 L 0 ${node.rect.height}`
        }
      ];
      lineX = node.rect.x - parentAbs.x + node.rect.width;
      lineY = node.rect.y - parentAbs.y;
    }

    // Cor da linha
    const lineColor: SolidPaint = c
      ? { type: "SOLID", color: { r: c.r, g: c.g, b: c.b }, opacity: c.a ?? 1 }
      : { type: "SOLID", color: { r: 0.93, g: 0.93, b: 0.93 }, opacity: 1 };

    line.strokes = [lineColor];
    line.strokeWeight = borderW;
    line.strokeCap = "NONE";

    // Posicionar a linha
    line.x = lineX;
    line.y = lineY;

    if (Number.isFinite(opacity)) line.opacity = opacity;

    parent.appendChild(line);
    return line;
  }

  const frame = figma.createFrame();
  frame.name = node.tagName;
  frame.resizeWithoutConstraints(
    Math.max(1, node.rect.width),
    Math.max(1, node.rect.height)
  );
  const overflow = `${node.styles.overflow || ""} ${node.styles.overflowX ||
    ""} ${node.styles.overflowY || ""}`;
  frame.clipsContent = /\bhidden\b/i.test(overflow);

  const opacity = parseFloat(node.styles.opacity || "1");
  if (Number.isFinite(opacity)) frame.opacity = opacity;

  // Background fill - NUNCA aplicar em ícones
  // Ícones devem ter frame transparente porque a cor já está no PNG rasterizado
  const bg = node.styles.backgroundColor;
  const background = node.styles.background;
  const solidBackgroundFill = (() => {
    if (!bg || isTransparentColor(bg)) return null;
    const c = parseColor(bg);
    if (!c) return null;
    return {
      type: "SOLID",
      color: { r: c.r, g: c.g, b: c.b },
      opacity: c.a ?? 1
    } as SolidPaint;
  })();

  if (!node.isIcon) {
    // Check for gradient first in both background and backgroundImage
    const hasGradient =
      (background &&
        (background.includes("linear-gradient") ||
          background.includes("radial-gradient"))) ||
      (node.styles.backgroundImage &&
        (node.styles.backgroundImage.includes("linear-gradient") ||
          node.styles.backgroundImage.includes("radial-gradient")));

    if (hasGradient) {
      const gradientStr = background || node.styles.backgroundImage;
      console.log("[domImporter] Found gradient:", gradientStr);
      const gradientFill = parseGradient(gradientStr);
      if (gradientFill) {
        console.log("[domImporter] Parsed gradient successfully");
        applyFillsSafely(
          frame,
          [gradientFill],
          solidBackgroundFill ? [solidBackgroundFill] : []
        );
      } else {
        console.log(
          "[domImporter] Failed to parse gradient, falling back to solid color"
        );
        frame.fills = solidBackgroundFill ? [solidBackgroundFill] : [];
      }
    } else if (solidBackgroundFill) {
      frame.fills = [solidBackgroundFill];
    } else {
      frame.fills = [];
    }
  } else {
    // Ícones nunca recebem backgroundColor
    frame.fills = [];
  }

  // Border
  const borderW = maxBorderWidth(node.styles);
  if (borderW > 0 && !hasSingleBorder) {
    const borderC =
      firstNonTransparentBorderColor(node.styles) || node.styles.borderColor;
    const c = borderC ? parseColor(borderC) : null;
    if (c) {
      frame.strokes = [
        {
          type: "SOLID",
          color: { r: c.r, g: c.g, b: c.b },
          opacity: c.a ?? 1
        }
      ];
      frame.strokeWeight = borderW;
    }
  }

  // Corner radius
  const r = parseBorderRadius(node.styles, node.rect.width, node.rect.height);
  if (r > 0) frame.cornerRadius = r;

  // Effects: supports multiple shadows plus CSS blur/backdrop-filter.
  const effects = [
    ...parseBoxShadows(node.styles.boxShadow),
    ...parseBlurEffects(node.styles)
  ];
  applyEffectsSafely(frame, effects);

  // Image fills (img tag or background-image) - não processa aqui se for ícone (já foi tratado acima)
  if (!node.isIcon) {
    if (node.imageData) {
      console.warn(
        `[domImporter] ⚠️ Elemento com imageData mas NÃO detectado como ícone: tag=${node.tagName}, class=${node.attrs.class}, size=${node.rect.width}x${node.rect.height}`
      );
      const bytes = imageDataUrlToBytes(node.imageData);
      if (bytes) {
        try {
          const img = figma.createImage(bytes);
          const paint: ImagePaint = {
            type: "IMAGE",
            imageHash: img.hash,
            scaleMode: "FILL"
          };
          frame.fills = [paint];
        } catch (e) {
          console.warn("[domImporter] Failed to create image from dataUrl", e);
        }
      }
    } else if (node.imageUrl) {
      const fills = await createImageFillFromUrl(node.imageUrl);
      if (fills) frame.fills = fills;
    }
  }

  parent.appendChild(frame);

  const abs = { x: node.rect.x, y: node.rect.y };

  // Check if this node should use Auto Layout (flexbox)
  const display = node.styles.display || "";
  const isFlexbox = display.includes("flex");
  const shouldUseAutoLayout = isFlexbox && node.children.length > 0;

  if (!parentIsAutoLayout) {
    frame.x = node.rect.x - parentAbs.x;
    frame.y = node.rect.y - parentAbs.y;
  } else {
    // Heuristic for mx-auto: center all children in this container
    if (hasAutoHorizontalMargins(node.styles)) {
      parent.counterAxisAlignItems = "CENTER";
    }
  }

  // Apply Auto Layout BEFORE importing children if this is a flexbox container
  // This ensures children are positioned by Auto Layout, not absolute coordinates
  if (shouldUseAutoLayout) {
    applyAutoLayoutFromChildren(frame, node.styles, new Map());
  }

  // Build a map of child nodes to their styles for auto layout application
  const childStylesMap = new Map<SceneNode, Record<string, string>>();

  // Import children - if parent has Auto Layout, pass true to skip absolute positioning
  for (const child of node.children) {
    const importedChild = await importNode(
      child,
      frame,
      abs,
      shouldUseAutoLayout
    );
    if (importedChild && child.nodeType === "element") {
      childStylesMap.set(importedChild, child.styles);
    }
  }

  // Re-apply Auto Layout with child styles to set proper layoutAlign for children
  if (shouldUseAutoLayout) {
    const childStylesArray = Array.from(childStylesMap.entries());
    applyAutoLayoutFromChildren(frame, node.styles, new Map(childStylesArray));
  }

  // The rendered DOM importer already receives measured screen coordinates.
  // Rebuilding CSS flex as Auto Layout after that can collapse/reorder complex
  // pages, leaving only the parent background visible.
  if (hasSingleBorder) {
    createSingleBorderLine(
      frame,
      hasSingleBorder.side,
      hasSingleBorder.width,
      hasSingleBorder.color
    );
  }

  // Special-case inputs: add placeholder text if empty
  if (node.tagName === "input") {
    const placeholder = node.attrs.placeholder || node.attrs.value;
    if (placeholder) {
      const t = figma.createText();
      const font = await safeLoadFont(
        node.styles.fontFamily,
        node.styles.fontWeight
      );
      t.fontName = font;
      t.characters = placeholder;
      const fontSize = pxToNumber(node.styles.fontSize);
      if (fontSize > 0) t.fontSize = fontSize;
      const color = parseColor(node.styles.color || "rgba(100,100,100,1)");
      if (color) {
        t.fills = [
          {
            type: "SOLID",
            color: { r: color.r, g: color.g, b: color.b },
            opacity: 0.7
          }
        ];
      }
      frame.appendChild(t);
      if (frame.layoutMode === "NONE") {
        t.x = 12;
        t.y = Math.max(0, (frame.height - t.height) / 2);
      }
    }
  }

  return frame;
}

export async function importRenderedDOM(
  tree: SerializedNode,
  viewport: { width: number; height: number }
) {
  const root = figma.createFrame();
  root.name = "Imported Design";
  root.resizeWithoutConstraints(viewport.width, viewport.height);
  root.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
  root.clipsContent = false; // Disable clipping on root frame
  root.layoutMode = "NONE";

  // Place in viewport
  root.x = figma.viewport.bounds.x + 80;
  root.y = figma.viewport.bounds.y + 80;

  figma.currentPage.appendChild(root);

  // Store the serialized tree as plugin data for later retrieval
  try {
    root.setPluginData("serialized-dom-tree", JSON.stringify(tree));
    root.setPluginData("viewport-size", JSON.stringify(viewport));
  } catch (e) {
    console.warn("[domImporter] Failed to store plugin data:", e);
  }

  await importNode(tree, root, { x: 0, y: 0 }, false);

  // Select
  figma.currentPage.selection = [root];
  figma.viewport.scrollAndZoomIntoView([root]);

  return root;
}
