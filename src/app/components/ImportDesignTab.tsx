import React, {
  useMemo,
  useRef,
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef
} from "react";
import html2canvas from "html2canvas";
import styled from "styled-components";

interface ImportDesignTabProps {
  hideButton?: boolean;
  onStateChange?: (canImport: boolean, isLoading: boolean) => void;
}

export interface ImportDesignTabRef {
  handleImport: () => void;
  canImport: boolean;
  isLoading: boolean;
}

const ImportContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  color: #e0e0e0;
  height: 100%;
  overflow: hidden;
  padding: 0;
  position: relative;
`;

const CodeInputContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const CodeLabel = styled.div`
  display: flex;
  align-items: center;
  font-size: 12px;
  font-weight: 500;
  color: #a0a0a0;

  &::before {
    content: "";
    display: inline-block;
    width: 4px;
    height: 16px;
    background-color: ${props => props.color || "#3b82f6"};
    margin-right: 8px;
    border-radius: 2px;
  }
`;

const CodeTextArea = styled.textarea`
  width: 100%;
  flex: 1;
  min-height: 150px;
  max-height: 500px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 12px;
  color: #e0e0e0;
  font-family: "Fira Code", monospace;
  font-size: 13px;
  line-height: 1.5;
  resize: vertical;
  outline: none;
  transition: border-color 0.2s;

  &:focus {
    border-color: #3b82f6;
  }

  &::placeholder {
    color: #666;
  }
`;

const UrlInput = styled.input`
  width: 100%;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 10px 12px;
  color: #e0e0e0;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;

  &:focus {
    border-color: #3b82f6;
  }

  &::placeholder {
    color: #666;
  }
`;

const SettingsBox = styled.div`
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 10px;
  margin-top: 0;
  flex-shrink: 0;
`;

const SettingItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #ccc;
  margin-bottom: 8px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const SettingValue = styled.span`
  color: #fff;
  font-weight: 500;
`;

const SettingInput = styled.input`
  width: 92px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  padding: 6px 8px;
  color: #fff;
  font-size: 12px;
  outline: none;

  &:focus {
    border-color: #3b82f6;
  }

  /* Estilizar os spinners (botões +/-) dos inputs number */
  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  /* Firefox spinner styling */
  &[type="number"] {
    -moz-appearance: textfield;
  }

  /* Alternativamente, permitir spinners com cor cinza */
  &::-webkit-outer-spin-button:hover,
  &::-webkit-inner-spin-button:hover {
    filter: brightness(0.7);
  }
`;

const Divider = styled.div`
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  position: absolute;
  bottom: 70px;
  left: -32px;
  width: calc(100% + 64px);
`;

const CreateButton = styled.button`
  background: #18a0fb;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-family: "Inter", sans-serif;
  font-size: 16px !important;
  line-height: 1;
  letter-spacing: 0.01em;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  bottom: 16px;
  left: 0;
  right: 0;

  &:hover:not(:disabled) {
    background: #0f86d9;
  }

  &:active:not(:disabled) {
    background: #0c74c2;
  }

  &:disabled {
    background: rgba(255, 255, 255, 0.16);
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

const Switch = styled.div<{ active: boolean }>`
  width: 32px;
  height: 18px;
  background: ${props =>
    props.active ? "#18a0fb" : "rgba(255, 255, 255, 0.2)"};
  border-radius: 9px;
  position: relative;
  cursor: pointer;
  transition: background 0.2s;

  &::after {
    content: "";
    position: absolute;
    top: 2px;
    left: ${props => (props.active ? "16px" : "2px")};
    width: 14px;
    height: 14px;
    background: #fff;
    border-radius: 50%;
    transition: left 0.2s;
  }
`;

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

function clampNumber(value: number) {
  if (!Number.isFinite(value)) return 0;
  // Avoid extremely long decimals in postMessage payload
  return Math.round(value * 100) / 100;
}

function getUrlFromCssBackgroundImage(
  backgroundImage: string
): string | undefined {
  if (!backgroundImage) return undefined;
  // Examples: url("https://..."), url(https://...), none
  const match = backgroundImage.match(/url\((['"]?)(.*?)\1\)/i);
  return match?.[2];
}

function pickComputedStyles(cs: CSSStyleDeclaration): Record<string, string> {
  // Keep this list tight: smaller payload, faster import.
  const keys = [
    // Layout
    "display",
    "position",
    "flexDirection",
    "justifyContent",
    "alignItems",
    "flexWrap",
    "gap",
    "rowGap",
    "columnGap",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "marginTop",
    "marginRight",
    "marginBottom",
    "marginLeft",
    "overflow",
    "overflowX",
    "overflowY",

    // Box
    "backgroundColor",
    "backgroundImage",
    "background",
    "backgroundSize",
    "backgroundPosition",
    "backgroundRepeat",
    "borderTopWidth",
    "borderRightWidth",
    "borderBottomWidth",
    "borderLeftWidth",
    "borderTopColor",
    "borderRightColor",
    "borderBottomColor",
    "borderLeftColor",
    "borderColor",
    "borderStyle",
    "borderTopStyle",
    "borderRightStyle",
    "borderBottomStyle",
    "borderLeftStyle",
    "borderRadius",
    "boxShadow",
    "filter",
    "backdropFilter",
    "webkitBackdropFilter",
    "opacity",
    "gap",
    "rowGap",
    "columnGap",
    "flex",
    "flexGrow",
    "flexShrink",
    "flexBasis",
    "width",
    "maxWidth",
    "height",
    "minHeight",
    "maxHeight",
    "minWidth",
    "whiteSpace",
    "boxSizing",

    // Grid
    "gridTemplateColumns",
    "gridTemplateRows",
    "gridAutoFlow",
    "gridAutoColumns",
    "gridAutoRows",
    "gridColumn",
    "gridRow",

    // Text
    "color",
    "fontFamily",
    "fontSize",
    "fontWeight",
    "lineHeight",
    "textAlign",
    "letterSpacing",
    "textTransform",
    "whiteSpace",

    // Additional for Tailwind custom colors
    "--primary",
    "--on-primary",
    "--background",
    "--on-background",
    "--surface",
    "--on-surface",
    "--primary-container",
    "--on-primary-container",
    "--secondary",
    "--on-secondary",
    "--secondary-container",
    "--on-secondary-container",
    "--tertiary",
    "--on-tertiary",
    "--tertiary-container",
    "--on-tertiary-container",
    "--error",
    "--on-error",
    "--error-container",
    "--on-error-container",
    "--outline",
    "--outline-variant",
    "--surface-container",
    "--surface-container-low",
    "--surface-container-high",
    "--surface-container-highest",
    "--on-surface-variant",
    "--on-surface-variant",
    "--on-secondary-container",
    "--surface-tint",
    "--primary-dim",
    "--secondary-dim",
    "--tertiary-dim",
    "--error-dim",
    "--primary-fixed",
    "--on-primary-fixed",
    "--primary-fixed-dim",
    "--on-primary-fixed-variant",
    "--secondary-fixed",
    "--on-secondary-fixed",
    "--secondary-fixed-dim",
    "--on-secondary-fixed-variant",
    "--tertiary-fixed",
    "--on-tertiary-fixed",
    "--tertiary-fixed-dim",
    "--on-tertiary-fixed-variant",
    "--surface-dim",
    "--surface-bright",
    "--surface-container-lowest",
    "--inverse-surface",
    "--inverse-on-surface",
    "--inverse-primary"
  ] as const;

  const out: Record<string, string> = {};
  for (const key of keys) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const v = (cs as any)[key];
    if (typeof v === "string" && v) out[key] = v;
  }
  return out;
}

async function serializeDomTree(
  rootEl: HTMLElement,
  viewportEl: HTMLElement,
  iconImageMap: Map<string, string>,
  imageMap: Map<string, string>
): Promise<SerializedNode> {
  const viewportRect = viewportEl.getBoundingClientRect();

  const toAbsoluteUrl = (rawUrl?: string) => {
    if (!rawUrl) return undefined;
    if (rawUrl.startsWith("data:")) return rawUrl;
    try {
      return new URL(rawUrl, rootEl.ownerDocument.baseURI).href;
    } catch {
      return rawUrl;
    }
  };

  const urlToDataUrl = async (rawUrl?: string): Promise<string | undefined> => {
    const absoluteUrl = toAbsoluteUrl(rawUrl);
    if (!absoluteUrl) return undefined;
    if (absoluteUrl.startsWith("data:")) return absoluteUrl;

    try {
      // Try fetch with CORS mode first
      const response = await fetch(absoluteUrl, { mode: "cors" });
      if (!response.ok) {
        console.warn(
          "[ImportDesignTab] Image fetch failed:",
          response.status,
          absoluteUrl
        );
        return undefined;
      }
      const blob = await response.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.warn(
        "[ImportDesignTab] Não foi possível embutir asset:",
        absoluteUrl,
        error
      );
      return undefined;
    }
  };

  const serializeNode = async (node: Node): Promise<SerializedNode | null> => {
    // Text node
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent || "").replace(/\s+/g, " ").trim();
      if (!text) return null;
      const parentEl = node.parentElement;

      // More accurate: use DOM Range to get text rect(s)
      let measuredRect: SerializedRect | null = null;
      try {
        const range = (parentEl?.ownerDocument || document).createRange();
        range.selectNodeContents(node);
        const clientRects = Array.from(range.getClientRects());
        const nonEmpty = clientRects.filter(
          r => r.width > 0.5 && r.height > 0.5
        );
        const rects = nonEmpty.length ? nonEmpty : clientRects;
        if (rects.length > 0) {
          const left = Math.min(...rects.map(r => r.left));
          const top = Math.min(...rects.map(r => r.top));
          const right = Math.max(...rects.map(r => r.right));
          const bottom = Math.max(...rects.map(r => r.bottom));
          measuredRect = {
            x: clampNumber(left - viewportRect.left),
            y: clampNumber(top - viewportRect.top),
            width: clampNumber(right - left),
            height: clampNumber(bottom - top)
          };
        }
      } catch {
        // ignore and fallback below
      }

      // Fallback: parent element rect
      const parentRect = parentEl?.getBoundingClientRect();
      const parentStyles = parentEl ? getComputedStyle(parentEl) : null;
      const paddingLeft = parentStyles
        ? parseFloat(parentStyles.paddingLeft || "0") || 0
        : 0;
      const paddingRight = parentStyles
        ? parseFloat(parentStyles.paddingRight || "0") || 0
        : 0;
      const fallbackRect: SerializedRect = {
        x: clampNumber(
          (parentRect?.left || viewportRect.left) +
            paddingLeft -
            viewportRect.left
        ),
        y: clampNumber(
          (parentRect?.top || viewportRect.top) - viewportRect.top
        ),
        width: clampNumber(
          Math.max(0, (parentRect?.width || 0) - paddingLeft - paddingRight)
        ),
        height: clampNumber(parentRect?.height || 0)
      };
      const styles = parentStyles ? pickComputedStyles(parentStyles) : {};
      const isCenteredFlexText =
        styles.display.includes("flex") &&
        styles.justifyContent === "center" &&
        styles.alignItems === "center" &&
        parentEl?.children.length === 0;
      const hasInlineElementSiblings =
        !!parentEl &&
        Array.from(parentEl.childNodes).some(
          child => child.nodeType === Node.ELEMENT_NODE
        );
      const shouldUseParentTextWidth =
        !isCenteredFlexText &&
        !hasInlineElementSiblings &&
        styles.whiteSpace !== "nowrap" &&
        parentRect &&
        parentRect.width > 0 &&
        fallbackRect.width > (measuredRect?.width || 0);
      const rect =
        isCenteredFlexText && parentRect
          ? {
              x: fallbackRect.x,
              y: clampNumber(
                parentRect.top +
                  ((parentRect.height || 0) -
                    (measuredRect?.height || fallbackRect.height)) /
                    2 -
                  viewportRect.top
              ),
              width: fallbackRect.width,
              height: measuredRect?.height || fallbackRect.height
            }
          : shouldUseParentTextWidth && measuredRect
          ? {
              x: fallbackRect.x,
              y: measuredRect.y,
              width: fallbackRect.width,
              height: measuredRect.height
            }
          : measuredRect || fallbackRect;
      return { nodeType: "text", text, rect, styles };
    }

    // Element node
    if (node.nodeType !== Node.ELEMENT_NODE) return null;
    const el = node as HTMLElement;

    const tagName = el.tagName.toLowerCase();
    if (["script", "style", "meta", "link", "head", "title"].includes(tagName))
      return null;

    const cs = getComputedStyle(el);
    if (
      cs.display === "none" ||
      cs.visibility === "hidden" ||
      Number(cs.opacity) === 0
    ) {
      return null;
    }

    const rectRaw = el.getBoundingClientRect();
    const rect: SerializedRect = {
      x: clampNumber(rectRaw.left - viewportRect.left),
      y: clampNumber(rectRaw.top - viewportRect.top),
      width: clampNumber(rectRaw.width),
      height: clampNumber(rectRaw.height)
    };

    // Skip invisible / zero-size nodes (but keep inputs/buttons that might be tiny)
    const isInteractive = tagName === "input" || tagName === "button";
    if (!isInteractive && (rect.width < 0.5 || rect.height < 0.5)) return null;

    const attrs: Record<string, string> = {};
    for (const { name, value } of Array.from(el.attributes)) {
      attrs[name] = value;
    }
    if (tagName === "input") {
      const input = el as HTMLInputElement;
      if (input.placeholder) attrs.placeholder = input.placeholder;
      if (input.value) attrs.value = input.value;
      if (input.type) attrs.type = input.type;
    }

    const styles = pickComputedStyles(cs);
    const bgUrl = getUrlFromCssBackgroundImage(styles.backgroundImage || "");
    const imageUrl = toAbsoluteUrl(
      tagName === "img" ? attrs.src || undefined : bgUrl
    );

    const iconId = el.getAttribute("data-fig-icon-id") || undefined;
    const imageData = iconId ? iconImageMap.get(iconId) : undefined;
    const imgId = el.getAttribute("data-fig-img-id") || undefined;
    const imgData = imgId ? imageMap.get(imgId) : undefined;
    const isIcon =
      !!iconId ||
      /material-symbols|material-icons/i.test(attrs.class || "") ||
      /Material Symbols/i.test(styles.fontFamily || "");
    const iconName = isIcon
      ? (el.textContent || "").trim().replace(/\s+/g, " ")
      : undefined;

    // Para ícones, REMOVER backgroundColor E color completamente
    // Isso garante que a cor do ícone não seja aplicada ao frame
    // Apenas o imageData (PNG rasterizado) é usado
    let finalStyles: typeof styles;
    if (isIcon) {
      finalStyles = { ...styles };
      delete finalStyles.backgroundColor; // Não aplicar fundo
      delete finalStyles.color; // Não aplicar cor (já está no PNG rasterizado)
    } else {
      finalStyles = styles;
    }

    const children: SerializedNode[] = [];
    if (!isIcon) {
      // Para ícones, não serializamos o texto interno para evitar "gavel" etc.
      for (const child of Array.from(el.childNodes)) {
        const s = await serializeNode(child);
        if (s) children.push(s);
      }
    }

    const embeddedImageData =
      imageData ||
      imgData ||
      (imageUrl ? await urlToDataUrl(imageUrl) : undefined);

    return {
      nodeType: "element",
      tagName,
      attrs,
      rect,
      styles: finalStyles,
      imageUrl,
      imageData: embeddedImageData,
      isIcon,
      iconName,
      children
    };
  };

  // We serialize the root element itself.
  const result = await serializeNode(rootEl);
  if (!result || result.nodeType !== "element") {
    // Fallback: minimal node
    return {
      nodeType: "element",
      tagName: "div",
      attrs: {},
      rect: {
        x: 0,
        y: 0,
        width: clampNumber(viewportRect.width),
        height: clampNumber(viewportRect.height)
      },
      styles: {},
      children: []
    };
  }

  return result;
}

async function fetchAndInlineExternalScripts(html: string): Promise<string> {
  const scriptRegex = /<script\b[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi;
  let inlinedHtml = html;

  const matches = [...html.matchAll(scriptRegex)];
  for (const match of matches) {
    const fullTag = match[0];
    const src = match[1];

    // Inline Tailwind CSS scripts to bypass CSP restrictions
    if (src.includes("cdn.tailwindcss.com")) {
      try {
        console.log(
          `[ImportDesignTab] Buscando script externo para inline: ${src}`
        );
        const response = await fetch(src);
        if (response.ok) {
          const scriptContent = await response.text();
          inlinedHtml = inlinedHtml.replace(
            fullTag,
            `<script data-tailwind-cdn="true">${scriptContent}</script>`
          );
          console.log(`[ImportDesignTab] Script inlined com sucesso: ${src}`);
        } else {
          console.warn(
            `[ImportDesignTab] Falha ao buscar script ${src}, status: ${response.status}`
          );
        }
      } catch (err) {
        console.warn(
          `[ImportDesignTab] Falha ao buscar script externo ${src}:`,
          err
        );
      }
    }
  }
  return inlinedHtml;
}

async function renderHtmlInIframeAndSerialize(
  fullHtml: string,
  rawCss: string,
  viewport: { width: number; height: number }
) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms");
  iframe.style.position = "fixed";
  iframe.style.left = "-10000px";
  iframe.style.top = "0";
  iframe.style.width = `${viewport.width}px`;
  iframe.style.height = `${viewport.height}px`;
  iframe.style.border = "0";
  iframe.style.background = "#fff";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";

  // If the user pasted only a fragment, wrap it.
  const looksLikeFullDoc =
    /<html[\s>]/i.test(fullHtml) && /<body[\s>]/i.test(fullHtml);
  const cssTag = rawCss.trim() ? `<style>${rawCss}</style>` : "";
  const htmlWithCss = looksLikeFullDoc
    ? /<\/head>/i.test(fullHtml)
      ? fullHtml.replace(/<\/head>/i, `${cssTag}</head>`)
      : fullHtml.replace(/<body/i, `<head>${cssTag}</head><body`)
    : `<!DOCTYPE html><html><head><meta charset="utf-8"/>${cssTag}</head><body>${fullHtml}</body></html>`;
  let html = normalizeTailwindConfigOrder(htmlWithCss);
  // Injeta as cores do tailwind.config como CSS vars no :root para que
  // getComputedStyle() possa resolver bg-primary, text-on-surface etc.
  html = injectTailwindThemeCssVars(html);

  // ── Pré-compilar as classes Tailwind como CSS real ────────────────────────
  // Isso garante que o browser renderize corretamente mesmo se o CDN falhar.
  // Injetado ANTES do CDN script → CDN sobrescreve quando carrega (preferred).
  const twFallbackCss = buildTailwindFallbackCss(html);
  if (twFallbackCss) {
    const styleTag = `<style id="solarops-tw-fallback">\n${twFallbackCss}\n</style>`;
    // Inserir ANTES do CDN script para que CDN tenha prioridade
    if (/<script[^>]*cdn\.tailwindcss\.com/i.test(html)) {
      html = html.replace(
        /<script([^>]*cdn\.tailwindcss\.com[^>]*)>/i,
        `${styleTag}\n<script$1>`
      );
    } else if (/<\/head>/i.test(html)) {
      html = html.replace(/<\/head>/i, `${styleTag}\n</head>`);
    }
  }

  html = await fetchAndInlineExternalScripts(html);

  // Use srcdoc so we can read the DOM (same-origin).
  iframe.srcdoc = html;
  document.body.appendChild(iframe);

  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(
        () => reject(new Error("Timeout carregando HTML no iframe")),
        8000
      );
      iframe.onload = () => {
        window.clearTimeout(timeout);
        resolve();
      };
    });

    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    if (!doc || !win)
      throw new Error("Não foi possível acessar o conteúdo do iframe");

    const body = doc.body as HTMLElement | null;
    if (!body) throw new Error("Iframe sem body");
    await waitForRenderedStylesAndAssets(doc, win, body);

    // Choose viewport element as html element to stabilize rect origin.
    const viewportEl = doc.documentElement as HTMLElement;

    // Pré-capturar todas as imagens como data URLs para evitar problemas de CORS
    const imageMap = new Map<string, string>();
    const imgElements = Array.from(
      doc.querySelectorAll("img")
    ) as HTMLImageElement[];

    console.log(
      `[ImportDesignTab] Pré-carregando ${imgElements.length} imagens...`
    );

    for (const img of imgElements) {
      const id = `img-${imgElements.indexOf(img)}`;
      img.setAttribute("data-fig-img-id", id);
      try {
        if (img.src && img.complete && img.naturalWidth > 0) {
          // Criar canvas para converter imagem para data URL
          const canvas = doc.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const dataUrl = canvas.toDataURL("image/png");
            imageMap.set(id, dataUrl);
            console.log(
              `[ImportDesignTab] ✓ Imagem ${id} convertida: ${img.src.substring(
                0,
                50
              )}...`
            );
          }
        } else {
          console.warn(`[ImportDesignTab] ⚠️ Imagem não carregada: ${img.src}`);
        }
      } catch (err) {
        console.warn("[ImportDesignTab] ❌ Falha ao converter imagem", err);
      }
    }

    // Pré-capturar ícones como imagens rasterizadas
    const iconImageMap = new Map<string, string>();
    const iconSelectors = [
      ".material-symbols-outlined",
      ".material-symbols-rounded",
      ".material-icons"
    ];
    const iconElements = iconSelectors
      .flatMap(sel => Array.from(doc.querySelectorAll(sel)))
      .filter((el, idx, arr) => arr.indexOf(el) === idx) as HTMLElement[];

    let iconIndex = 0;
    for (const el of iconElements) {
      const id = `icon-${iconIndex++}`;
      el.setAttribute("data-fig-icon-id", id);
      try {
        // Obter as cores computadas do ícone original
        const computedStyle = win.getComputedStyle(el);
        const iconColor = computedStyle.color || "#000000";
        const iconFontSize = computedStyle.fontSize || "24px";
        const iconFontWeight = computedStyle.fontWeight || "400";

        // Criar wrapper temporário TRANSPARENTE para Material Symbols
        // A transparência permite que o ícone seja capturado sem background branco
        const wrapper = doc.createElement("div");
        wrapper.style.display = "inline-flex";
        wrapper.style.alignItems = "center";
        wrapper.style.justifyContent = "center";
        wrapper.style.backgroundColor = "transparent"; // ← TRANSPARÊNCIA para evitar cor de fundo
        wrapper.style.padding = "4px";
        wrapper.style.borderRadius = "0px";

        const clonedEl = el.cloneNode(true) as HTMLElement;

        // CRÍTICO: Aplicar as cores e estilos computados ao clone
        // Isso garante que html2canvas capture a cor correta do ícone
        clonedEl.style.color = iconColor;
        clonedEl.style.fontSize = iconFontSize;
        clonedEl.style.fontWeight = iconFontWeight;
        clonedEl.style.display = "inline-flex";
        clonedEl.style.alignItems = "center";
        clonedEl.style.justifyContent = "center";
        clonedEl.style.backgroundColor = "transparent"; // Remover background do ícone também

        wrapper.appendChild(clonedEl);
        doc.body.appendChild(wrapper);

        console.log(
          `[ImportDesignTab] Rasterizando ícone com cor: ${iconColor}, tamanho: ${iconFontSize}`
        );

        const canvas = await html2canvas(wrapper, {
          backgroundColor: null, // null para capturar com transparência
          windowWidth: viewport.width,
          windowHeight: viewport.height,
          scale: 2,
          logging: false,
          // Garantir que use o contexto do iframe
          // @ts-ignore - opção não tipada em todas as versões
          window: win
        } as any);
        const dataUrl = canvas.toDataURL("image/png");
        iconImageMap.set(id, dataUrl);
        doc.body.removeChild(wrapper);

        console.log(`[ImportDesignTab] ✓ Ícone ${id} rasterizado com sucesso`);
      } catch (err) {
        console.warn("[ImportDesignTab] ❌ Falha ao rasterizar ícone", err);
      }
    }

    const tree = await serializeDomTree(
      body,
      viewportEl,
      iconImageMap,
      imageMap
    );
    return tree;
  } finally {
    iframe.remove();
  }
}

