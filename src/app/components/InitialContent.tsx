import React from "react";
import SettingsPanel from "./SettingsPanel";

function InitialContent(props) {
  const [settingsPanelVisible, setSettingsPanelVisible] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("auditoria"); // 'auditoria' ou 'acessibilidade'
  const [accessibilityTab, setAccessibilityTab] = React.useState("contrast"); // 'contrast' ou 'docs'

  return (
    <div className="initial-content-root">
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
      <div className="initial-content-main">
        {activeTab === "auditoria" && (
          <React.Fragment>
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
                      d="M12 16V12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12 8H12.01"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="feature-content">
                  <h3 className="feature-title">Verificação</h3>
                  <p className="feature-description">
                    Cores, tipografia e espaçamento
                  </p>
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
                  <p className="feature-description">Sugestões automáticas</p>
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
                  <p className="feature-description">Ir para elementos</p>
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
          </React.Fragment>
        )}
        {activeTab === "acessibilidade" && (
          <div style={{ width: "100%", maxWidth: 520, margin: "0 auto" }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
              <button
                className={`pill${
                  accessibilityTab === "contrast" ? " selected" : ""
                }`}
                style={{
                  background:
                    accessibilityTab === "contrast"
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
                onClick={() => setAccessibilityTab("contrast")}
              >
                Contrast checker
              </button>
              <button
                className={`pill${
                  accessibilityTab === "docs" ? " selected" : ""
                }`}
                style={{
                  background:
                    accessibilityTab === "docs"
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
                onClick={() => setAccessibilityTab("docs")}
              >
                Consultar documentações
              </button>
            </div>
            <div style={{ minHeight: 220 }}>
              {accessibilityTab === "contrast" && (
                <div
                  style={{ color: "#fff", textAlign: "center", padding: 32 }}
                >
                  <h3
                    style={{
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 18,
                      marginBottom: 16
                    }}
                  >
                    Contrast Checker
                  </h3>
                  <p style={{ color: "#bdbdbd", fontSize: 14 }}>
                    Ferramenta para checar contraste de cores. (Em breve)
                  </p>
                </div>
              )}
              {accessibilityTab === "docs" && (
                <div
                  style={{ color: "#fff", textAlign: "center", padding: 32 }}
                >
                  <h3
                    style={{
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 18,
                      marginBottom: 16
                    }}
                  >
                    Documentações de Acessibilidade
                  </h3>
                  <ul
                    style={{
                      color: "#bdbdbd",
                      fontSize: 14,
                      textAlign: "left",
                      maxWidth: 400,
                      margin: "0 auto"
                    }}
                  >
                    <li>
                      <a
                        href="https://www.w3.org/WAI/standards-guidelines/wcag/"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#3b82f6" }}
                      >
                        WCAG - Web Content Accessibility Guidelines
                      </a>
                    </li>
                    <li>
                      <a
                        href="https://contrast-ratio.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#3b82f6" }}
                      >
                        Contrast Ratio Checker
                      </a>
                    </li>
                    <li>
                      <a
                        href="https://www.a11yproject.com/checklist/"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#3b82f6" }}
                      >
                        A11Y Project Checklist
                      </a>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {activeTab === "auditoria" && (
        <footer className="initial-content-footer">
          <button
            className="button button--primary"
            onClick={props.onHandleRunApp}
            disabled={!props.isFrameSelected}
          >
            Iniciar auditoria
          </button>
        </footer>
      )}
    </div>
  );
}

export default InitialContent;
