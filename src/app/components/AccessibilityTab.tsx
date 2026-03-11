import React, { useState, useEffect } from "react";
import styled from "styled-components";
import ContrastChecker from "./ContrastChecker";
import WCAGContent from "./WCAGContent";

// Add CSS for scrollbar
const scrollbarStyles = `
  .scrollable-content {
    scrollbar-width: thin;
    scrollbar-color: #4A4A4A transparent;
  }
  
  .scrollable-content::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  .scrollable-content::-webkit-scrollbar-track {
    background: transparent;
    border-radius: 4px;
  }
  
  .scrollable-content::-webkit-scrollbar-thumb {
    background: #4A4A4A;
    border-radius: 4px;
  }
  
  .scrollable-content::-webkit-scrollbar-thumb:hover {
    background: #5E5E5E;
  }
`;

// Add the styles to the document
const styleElement = document.createElement("style");
styleElement.textContent = scrollbarStyles;
document.head.appendChild(styleElement);

interface AccessibilityTabProps {
  selectedNode: any;
}

interface ContrastResult {
  id: string;
  nodeName: string;
  text: string;
  textColor: string;
  bgColor: string;
  contrastRatio: number;
  aa: boolean;
  aaa: boolean;
  aaLarge: boolean;
  hasIssues: boolean;
  issues: string[];
}

const TabContent = styled.div`
  flex: 1;
  overflow: auto;
  padding: 0;
  background: transparent;
  color: #e0e0e0;
`;

