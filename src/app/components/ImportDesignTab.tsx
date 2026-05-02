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
    "whiteSpace",

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
  const html = normalizeTailwindConfigOrder(htmlWithCss);

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
    if (isTailwindDocument(doc) && !isTailwindReady(doc, win, body)) {
      console.warn(
        "[ImportDesignTab] Tailwind CDN não aplicou estilos; usando fallback local"
      );
      applyTailwindFallbackStyles(doc, win);
      await new Promise(r =>
        requestAnimationFrame(() => requestAnimationFrame(r))
      );
    }

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
    `${configScript}<script$1></script>`
  );
}

function isTailwindDocument(doc: Document) {
  return !!doc.querySelector('script[src*="cdn.tailwindcss.com"]');
}

function isTailwindReady(doc: Document, win: Window, body: HTMLElement) {
  const bodyStyles = win.getComputedStyle(body);
  const main = doc.querySelector("main") as HTMLElement | null;
  const mainStyles = main ? win.getComputedStyle(main) : null;
  return (
    bodyStyles.display === "flex" &&
    (!mainStyles ||
      mainStyles.paddingTop !== "0px" ||
      mainStyles.maxWidth !== "none")
  );
}

function readTailwindTheme(doc: Document) {
  const text = doc.getElementById("tailwind-config")?.textContent || "";
  const readSection = (name: string) => {
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
    radius: readSection("borderRadius")
  };
}