function normalizeTailwindConfigOrder(html: string) {
  const configMatch = html.match(
    /<script\b[^>]*id=["']tailwind-config["'][^>]*>[\s\S]*?<\/script>/i
  );
  if (!configMatch) return html;

  const configScript = configMatch[0];
  const withoutConfig = html.replace(configScript, "");
  return withoutConfig.replace(
    /<script\b([^>]*src=["'][^"']*cdn\.tailwindcss\.com[^"']*["'][^>]*)><\/script>/i,
    `<script$1></script>\n${configScript}`
  );
}

/**
 * Extrai as cores do tailwind.config e injeta como CSS variables no :root
 * para que getComputedStyle() possa resolver classes como bg-primary, text-on-surface etc.
 */
function injectTailwindThemeCssVars(html: string): string {
  const theme = readTailwindThemeFromHtml(html);
  if (!Object.keys(theme.colors).length) return html;

  let vars = "";
  for (const [name, value] of Object.entries(theme.colors)) {
    vars += `  --tw-color-${name}: ${value};\n`;
    // Também injeta como var sem prefixo para compatibilidade
    vars += `  --${name}: ${value};\n`;
  }

  const styleTag = `<style id="solarops-tw-vars">\n:root {\n${vars}}\n</style>`;

  // Inserir antes do </head> ou no início do <body>
  if (/<\/head>/i.test(html)) {
    return html.replace(/<\/head>/i, `${styleTag}\n</head>`);
  }
  return html.replace(/<body/i, `${styleTag}\n<body`);
}

// ─── CSS GENERATOR — Converte classes Tailwind em CSS real ───────────────────
// Gera um <style> completo a partir das classes usadas no HTML.
// Injetado ANTES do CDN: CDN sobrescreve quando carrega, caso contrário,
// o CSS gerado garante layout e cores corretas.
function buildTailwindFallbackCss(html: string): string {
  // 1. Extrair classes únicas de todo o HTML
  const classes = new Set<string>();
  for (const m of html.matchAll(/\bclass\s*=\s*["']([^"']+)["']/g)) {
    m[1].split(/\s+/).forEach(c => {
      if (c) classes.add(c);
    });
  }
  if (!classes.size) return "";

  // 2. Ler tema do tailwind-config
  const theme = readTailwindThemeFromHtml(html);

  // 3. Mapa de cores (defaults + tema)
  const COLORS: Record<string, string> = {
    white: "#ffffff",
    black: "#000000",
    transparent: "transparent",
    current: "currentColor",
    "slate-50": "#f8fafc",
    "slate-100": "#f1f5f9",
    "slate-200": "#e2e8f0",
    "slate-300": "#cbd5e1",
    "slate-400": "#94a3b8",
    "slate-500": "#64748b",
    "slate-600": "#475569",
    "slate-700": "#334155",
    "slate-800": "#1e293b",
    "slate-900": "#0f172a",
    "slate-950": "#020617",
    "gray-50": "#f9fafb",
    "gray-100": "#f3f4f6",
    "gray-200": "#e5e7eb",
    "gray-300": "#d1d5db",
    "gray-400": "#9ca3af",
    "gray-500": "#6b7280",
    "gray-600": "#4b5563",
    "gray-700": "#374151",
    "gray-800": "#1f2937",
    "gray-900": "#111827",
    "gray-950": "#030712",
    "blue-50": "#eff6ff",
    "blue-100": "#dbeafe",
    "blue-200": "#bfdbfe",
    "blue-300": "#93c5fd",
    "blue-400": "#60a5fa",
    "blue-500": "#3b82f6",
    "blue-600": "#2563eb",
    "blue-700": "#1d4ed8",
    "blue-800": "#1e40af",
    "blue-900": "#1e3a8a",
    "indigo-50": "#eef2ff",
    "indigo-400": "#818cf8",
    "indigo-500": "#6366f1",
    "indigo-600": "#4f46e5",
    "red-50": "#fef2f2",
    "red-400": "#f87171",
    "red-500": "#ef4444",
    "red-600": "#dc2626",
    "green-50": "#f0fdf4",
    "green-500": "#22c55e",
    "green-600": "#16a34a",
    "yellow-50": "#fefce8",
    "yellow-400": "#facc15",
    "yellow-500": "#eab308",
    "orange-500": "#f97316",
    "purple-500": "#a855f7",
    "pink-500": "#ec4899",
    // Material You
    primary: "#004ac6",
    "on-primary": "#ffffff",
    "primary-container": "#dbe1ff",
    "on-primary-container": "#001551",
    "primary-fixed": "#dbe1ff",
    "primary-fixed-dim": "#b2c5ff",
    "on-primary-fixed": "#001551",
    "on-primary-fixed-variant": "#003398",
    "primary-dim": "#0048c1",
    secondary: "#506076",
    "on-secondary": "#ffffff",
    "secondary-container": "#d3e4fe",
    "on-secondary-container": "#0c1e2e",
    "secondary-fixed": "#d3e4fe",
    "secondary-fixed-dim": "#b7c8e0",
    "on-secondary-fixed": "#0c1e2e",
    "on-secondary-fixed-variant": "#384d62",
    "secondary-dim": "#44546a",
    tertiary: "#5b5d78",
    "on-tertiary": "#ffffff",
    "tertiary-container": "#ddddfe",
    "on-tertiary-container": "#191a31",
    "tertiary-fixed": "#ddddfe",
    "tertiary-fixed-dim": "#c0c1e8",
    "on-tertiary-fixed": "#191a31",
    "on-tertiary-fixed-variant": "#434560",
    "tertiary-dim": "#4f516c",
    error: "#9f403d",
    "on-error": "#ffffff",
    "error-container": "#ffdad6",
    "on-error-container": "#410002",
    "error-dim": "#4e0309",
    background: "#f7f9fb",
    "on-background": "#2a3439",
    surface: "#f7f9fb",
    "on-surface": "#2a3439",
    "surface-variant": "#d9e4ea",
    "on-surface-variant": "#566166",
    outline: "#717c82",
    "outline-variant": "#a9b4b9",
    "inverse-surface": "#0b0f10",
    "inverse-on-surface": "#9a9d9f",
    "inverse-primary": "#618bff",
    "surface-tint": "#0053db",
    "surface-dim": "#cfdce3",
    "surface-bright": "#f7f9fb",
    "surface-container-lowest": "#ffffff",
    "surface-container-low": "#f0f4f7",
    "surface-container": "#e8eff3",
    "surface-container-high": "#e1e9ee",
    "surface-container-highest": "#d9e4ea",
    ...theme.colors
  };

  // 4. Mapa de spacing
  const SP: Record<string, string> = {
    px: "1px",
    "0": "0px",
    "0.5": "2px",
    "1": "4px",
    "1.5": "6px",
    "2": "8px",
    "2.5": "10px",
    "3": "12px",
    "3.5": "14px",
    "4": "16px",
    "5": "20px",
    "6": "24px",
    "7": "28px",
    "8": "32px",
    "9": "36px",
    "10": "40px",
    "11": "44px",
    "12": "48px",
    "14": "56px",
    "16": "64px",
    "20": "80px",
    "24": "96px",
    "28": "112px",
    "32": "128px",
    "36": "144px",
    "40": "160px",
    "44": "176px",
    "48": "192px",
    "52": "208px",
    "56": "224px",
    "60": "240px",
    "64": "256px",
    "72": "288px",
    "80": "320px",
    "96": "384px",
    ...theme.spacing
  };

  // 5. Frações de largura/altura (todos os denominadores Tailwind)
  const FRAC: Record<string, string> = {
    "1/2": "50%",
    "1/3": "33.3333%",
    "2/3": "66.6667%",
    "1/4": "25%",
    "2/4": "50%",
    "3/4": "75%",
    "1/5": "20%",
    "2/5": "40%",
    "3/5": "60%",
    "4/5": "80%",
    "1/6": "16.6667%",
    "5/6": "83.3333%",
    "1/12": "8.3333%",
    "2/12": "16.6667%",
    "3/12": "25%",
    "4/12": "33.3333%",
    "5/12": "41.6667%",
    "6/12": "50%",
    "7/12": "58.3333%",
    "8/12": "66.6667%",
    "9/12": "75%",
    "10/12": "83.3333%",
    "11/12": "91.6667%"
  };

  // 6. Border radii
  const RADII: Record<string, string> = {
    none: "0px",
    sm: "2px",
    DEFAULT: "4px",
    md: "6px",
    lg: "8px",
    xl: "12px",
    "2xl": "16px",
    "3xl": "24px",
    full: "9999px",
    ...theme.radius
  };

  // 7. Font sizes [size, lineHeight]
  const FS: Record<string, [string, string]> = {
    xs: ["12px", "16px"],
    sm: ["14px", "20px"],
    base: ["16px", "24px"],
    lg: ["18px", "28px"],
    xl: ["20px", "28px"],
    "2xl": ["24px", "32px"],
    "3xl": ["30px", "36px"],
    "4xl": ["36px", "40px"],
    "5xl": ["48px", "1"],
    "6xl": ["60px", "1"],
    "7xl": ["72px", "1"],
    "8xl": ["96px", "1"],
    "9xl": ["128px", "1"]
  };

  // 8. Helpers
  const arb = (v: string) =>
    v.startsWith("[") && v.endsWith("]")
      ? v.slice(1, -1).replace(/_/g, " ")
      : null;

  const resolveColor = (raw: string): string | null => {
    const si = raw.lastIndexOf("/");
    if (si > 0) {
      const name = raw.slice(0, si);
      const opStr = raw.slice(si + 1);
      const base = COLORS[name] || arb(name);
      if (!base) return null;
      const opM = opStr.match(/^\[([0-9.]+)\]$/);
      const op = opM ? parseFloat(opM[1]) : parseInt(opStr, 10) / 100;
      if (base.startsWith("#") && base.length >= 7) {
        const r = parseInt(base.slice(1, 3), 16);
        const g = parseInt(base.slice(3, 5), 16);
        const b = parseInt(base.slice(5, 7), 16);
        return `rgba(${r},${g},${b},${op})`;
      }
      return base;
    }
    return arb(raw) || COLORS[raw] || null;
  };

  const sp = (v: string) => arb(v) || SP[v] || null;

  // Escapa classe para uso como seletor CSS
  const esc = (cls: string) => cls.replace(/[^a-zA-Z0-9-_]/g, c => `\\${c}`);

  // 9. Gerar regras CSS
  // Passagem 1: não-responsivas; Passagem 2-6: sm → md → lg → xl → 2xl
  // Isso garante que classes responsivas sobrescrevam as base
  const nonResp: string[] = [];
  const resp: Record<string, string[]> = {
    sm: [],
    md: [],
    lg: [],
    xl: [],
    "2xl": []
  };

  const addRule = (original: string, decls: string[]) => {
    if (!decls.length) return;
    const rule = `.${esc(original)} { ${decls.join("; ")} }`;
    const prefix = original.match(/^(sm|md|lg|xl|2xl):/)?.[1];
    if (prefix) resp[prefix].push(rule);
    else nonResp.push(rule);
  };

  const genDecls = (cls: string, original: string): string[] => {
    const d: string[] = [];

    // ── Display ──────────────────────────────────────────────────────────────
    if (cls === "flex") d.push("display: flex");
    else if (cls === "inline-flex") d.push("display: inline-flex");
    else if (cls === "grid") d.push("display: grid");
    else if (cls === "inline-grid") d.push("display: inline-grid");
    else if (cls === "block") d.push("display: block");
    else if (cls === "inline-block") d.push("display: inline-block");
    else if (cls === "inline") d.push("display: inline");
    else if (cls === "hidden") d.push("display: none");
    else if (cls === "contents") d.push("display: contents");
    // ── Flex ──────────────────────────────────────────────────────────────────
    else if (cls === "flex-col") d.push("flex-direction: column");
    else if (cls === "flex-col-reverse")
      d.push("flex-direction: column-reverse");
    else if (cls === "flex-row") d.push("flex-direction: row");
    else if (cls === "flex-row-reverse") d.push("flex-direction: row-reverse");
    else if (cls === "flex-wrap") d.push("flex-wrap: wrap");
    else if (cls === "flex-wrap-reverse") d.push("flex-wrap: wrap-reverse");
    else if (cls === "flex-nowrap") d.push("flex-wrap: nowrap");
    else if (cls === "flex-1") d.push("flex: 1 1 0%");
    else if (cls === "flex-auto") d.push("flex: 1 1 auto");
    else if (cls === "flex-none") d.push("flex: none");
    else if (cls === "flex-grow" || cls === "grow") d.push("flex-grow: 1");
    else if (cls === "flex-grow-0" || cls === "grow-0") d.push("flex-grow: 0");
    else if (cls === "flex-shrink" || cls === "shrink")
      d.push("flex-shrink: 1");
    else if (cls === "flex-shrink-0" || cls === "shrink-0")
      d.push("flex-shrink: 0");
    // ── Alignment ─────────────────────────────────────────────────────────────
    else if (cls === "items-start") d.push("align-items: flex-start");
    else if (cls === "items-center") d.push("align-items: center");
    else if (cls === "items-end") d.push("align-items: flex-end");
    else if (cls === "items-baseline") d.push("align-items: baseline");
    else if (cls === "items-stretch") d.push("align-items: stretch");
    else if (cls === "justify-start") d.push("justify-content: flex-start");
    else if (cls === "justify-center") d.push("justify-content: center");
    else if (cls === "justify-end") d.push("justify-content: flex-end");
    else if (cls === "justify-between")
      d.push("justify-content: space-between");
    else if (cls === "justify-around") d.push("justify-content: space-around");
    else if (cls === "justify-evenly") d.push("justify-content: space-evenly");
    else if (cls === "self-start") d.push("align-self: flex-start");
    else if (cls === "self-center") d.push("align-self: center");
    else if (cls === "self-end") d.push("align-self: flex-end");
    else if (cls === "self-stretch") d.push("align-self: stretch");
    else if (cls === "self-auto") d.push("align-self: auto");
    else if (cls === "place-items-center") d.push("place-items: center");
    else if (cls === "place-content-center") d.push("place-content: center");
    // ── Grid ──────────────────────────────────────────────────────────────────
    else if (cls.startsWith("grid-cols-")) {
      const k = cls.slice(10);
      const a = arb(k);
      d.push(
        `grid-template-columns: ${a ||
          (k === "none" ? "none" : `repeat(${k},minmax(0,1fr))`)}`
      );
    } else if (cls.startsWith("grid-rows-")) {
      const k = cls.slice(10);
      const a = arb(k);
      d.push(`grid-template-rows: ${a || `repeat(${k},minmax(0,1fr))`}`);
    } else if (cls.startsWith("col-span-")) {
      const n = cls.slice(9);
      d.push(
        `grid-column: ${n === "full" ? "1 / -1" : `span ${n} / span ${n}`}`
      );
    } else if (cls.startsWith("col-start-"))
      d.push(`grid-column-start: ${cls.slice(10)}`);
    else if (cls.startsWith("row-span-")) {
      const n = cls.slice(9);
      d.push(`grid-row: span ${n} / span ${n}`);
    } else if (cls.startsWith("row-start-"))
      d.push(`grid-row-start: ${cls.slice(10)}`);
    // ── Gap ───────────────────────────────────────────────────────────────────
    else if (cls.startsWith("gap-x-")) {
      const v = sp(cls.slice(6));
      if (v) d.push(`column-gap: ${v}`);
    } else if (cls.startsWith("gap-y-")) {
      const v = sp(cls.slice(6));
      if (v) d.push(`row-gap: ${v}`);
    } else if (cls.startsWith("gap-")) {
      const v = sp(cls.slice(4));
      if (v) d.push(`gap: ${v}`);
    } else if (cls.startsWith("space-x-")) {
      const v = sp(cls.slice(8));
      if (v) d.push(`column-gap: ${v}`);
    } else if (cls.startsWith("space-y-")) {
      const v = sp(cls.slice(8));
      if (v) d.push(`row-gap: ${v}`);
    } else if (cls.startsWith("-space-x-")) {
      const v = sp(cls.slice(9));
      if (v) d.push(`column-gap: -${v}`);
    }

    // ── Position ──────────────────────────────────────────────────────────────
    else if (cls === "static") d.push("position: static");
    else if (cls === "relative") d.push("position: relative");
    else if (cls === "absolute") d.push("position: absolute");
    else if (cls === "fixed") d.push("position: fixed");
    else if (cls === "sticky") d.push("position: sticky");
    else if (cls === "inset-0") d.push("top: 0; right: 0; bottom: 0; left: 0");
    else if (cls === "inset-x-0") d.push("left: 0; right: 0");
    else if (cls === "inset-y-0") d.push("top: 0; bottom: 0");
    else if (cls === "top-0") d.push("top: 0px");
    else if (cls === "bottom-0") d.push("bottom: 0px");
    else if (cls === "left-0") d.push("left: 0px");
    else if (cls === "right-0") d.push("right: 0px");
    else if (cls.startsWith("top-")) {
      const v = sp(cls.slice(4)) || arb(cls.slice(4));
      if (v) d.push(`top: ${v}`);
    } else if (cls.startsWith("bottom-")) {
      const v = sp(cls.slice(7)) || arb(cls.slice(7));
      if (v) d.push(`bottom: ${v}`);
    } else if (cls.startsWith("left-")) {
      const v = sp(cls.slice(5)) || arb(cls.slice(5));
      if (v) d.push(`left: ${v}`);
    } else if (cls.startsWith("right-")) {
      const v = sp(cls.slice(6)) || arb(cls.slice(6));
      if (v) d.push(`right: ${v}`);
    }
    // Negativas
    else if (cls.startsWith("-top-")) {
      const v = sp(cls.slice(5)) || arb(cls.slice(5));
      if (v) d.push(`top: -${v}`);
    } else if (cls.startsWith("-bottom-")) {
      const v = sp(cls.slice(8)) || arb(cls.slice(8));
      if (v) d.push(`bottom: -${v}`);
    } else if (cls.startsWith("-left-")) {
      const v = sp(cls.slice(6)) || arb(cls.slice(6));
      if (v) d.push(`left: -${v}`);
    } else if (cls.startsWith("-right-")) {
      const v = sp(cls.slice(7)) || arb(cls.slice(7));
      if (v) d.push(`right: -${v}`);
    }

    // ── Width ─────────────────────────────────────────────────────────────────
    else if (cls === "w-full") d.push("width: 100%");
    else if (cls === "w-screen") d.push("width: 100vw");
    else if (cls === "w-auto") d.push("width: auto");
    else if (cls === "w-fit") d.push("width: fit-content");
    else if (cls === "w-max") d.push("width: max-content");
    else if (cls === "w-min") d.push("width: min-content");
    else if (cls.startsWith("w-")) {
      const k = cls.slice(2);
      const a = arb(k);
      if (a) d.push(`width: ${a}`);
      else if (FRAC[k]) d.push(`width: ${FRAC[k]}`);
      else {
        const v = sp(k);
        if (v) d.push(`width: ${v}`);
      }
    }

    // ── Height ────────────────────────────────────────────────────────────────
    else if (cls === "h-full") d.push("height: 100%");
    else if (cls === "h-screen") d.push("height: 100vh");
    else if (cls === "h-auto") d.push("height: auto");
    else if (cls === "h-fit") d.push("height: fit-content");
    else if (cls.startsWith("min-h-screen")) d.push("min-height: 100vh");
    else if (cls.startsWith("min-h-full")) d.push("min-height: 100%");
    else if (cls.startsWith("min-h-[")) {
      const a = arb(cls.slice(6));
      if (a) d.push(`min-height: ${a}`);
    } else if (cls.startsWith("h-")) {
      const k = cls.slice(2);
      const a = arb(k);
      if (a) d.push(`height: ${a}`);
      else if (FRAC[k]) d.push(`height: ${FRAC[k]}`);
      else {
        const v = sp(k);
        if (v) d.push(`height: ${v}`);
      }
    }

    // ── Max/Min Width ─────────────────────────────────────────────────────────
    else if (cls === "max-w-none") d.push("max-width: none");
    else if (cls === "max-w-full") d.push("max-width: 100%");
    else if (cls === "max-w-xs") d.push("max-width: 320px");
    else if (cls === "max-w-sm") d.push("max-width: 384px");
    else if (cls === "max-w-md") d.push("max-width: 448px");
    else if (cls === "max-w-lg") d.push("max-width: 512px");
    else if (cls === "max-w-xl") d.push("max-width: 576px");
    else if (cls === "max-w-2xl") d.push("max-width: 672px");
    else if (cls === "max-w-3xl") d.push("max-width: 768px");
    else if (cls === "max-w-4xl") d.push("max-width: 896px");
    else if (cls === "max-w-5xl") d.push("max-width: 1024px");
    else if (cls === "max-w-6xl") d.push("max-width: 1152px");
    else if (cls === "max-w-7xl") d.push("max-width: 1280px");
    else if (cls.startsWith("max-w-[")) {
      const a = arb(cls.slice(6));
      if (a) d.push(`max-width: ${a}`);
    } else if (cls.startsWith("max-w-screen-")) {
      const bpMap: Record<string, string> = {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1536px"
      };
      const v = bpMap[cls.slice(13)];
      if (v) d.push(`max-width: ${v}`);
    }

    // ── Padding ───────────────────────────────────────────────────────────────
    else if (cls.startsWith("p-")) {
      const v = sp(cls.slice(2));
      if (v) d.push(`padding: ${v}`);
    } else if (cls.startsWith("px-")) {
      const v = sp(cls.slice(3));
      if (v) d.push(`padding-left: ${v}; padding-right: ${v}`);
    } else if (cls.startsWith("py-")) {
      const v = sp(cls.slice(3));
      if (v) d.push(`padding-top: ${v}; padding-bottom: ${v}`);
    } else if (cls.startsWith("pt-")) {
      const v = sp(cls.slice(3));
      if (v) d.push(`padding-top: ${v}`);
    } else if (cls.startsWith("pr-")) {
      const v = sp(cls.slice(3));
      if (v) d.push(`padding-right: ${v}`);
    } else if (cls.startsWith("pb-")) {
      const v = sp(cls.slice(3));
      if (v) d.push(`padding-bottom: ${v}`);
    } else if (cls.startsWith("pl-")) {
      const v = sp(cls.slice(3));
      if (v) d.push(`padding-left: ${v}`);
    }

    // ── Margin ────────────────────────────────────────────────────────────────
    else if (cls === "mx-auto") d.push("margin-left: auto; margin-right: auto");
    else if (cls === "my-auto") d.push("margin-top: auto; margin-bottom: auto");
    else if (cls === "m-auto") d.push("margin: auto");
    else if (cls.startsWith("m-")) {
      const v = sp(cls.slice(2));
      if (v) d.push(`margin: ${v}`);
    } else if (cls.startsWith("mx-")) {
      const v = sp(cls.slice(3));
      if (v) d.push(`margin-left: ${v}; margin-right: ${v}`);
    } else if (cls.startsWith("my-")) {
      const v = sp(cls.slice(3));
      if (v) d.push(`margin-top: ${v}; margin-bottom: ${v}`);
    } else if (cls.startsWith("mt-")) {
      const v = sp(cls.slice(3));
      if (v) d.push(`margin-top: ${v}`);
    } else if (cls.startsWith("mr-")) {
      const v = sp(cls.slice(3));
      if (v) d.push(`margin-right: ${v}`);
    } else if (cls.startsWith("mb-")) {
      const v = sp(cls.slice(3));
      if (v) d.push(`margin-bottom: ${v}`);
    } else if (cls.startsWith("ml-")) {
      const v = sp(cls.slice(3));
      if (v) d.push(`margin-left: ${v}`);
    } else if (cls.startsWith("-mt-")) {
      const v = sp(cls.slice(4));
      if (v) d.push(`margin-top: -${v}`);
    } else if (cls.startsWith("-mb-")) {
      const v = sp(cls.slice(4));
      if (v) d.push(`margin-bottom: -${v}`);
    } else if (cls.startsWith("-ml-")) {
      const v = sp(cls.slice(4));
      if (v) d.push(`margin-left: -${v}`);
    } else if (cls.startsWith("-mr-")) {
      const v = sp(cls.slice(4));
      if (v) d.push(`margin-right: -${v}`);
    }

    // ── Background ────────────────────────────────────────────────────────────
    else if (cls === "bg-transparent") d.push("background-color: transparent");
    else if (cls === "bg-white") d.push("background-color: #ffffff");
    else if (cls === "bg-black") d.push("background-color: #000000");
    else if (cls === "bg-cover") d.push("background-size: cover");
    else if (cls === "bg-contain") d.push("background-size: contain");
    else if (cls === "bg-center") d.push("background-position: center");
    else if (cls === "bg-no-repeat") d.push("background-repeat: no-repeat");
    else if (cls === "bg-gradient-to-r")
      d.push(
        "background-image: linear-gradient(to right, var(--tw-gradient-stops))"
      );
    else if (cls === "bg-gradient-to-l")
      d.push(
        "background-image: linear-gradient(to left, var(--tw-gradient-stops))"
      );
    else if (cls === "bg-gradient-to-b")
      d.push(
        "background-image: linear-gradient(to bottom, var(--tw-gradient-stops))"
      );
    else if (cls === "bg-gradient-to-t")
      d.push(
        "background-image: linear-gradient(to top, var(--tw-gradient-stops))"
      );
    else if (cls === "bg-gradient-to-tr")
      d.push(
        "background-image: linear-gradient(to top right, var(--tw-gradient-stops))"
      );
    else if (cls === "bg-gradient-to-tl")
      d.push(
        "background-image: linear-gradient(to top left, var(--tw-gradient-stops))"
      );
    else if (cls === "bg-gradient-to-br")
      d.push(
        "background-image: linear-gradient(to bottom right, var(--tw-gradient-stops))"
      );
    else if (cls === "bg-gradient-to-bl")
      d.push(
        "background-image: linear-gradient(to bottom left, var(--tw-gradient-stops))"
      );
    else if (cls.startsWith("from-")) {
      const c = resolveColor(cls.slice(5));
      if (c) {
        let zeroAlpha = "rgba(255,255,255,0)";
        if (c.startsWith("#") && c.length >= 7) {
          const r = parseInt(c.slice(1, 3), 16);
          const g = parseInt(c.slice(3, 5), 16);
          const b = parseInt(c.slice(5, 7), 16);
          zeroAlpha = `rgba(${r}, ${g}, ${b}, 0)`;
        } else if (c.startsWith("rgba")) {
          zeroAlpha = c.replace(/[\d.]+\)$/, "0)");
        }
        d.push(`--tw-gradient-from: ${c}`);
        d.push(`--tw-gradient-to: ${zeroAlpha}`);
        d.push(
          `--tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to)`
        );
      }
    } else if (cls.startsWith("to-")) {
      const c = resolveColor(cls.slice(3));
      if (c) d.push(`--tw-gradient-to: ${c}`);
    } else if (cls.startsWith("via-")) {
      const c = resolveColor(cls.slice(4));
      if (c) {
        d.push(
          `--tw-gradient-to: ${
            c.startsWith("#") ? "rgba(255,255,255,0)" : "transparent"
          }`
        );
        d.push(
          `--tw-gradient-stops: var(--tw-gradient-from), ${c}, var(--tw-gradient-to)`
        );
      }
    } else if (cls.startsWith("bg-")) {
      const c = resolveColor(cls.slice(3));
      if (c) d.push(`background-color: ${c}`);
    }

    // ── Text color ────────────────────────────────────────────────────────────
    else if (cls === "text-white") d.push("color: #ffffff");
    else if (cls === "text-black") d.push("color: #000000");
    else if (cls === "text-transparent") d.push("color: transparent");
    else if (cls === "text-inherit") d.push("color: inherit");
    else if (cls.startsWith("text-[")) {
      const inner = cls.slice(6, -1);
      if (inner.startsWith("#") || inner.startsWith("rgb"))
        d.push(`color: ${inner}`);
      else d.push(`font-size: ${inner}`);
    } else if (cls.startsWith("text-")) {
      const tok = cls.slice(5);
      if (FS[tok])
        d.push(`font-size: ${FS[tok][0]}; line-height: ${FS[tok][1]}`);
      else {
        const c = resolveColor(tok);
        if (c) d.push(`color: ${c}`);
      }
    }

    // ── Typography ────────────────────────────────────────────────────────────
    else if (cls === "font-thin") d.push("font-weight: 100");
    else if (cls === "font-extralight") d.push("font-weight: 200");
    else if (cls === "font-light") d.push("font-weight: 300");
    else if (cls === "font-normal") d.push("font-weight: 400");
    else if (cls === "font-medium") d.push("font-weight: 500");
    else if (cls === "font-semibold") d.push("font-weight: 600");
    else if (cls === "font-bold") d.push("font-weight: 700");
    else if (cls === "font-extrabold") d.push("font-weight: 800");
    else if (cls === "font-black") d.push("font-weight: 900");
    else if (cls.startsWith("font-")) {
      const famVal = theme.fontFamily?.[cls.slice(5)];
      if (famVal) {
        const fam = famVal
          .replace(/[\[\]"']/g, "")
          .split(",")[0]
          .trim();
        d.push(`font-family: "${fam}", sans-serif`);
      }
    } else if (cls === "italic") d.push("font-style: italic");
    else if (cls === "not-italic") d.push("font-style: normal");
    else if (cls === "leading-none") d.push("line-height: 1");
    else if (cls === "leading-tight") d.push("line-height: 1.25");
    else if (cls === "leading-snug") d.push("line-height: 1.375");
    else if (cls === "leading-normal") d.push("line-height: 1.5");
    else if (cls === "leading-relaxed") d.push("line-height: 1.625");
    else if (cls === "leading-loose") d.push("line-height: 2");
    else if (cls.startsWith("leading-[")) {
      const a = arb(cls.slice(8));
      if (a) d.push(`line-height: ${a}`);
    } else if (cls === "tracking-tighter") d.push("letter-spacing: -0.05em");
    else if (cls === "tracking-tight") d.push("letter-spacing: -0.025em");
    else if (cls === "tracking-normal") d.push("letter-spacing: 0em");
    else if (cls === "tracking-wide") d.push("letter-spacing: 0.025em");
    else if (cls === "tracking-wider") d.push("letter-spacing: 0.05em");
    else if (cls === "tracking-widest") d.push("letter-spacing: 0.1em");
    else if (cls.startsWith("tracking-[")) {
      const a = arb(cls.slice(9));
      if (a) d.push(`letter-spacing: ${a}`);
    } else if (cls === "uppercase") d.push("text-transform: uppercase");
    else if (cls === "lowercase") d.push("text-transform: lowercase");
    else if (cls === "capitalize") d.push("text-transform: capitalize");
    else if (cls === "text-left") d.push("text-align: left");
    else if (cls === "text-center") d.push("text-align: center");
    else if (cls === "text-right") d.push("text-align: right");
    else if (cls === "underline") d.push("text-decoration: underline");
    else if (cls === "line-through") d.push("text-decoration: line-through");
    else if (cls === "no-underline") d.push("text-decoration: none");
    else if (cls === "whitespace-nowrap") d.push("white-space: nowrap");
    else if (cls === "whitespace-normal") d.push("white-space: normal");
    else if (cls === "whitespace-pre") d.push("white-space: pre");
    else if (cls === "truncate")
      d.push("overflow: hidden; text-overflow: ellipsis; white-space: nowrap");
    else if (cls === "break-all") d.push("word-break: break-all");
    else if (cls === "break-words") d.push("overflow-wrap: break-word");
    // ── Border ────────────────────────────────────────────────────────────────
    else if (cls === "border") d.push("border-width: 1px; border-style: solid");
    else if (cls === "border-0") d.push("border-width: 0px");
    else if (cls === "border-2")
      d.push("border-width: 2px; border-style: solid");
    else if (cls === "border-4")
      d.push("border-width: 4px; border-style: solid");
    else if (cls === "border-b")
      d.push("border-bottom-width: 1px; border-bottom-style: solid");
    else if (cls === "border-b-2")
      d.push("border-bottom-width: 2px; border-bottom-style: solid");
    else if (cls === "border-t")
      d.push("border-top-width: 1px; border-top-style: solid");
    else if (cls === "border-l")
      d.push("border-left-width: 1px; border-left-style: solid");
    else if (cls === "border-r")
      d.push("border-right-width: 1px; border-right-style: solid");
    else if (cls === "border-none") d.push("border-style: none");
    else if (cls === "border-solid") d.push("border-style: solid");
    else if (cls === "border-dashed") d.push("border-style: dashed");
    else if (cls.startsWith("border-")) {
      const c = resolveColor(cls.slice(7));
      if (c) d.push(`border-color: ${c}`);
    }

    // ── Border radius ─────────────────────────────────────────────────────────
    else if (cls === "rounded") d.push(`border-radius: ${RADII.DEFAULT}`);
    else if (cls === "rounded-none") d.push("border-radius: 0");
    else if (cls === "rounded-full") d.push("border-radius: 9999px");
    else if (cls.startsWith("rounded-")) {
      const k = cls.slice(8);
      const a = arb(k);
      d.push(`border-radius: ${a || RADII[k] || k}`);
    }

    // ── Shadows ───────────────────────────────────────────────────────────────
    else if (cls === "shadow-none") d.push("box-shadow: none");
    else if (cls === "shadow" || cls === "shadow-sm")
      d.push("box-shadow: 0 1px 3px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.08)");
    else if (cls === "shadow-md")
      d.push(
        "box-shadow: 0 4px 6px -1px rgba(0,0,0,.1),0 2px 4px -2px rgba(0,0,0,.1)"
      );
    else if (cls === "shadow-lg")
      d.push(
        "box-shadow: 0 10px 15px -3px rgba(0,0,0,.1),0 4px 6px -4px rgba(0,0,0,.1)"
      );
    else if (cls === "shadow-xl")
      d.push(
        "box-shadow: 0 20px 25px -5px rgba(0,0,0,.1),0 8px 10px -6px rgba(0,0,0,.1)"
      );
    else if (cls === "shadow-2xl")
      d.push("box-shadow: 0 25px 50px -12px rgba(0,0,0,.25)");
    else if (cls === "shadow-inner")
      d.push("box-shadow: inset 0 2px 4px rgba(0,0,0,.06)");
    // ── Overflow / Z-index ────────────────────────────────────────────────────
    else if (cls === "overflow-hidden") d.push("overflow: hidden");
    else if (cls === "overflow-auto") d.push("overflow: auto");
    else if (cls === "overflow-visible") d.push("overflow: visible");
    else if (cls === "overflow-scroll") d.push("overflow: scroll");
    else if (cls === "overflow-x-hidden") d.push("overflow-x: hidden");
    else if (cls === "overflow-y-auto") d.push("overflow-y: auto");
    else if (cls === "overflow-y-hidden") d.push("overflow-y: hidden");
    else if (cls === "z-0") d.push("z-index: 0");
    else if (cls === "z-10") d.push("z-index: 10");
    else if (cls === "z-20") d.push("z-index: 20");
    else if (cls === "z-30") d.push("z-index: 30");
    else if (cls === "z-40") d.push("z-index: 40");
    else if (cls === "z-50") d.push("z-index: 50");
    else if (cls === "z-auto") d.push("z-index: auto");
    else if (cls.startsWith("z-[")) {
      const a = arb(cls.slice(2));
      if (a) d.push(`z-index: ${a}`);
    }

    // ── Opacity ───────────────────────────────────────────────────────────────
    else if (cls.startsWith("opacity-")) {
      const k = cls.slice(8);
      const a = arb(k);
      d.push(`opacity: ${a || parseInt(k, 10) / 100}`);
    }

    // ── Filter / Blur ─────────────────────────────────────────────────────────
    else if (cls.startsWith("blur-")) {
      const k = cls.slice(5);
      const a = arb(k);
      if (a) d.push(`filter: blur(${a})`);
      else {
        const bm: Record<string, string> = {
          none: "0",
          sm: "4px",
          DEFAULT: "8px",
          md: "12px",
          lg: "16px",
          xl: "24px",
          "2xl": "40px",
          "3xl": "64px"
        };
        if (bm[k]) d.push(`filter: blur(${bm[k]})`);
      }
    } else if (cls === "blur") d.push("filter: blur(8px)");
    else if (cls === "grayscale") d.push("filter: grayscale(100%)");
    else if (cls === "grayscale-0") d.push("filter: grayscale(0)");
    else if (cls === "drop-shadow-lg")
      d.push(
        "filter: drop-shadow(0 10px 8px rgba(0,0,0,.04)) drop-shadow(0 4px 3px rgba(0,0,0,.1))"
      );
    else if (cls.startsWith("backdrop-blur-")) {
      const k = cls.slice(14);
      const a = arb(k);
      if (a) d.push(`backdrop-filter: blur(${a})`);
      else {
        const bm: Record<string, string> = {
          sm: "4px",
          DEFAULT: "8px",
          md: "12px",
          lg: "16px",
          xl: "24px",
          "2xl": "40px",
          "3xl": "64px"
        };
        if (bm[k]) d.push(`backdrop-filter: blur(${bm[k]})`);
      }
    }

    // ── Transform ─────────────────────────────────────────────────────────────
    else if (cls === "scale-95") d.push("transform: scale(0.95)");
    else if (cls === "scale-100") d.push("transform: scale(1)");
    else if (cls === "scale-105") d.push("transform: scale(1.05)");
    else if (cls === "-translate-y-1/2") d.push("transform: translateY(-50%)");
    else if (cls === "translate-y-1/2") d.push("transform: translateY(50%)");
    else if (cls === "-translate-x-1/2") d.push("transform: translateX(-50%)");
    else if (cls === "translate-x-1/2") d.push("transform: translateX(50%)");
    else if (cls === "rotate-45") d.push("transform: rotate(45deg)");
    else if (cls === "-rotate-45") d.push("transform: rotate(-45deg)");
    else if (cls === "rotate-90") d.push("transform: rotate(90deg)");
    else if (cls === "rotate-180") d.push("transform: rotate(180deg)");
    // ── Object fit ────────────────────────────────────────────────────────────
    else if (cls === "object-cover") d.push("object-fit: cover");
    else if (cls === "object-contain") d.push("object-fit: contain");
    else if (cls === "object-fill") d.push("object-fit: fill");
    // ── Misc ──────────────────────────────────────────────────────────────────
    else if (cls === "cursor-pointer") d.push("cursor: pointer");
    else if (cls === "cursor-not-allowed") d.push("cursor: not-allowed");
    else if (cls === "cursor-default") d.push("cursor: default");
    else if (cls === "pointer-events-none") d.push("pointer-events: none");
    else if (cls === "pointer-events-auto") d.push("pointer-events: auto");
    else if (cls === "select-none") d.push("user-select: none");
    else if (cls === "select-text") d.push("user-select: text");
    else if (cls === "select-all") d.push("user-select: all");
    else if (cls === "appearance-none")
      d.push("-webkit-appearance: none; appearance: none");
    else if (cls === "outline-none")
      d.push("outline: none; outline-offset: 0px");
    else if (cls === "resize-none") d.push("resize: none");
    else if (cls === "resize") d.push("resize: both");
    else if (cls === "resize-y") d.push("resize: vertical");
    else if (cls === "visible") d.push("visibility: visible");
    else if (cls === "invisible") d.push("visibility: hidden");
    else if (cls === "sr-only")
      d.push(
        "position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border-width: 0"
      );
    else if (cls === "list-none") d.push("list-style: none");
    else if (cls === "antialiased")
      d.push(
        "-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale"
      );
    // ── Transitions ───────────────────────────────────────────────────────────
    else if (cls === "transition")
      d.push(
        "transition-property: color,background-color,border-color,text-decoration-color,fill,stroke,opacity,box-shadow,transform,filter,backdrop-filter; transition-timing-function: cubic-bezier(.4,0,.2,1); transition-duration: 150ms"
      );
    else if (cls === "transition-colors")
      d.push(
        "transition-property: color,background-color,border-color; transition-timing-function: cubic-bezier(.4,0,.2,1); transition-duration: 150ms"
      );
    else if (cls === "transition-opacity")
      d.push(
        "transition-property: opacity; transition-timing-function: cubic-bezier(.4,0,.2,1); transition-duration: 150ms"
      );
    else if (cls === "transition-all")
      d.push(
        "transition-property: all; transition-timing-function: cubic-bezier(.4,0,.2,1); transition-duration: 150ms"
      );
    else if (cls === "transition-none") d.push("transition-property: none");
    else if (cls.startsWith("duration-")) {
      const v = cls.slice(9);
      d.push(`transition-duration: ${v}ms`);
    } else if (cls === "ease-in")
      d.push("transition-timing-function: cubic-bezier(.4,0,1,1)");
    else if (cls === "ease-out")
      d.push("transition-timing-function: cubic-bezier(0,0,.2,1)");
    else if (cls === "ease-in-out")
      d.push("transition-timing-function: cubic-bezier(.4,0,.2,1)");
    // ── Aspect ratio ──────────────────────────────────────────────────────────
    else if (cls === "aspect-square") d.push("aspect-ratio: 1 / 1");
    else if (cls === "aspect-video") d.push("aspect-ratio: 16 / 9");
    else if (cls.startsWith("aspect-[")) {
      const a = arb(cls.slice(7));
      if (a) d.push(`aspect-ratio: ${a.replace("/", "/ ")}`);
    }

    // ── Color fills genéricos (para iconografia, etc.) ────────────────────────
    else if (cls.startsWith("fill-")) {
      const c = resolveColor(cls.slice(5));
      if (c) d.push(`fill: ${c}`);
    } else if (cls.startsWith("stroke-")) {
      const c = resolveColor(cls.slice(7));
      if (c) d.push(`stroke: ${c}`);
    }

    return d;
  };

  // ── Processar classes em duas passagens (base → responsiva) ─────────────────
  for (const original of classes) {
    const isResp = /^(sm|md|lg|xl|2xl):/.test(original);
    if (!isResp) {
      if (original.includes(":")) continue; // skip hover:, dark:, focus:, etc.
      addRule(original, genDecls(original, original));
    }
  }
  // Passagem 2: responsivas em ordem crescente (com @media)
  const breakpoints: Record<string, string> = {
    sm: "640px",
    md: "768px",
    lg: "1024px",
    xl: "1280px",
    "2xl": "1536px"
  };

  for (const prefix of ["sm", "md", "lg", "xl", "2xl"]) {
    for (const original of classes) {
      if (original.startsWith(`${prefix}:`)) {
        const cls = original.slice(prefix.length + 1);
        addRule(original, genDecls(cls, original));
      }
    }
  }

  const respBlocks: string[] = [];
  for (const prefix of ["sm", "md", "lg", "xl", "2xl"]) {
    const minWidth = breakpoints[prefix];
    const rules = resp[prefix];
    if (rules && rules.length > 0) {
      respBlocks.push(`@media (min-width: ${minWidth}) {`);
      respBlocks.push(...rules.map(r => `  ${r}`));
      respBlocks.push(`}`);
    }
  }

  const preflight = [
    "*, *::before, *::after { box-sizing: border-box; }",
    "body { margin: 0; padding: 0; }",
    "img, video { display: block; max-width: 100%; }",
    "button, input, select, textarea { font-family: inherit; }"
  ].join("\n");

  const allRules = [preflight, ...nonResp, ...respBlocks];
  return allRules.join("\n");
}

function readTailwindThemeFromHtml(html: string) {
  const scriptMatch = html.match(
    /<script\b[^>]*id=["']tailwind-config["'][^>]*>([\s\S]*?)<\/script>/i
  );
  const text = scriptMatch?.[1] || "";
  return parseTailwindThemeText(text);
}

function isTailwindDocument(doc: Document) {
  return !!doc.querySelector(
    'script[src*="cdn.tailwindcss.com"], script[data-tailwind-cdn="true"]'
  );
}

function isTailwindReady(doc: Document, win: Window, body: HTMLElement) {
  // Verificar se o Tailwind injetou tags de estilo
  const hasTailwindStyleTag =
    doc.querySelectorAll(
      'style[id^="tailwindcss"], style[data-tailwindcss], style[id*="tw"]'
    ).length > 0;
  if (hasTailwindStyleTag) return true;

  // Heurística: body com margin 0px indica que o preflight do Tailwind rodou
  const bodyStyles = win.getComputedStyle(body);
  if (bodyStyles.margin === "0px") return true;

  // Verificar se classes flex/grid estão sendo aplicadas
  const elementsWithTailwind = doc.querySelectorAll(
    '[class*="flex"], [class*="grid"], [class*="bg-"], [class*="text-"]'
  );
  for (let i = 0; i < Math.min(5, elementsWithTailwind.length); i++) {
    const el = elementsWithTailwind[i] as HTMLElement;
    const styles = win.getComputedStyle(el);
    if (
      (el.className.includes("flex") && styles.display === "flex") ||
      (el.className.includes("grid") && styles.display === "grid") ||
      (el.className.includes("bg-") &&
        styles.backgroundColor !== "rgba(0, 0, 0, 0)")
    ) {
      return true;
    }
  }

  return false;
}

function parseTailwindThemeText(text: string) {
  const readSection = (name: string) => {
    // Suporta tanto aspas simples quanto duplas e valores multiline
    const match = text.match(
      new RegExp(`"${name}"\\s*:\\s*\\{([\\s\\S]*?)\\n\\s*\\}`, "m")
    );
    const out: Record<string, string> = {};
    if (!match) return out;
    for (const item of match[1].matchAll(/"([^"]+)"\s*:\s*"([^"]+)"/g)) {
      out[item[1]] = item[2];
    }
    return out;
  };
  return {
    colors: readSection("colors"),
    spacing: readSection("spacing"),
    radius: readSection("borderRadius"),
    fontFamily: readSection("fontFamily")
  };
}

function readTailwindTheme(doc: Document) {
  const text = doc.getElementById("tailwind-config")?.textContent || "";
  return parseTailwindThemeText(text);
}

function applyTailwindFallbackStyles(doc: Document, win: Window) {
  const theme = readTailwindTheme(doc);

  // ─── Paleta de cores base + tema customizado ───────────────────────────────
  const colors: Record<string, string> = {
    // Cores base Tailwind
    white: "#ffffff",
    black: "#000000",
    transparent: "transparent",
    current: "currentColor",
    // Slate
    "slate-50": "#f8fafc",
    "slate-100": "#f1f5f9",
    "slate-200": "#e2e8f0",
    "slate-300": "#cbd5e1",
    "slate-400": "#94a3b8",
    "slate-500": "#64748b",
    "slate-600": "#475569",
    "slate-700": "#334155",
    "slate-800": "#1e293b",
    "slate-900": "#0f172a",
    "slate-950": "#020617",
    // Gray
    "gray-50": "#f9fafb",
    "gray-100": "#f3f4f6",
    "gray-200": "#e5e7eb",
    "gray-300": "#d1d5db",
    "gray-400": "#9ca3af",
    "gray-500": "#6b7280",
    "gray-600": "#4b5563",
    "gray-700": "#374151",
    "gray-800": "#1f2937",
    "gray-900": "#111827",
    "gray-950": "#030712",
    // Blue
    "blue-50": "#eff6ff",
    "blue-100": "#dbeafe",
    "blue-200": "#bfdbfe",
    "blue-300": "#93c5fd",
    "blue-400": "#60a5fa",
    "blue-500": "#3b82f6",
    "blue-600": "#2563eb",
    "blue-700": "#1d4ed8",
    "blue-800": "#1e40af",
    "blue-900": "#1e3a8a",
    // Indigo
    "indigo-50": "#eef2ff",
    "indigo-500": "#6366f1",
    "indigo-600": "#4f46e5",
    // Red
    "red-50": "#fef2f2",
    "red-500": "#ef4444",
    "red-600": "#dc2626",
    // Green
    "green-50": "#f0fdf4",
    "green-500": "#22c55e",
    "green-600": "#16a34a",
    // Cores semânticas default (Material You)
    primary: "#004ac6",
    "on-primary": "#ffffff",
    "primary-container": "#dbe1ff",
    "on-primary-container": "#001551",
    "primary-fixed": "#dbe1ff",
    "primary-fixed-dim": "#b2c5ff",
    "on-primary-fixed": "#001551",
    "on-primary-fixed-variant": "#003398",
    "primary-dim": "#0048c1",
    secondary: "#506076",
    "on-secondary": "#ffffff",
    "secondary-container": "#d3e4fe",
    "on-secondary-container": "#0c1e2e",
    "secondary-fixed": "#d3e4fe",
    "secondary-fixed-dim": "#b7c8e0",
    "on-secondary-fixed": "#0c1e2e",
    "on-secondary-fixed-variant": "#384d62",
    "secondary-dim": "#44546a",
    tertiary: "#5b5d78",
    "on-tertiary": "#ffffff",
    "tertiary-container": "#ddddfe",
    "on-tertiary-container": "#191a31",
    "tertiary-fixed": "#ddddfe",
    "tertiary-fixed-dim": "#c0c1e8",
    "on-tertiary-fixed": "#191a31",
    "on-tertiary-fixed-variant": "#434560",
    "tertiary-dim": "#4f516c",
    error: "#9f403d",
    "on-error": "#ffffff",
    "error-container": "#ffdad6",
    "on-error-container": "#410002",
    "error-dim": "#4e0309",
    background: "#f7f9fb",
    "on-background": "#2a3439",
    surface: "#f7f9fb",
    "on-surface": "#2a3439",
    "surface-variant": "#d9e4ea",
    "on-surface-variant": "#566166",
    outline: "#717c82",
    "outline-variant": "#a9b4b9",
    "inverse-surface": "#0b0f10",
    "inverse-on-surface": "#9a9d9f",
    "inverse-primary": "#618bff",
    "surface-tint": "#0053db",
    "surface-dim": "#cfdce3",
    "surface-bright": "#f7f9fb",
    "surface-container-lowest": "#ffffff",
    "surface-container-low": "#f0f4f7",
    "surface-container": "#e8eff3",
    "surface-container-high": "#e1e9ee",
    "surface-container-highest": "#d9e4ea",
    // Sobrescreve com o tema customizado do tailwind.config
    ...theme.colors
  };

  // ─── Spacing ───────────────────────────────────────────────────────────────
  const spacing: Record<string, string> = {
    px: "1px",
    "0": "0px",
    "0.5": "2px",
    "1": "4px",
    "1.5": "6px",
    "2": "8px",
    "2.5": "10px",
    "3": "12px",
    "3.5": "14px",
    "4": "16px",
    "5": "20px",
    "6": "24px",
    "7": "28px",
    "8": "32px",
    "9": "36px",
    "10": "40px",
    "11": "44px",
    "12": "48px",
    "14": "56px",
    "16": "64px",
    "20": "80px",
    "24": "96px",
    "28": "112px",
    "32": "128px",
    "36": "144px",
    "40": "160px",
    "44": "176px",
    "48": "192px",
    "52": "208px",
    "56": "224px",
    "60": "240px",
    "64": "256px",
    "72": "288px",
    "80": "320px",
    "96": "384px",
    ...theme.spacing
  };

  // ─── Border radius ─────────────────────────────────────────────────────────
  const radii: Record<string, string> = {
    none: "0px",
    sm: "2px",
    DEFAULT: "4px",
    md: "6px",
    lg: "8px",
    xl: "12px",
    "2xl": "16px",
    "3xl": "24px",
    full: "9999px",
    ...theme.radius
  };

  // ─── Font sizes (Tailwind padrão) ──────────────────────────────────────────
  const fontSizeMap: Record<string, [string, string]> = {
    xs: ["12px", "16px"],
    sm: ["14px", "20px"],
    base: ["16px", "24px"],
    lg: ["18px", "28px"],
    xl: ["20px", "28px"],
    "2xl": ["24px", "32px"],
    "3xl": ["30px", "36px"],
    "4xl": ["36px", "40px"],
    "5xl": ["48px", "1"],
    "6xl": ["60px", "1"],
    "7xl": ["72px", "1"],
    "8xl": ["96px", "1"],
    "9xl": ["128px", "1"]
  };

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const resolveArbitrary = (val: string) =>
    val.startsWith("[") && val.endsWith("]")
      ? val.slice(1, -1).replace(/_/g, " ")
      : null;

  const getColor = (raw: string): string | null => {
    // Suporte a opacity modifier: "primary/50" → rgba
    const slashIdx = raw.lastIndexOf("/");
    if (slashIdx > 0) {
      const name = raw.slice(0, slashIdx);
      const opacityStr = raw.slice(slashIdx + 1);
      const base = colors[name];
      if (!base) return null;
      // Se opacity em colchetes: primary/[0.15]
      const opacityMatch = opacityStr.match(/^\[([0-9.]+)\]$/);
      const opacity = opacityMatch
        ? parseFloat(opacityMatch[1])
        : parseInt(opacityStr, 10) / 100;
      return hexOrNameToRgba(base, opacity);
    }
    // Valor arbitrário
    const arb = resolveArbitrary(raw);
    if (arb) return arb;
    return colors[raw] || null;
  };

  const hexOrNameToRgba = (color: string, opacity: number): string => {
    if (color.startsWith("#")) {
      const hex = color.slice(1);
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return `rgba(${r},${g},${b},${opacity})`;
    }
    return color;
  };

  const getSpace = (val: string): string | null => {
    const arb = resolveArbitrary(val);
    if (arb) return arb;
    return spacing[val] || null;
  };

  const applySpace = (s: CSSStyleDeclaration, prop: string, val: string) => {
    const v = getSpace(val);
    if (v != null) (s as any)[prop] = v;
  };

  const applyColor = (
    s: CSSStyleDeclaration,
    prop: "backgroundColor" | "color" | "borderColor" | "outlineColor",
    raw: string
  ) => {
    const c = getColor(raw);
    if (c) (s as any)[prop] = c;
  };

  // ─── Grid template columns (Tailwind padrão 1-12) ─────────────────────────
  const gridColsMap: Record<string, string> = {
    "1": "repeat(1,minmax(0,1fr))",
    "2": "repeat(2,minmax(0,1fr))",
    "3": "repeat(3,minmax(0,1fr))",
    "4": "repeat(4,minmax(0,1fr))",
    "5": "repeat(5,minmax(0,1fr))",
    "6": "repeat(6,minmax(0,1fr))",
    "7": "repeat(7,minmax(0,1fr))",
    "8": "repeat(8,minmax(0,1fr))",
    "9": "repeat(9,minmax(0,1fr))",
    "10": "repeat(10,minmax(0,1fr))",
    "11": "repeat(11,minmax(0,1fr))",
    "12": "repeat(12,minmax(0,1fr))",
    none: "none"
  };

  // ─── Aplicar estilos em cada elemento com classes Tailwind ─────────────────
  doc.querySelectorAll<HTMLElement>("[class]").forEach(el => {
    const classes = Array.from(el.classList);
    el.style.boxSizing = "border-box";

    for (const original of classes) {
      // Processar variantes responsivas: md:flex, lg:grid-cols-12, etc.
      const isResponsive = /^(sm|md|lg|xl|2xl):/.test(original);
      const cls = isResponsive ? original.replace(/^[a-z0-9]+:/, "") : original;

      // Ignorar pseudo-classes complexas (hover:, focus:, dark:, etc.) — exceto responsivos
      if (original.includes(":") && !isResponsive) continue;

      const s = el.style;

      // ── Display ────────────────────────────────────────────────────────────
      if (cls === "flex") s.display = "flex";
      else if (cls === "inline-flex") s.display = "inline-flex";
      else if (cls === "grid") s.display = "grid";
      else if (cls === "inline-grid") s.display = "inline-grid";
      else if (cls === "block") s.display = "block";
      else if (cls === "inline-block") s.display = "inline-block";
      else if (cls === "inline") s.display = "inline";
      else if (cls === "hidden") s.display = "none";
      else if (cls === "contents") s.display = "contents";
      // ── Flex ───────────────────────────────────────────────────────────────
      else if (cls === "flex-col") s.flexDirection = "column";
      else if (cls === "flex-col-reverse") s.flexDirection = "column-reverse";
      else if (cls === "flex-row") s.flexDirection = "row";
      else if (cls === "flex-row-reverse") s.flexDirection = "row-reverse";
      else if (cls === "flex-wrap") s.flexWrap = "wrap";
      else if (cls === "flex-nowrap") s.flexWrap = "nowrap";
      else if (cls === "flex-1") s.flex = "1 1 0%";
      else if (cls === "flex-auto") s.flex = "1 1 auto";
      else if (cls === "flex-none") s.flex = "none";
      else if (cls === "flex-grow" || cls === "grow") s.flexGrow = "1";
      else if (cls === "flex-shrink" || cls === "shrink") s.flexShrink = "1";
      else if (cls === "flex-shrink-0" || cls === "shrink-0")
        s.flexShrink = "0";
      // ── Align & Justify ────────────────────────────────────────────────────
      else if (cls === "items-start") s.alignItems = "flex-start";
      else if (cls === "items-center") s.alignItems = "center";
      else if (cls === "items-end") s.alignItems = "flex-end";
      else if (cls === "items-baseline") s.alignItems = "baseline";
      else if (cls === "items-stretch") s.alignItems = "stretch";
      else if (cls === "justify-start") s.justifyContent = "flex-start";
      else if (cls === "justify-center") s.justifyContent = "center";
      else if (cls === "justify-end") s.justifyContent = "flex-end";
      else if (cls === "justify-between") s.justifyContent = "space-between";
      else if (cls === "justify-around") s.justifyContent = "space-around";
      else if (cls === "justify-evenly") s.justifyContent = "space-evenly";
      else if (cls === "self-auto") s.alignSelf = "auto";
      else if (cls === "self-start") s.alignSelf = "flex-start";
      else if (cls === "self-center") s.alignSelf = "center";
      else if (cls === "self-end") s.alignSelf = "flex-end";
      else if (cls === "self-stretch") s.alignSelf = "stretch";
      // ── Grid ───────────────────────────────────────────────────────────────
      else if (cls.startsWith("grid-cols-")) {
        const key = cls.slice(10);
        const arb = resolveArbitrary(key);
        s.gridTemplateColumns =
          arb || gridColsMap[key] || `repeat(${key},minmax(0,1fr))`;
      } else if (cls.startsWith("grid-rows-")) {
        const key = cls.slice(10);
        const arb = resolveArbitrary(key);
        s.gridTemplateRows = arb || `repeat(${key},minmax(0,1fr))`;
      } else if (cls.startsWith("col-span-")) {
        const n = cls.slice(9);
        s.gridColumn = n === "full" ? "1 / -1" : `span ${n} / span ${n}`;
      } else if (cls.startsWith("col-start-")) {
        s.gridColumnStart = cls.slice(10);
      } else if (cls.startsWith("col-end-")) {
        s.gridColumnEnd = cls.slice(8);
      } else if (cls.startsWith("row-span-")) {
        const n = cls.slice(9);
        s.gridRow = `span ${n} / span ${n}`;
      } else if (cls.startsWith("row-start-")) {
        s.gridRowStart = cls.slice(10);
      } else if (cls === "col-auto") s.gridColumn = "auto";
      else if (cls === "row-auto") s.gridRow = "auto";
      // ── Gap ───────────────────────────────────────────────────────────────
      else if (cls.startsWith("gap-x-"))
        applySpace(s, "columnGap", cls.slice(6));
      else if (cls.startsWith("gap-y-")) applySpace(s, "rowGap", cls.slice(6));
      else if (cls.startsWith("gap-")) applySpace(s, "gap", cls.slice(4));
      // ── Space between (adiciona margin nos filhos diretos) ─────────────────
      // Implementado como gap para simplificação no contexto do Figma
      else if (cls.startsWith("space-x-")) {
        const val = cls.slice(8);
        const v = getSpace(val);
        if (v) {
          s.display = s.display || "flex";
          s.gap = v;
        }
      } else if (cls.startsWith("-space-x-")) {
        // Negative space — usar margin negativa em filhos
        const val = cls.slice(9);
        const v = getSpace(val);
        if (v && el.children.length > 0) {
          Array.from(el.children).forEach((child, idx) => {
            if (idx > 0) (child as HTMLElement).style.marginLeft = `-${v}`;
          });
        }
      } else if (cls.startsWith("space-y-")) {
        const val = cls.slice(8);
        const v = getSpace(val);
        if (v) {
          s.display = s.display || "flex";
          s.flexDirection = "column";
          s.gap = v;
        }
      }

      // ── Posição ────────────────────────────────────────────────────────────
      else if (cls === "static") s.position = "static";
      else if (cls === "relative") s.position = "relative";
      else if (cls === "absolute") s.position = "absolute";
      else if (cls === "fixed") s.position = "fixed";
      else if (cls === "sticky") s.position = "sticky";
      else if (cls === "inset-0") {
        s.top = s.right = s.bottom = s.left = "0px";
      } else if (cls === "inset-x-0") {
        s.left = s.right = "0px";
      } else if (cls === "inset-y-0") {
        s.top = s.bottom = "0px";
      } else if (cls === "top-0") s.top = "0px";
      else if (cls === "bottom-0") s.bottom = "0px";
      else if (cls === "left-0") s.left = "0px";
      else if (cls === "right-0") s.right = "0px";
      else if (cls.startsWith("top-")) {
        const v = getSpace(cls.slice(4));
        if (v) s.top = v;
      } else if (cls.startsWith("bottom-")) {
        const v = getSpace(cls.slice(7));
        if (v) s.bottom = v;
      } else if (cls.startsWith("left-")) {
        const v = getSpace(cls.slice(5));
        if (v) s.left = v;
      } else if (cls.startsWith("right-")) {
        const v = getSpace(cls.slice(6));
        if (v) s.right = v;
      }

      // ── Translate (transform) ──────────────────────────────────────────────
      else if (cls === "-translate-y-1/2") s.transform = "translateY(-50%)";
      else if (cls === "translate-y-1/2") s.transform = "translateY(50%)";
      else if (cls === "-translate-x-1/2") s.transform = "translateX(-50%)";
      else if (cls === "translate-x-1/2") s.transform = "translateX(50%)";
      // ── Largura e Altura ───────────────────────────────────────────────────
      else if (cls === "w-full") s.width = "100%";
      else if (cls === "w-screen") s.width = `${win.innerWidth}px`;
      else if (cls === "w-auto") s.width = "auto";
      else if (cls === "w-fit") s.width = "fit-content";
      else if (cls === "w-max") s.width = "max-content";
      else if (cls === "w-min") s.width = "min-content";
      else if (cls === "w-1/2") s.width = "50%";
      else if (cls === "w-1/3") s.width = "33.3333%";
      else if (cls === "w-2/3") s.width = "66.6667%";
      else if (cls === "w-1/4") s.width = "25%";
      else if (cls === "w-3/4") s.width = "75%";
      else if (cls.startsWith("w-")) {
        const arb = resolveArbitrary(cls.slice(2));
        if (arb) s.width = arb;
        else {
          const v = getSpace(cls.slice(2));
          if (v) s.width = v;
        }
      } else if (cls === "h-full") s.height = "100%";
      else if (cls === "h-screen") s.height = `${win.innerHeight}px`;
      else if (cls === "h-auto") s.height = "auto";
      else if (cls === "h-fit") s.height = "fit-content";
      else if (cls === "h-1/2") s.height = "50%";
      else if (cls.startsWith("h-")) {
        const arb = resolveArbitrary(cls.slice(2));
        if (arb) s.height = arb;
        else {
          const v = getSpace(cls.slice(2));
          if (v) s.height = v;
        }
      } else if (cls === "min-h-screen") s.minHeight = `${win.innerHeight}px`;
      else if (cls === "min-h-full") s.minHeight = "100%";
      else if (cls.startsWith("min-h-")) {
        const v = getSpace(cls.slice(6));
        if (v) s.minHeight = v;
      } else if (cls === "max-w-none") s.maxWidth = "none";
      else if (cls === "max-w-full") s.maxWidth = "100%";
      else if (cls === "max-w-screen-sm") s.maxWidth = "640px";
      else if (cls === "max-w-screen-md") s.maxWidth = "768px";
      else if (cls === "max-w-screen-lg") s.maxWidth = "1024px";
      else if (cls === "max-w-screen-xl") s.maxWidth = "1280px";
      else if (cls === "max-w-screen-2xl") s.maxWidth = "1536px";
      else if (cls === "max-w-xs") s.maxWidth = "320px";
      else if (cls === "max-w-sm") s.maxWidth = "384px";
      else if (cls === "max-w-md") s.maxWidth = "448px";
      else if (cls === "max-w-lg") s.maxWidth = "512px";
      else if (cls === "max-w-xl") s.maxWidth = "576px";
      else if (cls === "max-w-2xl") s.maxWidth = "672px";
      else if (cls === "max-w-3xl") s.maxWidth = "768px";
      else if (cls === "max-w-4xl") s.maxWidth = "896px";
      else if (cls === "max-w-5xl") s.maxWidth = "1024px";
      else if (cls === "max-w-6xl") s.maxWidth = "1152px";
      else if (cls === "max-w-7xl") s.maxWidth = "1280px";
      else if (cls.startsWith("max-w-[")) {
        const arb = resolveArbitrary(cls.slice(6));
        if (arb) s.maxWidth = arb;
      }

      // ── Padding ────────────────────────────────────────────────────────────
      else if (cls.startsWith("p-")) applySpace(s, "padding", cls.slice(2));
      else if (cls.startsWith("px-")) {
        applySpace(s, "paddingLeft", cls.slice(3));
        applySpace(s, "paddingRight", cls.slice(3));
      } else if (cls.startsWith("py-")) {
        applySpace(s, "paddingTop", cls.slice(3));
        applySpace(s, "paddingBottom", cls.slice(3));
      } else if (cls.startsWith("pt-"))
        applySpace(s, "paddingTop", cls.slice(3));
      else if (cls.startsWith("pr-"))
        applySpace(s, "paddingRight", cls.slice(3));
      else if (cls.startsWith("pb-"))
        applySpace(s, "paddingBottom", cls.slice(3));
      else if (cls.startsWith("pl-"))
        applySpace(s, "paddingLeft", cls.slice(3));
      // ── Margin ─────────────────────────────────────────────────────────────
      else if (cls === "mx-auto") {
        s.marginLeft = "auto";
        s.marginRight = "auto";
      } else if (cls === "my-auto") {
        s.marginTop = "auto";
        s.marginBottom = "auto";
      } else if (cls === "m-auto") s.margin = "auto";
      else if (cls.startsWith("m-")) applySpace(s, "margin", cls.slice(2));
      else if (cls.startsWith("mx-")) {
        applySpace(s, "marginLeft", cls.slice(3));
        applySpace(s, "marginRight", cls.slice(3));
      } else if (cls.startsWith("my-")) {
        applySpace(s, "marginTop", cls.slice(3));
        applySpace(s, "marginBottom", cls.slice(3));
      } else if (cls.startsWith("mt-"))
        applySpace(s, "marginTop", cls.slice(3));
      else if (cls.startsWith("mr-"))
        applySpace(s, "marginRight", cls.slice(3));
      else if (cls.startsWith("mb-"))
        applySpace(s, "marginBottom", cls.slice(3));
      else if (cls.startsWith("ml-")) applySpace(s, "marginLeft", cls.slice(3));
      // Negative margins
      else if (cls.startsWith("-mt-")) {
        const v = getSpace(cls.slice(4));
        if (v) s.marginTop = `-${v}`;
      } else if (cls.startsWith("-mb-")) {
        const v = getSpace(cls.slice(4));
        if (v) s.marginBottom = `-${v}`;
      } else if (cls.startsWith("-ml-")) {
        const v = getSpace(cls.slice(4));
        if (v) s.marginLeft = `-${v}`;
      } else if (cls.startsWith("-mr-")) {
        const v = getSpace(cls.slice(4));
        if (v) s.marginRight = `-${v}`;
      }

      // ── Background ─────────────────────────────────────────────────────────
      else if (cls === "bg-transparent") s.backgroundColor = "transparent";
      else if (cls === "bg-white") s.backgroundColor = "#ffffff";
      else if (cls === "bg-black") s.backgroundColor = "#000000";
      else if (cls === "bg-gradient-to-r")
        s.backgroundImage =
          "linear-gradient(to right, var(--tw-gradient-from,transparent), var(--tw-gradient-to,transparent))";
      else if (cls === "bg-gradient-to-br")
        s.backgroundImage =
          "linear-gradient(to bottom right, var(--tw-gradient-from,transparent), var(--tw-gradient-to,transparent))";
      else if (cls === "bg-gradient-to-b")
        s.backgroundImage =
          "linear-gradient(to bottom, var(--tw-gradient-from,transparent), var(--tw-gradient-to,transparent))";
      else if (cls.startsWith("from-")) {
        const c = getColor(cls.slice(5));
        if (c) s.setProperty("--tw-gradient-from", c);
      } else if (cls.startsWith("to-")) {
        const c = getColor(cls.slice(3));
        if (c) s.setProperty("--tw-gradient-to", c);
      } else if (cls === "bg-cover") s.backgroundSize = "cover";
      else if (cls === "bg-contain") s.backgroundSize = "contain";
      else if (cls === "bg-center") s.backgroundPosition = "center";
      else if (cls.startsWith("bg-"))
        applyColor(s, "backgroundColor", cls.slice(3));
      // ── Cores de texto ─────────────────────────────────────────────────────
      else if (cls === "text-white") s.color = "#ffffff";
      else if (cls === "text-black") s.color = "#000000";
      else if (cls === "text-transparent") s.color = "transparent";
      else if (cls === "text-inherit") s.color = "inherit";
      else if (cls === "text-current") s.color = "currentColor";
      else if (cls.startsWith("text-[") && cls.endsWith("]")) {
        const inner = cls.slice(6, -1);
        // Pode ser cor ou tamanho
        if (inner.startsWith("#") || inner.startsWith("rgb")) {
          s.color = inner;
        } else {
          s.fontSize = inner;
        }
      } else if (cls.startsWith("text-")) {
        const token = cls.slice(5);
        if (fontSizeMap[token]) {
          const [size, lineHeight] = fontSizeMap[token];
          s.fontSize = size;
          s.lineHeight = lineHeight;
        } else {
          applyColor(s, "color", token);
        }
      }

      // ── Tipografia ─────────────────────────────────────────────────────────
      else if (cls === "font-thin") s.fontWeight = "100";
      else if (cls === "font-extralight") s.fontWeight = "200";
      else if (cls === "font-light") s.fontWeight = "300";
      else if (cls === "font-normal") s.fontWeight = "400";
      else if (cls === "font-medium") s.fontWeight = "500";
      else if (cls === "font-semibold") s.fontWeight = "600";
      else if (cls === "font-bold") s.fontWeight = "700";
      else if (cls === "font-extrabold") s.fontWeight = "800";
      else if (cls === "font-black") s.fontWeight = "900";
      else if (cls.startsWith("font-")) {
        // font-headline, font-body, font-label etc. (tema customizado)
        const famVal = theme.fontFamily?.[cls.slice(5)];
        s.fontFamily = famVal
          ? `${famVal
              .split(",")[0]
              .replace(/["']/g, "")
              .trim()}, sans-serif`
          : "Inter, sans-serif";
      } else if (cls === "italic") s.fontStyle = "italic";
      else if (cls === "not-italic") s.fontStyle = "normal";
      else if (cls === "leading-none") s.lineHeight = "1";
      else if (cls === "leading-tight") s.lineHeight = "1.25";
      else if (cls === "leading-snug") s.lineHeight = "1.375";
      else if (cls === "leading-normal") s.lineHeight = "1.5";
      else if (cls === "leading-relaxed") s.lineHeight = "1.625";
      else if (cls === "leading-loose") s.lineHeight = "2";
      else if (cls.startsWith("leading-[")) {
        const arb = resolveArbitrary(cls.slice(8));
        if (arb) s.lineHeight = arb;
      } else if (cls === "tracking-tighter") s.letterSpacing = "-0.05em";
      else if (cls === "tracking-tight") s.letterSpacing = "-0.025em";
      else if (cls === "tracking-normal") s.letterSpacing = "0em";
      else if (cls === "tracking-wide") s.letterSpacing = "0.025em";
      else if (cls === "tracking-wider") s.letterSpacing = "0.05em";
      else if (cls === "tracking-widest") s.letterSpacing = "0.1em";
      else if (cls === "uppercase") s.textTransform = "uppercase";
      else if (cls === "lowercase") s.textTransform = "lowercase";
      else if (cls === "capitalize") s.textTransform = "capitalize";
      else if (cls === "normal-case") s.textTransform = "none";
      else if (cls === "text-left") s.textAlign = "left";
      else if (cls === "text-center") s.textAlign = "center";
      else if (cls === "text-right") s.textAlign = "right";
      else if (cls === "text-justify") s.textAlign = "justify";
      else if (cls === "underline") s.textDecoration = "underline";
      else if (cls === "line-through") s.textDecoration = "line-through";
      else if (cls === "no-underline") s.textDecoration = "none";
      else if (cls === "whitespace-nowrap") s.whiteSpace = "nowrap";
      else if (cls === "whitespace-normal") s.whiteSpace = "normal";
      else if (cls === "whitespace-pre") s.whiteSpace = "pre";
      else if (cls === "truncate") {
        s.overflow = "hidden";
        s.textOverflow = "ellipsis";
        s.whiteSpace = "nowrap";
      }

      // ── Border ─────────────────────────────────────────────────────────────
      else if (cls === "border") {
        s.borderWidth = "1px";
        s.borderStyle = "solid";
      } else if (cls === "border-0") s.borderWidth = "0px";
      else if (cls === "border-2") {
        s.borderWidth = "2px";
        s.borderStyle = "solid";
      } else if (cls === "border-4") {
        s.borderWidth = "4px";
        s.borderStyle = "solid";
      } else if (cls === "border-t") {
        s.borderTopWidth = "1px";
        s.borderTopStyle = "solid";
      } else if (cls === "border-b") {
        s.borderBottomWidth = "1px";
        s.borderBottomStyle = "solid";
      } else if (cls === "border-l") {
        s.borderLeftWidth = "1px";
        s.borderLeftStyle = "solid";
      } else if (cls === "border-r") {
        s.borderRightWidth = "1px";
        s.borderRightStyle = "solid";
      } else if (cls === "border-none") s.borderStyle = "none";
      else if (cls === "border-solid") s.borderStyle = "solid";
      else if (cls === "border-dashed") s.borderStyle = "dashed";
      else if (cls.startsWith("border-"))
        applyColor(s, "borderColor", cls.slice(7));
      // ── Border radius ──────────────────────────────────────────────────────
      else if (cls === "rounded") s.borderRadius = radii.DEFAULT;
      else if (cls === "rounded-none") s.borderRadius = "0";
      else if (cls.startsWith("rounded-")) {
        const key = cls.slice(8);
        const arb = resolveArbitrary(key);
        s.borderRadius = arb || radii[key] || key;
      }

      // ── Sombras ────────────────────────────────────────────────────────────
      else if (cls === "shadow-none") s.boxShadow = "none";
      else if (cls === "shadow-sm" || cls === "shadow")
        s.boxShadow = "0 1px 3px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.08)";
      else if (cls === "shadow-md")
        s.boxShadow =
          "0 4px 6px -1px rgba(0,0,0,.1),0 2px 4px -2px rgba(0,0,0,.1)";
      else if (cls === "shadow-lg")
        s.boxShadow =
          "0 10px 15px -3px rgba(0,0,0,.1),0 4px 6px -4px rgba(0,0,0,.1)";
      else if (cls === "shadow-xl")
        s.boxShadow =
          "0 20px 25px -5px rgba(0,0,0,.1),0 8px 10px -6px rgba(0,0,0,.1)";
      else if (cls === "shadow-2xl")
        s.boxShadow = "0 25px 50px -12px rgba(0,0,0,.25)";
      else if (cls === "shadow-inner")
        s.boxShadow = "inset 0 2px 4px rgba(0,0,0,.06)";
      else if (cls.startsWith("shadow-")) {
        // shadow-primary/[0.15] etc. — tenta aplicar como cor de sombra
        // Para simplicidade, usa shadow padrão
        if (!s.boxShadow) s.boxShadow = "0 4px 6px rgba(0,0,0,.12)";
      }

      // ── Overflow ───────────────────────────────────────────────────────────
      else if (cls === "overflow-hidden") s.overflow = "hidden";
      else if (cls === "overflow-auto") s.overflow = "auto";
      else if (cls === "overflow-scroll") s.overflow = "scroll";
      else if (cls === "overflow-visible") s.overflow = "visible";
      else if (cls === "overflow-x-hidden") s.overflowX = "hidden";
      else if (cls === "overflow-y-auto") s.overflowY = "auto";
      else if (cls === "overflow-y-hidden") s.overflowY = "hidden";
      // ── Opacity & Cursor ───────────────────────────────────────────────────
      else if (cls.startsWith("opacity-")) {
        const arb = resolveArbitrary(cls.slice(8));
        s.opacity = arb || String(parseInt(cls.slice(8), 10) / 100);
      } else if (cls === "cursor-pointer") s.cursor = "pointer";
      else if (cls === "cursor-not-allowed") s.cursor = "not-allowed";
      else if (cls === "cursor-default") s.cursor = "default";
      // ── Object fit ─────────────────────────────────────────────────────────
      else if (cls === "object-cover") s.objectFit = "cover";
      else if (cls === "object-contain") s.objectFit = "contain";
      else if (cls === "object-fill") s.objectFit = "fill";
      // ── Z-index ────────────────────────────────────────────────────────────
      else if (cls === "z-0") s.zIndex = "0";
      else if (cls === "z-10") s.zIndex = "10";
      else if (cls === "z-20") s.zIndex = "20";
      else if (cls === "z-30") s.zIndex = "30";
      else if (cls === "z-40") s.zIndex = "40";
      else if (cls === "z-50") s.zIndex = "50";
      else if (cls === "z-auto") s.zIndex = "auto";
      else if (cls.startsWith("z-[")) {
        const arb = resolveArbitrary(cls.slice(2));
        if (arb) s.zIndex = arb;
      }

      // ── Misc ───────────────────────────────────────────────────────────────
      else if (cls === "pointer-events-none") s.pointerEvents = "none";
      else if (cls === "pointer-events-auto") s.pointerEvents = "auto";
      else if (cls === "select-none") s.userSelect = "none";
      else if (cls === "rounded-full") s.borderRadius = "9999px";
    }
  });
}

async function waitForRenderedStylesAndAssets(
  doc: Document,
  win: Window,
  body: HTMLElement
) {
  const hasTailwind = !!doc.querySelector(
    'script[src*="cdn.tailwindcss.com"], script[data-tailwind-cdn="true"]'
  );
  const hasInlineStyles = !!doc.querySelector("style");

  if (hasTailwind) {
    const startedAt = Date.now();
    let checksPerformed = 0;
    // Aumentado para 12 segundos — CDN Tailwind pode demorar para processar
    const maxWaitMs = 12000;
    const intervalMs = 150;
    const maxChecks = Math.ceil(maxWaitMs / intervalMs);

    while (Date.now() - startedAt < maxWaitMs && checksPerformed < maxChecks) {
      checksPerformed++;

      const tailwindStyleTags = doc.querySelectorAll(
        'style[id^="tailwindcss"], style[data-tailwindcss], style[id*="tw"]'
      );
      const bodyStyles = win.getComputedStyle(body);

      // O preflight do Tailwind zera a margem do body e injeta tags de estilo
      if (tailwindStyleTags.length > 0 || bodyStyles.margin === "0px") {
        console.log(
          `[ImportDesignTab] ✅ Tailwind pronto após ${Date.now() -
            startedAt}ms (${checksPerformed} checks)`
        );
        break;
      }

      await new Promise(r => setTimeout(r, intervalMs));
    }

    if (Date.now() - startedAt >= maxWaitMs) {
      console.warn(
        `[ImportDesignTab] ⚠️ Timeout aguardando Tailwind (${maxWaitMs}ms). Usando fallback.`
      );
    }

    // Aguardar mais um frame para garantir que re-layouts foram feitos
    await new Promise(r => setTimeout(r, 300));
  } else if (hasInlineStyles) {
    // HTML com <style> inline — já está renderizado, aguardar um pouco
    await new Promise(r => setTimeout(r, 400));
  } else {
    // Sem Tailwind nem estilos — aguardar render padrão
    await new Promise(r => setTimeout(r, 800));
  }

  // Aguardar fontes carregarem (best-effort)
  try {
    await Promise.race([
      (doc as any).fonts?.ready,
      new Promise(r => setTimeout(r, 3000)) // máx 3s para fontes
    ]);
  } catch {
    // Font loading é best-effort dentro do iframe do Figma
  }

  // Aguardar imagens carregarem
  const images = Array.from(doc.images);
  await Promise.all(
    images.map(
      img =>
        new Promise<void>(resolve => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }
          const done = () => resolve();
          const timeout = window.setTimeout(done, 3000);
          img.onload = () => {
            window.clearTimeout(timeout);
            done();
          };
          img.onerror = () => {
            window.clearTimeout(timeout);
            done();
          };
        })
    )
  );

  // Múltiplos frames de animação para garantir que tudo foi renderizado
  await new Promise(r =>
    requestAnimationFrame(() =>
      requestAnimationFrame(() => requestAnimationFrame(r))
    )
  );
}

const ImportDesignTab = forwardRef<ImportDesignTabRef, ImportDesignTabProps>(
  ({ hideButton = false, onStateChange }, ref) => {
    const [url, setUrl] = useState("");
    const [html, setHtml] = useState("");
    const [css, setCss] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingUrl, setIsLoadingUrl] = useState(false);
    const [viewportWidth, setViewportWidth] = useState(1440);
    const [viewportHeight, setViewportHeight] = useState(900);
    const [useAutoLayout, setUseAutoLayout] = useState(true);
    const lastImportErrorRef = useRef<string | null>(null);

    const hasTailwindCdn = useMemo(() => /cdn\.tailwindcss\.com/i.test(html), [
      html
    ]);

    // Notificar quando o estado muda
    useEffect(() => {
      onStateChange?.(
        html.trim().length > 0 || css.trim().length > 0,
        isLoading
      );
    }, [html, css, isLoading, onStateChange]);

    const handleLoadFromUrl = async () => {
      if (!url.trim()) {
        parent.postMessage(
          {
            pluginMessage: {
              type: "notify",
              message: "Por favor, insira uma URL válida"
            }
          },
          "*"
        );
        return;
      }

      setIsLoadingUrl(true);
      console.log("[ImportDesignTab] Carregando URL:", url);

      try {
        // Usar CORS proxy para sites que bloqueiam CORS
        let fetchUrl = url;

        // Se a URL não começar com http, adicionar https://
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
          fetchUrl = "https://" + url;
        }

        console.log("[ImportDesignTab] Fazendo fetch de:", fetchUrl);

        const response = await fetch(fetchUrl, {
          method: "GET",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)"
          }
        });

        console.log("[ImportDesignTab] Response status:", response.status);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const htmlContent = await response.text();
        console.log(
          "[ImportDesignTab] HTML carregado, tamanho:",
          htmlContent.length
        );

        setHtml(htmlContent);

        // Focar no textarea do HTML após carregar
        setTimeout(() => {
          const htmlTextarea = document.querySelector("textarea");
          if (htmlTextarea) htmlTextarea.scrollIntoView({ behavior: "smooth" });
        }, 100);

        parent.postMessage(
          {
            pluginMessage: {
              type: "notify",
              message: `✅ HTML carregado com sucesso de: ${
                new URL(fetchUrl).hostname
              }`
            }
          },
          "*"
        );
      } catch (error) {
        console.error("[ImportDesignTab] Erro ao carregar URL:", error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        parent.postMessage(
          {
            pluginMessage: {
              type: "notify",
              message: `❌ Erro ao carregar: ${errorMsg}. Tente colar o HTML diretamente.`
            }
          },
          "*"
        );
      } finally {
        setIsLoadingUrl(false);
      }
    };

    const handleImport = () => {
      if (!html.trim() && !css.trim()) {
        parent.postMessage(
          {
            pluginMessage: {
              type: "notify",
              message: "Por favor, insira HTML ou CSS"
            }
          },
          "*"
        );
        return;
      }

      console.log(
        "[ImportDesignTab] ✓ Iniciando import com HTML:",
        html.length,
        "chars, CSS:",
        css.length,
        "chars"
      );
      setIsLoading(true);
      lastImportErrorRef.current = null;

      (async () => {
        try {
          // Rendered import preserves computed gradients, shadows, blur and images
          // better than the legacy HTML/CSS parser. Legacy remains as fallback.
          const shouldRender = true;
          console.log(
            "[ImportDesignTab] shouldRender:",
            shouldRender,
            "hasTailwindCdn:",
            hasTailwindCdn
          );

          if (shouldRender) {
            try {
              console.log("[ImportDesignTab] ✓ Usando rendering (Tailwind)");
              const tree = await renderHtmlInIframeAndSerialize(html, css, {
                width: viewportWidth,
                height: viewportHeight
              });
              console.log("[ImportDesignTab] ✓ Tree criada:", {
                nodeType: tree.nodeType,
                tagName: tree.nodeType === "element" ? tree.tagName : undefined,
                childrenCount:
                  tree.nodeType === "element" ? tree.children?.length || 0 : 0,
                hasRect: !!tree.rect,
                rectSize: `${tree.rect.width}x${tree.rect.height}`
              });

              if (!tree || tree.nodeType !== "element") {
                throw new Error(
                  "Árvore de DOM inválida - elementos não foram encontrados"
                );
              }

              console.log(
                "[ImportDesignTab] ✓ Enviando postMessage type=import-rendered-dom"
              );
              parent.postMessage(
                {
                  pluginMessage: {
                    type: "import-rendered-dom",
                    tree,
                    viewport: { width: viewportWidth, height: viewportHeight },
                    useAutoLayout
                  }
                },
                "*"
              );
              console.log(
                "[ImportDesignTab] ✓ Mensagem postMessage enviada com sucesso"
              );
            } catch (renderError) {
              console.warn(
                "[ImportDesignTab] Rendered import falhou, usando legacy:",
                renderError
              );
              parent.postMessage(
                {
                  pluginMessage: {
                    type: "import-html-css",
                    html,
                    css,
                    useAutoLayout
                  }
                },
                "*"
              );
            }
          } else {
            // Fallback to legacy importer for raw HTML+CSS
            console.log("[ImportDesignTab] ✓ Usando HTML+CSS legacy");
            parent.postMessage(
              {
                pluginMessage: {
                  type: "import-html-css",
                  html,
                  css
                }
              },
              "*"
            );
            console.log(
              "[ImportDesignTab] ✓ Mensagem postMessage enviada (legacy)"
            );
          }
        } catch (e) {
          console.error("[ImportDesignTab] ❌ Erro ao importar:", e);
          lastImportErrorRef.current = e?.message || String(e);
          parent.postMessage(
            {
              pluginMessage: {
                type: "notify",
                message: `❌ Falha ao processar: ${lastImportErrorRef.current}`
              }
            },
            "*"
          );
        } finally {
          // Reset after import attempt
          setTimeout(() => {
            setIsLoading(false);
          }, 200);
        }
      })();
    };

    // Expor a ref com a função e estado
    useImperativeHandle(
      ref,
      () => ({
        handleImport,
        canImport: html.trim().length > 0 || css.trim().length > 0,
        isLoading
      }),
      [html, css, isLoading, useAutoLayout, viewportWidth, viewportHeight]
    );

    return (
      <ImportContainer>
        {/* URL loader disabled due to Figma's Content Security Policy restrictions */}
        {/* 
      <CodeInputContainer>
        <CodeLabel color="#2196F3">Link do Site</CodeLabel>
        <div style={{ display: 'flex', gap: 8 }}>
          <UrlInput
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://exemplo.com"
            disabled={isLoadingUrl}
            onKeyPress={(e) => {
              if (e.key === 'Enter') handleLoadFromUrl();
            }}
          />
          <CreateButton
            onClick={handleLoadFromUrl}
            disabled={isLoadingUrl || !url.trim()}
            style={{ width: '95px', minWidth: '95px', marginTop: 0, padding: '10px' }}
          >
            {isLoadingUrl ? '...' : 'Carregar'}
          </CreateButton>
        </div>
      </CodeInputContainer>
      */}

        <CodeInputContainer>
          <CodeLabel color="#FF7043">HTML</CodeLabel>
          <CodeTextArea
            value={html}
            onChange={e => setHtml(e.target.value)}
            placeholder="Paste your HTML code here..."
            spellCheck="false"
          />
        </CodeInputContainer>

        <CodeInputContainer>
          <CodeLabel color="#9C27B0">CSS</CodeLabel>
          <CodeTextArea
            value={css}
            onChange={e => setCss(e.target.value)}
            placeholder="Paste your CSS code here..."
            spellCheck="false"
          />
        </CodeInputContainer>

        <SettingsBox>
          <SettingItem>
            <span>Viewport (W × H)</span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <SettingInput
                type="number"
                min={320}
                max={3840}
                value={viewportWidth}
                onChange={e =>
                  setViewportWidth(parseInt(e.target.value || "0", 10) || 1440)
                }
              />
              <span style={{ color: "rgba(255,255,255,0.6)" }}>×</span>
              <SettingInput
                type="number"
                min={320}
                max={2160}
                value={viewportHeight}
                onChange={e =>
                  setViewportHeight(parseInt(e.target.value || "0", 10) || 900)
                }
              />
            </div>
          </SettingItem>
          <SettingItem>
            <span>Auto Layout</span>
            <Switch
              active={useAutoLayout}
              onClick={() => setUseAutoLayout(!useAutoLayout)}
            />
          </SettingItem>
        </SettingsBox>

        {!hideButton && <Divider />}

        {!hideButton && (
          <CreateButton
            onClick={handleImport}
            disabled={isLoading || (!html.trim() && !css.trim())}
          >
            {isLoading ? "⏳ Importando..." : "Importar"}
          </CreateButton>
        )}
      </ImportContainer>
    );
  }
);

ImportDesignTab.displayName = "ImportDesignTab";

export default ImportDesignTab;
