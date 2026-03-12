import React, { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import { motion, AnimatePresence } from "framer-motion/dist/framer-motion";
import MeasurementTool from "./MeasurementTool";
import CodeSnippetSection from "./CodeSnippetSection";
import AnimationSnippetSection from "./AnimationSnippetSection";
import ImportDesignTab, { ImportDesignTabRef } from "./ImportDesignTab";
import RenameLayersTab, { RenameLayersTabRef } from "./RenameLayersTab";
import CollapsibleSection from "./CollapsibleSection";

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

interface ToolsTabProps {
  selectedNode: any;
  onInspectClick: () => void;
}

const TabContent = styled.div`
  flex: 1;
  overflow: auto;
  padding: 16px;
  background: #1e1e1e;
  color: #e0e0e0;
`;

const ToolsTab: React.FC<ToolsTabProps> = ({
  selectedNode,
  onInspectClick
}) => {
  const [activeSubPage, setActiveSubPage] = useState<
    "main" | "inspect" | "measure" | "import" | "rename"
  >("main");
  const [animationData, setAnimationData] = useState(null);
  const importDesignRef = useRef<ImportDesignTabRef>(null);
  const renameLayersTabRef = useRef<RenameLayersTabRef>(null);
  const [importCanImport, setImportCanImport] = useState(false);
  const [importIsLoading, setImportIsLoading] = useState(false);
  const [renameCanRename, setRenameCanRename] = useState(false);
  const [renameIsLoading, setRenameIsLoading] = useState(false);

  // Função para mudar de subpágina e comunicar com App.tsx
  const changeSubPage = (
    page: "main" | "inspect" | "measure" | "import" | "rename"
  ) => {
    console.log("[ToolsTab] Mudando para subpágina:", page);
    setActiveSubPage(page);

    // Comunicar com App.tsx via window (não parent)
    const isSubPage = page !== "main";
    const title =
      page === "inspect"
        ? "Inspecionar"
        : page === "measure"
        ? "Mensurar"
        : page === "import"
        ? "Importar Design"
        : page === "rename"
        ? "Rename Layers"
        : "";

    // Enviar mensagem diretamente para a janela atual
    window.postMessage(
      {
        type: "tools-subpage-changed",
        payload: { isSubPage, title }
      },
      "*"
    );

    console.log("[ToolsTab] Mensagem enviada para UI:", { isSubPage, title });
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data || !event.data.pluginMessage) return;

      const { type, payload } = event.data.pluginMessage;
      if (type === "animation-data") {
        setAnimationData(payload.animations);
      } else if (type === "no-selection") {
        setAnimationData(null);
      }
    };

    const handleDirectMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "tools-back-to-main") {
        console.log(
          "[ToolsTab] Recebido comando para voltar à página principal"
        );
        setActiveSubPage("main");
      }
    };

    window.addEventListener("message", handleMessage);
    window.addEventListener("message", handleDirectMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("message", handleDirectMessage);
    };
  }, []);

  // Função para voltar para a página principal
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
      {/* Cards de ferramentas */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          flex: 1
        }}
      >
        {/* Card Inspecionar */}
        <div
          onClick={() => changeSubPage("inspect")}
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
              <path d="M1 14L7.14645 7.85355C7.34171 7.65829 7.34171 7.34171 7.14645 7.14645L1 1M5.5 14.5H12.5"></path>
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
              Inspecionar
            </h3>
            <p
              style={{
                fontSize: 13,
                margin: 0,
                color: "rgba(255, 255, 255, 0.7)",
                lineHeight: 1.4
              }}
            >
              Analise elementos no canvas
            </p>
          </div>
          <svg
            width="20"
            height="20"
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

        {/* Card Mensurar */}
        <div
          onClick={() => changeSubPage("measure")}
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
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
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
              Mensurar
            </h3>
            <p
              style={{
                fontSize: 13,
                margin: 0,
                color: "rgba(255, 255, 255, 0.7)",
                lineHeight: 1.4
              }}
            >
              Meça distâncias e dimensões entre elementos
            </p>
          </div>
          <svg
            width="20"
            height="20"
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

        {/* Card Importar Design */}
        <div
          onClick={() => changeSubPage("import")}
          style={{
            background: "rgba(168, 85, 247, 0.12)",
            border: "1px solid rgba(168, 85, 247, 0.30)",
            borderRadius: 8,
            padding: 16,
            cursor: "pointer",
            transition: "all 0.2s ease",
            display: "flex",
            alignItems: "center",
            gap: 16
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "rgba(168, 85, 247, 0.18)";
            e.currentTarget.style.borderColor = "rgba(168, 85, 247, 0.50)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "rgba(168, 85, 247, 0.12)";
            e.currentTarget.style.borderColor = "rgba(168, 85, 247, 0.30)";
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              background: "rgba(168, 85, 247, 0.2)",
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
              style={{ color: "#a855f7" }}
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
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
              Importar Design
            </h3>
            <p
              style={{
                fontSize: 13,
                margin: 0,
                color: "rgba(255, 255, 255, 0.7)",
                lineHeight: 1.4
              }}
            >
              Importe designs e tokens de outras fontes
            </p>
          </div>
          <svg
            width="20"
            height="20"
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

        {/* Card Rename Layers */}
        <div
          onClick={() => changeSubPage("rename")}
          style={{
            background: "rgba(255, 149, 0, 0.12)",
            border: "1px solid rgba(255, 149, 0, 0.30)",
            borderRadius: 8,
            padding: 16,
            cursor: "pointer",
            transition: "all 0.2s ease",
            display: "flex",
            alignItems: "center",
            gap: 16
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "rgba(255, 149, 0, 0.18)";
            e.currentTarget.style.borderColor = "rgba(255, 149, 0, 0.50)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "rgba(255, 149, 0, 0.12)";
            e.currentTarget.style.borderColor = "rgba(255, 149, 0, 0.30)";
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              background: "rgba(255, 149, 0, 0.2)",
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
              style={{ color: "#ff9500" }}
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
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
              Rename Layers
            </h3>
            <p
              style={{
                fontSize: 13,
                margin: 0,
                color: "rgba(255, 255, 255, 0.7)",
                lineHeight: 1.4
              }}
            >
              Renomeie camadas em lote no seu design
            </p>
          </div>
          <svg
            width="20"
            height="20"
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
  );

  // Renderiza o conteúdo das subpáginas
  const renderSubPageContent = () => {
    switch (activeSubPage) {
      case "inspect":
        return (
          <div
            className="scrollable-content"
            style={{
              flex: 1,
              overflowY: "auto",
              backgroundColor: "transparent"
            }}
          >
            {selectedNode ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px"
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
                  <CollapsibleSection
                    title="Propriedades do Componente"
                    icon={
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
                    }
                    defaultOpen={false}
                    maxHeight="300px"
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
                  </CollapsibleSection>
                )}

                {/* Code Snippets Section */}
                {console.log(
                  "Renderizando CodeSnippetSection com nó:",
                  selectedNode?.id
                )}
                <CollapsibleSection
                  title="Snippets de Código"
                  icon={
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
                      <path d="M16 18l6-6-6-6"></path>
                      <path d="M8 6l-6 6 6 6"></path>
                    </svg>
                  }
                  defaultOpen={false}
                  maxHeight="400px"
                  noPadding={true}
                >
                  <CodeSnippetSection
                    selectedNode={selectedNode}
                    key={selectedNode?.id}
                  />
                </CollapsibleSection>

                {/* Animation Snippets Section */}
                {animationData && (
                  <CollapsibleSection
                    title="Animação"
                    icon={
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
                        <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                        <path d="M5.63 12.63L9 16l1.37-1.37"></path>
                      </svg>
                    }
                    defaultOpen={false}
                    maxHeight="300px"
                    noPadding={true}
                  >
                    <AnimationSnippetSection animationData={animationData} />
                  </CollapsibleSection>
                )}

                {/* Other Properties Section */}
                <CollapsibleSection
                  title="Outras Propriedades"
                  icon={
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
                  }
                  defaultOpen={false}
                  maxHeight="200px"
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
                          // Skip properties that are already shown in component properties section
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
                </CollapsibleSection>
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
          </div>
        );

      case "measure":
        return (
          <div style={{ height: "100%" }}>
            <MeasurementTool />
          </div>
        );

      case "import":
        return (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minHeight: 0
            }}
          >
            <div
              className="scrollable-content"
              style={{
                flex: 1,
                overflowY: "auto",
                backgroundColor: "transparent"
              }}
            >
              <ImportDesignTab
                ref={importDesignRef}
                hideButton={true}
                onStateChange={(canImport, isLoading) => {
                  setImportCanImport(canImport);
                  setImportIsLoading(isLoading);
                }}
              />
            </div>
            <footer
              className="initial-content-footer"
              style={{
                padding: "0px",
                background: "#2A2A2A",
                borderTop: "1px solid rgba(255, 255, 255, 0.1)",
                display: "block"
              }}
            >
              <div
                style={{
                  padding: "16px",
                  display: "flex",
                  justifyContent: "center"
                }}
              >
                <button
                  className="button button--primary"
                  onClick={() => importDesignRef.current?.handleImport()}
                  disabled={!importCanImport || importIsLoading}
                  style={{
                    background:
                      importCanImport && !importIsLoading
                        ? "#18A0FB"
                        : "#4A4A4A",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    padding: "12px 16px",
                    fontSize: "14px",
                    fontWeight: 500,
                    cursor:
                      importCanImport && !importIsLoading
                        ? "pointer"
                        : "not-allowed",
                    opacity: importCanImport && !importIsLoading ? 1 : 0.6,
                    transition: "background 0.2s, opacity 0.2s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "100%",
                    maxWidth: "100%",
                    boxSizing: "border-box"
                  }}
                >
                  {importIsLoading ? "⏳ Importando..." : "Importar"}
                </button>
              </div>
            </footer>
          </div>
        );

      case "rename":
        return (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minHeight: 0
            }}
          >
            <div
              className="scrollable-content"
              style={{
                flex: 1,
                overflowY: "auto",
                backgroundColor: "transparent"
              }}
            >
              <RenameLayersTab
                ref={renameLayersTabRef}
                hideButton={true}
                selectedNode={selectedNode}
                onStateChange={(canRename, isLoading) => {
                  setRenameCanRename(canRename);
                  setRenameIsLoading(isLoading);
                }}
              />
            </div>
            <footer
              className="initial-content-footer"
              style={{
                padding: "0px",
                background: "#2A2A2A",
                borderTop: "1px solid rgba(255, 255, 255, 0.1)",
                display: "block"
              }}
            >
              <div
                style={{
                  padding: "16px",
                  display: "flex",
                  justifyContent: "center"
                }}
              >
                <button
                  className="button button--primary"
                  onClick={() => {
                    console.log("[ToolsTab] Botão Renomear Layers clicado");
                    renameLayersTabRef.current?.triggerRename();
                  }}
                  disabled={!renameCanRename || renameIsLoading}
                  style={{
                    background:
                      renameCanRename && !renameIsLoading
                        ? "#18A0FB"
                        : "#4A4A4A",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    padding: "12px 16px",
                    fontSize: "14px",
                    fontWeight: 500,
                    cursor:
                      renameCanRename && !renameIsLoading
                        ? "pointer"
                        : "not-allowed",
                    opacity: renameCanRename && !renameIsLoading ? 1 : 0.6,
                    transition: "background 0.2s, opacity 0.2s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "100%",
                    maxWidth: "100%",
                    boxSizing: "border-box"
                  }}
                >
                  {renameIsLoading ? "⏳ Processando..." : "Renomear Layers"}
                </button>
              </div>
            </footer>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%"
      }}
    >
      {activeSubPage === "main" ? (
        <div style={{ height: "100%" }}>{renderMainContent()}</div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100%"
          }}
        >
          {renderSubPageContent()}
        </div>
      )}
    </div>
  );
};

export default ToolsTab;
