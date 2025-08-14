// Declaração para o require do Node.js
declare const require: any;

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

// Função principal de linting otimizada
function lint(
  nodes: readonly any[],
  libraries: any[],
  parentFrameId: string | null = null
): any[] {
  let errors: any[] = [];

  try {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];

      if (node.visible === false || node.locked === true) {
        continue;
      }

      // Pular tipos de nodes que não precisam ser analisados
      if (node.type === "SLICE" || node.type === "GROUP") {
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
    newCheckFills(node, errors, libraries);
    newCheckEffects(node, errors, libraries);
    newCheckStrokes(node, errors, libraries);
  } catch (error) {
    console.error("[Controller] Erro em component rules:", error);
  }
  return errors;
}

function lintLineRules(node: any, libraries: any[]): any[] {
  let errors: any[] = [];
  try {
    newCheckStrokes(node, errors, libraries);
  } catch (error) {
    console.error("[Controller] Erro em line rules:", error);
  }
  return errors;
}

function lintFrameRules(node: any, libraries: any[]): any[] {
  let errors: any[] = [];
  try {
    newCheckFills(node, errors, libraries);
    newCheckEffects(node, errors, libraries);
    newCheckStrokes(node, errors, libraries);
  } catch (error) {
    console.error("[Controller] Erro em frame rules:", error);
  }
  return errors;
}

function lintTextRules(node: any, libraries: any[]): any[] {
  let errors: any[] = [];
  try {
    checkType(node, errors, libraries);
    newCheckFills(node, errors, libraries);
    newCheckEffects(node, errors, libraries);
    newCheckStrokes(node, errors, libraries);
  } catch (error) {
    console.error("[Controller] Erro em text rules:", error);
  }
  return errors;
}

function lintRectangleRules(node: any, libraries: any[]): any[] {
  let errors: any[] = [];
  try {
    newCheckFills(node, errors, libraries);
    newCheckEffects(node, errors, libraries);
    newCheckStrokes(node, errors, libraries);
    checkRadius(node, errors);
  } catch (error) {
    console.error("[Controller] Erro em rectangle rules:", error);
  }
  return errors;
}

function lintShapeRules(node: any, libraries: any[]): any[] {
  let errors: any[] = [];
  try {
    newCheckFills(node, errors, libraries);
    newCheckEffects(node, errors, libraries);
    newCheckStrokes(node, errors, libraries);
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
        serializedNode.children = node.children.map((child: any) =>
          serializeNode(child)
        );
      } else {
        serializedNode.children = [];
      }

      return serializedNode;
    };

    const serialized = nodes.map(serializeNode);
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

  return result;
}

