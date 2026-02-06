/// <reference types="@figma/plugin-typings" />

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

function parseColor(colorStr: string): RGBWithAlpha | null {
  if (!colorStr) return null;
  const lower = colorStr.toLowerCase().trim();
  if (lower === "transparent") return { r: 0, g: 0, b: 0, a: 0 };

  const rgbMatch = colorStr.match(
    /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/i
  );
  if (rgbMatch) {
    const r = Math.min(255, parseInt(rgbMatch[1], 10)) / 255;
    const g = Math.min(255, parseInt(rgbMatch[2], 10)) / 255;
    const b = Math.min(255, parseInt(rgbMatch[3], 10)) / 255;
    const a = rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1;
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

  return null;
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

function parseBoxShadow(boxShadow?: string): DropShadowEffect | null {
  if (!boxShadow || boxShadow === "none") return null;
  // Best-effort parsing of first shadow:
  // e.g. "rgba(59, 130, 246, 0.2) 0px 10px 15px -3px"
  const parts = boxShadow.split(",");
  // If comma-separated colors exist, this naive split breaks; so we parse with regex.
  const m = boxShadow.match(
    /(rgba?\([^)]+\)|#[0-9a-fA-F]{3,8})\s+(-?\d+(?:\.\d+)?)px\s+(-?\d+(?:\.\d+)?)px\s+(\d+(?:\.\d+)?)px(?:\s+(-?\d+(?:\.\d+)?)px)?/
  );
  if (!m) return null;
  const color = parseColor(m[1]);
  if (!color) return null;
  const offsetX = parseFloat(m[2]);
  const offsetY = parseFloat(m[3]);
  const blur = parseFloat(m[4]);
  return {
    type: "DROP_SHADOW",
    color: { r: color.r, g: color.g, b: color.b, a: color.a ?? 1 },
    offset: { x: offsetX, y: offsetY },
    radius: blur,
    visible: true,
    blendMode: "NORMAL"
  };
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
    const res = await fetch(url);
    if (!res.ok) return null;
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
    const res = await fetch(svgUrl);
    if (!res.ok) return null;
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
    t.characters = node.text;

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

  const frame = figma.createFrame();
  frame.name = node.tagName;
  frame.resizeWithoutConstraints(
    Math.max(1, node.rect.width),
    Math.max(1, node.rect.height)
  );

  const opacity = parseFloat(node.styles.opacity || "1");
  if (Number.isFinite(opacity)) frame.opacity = opacity;

  // Background fill - NUNCA aplicar em dividers, NEM EM ÍCONES
  // Ícones devem ter frame transparente porque a cor já está no PNG rasterizado
  const bg = node.styles.backgroundColor;
  if (!isDivider && !node.isIcon) {
    if (bg && !isTransparentColor(bg)) {
      const c = parseColor(bg);
      if (c) {
        frame.fills = [
          {
            type: "SOLID",
            color: { r: c.r, g: c.g, b: c.b },
            opacity: c.a ?? 1
          }
        ];
      }
    } else {
      frame.fills = [];
    }
  } else {
    // Dividers e ícones nunca recebem backgroundColor
    frame.fills = [];
  }

  // Border - para dividers, garantir que o stroke nunca fica oculto
  const borderW = maxBorderWidth(node.styles);
  if (borderW > 0) {
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
      // Para dividers, centralizar o stroke
      if (isDivider || node.tagName === "hr") {
        frame.strokeAlign = "CENTER";
      }
    }
  }

  // Tratamento especial para dividers/HR elements
  if (isDivider || node.tagName === "hr") {
    frame.fills = [];
    if (!borderW || borderW === 0) {
      // Divider padrão: borda cinza clara
      const defaultBorder: SolidPaint = {
        type: "SOLID",
        color: { r: 0.93, g: 0.93, b: 0.93 },
        opacity: 1
      };
      frame.strokes = [defaultBorder];
      frame.strokeWeight = 1;
      frame.strokeAlign = "CENTER";
    }
  }

  // Corner radius - NUNCA aplicar em dividers
  const r = isDivider
    ? 0
    : parseBorderRadius(node.styles, node.rect.width, node.rect.height);
  if (r > 0) frame.cornerRadius = r;

  // Shadow - NUNCA aplicar em dividers
  const shadow = isDivider ? null : parseBoxShadow(node.styles.boxShadow);
  if (shadow) frame.effects = [shadow];

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
  if (!parentIsAutoLayout) {
    frame.x = node.rect.x - parentAbs.x;
    frame.y = node.rect.y - parentAbs.y;
  } else {
    // Heuristic for mx-auto: center all children in this container
    if (hasAutoHorizontalMargins(node.styles)) {
      parent.counterAxisAlignItems = "CENTER";
    }
  }

  // Import children (always using absolute positioning relative ao frame)
  for (const child of node.children) {
    await importNode(child, frame, abs, false);
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

  // Place in viewport
  root.x = figma.viewport.bounds.x + 80;
  root.y = figma.viewport.bounds.y + 80;

  figma.currentPage.appendChild(root);

  await importNode(tree, root, { x: 0, y: 0 }, false);

  // Select
  figma.currentPage.selection = [root];
  figma.viewport.scrollAndZoomIntoView([root]);

  return root;
}
