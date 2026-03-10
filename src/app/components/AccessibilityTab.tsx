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

    try {
      // Enviar mensagem ao plugin para obter todos os elementos de texto
      parent.postMessage(
        {
          pluginMessage: {
            type: "analyze-all-contrast",
            data: {}
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
      if (event.data && event.data.type === "auto-analysis-results") {
        const { results, error } = event.data.payload;

        if (error) {
          setAutoAnalysisError(error);
        } else {
          setAutoAnalysisResults(results || []);
        }
        setAutoAnalysisLoading(false);
      }
    };

    window.addEventListener("message", handleAnalysisResults);
    return () => window.removeEventListener("message", handleAnalysisResults);
  }, []);

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
            className="scrollable-content"
            style={{
              flex: 1,
              overflowY: "auto",
              backgroundColor: "transparent",
              display: "flex",
              flexDirection: "column",
              height: "100%"
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

            <div style={{ flex: 1, minHeight: 0, margin: "8px 0 0 0" }}>
              {activeContrastTab === "auto" ? (
                <div
                  style={{
                    flex: 1,
                    minHeight: 0,
                    display: "flex",
                    flexDirection: "column"
                  }}
                >
                  <div style={{ marginBottom: 16 }}>
                    <button
                      onClick={performAutoAnalysis}
                      disabled={autoAnalysisLoading}
                      style={{
                        background: "#3b82f6",
                        border: "none",
                        borderRadius: 6,
                        fontWeight: 500,
                        fontSize: 13,
                        color: "#fff",
                        padding: "8px 16px",
                        cursor: autoAnalysisLoading ? "not-allowed" : "pointer",
                        opacity: autoAnalysisLoading ? 0.6 : 1
                      }}
                    >
                      {autoAnalysisLoading
                        ? "Analisando..."
                        : "Analisar Contraste Automático"}
                    </button>
                  </div>

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
                          padding: 16,
                          color: "rgba(255, 255, 255, 0.7)",
                          fontSize: 13,
                          lineHeight: 1.5,
                          borderRadius: 8,
                          background: "rgba(255,255,255,0.04)"
                        }}
                      >
                        Clique em "Analisar Contraste Automático" para verificar
                        todos os elementos de texto no seu design.
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
