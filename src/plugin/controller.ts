// Importações locais
import {
  checkType,
  newCheckFills,
  newCheckEffects,
  newCheckStrokes,
  checkRadius
} from "./lintingFunctions";

// Interface para mensagens da UI
interface UIMessage {
  type: string;
  id?: string;
  field?: string;
  nodes?: string[];
  styleId?: string;
  title?: string;
  styleType?: string;
  error?: {
    type: string;
    nodes: string[];
    suggestions?: any[];
    index?: number;
    styleKey?: string;
    styleId?: string;
  };
  libraries?: any[];
  storageArray?: any[];
}

// Declaração da constante figma
declare const figma: {
  currentPage: {
    selection: any[];
  };
  getNodeById: (id: string) => any;
  viewport: {
    scrollAndZoomIntoView: (nodes: any[]) => void;
  };
  notify: (message: string, options?: any) => void;
  ui: {
    postMessage: (message: any) => void;
    onmessage: (msg: any) => void;
    resize: (width: number, height: number) => void;
  };
  root: {
    name: string;
  };
  clientStorage: {
    getAsync: (key: string) => Promise<any>;
    setAsync: (key: string, value: any) => Promise<void>;
  };
  importStyleByKeyAsync: (key: string) => Promise<any>;
  closePlugin: () => void;
  showUI: (html: string, options: any) => void;
  on: (event: string, callback: () => void) => void;
};

// Importações de estilos
import {
  fetchRemoteStyles,
  fetchActiveComponentLibraries,
  detectTokenLibraries
} from "./remoteStyleFunctions";

const {
  getLocalPaintStyles,
  getLocalTextStyles,
  getLocalEffectStyles
} = require("./styles");

figma.showUI(__html__, { width: 480, height: 700 });
figma.ui.resize(480, 700);

// Função principal de linting simplificada
function lint(
  nodes: readonly any[],
  libraries: any[],
  parentFrameId: string | null = null
): any[] {
  console.log("[Controller] Iniciando lint com", nodes.length, "nodes");
  let errors: any[] = [];

  try {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      console.log(
        `[Controller] Processando node ${i + 1}/${nodes.length}:`,
        node.type,
        node.name
      );

      if (node.visible === false || node.locked === true) {
        console.log(
          `[Controller] Node ${node.name} ignorado (invisível ou bloqueado)`
        );
        continue;
      }

      // Identifica o frame pai: se o node for um FRAME, ele é o novo parentFrameId
      let currentFrameId = parentFrameId;
      if (node.type === "FRAME") {
        currentFrameId = node.id;
      }

      // Chama a função de lint para o node, passando o parentFrameId
      const nodeErrors = determineTypeWithFrame(
        node,
        libraries,
        currentFrameId
      );
      console.log(
        `[Controller] Node ${node.name} gerou ${nodeErrors.length} erros`
      );

      if (nodeErrors && Array.isArray(nodeErrors)) {
        errors = errors.concat(nodeErrors);
      }

      // Se o node tiver filhos, processa recursivamente
      if (
        node.children &&
        Array.isArray(node.children) &&
        node.children.length > 0
      ) {
        errors = errors.concat(lint(node.children, libraries, currentFrameId));
      }
    }

    console.log("[Controller] Lint concluído. Total de erros:", errors.length);
  } catch (error) {
    console.error("[Controller] Erro durante o linting:", error);
    // Retorna array vazio em caso de erro, mas não quebra o plugin
  }

  return errors;
}

// Função para determinar o tipo de node e aplicar regras de linting, incluindo o parentFrameId
function determineTypeWithFrame(
  node: any,
  libraries: any[],
  parentFrameId: string | null
): any[] {
  try {
    let errors: any[] = [];
    switch (node.type) {
      case "SLICE":
      case "GROUP":
        return [];
      case "CIRCLE":
      case "VECTOR":
      case "STAR":
      case "BOOLEAN_OPERATION":
      case "SQUARE":
        errors = lintShapeRules(node, libraries);
        break;
      case "FRAME":
        errors = lintFrameRules(node, libraries);
        break;
      case "INSTANCE":
      case "RECTANGLE":
        errors = lintRectangleRules(node, libraries);
        break;
      case "COMPONENT":
        errors = lintComponentRules(node, libraries);
        break;
      case "TEXT":
        errors = lintTextRules(node, libraries);
        break;
      case "LINE":
        errors = lintLineRules(node, libraries);
        break;
      default:
        return [];
    }
    // Adiciona o parentFrameId em cada erro
    if (parentFrameId) {
      errors = errors.map(e => ({ ...e, parentFrameId }));
    }
    return errors;
  } catch (error) {
    console.error("[Controller] Erro para node:", node.type, error);
    return [];
  }
}

