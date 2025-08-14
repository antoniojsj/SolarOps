import React, { useEffect, useState } from "react";

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

  const toHex = (c: number) => {
    const hex = c.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}${
    a < 255 ? toHex(a) : ""
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
  node: any,
  defaultColor = { r: 1, g: 1, b: 1 },
  depth = 0,
  isRoot = false
): { color: { r: number; g: number; b: number }; opacity: number } => {
  // Limitar a profundidade da recursão para evitar loops infinitos
  if (!node || depth > 10) return { color: defaultColor, opacity: 1 };

  // Se for o nó raiz (frame selecionado), tenta pegar a cor de fundo dele primeiro
  if (isRoot) {
    const rootBg = getNodeBackground(node);
    if (rootBg) return rootBg;
  }

  // Verifica se o nó tem preenchimento visível
  if (node.fills && Array.isArray(node.fills)) {
    // Encontra o primeiro preenchimento visível (não transparente)
    const fill = node.fills.find((f: any) => {
      if (!f.visible) return false;
      // Se for cor sólida
      if (f.color) return f.color.a > 0;
      // Se for gradiente, verifica se tem cores visíveis
      if (f.gradientStops && f.gradientStops.length > 0) {
        return f.gradientStops.some(
          (stop: any) => stop.color && stop.color.a > 0
        );
      }
      return false;
    });

    if (fill) {
      // Se for gradiente, pega a cor mais escura
      if (fill.gradientStops && fill.gradientStops.length > 0) {
        const sortedStops = [...fill.gradientStops].sort((a, b) => {
          const luminanceA =
            (a.color.r * 299 + a.color.g * 587 + a.color.b * 114) / 1000;
          const luminanceB =
            (b.color.r * 299 + b.color.g * 587 + b.color.b * 114) / 1000;
          return luminanceA - luminanceB; // Ordena do mais escuro para o mais claro
        });
        return {
          color: sortedStops[0].color,
          opacity:
            fill.opacity !== undefined
              ? fill.opacity * (sortedStops[0].color.a || 1)
              : sortedStops[0].color.a || 1
        };
      }

      // Se for cor sólida
      if (fill.color) {
        return {
          color: fill.color,
          opacity:
            fill.opacity !== undefined
              ? fill.opacity * (fill.color.a !== undefined ? fill.color.a : 1)
              : 1
        };
      }
    }
  }

  // Se não encontrar, verifica o nó pai, mas não é mais o root
  return findBackgroundColor(node.parent, defaultColor, depth + 1, false);
};

