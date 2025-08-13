import * as React from "react";
import { motion } from "framer-motion/dist/framer-motion";
import PanelHeader from "./PanelHeader";
import AnalysisResultsCard from "./AnalysisResultsCard";
import "../styles/panel.css";

function SettingsPanel(props) {
  const [loading, setLoading] = React.useState(false);
  const [libs, setLibs] = React.useState(props.activeComponentLibraries || []);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [accessCode, setAccessCode] = React.useState("");
  const [error, setError] = React.useState("");

  // Estado para controle do fluxo de importação de bibliotecas
  const [showLibSelection, setShowLibSelection] = React.useState(false);
  const [availableLibs, setAvailableLibs] = React.useState([]); // bibliotecas detectadas
  const [selectedLibs, setSelectedLibs] = React.useState([]); // bibliotecas marcadas para importar

  // Novo estado para controlar se está na tela de revisão/listagem antes de salvar
  type Step = "select" | "review" | "saved";
  const [step, setStep] = React.useState<Step>("select");

  // Novo estado para controlar se já buscou as bibliotecas
  const [hasFetchedLibs, setHasFetchedLibs] = React.useState(false);

  React.useEffect(() => {
    setLibs(props.activeComponentLibraries || []);
  }, [props.activeComponentLibraries]);

  // Simples verificação de código (pode ser trocado por chamada de API depois)
  function handleLogin(e) {
    e.preventDefault();
    if (accessCode.trim() === "sherlock2024") {
      setIsAuthenticated(true);
      setError("");
    } else {
      setError("Código de acesso inválido.");
    }
  }

  function handleHide() {
    if (props.onHandlePanelVisible) {
      props.onHandlePanelVisible(false);
    }
  }

  // Ao abrir o painel, sempre busca as bibliotecas salvas do plugin para garantir persistência
  React.useEffect(() => {
    if (props.panelVisible && isAuthenticated) {
      fetchUserLibsFromPlugin();
    }
  }, [props.panelVisible, isAuthenticated]);

  // Ao autenticar, inicia no passo de busca, mas só se não houver libs salvas
  React.useEffect(() => {
    if (isAuthenticated) {
      fetchUserLibsFromPlugin();
    }
  }, [isAuthenticated]);

  // Handler para buscar bibliotecas e exibir seleção
  function handleFetchAndShowLibs() {
    setLoading(true);
    function handler(event) {
      const { pluginMessage } = event.data;
      if (pluginMessage && pluginMessage.type === "fetched-token-libraries") {
        setAvailableLibs(pluginMessage.tokenLibraries || []);
        setShowLibSelection(true);
        setLoading(false);
        setHasFetchedLibs(true);
        window.removeEventListener("message", handler);
      }
    }
    window.addEventListener("message", handler);
    parent.postMessage(
      { pluginMessage: { type: "fetch-token-libraries" } },
      "*"
    );
  }

  // Função utilitária para agrupar tokens por subcategoria (antes da barra)
  function groupTokensBySubcategory(tokens) {
    const groups = {};
    tokens.forEach(token => {
      const [group, ...rest] = token.name.split("/");
      if (rest.length > 0) {
        if (!groups[group]) groups[group] = [];
        // Remove o prefixo do nome para exibir só o nome do token
        groups[group].push({ ...token, name: rest.join("/").trim() });
      } else {
        if (!groups["__root__"]) groups["__root__"] = [];
        groups["__root__"].push(token);
      }
    });
    return groups;
  }

  // Accordion para tokens por categoria (estilo Figma, com subcategorias e layout refinado)
  function TokenAccordion({ category, tokens, level = 0 }) {
    const [open, setOpen] = React.useState(false);
    const grouped = groupTokensBySubcategory(tokens);
    const groupKeys = Object.keys(grouped).filter(k => k !== "__root__");
    return (
      <div style={{ width: "100%", paddingLeft: level * 18 }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            display: "flex",
            alignItems: "center",
            width: "100%",
            background: "none",
            border: "none",
            color: "#fff",
            padding: 0,
            cursor: "pointer",
            fontSize: 15,
            fontWeight: 500,
            minHeight: 36,
            marginBottom: 0,
            borderRadius: 0,
            outline: "none",
            transition: "background 0.2s",
            justifyContent: "flex-start"
          }}
        >
          <span
            style={{ display: "flex", alignItems: "center", marginRight: 8 }}
          >
            <img
              src={require("../assets/chevron.svg")}
              alt="expand"
              style={{
                width: 16,
                height: 16,
                filter: "invert(80%)",
                marginRight: 8,
                transition: "transform 0.2s",
                // Chevron right: fechado (rotate(-90deg)), aberto para baixo (rotate(0deg))
                transform: open ? "rotate(0deg)" : "rotate(-90deg)",
                display: "inline-block",
                verticalAlign: "middle"
              }}
            />
            <span style={{ color: "#bdbdbd", fontWeight: 600 }}>
              {category}
            </span>
          </span>
          <span style={{ flex: 1 }} />
          <span style={{ color: "#aaa", fontWeight: 400, fontSize: 14 }}>
            {tokens.length}
          </span>
        </button>
        {open && (
          <ul style={{ listStyle: "none", margin: 0, padding: "0 0 8px 0" }}>
            {/* Tokens sem grupo (sem barra) */}
            {grouped["__root__"] &&
              grouped["__root__"].map((token, i) => {
                // Detecta tipo do token para ícone
                const isTokenText =
                  token.style || token.fontSize || token.fontFamily;
                const isTokenEffect =
                  token.effects ||
                  (category && category.toLowerCase().includes("effect"));
                const isTokenStroke =
                  token.strokeWeight !== undefined ||
                  (category && category.toLowerCase().includes("stroke"));
                const isTokenColor =
                  !isTokenText &&
                  !isTokenEffect &&
                  (token.value !== undefined || token.color !== undefined);
                return (
                  <li
                    key={token.name + i}
                    style={{
                      color: "#fff",
                      fontSize: 13,
                      marginBottom: 2,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      minHeight: 28,
                      padding: "2px 0",
                      paddingLeft: (level + 1) * 18 // recuo visual para tokens conforme o nível
                    }}
                  >
                    {isTokenText && (
                      <img
                        src={require("../assets/text.svg")}
                        alt="text token"
                        style={{
                          width: 18,
                          height: 18,
                          opacity: 0.8,
                          marginRight: 8
                        }}
                      />
                    )}
                    {isTokenColor && (
                      <span
                        style={{
                          display: "inline-block",
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          background: (() => {
                            if (typeof token.value === "string")
                              return token.value;
                            if (typeof token.color === "string")
                              return token.color;
                            const c = token.value || token.color;
                            if (
                              c &&
                              typeof c === "object" &&
                              c.r !== undefined &&
                              c.g !== undefined &&
                              c.b !== undefined
                            ) {
                              const r = Math.round((c.r ?? 0) * 255);
                              const g = Math.round((c.g ?? 0) * 255);
                              const b = Math.round((c.b ?? 0) * 255);
                              const a = c.a !== undefined ? c.a : 1;
                              return `rgba(${r},${g},${b},${a})`;
                            }
                            return "#fff";
                          })(),
                          border: "1.5px solid #222",
                          marginRight: 8
                        }}
                      />
                    )}
                    {isTokenStroke && !isTokenColor && (
                      <img
                        src={require("../assets/stroke.svg")}
                        alt="stroke token"
                        style={{
                          width: 18,
                          height: 18,
                          opacity: 0.8,
                          marginRight: 8,
                          filter: "invert(80%)"
                        }}
                      />
                    )}
                    {isTokenEffect &&
                      !isTokenText &&
                      !isTokenColor &&
                      !isTokenStroke && (
                        <img
                          src={require("../assets/drop-shadow.svg")}
                          alt="effect token"
                          style={{
                            width: 18,
                            height: 18,
                            opacity: 0.8,
                            marginRight: 8,
                            filter: "invert(80%)"
                          }}
                        />
                      )}
                    <span>{token.name}</span>
                    {token.info && (
                      <span
                        style={{
                          color: "#bdbdbd",
                          fontSize: 12,
                          marginLeft: 8
                        }}
                      >
                        {token.info}
                      </span>
                    )}
                  </li>
                );
              })}
            {/* Grupos de subcategoria (accordion aninhado) */}
            {groupKeys.map(group => (
              <li key={group} style={{ padding: 0, margin: 0 }}>
                <TokenAccordion
                  category={group}
                  tokens={grouped[group]}
                  level={level + 1}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  // Alterna seleção de biblioteca
  function toggleLib(lib) {
    setSelectedLibs(prev => {
      const exists = prev.find(l => l.name === lib.name);
      if (exists) {
        return prev.filter(l => l.name !== lib.name);
      } else {
        return [...prev, lib];
      }
    });
  }

  // Salva configuração no localStorage (ATENÇÃO: para persistência real em Figma, use figma.clientStorage no controller/plugin)
  function saveLibsConfig(libs) {
    // Envia para o plugin salvar no clientStorage
    parent.postMessage(
      { pluginMessage: { type: "save-user-libs", libs } },
      "*"
    );
  }

  // Listener para resposta do plugin ao salvar libs
  React.useEffect(() => {
    function handleUserLibsSaved(event) {
      const { pluginMessage } = event.data;
      if (pluginMessage && pluginMessage.type === "user-libs-saved") {
        setLoading(false);
        setStep("saved");
        // Após salvar, busca do plugin para garantir sincronismo
        fetchUserLibsFromPlugin();
      }
    }
    window.addEventListener("message", handleUserLibsSaved);
    return () => window.removeEventListener("message", handleUserLibsSaved);
  }, []);

  // Recupera configuração do localStorage
  // function getSavedLibsConfig() {
  //   try {
  //     return (
  //       JSON.parse(window.localStorage.getItem("sherlock_selected_libs")) || []
  //     );
  //   } catch {
  //     return [];
  //   }
  // }

  // Solicita ao plugin as bibliotecas salvas no clientStorage
  function fetchUserLibsFromPlugin() {
    parent.postMessage({ pluginMessage: { type: "get-user-libs" } }, "*");
  }

  // Listener para resposta do plugin ao carregar libs do clientStorage
  React.useEffect(() => {
    function handleUserLibsLoaded(event) {
      const { pluginMessage } = event.data;
      if (pluginMessage && pluginMessage.type === "user-libs-loaded") {
        const libsFromPlugin = pluginMessage.libs || [];
        console.log("[SettingsPanel] libsFromPlugin recebido:", libsFromPlugin);
        setLibs(libsFromPlugin);
        setShowLibSelection(false);
        setAvailableLibs([]);
        setSelectedLibs([]);
        setLoading(false);
        if (libsFromPlugin.length > 0) {
          setStep("saved");
          setHasFetchedLibs(true);
        } else {
          setStep("select");
          setHasFetchedLibs(false);
        }
      }
    }
    window.addEventListener("message", handleUserLibsLoaded);
    return () => window.removeEventListener("message", handleUserLibsLoaded);
  }, []);

  // Adiciona bibliotecas selecionadas e vai para revisão
  function handleAddSelectedLibs() {
    setStep("review");
    setLibs(selectedLibs);
    setShowLibSelection(false);
    setLoading(false); // Garante que não fique travado
  }

  // Salva configuração no plugin e localStorage
  function handleSaveLibsConfig() {
    setLoading(true);
    saveLibsConfig(libs);
  }

  // Função para resetar as bibliotecas salvas no plugin
  function handleResetUserLibs() {
    setLoading(true);
    // Limpa o clientStorage do plugin e só então volta para o início
    function handler(event) {
      const { pluginMessage } = event.data;
      if (
        pluginMessage &&
        pluginMessage.type === "user-libs-saved" &&
        pluginMessage.success
      ) {
        setStep("select");
        setLibs([]);
        setSelectedLibs([]);
        setShowLibSelection(false);
        setHasFetchedLibs(false);
        setLoading(false);
        window.removeEventListener("message", handler);
      }
    }
    window.addEventListener("message", handler);
    parent.postMessage(
      { pluginMessage: { type: "save-user-libs", libs: [] } },
      "*"
    );
  }

  // Renderiza o painel normalmente, mas exibe o campo de acesso no topo se não autenticado
  return (
    <React.Fragment>
      <motion.div
        className="panel info-panel-root settings-panel-root"
        initial={{ opacity: 0, x: "100%" }}
        animate={props.panelVisible ? "open" : "closed"}
        transition={{ duration: 0.3, type: "tween" }}
        variants={{
          open: { opacity: 1, x: 0 },
          closed: { opacity: 0, x: "100%" }
        }}
        key="settings-panel"
      >
        <PanelHeader
          title={"Bibliotecas de Tokens Detectadas"}
          handleHide={handleHide}
        />
        <div
          className="info-panel-content settings-panel-content"
          style={{
            padding: "24px 16px 0 16px",
            minHeight: "calc(100vh - 56px)",
            display: !isAuthenticated ? "flex" : undefined,
            flexDirection: !isAuthenticated ? "column" : undefined,
            alignItems: !isAuthenticated ? "center" : undefined,
            justifyContent: !isAuthenticated ? "center" : undefined
          }}
        >
          {/* Campo de acesso no topo se não autenticado */}
          {!isAuthenticated && (
            <form
              onSubmit={handleLogin}
              style={{
                width: "100%",
                maxWidth: 340,
                borderRadius: 10,
                boxShadow: "0 2px 12px #0002",
                padding: 24,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                background: "none",
                margin: 0,
                transform: "translateY(-32px)"
              }}
            >
              {/* Removido ícone acima do título */}
              <h3
                style={{
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 18,
                  margin: 0,
                  marginBottom: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}
              >
                Acesso restrito{" "}
                <span role="img" aria-label="cadeado">
                  🔓
                </span>
              </h3>
              <input
                type="password"
                placeholder="Digite o código de acesso"
                value={accessCode}
                onChange={e => setAccessCode(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 6,
                  border: "1px solid #444",
                  background: "#181818",
                  color: "#fff",
                  fontSize: 15,
                  marginBottom: 4
                }}
                autoFocus
                disabled={isAuthenticated}
              />
              {error && (
                <div style={{ color: "#ff6b6b", fontSize: 14 }}>{error}</div>
              )}
              <button
                type="submit"
                style={{
                  width: "100%",
                  background: "#3b82f6",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  padding: "10px 0",
                  fontWeight: 600,
                  fontSize: 15,
                  cursor: "pointer",
                  marginTop: 4
                }}
                disabled={isAuthenticated}
              >
                Entrar
              </button>
            </form>
          )}
          {/* Passo 1: Tela de buscar bibliotecas */}
          {isAuthenticated &&
            !hasFetchedLibs &&
            step === "select" &&
            !showLibSelection && (
              <div
                style={{
                  width: "100%",
                  maxWidth: 520,
                  margin: "0 auto",
                  height: "60vh",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center"
                }}
              >
                <div
                  style={{
                    color: "#aaa",
                    fontSize: 15,
                    textAlign: "center",
                    padding: 24
                  }}
                >
                  Busque as bibliotecas para importar dos dados.
                </div>
              </div>
            )}
          {/* Passo 2: Seleção de bibliotecas */}
          {isAuthenticated &&
            hasFetchedLibs &&
            showLibSelection &&
            step === "select" && (
              <div style={{ width: "100%", maxWidth: 520, margin: "0 auto" }}>
                {/* Título com padrão do sistema (igual 'Sobre o Sherlock') */}
                <h3
                  style={{
                    color: "#fff",
                    fontWeight: 700,
                    marginBottom: 24,
                    letterSpacing: 0,
                    lineHeight: "28px"
                  }}
                >
                  Selecione as bibliotecas para importar
                </h3>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {availableLibs.map((lib, idx) => {
                    const selected = selectedLibs.find(
                      l => l.name === lib.name
                    );
                    return (
                      <li
                        key={lib.name + idx}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          background: "rgba(60,60,60,0.5)",
                          borderRadius: 8,
                          marginBottom: 20,
                          padding: 16,
                          boxShadow: "none",
                          border: "1px solid rgba(255,255,255,0.1)"
                        }}
                      >
                        {/* Área do ícone aumentada, centralizada, afastada do texto */}
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 8,
                            background: "#f3f4f6",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            marginRight: 20
                          }}
                        >
                          <img
                            src={
                              lib.thumb ||
                              lib.image ||
                              require("../assets/library.svg")
                            }
                            alt={lib.name}
                            style={{
                              width: 28,
                              height: 28,
                              objectFit: "contain",
                              display: "block"
                            }}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              color: "#fff",
                              fontWeight: 700,
                              fontSize: 16
                            }}
                          >
                            {lib.name}
                          </div>
                          <div
                            style={{
                              color: "#bdbdbd",
                              fontSize: 13,
                              marginTop: 2
                            }}
                          >
                            {lib.author || lib.provider || "Desconhecido"}
                          </div>
                        </div>
                        <button
                          onClick={() => toggleLib(lib)}
                          style={{
                            minWidth: 100,
                            height: 40,
                            borderRadius: 8,
                            border: "none", // removido o stroke
                            background: selected
                              ? "rgba(34,197,94,0.13)"
                              : "transparent",
                            color: "#fff",
                            fontWeight: 700,
                            fontSize: 15,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8,
                            cursor: "pointer",
                            transition: "background 0.2s",
                            outline: "none",
                            boxShadow: "none",
                            position: "relative",
                            padding: "0 22px",
                            marginLeft: 8
                          }}
                          onMouseEnter={e => {
                            if (selected) {
                              e.currentTarget.style.background =
                                "rgba(239,68,68,0.13)"; // vermelho opaco
                            } else {
                              e.currentTarget.style.background =
                                "rgba(255,255,255,0.08)";
                            }
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = selected
                              ? "rgba(34,197,94,0.13)"
                              : "transparent";
                          }}
                        >
                          {selected ? <>Remover</> : <>Adicionar</>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          {/* Passo 3: Revisão/listagem dos tokens antes de salvar */}
          {isAuthenticated && !showLibSelection && step === "review" && (
            <>
              {libs.length > 0 && (
                <div style={{ marginBottom: 20, width: "100%" }}>
                  <AnalysisResultsCard
                    projectName={libs[0].name}
                    analysisDate={(
                      (libs[0].fills?.length || 0) +
                      (libs[0].text?.length || 0) +
                      (libs[0].effects?.length || 0) +
                      (libs[0].strokes?.length || 0)
                    ).toString()}
                  />
                </div>
              )}
              {libs.length > 0 ? (
                <ul
                  className="library-list"
                  style={{ width: "100%", padding: 0, margin: 0 }}
                >
                  {libs.map((lib, idx) => (
                    <li
                      key={lib.name + idx}
                      className="library-list-item"
                      style={{
                        flexDirection: "column",
                        alignItems: "flex-start",
                        background: "none",
                        borderRadius: 0,
                        marginBottom: 0,
                        padding: 0,
                        width: "100%",
                        border: "none"
                      }}
                    >
                      <div
                        className="library-list-item-content"
                        style={{ color: "#fff", width: "100%", padding: 0 }}
                      >
                        <div style={{ width: "100%" }}>
                          {lib.text && lib.text.length > 0 && (
                            <TokenAccordion
                              category="Text styles"
                              tokens={lib.text}
                            />
                          )}
                          {lib.fills && lib.fills.length > 0 && (
                            <TokenAccordion
                              category="Color styles"
                              tokens={lib.fills}
                            />
                          )}
                          {lib.effects && lib.effects.length > 0 && (
                            <TokenAccordion
                              category="Effect styles"
                              tokens={lib.effects}
                            />
                          )}
                          {lib.strokes && lib.strokes.length > 0 && (
                            <TokenAccordion
                              category="Stroke styles"
                              tokens={lib.strokes}
                            />
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div
                  style={{
                    color: "#aaa",
                    fontSize: 13,
                    marginBottom: 8,
                    textAlign: "center",
                    padding: 24
                  }}
                >
                  Nenhuma biblioteca selecionada.
                </div>
              )}
            </>
          )}
          {/* Passo 4: Listagem dos tokens já salvos (padrão) */}
          {isAuthenticated && !showLibSelection && step === "saved" && (
            <>
              {/* Card de identificação do projeto e resumo de tokens */}
              {libs.length > 0 && (
                <div style={{ marginBottom: 20, width: "100%" }}>
                  <AnalysisResultsCard
                    projectName={libs[0].name}
                    analysisDate={(
                      (libs[0].fills?.length || 0) +
                      (libs[0].text?.length || 0) +
                      (libs[0].effects?.length || 0) +
                      (libs[0].strokes?.length || 0)
                    ).toString()}
                  />
                </div>
              )}
              {libs.length > 0 ? (
                <ul
                  className="library-list"
                  style={{ width: "100%", padding: 0, margin: 0 }}
                >
                  {libs.map((lib, idx) => (
                    <li
                      key={lib.name + idx}
                      className="library-list-item"
                      style={{
                        flexDirection: "column",
                        alignItems: "flex-start",
                        background: "none",
                        borderRadius: 0,
                        marginBottom: 0,
                        padding: 0,
                        width: "100%",
                        border: "none"
                      }}
                    >
                      <div
                        className="library-list-item-content"
                        style={{ color: "#fff", width: "100%", padding: 0 }}
                      >
                        <div style={{ width: "100%" }}>
                          {lib.text && lib.text.length > 0 && (
                            <TokenAccordion
                              category="Text styles"
                              tokens={lib.text}
                            />
                          )}
                          {lib.fills && lib.fills.length > 0 && (
                            <TokenAccordion
                              category="Color styles"
                              tokens={lib.fills}
                            />
                          )}
                          {lib.effects && lib.effects.length > 0 && (
                            <TokenAccordion
                              category="Effect styles"
                              tokens={lib.effects}
                            />
                          )}
                          {lib.strokes && lib.strokes.length > 0 && (
                            <TokenAccordion
                              category="Stroke styles"
                              tokens={lib.strokes}
                            />
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div
                  style={{
                    color: "#aaa",
                    fontSize: 13,
                    marginBottom: 8,
                    textAlign: "center",
                    padding: 24
                  }}
                >
                  Busque as biblioteca para configurar o sistema.
                </div>
              )}
            </>
          )}
        </div>
        {/* Footer dinâmico */}
        <footer
          className="initial-content-footer"
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            width: "100vw",
            background: "#2a2a2a",
            borderTop: "1px solid #4f4f4f",
            zIndex: 100,
            padding: "16px"
          }}
        >
          {/* Passo 1: Buscar bibliotecas */}
          {isAuthenticated &&
          !hasFetchedLibs &&
          step === "select" &&
          !showLibSelection ? (
            <button
              className="button button--primary button--full"
              style={{
                width: "100%",
                fontWeight: 600,
                fontSize: 15,
                margin: 0,
                background: loading ? "rgba(255,255,255,0.16)" : "#3b82f6",
                color: "#fff",
                transition: "background 0.2s",
                opacity: loading ? 0.7 : 1,
                cursor: loading ? "not-allowed" : "pointer"
              }}
              onClick={handleFetchAndShowLibs}
              disabled={loading}
            >
              {loading ? "Buscando..." : "Buscar bibliotecas"}
            </button>
          ) : isAuthenticated &&
            hasFetchedLibs &&
            showLibSelection &&
            step === "select" ? (
            <button
              className="button button--primary button--full"
              style={{
                width: "100%",
                fontWeight: 600,
                fontSize: 15,
                margin: 0,
                background:
                  selectedLibs.length === 0 || loading
                    ? "rgba(255,255,255,0.16)"
                    : "#3b82f6",
                color: "#fff",
                transition: "background 0.2s",
                cursor:
                  selectedLibs.length === 0 || loading
                    ? "not-allowed"
                    : "pointer",
                opacity: selectedLibs.length === 0 || loading ? 0.7 : 1
              }}
              onClick={handleAddSelectedLibs}
              disabled={selectedLibs.length === 0 || loading}
            >
              {loading ? "Carregando..." : "Adicionar bibliotecas"}
            </button>
          ) : isAuthenticated && !showLibSelection && step === "review" ? (
            <button
              className="button button--primary button--full"
              style={{
                width: "100%",
                fontWeight: 600,
                fontSize: 15,
                margin: 0,
                background: loading ? "rgba(255,255,255,0.16)" : "#3b82f6",
                color: "#fff",
                transition: "background 0.2s",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1
              }}
              onClick={handleSaveLibsConfig}
              disabled={loading}
            >
              {loading ? "Salvando..." : "Salvar configurações"}
            </button>
          ) : isAuthenticated &&
            !showLibSelection &&
            step === "saved" &&
            libs.length > 0 ? (
            <button
              className="button button--primary button--full"
              style={{
                width: "100%",
                fontWeight: 600,
                fontSize: 15,
                margin: 0,
                background: "rgba(239,68,68,0.13)",
                color: "#ef4444",
                transition: "background 0.2s"
              }}
              onClick={handleResetUserLibs}
              disabled={loading}
            >
              {loading ? "Resetando..." : "Resetar configurações"}
            </button>
          ) : isAuthenticated &&
            !showLibSelection &&
            step === "saved" &&
            libs.length === 0 ? (
            <button
              className="button button--primary button--full"
              style={{
                width: "100%",
                fontWeight: 600,
                fontSize: 15,
                margin: 0,
                background: "#3b82f6",
                color: "#fff",
                transition: "background 0.2s"
              }}
              onClick={handleFetchAndShowLibs}
              disabled={loading}
            >
              {loading ? "Buscando..." : "Buscar bibliotecas"}
            </button>
          ) : null}
        </footer>
      </motion.div>
    </React.Fragment>
  );
}

export default React.memo(SettingsPanel);
