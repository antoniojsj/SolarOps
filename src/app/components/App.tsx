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

import "../styles/figma.ds.css";
import "../styles/ui.css";
import "../styles/empty-state.css";
import "react-tooltip/dist/react-tooltip.css";

const App = ({}) => {
  const [errorArray, setErrorArray] = useState([]);
  const [activePage, setActivePage] = useState("page");
  const [ignoredErrorArray, setIgnoreErrorArray] = useState([]);
  const [activeError, setActiveError] = React.useState({});
  const [selectedNode, setSelectedNode] = React.useState({});
  const [isVisible, setIsVisible] = React.useState(false);
  const [nodeArray, setNodeArray] = useState([]);
  const [selectedListItems, setSelectedListItem] = React.useState([]);
  const [activeNodeIds, setActiveNodeIds] = React.useState([]);
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
  const [libraries, setLibraries] = useState([]);
  const [localStyles, setLocalStyles] = useState({});
  const [stylesInUse, setStylesInUse] = useState({});
  const librariesRef = React.useRef([]);
  const activePageRef = React.useRef(activePage);
  const [auditStarted, setAuditStarted] = useState(false);
  const [infoPanelVisible, setInfoPanelVisible] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [activeComponentLibraries, setActiveComponentLibraries] = useState([]);

  window.addEventListener("keydown", function(e) {
    if (e.key === "Escape") {
      // Close plugin when pressing Escape
      window.parent.postMessage({ pluginMessage: { type: "close" } }, "*");
    }
  });

  const updateSelectedList = id => {
    setSelectedListItem([id]);
    setActiveNodeIds([id]);
  };

  const updateNavigation = page => {
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

  const handleUpdateLibraries = updatedLibraries => {
    console.log(
      "[App] handleUpdateLibraries chamado. Bibliotecas:",
      updatedLibraries
    );
    setLibraries(updatedLibraries);
  };

  const updateActiveError = error => {
    setActiveError(error);
  };

  const ignoreAll = errors => {
    setIgnoreErrorArray(ignoredErrorArray => [...ignoredErrorArray, ...errors]);
  };

  const updateIgnoredErrors = error => {
    if (ignoredErrorArray.some(e => e.node.id === error.node.id)) {
      if (ignoredErrorArray.some(e => e.value === error.value)) {
        return;
      } else {
        setIgnoreErrorArray([error].concat(ignoredErrorArray));
      }
    } else {
      setIgnoreErrorArray([error].concat(ignoredErrorArray));
    }
  };

  const updateBorderRadius = value => {
    let borderArray = [...borderRadiusValues, value];
    setBorderRadiusValues([...borderRadiusValues, value]);

    parent.postMessage(
      {
        pluginMessage: {
          type: "update-border-radius",
          radiusValues: borderArray
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

  const updateErrorArray = errors => {
    console.log("[App] updateErrorArray chamado com:", errors);
    console.log("[App] errors é array?", Array.isArray(errors));
    console.log("[App] errors length:", errors ? errors.length : "undefined");
    if (errors && errors.length > 0) {
      console.log("[App] Primeiro erro:", errors[0]);
    }
    setErrorArray(Array.isArray(errors) ? errors : []);
  };

  const updateVisible = val => {
    setIsVisible(val);
  };

  const updateLintRules = boolean => {
    setLintVectors(boolean);

    parent.postMessage(
      {
        pluginMessage: {
          type: "update-lint-rules-from-settings",
          boolean: boolean
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
    parent.postMessage(
      {
        pluginMessage: {
          type: "run-app",
          lintVectors: lintVectors,
          selection: "user"
        }
      },
      "*"
    );
  }, []);

  const onScanEntirePage = React.useCallback(() => {
    parent.postMessage(
      {
        pluginMessage: {
          type: "run-app",
          lintVectors: lintVectors,
          selection: "page"
        }
      },
      "*"
    );
  }, []);

  // We need to always be able to access this set of arrays
  // in order to provide it to the linting array for magic fixes.
  React.useEffect(() => {
    librariesRef.current = libraries;
  }, [libraries]);

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
            setNodeArray(message);

            // Selecionar o primeiro node por padrão
            if (message.length > 0) {
              setSelectedListItem([message[0].id]);
              setActiveNodeIds([message[0].id]);
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
          setActiveComponentLibraries(detectedComponentLibs);
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
      } else if (type === "library-imported") {
        console.log("[App] library-imported recebido. Bibliotecas:", message);
        setLibraries(message);
      } else if (type === "library-imported-from-storage") {
        console.log(
          "[App] library-imported-from-storage recebido. Bibliotecas:",
          message
        );
        setLibraries(message);
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
    setInitialLoad(false);
    onRunApp();
  };

  React.useEffect(() => {
    console.log("[DEBUG] initialLoad:", initialLoad);
    if (!initialLoad && auditStarted) {
      // setPreloaderMessage("Aguarde, processando análise...");
    }
  }, [initialLoad, auditStarted]);

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
      {/* Renderizar Navigation apenas se não estiver na página de relatório (bulk) */}
      {auditStarted && activePage !== "bulk" ? (
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
          libraries={libraries}
          onUpdateLibraries={handleUpdateLibraries}
          localStyles={localStyles}
        />
      ) : null}

      {/* Se estiver na página de settings, renderize só o painel de settings */}
      {activePage === "settings" && (
        <SettingsPanel
          panelVisible={true}
          onHandlePanelVisible={() => setActivePage("layers")}
          borderRadiusValues={borderRadiusValues}
          lintVectors={lintVectors}
          updateLintRules={updateLintRules}
          ignoredErrorArray={ignoredErrorArray}
          libraries={libraries}
          onUpdateLibraries={handleUpdateLibraries}
          localStyles={localStyles}
          activeComponentLibraries={activeComponentLibraries}
        />
      )}
      {activePage === "library" && (
        <LibraryPage
          libraries={libraries}
          onUpdateLibraries={handleUpdateLibraries}
          localStyles={localStyles}
          activeComponentLibraries={activeComponentLibraries}
        />
      )}
      {activePage === "styles" ? (
        <StylesPage stylesInUse={stylesInUse} />
      ) : activePage === "layers" ? (
        (() => {
          console.log("[DEBUG] Renderizando NodeList", {
            nodeArray,
            activeNodeIds,
            selectedListItems
          });
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
      ) : auditStarted &&
        activePage === "bulk" &&
        (initialLoad || analysisResult) ? (
        <BulkErrorList
          libraries={libraries}
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
      ) : !auditStarted && (emptyState === false || emptyState === true) ? (
        <InitialContent
          isFrameSelected={activeNodeIds.length > 0}
          onHandleRunApp={handleRunAudit}
          onShowInfoPanel={() => setInfoPanelVisible(true)}
          libraries={libraries}
          onUpdateLibraries={handleUpdateLibraries}
          localStyles={localStyles}
        />
      ) : (
        <InitialContent
          onHandleRunApp={handleRunAudit}
          onScanEntirePage={onScanEntirePage}
          isFrameSelected={activeNodeIds.length > 0}
          libraries={libraries}
          onUpdateLibraries={handleUpdateLibraries}
          localStyles={localStyles}
        />
      )}

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
        "camadas"
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