const AccessibilityTab: React.FC<AccessibilityTabProps> = ({
  selectedNode
}) => {
  const [activeSubPage, setActiveSubPage] = useState<
    "main" | "contrate" | "documentacao"
  >("main");

  // Tabs dentro da subpágina de contraste
  const [activeContrastTab, setActiveContrastTab] = useState<"auto" | "manual">(
    "auto"
  );

  // Estados para análise automática
  const [autoAnalysisLoading, setAutoAnalysisLoading] = useState(false);
  const [autoAnalysisResults, setAutoAnalysisResults] = useState<
    ContrastResult[]
  >([]);
  const [autoAnalysisError, setAutoAnalysisError] = useState<string | null>(
    null
  );
  // Screenshot do frame analisado (como no plugin accessibility)
  const [contrastPreviewImageUrl, setContrastPreviewImageUrl] = useState<
    string | null
  >(null);
  const [contrastPreviewSize, setContrastPreviewSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [showContrastPreview, setShowContrastPreview] = useState(false);

  // Funções auxiliares para análise de contraste
  const rgbToHex = (color: { r: number; g: number; b: number }): string => {
    const toHex = (val: number) => {
      const hex = Math.round(val * 255).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };
    return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`.toUpperCase();
  };

  const getLuminance = (color: { r: number; g: number; b: number }): number => {
    const [r, g, b] = [color.r, color.g, color.b].map(v => {
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return r * 0.2126 + g * 0.7152 + b * 0.0722;
  };

  const getContrastRatio = (
    color1: { r: number; g: number; b: number },
    color2: { r: number; g: number; b: number }
  ): number => {
    const lum1 = getLuminance(color1);
    const lum2 = getLuminance(color2);
    const lighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);
    return (lighter + 0.05) / (darker + 0.05);
  };

  const extractFillColor = (
    fills: any[]
  ): { r: number; g: number; b: number } | null => {
    if (!fills || fills.length === 0) return null;
    const solidFill = fills.find(f => f.type === "SOLID");
    if (solidFill && solidFill.color) {
      return solidFill.color;
    }
    return null;
  };

  const isLargeText = (
    fontSize: number,
    fontWeight: number | string
  ): boolean => {
    const weight =
      typeof fontWeight === "string" ? parseInt(fontWeight) : fontWeight;
    return fontSize >= 18 || (weight >= 700 && fontSize >= 14);
  };

  const performAutoAnalysis = async () => {
    setAutoAnalysisLoading(true);
    setAutoAnalysisError(null);
    setAutoAnalysisResults([]);
    if (contrastPreviewImageUrl) {
      URL.revokeObjectURL(contrastPreviewImageUrl);
      setContrastPreviewImageUrl(null);
    }
    setContrastPreviewSize(null);
    setShowContrastPreview(false);

    try {
      // Enviar mensagem para analisar contraste usando o mesmo formato do plugin accessibility
      parent.postMessage(
        {
          pluginMessage: {
            type: "color-contrast-scan",
            page: {
              id: "current-page"
            }
          }
        },
        "*"
      );
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Erro ao analisar contraste";
      setAutoAnalysisError(errorMsg);
      setAutoAnalysisLoading(false);
    }
  };

  // Ouvir mensagem com resultados de análise automática
  useEffect(() => {
    const handleAnalysisResults = (event: MessageEvent) => {
      try {
        // Acessar dados corretamente do plugin Figma
        const pluginMessage = event.data?.pluginMessage || event.data || {};

        if (pluginMessage.type === "color-contrast-result") {
          console.log(
            "[AccessibilityTab] Recebido color-contrast-result:",
            pluginMessage
          );

          const result = pluginMessage.data?.result ?? pluginMessage.result;
          const errorMsg = pluginMessage.data?.error ?? pluginMessage.error;

          if (!result || !result.textNodeInfos) {
            console.warn(
              "[AccessibilityTab] Estrutura de resultado inválida:",
              result,
              errorMsg
            );
            setAutoAnalysisError(
              errorMsg && typeof errorMsg === "string"
                ? errorMsg
                : "Nenhum texto encontrado para análise. Selecione um frame com texto."
            );
            setAutoAnalysisResults([]);
            setAutoAnalysisLoading(false);
            return;
          }

          // Função auxiliar para converter cores 0-1 para HEX
          const colorToHex = (color: {
            r: number;
            g: number;
            b: number;
          }): string => {
            const toHexComponent = (v: number) => {
              const val = Math.round(Math.max(0, Math.min(1, v)) * 255);
              return Math.round(val)
                .toString(16)
                .padStart(2, "0");
            };
            return `#${toHexComponent(color.r)}${toHexComponent(
              color.g
            )}${toHexComponent(color.b)}`.toUpperCase();
          };

          // Função auxiliar para calcular luminância WCAG
          const getLuminance = (color: {
            r: number;
            g: number;
            b: number;
          }): number => {
            const normalize = (v: number) =>
              Math.max(0, Math.min(1, v <= 1 ? v : v / 255));
            const [r, g, b] = [color.r, color.g, color.b].map(normalize);

            let R, G, B;
            if (r <= 0.03928) R = r / 12.92;
            else R = ((r + 0.055) / 1.055) ** 2.4;

            if (g <= 0.03928) G = g / 12.92;
            else G = ((g + 0.055) / 1.055) ** 2.4;

            if (b <= 0.03928) B = b / 12.92;
            else B = ((b + 0.055) / 1.055) ** 2.4;

            return 0.2126 * R + 0.7152 * G + 0.0722 * B;
          };

          // Função auxiliar para calcular razão de contraste
          const getContrastRatio = (
            color1: { r: number; g: number; b: number },
            color2: { r: number; g: number; b: number }
          ): number => {
            const lum1 = getLuminance(color1);
            const lum2 = getLuminance(color2);
            const lighter = Math.max(lum1, lum2);
            const darker = Math.min(lum1, lum2);
            return (lighter + 0.05) / (darker + 0.05);
          };

          // Processar resultados
          const processedResults = result.textNodeInfos
            .map((textInfo: any, index: number) => {
              try {
                if (
                  !textInfo.textStyleSamples ||
                  textInfo.textStyleSamples.length === 0
                ) {
                  return null;
                }

                const sample = textInfo.textStyleSamples[0];
                if (!sample || !sample.color) {
                  return null;
                }

                // Cores vêm em formato 0-1 do Figma; usar pageBgColorRgb (objeto) enviado pelo plugin
                const textColor = sample.color;
                const bgColor =
                  result.pageBgColorRgb &&
                  typeof result.pageBgColorRgb === "object"
                    ? result.pageBgColorRgb
                    : { r: 1, g: 1, b: 1 };

                // Converter para HEX para exibição
                const textColorHex = colorToHex(textColor);
                const bgColorHex = colorToHex(bgColor);

                // Calcular contraste com cores 0-1
                const contrastRatio = getContrastRatio(textColor, bgColor);

                // Determinar se é texto grande
                const pointSize = (sample.textSize || 16) / 1.333333; // px -> pt
                const isLarge =
                  pointSize >= 18 || (sample.isBold && pointSize >= 14);

                // Avaliar conformidade
                const aa = contrastRatio >= (isLarge ? 3 : 4.5);
                const aaa = contrastRatio >= (isLarge ? 4.5 : 7);
                const aaLarge = contrastRatio >= 3;

                return {
                  id: textInfo.nodeId || `node-${index}`,
                  nodeName: textInfo.name || `Texto ${index + 1}`,
                  nodeType: "TEXT",
                  text: (textInfo.value || "").substring(0, 100),
                  textColor: textColorHex,
                  bgColor: bgColorHex,
                  contrastRatio: Math.round(contrastRatio * 100) / 100,
                  aa,
                  aaa,
                  aaLarge,
                  hasIssues: !aa,
                  issues: !aa
                    ? [
                        `Contraste ${Math.round(contrastRatio * 100) /
                          100}:1 (mínimo ${
                          isLarge ? "3:1 para texto grande" : "4.5:1"
                        })`
                      ]
                    : [],
                  fontSize: sample.textSize || 16,
                  fontWeight: sample.isBold ? 700 : 400,
                  textOpacity: sample.color.a || 1,
                  bgOpacity: bgColor.a || 1
                };
              } catch (err) {
                console.warn(
                  `[AccessibilityTab] Erro ao processar texto ${index}:`,
                  err
                );
                return null;
              }
            })
            .filter((r: any) => r !== null);

          console.log("[AccessibilityTab] Resultados processados:", {
            total: processedResults.length,
            issues: processedResults.filter((r: any) => r.hasIssues).length
          });

          setAutoAnalysisResults(processedResults);

          // Screenshot do frame (como no plugin accessibility): criar URL a partir dos bytes da imagem
          if (contrastPreviewImageUrl) {
            URL.revokeObjectURL(contrastPreviewImageUrl);
          }
          const imageBytes = result.imageWithTextLayers;
          if (
            imageBytes &&
            (imageBytes instanceof Uint8Array ||
              ArrayBuffer.isView(imageBytes) ||
              imageBytes instanceof ArrayBuffer)
          ) {
            const blob = new Blob([imageBytes], { type: "image/png" });
            const url = URL.createObjectURL(blob);
            setContrastPreviewImageUrl(url);
            const w = Number(result.width) || 0;
            const h = Number(result.height) || 0;
            setContrastPreviewSize(w && h ? { width: w, height: h } : null);
          } else {
            setContrastPreviewImageUrl(null);
            setContrastPreviewSize(null);
          }

          if (processedResults.length === 0) {
            setAutoAnalysisError(
              "Nenhum texto encontrado para análise de contraste"
            );
          }
        }
      } catch (err) {
        console.error("[AccessibilityTab] Erro ao processar resultados:", err);
        setAutoAnalysisError(
          `Erro ao processar resultados: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      } finally {
        setAutoAnalysisLoading(false);
      }
    };

    window.addEventListener("message", handleAnalysisResults);

    // Timeout para caso não haja resposta
    const timeout = setTimeout(() => {
      if (autoAnalysisLoading) {
        console.warn("[AccessibilityTab] Timeout na análise de contraste");
        setAutoAnalysisError(
          "Timeout ao analisar contraste. Verifique se há elementos de texto selecionados."
        );
        setAutoAnalysisLoading(false);
      }
    }, 8000);

    return () => {
      window.removeEventListener("message", handleAnalysisResults);
      clearTimeout(timeout);
    };
  }, [autoAnalysisLoading]);

  // Revogar URL da screenshot ao desmontar ou ao limpar
  useEffect(() => {
    return () => {
      if (contrastPreviewImageUrl) {
        URL.revokeObjectURL(contrastPreviewImageUrl);
      }
    };
  }, [contrastPreviewImageUrl]);

  // Função para mudar de subpágina e comunicar com App.tsx
  const changeSubPage = (page: "main" | "contrate" | "documentacao") => {
    console.log("[AccessibilityTab] Mudando para subpágina:", page);
    setActiveSubPage(page);

    // Quando entramos na subpágina Contrate, resetamos para a aba Auto
    if (page === "contrate") {
      setActiveContrastTab("auto");
    }

    // Comunicar com App.tsx via window (não parent)
    const isSubPage = page !== "main";
    const title =
      page === "contrate"
        ? "Contrate"
        : page === "documentacao"
        ? "Documentação"
        : "";

    // Enviar mensagem diretamente para a janela atual
    window.postMessage(
      {
        type: "accessibility-subpage-changed",
        payload: { isSubPage, title }
      },
      "*"
    );

    console.log("[AccessibilityTab] Mensagem enviada para UI:", {
      isSubPage,
      title
    });
  };

  useEffect(() => {
    const handleDirectMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "accessibility-back-to-main") {
        console.log(
          "[AccessibilityTab] Recebido comando para voltar à página principal"
        );
        setActiveSubPage("main");
      }
    };

    window.addEventListener("message", handleDirectMessage);

    return () => {
      window.removeEventListener("message", handleDirectMessage);
    };
  }, []);

  // Função para voltar à página principal
  const handleBack = () => {
    changeSubPage("main");
  };

  // Renderiza o conteúdo principal com os cards
  const renderMainContent = () => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%"
      }}
    >
      {/* Cards de acessibilidade */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          flex: 1
        }}
      >
        {/* Card Contrate */}
        <div
          onClick={() => changeSubPage("contrate")}
          style={{
            background: "rgba(59, 130, 246, 0.12)",
            border: "1px solid rgba(59, 130, 246, 0.30)",
            borderRadius: 8,
            padding: 16,
            cursor: "pointer",
            transition: "all 0.2s ease",
            display: "flex",
            alignItems: "center",
            gap: 16
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "rgba(59, 130, 246, 0.18)";
            e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.50)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "rgba(59, 130, 246, 0.12)";
            e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.30)";
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              background: "rgba(59, 130, 246, 0.2)",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: "#3b82f6" }}
            >
              <defs>
                <linearGradient
                  id="contrastGradient"
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="0"
                >
                  <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
                  <stop offset="50%" stopColor="currentColor" stopOpacity="1" />
                  <stop
                    offset="50%"
                    stopColor="currentColor"
                    stopOpacity="0.25"
                  />
                  <stop
                    offset="100%"
                    stopColor="currentColor"
                    stopOpacity="0.25"
                  />
                </linearGradient>
              </defs>
              <circle cx="12" cy="12" r="8" fill="url(#contrastGradient)" />
              <circle cx="12" cy="12" r="8" fill="none" />

              {/* Rays */}
              <line x1="12" y1="1" x2="12" y2="4" />
              <line x1="12" y1="20" x2="12" y2="23" />
              <line x1="1" y1="12" x2="4" y2="12" />
              <line x1="20" y1="12" x2="23" y2="12" />
              <line x1="4.5" y1="4.5" x2="6.5" y2="6.5" />
              <line x1="17.5" y1="4.5" x2="15.5" y2="6.5" />
              <line x1="4.5" y1="19.5" x2="6.5" y2="17.5" />
              <line x1="17.5" y1="19.5" x2="15.5" y2="17.5" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <h3
              style={{
                fontSize: 16,
                fontWeight: 600,
                margin: "0 0 4px 0",
                color: "#fff"
              }}
            >
              Contrate
            </h3>
            <p
              style={{
                fontSize: 13,
                margin: 0,
                color: "rgba(255, 255, 255, 0.7)",
                lineHeight: 1.4
              }}
            >
              Ferramentas de verificação de contraste e cores
            </p>
          </div>
          <div>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: "rgba(255, 255, 255, 0.5)" }}
            >
              <path d="M9 18l6-6-6-6"></path>
            </svg>
          </div>
        </div>

        {/* Card Documentação */}
        <div
          onClick={() => changeSubPage("documentacao")}
          style={{
            background: "rgba(34, 197, 94, 0.12)",
            border: "1px solid rgba(34, 197, 94, 0.30)",
            borderRadius: 8,
            padding: 16,
            cursor: "pointer",
            transition: "all 0.2s ease",
            display: "flex",
            alignItems: "center",
            gap: 16
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "rgba(34, 197, 94, 0.18)";
            e.currentTarget.style.borderColor = "rgba(34, 197, 94, 0.50)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "rgba(34, 197, 94, 0.12)";
            e.currentTarget.style.borderColor = "rgba(34, 197, 94, 0.30)";
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              background: "rgba(34, 197, 94, 0.2)",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: "#22c55e" }}
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14,2 14,8 20,8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10,9 9,9 8,9"></polyline>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <h3
              style={{
                fontSize: 16,
                fontWeight: 600,
                margin: "0 0 4px 0",
                color: "#fff"
              }}
            >
              Documentação
            </h3>
            <p
              style={{
                fontSize: 13,
                margin: 0,
                color: "rgba(255, 255, 255, 0.7)",
                lineHeight: 1.4
              }}
            >
              Diretrizes WCAG e documentação de acessibilidade
            </p>
          </div>
          <div>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: "rgba(255, 255, 255, 0.5)" }}
            >
              <path d="M9 18l6-6-6-6"></path>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );

  // Renderiza o conteúdo das subpáginas
  const renderSubPageContent = () => {
    switch (activeSubPage) {
      case "contrate":
        return (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              height: "100%",
              minHeight: 0
            }}
          >
            <div
              style={{
                display: "flex",
                background: "rgba(255,255,255,0.04)",
                borderRadius: 4,
                padding: 2,
                alignSelf: "flex-start"
              }}
            >
              <button
                onClick={() => setActiveContrastTab("auto")}
                style={{
                  background:
                    activeContrastTab === "auto" ? "#3b82f6" : "transparent",
                  border: "none",
                  borderRadius: 4,
                  fontWeight: 500,
                  fontSize: 12,
                  color: "#fff",
                  padding: "6px 18px",
                  boxShadow: "none",
                  transition: "background 0.2s, color 0.2s",
                  cursor: "pointer"
                }}
              >
                Auto
              </button>
              <button
                onClick={() => setActiveContrastTab("manual")}
                style={{
                  background:
                    activeContrastTab === "manual" ? "#3b82f6" : "transparent",
                  border: "none",
                  borderRadius: 4,
                  fontWeight: 500,
                  fontSize: 12,
                  color: "#fff",
                  padding: "6px 18px",
                  boxShadow: "none",
                  transition: "background 0.2s, color 0.2s",
                  cursor: "pointer"
                }}
              >
                Manual
              </button>
            </div>

            <div
              className="scrollable-content"
              style={{
                flex: 1,
                minHeight: 0,
                margin: "8px 0 0 0",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                paddingBottom: activeContrastTab === "auto" ? "80px" : 0
              }}
            >
              {activeContrastTab === "auto" ? (
                <div
                  style={{
                    flex: 1,
                    minHeight: 0,
                    display: "flex",
                    flexDirection: "column"
                  }}
                >
                  {autoAnalysisError && (
                    <div
                      style={{
                        padding: 12,
                        borderRadius: 6,
                        background: "rgba(239, 68, 68, 0.1)",
                        border: "1px solid rgba(239, 68, 68, 0.2)",
                        marginBottom: 16
                      }}
                    >
                      <p style={{ margin: 0, color: "#ef4444", fontSize: 12 }}>
                        {autoAnalysisError}
                      </p>
                    </div>
                  )}

                  {contrastPreviewImageUrl && (
                    <div style={{ marginBottom: 16 }}>
                      <button
                        type="button"
                        onClick={() =>
                          setShowContrastPreview(!showContrastPreview)
                        }
                        style={{
                          background: "transparent",
                          border: "1px solid rgba(255,255,255,0.2)",
                          borderRadius: 6,
                          color: "#e0e0e0",
                          fontSize: 12,
                          padding: "6px 12px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 6
                        }}
                      >
                        <span
                          style={{
                            transform: showContrastPreview
                              ? "rotate(0deg)"
                              : "rotate(-90deg)",
                            transition: "transform 0.2s"
                          }}
                        >
                          ▼
                        </span>
                        {showContrastPreview
                          ? "Ocultar preview"
                          : "Mostrar preview"}
                      </button>
                      {showContrastPreview && (
                        <div
                          style={{
                            marginTop: 12,
                            borderRadius: 8,
                            overflow: "hidden",
                            background: "rgba(0,0,0,0.2)",
                            maxWidth: "100%",
                            maxHeight: 320,
                            overflowY: "auto",
                            overflowX: "auto"
                          }}
                        >
                          <img
                            src={contrastPreviewImageUrl}
                            alt="Preview do frame analisado"
                            style={{
                              display: "block",
                              maxWidth: "100%",
                              height: "auto",
                              width: contrastPreviewSize ? undefined : "100%"
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {autoAnalysisResults.length > 0 && (
                    <div style={{ flex: 1, overflowY: "auto" }}>
                      {autoAnalysisResults.map((result, index) => (
                        <div
                          key={result.id}
                          style={{
                            padding: 12,
                            borderRadius: 6,
                            background: result.hasIssues
                              ? "rgba(239, 68, 68, 0.1)"
                              : "rgba(34, 197, 94, 0.1)",
                            border: result.hasIssues
                              ? "1px solid rgba(239, 68, 68, 0.2)"
                              : "1px solid rgba(34, 197, 94, 0.2)",
                            marginBottom: 8
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 8
                            }}
                          >
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 500,
                                color: "#fff"
                              }}
                            >
                              {result.nodeName}
                            </span>
                            <span
                              style={{
                                fontSize: 11,
                                color: result.hasIssues ? "#ef4444" : "#22c55e"
                              }}
                            >
                              {result.contrastRatio.toFixed(2)}:1
                            </span>
                          </div>

                          <div
                            style={{
                              fontSize: 11,
                              color: "rgba(255, 255, 255, 0.7)",
                              marginBottom: 4
                            }}
                          >
                            <span style={{ marginRight: 8 }}>
                              Texto: {result.textColor}
                            </span>
                            <span>Fundo: {result.bgColor}</span>
                          </div>

                          {result.text && (
                            <div
                              style={{
                                fontSize: 11,
                                color: "rgba(255, 255, 255, 0.6)",
                                marginBottom: 4
                              }}
                            >
                              "{result.text}"
                            </div>
                          )}

                          <div
                            style={{
                              display: "flex",
                              gap: 4,
                              flexWrap: "wrap"
                            }}
                          >
                            {result.aa && (
                              <span
                                style={{
                                  fontSize: 10,
                                  background: "rgba(34, 197, 94, 0.2)",
                                  color: "#22c55e",
                                  padding: "2px 6px",
                                  borderRadius: 3
                                }}
                              >
                                AA
                              </span>
                            )}
                            {result.aaa && (
                              <span
                                style={{
                                  fontSize: 10,
                                  background: "rgba(34, 197, 94, 0.2)",
                                  color: "#22c55e",
                                  padding: "2px 6px",
                                  borderRadius: 3
                                }}
                              >
                                AAA
                              </span>
                            )}
                            {result.aaLarge && (
                              <span
                                style={{
                                  fontSize: 10,
                                  background: "rgba(34, 197, 94, 0.2)",
                                  color: "#22c55e",
                                  padding: "2px 6px",
                                  borderRadius: 3
                                }}
                              >
                                AA Large
                              </span>
                            )}
                            {result.hasIssues &&
                              result.issues.map((issue, i) => (
                                <span
                                  key={i}
                                  style={{
                                    fontSize: 10,
                                    background: "rgba(239, 68, 68, 0.2)",
                                    color: "#ef4444",
                                    padding: "2px 6px",
                                    borderRadius: 3
                                  }}
                                >
                                  {issue}
                                </span>
                              ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {autoAnalysisResults.length === 0 &&
                    !autoAnalysisLoading &&
                    !autoAnalysisError && (
                      <div
                        style={{
                          flex: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: 24,
                          textAlign: "center"
                        }}
                      >
                        <p
                          style={{
                            margin: 0,
                            color: "rgba(255, 255, 255, 0.7)",
                            fontSize: 13,
                            lineHeight: 1.5
                          }}
                        >
                          Selecione um objeto e clique em &quot;Analisar
                          contraste&quot; para realizar a verificação.
                        </p>
                      </div>
                    )}
                </div>
              ) : (
                <ContrastChecker
                  isVisible={true}
                  selectedNode={selectedNode}
                  onBack={handleBack}
                />
              )}
            </div>

            {activeContrastTab === "auto" && (
              <footer
                className="initial-content-footer"
                style={{
                  padding: "16px",
                  background: "#2A2A2A",
                  borderTop: "1px solid rgba(255, 255, 255, 0.1)",
                  display: "flex",
                  justifyContent: "center",
                  flexShrink: 0
                }}
              >
                <button
                  className="button button--primary"
                  onClick={performAutoAnalysis}
                  disabled={autoAnalysisLoading || !selectedNode}
                  style={{
                    background:
                      autoAnalysisLoading || !selectedNode
                        ? "#4A4A4A"
                        : "#18A0FB",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    padding: "12px 16px",
                    fontSize: "14px",
                    fontWeight: 500,
                    cursor:
                      autoAnalysisLoading || !selectedNode
                        ? "not-allowed"
                        : "pointer",
                    opacity: autoAnalysisLoading || !selectedNode ? 0.6 : 1,
                    transition: "background 0.2s, opacity 0.2s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "100%",
                    maxWidth: "100%",
                    boxSizing: "border-box"
                  }}
                >
                  {autoAnalysisLoading
                    ? "Analisando..."
                    : !selectedNode
                    ? "Selecione um objeto"
                    : "Realizar análise"}
                </button>
              </footer>
            )}
          </div>
        );
      case "documentacao":
        return (
          <div
            className="scrollable-content"
            style={{
              flex: 1,
              overflowY: "auto",
              backgroundColor: "transparent"
            }}
          >
            <WCAGContent
              onSearch={query => {
                console.log("Buscar documento:", query);
              }}
              onDocumentSelect={docId => {
                console.log("Documento selecionado:", docId);
              }}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <TabContent>
      {activeSubPage === "main" ? renderMainContent() : renderSubPageContent()}
    </TabContent>
  );
};

export default AccessibilityTab;
