import * as React from "react";
import { motion } from "framer-motion/dist/framer-motion";
import PanelHeader from "./PanelHeader";
import AnalysisResultsCard from "./AnalysisResultsCard";
import "../styles/panel.css";

interface SettingsPanelProps {
  panelVisible: boolean;
  onHandlePanelVisible: (visible: boolean) => void;
  borderRadiusValues: number[];
  designTokens: any;
  lintVectors?: boolean;
  updateLintRules?: (rules: any) => void;
  ignoredErrorArray?: any[];
  libraries?: any[];
  onUpdateLibraries?: (libraries: any[]) => void;
  localStyles?: any;
  activeComponentLibraries?: any[];
}

function SettingsPanel(props: SettingsPanelProps) {
  const [loading, setLoading] = React.useState(false);
  const [libs, setLibs] = React.useState<any[]>([]);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [accessCode, setAccessCode] = React.useState("");
  const [error, setError] = React.useState("");

  // Estado para controle do fluxo de importação de bibliotecas
  const [showLibSelection, setShowLibSelection] = React.useState(false);
  const [availableLibs, setAvailableLibs] = React.useState<any[]>([]); // bibliotecas detectadas
  const [selectedLibs, setSelectedLibs] = React.useState<any[]>([]); // bibliotecas marcadas para importar

  // Novo estado para controlar se está na tela de revisão/listagem antes de salvar
  type Step = "select" | "review" | "saved";
  const [step, setStep] = React.useState<Step>("select");

  // Novo estado para controlar se já buscou as bibliotecas
  const [hasFetchedLibs, setHasFetchedLibs] = React.useState(false);
  const [isSavingTokens, setIsSavingTokens] = React.useState(false);
  const [isLoadingTokens, setIsLoadingTokens] = React.useState(false);
  const [saveStatus, setSaveStatus] = React.useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [savedTokens, setSavedTokens] = React.useState<any[]>([]);

  // Remover a inicialização com activeComponentLibraries - as bibliotecas devem vir do clientStorage
  // React.useEffect(() => {
  //   setLibs(props.activeComponentLibraries || []);
  // }, [props.activeComponentLibraries]);

  // Função para carregar os tokens salvos
  const handleLoadSavedTokens = async () => {
    setIsLoadingTokens(true);
    setSaveStatus(null);

    try {
      parent.postMessage({ pluginMessage: { type: "load-saved-tokens" } }, "*");
    } catch (error) {
      console.error("Erro ao carregar tokens:", error);
      setSaveStatus({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Erro ao carregar tokens salvos"
      });
      setIsLoadingTokens(false);
    }
  };

  // Função para salvar os tokens de design
  const handleSaveDesignTokens = async () => {
    if (!props.designTokens) {
      setSaveStatus({
        success: false,
        message: "Nenhum token de design encontrado"
      });
      return;
    }

    setIsSavingTokens(true);
    setSaveStatus(null);

    try {
      parent.postMessage(
        {
          pluginMessage: {
            type: "save-design-tokens",
            tokens: props.designTokens
          }
        },
        "*"
      );
    } catch (error) {
      console.error("Erro ao salvar tokens:", error);
      setSaveStatus({
        success: false,
        message:
          error instanceof Error ? error.message : "Erro ao salvar tokens"
      });
      setIsSavingTokens(false);
    }
  };

  // Listener para mensagens do plugin
  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data.pluginMessage as {
        type: string;
        success: boolean;
        message?: string;
        tokens?: any[];
      };

      if (!message) return;

      if (message.type === "saved-tokens-loaded") {
        setIsLoadingTokens(false);
        if (message.success) {
          setSavedTokens(message.tokens || []);
          setSaveStatus({
            success: true,
            message: `Carregados ${message.tokens?.length ||
              0} conjuntos de tokens`
          });
        } else {
          setSaveStatus({
            success: false,
            message: message.message || "Falha ao carregar tokens salvos"
          });
        }
      } else if (message.type === "design-tokens-saved") {
        setIsSavingTokens(false);
        setSaveStatus({
          success: message.success,
          message:
            message.message ||
            (message.success
              ? "Tokens salvos com sucesso"
              : "Falha ao salvar tokens")
        });
        if (message.success && message.tokens) {
          setSavedTokens(message.tokens);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  // Simples verificação de código (pode ser trocado por chamada de API depois)
  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (accessCode.trim() === "solarops2024") {
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
        const tokenLibraries = pluginMessage.tokenLibraries || [];
        console.log(
          "[SettingsPanel] Token libraries detectadas:",
          tokenLibraries
        );
        console.log(
          "[SettingsPanel] Número de bibliotecas detectadas:",
          tokenLibraries.length
        );
        if (tokenLibraries.length > 0) {
          console.log(
            "[SettingsPanel] Estrutura da primeira biblioteca detectada:",
            {
              name: tokenLibraries[0].name,
              fillsCount: tokenLibraries[0].fills?.length || 0,
              textCount: tokenLibraries[0].text?.length || 0,
              effectsCount: tokenLibraries[0].effects?.length || 0
            }
          );
        }

        setAvailableLibs(tokenLibraries);
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
            <svg
              width={16}
              height={16}
              viewBox="0 0 16 16"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              style={{
                width: 16,
                height: 16,
                marginRight: 8,
                transition: "transform 0.2s",
                // Chevron right: fechado (rotate(-90deg)), aberto para baixo (rotate(0deg))
                transform: open ? "rotate(0deg)" : "rotate(-90deg)",
                display: "inline-block",
                verticalAlign: "middle"
              }}
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M7.46899 10.6486L2.96899 6.36285L4.03099 5.35143L7.99999 9.13285L11.969 5.35143L13.031 6.36285L8.53099 10.6486L7.99999 11.1529L7.46899 10.6486Z"
                fill="#BDBDBD"
              />
            </svg>
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
  function toggleLib(lib: any) {
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
    console.log("[SettingsPanel] saveLibsConfig chamado. Bibliotecas:", libs);
    console.log(
      "[SettingsPanel] Número de bibliotecas para salvar:",
      libs.length
    );
    if (libs.length > 0) {
      console.log(
        "[SettingsPanel] Estrutura da primeira biblioteca para salvar:",
        {
          name: libs[0].name,
          fillsCount: libs[0].fills?.length || 0,
          textCount: libs[0].text?.length || 0,
          effectsCount: libs[0].effects?.length || 0
        }
      );
    }

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
        console.log(
          "[SettingsPanel] Número de bibliotecas carregadas:",
          libsFromPlugin.length
        );
        if (libsFromPlugin.length > 0) {
          console.log(
            "[SettingsPanel] Estrutura da primeira biblioteca carregada:",
            {
              name: libsFromPlugin[0].name,
              fillsCount: libsFromPlugin[0].fills?.length || 0,
              textCount: libsFromPlugin[0].text?.length || 0,
              effectsCount: libsFromPlugin[0].effects?.length || 0
            }
          );
        }
        setLibs(libsFromPlugin);
        setShowLibSelection(false);
        setAvailableLibs([]);
        setSelectedLibs([]);
        setLoading(false);

        // CRÍTICO: Comunicar as bibliotecas de volta para o App
        if (props.onUpdateLibraries) {
          console.log(
            "[SettingsPanel] Atualizando bibliotecas no App:",
            libsFromPlugin
          );
          props.onUpdateLibraries(libsFromPlugin);
        }

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
    console.log(
      "[SettingsPanel] handleAddSelectedLibs chamado. Bibliotecas selecionadas:",
      selectedLibs
    );
    console.log(
      "[SettingsPanel] Número de bibliotecas selecionadas:",
      selectedLibs.length
    );
    if (selectedLibs.length > 0) {
      console.log(
        "[SettingsPanel] Estrutura da primeira biblioteca selecionada:",
        {
          name: selectedLibs[0].name,
          fillsCount: selectedLibs[0].fills?.length || 0,
          textCount: selectedLibs[0].text?.length || 0,
          effectsCount: selectedLibs[0].effects?.length || 0
        }
      );
    }

    setStep("review");
    setLibs(selectedLibs);
    setShowLibSelection(false);
    setLoading(false); // Garante que não fique travado
  }

  // Salva configuração no plugin e localStorage
  async function handleSaveLibsConfig() {
    setLoading(true);
    console.log(
      "[SettingsPanel] handleSaveLibsConfig chamado. Bibliotecas atuais:",
      libs
    );
    console.log("[SettingsPanel] Número de bibliotecas atuais:", libs.length);
    if (libs.length > 0) {
      console.log("[SettingsPanel] Estrutura da primeira biblioteca atual:", {
        name: libs[0].name,
        fillsCount: libs[0].fills?.length || 0,
        textCount: libs[0].text?.length || 0,
        effectsCount: libs[0].effects?.length || 0
      });
    }

    try {
      // CRÍTICO: Comunicar as bibliotecas para o App antes de salvar
      if (props.onUpdateLibraries) {
        console.log(
          "[SettingsPanel] Atualizando bibliotecas no App antes de salvar:",
          libs
        );
        props.onUpdateLibraries(libs);
      }

      // Salvar tokens de design e bibliotecas
      const savePromises: Promise<void>[] = [];

      // 1. Salvar tokens de design se existirem
      if (props.designTokens) {
        console.log("[SettingsPanel] Salvando tokens de design...");
        savePromises.push(
          new Promise<void>((resolve, reject) => {
            const handleSaveResponse = (event: MessageEvent) => {
              const { pluginMessage } = event.data;
              if (
                pluginMessage &&
                pluginMessage.type === "design-tokens-saved"
              ) {
                window.removeEventListener("message", handleSaveResponse);
                if (pluginMessage.success) {
                  console.log(
                    "[SettingsPanel] Tokens de design salvos com sucesso"
                  );
                  resolve();
                } else {
                  console.error(
                    "[SettingsPanel] Erro ao salvar tokens de design:",
                    pluginMessage.message
                  );
                  reject(new Error(pluginMessage.message));
                }
              }
            };

            window.addEventListener("message", handleSaveResponse);

            parent.postMessage(
              {
                pluginMessage: {
                  type: "save-design-tokens",
                  tokens: props.designTokens
                }
              },
              "*"
            );

            // Timeout para garantir que não fique travado
            setTimeout(() => resolve(), 5000);
          })
        );
      }

      // 2. Salvar bibliotecas de tokens
      if (libs && libs.length > 0) {
        console.log("[SettingsPanel] Salvando bibliotecas de tokens...");
        savePromises.push(
          new Promise<void>((resolve, reject) => {
            const handleSaveResponse = (event: MessageEvent) => {
              const { pluginMessage } = event.data;
              if (
                pluginMessage &&
                pluginMessage.type === "library-tokens-saved"
              ) {
                window.removeEventListener("message", handleSaveResponse);
                if (pluginMessage.success) {
                  console.log(
                    `[SettingsPanel] Biblioteca de tokens salva com sucesso em: ${pluginMessage.filePath}`
                  );
                  resolve();
                } else {
                  console.error(
                    "[SettingsPanel] Erro ao salvar biblioteca de tokens:",
                    pluginMessage.message
                  );
                  // Não rejeitamos a promise para não interromper o fluxo
                  resolve();
                }
              }
            };

            window.addEventListener("message", handleSaveResponse);

            // Gerar um nome amigável para o arquivo baseado nas bibliotecas
            const libNames = libs
              .map(lib => lib.name.replace(/[^a-z0-9]/gi, "_").toLowerCase())
              .join("_");
            const filename = `libraries_${libNames ||
              "all"}_${new Date().getTime()}`;

            parent.postMessage(
              {
                pluginMessage: {
                  type: "save-library-tokens",
                  libraries: libs,
                  filename: filename
                }
              },
              "*"
            );

            // Timeout para garantir que não fique travado
            setTimeout(resolve, 5000);
          })
        );
      }

      // Aguardar todas as operações de salvamento
      if (savePromises.length > 0) {
        await Promise.all(savePromises);
      }

      // Salvar as bibliotecas
      saveLibsConfig(libs);
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      // Tratar erro conforme necessário
    } finally {
      setLoading(false);
    }
  }

  // Função para resetar as bibliotecas salvas no plugin
  function handleResetUserLibs() {
    console.log("[SettingsPanel] handleResetUserLibs chamado");
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

        // CRÍTICO: Comunicar o reset das bibliotecas para o App
        if (props.onUpdateLibraries) {
          console.log("[SettingsPanel] Resetando bibliotecas no App");
          props.onUpdateLibraries([]);
        }

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
        <PanelHeader title={"Configurações das libs"} handleHide={handleHide} />
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
                {/* Título com padrão do sistema (igual 'o infopainel') */}
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
                      (libs[0].strokes?.length || 0) +
                      (libs[0].gaps?.length || 0) +
                      (libs[0].paddings?.length || 0) +
                      (libs[0].strokeWidths?.length || 0) +
                      (libs[0].grids?.length || 0)
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
                          {lib.gaps && lib.gaps.length > 0 && (
                            <TokenAccordion
                              category="Spacing Gaps"
                              tokens={lib.gaps}
                            />
                          )}
                          {lib.paddings && lib.paddings.length > 0 && (
                            <TokenAccordion
                              category="Spacing Paddings"
                              tokens={lib.paddings}
                            />
                          )}
                          {lib.strokeWidths && lib.strokeWidths.length > 0 && (
                            <TokenAccordion
                              category="Stroke Widths"
                              tokens={lib.strokeWidths}
                            />
                          )}
                          {lib.grids && lib.grids.length > 0 && (
                            <TokenAccordion
                              category="Grids"
                              tokens={lib.grids}
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
                      (libs[0].strokes?.length || 0) +
                      (libs[0].gaps?.length || 0) +
                      (libs[0].paddings?.length || 0) +
                      (libs[0].strokeWidths?.length || 0) +
                      (libs[0].grids?.length || 0)
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
                          {lib.gaps && lib.gaps.length > 0 && (
                            <TokenAccordion
                              category="Spacing Gaps"
                              tokens={lib.gaps}
                            />
                          )}
                          {lib.paddings && lib.paddings.length > 0 && (
                            <TokenAccordion
                              category="Spacing Paddings"
                              tokens={lib.paddings}
                            />
                          )}
                          {lib.strokeWidths && lib.strokeWidths.length > 0 && (
                            <TokenAccordion
                              category="Stroke Widths"
                              tokens={lib.strokeWidths}
                            />
                          )}
                          {lib.grids && lib.grids.length > 0 && (
                            <TokenAccordion
                              category="Grids"
                              tokens={lib.grids}
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
