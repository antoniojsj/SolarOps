import React, { useState, useCallback } from "react";
import SettingsPanel from "./SettingsPanel";
import DocumentationSearch from "./DocumentationSearch";
import ContrastChecker from "./ContrastChecker";
import DevModeTab from "./DevModeTab";
import WCAGContent from "./WCAGContent";

function InitialContent(props) {
  const [settingsPanelVisible, setSettingsPanelVisible] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("auditoria"); // 'auditoria', 'acessibilidade' ou 'devmode'
  const [accessibilityTab, setAccessibilityTab] = React.useState("contrast"); // 'contrast' ou 'docs'
  const [selectedNode, setSelectedNode] = React.useState<any>(null);
  const [isCheckingContrast, setIsCheckingContrast] = React.useState(false);

  // Adicionar logs para rastrear mudanças no selectedNode
  React.useEffect(() => {
    console.log("selectedNode atualizado:", selectedNode);
  }, [selectedNode]);

  // Configurar o listener para mensagens do Figma
  React.useEffect(() => {
    const messageListener = (event: MessageEvent) => {
      console.log("[InitialContent] Mensagem recebida:", event.data);

      // Aceitar mensagens tanto no formato { pluginMessage } quanto direto { type }
      const pm = event?.data?.pluginMessage ?? event?.data;
      if (pm && pm.type) {
        console.log("[InitialContent] Mensagem do plugin recebida:", pm.type);

        if (pm.type === "selected-node") {
          console.log("[InitialContent] Nó selecionado recebido:", pm.node);

          // Atualizar o estado com o novo nó selecionado
          setSelectedNode(prevNode => {
            console.log(
              "[InitialContent] Estado anterior do selectedNode:",
              prevNode
            );
            console.log("[InitialContent] Novo nó recebido:", pm.node);
            return pm.node;
          });
          // Não realizar troca automática de aba. O contraste só inicia se a aba de acessibilidade estiver ativa
          // (controlado por um efeito separado que observa activeTab e selectedNode)
        } else if (pm.type === "no-selection") {
          console.log("[InitialContent] Nenhum nó selecionado no Figma");
          setSelectedNode(null);
          setIsCheckingContrast(false);
        } else if (pm.type === "selection-update") {
          console.log(
            "[InitialContent] Atualização de seleção recebida:",
            pm.selectedNodeIds
          );

          // Se não houver nós selecionados, limpar o estado
          if (!pm.selectedNodeIds || pm.selectedNodeIds.length === 0) {
            console.log(
              "[InitialContent] Nenhum nó selecionado - limpando estado"
            );
            setSelectedNode(null);
            setIsCheckingContrast(false);
          }
        }
      }
    };

    console.log("[InitialContent] Registrando listener de mensagens...");
    window.addEventListener("message", messageListener);

    // Solicitar o estado atual da seleção ao carregar o componente
    console.log("[InitialContent] Solicitando estado atual da seleção...");
    parent.postMessage({ pluginMessage: { type: "get-selection" } }, "*");

    // Limpar o listener quando o componente for desmontado
    return () => {
      console.log("[InitialContent] Removendo listener de mensagens...");
      window.removeEventListener("message", messageListener);
    };
  }, []);

  // Efeito para monitorar mudanças no selectedNode
  React.useEffect(() => {
    console.log("[InitialContent] selectedNode mudou:", {
      hasNode: !!selectedNode,
      nodeId: selectedNode?.id,
      nodeType: selectedNode?.type
    });
  }, [selectedNode]);

  // Iniciar checagem de contraste somente quando a aba de acessibilidade estiver ativa
  React.useEffect(() => {
    if (activeTab === "acessibilidade" && selectedNode) {
      // garantir sub-aba contrast ativa
      setAccessibilityTab("contrast");
      setIsCheckingContrast(true);
    } else if (activeTab !== "acessibilidade") {
      // ao sair da aba de acessibilidade, interromper checagem
      setIsCheckingContrast(false);
    }
  }, [activeTab, selectedNode]);

  return (
    <div
      className="initial-content-root"
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box"
      }}
    >
      <div
        className="initial-header"
        style={{
          background: "#2A2A2A",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          height: 48
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          <div
            className={`pill initial-header-tab${
              activeTab === "auditoria" ? " selected" : ""
            }`}
            style={{
              background:
                activeTab === "auditoria"
                  ? "rgba(255,255,255,0.08)"
                  : "transparent",
              color: "#fff",
              fontWeight: 400,
              fontSize: 14,
              borderRadius: 4,
              padding: "6px 12px",
              lineHeight: "18px",
              cursor: "pointer"
            }}
            onClick={() => setActiveTab("auditoria")}
          >
            Auditoria
          </div>
          <div
            className={`pill initial-header-tab${
              activeTab === "acessibilidade" ? " selected" : ""
            }`}
            style={{
              background:
                activeTab === "acessibilidade"
                  ? "rgba(255,255,255,0.08)"
                  : "transparent",
              color: "#fff",
              fontWeight: 400,
              fontSize: 14,
              borderRadius: 4,
              padding: "6px 12px",
              lineHeight: "18px",
              cursor: "pointer"
            }}
            onClick={() => setActiveTab("acessibilidade")}
          >
            Acessibilidade
          </div>
          <div
            className={`pill initial-header-tab${
              activeTab === "devmode" ? " selected" : ""
            }`}
            style={{
              background:
                activeTab === "devmode"
                  ? "rgba(255,255,255,0.08)"
                  : "transparent",
              color: "#fff",
              fontWeight: 400,
              fontSize: 14,
              borderRadius: 4,
              padding: "6px 12px",
              lineHeight: "18px",
              cursor: "pointer"
            }}
            onClick={() => setActiveTab("devmode")}
          >
            DevMode
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            className="button--icon info-button"
            title="Informações"
            onClick={props.onShowInfoPanel}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                cx="10"
                cy="10"
                r="9"
                stroke="#fff"
                strokeWidth="1.2"
                fill="none"
              />
              <rect x="9.4" y="9" width="1.2" height="5" fill="#fff" />
              <circle cx="10" cy="6" r="0.7" fill="#fff" />
            </svg>
          </button>
          <button
            className="button--icon settings-button"
            title="Configurações"
            onClick={() => setSettingsPanelVisible(true)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g>
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M7.44268 13.1428H8.5609C8.80979 12.8685 9.10846 12.6311 9.44535 12.4408C10.76 11.702 13.0053 11.6617 14.2329 12.5343H15.5556V4.64854C15.5556 4.64854 14.8471 2.71997 11.6267 2.71997C9.96001 2.71997 9.04712 3.23597 8.55468 3.73483C8.2089 4.08369 8.07024 4.42311 8.02135 4.5714H7.97779C7.92979 4.42311 7.79112 4.08283 7.44535 3.73483C6.9529 3.23597 6.04001 2.71997 4.37335 2.71997C1.1529 2.71997 0.444458 4.64854 0.444458 4.64854V12.5257H1.76712C2.99557 11.6523 5.24268 11.6943 6.55646 12.4357C6.89424 12.6268 7.19379 12.866 7.44268 13.1428V13.1428ZM8.44446 4.81911V12.068C8.61779 11.9325 8.80268 11.8108 8.99735 11.7011C9.82135 11.2374 10.8773 11.0188 11.8782 11.0265C12.7725 11.0334 13.728 11.2211 14.5022 11.6771H14.6667V4.84311L14.64 4.80026C14.5636 4.68197 14.4302 4.50968 14.2178 4.33311C13.8089 3.99283 13.0356 3.57711 11.6267 3.57711C10.2169 3.57711 9.54668 3.99197 9.23201 4.29283C9.06401 4.45226 8.9689 4.6074 8.91824 4.71283C8.89157 4.76511 8.87735 4.80454 8.87112 4.82511L8.86668 4.83969L8.86757 4.83454L8.86935 4.82769V4.8234L8.87024 4.82169V4.81997L8.86579 4.81911H8.44446ZM7.55557 4.81911H7.13424L7.1289 4.81997V4.82169L7.12979 4.8234L7.13068 4.82769L7.13246 4.83454L7.13335 4.83969C7.13335 4.84054 7.13335 4.8354 7.1289 4.82511C7.12268 4.80454 7.10757 4.76511 7.08179 4.71283C7.03112 4.6074 6.93601 4.45226 6.76801 4.29283C6.45335 3.99197 5.78312 3.57711 4.37335 3.57711C2.96446 3.57711 2.19112 3.99283 1.78135 4.33311C1.56979 4.50968 1.43646 4.68197 1.36001 4.80026L1.33335 4.84311V11.6685H1.49779C2.2729 11.2125 3.22935 11.024 4.12357 11.018C5.12624 11.0111 6.18224 11.2314 7.00624 11.6968C7.19912 11.8057 7.38312 11.9283 7.55557 12.062V4.81997V4.81911Z"
                  fill="#fff"
                />
              </g>
            </svg>
          </button>
          {settingsPanelVisible && (
            <SettingsPanel
              panelVisible={settingsPanelVisible}
              onHandlePanelVisible={() => setSettingsPanelVisible(false)}
              ignoredErrorArray={props.ignoredErrorArray || []}
              borderRadiusValues={props.borderRadiusValues || []}
              updateLintRules={props.updateLintRules || (() => {})}
              lintVectors={props.lintVectors || false}
              libraries={props.libraries}
              onUpdateLibraries={props.onUpdateLibraries}
              localStyles={props.localStyles}
            />
          )}
        </div>
      </div>
      <div
        className="initial-content-main"
        style={{ flex: 1, overflow: "auto" }}
      >
        {activeTab === "auditoria" && (
          <div
            style={{ width: "100%", padding: "16px", boxSizing: "border-box" }}
          >
            <div className="scan-hero">
              <div className="scan-icon-container">
                <div className="scan-icon">
                  <div
                    className="scan-icon-orbital"
                    style={{ ["--delay" as any]: "0s" } as React.CSSProperties}
                  />
                  <div
                    className="scan-icon-orbital"
                    style={
                      { ["--delay" as any]: "0.5s" } as React.CSSProperties
                    }
                  />
                  <div className="scan-icon-center">
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="scan-icon-svg"
                    >
                      <path
                        d="M3 9V6C3 4.34315 4.34315 3 6 3H9M15 3H18C19.6569 3 21 4.34315 21 6V9M21 15V18C21 19.6569 19.6569 21 18 21H15M9 21H6C4.34315 21 3 19.6569 3 18V15"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M17 12H12H7"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
              </div>
              <h2 className="scan-title">
                Verifique a conformidade do seu projeto
              </h2>
            </div>
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon feature-icon-blue">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12 16V12M12 8H12.01"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="feature-content">
                  <h3 className="feature-title">Verificação</h3>
                  <p className="feature-description">Uso dos tokens</p>
                </div>
              </div>
              <div className="feature-card">
                <div className="feature-icon feature-icon-green">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M22 12H18L15 21L9 3L6 12H2"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="feature-content">
                  <h3 className="feature-title">Relatórios</h3>
                  <p className="feature-description">Métricas e gráficos</p>
                </div>
              </div>
              <div className="feature-card">
                <div className="feature-icon feature-icon-yellow">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M13 2L3 14H12L11 22L21 10H12L13 2Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="feature-content">
                  <h3 className="feature-title">Correções</h3>
                  <p className="feature-description">
                    Simplifique as correções
                  </p>
                </div>
              </div>
              <div className="feature-card">
                <div className="feature-icon feature-icon-purple">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path
                      d="M12 16V12M12 8H12.01"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="feature-content">
                  <h3 className="feature-title">Navegação</h3>
                  <p className="feature-description">Verifique os elementos</p>
                </div>
              </div>
            </div>
            <div className="tip-card">
              <div className="tip-icon">💡</div>
              <div className="tip-content">
                <h4 className="tip-title">Importante</h4>
                <p className="tip-text">
                  Selecione um ou mais frames e depois clique no botão "iniciar
                  análise" para gerar o relatório.
                </p>
              </div>
            </div>
          </div>
        )}
        {activeTab === "acessibilidade" && (
          <div
            style={{
              width: "100%",
              height: "100%",
              padding: "0 16px",
              margin: "0",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden"
            }}
          >
            {/* Tabs */}
            <div
              style={{
                padding: "24px 0 16px 0",
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
                  onClick={() => setAccessibilityTab("contrast")}
                  style={{
                    flex: 1,
                    background:
                      accessibilityTab === "contrast" ? "#fff" : "transparent",
                    border: "none",
                    borderRadius: 4,
                    fontWeight: 500,
                    fontSize: 12,
                    color: accessibilityTab === "contrast" ? "#222" : "#fff",
                    padding: "6px 18px",
                    boxShadow: "none",
                    transition: "background 0.2s, color 0.2s",
                    cursor: "pointer"
                  }}
                >
                  Contraste
                </button>
                <button
                  onClick={() => setAccessibilityTab("docs")}
                  style={{
                    flex: 1,
                    background:
                      accessibilityTab === "docs" ? "#fff" : "transparent",
                    border: "none",
                    borderRadius: 4,
                    fontWeight: 500,
                    fontSize: 12,
                    color: accessibilityTab === "docs" ? "#222" : "#fff",
                    padding: "6px 18px",
                    boxShadow: "none",
                    transition: "background 0.2s, color 0.2s",
                    cursor: "pointer"
                  }}
                >
                  Documentações
                </button>
                {null}
              </div>
            </div>

            {/* Content */}
            <div
              style={{
                flex: 1,
                width: "100%",
                padding: "0",
                margin: "0",
                boxSizing: "border-box",
                overflowY: "auto"
              }}
            >
              {accessibilityTab === "contrast" && (
                <ContrastChecker
                  isVisible={isCheckingContrast}
                  selectedNode={selectedNode}
                  onBack={() => setIsCheckingContrast(false)}
                />
              )}

              {accessibilityTab === "docs" && (
                <WCAGContent
                  onSearch={query => {
                    console.log("Buscar documento:", query);
                  }}
                  onDocumentSelect={docId => {
                    console.log("Documento selecionado:", docId);
                  }}
                />
              )}
            </div>
          </div>
        )}
      </div>
      {activeTab === "devmode" ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            overflow: "hidden"
          }}
        >
          {selectedNode ? (
            <DevModeTab
              selectedNode={selectedNode}
              onInspectClick={() => {
                console.log("Iniciando modo de inspeção...");
                parent.postMessage(
                  {
                    pluginMessage: {
                      type: "start-inspection"
                    }
                  },
                  "*"
                );
              }}
            />
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "40px 20px",
                textAlign: "center",
                flex: 1
              }}
            >
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  background: "rgba(255, 255, 255, 0.05)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "16px"
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"
                    fill="#fff"
                  />
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 3C12.5523 3 13 3.44772 13 4V5C13 5.55228 12.5523 6 12 6C11.4477 6 11 5.55228 11 5V4C11 3.44772 11.4477 3 12 3Z"
                    fill="#fff"
                  />
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 18C12.5523 18 13 18.4477 13 19V20C13 20.5523 12.5523 21 12 21C11.4477 21 11 20.5523 11 20V19C11 18.4477 11.4477 18 12 18Z"
                    fill="#fff"
                  />
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M4.92893 4.92894C5.31946 4.53841 5.95262 4.53841 6.34315 4.92894L6.70711 5.29289C7.09763 5.68342 7.09763 6.31658 6.70711 6.70711C6.31658 7.09763 5.68342 7.09763 5.29289 6.70711L4.92893 6.34315C4.53841 5.95262 4.53841 5.31946 4.92893 4.92894Z"
                    fill="#fff"
                  />
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M17.6569 17.6569C18.0474 17.2663 18.6805 17.2663 19.0711 17.6569L19.435 18.0208C19.8256 18.4114 19.8256 19.0445 19.435 19.4351C19.0445 19.8256 18.4113 19.8256 18.0208 19.4351L17.6569 19.0711C17.2663 18.6806 17.2663 18.0474 17.6569 17.6569Z"
                    fill="#fff"
                  />
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M3 12C3 11.4477 3.44772 11 4 11H5C5.55229 11 6 11.4477 6 12C6 12.5523 5.55229 13 5 13H4C3.44772 13 3 12.5523 3 12Z"
                    fill="#fff"
                  />
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M18 12C18 11.4477 18.4477 11 19 11H20C20.5523 11 21 11.4477 21 12C21 12.5523 20.5523 13 20 13H19C18.4477 13 18 12.5523 18 12Z"
                    fill="#fff"
                  />
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M6.70711 17.6569C6.31658 17.2663 5.68342 17.2663 5.29289 17.6569L4.92893 18.0208C4.53841 18.4114 4.53841 19.0445 4.92893 19.4351C5.31946 19.8256 5.95262 19.8256 6.34315 19.4351L6.70711 19.0711C7.09763 18.6806 7.09763 18.0474 6.70711 17.6569Z"
                    fill="#fff"
                  />
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M19.0711 4.92894C19.4616 5.31946 19.4616 5.95262 19.0711 6.34315L18.7071 6.70711C18.3166 7.09763 17.6834 7.09763 17.2929 6.70711C16.9024 6.31658 16.9024 5.68342 17.2929 5.29289L17.6569 4.92894C18.0474 4.53841 18.6805 4.53841 19.0711 4.92894Z"
                    fill="#fff"
                  />
                </svg>
              </div>
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: "14px",
                  lineHeight: "20px",
                  maxWidth: "240px",
                  color: "#ffffff"
                }}
              >
                Selecione um elemento na tela para inspecionar suas propriedades
                e estilos
              </p>
            </div>
          )}
        </div>
      ) : null}
      {(activeTab === "auditoria" ||
        activeTab === "devmode" ||
        (activeTab === "acessibilidade" &&
          (accessibilityTab === "contrast" ||
            accessibilityTab === "docs"))) && (
        <footer
          className="initial-content-footer"
          style={{
            padding: "0px",
            height: accessibilityTab === "docs" ? "4px" : "auto",
            background: "#2A2A2A",
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            display: "block"
          }}
        >
          {accessibilityTab !== "docs" && (
            <div
              style={{
                padding: "16px",
                display: "flex",
                justifyContent: "center"
              }}
            >
              {activeTab === "devmode" ? (
                <button
                  className="button button--primary"
                  onClick={() => {
                    console.log("Iniciando modo de inspeção...");
                    parent.postMessage(
                      {
                        pluginMessage: {
                          type: "start-inspection"
                        }
                      },
                      "*"
                    );
                  }}
                  style={{
                    background: "#18A0FB",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "10px 16px",
                    fontSize: "13px",
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "background 0.2s, opacity 0.2s",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    width: "100%",
                    maxWidth: "100%",
                    justifyContent: "center",
                    boxSizing: "border-box",
                    height: "40px"
                  }}
                >
                  {selectedNode ? "Atualizar elemento" : "Selecionar elemento"}
                </button>
              ) : (
                <button
                  className="button button--primary"
                  onClick={
                    activeTab === "auditoria"
                      ? props.onHandleRunApp
                      : () => {
                          // Obter o nó selecionado do Figma
                          parent.postMessage(
                            {
                              pluginMessage: {
                                type: "get-selected-node"
                              }
                            },
                            "*"
                          );

                          // Solicitar o nó selecionado ao Figma
                          console.log("Solicitando nó selecionado ao Figma...");
                          parent.postMessage(
                            {
                              pluginMessage: {
                                type: "get-selected-node"
                              }
                            },
                            "*"
                          );

                          // Exibir imediatamente a aba de contraste enquanto aguardamos a resposta
                          setActiveTab("acessibilidade");
                          setAccessibilityTab("contrast");
                          setIsCheckingContrast(true);
                        }
                  }
                  disabled={!props.isFrameSelected}
                  style={{
                    background: props.isFrameSelected ? "#18A0FB" : "#656565",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    padding: "12px 16px",
                    fontSize: "14px",
                    fontWeight: 500,
                    cursor: props.isFrameSelected ? "pointer" : "not-allowed",
                    opacity: props.isFrameSelected ? 1 : 0.7,
                    transition: "background 0.2s, opacity 0.2s",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    width: "100%",
                    maxWidth: "100%",
                    justifyContent: "center",
                    boxSizing: "border-box"
                  }}
                >
                  {activeTab === "auditoria"
                    ? "Iniciar auditoria"
                    : "Verificar contraste"}
                </button>
              )}
            </div>
          )}
        </footer>
      )}
    </div>
  );
}

export default InitialContent;
