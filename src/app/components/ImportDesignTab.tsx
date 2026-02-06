import React, { useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import styled from "styled-components";

const ImportContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  color: #e0e0e0;
  height: 100%;
  overflow: hidden;
  padding: 0;
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

const CreateButton = styled.button`
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;

  &:hover:not(:disabled) {
    background: #2563eb;
  }

  &:active:not(:disabled) {
    background: #1d4ed8;
  }

  &:disabled {
    background: #6b7280;
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
    "borderTopWidth",
    "borderRightWidth",
    "borderBottomWidth",
    "borderLeftWidth",
    "borderTopColor",
    "borderRightColor",
    "borderBottomColor",
    "borderLeftColor",
    "borderRadius",
    "boxShadow",
    "opacity",

    // Text
    "color",
    "fontFamily",
    "fontSize",
    "fontWeight",
    "lineHeight",
    "textAlign",
    "letterSpacing",
    "textTransform",
    "whiteSpace"
  ] as const;

  const out: Record<string, string> = {};
  for (const key of keys) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const v = (cs as any)[key];
    if (typeof v === "string" && v) out[key] = v;
  }
  return out;
}

function serializeDomTree(
  rootEl: HTMLElement,
  viewportEl: HTMLElement,
  iconImageMap: Map<string, string>
): SerializedNode {
  const viewportRect = viewportEl.getBoundingClientRect();

  const serializeNode = (node: Node): SerializedNode | null => {
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
      const fallbackRect: SerializedRect = {
        x: clampNumber(
          (parentRect?.left || viewportRect.left) - viewportRect.left
        ),
        y: clampNumber(
          (parentRect?.top || viewportRect.top) - viewportRect.top
        ),
        width: clampNumber(parentRect?.width || 0),
        height: clampNumber(parentRect?.height || 0)
      };
      const rect = measuredRect || fallbackRect;
      const styles = parentEl
        ? pickComputedStyles(getComputedStyle(parentEl))
        : {};
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
    const imageUrl = tagName === "img" ? attrs.src || undefined : bgUrl;

    const iconId = el.getAttribute("data-fig-icon-id") || undefined;
    const imageData = iconId ? iconImageMap.get(iconId) : undefined;
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
        const s = serializeNode(child);
        if (s) children.push(s);
      }
    }

    return {
      nodeType: "element",
      tagName,
      attrs,
      rect,
      styles: finalStyles,
      imageUrl,
      imageData,
      isIcon,
      iconName,
      children
    };
  };

  // We serialize the root element itself.
  const result = serializeNode(rootEl);
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
  const html = looksLikeFullDoc
    ? fullHtml
    : `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body>${fullHtml}</body></html>`;

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

    // Wait a bit for Tailwind CDN + fonts to apply styles.
    // (This is best-effort; Tailwind injects CSS async.)
    await new Promise(r => setTimeout(r, 900));
    await new Promise(r =>
      requestAnimationFrame(() => requestAnimationFrame(r))
    );

    const body = doc.body as HTMLElement | null;
    if (!body) throw new Error("Iframe sem body");

    // Choose viewport element as html element to stabilize rect origin.
    const viewportEl = doc.documentElement as HTMLElement;

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

    const tree = serializeDomTree(body, viewportEl, iconImageMap);
    return tree;
  } finally {
    iframe.remove();
  }
}

const ImportDesignTab = () => {
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
        // If Tailwind CDN is present (or CSS is empty), we need rendered import.
        const shouldRender = hasTailwindCdn || !css.trim();
        console.log(
          "[ImportDesignTab] shouldRender:",
          shouldRender,
          "hasTailwindCdn:",
          hasTailwindCdn
        );

        if (shouldRender) {
          console.log("[ImportDesignTab] ✓ Usando rendering (Tailwind)");
          const tree = await renderHtmlInIframeAndSerialize(html, {
            width: viewportWidth,
            height: viewportHeight
          });
          console.log("[ImportDesignTab] ✓ Tree criada:", {
            nodeType: tree.nodeType,
            tagName: tree.tagName,
            childrenCount: tree.children?.length || 0,
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

      <CreateButton
        onClick={handleImport}
        disabled={isLoading || (!html.trim() && !css.trim())}
      >
        {isLoading ? "⏳ Importando..." : "Create"}
      </CreateButton>
    </ImportContainer>
  );
};

export default ImportDesignTab;
