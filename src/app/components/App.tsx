import * as React from "react";
import { useState } from "react";

import Navigation from "./Navigation";
import NodeList from "./NodeList";
import LibraryPage from "./LibraryPage";
import StylesPage from "./StylesPage";
import InitialContent from "./InitialContent";
import Panel from "./Panel";
import BulkErrorList from "./BulkErrorList";
import InfoPanel from "./InfoPanel";
import SettingsPanel from "./SettingsPanel";
import DevMode from "./DevMode";

import "../styles/figma.ds.css";
import "../styles/ui.css";
import "../styles/empty-state.css";
import "react-tooltip/dist/react-tooltip.css";

// Definição de tipos para melhorar a tipagem

interface ErrorItem {
  id: string;
  type?: string;
  message?: string;
  node?: {
    id: string;
    name?: string;
    type?: string;
    [key: string]: any;
  };
  errors?: Array<{
    type: string;
    value?: string;
    message: string;
    [key: string]: any;
  }>;
  property?: string;
  value?: any;
  expected?: any;
  [key: string]: any;
}

interface FillStyle {
  type: string;
  color?: {
    r: number;
    g: number;
    b: number;
    a: number;
  };
  opacity?: number;
  visible?: boolean;
  [key: string]: any;
}

type EffectStyle = {
  type: string;
  color?: {
    r: number;
    g: number;
    b: number;
    a: number;
  };
  offset?: { x: number; y: number };
  radius?: number;
  spread?: number;
  visible?: boolean;
  [key: string]: any;
};

interface NodeItem {
  id: string;
  name?: string;
  type?: string;
  fills?: FillStyle[];
  text?: {
    characters?: string;
    style?: {
      fontFamily?: string;
      fontWeight?: number | string;
      fontSize?: number;
      lineHeight?: {
        value: number;
        unit: "PIXELS" | "PERCENT" | "AUTO";
      };
      letterSpacing?: {
        value: number;
        unit: "PIXELS" | "PERCENT";
      };
      [key: string]: any;
    };
    [key: string]: any;
  };
  effects?: EffectStyle[];
  children?: NodeItem[];
  [key: string]: any;
}

