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
import Tools from "./ToolsTab";

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

  const [errorArray, setErrorArray] = useState<ErrorItem[]>([]);
  const [activePage, setActivePage] = useState("page");
  const [ignoredErrorArray, setIgnoreErrorArray] = useState<ErrorItem[]>([]);
  const [activeError, setActiveError] = React.useState<any>({});
  const [selectedNode, setSelectedNode] = React.useState<any>({});
  const [isVisible, setIsVisible] = React.useState(false);
  // Usa a interface NodeItem que é mais completa e permite todas as propriedades necessárias.
  const [nodeArray, setNodeArray] = useState<NodeItem[] | null>(null);
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

  const updateNodeArray = (nodeArray: NodeItem[]) => {
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

  const updateErrorArray = (errors: ErrorItem[]) => {
    console.log("[App] updateErrorArray (flat) chamado com:", errors);
    // O controller já envia um array plano de erros. Apenas o definimos no estado.
    setErrorArray(errors && Array.isArray(errors) ? errors : []);
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
      const pluginMessage = event.data.pluginMessage || event.data;
      if (!pluginMessage || !pluginMessage.type) {
        return;
      }
      const {
        type,
        message,
        errors,
        storage,
        error,
        success,
        selectedNodeIds,
        projectName,
        activeComponentLibraries: detectedComponentLibs,
        libs
      } = pluginMessage;
      console.log("[UI] Mensagem recebida:", type, pluginMessage);

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
            // 'message' é o nodeArray
            console.log(
              "[UI] Atualizando nodeArray com",
              message.length,
              "nodes"
            );
            // Usar a mensagem diretamente, pois já foi serializada pelo controller.
            // A formatação anterior removia propriedades essenciais para as verificações de conformidade.
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
          libs
        );
        if (libs && libs.length > 0) {
          console.log(
            "[App] Definindo bibliotecas ativas a partir do armazenamento"
          );
          setActiveComponentLibraries(libs);
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
      } else if (type === "update-errors-after-fix") {
        console.log("[App] Atualizando erros após correção.");
        onRunApp();
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

  const handleExportReport = async () => {
    console.log("Export report button clicked");

    try {
      // Primeiro, tenta encontrar o contêiner do relatório usando uma classe mais específica
      let reportContainer = document.querySelector(
        ".bulk-errors-container"
      ) as HTMLElement;

      // Se não encontrar, tenta encontrar qualquer contêiner que possa conter o relatório
      if (!reportContainer) {
        console.log(
          "Container principal não encontrado, procurando alternativas..."
        );
        const possibleContainers = document.querySelectorAll(
          '.bulk-errors, .bulk-errors-container, [class*="bulk"], [class*="error"], [class*="report"]'
        );

        // Log dos contêineres disponíveis para depuração
        console.log(
          "Contêineres disponíveis:",
          Array.from(possibleContainers).map(el => ({
            tag: el.tagName,
            class: el.className,
            id: el.id || "no-id",
            children: el.children.length,
            textContent: el.textContent?.substring(0, 50) + "..." || "vazio"
          }))
        );

        // Tenta encontrar o contêiner mais provável
        for (const container of Array.from(possibleContainers)) {
          if (container.children.length > 0) {
            reportContainer = container as HTMLElement;
            console.log("Usando contêiner alternativo:", container.className);
            break;
          }
        }

        // Se ainda não encontrou, exibe um erro e sai
        if (!reportContainer) {
          console.error("Não foi possível encontrar o contêiner do relatório");
          parent.postMessage(
            {
              pluginMessage: {
                type: "report-export-error",
                error:
                  "Não foi possível encontrar o conteúdo do relatório para exportação."
              }
            },
            "*"
          );
          return;
        }
      }

      console.log("Contêiner do relatório encontrado:", {
        tagName: reportContainer.tagName,
        className: reportContainer.className,
        children: reportContainer.children.length
      });

      // Cria um clone do contêiner para não afetar o original
      const containerClone = reportContainer.cloneNode(true) as HTMLElement;

      // Remove elementos interativos que não devem estar na exportação
      containerClone
        .querySelectorAll(
          "button, input, select, textarea, .analysis-footer, .initial-content-footer"
        )
        .forEach(el => el.remove());

      // Cria um wrapper para a exportação com o estilo correto
      const exportWrapper = document.createElement("div");
      exportWrapper.style.padding = "0";
      exportWrapper.style.backgroundColor = "#000";
      exportWrapper.style.borderRadius = "16px";
      exportWrapper.style.width = "100%";
      exportWrapper.style.maxWidth = "600px";
      exportWrapper.style.margin = "0 auto";
      exportWrapper.style.boxSizing = "border-box";
      exportWrapper.style.fontFamily =
        'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

      // Cria um container para o cabeçalho do relatório
      const headerContainer = document.createElement("div");
      headerContainer.style.display = "flex";
      headerContainer.style.justifyContent = "space-between";
      headerContainer.style.alignItems = "center";
      headerContainer.style.marginBottom = "8px";
      headerContainer.style.width = "100%";
      headerContainer.style.padding = "0 8px";

      // Adiciona o título do relatório
      const title = document.createElement("h1");
      title.textContent = "Relatório da Auditoria";
      title.style.color = "#fff";
      title.style.margin = "0";
      title.style.fontSize = "18px";
      title.style.fontWeight = "600";
      title.style.fontFamily = "inherit";

      // Adiciona a logo da Compass
      const logoContainer = document.createElement("div");
      const logo = document.createElement("img");
      logo.src = "/assets/Compass com fundo preto - horizontal.svg";
      logo.alt = "Logo Compass";
      logo.style.height = "20px";
      logo.style.width = "auto";
      logoContainer.appendChild(logo);

      // Adiciona os elementos ao cabeçalho
      headerContainer.appendChild(title);
      headerContainer.appendChild(logoContainer);

      // Cria um container para o conteúdo do relatório
      const contentContainer = document.createElement("div");
      contentContainer.className = "report-content";
      contentContainer.style.width = "100%";
      contentContainer.style.maxWidth = "100%";
      contentContainer.style.margin = "0 auto";
      contentContainer.style.padding = "0 24px 0";

      // Adiciona o cabeçalho e o conteúdo ao container
      contentContainer.appendChild(headerContainer);
      contentContainer.appendChild(containerClone);

      // Adiciona o container ao wrapper de exportação
      exportWrapper.appendChild(contentContainer);

      // Ajusta o espaçamento do último elemento
      const lastElement = containerClone.lastElementChild as HTMLElement;
      if (lastElement) {
        lastElement.style.marginBottom = "0";
        lastElement.style.paddingBottom = "0";
      }

      // Garante que todo o texto seja visível na exportação
      const allTextElements = exportWrapper.querySelectorAll("*");

      allTextElements.forEach(el => {
        const element = el as HTMLElement;

        // Garante que a cor do texto seja visível no fundo escuro
        const textColor = window.getComputedStyle(element).color;
        if (
          textColor === "rgba(0, 0, 0, 0)" ||
          textColor === "transparent" ||
          textColor === "rgb(0, 0, 0)"
        ) {
          element.style.color = "#ffffff";
        }

        // Garante que as cores de fundo tenham contraste suficiente
        const bgColor = window.getComputedStyle(element).backgroundColor;
        if (bgColor === "rgba(0, 0, 0, 0)" || bgColor === "transparent") {
          element.style.backgroundColor = "#1a1a1a";
        }

        // Garante que os textos em span tenham cor branca
        if (element.tagName === "SPAN") {
          element.style.color = "#ffffff";
        }
      });

      // Adiciona o wrapper de exportação ao corpo do documento temporariamente
      const tempContainer = document.createElement("div");
      tempContainer.style.position = "absolute";
      tempContainer.style.left = "-9999px";
      tempContainer.style.top = "0";
      tempContainer.style.visibility = "visible"; // Torna visível para captura
      tempContainer.style.zIndex = "9999";
      tempContainer.style.width = "800px";
      tempContainer.style.height = "auto";
      tempContainer.style.overflow = "visible";

      tempContainer.appendChild(exportWrapper);
      document.body.appendChild(tempContainer);

      try {
        console.log("Iniciando exportação do relatório para imagem...");

        // Força um reflow para garantir que todos os estilos sejam aplicados
        void exportWrapper.offsetHeight;

        // Importa o html2canvas dinamicamente para evitar problemas de SSR
        const html2canvas = (await import("html2canvas")).default;

        console.log("Convertendo o relatório para canvas...");

        // Converte o wrapper de exportação para canvas
        const canvas = await html2canvas(exportWrapper, {
          backgroundColor: "#000000",
          scale: 1.5, // Aumenta a escala para melhor qualidade
          logging: true,
          useCORS: true,
          allowTaint: true,
          removeContainer: false,
          onclone: (clonedDoc, element) => {
            // Garante que todos os estilos sejam aplicados corretamente no documento clonado
            const style = clonedDoc.createElement("style");
            style.textContent = `
              * {
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
                box-sizing: border-box;
              }
              body { 
                margin: 0; 
                padding: 0; 
                background-color: #000000;
                color: #ffffff;
              }
              .bulk-errors-container, .bulk-errors {
                background-color: #000000 !important;
                color: #ffffff !important;
              }
              .error-item, .error-card {
                background-color: #1a1a1a !important;
                border-color: #333 !important;
                color: #ffffff !important;
              }
              h1, h2, h3, h4, h5, h6, p, span, div {
                color: #ffffff !important;
              }
            `;
            clonedDoc.head.appendChild(style);
          }
        });

        console.log("Canvas criado, convertendo para imagem...");

        // Converte o canvas para imagem base64
        const imageData = canvas.toDataURL("image/png", 0.9);

        if (!imageData || imageData === "data:,") {
          throw new Error(
            "Falha ao gerar os dados da imagem: dados de imagem inválidos"
          );
        }

        console.log("Enviando dados da imagem para o Figma...");

        // Envia os dados da imagem para o plugin
        parent.postMessage(
          {
            pluginMessage: {
              type: "export-report",
              imageData: imageData,
              width: Math.min(canvas.width, 2000), // Limita a largura máxima
              height: Math.min(canvas.height, 4000), // Limita a altura máxima
              backgroundColor: "#000000",
              borderRadius: 16
            }
          },
          "*"
        );

        console.log("Dados da imagem enviados para o Figma com sucesso");
      } catch (error) {
        console.error("Erro ao gerar a imagem do relatório:", error);
        // Exibe mensagem de erro para o usuário
        parent.postMessage(
          {
            pluginMessage: {
              type: "report-export-error",
              error:
                error instanceof Error
                  ? `Erro ao gerar o relatório: ${error.message}`
                  : "Falha ao gerar a imagem do relatório. Por favor, tente novamente."
            }
          },
          "*"
        );
      } finally {
        // Sempre limpa o contêiner temporário
        if (document.body.contains(tempContainer)) {
          document.body.removeChild(tempContainer);
        }
      }
    } catch (error) {
      console.error("Erro no processo de exportação:", error);
      // Exibe mensagem de erro genérica para o usuário
      parent.postMessage(
        {
          pluginMessage: {
            type: "report-export-error",
            error:
              "Ocorreu um erro inesperado ao exportar o relatório. Por favor, tente novamente."
          }
        },
        "*"
      );
    }
  };

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
      {activePage === "tools" ? (
        <Tools selectedNode={selectedNode} onInspectClick={() => {}} />
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
                // Apenas define o nó selecionado e torna o painel visível.
                // O painel irá filtrar os erros com base no nó.
                setSelectedNode(node);
                setIsVisible(true);
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
          onExportReport={handleExportReport}
        />
      ) : !auditStarted ? (
        <InitialContent
          isFrameSelected={activeNodeIds && activeNodeIds.length > 0}
          onHandleRunApp={handleRunAudit}
          onShowInfoPanel={() => setInfoPanelVisible(true)}
          libraries={activeComponentLibraries}
          onUpdateLibraries={handleUpdateLibraries}
          localStyles={localStyles}
        />
      ) : null}

      {isVisible && selectedNode ? (
        <Panel
          visibility={isVisible}
          node={selectedNode}
          errorArray={errorArray}
          onIgnoredUpdate={updateIgnoredErrors}
          onIgnoreAll={ignoreAll}
          ignoredErrors={ignoredErrorArray}
          onClick={updateVisibility}
          onSelectedListUpdate={updateSelectedList}
          onOpenPanel={() => {}} // onOpenPanel dentro do painel não é mais necessário
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
        "tools",
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