// Função para coletar todos os nodes recursivamente (otimizada)
function collectAllNodes(nodes: any[]): any[] {
  const all: any[] = [];
  const maxNodes = 1000; // Limite para evitar processamento excessivo

  function collect(node: any) {
    if (all.length >= maxNodes) return; // Parar se atingir o limite

    all.push(node);
    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        collect(child);
      }
    }
  }

  for (const node of nodes) {
    collect(node);
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
    // Manipulador para obter o nó selecionado para verificação de contraste
    if (msg.type === "get-selected-node") {
      console.log(
        "[Controller] Obtendo nó selecionado para verificação de contraste"
      );
      try {
        const selectedNodes = figma.currentPage.selection;
        if (selectedNodes.length === 0) {
          figma.notify(
            "Por favor, selecione um frame para verificar o contraste",
            { timeout: 3000 }
          );
          return;
        }

        const node = selectedNodes[0];

        // Função para extrair as propriedades relevantes do nó para verificação de contraste
        const extractNodeData = (node: any, depth: number = 0): any => {
          // Limitar a profundidade para evitar sobrecarga
          if (depth > 5) return null;

          try {
            const nodeData: any = {
              id: node.id,
              name: node.name,
              type: node.type,
              visible: node.visible !== false,
              locked: node.locked === true,
              children: []
            };

            // Extrair propriedades de texto
            if (node.type === "TEXT") {
              // Dados básicos de texto
              nodeData.characters = node.characters || "";
              nodeData.fontSize = node.fontSize || 16; // Tamanho padrão se não definido
              nodeData.fontWeight = node.fontWeight || 400; // Peso padrão se não definido
              nodeData.textAlignHorizontal = node.textAlignHorizontal || "LEFT";
              nodeData.textAlignVertical = node.textAlignVertical || "TOP";
              nodeData.textAutoResize = node.textAutoResize || "NONE";

              // Estilos de texto
              if (typeof node.getStyledTextSegments === "function") {
                nodeData.textSegments = node.getStyledTextSegments([
                  "fontSize",
                  "fontName",
                  "fontWeight",
                  "fills",
                  "textCase",
                  "textDecoration",
                  "letterSpacing",
                  "lineHeight",
                  "listOptions"
                ]);
              }

              // Preenchimentos (cores do texto)
              if (node.fills && Array.isArray(node.fills)) {
                nodeData.fills = node.fills.map((fill: any) => ({
                  type: fill.type,
                  visible: fill.visible !== false,
                  opacity: fill.opacity,
                  blendMode: fill.blendMode,
                  color: fill.type === "SOLID" ? fill.color : null,
                  gradientStops:
                    fill.type === "GRADIENT_LINEAR" ||
                    fill.type === "GRADIENT_RADIAL" ||
                    fill.type === "GRADIENT_ANGULAR" ||
                    fill.type === "GRADIENT_DIAMOND"
                      ? fill.gradientStops
                      : null
                }));
              }

              // Efeitos (sombra, etc.)
              if (node.effects && Array.isArray(node.effects)) {
                nodeData.effects = node.effects.map((effect: any) => ({
                  type: effect.type,
                  visible: effect.visible !== false,
                  radius: effect.radius,
                  color: effect.color,
                  offset: effect.offset,
                  spread: effect.spread
                }));
              }
            }

            // Para todos os nós, extrair preenchimentos e traçados
            if (node.fills && Array.isArray(node.fills)) {
              nodeData.fills = node.fills.map((fill: any) => ({
                type: fill.type,
                visible: fill.visible !== false,
                opacity: fill.opacity,
                blendMode: fill.blendMode,
                color: fill.type === "SOLID" ? fill.color : null,
                gradientStops:
                  fill.type === "GRADIENT_LINEAR" ||
                  fill.type === "GRADIENT_RADIAL" ||
                  fill.type === "GRADIENT_ANGULAR" ||
                  fill.type === "GRADIENT_DIAMOND"
                    ? fill.gradientStops
                    : null
              }));
            }

            // Extrair traçados (bordas)
            if (node.strokes && Array.isArray(node.strokes)) {
              nodeData.strokes = node.strokes.map((stroke: any) => ({
                type: stroke.type,
                visible: stroke.visible !== false,
                color: stroke.type === "SOLID" ? stroke.color : null,
                opacity: stroke.opacity,
                blendMode: stroke.blendMode,
                weight: node.strokeWeight || 1
              }));
            }

            // Extrair cantos arredondados
            if (
              node.cornerRadius !== undefined ||
              node.topLeftRadius !== undefined
            ) {
              nodeData.cornerRadius = {
                topLeft: node.topLeftRadius || node.cornerRadius || 0,
                topRight: node.topRightRadius || node.cornerRadius || 0,
                bottomRight: node.bottomRightRadius || node.cornerRadius || 0,
                bottomLeft: node.bottomLeftRadius || node.cornerRadius || 0
              };
            }

            // Extrair opacidade
            if (node.opacity !== undefined) {
              nodeData.opacity = node.opacity;
            }

            // Extrair dimensões e posição
            nodeData.absoluteBoundingBox = node.absoluteBoundingBox
              ? {
                  x: node.absoluteBoundingBox.x,
                  y: node.absoluteBoundingBox.y,
                  width: node.absoluteBoundingBox.width,
                  height: node.absoluteBoundingBox.height
                }
              : null;

            // Processar filhos recursivamente (com limite de profundidade)
            if (node.children && Array.isArray(node.children)) {
              for (const child of node.children) {
                if (child && child.visible !== false && child.locked !== true) {
                  const childData = extractNodeData(child, depth + 1);
                  if (childData) {
                    nodeData.children.push(childData);
                  }
                }
              }
            }

            return nodeData;
          } catch (error) {
            console.error(
              `[extractNodeData] Erro ao processar nó ${node.id}:`,
              error
            );
            return null;
          }
        };

        const nodeData = extractNodeData(node, 0);

        // Enviar dados do nó de volta para a UI
        figma.ui.postMessage({
          type: "selected-node",
          node: nodeData
        });
      } catch (error) {
        console.error("[Controller] Erro ao processar nó selecionado:", error);
        figma.notify("Erro ao processar o frame selecionado", { error: true });
      }
    }

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
      if (
        Array.isArray(figma.currentPage.selection) &&
        figma.currentPage.selection.length === 0
      ) {
        figma.ui.postMessage({
          type: "show-empty-state"
        });
        return;
      }
      figma.ui.postMessage({ type: "show-preloader" });
      try {
        const nodes = figma.currentPage.selection;
        const allNodes = collectAllNodes(nodes);

        // Limitar o tempo de processamento
        const startTime = Date.now();
        const maxProcessingTime = 5000; // 5 segundos máximo

        const lintResults = lint(allNodes, msg.libraries || [], null);

        // Verificar se o processamento demorou muito
        if (Date.now() - startTime > maxProcessingTime) {
          console.warn(
            "[Controller] Processamento demorou mais que 5 segundos"
          );
        }

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
