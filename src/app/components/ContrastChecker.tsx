import React, { useEffect, useState } from "react";

// Função para misturar cores considerando transparência
const blendColors = (
  bg: { r: number; g: number; b: number; a: number },
  fg: { r: number; g: number; b: number; a: number },
  alpha: number
) => {
  const finalAlpha = fg.a * alpha;
  const newAlpha = bg.a + finalAlpha * (1 - bg.a);

  if (newAlpha <= 0) {
    return { r: 0, g: 0, b: 0, a: 0 };
  }

  const r =
    ((1 - finalAlpha) * bg.r * bg.a + finalAlpha * fg.r * fg.a) / newAlpha;
  const g =
    ((1 - finalAlpha) * bg.g * bg.a + finalAlpha * fg.g * fg.a) / newAlpha;
  const b =
    ((1 - finalAlpha) * bg.b * bg.a + finalAlpha * fg.b * fg.a) / newAlpha;

  return {
    r: Math.max(0, Math.min(1, r)),
    g: Math.max(0, Math.min(1, g)),
    b: Math.max(0, Math.min(1, b)),
    a: Math.max(0, Math.min(1, newAlpha))
  };
};

// Função para calcular a cor média de um conjunto de cores com pesos
const getAverageColor = (
  colors: Array<{
    color: { r: number; g: number; b: number; a?: number };
    weight: number;
  }>
) => {
  let totalR = 0,
    totalG = 0,
    totalB = 0,
    totalA = 0,
    totalWeight = 0;

  for (const item of colors) {
    if (!item || !item.color) continue;

    const weight = item.weight > 0 ? item.weight : 1;
    const alpha = item.color.a !== undefined ? item.color.a : 1;
    const r = item.color.r !== undefined ? item.color.r : 0;
    const g = item.color.g !== undefined ? item.color.g : 0;
    const b = item.color.b !== undefined ? item.color.b : 0;

    totalR += r * weight * alpha;
    totalG += g * weight * alpha;
    totalB += b * weight * alpha;
    totalA += weight * alpha;
    totalWeight += weight;
  }

  if (totalWeight <= 0) return { r: 0, g: 0, b: 0, a: 0 };

  return {
    r: Math.max(0, Math.min(1, totalR / totalWeight)),
    g: Math.max(0, Math.min(1, totalG / totalWeight)),
    b: Math.max(0, Math.min(1, totalB / totalWeight)),
    a: Math.max(0, Math.min(1, totalA / totalWeight))
  };
};

// Interface para o resultado de contraste
interface ContrastResult {
  id: string;
  nodeName: string;
  nodeType: string;
  text: string;
  textColor: string;
  bgColor: string;
  contrastRatio: number;
  aa: boolean;
  aaa: boolean;
  aaLarge: boolean;
  hasIssues: boolean;
  issues: string[];
  fontSize: number;
  fontWeight: number | string;
  textOpacity: number;
  bgOpacity: number;
}

// Interface para os dados do nó do Figma
interface FigmaNode {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  characters?: string;
  fontSize?: number;
  fontWeight?: number | string;
  fills?: Array<{
    type: string;
    visible: boolean;
    opacity?: number;
    color?: {
      r: number;
      g: number;
      b: number;
      a?: number;
    };
    gradientStops?: any[];
  }>;
  strokes?: Array<any>;
  effects?: any[];
  children?: FigmaNode[];
  parent?: any;
  absoluteBoundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  opacity?: number;
  textSegments?: Array<{
    start: number;
    end: number;
    fontSize: number;
    fontName: any;
    fontWeight: number | string;
    fills: any[];
    textCase?: string;
    textDecoration?: string;
    letterSpacing?: any;
    lineHeight?: any;
  }>;
  backgroundColor?: {
    r: number;
    g: number;
    b: number;
    a?: number;
  };
  backgrounds?: any[];
  mainComponent?: any;
}

// Interface para as props do componente
interface ContrastCheckerProps {
  isVisible: boolean;
  selectedNode: any;
  onBack: () => void;
}