// Função auxiliar para extrair cor de fundo de um nó
const getNodeBackground = (node: any) => {
  if (!node || !node.fills || !Array.isArray(node.fills)) return null;

  // Encontra o primeiro preenchimento visível (não transparente)
  const fill = node.fills.find((f: any) => {
    if (!f.visible) return false;
    // Se for cor sólida
    if (f.color) return f.color.a > 0;
    // Se for gradiente, verifica se tem cores visíveis
    if (f.gradientStops && f.gradientStops.length > 0) {
      return f.gradientStops.some(
        (stop: any) => stop.color && stop.color.a > 0
      );
    }
    return false;
  });

  if (!fill) return null;

  // Se for gradiente, pega a cor mais escura
  if (fill.gradientStops && fill.gradientStops.length > 0) {
    const sortedStops = [...fill.gradientStops].sort((a, b) => {
      const luminanceA =
        (a.color.r * 299 + a.color.g * 587 + a.color.b * 114) / 1000;
      const luminanceB =
        (b.color.r * 299 + b.color.g * 587 + b.color.b * 114) / 1000;
      return luminanceA - luminanceB; // Ordena do mais escuro para o mais claro
    });
    return {
      color: sortedStops[0].color,
      opacity:
        fill.opacity !== undefined
          ? fill.opacity * (sortedStops[0].color.a || 1)
          : sortedStops[0].color.a || 1
    };
  }

  // Se for cor sólida
  if (fill.color) {
    return {
      color: fill.color,
      opacity:
        fill.opacity !== undefined
          ? fill.opacity * (fill.color.a !== undefined ? fill.color.a : 1)
          : 1
    };
  }

  return null;
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

        // Função para extrair cor de preenchimento com suporte a gradientes e imagens
        const extractFillColor = (fills: any[]) => {
          if (!Array.isArray(fills) || fills.length === 0) {
            return null;
          }

          // Pega o primeiro preenchimento visível
          const fill = fills.find(
            f => f.visible && (f.color || f.gradientStops)
          );
          if (!fill) return null;

          // Se for gradiente, pega a cor mais escura
          if (fill.gradientStops && fill.gradientStops.length > 0) {
            const sortedStops = [...fill.gradientStops].sort((a, b) => {
              const luminanceA =
                (a.color.r * 299 + a.color.g * 587 + a.color.b * 114) / 1000;
              const luminanceB =
                (b.color.r * 299 + b.color.g * 587 + b.color.b * 114) / 1000;
              return luminanceA - luminanceB; // Ordena do mais escuro para o mais claro
            });
            return {
              ...sortedStops[0].color,
              a:
                fill.opacity !== undefined
                  ? fill.opacity
                  : sortedStops[0].color.a || 1
            };
          }

          // Se for cor sólida
          if (fill.color) {
            return {
              r: fill.color.r,
              g: fill.color.g,
              b: fill.color.b,
              a:
                fill.opacity !== undefined
                  ? fill.opacity
                  : fill.color.a !== undefined
                  ? fill.color.a
                  : 1
            };
          }

          return null;
        };

        // Função para converter cor do Figma (0-1) para 0-255
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

        // Função para converter cor para hex
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

        // Função para verificar contraste seguindo WCAG 2.1
        const checkContrast = (
          fgColor: any,
          bgColor: any,
          fontSize: number,
          fontWeight: number | string
        ) => {
          if (!fgColor || !bgColor) {
            return { ratio: 0, aa: false, aaa: false, aaLarge: false };
          }

          // Converter cores para RGB 0-255
          const fg = toRGB(fgColor);
          const bg = toRGB(bgColor);

          // Aplicar opacidade se necessário
          if (fg.a < 1) {
            // Misturar com a cor de fundo
            const mix = (c1: number, c2: number, a: number) =>
              Math.round(c1 * a + c2 * (1 - a));
            fg.r = mix(fg.r, bg.r, fg.a);
            fg.g = mix(fg.g, bg.g, fg.a);
            fg.b = mix(fg.b, bg.b, fg.a);
          }

          // Calcular luminância relativa (WCAG 2.1)
          const getLuminance = (r: number, g: number, b: number) => {
            const a = [r, g, b].map(v => {
              v /= 255;
              return v <= 0.03928
                ? v / 12.92
                : Math.pow((v + 0.055) / 1.055, 2.4);
            });
            return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
          };

          const l1 = getLuminance(fg.r, fg.g, fg.b) + 0.05;
          const l2 = getLuminance(bg.r, bg.g, bg.b) + 0.05;
          const ratio = l1 > l2 ? l1 / l2 : l2 / l1;

          const isLarge = isLargeText(fontSize, fontWeight);

          return {
            ratio: parseFloat(ratio.toFixed(2)),
            aa: ratio >= 4.5 || (isLarge && ratio >= 3),
            aaa: ratio >= 7 || (isLarge && ratio >= 4.5),
            aaLarge: isLarge
          };
        };

        // Usando a função findBackgroundColor original, que já está definida no escopo do módulo

        // Função para processar nós filhos recursivamente
        const processChildNodes = (
          node: any,
          results: ContrastResult[] = []
        ) => {
          if (!node || !node.visible) return results;

          // Processar nós de texto
          if (
            node.type === "TEXT" &&
            node.characters &&
            node.characters.trim() !== ""
          ) {
            const textColor = extractFillColor(node.fills || []);
            // Ao verificar o fundo do texto, não é o nó raiz
            const bgColor = findBackgroundColor(
              node.parent,
              { r: 1, g: 1, b: 1 },
              0,
              false
            );

            if (textColor) {
              const contrast = checkContrast(
                textColor,
                bgColor.color,
                node.fontSize || 16,
                node.fontWeight || 400
              );

              const textRGB = toRGB(textColor);
              const bgRGB = toRGB(bgColor.color);

              const result: ContrastResult = {
                id: node.id,
                nodeName: node.name || "Texto",
                nodeType: "TEXT",
                text: node.characters,
                textColor: rgbToHex(textRGB.r, textRGB.g, textRGB.b),
                bgColor: rgbToHex(bgRGB.r, bgRGB.g, bgRGB.b),
                contrastRatio: contrast.ratio,
                aa: contrast.aa,
                aaa: contrast.aaa,
                aaLarge: contrast.aaLarge,
                hasIssues: !contrast.aa,
                issues: !contrast.aa
                  ? [
                      `Contraste insuficiente ${contrast.ratio}:1 (mínimo ${
                        contrast.aaLarge ? "3:1 para texto grande" : "4.5:1"
                      })`
                    ]
                  : [],
                fontSize: node.fontSize || 16,
                fontWeight: node.fontWeight || 400,
                textOpacity: textColor.a || 1,
                bgOpacity: bgColor.opacity || 1
              };

              results.push(result);
            }
          }
          // Processar elementos gráficos
          else if (
            [
              "RECTANGLE",
              "ELLIPSE",
              "POLYGON",
              "STAR",
              "VECTOR",
              "LINE",
              "SHAPE_WITH_TEXT"
            ].includes(node.type)
          ) {
            const elementFill = extractFillColor(node.fills || []);

            if (elementFill && elementFill.a > 0) {
              // Ao verificar o fundo de elementos gráficos, não é o nó raiz
              const parentBg = findBackgroundColor(
                node.parent,
                { r: 1, g: 1, b: 1 },
                0,
                false
              );
              const contrast = checkContrast(
                elementFill,
                parentBg.color,
                16, // Tamanho padrão para elementos não-texto
                400 // Peso padrão
              );

              // Para elementos gráficos, verificar contraste mínimo de 3:1
              if (contrast.ratio < 3) {
                const elementRGB = toRGB(elementFill);
                const bgRGB = toRGB(parentBg.color);

                const result: ContrastResult = {
                  id: node.id,
                  nodeName: node.name || "Elemento Gráfico",
                  nodeType: "GRAPHIC",
                  text: "",
                  textColor: rgbToHex(elementRGB.r, elementRGB.g, elementRGB.b),
                  bgColor: rgbToHex(bgRGB.r, bgRGB.g, bgRGB.b),
                  contrastRatio: contrast.ratio,
                  aa: contrast.ratio >= 3,
                  aaa: contrast.ratio >= 4.5,
                  aaLarge: false,
                  hasIssues: contrast.ratio < 3,
                  issues:
                    contrast.ratio < 3
                      ? [
                          `Contraste insuficiente ${contrast.ratio}:1 (mínimo 3:1 para elementos gráficos)`
                        ]
                      : [],
                  fontSize: 0,
                  fontWeight: 400,
                  textOpacity: elementFill.a || 1,
                  bgOpacity: parentBg.opacity || 1
                };

                results.push(result);
              }
            }
          }

          // Processar filhos recursivamente
          if (node.children) {
            node.children.forEach((child: any) =>
              processChildNodes(child, results)
            );
          }

          return results;
        };

        // Processar o nó selecionado e seus filhos
        // Primeiro, verifica a cor de fundo do frame selecionado (nó raiz)
        const frameBgColor = findBackgroundColor(
          selectedNode,
          { r: 1, g: 1, b: 1 },
          0,
          true
        );

        // Processa os filhos do nó selecionado
        const analysisResults = await processChildNodes(selectedNode);

        // Ordenar por problemas (os com problemas primeiro) e depois por razão de contraste
        analysisResults.sort((a, b) => {
          if (a.hasIssues && !b.hasIssues) return -1;
          if (!a.hasIssues && b.hasIssues) return 1;
          return a.contrastRatio - b.contrastRatio; // Menor contraste primeiro
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

  // Helper functions for contrast checking
  const formatContrast = (ratio: number): string => {
    return ratio.toFixed(1) + ":1";
  };

  const getContrastStatusColor = (result: ContrastResult): string => {
    if (result.aaa) return "#4CAF50"; // Verde para AAA
    if (result.aa) return "#8BC34A"; // Verde claro para AA
    if (result.aaLarge) return "#FFC107"; // Amarelo para AA (texto grande)
    return "#F44336"; // Vermelho para falha
  };

  const getContrastStatusText = (result: ContrastResult): string => {
    if (result.aaa) return "AAA";
    if (result.aa) return "AA";
    if (result.aaLarge) return "AA (texto grande)";
    return "Falha";
  };

  // Calculate overall score
  const totalResults = results.length;
  const passingResults = results.filter(r => r.aa).length;
  const errorResults = results.filter(r => r.hasIssues).length;

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
        backgroundColor: "var(--figma-color-bg)"
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px"
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            color: "#18A0FB",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            cursor: "pointer",
            padding: "4px 8px",
            borderRadius: "4px",
            fontSize: "14px"
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z"
              fill="currentColor"
            />
          </svg>
          Voltar
        </button>

        {totalResults > 0 && (
          <div
            style={{
              background:
                errorResults > 0
                  ? "rgba(255, 100, 100, 0.1)"
                  : "rgba(76, 175, 80, 0.1)",
              color: errorResults > 0 ? "#FF6464" : "#4CAF50",
              padding: "4px 12px",
              borderRadius: "12px",
              fontSize: "12px",
              fontWeight: 500
            }}
          >
            {errorResults > 0
              ? `${errorResults} ${
                  errorResults === 1 ? "problema" : "problemas"
                } encontrados`
              : "Tudo em ordem!"}
          </div>
        )}
      </div>

      {isLoading ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px 0",
            color: "rgba(255, 255, 255, 0.7)"
          }}
        >
          <div
            className="spinner"
            style={{
              width: "40px",
              height: "40px",
              border: "3px solid rgba(255, 255, 255, 0.1)",
              borderTop: "3px solid #18A0FB",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              marginBottom: "16px"
            }}
          />
          <p>Analisando contraste do frame...</p>
        </div>
      ) : error ? (
        <div
          style={{
            padding: "24px",
            background: "rgba(255, 100, 100, 0.1)",
            borderRadius: "4px",
            borderLeft: "4px solid #FF6464",
            color: "#FF6464",
            marginTop: "16px"
          }}
        >
          <h3
            style={{
              margin: "0 0 8px 0",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z"
                fill="currentColor"
              />
            </svg>
            Erro ao verificar contraste
          </h3>
          <p style={{ margin: 0, fontSize: "13px" }}>{error}</p>
        </div>
      ) : totalResults === 0 ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px 0",
            color: "rgba(255, 255, 255, 0.5)",
            textAlign: "center"
          }}
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z"
              fill="currentColor"
            />
            <path d="M13 7H11V13H13V7Z" fill="currentColor" />
            <path d="M13 15H11V17H13V15Z" fill="currentColor" />
          </svg>
          <p style={{ margin: "16px 0 0 0" }}>
            Nenhum texto encontrado no frame selecionado.
          </p>
        </div>
      ) : (
        <>
          <div
            style={{
              marginBottom: "16px",
              padding: "12px",
              borderRadius: "4px",
              border: `1px solid ${
                errorResults === 0
                  ? "var(--figma-color-border-success)"
                  : "var(--figma-color-border-danger)"
              }`
            }}
          >
            <h3
              style={{
                margin: "0 0 8px 0",
                color: "var(--figma-color-text)",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              {errorResults === 0 ? (
                <>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z"
                      fill="#4CAF50"
                    />
                  </svg>
                  Tudo em ordem com o contraste!
                </>
              ) : (
                <>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z"
                      fill="currentColor"
                    />
                  </svg>
                  {errorResults} {errorResults === 1 ? "problema" : "problemas"}{" "}
                  de contraste encontrados
                </>
              )}
            </h3>
          </div>

          {/* WCAG Compliance Table */}
          <div
            style={{
              marginBottom: "24px",
              overflowX: "auto",
              borderRadius: "4px",
              border: "1px solid var(--figma-color-border)"
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "separate",
                borderSpacing: 0,
                fontSize: "13px",
                border: "1px solid #444",
                borderRadius: "4px",
                overflow: "hidden"
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: "var(--figma-color-bg-hover)"
                  }}
                >
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "left",
                      fontWeight: 700,
                      border: "1px solid #444",
                      borderBottom: "1px solid #444",
                      borderTop: "none",
                      borderLeft: "none",
                      color: "#FFFFFF"
                    }}
                  >
                    Level
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      fontWeight: 700,
                      border: "1px solid #444",
                      borderBottom: "1px solid #444",
                      borderTop: "none",
                      borderLeft: "none",
                      color: "#FFFFFF"
                    }}
                  >
                    AA
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      fontWeight: 700,
                      border: "1px solid #444",
                      borderBottom: "1px solid #444",
                      borderTop: "none",
                      borderLeft: "none",
                      color: "#FFFFFF"
                    }}
                  >
                    AAA
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td
                    style={{
                      padding: "12px",
                      border: "1px solid #444",
                      borderTop: "none",
                      borderLeft: "none",
                      fontWeight: 500,
                      color: "#FFFFFF"
                    }}
                  >
                    Small Text
                  </td>
                  <td
                    style={{
                      padding: "12px",
                      textAlign: "center",
                      border: "1px solid #444",
                      borderTop: "none",
                      borderLeft: "none",
                      color: "#FFFFFF"
                    }}
                  >
                    4.5:1
                  </td>
                  <td
                    style={{
                      padding: "12px",
                      textAlign: "center",
                      border: "1px solid #444",
                      borderTop: "none",
                      borderLeft: "none",
                      color: "#FFFFFF"
                    }}
                  >
                    7:1
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      padding: "12px",
                      border: "1px solid #444",
                      borderTop: "none",
                      borderLeft: "none",
                      fontWeight: 500,
                      color: "#FFFFFF"
                    }}
                  >
                    Large Text
                  </td>
                  <td
                    style={{
                      padding: "12px",
                      textAlign: "center",
                      border: "1px solid #444",
                      borderTop: "none",
                      borderLeft: "none",
                      color: "#FFFFFF"
                    }}
                  >
                    3:1
                  </td>
                  <td
                    style={{
                      padding: "12px",
                      textAlign: "center",
                      border: "1px solid #444",
                      borderTop: "none",
                      borderLeft: "none",
                      color: "#FFFFFF"
                    }}
                  >
                    4.5:1
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      padding: "12px",
                      border: "1px solid #444",
                      borderTop: "none",
                      borderLeft: "none",
                      fontWeight: 500,
                      color: "#FFFFFF"
                    }}
                  >
                    UI Components
                  </td>
                  <td
                    style={{
                      padding: "12px",
                      textAlign: "center",
                      border: "1px solid #444",
                      borderTop: "none",
                      borderLeft: "none",
                      color: "#FFFFFF"
                    }}
                  >
                    3:1
                  </td>
                  <td
                    style={{
                      padding: "12px",
                      textAlign: "center",
                      border: "1px solid #444",
                      borderTop: "none",
                      borderLeft: "none",
                      color: "#FFFFFF"
                    }}
                  >
                    -
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              maxHeight: "calc(100vh - 500px)"
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "13px",
                color: "var(--figma-color-text)"
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                    textAlign: "left",
                    position: "sticky",
                    top: 0,
                    background: "var(--figma-color-bg)",
                    zIndex: 1
                  }}
                >
                  <th
                    style={{
                      padding: "12px 0",
                      fontWeight: 500,
                      textAlign: "left"
                    }}
                  >
                    Elemento
                  </th>
                  <th
                    style={{
                      padding: "12px 0",
                      fontWeight: 500,
                      textAlign: "right"
                    }}
                  >
                    Contraste
                  </th>
                  <th
                    style={{
                      padding: "12px 0",
                      fontWeight: 500,
                      textAlign: "right"
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
                      borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                      height: "56px",
                      verticalAlign: "middle",
                      background: result.hasIssues
                        ? "rgba(255, 100, 100, 0.05)"
                        : "transparent"
                    }}
                  >
                    <td style={{ padding: "8px 0" }}>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "4px"
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px"
                          }}
                        >
                          <div
                            style={{
                              width: "16px",
                              height: "16px",
                              borderRadius: "2px",
                              background: result.textColor || "transparent",
                              border: "1px solid rgba(255, 255, 255, 0.2)",
                              flexShrink: 0,
                              position: "relative",
                              overflow: "hidden"
                            }}
                          >
                            {!result.textColor && (
                              <div
                                style={{
                                  position: "absolute",
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  bottom: 0,
                                  background:
                                    "repeating-conic-gradient(#ccc 0% 25%, #999 0% 50%) 0% 0% / 8px 8px",
                                  opacity: 0.5
                                }}
                              />
                            )}
                          </div>
                          <div
                            style={{
                              width: "16px",
                              height: "16px",
                              borderRadius: "2px",
                              background: result.bgColor || "transparent",
                              border: "1px solid rgba(255, 255, 255, 0.2)",
                              flexShrink: 0,
                              position: "relative",
                              overflow: "hidden"
                            }}
                          >
                            {!result.bgColor && (
                              <div
                                style={{
                                  position: "absolute",
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  bottom: 0,
                                  background:
                                    "repeating-conic-gradient(#ccc 0% 25%, #999 0% 50%) 0% 0% / 8px 8px",
                                  opacity: 0.5
                                }}
                              />
                            )}
                          </div>
                          <div
                            style={{
                              maxWidth: "200px",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              fontWeight: 500
                            }}
                          >
                            {result.nodeName}
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: "11px",
                            color: "#FFFFFF",
                            opacity: 0.8,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: "240px"
                          }}
                        >
                          {result.text}
                        </div>
                      </div>
                    </td>
                    <td
                      style={{
                        padding: "8px 0",
                        textAlign: "right",
                        fontFamily: '"Roboto Mono", monospace',
                        color: result.aa ? "#4CAF50" : "#FF6464",
                        fontWeight: 500,
                        whiteSpace: "nowrap",
                        minWidth: "80px",
                        paddingRight: "8px"
                      }}
                    >
                      {formatContrast(result.contrastRatio)}
                    </td>
                    <td
                      style={{
                        padding: "8px 0 8px 0",
                        textAlign: "right",
                        whiteSpace: "nowrap",
                        width: "120px",
                        paddingLeft: "8px"
                      }}
                    >
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "flex-end",
                          gap: "4px",
                          padding: "4px 8px",
                          borderRadius: "4px",
                          background: result.hasIssues
                            ? "rgba(255, 100, 100, 0.1)"
                            : "rgba(76, 175, 80, 0.1)",
                          color: result.hasIssues ? "#FF6464" : "#4CAF50",
                          fontSize: "12px",
                          fontWeight: 500,
                          border: `1px solid ${
                            result.hasIssues
                              ? "rgba(255, 100, 100, 0.2)"
                              : "rgba(76, 175, 80, 0.2)"
                          }`,
                          maxWidth: "100%",
                          overflow: "hidden",
                          textOverflow: "ellipsis"
                        }}
                      >
                        {getContrastStatusText(result)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            style={{
              padding: "16px 0",
              borderTop: "1px solid var(--figma-color-border)",
              marginTop: "16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "12px",
              color: "var(--figma-color-text-secondary)"
            }}
          >
            <div>
              {totalResults}{" "}
              {totalResults === 1
                ? "elemento verificado"
                : "elementos verificados"}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px"
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  color:
                    passingResults > 0
                      ? "var(--figma-color-text)"
                      : "var(--figma-color-text-disabled)"
                }}
              >
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#4CAF50",
                    opacity: passingResults > 0 ? 1 : 0.5
                  }}
                />
                {passingResults} aprovado{passingResults !== 1 ? "s" : ""}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  color:
                    errorResults > 0
                      ? "var(--figma-color-text)"
                      : "var(--figma-color-text-disabled)"
                }}
              >
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#FF6464",
                    opacity: errorResults > 0 ? 1 : 0.5
                  }}
                />
                {errorResults} com problema{errorResults !== 1 ? "s" : ""}
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: "16px",
              padding: "12px",
              background:
                errorResults > 0
                  ? "var(--figma-color-bg-danger-secondary)"
                  : "var(--figma-color-bg-success-secondary)",
              border: `1px solid ${
                errorResults > 0
                  ? "var(--figma-color-border-danger)"
                  : "var(--figma-color-border-success)"
              }`,
              borderRadius: "4px",
              fontSize: "12px",
              color: "var(--figma-color-text)"
            }}
          >
            <h4
              style={{
                margin: "0 0 8px 0",
                color:
                  errorResults > 0
                    ? "var(--figma-color-text-danger)"
                    : "var(--figma-color-text-success)",
                fontSize: "12px",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              {errorResults > 0 ? (
                <>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z"
                      fill="currentColor"
                    />
                  </svg>
                  Recomendações para melhorar a acessibilidade:
                </>
              ) : (
                <>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z"
                      fill="currentColor"
                    />
                  </svg>
                  Tudo certo com o contraste!
                </>
              )}
            </h4>
            {errorResults === 0 && (
              <p style={{ margin: "0" }}>
                Todos os elementos atendem aos requisitos de contraste do WCAG
                2.2.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ContrastChecker;