const App = ({}) => {
  // Interface ErrorItem movida para o escopo global para ser reutilizada

  interface NodeError {
    id: string;
    errors: Array<{
      type: string;
      value?: string;
      message: string;
      [key: string]: any;
    }>;
    [key: string]: any;
  }

  const [errorArray, setErrorArray] = useState<NodeError[]>([]);
  const [activePage, setActivePage] = useState("page");
  const [ignoredErrorArray, setIgnoreErrorArray] = useState<ErrorItem[]>([]);
  const [activeError, setActiveError] = React.useState<any>({});
  const [selectedNode, setSelectedNode] = React.useState<any>({});
  const [isVisible, setIsVisible] = React.useState(false);
  // Tipagem para o estado do nodeArray
  interface NodeArrayItem {
    id: string;
    name: string;
    type: string;
    children?: NodeArrayItem[];
  }

  const [nodeArray, setNodeArray] = useState<NodeArrayItem[] | null>(null);
  const [selectedListItems, setSelectedListItem] = React.useState<string[]>([]);
  const [activeNodeIds, setActiveNodeIds] = React.useState<string[]>([]);
  const [designTokens, setDesignTokens] = React.useState<any>(null);
  const [borderRadiusValues, setBorderRadiusValues] = useState([
    0,
    2,
    4,
    8,
    16,
    24,
    32
  ]);
  const [lintVectors, setLintVectors] = useState(false);
  const [initialLoad, setInitialLoad] = React.useState(false);
  const [emptyState, setEmptyState] = React.useState(false);
  const [localStyles, setLocalStyles] = useState({});
  const [stylesInUse, setStylesInUse] = useState({});
  // Tipos para as bibliotecas de componentes
  interface ComponentLibrary {
    id: string;
    name: string;
    tokens?: any;
    fillsCount?: number;
    textCount?: number;
    effectsCount?: number;
  }

  const librariesRef = React.useRef<ComponentLibrary[]>([]);
  const [
    activeComponentLibraries,
    setActiveComponentLibraries
  ] = React.useState<ComponentLibrary[]>([]);
  const activeComponentLibrariesRef = React.useRef<ComponentLibrary[]>([]);
  const activePageRef = React.useRef(activePage);
  const [auditStarted, setAuditStarted] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [infoPanelVisible, setInfoPanelVisible] = useState(false);
  // Definição do tipo para o resultado da análise
  interface AnalysisResult {
    nodeArray: NodeItem[];
    errors: ErrorItem[];
    date: Date;
    projectName: string;
  }

  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null
  );

  window.addEventListener("keydown", function(e) {
    if (e.key === "Escape") {
      // Close plugin when pressing Escape
      window.parent.postMessage({ pluginMessage: { type: "close" } }, "*");
    }
  });

  const updateSelectedList = (ids: string[]) => {
    setSelectedListItem(ids);
    setActiveNodeIds(ids);
  };

  const updateNavigation = (page: string) => {
    console.log(
      "[UI] Navegando para página:",
      page,
      "activeNodeIds:",
      activeNodeIds.length
    );
    setActivePage(page);

    parent.postMessage(
      {
        pluginMessage: {
          type: "update-active-page-in-settings",
          page: page
        }
      },
      "*"
    );
  };

  const handleUpdateLibraries = (updatedLibraries: ComponentLibrary[]) => {
    console.log("[App] Atualizando bibliotecas:", updatedLibraries);

    // Atualiza o estado das bibliotecas ativas
    setActiveComponentLibraries(updatedLibraries);

    // Atualiza as referências
    activeComponentLibrariesRef.current = updatedLibraries;
    librariesRef.current = updatedLibraries;

    // Envia as atualizações para o plugin
    parent.postMessage(
      {
        pluginMessage: {
          type: "update-active-libraries",
          libraries: updatedLibraries
        }
      },
      "*"
    );
    console.log(
      "[App] Bibliotecas atualizadas. Total:",
      updatedLibraries.length
    );
  };

  const updateActiveError = (error: any) => {
    setActiveError(error);
  };

  const updateNodeArray = (nodeArray: NodeArrayItem[]) => {
    setNodeArray(nodeArray);
  };

  const ignoreAll = (errors: ErrorItem[]) => {
    setIgnoreErrorArray(ignoredErrorArray => [...ignoredErrorArray, ...errors]);
  };

  const updateIgnoredErrors = (error: ErrorItem) => {
    if (
      error.node &&
      ignoredErrorArray.some(e => e.node?.id === error.node?.id)
    ) {
      if (error.value && ignoredErrorArray.some(e => e.value === error.value)) {
        return;
      } else {
        setIgnoreErrorArray([error].concat(ignoredErrorArray));
      }
    } else {
      setIgnoreErrorArray([error].concat(ignoredErrorArray));
    }
  };

  const updateBorderRadius = (value: number[]) => {
    setBorderRadiusValues(value);

    parent.postMessage(
      {
        pluginMessage: {
          type: "update-border-radius",
          radiusValues: value
        }
      },
      "*"
    );

    parent.postMessage(
      {
        pluginMessage: {
          type: "update-errors",
          libraries: librariesRef.current
        }
      },
      "*"
    );
  };

  const updateErrorArray = (errors: any[]) => {
    console.log("[App] updateErrorArray chamado com:", errors);
    console.log("[App] errors é array?", Array.isArray(errors));
    console.log("[App] errors length:", errors ? errors.length : "undefined");
    if (errors && errors.length > 0) {
      console.log("[App] Primeiro erro:", errors[0]);

      // Converter os erros para o formato NodeError esperado
      const nodeErrors = errors.map(error => ({
        id: error.id || error.node?.id || "",
        errors: [
          {
            type: error.type || "unknown",
            value: error.value,
            message: error.message || "Erro desconhecido",
            ...error
          }
        ],
        ...error
      }));

      setErrorArray(nodeErrors);
    } else {
      setErrorArray([]);
    }
  };

  const updateVisible = (val: boolean) => {
    setIsVisible(val);
  };

  const updateLintRules = (enabled: boolean) => {
    setLintVectors(enabled);

    parent.postMessage(
      {
        pluginMessage: {
          type: "update-lint-rules-from-settings",
          lintVectors: enabled
        }
      },
      "*"
    );

    parent.postMessage(
      {
        pluginMessage: {
          type: "update-errors",
          libraries: librariesRef.current
        }
      },
      "*"
    );
  };

  function updateVisibility() {
    if (isVisible === true) {
      setIsVisible(false);
    } else {
      setIsVisible(true);
    }
  }

  React.useEffect(() => {
    // Update client storage so the next time we run the app
    // we don't have to ignore our errors again.
    if (initialLoad !== false && ignoredErrorArray.length) {
      parent.postMessage(
        {
          pluginMessage: {
            type: "update-storage",
            storageArray: ignoredErrorArray
          }
        },
        "*"
      );
    }
  }, [ignoredErrorArray]);

  const onRunApp = React.useCallback(() => {
    console.log(
      "[App] onRunApp chamado. Bibliotecas ativas:",
      activeComponentLibraries
    );
    console.log(
      "[App] Número de bibliotecas ativas:",
      activeComponentLibraries.length
    );
    if (activeComponentLibraries.length > 0) {
      console.log("[App] Estrutura da primeira biblioteca ativa:", {
        name: activeComponentLibraries[0].name,
        fillsCount: activeComponentLibraries[0].fillsCount || 0,
        textCount: activeComponentLibraries[0].textCount || 0,
        effectsCount: activeComponentLibraries[0].effectsCount || 0
      });
    }

    parent.postMessage(
      {
        pluginMessage: {
          type: "run-app",
          lintVectors: lintVectors,
          selection: "user",
          // Envia as bibliotecas ativas para a auditoria
          libraries: activeComponentLibraries
        }
      },
      "*"
    );
  }, [activeComponentLibraries, lintVectors]);

  const onScanEntirePage = React.useCallback(() => {
    console.log(
      "[App] onScanEntirePage chamado. Bibliotecas ativas:",
      activeComponentLibraries
    );
    parent.postMessage(
      {
        pluginMessage: {
          type: "run-app",
          lintVectors: lintVectors,
          selection: "page",
          // Usando bibliotecas ativas para a auditoria
          libraries: activeComponentLibraries
        }
      },
      "*"
    );
  }, [activeComponentLibraries, lintVectors]);

  // Atualiza as referências quando o estado muda
  React.useEffect(() => {
    activeComponentLibrariesRef.current = activeComponentLibraries;
    // Mantém librariesRef em sincronia para compatibilidade
    librariesRef.current = activeComponentLibraries;
  }, [activeComponentLibraries]);

  React.useEffect(() => {
    activePageRef.current = activePage;
  }, [activePage]);

  React.useEffect(() => {
    onRunApp();

    window.onmessage = event => {
      const t0 = performance.now();
      console.log("[LOG] Mensagem recebida da UI:", event.data);
      const {
        type,
        message,
        errors,
        storage,
        error,
        success,
        selectedNodeIds,
        projectName,
        activeComponentLibraries: detectedComponentLibs
      } = event.data.pluginMessage;
      console.log("[UI] Mensagem recebida:", type, event.data.pluginMessage);

      if (type === "show-preloader") {
        console.log("[LOG] show-preloader", { t: performance.now() - t0 });
        setEmptyState(false);
        console.log("[UI] setEmptyState(false) - show-preloader");
      } else if (type === "show-empty-state") {
        console.log("[LOG] show-empty-state", { t: performance.now() - t0 });
        setEmptyState(true);
        console.log("[UI] setEmptyState(true) - show-empty-state");
      } else if (type === "step-1") {
        console.log("[LOG] step-1", { t: performance.now() - t0 });
        let nodeObject = JSON.parse(message);
        setNodeArray(nodeObject);
        updateErrorArray(errors);
        setSelectedListItem(selectedListItems => {
          selectedListItems.splice(0, selectedListItems.length);
          return selectedListItems.concat(nodeObject[0].id);
        });
        setActiveNodeIds(activeNodeIds => {
          return activeNodeIds.concat(nodeObject[0].id);
        });
        parent.postMessage(
          {
            pluginMessage: {
              type: "step-2",
              id: nodeObject[0].id,
              nodeArray: nodeObject
            }
          },
          "*"
        );
      } else if (type === "step-2-complete") {
        setSelectedNode(() => JSON.parse(message));
        parent.postMessage(
          {
            pluginMessage: {
              type: "step-3",
              libraries: librariesRef.current
            }
          },
          "*"
        );
      } else if (type === "step-3-complete") {
        console.log("[LOG] step-3-complete", { t: performance.now() - t0 });
        console.log("[UI] step-3-complete recebido", {
          errors,
          message,
          error,
          success
        });

        if (error) {
          console.error("[UI] Erro recebido do controller:", error);
          setEmptyState(true);
        } else {
          // Processar os dados recebidos
          if (message && Array.isArray(message)) {
            console.log(
              "[UI] Atualizando nodeArray com",
              message.length,
              "nodes"
            );

            // Garante que a mensagem está no formato correto antes de atualizar o estado
            const formattedNodes = message
              .map(node => {
                if (!node || typeof node !== "object" || !node.id) {
                  console.warn("[UI] Nó inválido encontrado:", node);
                  return null;
                }
                return {
                  id: node.id,
                  name: node.name || "Sem nome",
                  type: node.type || "unknown",
                  // Garantir que as propriedades de estilo existam
                  fills: Array.isArray(node.fills) ? node.fills : [],
                  strokes: Array.isArray(node.strokes) ? node.strokes : [],
                  effects: Array.isArray(node.effects) ? node.effects : [],
                  cornerRadius: node.cornerRadius,
                  gap: node.gap,
                  // Preservar filhos se existirem
                  ...(node.children && {
                    children: node.children.filter(Boolean)
                  })
                };
              })
              .filter(Boolean); // Remove nós inválidos

            console.log("[UI] Nós formatados:", formattedNodes);
            setNodeArray(formattedNodes);

            // Selecionar o primeiro node por padrão
            if (formattedNodes.length > 0) {
              setSelectedListItem([formattedNodes[0].id]);
              setActiveNodeIds([formattedNodes[0].id]);
            }
          }

          // Atualizar erros
          if (errors && Array.isArray(errors)) {
            console.log(
              "[UI] Atualizando errorArray com",
              errors.length,
              "erros"
            );
            console.log("[UI] Estrutura dos erros:", errors);
            if (errors.length > 0) {
              console.log("[UI] Primeiro erro:", errors[0]);
              console.log("[UI] Tipo do primeiro erro:", typeof errors[0]);
            }
            updateErrorArray(errors);
          }

          // Marcar como carregado e sair do loading
          setInitialLoad(true);
          setAuditLoading(false);
          setEmptyState(false);
          setActivePage("bulk");
          setAnalysisResult({
            nodeArray: message,
            errors,
            date: new Date(),
            projectName: projectName || "Documento sem título"
          });
          console.log("[UI] Estado atualizado - saindo do loading");
        }
        if (detectedComponentLibs) {
          console.log(
            "[App] Bibliotecas de componentes detectadas recebidas:",
            detectedComponentLibs
          );

          // Formatar as bibliotecas para o formato esperado
          const formattedLibraries = detectedComponentLibs.map(lib => ({
            ...lib,
            // Garantir que todas as propriedades necessárias existam
            fills: Array.isArray(lib.fills) ? lib.fills : [],
            text: Array.isArray(lib.text) ? lib.text : [],
            strokes: Array.isArray(lib.strokes) ? lib.strokes : [],
            effects: Array.isArray(lib.effects) ? lib.effects : [],
            radius: Array.isArray(lib.radius) ? lib.radius : [],
            gaps: Array.isArray(lib.gaps) ? lib.gaps : []
          }));

          console.log("[App] Bibliotecas formatadas:", formattedLibraries);
          setActiveComponentLibraries(formattedLibraries);
        }
      } else if (type === "fetched storage") {
        let clientStorage = JSON.parse(storage);

        setIgnoreErrorArray(ignoredErrorArray => [
          ...ignoredErrorArray,
          ...clientStorage
        ]);
      } else if (type === "fetched active page") {
        console.log("[LOG] fetched active page", { t: performance.now() - t0 });
        let clientStorage = JSON.parse(storage);
        setActivePage(clientStorage);
      } else if (type === "fetched border radius") {
        console.log("[LOG] fetched border radius", {
          t: performance.now() - t0
        });
        // Update border radius values from storage
        let clientStorage = JSON.parse(storage);
        // Sort the array first
        clientStorage = clientStorage.sort((a, b) => a - b);
        setBorderRadiusValues([...clientStorage]);
      } else if (type === "reset storage") {
        console.log("[LOG] reset storage", { t: performance.now() - t0 });
        // let clientStorage = JSON.parse(storage);
        setIgnoreErrorArray([]);
        parent.postMessage(
          {
            pluginMessage: {
              type: "update-errors",
              libraries: librariesRef.current
            }
          },
          "*"
        );
      } else if (type === "fetched layer") {
        setSelectedNode(() => JSON.parse(message));

        // Ask the controller to lint the layers for errors.
        parent.postMessage(
          {
            pluginMessage: {
              type: "update-errors",
              libraries: librariesRef.current
            }
          },
          "*"
        );
      } else if (type === "change") {
        console.log("[LOG] change", { t: performance.now() - t0 });
        // Document Changed
        parent.postMessage(
          {
            pluginMessage: {
              type: "update-errors",
              libraries: librariesRef.current
            }
          },
          "*"
        );

        // When a change happens and the styles page is active
        // We update the styles as the user makes changes
        if (activePageRef.current === "styles") {
          parent.postMessage(
            {
              pluginMessage: {
                type: "update-styles-page"
              }
            },
            "*"
          );
        }
      } else if (type === "updated errors") {
        console.log("[LOG] updated errors", { t: performance.now() - t0 });
        // Once the errors are returned, update the error array.
        updateErrorArray(errors);

        // Atualizar também o nodeArray quando receber a resposta de update-errors
        if (message && Array.isArray(message) && message.length > 0) {
          console.log("[App] Atualizando nodeArray com", message.length, "nós");
          setNodeArray(message);

          // Se estiver na página de camadas, selecionar o primeiro nó
          if (activePageRef.current === "layers" && message.length > 0) {
            console.log(
              "[DEBUG] Selecionando primeiro nó na página de camadas",
              message[0].id
            );
            setSelectedListItem([message[0].id]);
            setActiveNodeIds([message[0].id]);

            // Solicitar dados da camada selecionada
            parent.postMessage(
              {
                pluginMessage: { type: "fetch-layer-data", id: message[0].id }
              },
              "*"
            );
          }
        }
      } else if (type === "library-imported") {
        console.log("[App] library-imported recebido. Bibliotecas:", message);
        setActiveComponentLibraries(message);
      } else if (type === "library-imported-from-storage") {
        console.log(
          "[App] library-imported-from-storage recebido. Bibliotecas:",
          message
        );
        setActiveComponentLibraries(message);
      } else if (type === "user-libs-loaded") {
        console.log(
          "[App] user-libs-loaded recebido. Bibliotecas carregadas:",
          message.libs
        );
        if (message.libs && message.libs.length > 0) {
          console.log(
            "[App] Definindo bibliotecas ativas a partir do armazenamento"
          );
          setActiveComponentLibraries(message.libs);
        }
      } else if (type === "local-styles-imported") {
        console.log("[LOG] local-styles-imported", {
          t: performance.now() - t0
        });
        setLocalStyles(message);
      } else if (type === "remote-styles-imported") {
        console.log("[LOG] remote-styles-imported", {
          t: performance.now() - t0
        });
        setStylesInUse(message);
      } else if (type === "selection-update") {
        console.log("[LOG] selection-update", { t: performance.now() - t0 });
        setActiveNodeIds(selectedNodeIds || []);
        // Não volta para tela inicial automaticamente
      }
    };
  }, []);

  const handleRunAudit = () => {
    setAuditStarted(true);
    setAuditLoading(true);
    setActivePage("bulk"); // Definir a página como bulk imediatamente
    setInitialLoad(false);
    onRunApp();
  };

  React.useEffect(() => {
    console.log("[DEBUG] initialLoad:", initialLoad);
    if (!initialLoad && auditStarted) {
      // setPreloaderMessage("Aguarde, processando análise...");
    }
  }, [initialLoad, auditStarted]);

  // Carrega as bibliotecas salvas quando o componente for montado
  React.useEffect(() => {
    console.log("[App] Solicitando bibliotecas salvas...");
    parent.postMessage(
      {
        pluginMessage: {
          type: "get-user-libs"
        }
      },
      "*"
    );
  }, []);

  // Debug: monitora alterações em activeComponentLibraries
  React.useEffect(() => {
    console.log(
      "[DEBUG] activeComponentLibraries atualizado:",
      activeComponentLibraries
    );
  }, [activeComponentLibraries]);

  // Adicione logs antes do return, se quiser
  console.log(
    "[App] Passando activeComponentLibraries para SettingsPanel:",
    activeComponentLibraries
  );
  console.log(
    "[App] Passando activeComponentLibraries para LibraryPage:",
    activeComponentLibraries
  );

  return (
    <div className="container">
      {/* Renderizar Navigation quando a auditoria foi iniciada */}
      {auditStarted && (
        <Navigation
          onPageSelection={updateNavigation}
          activePage={activePage}
          updateLintRules={updateLintRules}
          ignoredErrorArray={ignoredErrorArray}
          borderRadiusValues={borderRadiusValues}
          lintVectors={lintVectors}
          onRefreshSelection={onRunApp}
          onBackToInitialContent={() => {
            setAuditStarted(false);
            setActivePage("initial");
          }}
          libraries={activeComponentLibraries}
          onUpdateLibraries={handleUpdateLibraries}
          localStyles={localStyles}
        />
      )}

      {/* Se estiver na página de settings, renderize só o painel de settings */}
      {activePage === "settings" && (
        <SettingsPanel
          panelVisible={true}
          onHandlePanelVisible={() => setActivePage("layers")}
          borderRadiusValues={borderRadiusValues}
          designTokens={designTokens}
          lintVectors={lintVectors}
          updateLintRules={updateLintRules}
          ignoredErrorArray={ignoredErrorArray}
          libraries={activeComponentLibraries}
          onUpdateLibraries={handleUpdateLibraries}
          localStyles={localStyles}
          activeComponentLibraries={activeComponentLibraries}
        />
      )}
      {activePage === "library" && (
        <LibraryPage
          libraries={activeComponentLibraries}
          onUpdateLibraries={handleUpdateLibraries}
          localStyles={localStyles}
          activeComponentLibraries={activeComponentLibraries}
        />
      )}
      {activePage === "devmode" ? (
        <DevMode />
      ) : activePage === "styles" ? (
        <StylesPage stylesInUse={stylesInUse} />
      ) : activePage === "layers" ? (
        (() => {
          console.log("[DEBUG] Renderizando NodeList", {
            nodeArray,
            activeNodeIds,
            selectedListItems
          });

          // Verificar se o nodeArray está vazio
          if (!nodeArray || nodeArray.length === 0) {
            // Se estiver vazio, solicitar atualização dos dados
            console.log("[DEBUG] nodeArray vazio, solicitando atualização");
            parent.postMessage(
              {
                pluginMessage: {
                  type: "update-errors",
                  libraries: librariesRef.current
                }
              },
              "*"
            );

            // Mostrar mensagem de carregamento enquanto aguarda os dados
            return (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "200px",
                  color: "#fff"
                }}
              >
                <div style={{ marginBottom: "16px" }}>
                  Carregando camadas...
                </div>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    border: "3px solid #333",
                    borderTop: "3px solid #fff",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite"
                  }}
                ></div>
              </div>
            );
          }

          return (
            <NodeList
              onErrorUpdate={updateActiveError}
              onVisibleUpdate={updateVisible}
              onSelectedListUpdate={updateSelectedList}
              visibility={isVisible}
              nodeArray={Array.isArray(nodeArray) ? nodeArray : []}
              errorArray={errorArray}
              ignoredErrorArray={ignoredErrorArray}
              selectedListItems={selectedListItems}
              activeNodeIds={activeNodeIds}
              onOpenPanel={node => {
                // Busca o erro referente ao node clicado
                const erro = errorArray.find(e => e.id === node.id);
                if (erro) {
                  setActiveError(erro);
                  setSelectedNode(node);
                  setIsVisible(true);
                }
              }}
            />
          );
        })()
      ) : auditStarted && activePage === "bulk" && auditLoading ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "200px",
            color: "#fff"
          }}
        >
          <div style={{ marginBottom: "16px" }}>Analisando seu projeto...</div>
          <div
            style={{
              width: "40px",
              height: "40px",
              border: "3px solid #333",
              borderTop: "3px solid #fff",
              borderRadius: "50%",
              animation: "spin 1s linear infinite"
            }}
          ></div>
        </div>
      ) : auditStarted && activePage === "bulk" ? (
        <BulkErrorList
          libraries={activeComponentLibraries}
          errorArray={Array.isArray(errorArray) ? errorArray : []}
          ignoredErrorArray={ignoredErrorArray}
          onIgnoredUpdate={updateIgnoredErrors}
          updateBorderRadius={updateBorderRadius}
          onIgnoreAll={ignoreAll}
          ignoredErrors={ignoredErrorArray}
          onClick={updateVisibility}
          onSelectedListUpdate={updateSelectedList}
          initialLoadComplete={initialLoad}
          onHandleRunApp={handleRunAudit}
          disableRefazer={!activeNodeIds.length}
          nodeArray={nodeArray}
        />
      ) : !auditStarted ? (
        <InitialContent
          isFrameSelected={activeNodeIds.length > 0}
          onHandleRunApp={handleRunAudit}
          onShowInfoPanel={() => setInfoPanelVisible(true)}
          libraries={activeComponentLibraries}
          onUpdateLibraries={handleUpdateLibraries}
          localStyles={localStyles}
        />
      ) : null}

      {Object.keys(activeError).length !== 0 && errorArray.length ? (
        <Panel
          visibility={isVisible}
          node={selectedNode}
          errorArray={errorArray}
          onIgnoredUpdate={updateIgnoredErrors}
          onIgnoreAll={ignoreAll}
          ignoredErrors={ignoredErrorArray}
          onClick={updateVisibility}
          onSelectedListUpdate={updateSelectedList}
          onOpenPanel={erro => {
            setActiveError(erro);
            setIsVisible(true);
          }}
        />
      ) : null}

      {infoPanelVisible && (
        <InfoPanel
          isVisible={infoPanelVisible}
          onClose={() => setInfoPanelVisible(false)}
        />
      )}

      {/* Fallback para evitar tela branca */}
      {![
        "settings",
        "library",
        "styles",
        "bulk",
        "initial",
        "layers",
        "camadas",
        "devmode",
        "page"
      ].includes(activePage) && (
        <div style={{ color: "red", textAlign: "center", marginTop: 32 }}>
          Erro: página não encontrada ou fluxo inválido. (activePage:{" "}
          {activePage})
        </div>
      )}
    </div>
  );
};

export default App;
