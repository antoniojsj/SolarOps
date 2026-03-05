import React, { useState, useCallback } from "react";
import SettingsPanel from "./SettingsPanel";
import DocumentationSearch from "./DocumentationSearch";
import ContrastChecker from "./ContrastChecker";
import Tools from "./ToolsTab";
import WCAGContent from "./WCAGContent";

function InitialContent(props) {
  const [settingsPanelVisible, setSettingsPanelVisible] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("auditoria"); // 'auditoria', 'acessibilidade' ou 'tools'
  const [accessibilityTab, setAccessibilityTab] = React.useState("contrast"); // 'contrast' ou 'docs'
  const [selectedNode, setSelectedNode] = React.useState<any>(null);
  const [isCheckingContrast, setIsCheckingContrast] = React.useState(false);

  // Verificar se há bibliotecas/tokens importados
  const hasTokensImported = React.useMemo(() => {
    if (!props.libraries || props.libraries.length === 0) {
      console.log("[InitialContent] Sem bibliotecas recebidas");
      return false;
    }

    const hasValidLibrary = props.libraries.some(lib => {
      // Verificar diferentes estruturas possíveis de tokens
      const hasFills =
        (lib.fills && lib.fills.length > 0) ||
        (lib.paints && lib.paints.length > 0);
      const hasText =
        (lib.text && lib.text.length > 0) ||
        (lib.textStyles && lib.textStyles.length > 0);
      const hasEffects =
        (lib.effects && lib.effects.length > 0) ||
        (lib.effectStyles && lib.effectStyles.length > 0);

      // Verificar outras propriedades que podem conter tokens
      const hasStrokes = lib.strokes && lib.strokes.length > 0;
      const hasGaps = lib.gaps && lib.gaps.length > 0;
      const hasPaddings = lib.paddings && lib.paddings.length > 0;
      const hasRadius = lib.radius && lib.radius.length > 0;

      // Verificar se a biblioteca tem qualquer propriedade com tokens
      const hasAnyTokens =
        hasFills ||
        hasText ||
        hasEffects ||
        hasStrokes ||
        hasGaps ||
        hasPaddings ||
        hasRadius;

      // Verificar também se há tokens em propriedades aninhadas
      const hasNestedTokens = Object.keys(lib).some(key => {
        const value = lib[key];
        return Array.isArray(value) && value.length > 0;
      });

      const hasTokens = hasAnyTokens || hasNestedTokens;

      console.log("[InitialContent] Verificando biblioteca:", {
        name: lib.name,
        hasFills,
        hasText,
        hasEffects,
        hasStrokes,
        hasGaps,
        hasPaddings,
        hasRadius,
        hasAnyTokens,
        hasNestedTokens,
        hasTokens,
        fillsCount: lib.fills?.length || lib.paints?.length || 0,
        textCount: lib.text?.length || lib.textStyles?.length || 0,
        effectsCount: lib.effects?.length || lib.effectStyles?.length || 0,
        strokesCount: lib.strokes?.length || 0,
        gapsCount: lib.gaps?.length || 0,
        paddingsCount: lib.paddings?.length || 0,
        // Verificar estrutura completa
        structure: Object.keys(lib),
        // Verificar todas as propriedades com seus valores
        allProps: Object.keys(lib).reduce((acc, key) => {
          acc[key] = Array.isArray(lib[key])
            ? lib[key].length
            : typeof lib[key];
          return acc;
        }, {})
      });

      return hasTokens;
    });

    console.log(
      "[InitialContent] Resultado hasTokensImported:",
      hasValidLibrary
    );
    return hasValidLibrary;
  }, [props.libraries]);

  // Verificar se o botão de auditoria deve estar habilitado
  const canStartAudit = hasTokensImported && selectedNode;

  // Debug logs
  React.useEffect(() => {
    console.log("[InitialContent] Debug - Bibliotecas:", props.libraries);
    console.log(
      "[InitialContent] Debug - hasTokensImported:",
      hasTokensImported
    );
    console.log("[InitialContent] Debug - selectedNode:", selectedNode);
    console.log("[InitialContent] Debug - canStartAudit:", canStartAudit);
  }, [props.libraries, hasTokensImported, selectedNode, canStartAudit]);

  // Log específico para mudanças nas bibliotecas
  React.useEffect(() => {
    console.log("[InitialContent] Bibliotecas atualizadas:", {
      libraries: props.libraries,
      length: props.libraries?.length || 0,
      hasTokensImported,
      timestamp: new Date().toISOString()
    });
  }, [props.libraries]);

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
        } else if (pm.type === "selection-changed") {
          console.log(
            "[InitialContent] Seleção alterada recebida:",
            pm.selection
          );

          // Atualizar o estado com os novos nós selecionados
          if (pm.selection && pm.selection.length > 0) {
            setSelectedNode(pm.selection[0]);
          } else {
            console.log("[InitialContent] Nenhum nó selecionado");
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
    if (activeTab === "acessibilidade") {
      // garantir sub-aba contrast ativa
      if (accessibilityTab === "contrast") {
        setIsCheckingContrast(true);
      }
    } else if (activeTab !== "acessibilidade") {
      // ao sair da aba de acessibilidade, interromper checagem
      setIsCheckingContrast(false);
    }
  }, [activeTab, accessibilityTab]);

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
              background: activeTab === "auditoria" ? "#3b82f6" : "transparent",
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
                activeTab === "acessibilidade" ? "#3b82f6" : "transparent",
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
              activeTab === "tools" ? " selected" : ""
            }`}
            style={{
              background:
                activeTab === "tools"
                  ? "rgba(255,255,255,0.08)"
                  : "transparent",
              color: "#fff",
              padding: "6px 12px",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 500,
              lineHeight: "18px",
              cursor: "pointer"
            }}
            onClick={() => setActiveTab("tools")}
          >
            Tools
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(59, 130, 246, 0.15)",
              color: "#FFFFFF",
              padding: "2px 8px",
              borderRadius: "4px",
              fontSize: "10px",
              fontWeight: 600,
              lineHeight: "18px",
              marginLeft: "8px"
            }}
          >
            v.Alpha
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
              designTokens={props.designTokens}
            />
          )}
        </div>
      </div>
      <div
        className="initial-content-main"
        style={{ flex: 1, overflow: "auto" }}
      >
        {activeTab === "tools" && (
          <div
            style={{
              width: "calc(100% - 32px)",
              height: "100%",
              padding: "24px 0 0",
              margin: "0 16px",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden"
            }}
          >
            <Tools selectedNode={selectedNode} onInspectClick={() => {}} />
          </div>
        )}
        {activeTab === "auditoria" && (
          <div
            style={{
              width: "calc(100% - 32px)",
              margin: "0 16px",
              boxSizing: "border-box"
            }}
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
            <div
              className={`tip-card ${
                hasTokensImported ? "tip-card-success" : "tip-card-info"
              }`}
              style={{
                background: hasTokensImported
                  ? "rgba(34, 197, 94, 0.1)"
                  : "rgba(59, 130, 246, 0.1)",
                border: hasTokensImported
                  ? "1px solid rgba(34, 197, 94, 0.2)"
                  : "1px solid rgba(59, 130, 246, 0.2)",
                borderRadius: "8px",
                padding: "16px",
                marginTop: "24px",
                display: "flex",
                alignItems: "flex-start",
                gap: "12px"
              }}
            >
              <div
                style={{
                  fontSize: "20px",
                  opacity: hasTokensImported ? 0.8 : 1
                }}
              >
                {hasTokensImported ? "✅" : "💡"}
              </div>
              <div style={{ flex: 1 }}>
                <h4
                  className="tip-title"
                  style={{
                    color: hasTokensImported ? "#22C55E" : "#3B82F6",
                    margin: "0 0 8px 0",
                    fontSize: "14px",
                    fontWeight: 600
                  }}
                >
                  {hasTokensImported ? "Biblioteca Importada" : "Importante"}
                </h4>
                <p
                  className="tip-text"
                  style={{
                    color: hasTokensImported
                      ? "rgba(34, 197, 94, 0.9)"
                      : "rgba(255, 255, 255, 0.8)",
                    margin: 0,
                    fontSize: "13px",
                    lineHeight: "1.4"
                  }}
                >
                  {hasTokensImported
                    ? `Biblioteca "${props.libraries[0]?.name ||
                        "Importada"}' está pronta para uso. ${
                        selectedNode
                          ? 'Clique em "Realizar auditoria" para começar.'
                          : "Selecione um objeto para habilitar a auditoria."
                      }`
                    : 'Importe uma biblioteca de tokens primeiro. Selecione um ou mais objetos e depois clique no botão "iniciar análise" para gerar o relatório.'}
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
                      accessibilityTab === "contrast"
                        ? "#3b82f6"
                        : "transparent",
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
                  Contraste
                </button>
                <button
                  onClick={() => setAccessibilityTab("docs")}
                  style={{
                    flex: 1,
                    background:
                      accessibilityTab === "docs" ? "#3b82f6" : "transparent",
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
                  isVisible={true}
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
      {activeTab === "auditoria" && (
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
              onClick={props.onHandleRunApp}
              disabled={!canStartAudit}
              style={{
                background: canStartAudit
                  ? "#18A0FB"
                  : hasTokensImported
                  ? "#4A4A4A"
                  : "#4A4A4A",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                padding: "12px 16px",
                fontSize: "14px",
                fontWeight: 500,
                cursor: canStartAudit ? "pointer" : "not-allowed",
                opacity: canStartAudit ? 1 : 0.6,
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
              {hasTokensImported
                ? selectedNode
                  ? "Realizar auditoria"
                  : "Selecione um objeto"
                : "Importe biblioteca primeiro"}
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}

export default InitialContent;
