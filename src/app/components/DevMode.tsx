import React, { useState } from "react";

// Add CSS for scrollbar
const scrollbarStyles = `
  .scrollable-content {
    scrollbar-width: thin;
    scrollbar-color: #4A4A4A #252526;
  }
  
  .scrollable-content::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  .scrollable-content::-webkit-scrollbar-track {
    background: #252526;
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

interface DevModeTabProps {
  selectedNode: any;
  onInspectClick: () => void;
}

const DevModeTab: React.FC<DevModeTabProps> = ({
  selectedNode,
  onInspectClick
}) => {
  const [activeTab, setActiveTab] = useState("inspect"); // 'inspect' or 'measure'

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden"
      }}
    >
      {/* Tab Navigation */}
      <div
        style={{
          padding: "24px 16px 16px 16px",
          margin: "0",
          width: "100%",
          boxSizing: "border-box"
        }}
      >
        <div
          style={{
            display: "inline-flex",
            background: "rgba(255,255,255,0.04)",
            borderRadius: 4,
            padding: "2px",
            margin: "0",
            boxSizing: "border-box"
          }}
        >
          <button
            onClick={() => setActiveTab("inspect")}
            style={{
              flex: 1,
              background: activeTab === "inspect" ? "#3b82f6" : "transparent",
              border: "none",
              borderRadius: 4,
              fontWeight: 500,
              fontSize: 12,
              color: activeTab === "inspect" ? "#fff" : "#fff",
              padding: "6px 18px",
              boxShadow: "none",
              transition: "background 0.2s, color 0.2s",
              cursor: "pointer"
            }}
          >
            Inspecionar
          </button>
          <button
            onClick={() => setActiveTab("measure")}
            style={{
              flex: 1,
              background: activeTab === "measure" ? "#3b82f6" : "transparent",
              border: "none",
              borderRadius: 4,
              fontWeight: 500,
              fontSize: 12,
              color: activeTab === "measure" ? "#fff" : "#fff",
              padding: "6px 18px",
              boxShadow: "none",
              transition: "background 0.2s, color 0.2s",
              cursor: "pointer"
            }}
          >
            Mensurar
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div
        className="scrollable-content"
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "0 16px 16px 16px",
          backgroundColor: "transparent"
        }}
      >
        {activeTab === "inspect" && (
          <>
            {selectedNode ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  paddingTop: "16px"
                }}
              >
                {/* Element Preview Section */}
                <div
                  style={{
                    background: "rgba(0, 0, 0, 0.2)",
                    borderRadius: "8px",
                    padding: "16px",
                    border: "1px solid rgba(255, 255, 255, 0.1)"
                  }}
                >
                  <h3
                    style={{
                      fontSize: "13px",
                      fontWeight: "600",
                      margin: "0 0 12px 0",
                      color: "#fff",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px"
                    }}
                  >
                    <span>Element Preview</span>
                    <span
                      style={{
                        fontSize: "11px",
                        background: "rgba(255, 255, 255, 0.1)",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontWeight: "500",
                        color: "#aaa"
                      }}
                    >
                      {selectedNode.type || "element"}
                    </span>
                  </h3>

                  {/* Visual Element Box */}
                  <div
                    style={{
                      position: "relative",
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px dashed rgba(255, 255, 255, 0.2)",
                      borderRadius: "4px",
                      padding: selectedNode.padding?.top || "16px",
                      minHeight: "100px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: "16px",
                      overflow: "hidden"
                    }}
                  >
                    <div
                      style={{
                        background: "rgba(255, 255, 255, 0.1)",
                        width: "100%",
                        height: "100%",
                        minHeight: "60px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "rgba(255, 255, 255, 0.6)",
                        fontSize: "12px",
                        fontStyle: "italic"
                      }}
                    >
                      {selectedNode.name || "Element Content"}
                    </div>

                    {/* Padding indicators */}
                    {selectedNode.padding && (
                      <>
                        <div
                          style={{
                            position: "absolute",
                            top: 0,
                            left: "50%",
                            transform: "translateX(-50%)",
                            background: "rgba(255, 165, 0, 0.7)",
                            color: "#000",
                            fontSize: "10px",
                            padding: "2px 6px",
                            borderBottomLeftRadius: "4px",
                            borderBottomRightRadius: "4px",
                            whiteSpace: "nowrap"
                          }}
                        >
                          Padding: {selectedNode.padding.top || 0}px
                        </div>
                        <div
                          style={{
                            position: "absolute",
                            right: "8px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            background: "rgba(255, 165, 0, 0.7)",
                            color: "#000",
                            fontSize: "10px",
                            padding: "2px 6px",
                            borderTopLeftRadius: "4px",
                            borderBottomLeftRadius: "4px",
                            whiteSpace: "nowrap"
                          }}
                        >
                          {selectedNode.padding.right || 0}px
                        </div>
                        <div
                          style={{
                            position: "absolute",
                            bottom: 0,
                            left: "50%",
                            transform: "translateX(-50%)",
                            background: "rgba(255, 165, 0, 0.7)",
                            color: "#000",
                            fontSize: "10px",
                            padding: "2px 6px",
                            borderTopLeftRadius: "4px",
                            borderTopRightRadius: "4px",
                            whiteSpace: "nowrap"
                          }}
                        >
                          {selectedNode.padding.bottom || 0}px
                        </div>
                        <div
                          style={{
                            position: "absolute",
                            left: "8px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            background: "rgba(255, 165, 0, 0.7)",
                            color: "#000",
                            fontSize: "10px",
                            padding: "2px 6px",
                            borderTopRightRadius: "4px",
                            borderBottomRightRadius: "4px",
                            whiteSpace: "nowrap"
                          }}
                        >
                          {selectedNode.padding.left || 0}px
                        </div>
                      </>
                    )}
                  </div>

                  {/* Dimensions */}
                  {selectedNode.bounds && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginTop: "8px",
                        fontSize: "11px",
                        color: "#aaa",
                        padding: "4px 0",
                        borderTop: "1px dashed rgba(255, 255, 255, 0.1)"
                      }}
                    >
                      <span>
                        Width: {Math.round(selectedNode.bounds.width)}px
                      </span>
                      <span>
                        Height: {Math.round(selectedNode.bounds.height)}px
                      </span>
                    </div>
                  )}
                </div>

                {/* Component Properties Section */}
                {selectedNode.componentProperties && (
                  <div
                    style={{
                      background: "#252526",
                      borderRadius: "6px",
                      border: "1px solid #333",
                      overflow: "hidden",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                      marginBottom: "16px"
                    }}
                  >
                    <div
                      style={{
                        padding: "8px 12px",
                        borderBottom: "1px solid #333",
                        backgroundColor: "#2D2D2D",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: "11px",
                          fontWeight: 600,
                          color: "#9CDCFE",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px"
                        }}
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                        </svg>
                        Propriedades do Componente
                      </div>
                    </div>

                    <div
                      style={{
                        maxHeight: "300px",
                        overflowY: "auto",
                        fontSize: "12px"
                      }}
                    >
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          color: "#D4D4D4"
                        }}
                      >
                        <thead>
                          <tr
                            style={{
                              backgroundColor: "#2A2D2E",
                              fontSize: "11px",
                              textAlign: "left",
                              color: "#9CDCFE",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px"
                            }}
                          >
                            <th
                              style={{
                                padding: "8px 12px",
                                borderBottom: "1px solid #333"
                              }}
                            >
                              Propriedade
                            </th>
                            <th
                              style={{
                                padding: "8px 12px",
                                borderBottom: "1px solid #333"
                              }}
                            >
                              Valor
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(selectedNode.componentProperties)
                            .filter(
                              ([key]) =>
                                !["name", "key", "description"].includes(key)
                            )
                            .map(([key, value]) => {
                              // Converter valor para exibição
                              let displayValue = value;

                              // Tratar diferentes tipos de valor
                              if (typeof value === "object") {
                                displayValue = JSON.stringify(value);
                              }

                              return (
                                <tr
                                  key={key}
                                  style={{
                                    borderBottom: "1px solid #252526",
                                    transition: "background-color 0.2s"
                                  }}
                                  onMouseEnter={e => {
                                    (e.currentTarget as HTMLElement).style.backgroundColor =
                                      "rgba(255, 255, 255, 0.03)";
                                  }}
                                  onMouseLeave={e => {
                                    (e.currentTarget as HTMLElement).style.backgroundColor =
                                      "transparent";
                                  }}
                                >
                                  <td
                                    style={{
                                      padding: "8px 12px",
                                      fontFamily: "monospace",
                                      color: "#9CDCFE",
                                      verticalAlign: "top",
                                      borderRight: "1px solid #252526",
                                      whiteSpace: "nowrap"
                                    }}
                                  >
                                    {key}
                                  </td>
                                  <td
                                    style={{
                                      padding: "8px 12px",
                                      fontFamily: "monospace",
                                      color: "#CE9178",
                                      wordBreak: "break-word"
                                    }}
                                  >
                                    {typeof displayValue === "string"
                                      ? displayValue
                                      : JSON.stringify(displayValue)}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Other Properties Section */}
                <div
                  style={{
                    background: "#252526",
                    borderRadius: "6px",
                    border: "1px solid #333",
                    overflow: "hidden",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
                  }}
                >
                  <div
                    style={{
                      padding: "8px 12px",
                      borderBottom: "1px solid #333",
                      backgroundColor: "#2D2D2D",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "#9CDCFE",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px"
                      }}
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path>
                      </svg>
                      Outras Propriedades
                    </div>
                  </div>

                  <div
                    style={{
                      maxHeight: "200px",
                      overflowY: "auto",
                      fontSize: "12px"
                    }}
                  >
                    {Object.entries(selectedNode)
                      .filter(
                        ([key]) =>
                          ![
                            "bounds",
                            "padding",
                            "name",
                            "type",
                            "styles",
                            "children",
                            "componentProperties",
                            // Skip properties that are already shown in the component properties section
                            ...(selectedNode.componentProperties
                              ? Object.keys(selectedNode.componentProperties)
                              : [])
                          ].includes(key)
                      )
                      .map(([key, value]) => {
                        let displayValue = value;
                        if (value === null || value === undefined) {
                          displayValue = "null";
                        } else if (typeof value === "boolean") {
                          displayValue = value ? "true" : "false";
                        } else if (Array.isArray(value)) {
                          displayValue = `[${value.join(", ")}]`;
                        } else if (typeof value === "object") {
                          displayValue = JSON.stringify(value, null, 2);
                        }

                        return (
                          <div
                            key={key}
                            style={{
                              display: "flex",
                              padding: "6px 12px",
                              borderBottom: "1px solid #252526",
                              cursor: "default",
                              transition: "background-color 0.2s"
                            }}
                            onMouseEnter={e => {
                              (e.currentTarget as HTMLElement).style.backgroundColor =
                                "rgba(255, 255, 255, 0.03)";
                            }}
                            onMouseLeave={e => {
                              (e.currentTarget as HTMLElement).style.backgroundColor =
                                "transparent";
                            }}
                          >
                            <div
                              style={{
                                flex: "0 0 140px",
                                color: "#9CDCFE",
                                fontFamily: "monospace",
                                paddingRight: "12px",
                                wordBreak: "break-word"
                              }}
                            >
                              {key}
                            </div>
                            <div
                              style={{
                                flex: 1,
                                color: "#CE9178",
                                fontFamily: "monospace",
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word"
                              }}
                            >
                              {String(displayValue)}
                            </div>
                          </div>
                        );
                      })}

                    {Object.keys(selectedNode).filter(
                      key =>
                        ![
                          "bounds",
                          "padding",
                          "name",
                          "type",
                          "styles",
                          "children",
                          "componentProperties"
                        ].includes(key)
                    ).length === 0 && (
                      <div
                        style={{
                          padding: "16px",
                          textAlign: "center",
                          color: "#888",
                          fontSize: "11px",
                          fontStyle: "italic"
                        }}
                      >
                        Nenhuma propriedade adicional disponível
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  color: "#888",
                  textAlign: "center",
                  padding: "32px 16px"
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 14 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M1 14L7.14645 7.85355C7.34171 7.65829 7.34171 7.34171 7.14645 7.14645L1 1M5.5 14.5H12.5"
                    stroke="#F5F5F5"
                    stroke-width="2"
                    stroke-linecap="round"
                  />
                </svg>
                <p
                  style={{
                    margin: "16px 0 0 0",
                    fontSize: "14px",
                    color: "#fff"
                  }}
                >
                  Nenhum elemento selecionado
                </p>
                <p
                  style={{
                    margin: "8px 0 0 0",
                    fontSize: "12px",
                    color: "#fff",
                    opacity: 0.7
                  }}
                >
                  Selecione um elemento no canvas para inspecionar
                </p>
              </div>
            )}
          </>
        )}

        {activeTab === "measure" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "#888",
              textAlign: "center",
              padding: "32px 16px"
            }}
          >
            <p
              style={{ margin: "16px 0 0 0", fontSize: "14px", color: "#fff" }}
            >
              Conteúdo da aba Mensurar (a ser implementado)
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DevModeTab;