// Funções de linting para diferentes tipos de componentes
function lintComponentRules(node: any, libraries: any[]): any[] {
  let errors: any[] = [];
  try {
    console.log(`[Controller] Verificando fills para component: ${node.name}`);
    newCheckFills(node, errors, libraries, undefined, undefined, undefined);
    console.log(
      `[Controller] Verificando effects para component: ${node.name}`
    );
    newCheckEffects(node, errors, libraries, undefined, undefined);
    console.log(
      `[Controller] Verificando strokes para component: ${node.name}`
    );
    newCheckStrokes(node, errors, libraries, undefined, undefined);
  } catch (error) {
    console.error("[Controller] Erro em component rules:", error);
  }
  return errors;
}

function lintLineRules(node: any, libraries: any[]): any[] {
  let errors: any[] = [];
  try {
    console.log(`[Controller] Verificando strokes para line: ${node.name}`);
    newCheckStrokes(node, errors, libraries, undefined, undefined);
  } catch (error) {
    console.error("[Controller] Erro em line rules:", error);
  }
  return errors;
}

function lintFrameRules(node: any, libraries: any[]): any[] {
  let errors: any[] = [];
  try {
    console.log(`[Controller] Verificando fills para frame: ${node.name}`);
    newCheckFills(node, errors, libraries, undefined, undefined, undefined);
    console.log(`[Controller] Verificando effects para frame: ${node.name}`);
    newCheckEffects(node, errors, libraries, undefined, undefined);
    console.log(`[Controller] Verificando strokes para frame: ${node.name}`);
    newCheckStrokes(node, errors, libraries, undefined, undefined);
  } catch (error) {
    console.error("[Controller] Erro em frame rules:", error);
  }
  return errors;
}

function lintTextRules(node: any, libraries: any[]): any[] {
  let errors: any[] = [];
  try {
    console.log(`[Controller] Verificando type para text: ${node.name}`);
    checkType(node, errors, libraries, undefined, undefined);
    console.log(`[Controller] Verificando fills para text: ${node.name}`);
    newCheckFills(node, errors, libraries, undefined, undefined, undefined);
    console.log(`[Controller] Verificando effects para text: ${node.name}`);
    newCheckEffects(node, errors, libraries, undefined, undefined);
    console.log(`[Controller] Verificando strokes para text: ${node.name}`);
    newCheckStrokes(node, errors, libraries, undefined, undefined);
  } catch (error) {
    console.error("[Controller] Erro em text rules:", error);
  }
  return errors;
}

function lintRectangleRules(node: any, libraries: any[]): any[] {
  let errors: any[] = [];
  try {
    console.log(`[Controller] Verificando fills para rectangle: ${node.name}`);
    newCheckFills(node, errors, libraries, undefined, undefined, undefined);
    console.log(
      `[Controller] Verificando effects para rectangle: ${node.name}`
    );
    newCheckEffects(node, errors, libraries, undefined, undefined);
    console.log(
      `[Controller] Verificando strokes para rectangle: ${node.name}`
    );
    newCheckStrokes(node, errors, libraries, undefined, undefined);
    console.log(`[Controller] Verificando radius para rectangle: ${node.name}`);
    checkRadius(node, errors, undefined);
  } catch (error) {
    console.error("[Controller] Erro em rectangle rules:", error);
  }
  return errors;
}

function lintShapeRules(node: any, libraries: any[]): any[] {
  let errors: any[] = [];
  try {
    console.log(`[Controller] Verificando fills para shape: ${node.name}`);
    newCheckFills(node, errors, libraries, undefined, undefined, undefined);
    console.log(`[Controller] Verificando effects para shape: ${node.name}`);
    newCheckEffects(node, errors, libraries, undefined, undefined);
    console.log(`[Controller] Verificando strokes para shape: ${node.name}`);
    newCheckStrokes(node, errors, libraries, undefined, undefined);
  } catch (error) {
    console.error("[Controller] Erro em shape rules:", error);
  }
  return errors;
}