// Função para converter cor do formato Figma (0-1) para hexadecimal
const toHex = (color: {
  r: number;
  g: number;
  b: number;
  a?: number;
}): string => {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  const a = color.a !== undefined ? Math.round(color.a * 255) : 255;

  const toHexValue = (c: number) => {
    const hex = c.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHexValue(r)}${toHexValue(g)}${toHexValue(b)}${
    a < 255 ? toHexValue(a) : ""
  }`.toUpperCase();
};

// Função para calcular o contraste WCAG
const getContrastRatio = (
  color1: { r: number; g: number; b: number },
  color2: { r: number; g: number; b: number }
): number => {
  const getLuminance = (r: number, g: number, b: number): number => {
    const a = [r, g, b].map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  };

  const luminance1 = getLuminance(
    color1.r * 255,
    color1.g * 255,
    color1.b * 255
  );
  const luminance2 = getLuminance(
    color2.r * 255,
    color2.g * 255,
    color2.b * 255
  );

  const lighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);

  return (lighter + 0.05) / (darker + 0.05);
};

// Função para verificar se é texto grande (WCAG)
const isLargeText = (
  fontSize: number,
  fontWeight: number | string
): boolean => {
  const weight =
    typeof fontWeight === "string" ? parseInt(fontWeight, 10) : fontWeight;
  const isBold = weight >= 700;
  return fontSize >= (isBold ? 14 : 18);
};

// Função para encontrar a cor de fundo de um nó
const findBackgroundColor = (
  node: FigmaNode,
  depth = 0,
  isRoot = false,
  visitedNodes = new Set<string>()
): {
  color: { r: number; g: number; b: number };
  opacity: number;
} | null => {
  if (!node || depth > 20 || (node.id && visitedNodes.has(node.id))) {
    return null;
  }
  if (node.id) {
    visitedNodes.add(node.id);
  }

  // 1. Verificar preenchimentos do próprio nó (sólidos, gradientes)
  const nodeBg = getNodeBackground(node);
  if (nodeBg && nodeBg.opacity > 0.05) {
    return nodeBg;
  }

  // 2. Tentar subir a árvore de pais para encontrar um fundo
  if (node.parent) {
    const parentBg = findBackgroundColor(
      node.parent,
      depth + 1,
      false,
      new Set(visitedNodes)
    );
    if (parentBg) {
      // Se o nó atual tiver opacidade, misturar com a cor do pai
      if (node.opacity !== undefined && node.opacity < 1) {
        const blended = blendColors(
          { ...parentBg.color, a: parentBg.opacity },
          { r: 1, g: 1, b: 1, a: 1 }, // Cor branca é usada como base
          node.opacity
        );
        return { color: blended, opacity: blended.a };
      }
      return parentBg;
    }
  }

  // 3. Se for o nó raiz, verificar configurações de fundo da página/documento
  if (isRoot) {
    if (node.backgroundColor) {
      return {
        color: {
          r: node.backgroundColor.r,
          g: node.backgroundColor.g,
          b: node.backgroundColor.b
        },
        opacity:
          node.backgroundColor.a !== undefined ? node.backgroundColor.a : 1
      };
    }
  }

  // Se não encontrar nenhum fundo, retornar null
  return null;
};

// Função auxiliar para extrair cor de fundo de um nó
const getNodeBackground = (node: FigmaNode) => {
  if (!node) return null;

  // Prioriza o `backgroundColor`
  if (node.backgroundColor) {
    return {
      color: {
        r: node.backgroundColor.r,
        g: node.backgroundColor.g,
        b: node.backgroundColor.b
      },
      opacity: node.backgroundColor.a !== undefined ? node.backgroundColor.a : 1
    };
  }

  // Prioriza os preenchimentos (fills)
  if (!node.fills || !Array.isArray(node.fills)) {
    return null;
  }

  const visibleFills = node.fills.filter(
    f =>
      f.visible !== false &&
      (f.type === "SOLID" || f.type.includes("GRADIENT") || f.type === "IMAGE")
  );

  if (visibleFills.length === 0) return null;

  let combinedColor = { r: 0, g: 0, b: 0, a: 0 };
  for (let i = visibleFills.length - 1; i >= 0; i--) {
    const fill = visibleFills[i];
    const fillOpacity = fill.opacity !== undefined ? fill.opacity : 1;
    const nodeOpacity = node.opacity !== undefined ? node.opacity : 1;
    const totalOpacity = fillOpacity * nodeOpacity;

    if (fill.type === "SOLID" && fill.color) {
      combinedColor = blendColors(
        combinedColor,
        { ...fill.color, a: 1 },
        totalOpacity * (fill.color.a !== undefined ? fill.color.a : 1)
      );
    } else if (fill.type.includes("GRADIENT") && fill.gradientStops) {
      const gradientColors = fill.gradientStops.map(s => ({
        color: s.color,
        weight: s.position || 0.5
      }));
      const avgColor = getAverageColor(gradientColors);
      combinedColor = blendColors(
        combinedColor,
        { ...avgColor, a: 1 },
        totalOpacity * (avgColor.a || 1)
      );
    } else if (fill.type === "IMAGE") {
      // Para imagens, assume um fundo cinza médio com baixa opacidade
      combinedColor = blendColors(
        combinedColor,
        { r: 0.5, g: 0.5, b: 0.5, a: 1 },
        0.5 * totalOpacity
      );
    }

    if (combinedColor.a >= 0.99) break;
  }

  if (combinedColor.a <= 0.05) return null;

  return {
    color: {
      r: combinedColor.r,
      g: combinedColor.g,
      b: combinedColor.b
    },
    opacity: combinedColor.a
  };
};

const ContrastChecker: React.FC<ContrastCheckerProps> = ({
  isVisible,
  selectedNode,
  onBack
}) => {
  const [results, setResults] = useState<ContrastResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isVisible || !selectedNode) return;

    const processNode = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (!selectedNode) {
          setError("Nenhum nó selecionado para análise de contraste");
          return;
        }

        const extractFillColor = (fills: any[]) => {
          if (!Array.isArray(fills) || fills.length === 0) {
            return null;
          }
          const fill = fills.find(
            f =>
              f.visible &&
              (f.color || f.gradientStops) &&
              (f.opacity === undefined || f.opacity > 0)
          );
          if (!fill) return null;

          if (fill.gradientStops && fill.gradientStops.length > 0) {
            const sortedStops = [...fill.gradientStops].sort((a, b) => {
              const luminanceA = getContrastRatio(
                { ...a.color, a: 1 },
                { r: 0.5, g: 0.5, b: 0.5 }
              );
              const luminanceB = getContrastRatio(
                { ...b.color, a: 1 },
                { r: 0.5, g: 0.5, b: 0.5 }
              );
              return luminanceA - luminanceB;
            });
            const darkestColor = sortedStops[0].color;
            return {
              r: darkestColor.r,
              g: darkestColor.g,
              b: darkestColor.b,
              a: fill.opacity !== undefined ? fill.opacity : darkestColor.a || 1
            };
          }

          if (fill.color) {
            return {
              r: fill.color.r,
              g: fill.color.g,
              b: fill.color.b,
              a: fill.opacity !== undefined ? fill.opacity : fill.color.a || 1
            };
          }

          return null;
        };

        const toRGB = (color: {
          r: number;
          g: number;
          b: number;
          a?: number;
        }) => {
          if (!color) return { r: 0, g: 0, b: 0, a: 1 };
          return {
            r: Math.round(color.r * 255),
            g: Math.round(color.g * 255),
            b: Math.round(color.b * 255),
            a: color.a !== undefined ? color.a : 1
          };
        };

        const rgbToHex = (r: number, g: number, b: number) => {
          return (
            "#" +
            [r, g, b]
              .map(x => {
                const hex = Math.round(x).toString(16);
                return hex.length === 1 ? "0" + hex : hex;
              })
              .join("")
              .toUpperCase()
          );
        };

        const checkContrast = (
          fgColor: any,
          bgColor: any,
          fontSize: number,
          fontWeight: number | string
        ) => {
          if (!fgColor || !bgColor) {
            return { ratio: 0, aa: false, aaa: false, aaLarge: false };
          }

          const fg = toRGB(fgColor);
          const bg = toRGB(bgColor);

          const finalFg =
            fg.a < 1
              ? toRGB(blendColors({ ...bg, a: 1 }, { ...fg, a: 1 }, fg.a))
              : fg;

          const ratio = getContrastRatio(
            { r: finalFg.r, g: finalFg.g, b: finalFg.b },
            { r: bg.r, g: bg.g, b: bg.b }
          );

          const isLarge = isLargeText(fontSize, fontWeight);

          return {
            ratio: parseFloat(ratio.toFixed(2)),
            aa: ratio >= 4.5 || (isLarge && ratio >= 3),
            aaa: ratio >= 7 || (isLarge && ratio >= 4.5),
            aaLarge: isLarge
          };
        };

        const shouldSkipNode = (node: any): boolean => {
          if (node.visible === false) return true;
          const ignoredTypes = [
            "PAGE",
            "DOCUMENT",
            "SLICE",
            "STICKY",
            "CONNECTOR",
            "WIDGET",
            "EMBED",
            "LINK_UNFURL",
            "MEDIA",
            "CODE_BLOCK"
          ];
          return ignoredTypes.includes(node.type);
        };

        const extractNodeText = (node: any): string => {
          if (!node) return "";
          if (node.type === "TEXT" && node.characters) {
            return node.characters.trim();
          }
          if (node.children && Array.isArray(node.children)) {
            return node.children
              .map((child: any) => extractNodeText(child))
              .filter((text: string) => text.length > 0)
              .join(" ");
          }
          return "";
        };

        const processChildNodes = (
          node: any,
          results: ContrastResult[] = [],
          depth = 0
        ) => {
          try {
            if (depth > 20 || shouldSkipNode(node)) {
              return results;
            }

            const nodeText = extractNodeText(node);
            const hasText = nodeText.length > 0;
            const elementFill = extractFillColor(node.fills || []);
            const hasFill = elementFill && elementFill.a > 0.05;
            const hasStrokes =
              node.strokes &&
              Array.isArray(node.strokes) &&
              node.strokes.some(
                (s: any) => s.visible && s.color && s.color.a > 0.05
              );

            const nodeBg = findBackgroundColor(node, 0, true);

            if (hasText && node.type === "TEXT") {
              const textFontSize =
                (node.textSegments && node.textSegments.length > 0
                  ? node.textSegments[0].fontSize
                  : node.fontSize) || 16;
              const textFontWeight =
                (node.textSegments && node.textSegments.length > 0
                  ? node.textSegments[0].fontWeight
                  : node.fontWeight) || 400;

              const textColor = elementFill ? elementFill : null;
              if (textColor && nodeBg) {
                const contrast = checkContrast(
                  textColor,
                  nodeBg.color,
                  textFontSize,
                  textFontWeight
                );

                const textRGB = toRGB(textColor);
                const bgRGB = toRGB(nodeBg.color);

                const result: ContrastResult = {
                  id: node.id,
                  nodeName: node.name || "Texto",
                  nodeType: "TEXT",
                  text: nodeText,
                  textColor: rgbToHex(textRGB.r, textRGB.g, textRGB.b),
                  bgColor: rgbToHex(bgRGB.r, bgRGB.g, bgRGB.b),
                  contrastRatio: contrast.ratio,
                  aa: contrast.aa,
                  aaa: contrast.aaa,
                  aaLarge: contrast.aaLarge,
                  hasIssues: !contrast.aa,
                  issues: !contrast.aa
                    ? [
                        `Contraste insuficiente ${contrast.ratio.toFixed(
                          1
                        )}:1 (mínimo ${
                          contrast.aaLarge ? "3:1 para texto grande" : "4.5:1"
                        })`
                      ]
                    : [],
                  fontSize: textFontSize,
                  fontWeight: textFontWeight,
                  textOpacity: textColor.a || 1,
                  bgOpacity: nodeBg.opacity || 1
                };

                results.push(result);
              }
            }

            // Processar elementos gráficos e bordas
            const nodeIsGraphic =
              (node.type !== "TEXT" && hasFill) || hasStrokes;
            if (nodeIsGraphic) {
              const graphicColor = hasFill
                ? elementFill
                : extractFillColor(node.strokes || []);
              const graphicBg =
                nodeBg || findBackgroundColor(node.parent, 0, false);

              if (graphicColor && graphicBg) {
                const contrast = checkContrast(
                  graphicColor,
                  graphicBg.color,
                  0,
                  400
                ); // Tamanho e peso não importam para gráficos

                if (contrast.ratio < 3) {
                  const graphicRGB = toRGB(graphicColor);
                  const bgRGB = toRGB(graphicBg.color);

                  const result: ContrastResult = {
                    id: node.id,
                    nodeName:
                      node.name ||
                      `Elemento ${node.type?.toLowerCase() || ""}`.trim(),
                    nodeType: node.type || "ELEMENT",
                    text: "",
                    textColor: rgbToHex(
                      graphicRGB.r,
                      graphicRGB.g,
                      graphicRGB.b
                    ),
                    bgColor: rgbToHex(bgRGB.r, bgRGB.g, bgRGB.b),
                    contrastRatio: contrast.ratio,
                    aa: contrast.ratio >= 3,
                    aaa: contrast.ratio >= 4.5,
                    aaLarge: false,
                    hasIssues: contrast.ratio < 3,
                    issues:
                      contrast.ratio < 3
                        ? [
                            `Contraste insuficiente ${contrast.ratio.toFixed(
                              1
                            )}:1 (mínimo 3:1 para elementos gráficos)`
                          ]
                        : [],
                    fontSize: 0,
                    fontWeight: 400,
                    textOpacity: graphicColor.a || 1,
                    bgOpacity: graphicBg.opacity || 1
                  };
                  results.push(result);
                }
              }
            }

            if (node.children && Array.isArray(node.children)) {
              for (const child of node.children) {
                processChildNodes(child, results, depth + 1);
              }
            }
            return results;
          } catch (e) {
            console.error("Falha ao processar nó para contraste:", node?.id, e);
            return results;
          }
        };

        const analysisResults: ContrastResult[] = [];
        processChildNodes(selectedNode, analysisResults, 0);

        analysisResults.sort((a, b) => {
          if (a.hasIssues && !b.hasIssues) return -1;
          if (!a.hasIssues && b.hasIssues) return 1;
          return a.contrastRatio - b.contrastRatio;
        });

        setResults(analysisResults);
      } catch (err) {
        console.error("Erro ao processar nó:", err);
        setError("Ocorreu um erro ao verificar o contraste. Tente novamente.");
      } finally {
        setIsLoading(false);
      }
    };

    processNode();
  }, [selectedNode, isVisible]);

  if (!isVisible) return null;

  const formatContrast = (ratio: number): string => {
    return ratio.toFixed(1) + ":1";
  };

  const getContrastStatusColor = (result: ContrastResult): string => {
    if (result.aaa) return "#4CAF50";
    if (result.aa) return "#8BC34A";
    if (result.aaLarge) return "#FFC107";
    return "#F44336";
  };

  const getContrastStatusText = (result: ContrastResult): string => {
    if (result.aaa) return "AAA";
    if (result.aa) return "AA";
    if (result.aaLarge) return "AA (texto grande)";
    return "Falha";
  };

  const totalResults = results.length;
  const errorResults = results.filter(r => r.hasIssues).length;
  const passingResults = totalResults - errorResults;

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        boxSizing: "border-box",
        overflow: "hidden",
        color: "#FFFFFF",
        backgroundColor: "var(--figma-color-bg)",
        padding: "0 16px 16px 16px"
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          margin: "24px 0 24px 0"
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            color: "#18A0FB",
            display: "flex",
            alignItems: "center"
          }}
        >
          {/* ... resto do seu componente React ... */}
        </button>
      </div>
    </div>
  );
};

export default ContrastChecker;