function applyTailwindFallbackStyles(doc: Document, win: Window) {
  const theme = readTailwindTheme(doc);
  const colors: Record<string, string> = {
    white: "#ffffff",
    transparent: "transparent",
    primary: "#004ac6",
    background: "#f8f9fa",
    surface: "#f8f9fa",
    "on-surface": "#191c1d",
    "on-background": "#191c1d",
    "surface-container": "#edeeef",
    "surface-container-lowest": "#ffffff",
    "surface-container-low": "#f3f4f5",
    "surface-container-high": "#e7e8e9",
    "surface-container-highest": "#e1e3e4",
    "outline-variant": "#c3c6d7",
    "on-surface-variant": "#434655",
    "primary-container": "#2563eb",
    "on-primary": "#ffffff",
    tertiary: "#006242",
    "tertiary-container": "#007d55",
    "on-tertiary": "#ffffff",
    "on-tertiary-container": "#bdffdb",
    error: "#ba1a1a",
    "on-error": "#ffffff",
    "slate-50": "#f8fafc",
    "slate-200": "#e2e8f0",
    "slate-400": "#94a3b8",
    "slate-500": "#64748b",
    "slate-600": "#475569",
    "slate-900": "#0f172a",
    "blue-600": "#2563eb",
    "blue-700": "#1d4ed8",
    "gray-900": "#111827",
    ...theme.colors
  };
  const spacing: Record<string, string> = {
    "0": "0px",
    "1": "4px",
    "2": "8px",
    "3": "12px",
    "4": "16px",
    "6": "24px",
    "8": "32px",
    "10": "40px",
    "12": "48px",
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "32px",
    gutter: "12px",
    "container-margin": "16px",
    ...theme.spacing
  };
  const radii = {
    DEFAULT: "4px",
    lg: "8px",
    xl: "12px",
    full: "9999px",
    ...theme.radius
  };
  const fontSizes: Record<string, [string, string, string?]> = {
    "body-md": ["14px", "20px", "400"],
    "body-lg": ["16px", "24px", "400"],
    "headline-md": ["20px", "28px", "600"],
    "headline-lg": ["24px", "32px", "700"],
    "headline-xl": ["32px", "40px", "700"],
    "label-md": ["12px", "16px", "600"],
    "price-display": ["18px", "24px", "700"]
  };
  const getColor = (name: string) =>
    colors[name] || colors[name.replace("/", "-")];
  const getSpace = (value: string) =>
    value.startsWith("[") ? value.slice(1, -1) : spacing[value];
  const applySpace = (
    style: CSSStyleDeclaration,
    prop: string,
    value: string
  ) => {
    const v = getSpace(value);
    if (v) (style as any)[prop] = v;
  };
  const applyColorWithOpacity = (
    style: CSSStyleDeclaration,
    prop: "backgroundColor" | "color" | "borderColor",
    value: string
  ) => {
    const [name, opacity] = value.split("/");
    const color = getColor(name);
    if (!color) return;
    (style as any)[prop] = color;
    if (prop === "backgroundColor" && opacity)
      style.opacity = String(parseInt(opacity, 10) / 100);
  };

  doc.querySelectorAll<HTMLElement>("[class]").forEach(el => {
    const classes = Array.from(el.classList);
    el.style.boxSizing = "border-box";

    for (const original of classes) {
      if (original.includes(":") && !/^(md|lg|xl):/.test(original)) continue;
      const cls = original.replace(/^(md|lg|xl):/, "");
      const s = el.style;

      if (cls === "flex") s.display = "flex";
      else if (cls === "grid") s.display = "grid";
      else if (cls === "hidden") s.display = "none";
      else if (cls === "block") s.display = "block";
      else if (cls === "inline-flex") s.display = "inline-flex";
      else if (cls === "flex-col") s.flexDirection = "column";
      else if (cls === "flex-row") s.flexDirection = "row";
      else if (cls === "flex-grow") s.flexGrow = "1";
      else if (cls === "flex-wrap") s.flexWrap = "wrap";
      else if (cls === "items-center") s.alignItems = "center";
      else if (cls === "items-start") s.alignItems = "flex-start";
      else if (cls === "items-end") s.alignItems = "flex-end";
      else if (cls === "justify-center") s.justifyContent = "center";
      else if (cls === "justify-between") s.justifyContent = "space-between";
      else if (cls === "justify-end") s.justifyContent = "flex-end";
      else if (cls === "relative") s.position = "relative";
      else if (cls === "absolute") s.position = "absolute";
      else if (cls === "fixed") s.position = "fixed";
      else if (cls === "top-0") s.top = "0px";
      else if (cls === "bottom-0") s.bottom = "0px";
      else if (cls === "left-0") s.left = "0px";
      else if (cls === "right-0") s.right = "0px";
      else if (cls === "inset-0") {
        s.top = s.right = s.bottom = s.left = "0px";
      } else if (cls === "w-full") s.width = "100%";
      else if (cls === "h-full") s.height = "100%";
      else if (cls === "min-h-screen") s.minHeight = `${win.innerHeight}px`;
      else if (cls === "mx-auto") {
        s.marginLeft = "auto";
        s.marginRight = "auto";
      } else if (cls === "overflow-hidden") s.overflow = "hidden";
      else if (cls === "cursor-pointer") s.cursor = "pointer";
      else if (cls === "object-cover") s.objectFit = "cover";
      else if (cls === "text-center") s.textAlign = "center";
      else if (cls === "tracking-tight") s.letterSpacing = "-0.01em";
      else if (cls === "tracking-widest") s.letterSpacing = "0.1em";
      else if (cls === "font-bold") s.fontWeight = "700";
      else if (cls === "font-semibold") s.fontWeight = "600";
      else if (cls === "font-medium") s.fontWeight = "500";
      else if (cls === "font-black") s.fontWeight = "900";
      else if (cls.startsWith("font-")) s.fontFamily = "Inter, sans-serif";
      else if (cls.startsWith("gap-")) applySpace(s, "gap", cls.slice(4));
      else if (cls.startsWith("p-")) applySpace(s, "padding", cls.slice(2));
      else if (cls.startsWith("px-")) {
        applySpace(s, "paddingLeft", cls.slice(3));
        applySpace(s, "paddingRight", cls.slice(3));
      } else if (cls.startsWith("py-")) {
        applySpace(s, "paddingTop", cls.slice(3));
        applySpace(s, "paddingBottom", cls.slice(3));
      } else if (cls.startsWith("pt-"))
        applySpace(s, "paddingTop", cls.slice(3));
      else if (cls.startsWith("pb-"))
        applySpace(s, "paddingBottom", cls.slice(3));
      else if (cls.startsWith("mt-")) applySpace(s, "marginTop", cls.slice(3));
      else if (cls.startsWith("mb-"))
        applySpace(s, "marginBottom", cls.slice(3));
      else if (cls.startsWith("w-")) applySpace(s, "width", cls.slice(2));
      else if (cls.startsWith("h-")) applySpace(s, "height", cls.slice(2));
      else if (cls.startsWith("max-w-")) {
        if (cls === "max-w-7xl") s.maxWidth = "1280px";
        else if (cls === "max-w-3xl") s.maxWidth = "768px";
      } else if (cls.startsWith("rounded-")) {
        const key = cls.slice(8) || "DEFAULT";
        s.borderRadius = (radii as any)[key] || key;
      } else if (cls === "rounded") s.borderRadius = radii.DEFAULT;
      else if (cls === "border") {
        s.borderWidth = "1px";
        s.borderStyle = "solid";
      } else if (cls === "border-2") {
        s.borderWidth = "2px";
        s.borderStyle = "solid";
      } else if (cls.startsWith("border-"))
        applyColorWithOpacity(s, "borderColor", cls.slice(7));
      else if (cls.startsWith("bg-gradient-to-r"))
        s.backgroundImage =
          "linear-gradient(to right, transparent, rgba(255,255,255,.2), transparent)";
      else if (cls.startsWith("bg-"))
        applyColorWithOpacity(s, "backgroundColor", cls.slice(3));
      else if (cls.startsWith("text-[") && cls.endsWith("]"))
        s.fontSize = cls.slice(6, -1);
      else if (cls.startsWith("text-")) {
        const token = cls.slice(5);
        if (fontSizes[token]) {
          const [size, lineHeight, weight] = fontSizes[token];
          s.fontSize = size;
          s.lineHeight = lineHeight;
          if (weight) s.fontWeight = weight;
        } else {
          applyColorWithOpacity(s, "color", token);
        }
      } else if (cls.startsWith("aspect-[")) {
        s.aspectRatio = cls.slice(8, -1).replace("/", " / ");
      } else if (cls === "shadow-sm") {
        s.boxShadow = "0 1px 2px rgba(0,0,0,.08)";
      } else if (cls === "shadow-md") {
        s.boxShadow = "0 4px 6px rgba(0,0,0,.12)";
      } else if (cls.startsWith("opacity-")) {
        s.opacity = String(parseInt(cls.slice(8), 10) / 100);
      } else if (cls === "z-10") s.zIndex = "10";
      else if (cls === "z-40") s.zIndex = "40";
      else if (cls === "z-50") s.zIndex = "50";
    }
  });
}