// Função para serializar nodes
function serializeNodes(nodes: any[]): any[] {
  try {
    console.log("[Controller] Serializando", nodes.length, "nodes");
    console.log(
      "[Controller] Tipos dos nodes:",
      nodes.map(n => ({
        name: n.name,
        type: n.type,
        hasChildren: n.children?.length > 0
      }))
    );

    const serializeNode = (node: any): any => {
      console.log(
        `[Controller] Serializando node: ${node.name} (${
          node.type
        }) - filhos: ${node.children?.length || 0}`
      );

      const serializedNode: any = {
        id: node.id,
        name: node.name || "Sem nome",
        type: node.type || "UNKNOWN",
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height
      };

      // Serializar filhos recursivamente se existirem
      if (
        node.children &&
        Array.isArray(node.children) &&
        node.children.length > 0
      ) {
        console.log(
          `[Controller] Node ${node.name} tem ${node.children.length} filhos`
        );
        serializedNode.children = node.children.map((child: any) =>
          serializeNode(child)
        );
        console.log(
          `[Controller] Node ${node.name} serializou ${serializedNode.children.length} filhos`
        );
      } else {
        serializedNode.children = [];
      }

      return serializedNode;
    };

    const serialized = nodes.map(serializeNode);
    console.log(
      "[Controller] Serialização concluída. Total de nodes:",
      serialized.length
    );
    console.log(
      "[Controller] Estrutura final:",
      serialized.map(n => ({ name: n.name, childrenCount: n.children.length }))
    );
    return serialized;
  } catch (error) {
    console.error("[Controller] Erro na serialização:", error);
    return [];
  }
}

// Função para lidar com atualização da página de estilos
async function handleUpdateStylesPage(): Promise<void> {
  console.log("[Controller] Iniciando atualização de estilos");
  let remoteStyles = { fills: [], text: [], effects: [] };

  try {
    console.log("[Controller] Buscando estilos remotos");
    remoteStyles = await fetchRemoteStyles({
      fills: [],
      text: [],
      effects: []
    });
    console.log("[Controller] Estilos remotos obtidos:", remoteStyles);
  } catch (error) {
    console.error("[Controller] Erro ao processar estilos:", error);
  }

  // Post back the updated styles
  console.log("[Controller] Enviando estilos atualizados para UI");
  figma.ui.postMessage({
    type: "styles-updated",
    styles: remoteStyles
  });
}

// Função para agrupar erros por nodeId
function groupErrorsByNode(errors: any[]): any[] {
  console.log("[Controller] groupErrorsByNode - erros recebidos:", errors);
  console.log(
    "[Controller] groupErrorsByNode - número de erros:",
    errors.length
  );

  // Retornar os erros diretamente, sem agrupar por node
  // O BulkErrorList espera um array de erros individuais
  const result = errors.map(err => {
    // Garantir que cada erro tenha a estrutura esperada
    return {
      ...err,
      parentFrameId: err.parentFrameId || null, // garantir que sempre exista
      nodeId: err.nodeId || err.node?.id,
      nodeName: err.nodeName || err.node?.name,
      type: err.type || "unknown",
      message: err.message || "Erro desconhecido",
      value: err.value || "",
      count: err.count || 1,
      nodes: err.nodes || [err.nodeId || err.node?.id],
      matches: err.matches || [],
      suggestions: err.suggestions || []
    };
  });

  console.log("[Controller] groupErrorsByNode - resultado final:", result);
  return result;
}

// Função para coletar todos os nodes recursivamente
function collectAllNodes(nodes: any[]): any[] {
  let all: any[] = [];
  for (const node of nodes) {
    all.push(node);
    if (
      node.children &&
      Array.isArray(node.children) &&
      node.children.length > 0
    ) {
      all = all.concat(collectAllNodes(node.children));
    }
  }
  return all;
}

