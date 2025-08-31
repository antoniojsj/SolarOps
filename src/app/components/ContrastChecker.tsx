import React, { useEffect, useState, useRef } from "react";
import { ChromePicker, ColorResult } from "react-color";
import { SketchPicker } from "react-color";

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

interface ManualCheckState {
  foregroundColor: string;
  backgroundColor: string;
  fontSize: number;
  isBold: boolean;
  contrastRatio: number;
  aa: boolean;
  aaa: boolean;
  aaLarge: boolean;
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
  selectedNode
}) => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [results, setResults] = useState<ContrastResult[]>([]);
  const [manualCheck, setManualCheck] = useState<ManualCheckState>({
    foregroundColor: "#000000",
    backgroundColor: "#FFFFFF",
    fontSize: 16,
    isBold: false,
    contrastRatio: 21,
    aa: true,
    aaa: true,
    aaLarge: true
  });
  // Removemos a análise automática, então não precisamos mais de activeTab
  const activeTab = "manual";

  // Função para converter hex para RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16) / 255,
          g: parseInt(result[2], 16) / 255,
          b: parseInt(result[3], 16) / 255,
          a: 1
        }
      : { r: 0, g: 0, b: 0, a: 1 };
  };

  // Função para atualizar a checagem manual
  const updateManualCheck = (updates: Partial<ManualCheckState>) => {
    const newState = { ...manualCheck, ...updates };

    // Recalcular contraste se as cores foram atualizadas
    if (
      updates.foregroundColor ||
      updates.backgroundColor ||
      updates.fontSize ||
      updates.isBold !== undefined
    ) {
      const fgColor = hexToRgb(newState.foregroundColor);
      const bgColor = hexToRgb(newState.backgroundColor);

      const ratio = getContrastRatio(
        { r: fgColor.r, g: fgColor.g, b: fgColor.b },
        { r: bgColor.r, g: bgColor.g, b: bgColor.b }
      );

      const isLarge = isLargeText(
        newState.fontSize,
        newState.isBold ? 700 : 400
      );
      const ratioRounded = parseFloat(ratio.toFixed(2));

      // Atualiza o estado com o novo contraste
      newState.contrastRatio = ratioRounded;

      // Verifica os níveis de conformidade
      // Nível A: Mínimo para qualquer texto
      const levelA = ratioRounded >= 3;

      // Nível AA:
      // - 4.5:1 para texto normal
      // - 3:1 para texto grande
      const levelAA = isLarge ? ratioRounded >= 3 : ratioRounded >= 4.5;

      // Nível AAA:
      // - 7:1 para texto normal
      // - 4.5:1 para texto grande
      const levelAAA = isLarge ? ratioRounded >= 4.5 : ratioRounded >= 7;

      // Atualiza os estados
      newState.aa = levelAA;
      newState.aaa = levelAAA;
      newState.aaLarge = isLarge;
    }

    setManualCheck(newState);
  };

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

  // Estilo comum para os botões de tab
  const tabButtonStyle = (isActive: boolean) => ({
    padding: "8px 16px",
    backgroundColor: isActive
      ? "var(--figma-color-bg-brand)"
      : "var(--figma-color-bg-secondary)",
    color: isActive ? "white" : "var(--figma-color-text)",
    border: "none",
    borderRadius: "4px 4px 0 0",
    cursor: "pointer",
    fontWeight: isActive ? "bold" : "normal",
    marginRight: "4px"
  });

  // Estilo para os círculos de cor
  const colorCircleStyle = (color: string) => ({
    width: "24px",
    height: "24px",
    backgroundColor: color,
    border: "1px solid var(--figma-color-border)",
    borderRadius: "50%",
    display: "inline-block",
    marginRight: "8px"
  });

  // Estilo para os indicadores de status
  const statusIndicatorStyle = (isPass: boolean) => ({
    display: "inline-block",
    padding: "4px 8px",
    borderRadius: "4px",
    backgroundColor: isPass
      ? "rgba(76, 175, 80, 0.2)"
      : "rgba(244, 67, 54, 0.2)",
    color: isPass ? "#2E7D32" : "#C62828",
    fontWeight: "bold",
    fontSize: "12px"
  });

  // Renderiza a tabela de referência WCAG
  const renderWcagReferenceTable = () => (
    <div
      style={{
        marginTop: "24px",
        marginBottom: "24px",
        border: "1px solid var(--figma-color-border)",
        borderRadius: "8px",
        maxHeight: "300px",
        overflowY: "auto"
      }}
    >
      <h3
        style={{
          margin: "0 0px 12px",
          color: "white",
          fontSize: "14px",
          fontWeight: 400,
          position: "sticky",
          top: 0,
          backgroundColor: "var(--figma-color-bg)",
          zIndex: 1
        }}
      >
        Referência de Conformidade WCAG 2.2
      </h3>

      <div>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "12px",
            marginTop: "8px"
          }}
        >
          <thead>
            <tr style={{ borderBottom: "1px solid #999" }}>
              <th
                style={{
                  textAlign: "left",
                  padding: "6px",
                  color: "white",
                  border: "1px solid #999",
                  fontSize: "12px"
                }}
              >
                Tipo de Conteúdo
              </th>
              <th
                style={{
                  textAlign: "center",
                  padding: "6px",
                  color: "white",
                  border: "1px solid #999",
                  fontSize: "12px"
                }}
              >
                AA
              </th>
              <th
                style={{
                  textAlign: "center",
                  padding: "6px",
                  color: "white",
                  border: "1px solid #999",
                  fontSize: "12px"
                }}
              >
                AAA
              </th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: "1px solid #999" }}>
              <td
                style={{
                  padding: "6px",
                  color: "white",
                  border: "1px solid #999",
                  fontSize: "12px"
                }}
              >
                Texto Normal (abaixo de 18pt)
              </td>
              <td
                style={{
                  padding: "6px",
                  textAlign: "center",
                  color: "white",
                  border: "1px solid #999",
                  fontSize: "12px"
                }}
              >
                4.5:1
              </td>
              <td
                style={{
                  padding: "6px",
                  textAlign: "center",
                  color: "white",
                  border: "1px solid #999",
                  fontSize: "12px"
                }}
              >
                7:1
              </td>
            </tr>
            <tr style={{ borderBottom: "1px solid #999" }}>
              <td
                style={{
                  padding: "6px",
                  color: "white",
                  border: "1px solid #999",
                  fontSize: "12px"
                }}
              >
                Texto Grande (acima de 18pt ou 14pt bold)
              </td>
              <td
                style={{
                  padding: "6px",
                  textAlign: "center",
                  color: "white",
                  border: "1px solid #999",
                  fontSize: "12px"
                }}
              >
                3:1
              </td>
              <td
                style={{
                  padding: "6px",
                  textAlign: "center",
                  color: "white",
                  border: "1px solid #999",
                  fontSize: "12px"
                }}
              >
                4.5:1
              </td>
            </tr>
            <tr>
              <td
                style={{
                  padding: "6px",
                  color: "white",
                  border: "1px solid #999",
                  fontSize: "12px"
                }}
              >
                Elementos Gráficos e Componentes de Interface
              </td>
              <td
                style={{
                  padding: "6px",
                  textAlign: "center",
                  color: "white",
                  border: "1px solid #999",
                  fontSize: "12px"
                }}
              >
                3:1
              </td>
              <td
                style={{
                  padding: "6px",
                  textAlign: "center",
                  color: "white",
                  border: "1px solid #999",
                  fontSize: "12px"
                }}
              >
                Não definido
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  // Função para determinar o nível de conformidade alcançado
  const getComplianceLevel = (
    isLargeText: boolean,
    isGraphicElement = false
  ) => {
    const ratio = manualCheck.contrastRatio;

    // Critérios para texto normal
    if (!isLargeText && !isGraphicElement) {
      if (ratio >= 7) return { level: "AAA", isPassing: true };
      if (ratio >= 4.5) return { level: "AA", isPassing: true };
      return { level: "AA", isPassing: false }; // Falha no AA
    }

    // Critérios para texto grande
    if (isLargeText) {
      if (ratio >= 4.5) return { level: "AAA", isPassing: true };
      if (ratio >= 3) return { level: "AA", isPassing: true };
      return { level: "AA", isPassing: false }; // Falha no AA
    }

    // Critérios para elementos gráficos
    if (isGraphicElement) {
      if (ratio >= 3) return { level: "AA", isPassing: true };
      return { level: "AA", isPassing: false }; // Falha no AA
    }

    return { level: "", isPassing: false };
  };

  // Renderiza os níveis de conformidade WCAG
  const renderComplianceLevels = () => {
    const normalTextLevel = getComplianceLevel(false);
    const largeTextLevel = getComplianceLevel(true);
    const uiLevel = getComplianceLevel(false, true); // true indica que é elemento gráfico

    const items = [
      {
        title: "Texto normal",
        level: normalTextLevel.level,
        required:
          normalTextLevel.level === "AAA"
            ? "7:1+"
            : normalTextLevel.level === "AA"
            ? "4.5:1+"
            : "3:1+",
        isPassing: normalTextLevel.isPassing
      },
      {
        title: "Texto grande",
        level: largeTextLevel.level,
        required:
          largeTextLevel.level === "AAA"
            ? "4.5:1+"
            : largeTextLevel.level === "AA"
            ? "3:1+"
            : "3:1+",
        isPassing: largeTextLevel.isPassing
      },
      {
        title: "Elementos gráficos",
        level: uiLevel.level,
        required: "3:1+",
        isPassing: uiLevel.isPassing
      }
    ];

    return (
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "16px",
          gap: "12px"
        }}
      >
        {items.map((item, index) => (
          <div
            key={index}
            style={{
              flex: 1,
              padding: "8px 8px",
              backgroundColor: item.isPassing
                ? "rgba(76, 175, 80, 0.1)"
                : "rgba(244, 67, 54, 0.1)",
              borderRadius: "8px",
              border: `1px solid ${item.isPassing ? "#4CAF50" : "#F44336"}`,
              textAlign: "center",
              minHeight: "100px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between"
            }}
          >
            <div
              style={{
                fontSize: "11px",
                color: "white",
                fontWeight: "500",
                lineHeight: "1.1",
                marginBottom: "4px"
              }}
            >
              {item.title}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "6px",
                margin: "8px 0",
                flexWrap: "wrap"
              }}
            >
              {["AA", "AAA"].map(level => {
                // Para texto grande, mostramos o A como ativo quando o contraste for >= 3
                const isLargeTextItem = item.title === "Texto grande";
                const isActiveForLargeText =
                  isLargeTextItem &&
                  level === "A" &&
                  manualCheck.contrastRatio >= 3;

                const isCurrentLevel = item.level === level;
                const isHigherLevel = level === "AA" && item.level === "AAA";

                const showLevel = isCurrentLevel || isHigherLevel;
                const isActive = isCurrentLevel || isHigherLevel;

                // Verifica se o nível atual está falhando
                const isAFailure = !item.isPassing && item.level === level;

                const bgColor = isActive
                  ? isAFailure
                    ? "#F44336"
                    : "#4CAF50"
                  : "rgba(255, 255, 255, 0.1)";

                return (
                  <div
                    key={level}
                    style={{
                      minWidth: "32px",
                      padding: "4px 8px",
                      borderRadius: "12px",
                      backgroundColor: isActive
                        ? bgColor
                        : "rgba(255, 255, 255, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontWeight: "bold",
                      fontSize: "11px",
                      opacity: showLevel ? 1 : 0.4,
                      height: "24px",
                      boxSizing: "border-box"
                    }}
                  >
                    {level}
                  </div>
                );
              })}
            </div>

            <div
              style={{
                fontSize: "12px",
                color: "rgba(255, 255, 255, 0.7)",
                lineHeight: "1.1",
                marginTop: "4px"
              }}
            >
              Mínimo: {item.required}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Renderiza a interface de verificação manual
  const renderManualCheck = () => {
    const getContrastClass = () => {
      if (manualCheck.contrastRatio < 3) return "very-poor";
      if (manualCheck.contrastRatio < 4.5) return "poor";
      if (manualCheck.contrastRatio < 7) return "good";
      return "very-good";
    };

    // Função de texto de contraste removida

    // Função removida pois não é mais necessária com a substituição das estrelas por AAA

    const bgColor =
      manualCheck.contrastRatio >= 4.5
        ? "#E8F5E9"
        : manualCheck.contrastRatio >= 3
        ? "#FFF9C4"
        : "#FFEBEE";

    return (
      <div style={{ marginTop: "16px" }}>
        <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
          <div style={{ flex: 1 }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "regular",
                color: "white",
                fontSize: "12px"
              }}
            >
              Primeiro plano
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                value={manualCheck.foregroundColor}
                onChange={e =>
                  updateManualCheck({ foregroundColor: e.target.value })
                }
                style={{
                  padding: "8px 36px 8px 12px",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "4px",
                  width: "100%",
                  boxSizing: "border-box",
                  backgroundColor: "rgba(0, 0, 0, 0.2)",
                  color: "white",
                  height: "36px"
                }}
              />
              <div
                title="Escolher cor"
                style={{
                  position: "absolute",
                  right: "8px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: "20px",
                  height: "20px",
                  backgroundColor: manualCheck.foregroundColor,
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  borderRadius: "4px",
                  cursor: "pointer",
                  overflow: "hidden"
                }}
              >
                <input
                  type="color"
                  value={manualCheck.foregroundColor}
                  onChange={e =>
                    updateManualCheck({ foregroundColor: e.target.value })
                  }
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    opacity: 0,
                    cursor: "pointer",
                    borderRadius: "16px"
                  }}
                />
              </div>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "regular",
                color: "white",
                fontSize: "12px"
              }}
            >
              Fundo
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                value={manualCheck.backgroundColor}
                onChange={e =>
                  updateManualCheck({ backgroundColor: e.target.value })
                }
                style={{
                  padding: "8px 36px 8px 12px",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "4px",
                  width: "100%",
                  boxSizing: "border-box",
                  backgroundColor: "rgba(0, 0, 0, 0.2)",
                  color: "white",
                  height: "36px"
                }}
              />
              <div
                title="Escolher cor"
                style={{
                  position: "absolute",
                  right: "8px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: "20px",
                  height: "20px",
                  backgroundColor: manualCheck.backgroundColor,
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  borderRadius: "4px",
                  cursor: "pointer",
                  overflow: "hidden"
                }}
              >
                <input
                  type="color"
                  value={manualCheck.backgroundColor}
                  onChange={e =>
                    updateManualCheck({ backgroundColor: e.target.value })
                  }
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    opacity: 0,
                    cursor: "pointer",
                    borderRadius: "16px"
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: bgColor,
            borderRadius: "8px",
            padding: "20px 12px",
            marginBottom: "20px",
            marginTop: "20px",
            textAlign: "center",
            height: "120px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <div
            style={{
              fontSize: "48px",
              fontWeight: "bold",
              color: manualCheck.foregroundColor,
              lineHeight: 1,
              textShadow: "0 1px 2px rgba(0,0,0,0.1)"
            }}
          >
            {manualCheck.contrastRatio.toFixed(2)}
          </div>
        </div>
        {/* Exibe os níveis de conformidade */}
        {renderComplianceLevels()}
      </div>
    );
  };

  // Renderiza os resultados da análise automática
  const renderAutoResults = () => {
    if (isLoading) {
      return (
        <div style={{ textAlign: "center", padding: "20px" }}>
          <div style={{ marginBottom: "16px" }}>Analisando contraste...</div>
          <div
            style={{
              width: "40px",
              height: "40px",
              border: "4px solid rgba(0,0,0,0.1)",
              borderTopColor: "var(--figma-color-bg-brand)",
              borderRadius: "50%",
              margin: "0 auto",
              animation: "spin 1s linear infinite"
            }}
          />
        </div>
      );
    }

    if (error) {
      return <div style={{ color: "#F44336", padding: "20px" }}>{error}</div>;
    }

    if (results.length === 0) {
      return (
        <div style={{ padding: "20px", textAlign: "center" }}>
          Nenhum elemento para análise de contraste.
        </div>
      );
    }

    return (
      <div style={{ overflowY: "auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "16px",
            backgroundColor: "var(--figma-color-bg-secondary)",
            padding: "16px",
            borderRadius: "4px"
          }}
        >
          <div>
            <div style={{ fontSize: "14px", marginBottom: "4px" }}>Total</div>
            <div style={{ fontSize: "24px", fontWeight: "bold" }}>
              {totalResults}
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: "14px",
                marginBottom: "4px",
                color: "#4CAF50"
              }}
            >
              Aprovados
            </div>
            <div
              style={{ fontSize: "24px", fontWeight: "bold", color: "#4CAF50" }}
            >
              {passingResults}
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: "14px",
                marginBottom: "4px",
                color: "#F44336"
              }}
            >
              Erros
            </div>
            <div
              style={{ fontSize: "24px", fontWeight: "bold", color: "#F44336" }}
            >
              {errorResults}
            </div>
          </div>
        </div>

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginBottom: "16px"
          }}
        >
          <thead>
            <tr style={{ borderBottom: "1px solid var(--figma-color-border)" }}>
              <th
                style={{
                  textAlign: "left",
                  padding: "8px",
                  fontWeight: "bold"
                }}
              >
                Elemento
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: "8px",
                  fontWeight: "bold"
                }}
              >
                Texto
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: "8px",
                  fontWeight: "bold"
                }}
              >
                Cores
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: "8px",
                  fontWeight: "bold"
                }}
              >
                Contraste
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: "8px",
                  fontWeight: "bold"
                }}
              >
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {results.map(result => (
              <tr
                key={result.id}
                style={{
                  borderBottom: "1px solid var(--figma-color-border-secondary)",
                  backgroundColor: result.hasIssues
                    ? "rgba(244, 67, 54, 0.1)"
                    : "rgba(76, 175, 80, 0.05)"
                }}
              >
                <td style={{ padding: "12px 8px" }}>
                  <strong>{result.nodeName}</strong>
                </td>
                <td style={{ padding: "12px 8px" }}>
                  {result.text ? `"${result.text}"` : "-"}
                </td>
                <td style={{ padding: "12px 8px" }}>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px"
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                      }}
                    >
                      <div style={colorCircleStyle(result.textColor)} />
                      <span>{result.textColor}</span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                      }}
                    >
                      <div style={colorCircleStyle(result.bgColor)} />
                      <span>{result.bgColor}</span>
                    </div>
                  </div>
                </td>
                <td style={{ padding: "12px 8px", fontWeight: "bold" }}>
                  {formatContrast(result.contrastRatio)}
                </td>
                <td style={{ padding: "12px 8px" }}>
                  <div style={statusIndicatorStyle(!result.hasIssues)}>
                    {getContrastStatusText(result)}
                  </div>
                  {result.hasIssues && (
                    <div
                      style={{
                        color: "#F44336",
                        marginTop: "4px",
                        fontSize: "12px"
                      }}
                    >
                      {result.issues.map((issue, index) => (
                        <div key={index}>{issue}</div>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        boxSizing: "border-box",
        overflow: "hidden",
        color: "var(--figma-color-text)",
        backgroundColor: "var(--figma-color-bg)"
      }}
    >
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "0 8px 16px 0",
          marginRight: "-8px"
        }}
      >
        <h2
          style={{
            marginTop: 0,
            marginBottom: "16px",
            color: "white",
            fontWeight: "normal"
          }}
        >
          Análise de Contraste
        </h2>
        {renderManualCheck()}
        {renderWcagReferenceTable()}
      </div>

      <footer
        style={{
          padding: "0px",
          height: "8px",
          background: "#2A2A2A",
          borderTop: "1px solid rgba(255, 255, 255, 0.1)",
          display: "block",
          width: "100%",
          position: "absolute",
          bottom: 0,
          left: 0
        }}
      />
    </div>
  );
};

export default ContrastChecker;