async function waitForRenderedStylesAndAssets(
  doc: Document,
  win: Window,
  body: HTMLElement
) {
  const hasTailwind = !!doc.querySelector('script[src*="cdn.tailwindcss.com"]');

  if (hasTailwind) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < 5000) {
      const bodyStyles = win.getComputedStyle(body);
      const hasGeneratedCss =
        bodyStyles.display === "flex" ||
        bodyStyles.backgroundColor !== "rgba(0, 0, 0, 0)";
      const main = doc.querySelector("main") as HTMLElement | null;
      const mainStyles = main ? win.getComputedStyle(main) : null;
      const layoutLooksReady =
        !mainStyles ||
        mainStyles.paddingTop !== "0px" ||
        mainStyles.maxWidth !== "none";
      if (hasGeneratedCss && layoutLooksReady) break;
      await new Promise(r => setTimeout(r, 100));
    }
  } else {
    await new Promise(r => setTimeout(r, 900));
  }

  try {
    await (doc as any).fonts?.ready;
  } catch {
    // Font loading is best-effort inside Figma's iframe.
  }

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

  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
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
                    viewport: { width: viewportWidth, height: viewportHeight }
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
                    css
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
      [html, css, isLoading]
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
            <span>Theme</span>
            <SettingValue>Light</SettingValue>
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