// Listener para mensagens da UI
figma.ui.onmessage = async (msg: UIMessage) => {
  console.log("[Controller] Mensagem recebida da UI:", msg.type);

  try {
    if (msg.type === "close") {
      console.log("[Controller] Fechando plugin");
      figma.closePlugin();
    }

    if (msg.type === "update-styles-page") {
      console.log("[Controller] Atualizando página de estilos");
      await handleUpdateStylesPage();
    }

    if (msg.type === "select-layer") {
      console.log("[Controller] Selecionando layer");
      const node = figma.getNodeById(msg.nodes?.[0] || "");
      if (node) {
        figma.currentPage.selection = [node];
        figma.viewport.scrollAndZoomIntoView([node]);
      }
    }

    if (msg.type === "select-multiple-layers") {
      console.log("[Controller] Selecionando múltiplas layers");
      const nodesToBeSelected: any[] = [];
      msg.nodes?.forEach(item => {
        const layer = figma.getNodeById(item);
        if (layer) {
          nodesToBeSelected.push(layer);
        }
      });
      if (nodesToBeSelected.length > 0) {
        figma.currentPage.selection = nodesToBeSelected;
        figma.viewport.scrollAndZoomIntoView(nodesToBeSelected);
        figma.notify(`${nodesToBeSelected.length} layers selected`, {
          timeout: 750
        });
      }
    }

    // Import local styles to use as recommendations
    if (msg.type === "find-local-styles") {
      console.log("[Controller] Buscando estilos locais");
      (async function() {
        try {
          const paintStylesData = await getLocalPaintStyles();
          const textStylesData = await getLocalTextStyles();
          const effectStylesData = await getLocalEffectStyles();
          const fileName = figma.root.name;
          const totalStyles =
            effectStylesData.length +
            textStylesData.length +
            paintStylesData.length;

          const localStyles = {
            name: fileName,
            effects: effectStylesData,
            fills: paintStylesData,
            text: textStylesData,
            styles: totalStyles
          };

          console.log("[Controller] Estilos locais obtidos:", localStyles);
          figma.ui.postMessage({
            type: "local-styles-imported",
            message: localStyles
          });
        } catch (error) {
          console.error("[Controller] Erro ao buscar estilos locais:", error);
        }
      })();
    }

    // Saves local styles as a library to use in every file.
    if (msg.type === "save-library") {
      console.log("[Controller] Salvando biblioteca");
      (async function() {
        try {
          const paintStylesData = await getLocalPaintStyles();
          const textStylesData = await getLocalTextStyles();
          const effectStylesData = await getLocalEffectStyles();
          const fileName = figma.root.name;
          const totalStyles =
            effectStylesData.length +
            textStylesData.length +
            paintStylesData.length;
          const key = "libraryKey";

          const library = {
            name: fileName,
            effects: effectStylesData,
            fills: paintStylesData,
            text: textStylesData,
            styles: totalStyles
          };

          const storedLibraries =
            (await figma.clientStorage.getAsync(key)) || [];
          const existingLibraryIndex = storedLibraries.findIndex(
            (storedLibrary: any) => storedLibrary.name === library.name
          );

          if (existingLibraryIndex !== -1) {
            storedLibraries[existingLibraryIndex] = library;
          } else {
            storedLibraries.push(library);
          }

          await figma.clientStorage.setAsync(key, storedLibraries);

          console.log("[Controller] Biblioteca salva:", storedLibraries);
          figma.ui.postMessage({
            type: "library-imported",
            message: storedLibraries
          });
        } catch (error) {
          console.error("[Controller] Erro ao salvar biblioteca:", error);
        }
      })();
    }

    if (msg.type === "remove-library") {
      console.log("[Controller] Removendo biblioteca");
      try {
        figma.clientStorage.setAsync("libraryKey", msg.storageArray || []);
      } catch (error) {
        console.error("[Controller] Erro ao remover biblioteca:", error);
      }
    }

    if (msg.type === "save-user-libs") {
      // Salva as bibliotecas do usuário no clientStorage do Figma
      try {
        const libs = (msg as any).libs || [];
        figma.clientStorage.setAsync("sherlock_selected_libs", libs);
        figma.ui.postMessage({ type: "user-libs-saved", success: true });
      } catch (e) {
        figma.ui.postMessage({
          type: "user-libs-saved",
          success: false,
          error: String(e)
        });
      }
    }

    // Initialize the app
    if (msg.type === "run-app") {
      console.log("[Controller] Iniciando aplicação");
      if (
        Array.isArray(figma.currentPage.selection) &&
        figma.currentPage.selection.length === 0
      ) {
        console.log("[Controller] Nenhuma seleção - mostrando estado vazio");
        figma.ui.postMessage({
          type: "show-empty-state"
        });
        return;
      }
      console.log("[Controller] Enviando preloader");
      figma.ui.postMessage({ type: "show-preloader" });
      try {
        console.log("[Controller] Iniciando processo de linting");
        const nodes = figma.currentPage.selection;
        const allNodes = collectAllNodes(nodes);
        const lintResults = lint(allNodes, msg.libraries || [], null);
        const groupedErrors = groupErrorsByNode(lintResults);
        const serializedNodes = serializeNodes(nodes);
        const activeComponentLibraries = await fetchActiveComponentLibraries();
        // Salva o resultado da análise no clientStorage
        const inspectorData = {
          errors: groupedErrors,
          nodes: serializedNodes,
          date: new Date().toISOString(),
          summary: {
            totalNodes: allNodes.length,
            totalErrors: lintResults.length
          }
        };
        await figma.clientStorage.setAsync("inspectorData", inspectorData);
        figma.ui.postMessage({
          type: "step-3-complete",
          errors: groupedErrors,
          message: serializedNodes,
          success: true,
          activeComponentLibraries
        });
      } catch (errLint) {
        console.error("[Controller] Erro no linting:", errLint);
        figma.ui.postMessage({
          type: "step-3-complete",
          errors: [],
          error: errLint instanceof Error ? errLint.message : String(errLint),
          success: false
        });
      }
      return;
    }

    // Handler para exportar o JSON da análise do inspector
    if (msg.type === "export-inspector-json") {
      try {
        const inspectorData = await figma.clientStorage.getAsync(
          "inspectorData"
        );
        if (inspectorData) {
          figma.ui.postMessage({
            type: "inspector-json-exported",
            data: inspectorData,
            success: true
          });
        } else {
          figma.ui.postMessage({
            type: "inspector-json-exported",
            error: "Nenhuma análise encontrada.",
            success: false
          });
        }
      } catch (error) {
        figma.ui.postMessage({
          type: "inspector-json-exported",
          error: error instanceof Error ? error.message : String(error),
          success: false
        });
      }
    }

    if (msg.type === "fetch-layer-data" && msg.id) {
      const node = figma.getNodeById(msg.id);
      if (node) {
        figma.currentPage.selection = [node];
        figma.viewport.scrollAndZoomIntoView([node]);
      }
    }

    if (msg.type === "get-project-name") {
      console.log("[Controller] Enviando nome do arquivo:", figma.root.name);
      figma.ui.postMessage({
        type: "project-name",
        projectName: figma.root.name || "Documento sem título"
      });
    }

    if (msg.type === "fetch-active-libraries") {
      console.log(
        "[Controller] Buscando bibliotecas de componentes ativas (on demand)"
      );
      const activeComponentLibraries = await fetchActiveComponentLibraries();
      figma.ui.postMessage({
        type: "fetched-active-libraries",
        activeComponentLibraries
      });
    }

    if (msg.type === "fetch-token-libraries") {
      try {
        const tokenLibraries = await detectTokenLibraries();
        figma.ui.postMessage({
          type: "fetched-token-libraries",
          tokenLibraries
        });
      } catch (error) {
        figma.ui.postMessage({
          type: "fetched-token-libraries",
          tokenLibraries: [],
          error: error instanceof Error ? error.message : String(error)
        });
      }
      return;
    }
  } catch (error) {
    console.error("[Controller] Erro geral:", error);
    // Sempre envia uma resposta para evitar loading infinito
    console.log("[Controller] Enviando resposta de erro geral");
    figma.ui.postMessage({
      type: "step-3-complete",
      errors: [],
      error: "Erro interno do plugin",
      success: false
    });
  }
};

// Listener para mudanças de seleção no Figma
figma.on("selectionchange", () => {
  const selectedIds = figma.currentPage.selection.map(node => node.id);
  figma.ui.postMessage({
    type: "selection-update",
    selectedNodeIds: selectedIds
  });
});
