/// <reference types="@figma/plugin-typings" />

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

import {
  detectTokenLibraries,
  fetchActiveComponentLibraries,
  fetchRemoteStyles
} from "./remoteStyleFunctions";

// Import the measurement controller
import {
  createMeasurement,
  clearMeasurements,
  createAreaMeasurementForNode,
  createPresetMeasurementForNode,
  setMeasurementsVisible,
  createAnglePresetForNode,
  createBalloonForNode
} from "./measurementController"; // MODIFIED

// Estado simples para o modo de medição vindo da UI
let MEASURE_STATE: {
  isMeasuring: boolean;
  mode: "distance" | "area" | "angle";
  showGuides: boolean;
} = {
  isMeasuring: false,
  mode: "distance",
  showGuides: true
};

// Estado de runtime para captura por seleção (clique 1 -> clique 2)
let MEASURE_RUNTIME: {
  firstNodeId?: string;
} = {};

function getAbsoluteCenter(node: any) {
  try {
    const m = node.absoluteTransform as [
      [number, number, number],
      [number, number, number]
    ];
    const absX = m[0][2];
    const absY = m[1][2];
    const w = "width" in node ? node.width : 0;
    const h = "height" in node ? node.height : 0;
    return { x: absX + w / 2, y: absY + h / 2 };
  } catch {
    // fallback relativo
    return {
      x: (node.x || 0) + (node.width || 0) / 2,
      y: (node.y || 0) + (node.height || 0) / 2
    };
  }
}

// Interface para arquivos de tokens salvos
interface SavedTokenFile {
  filename: string;
  timestamp: string;
  name: string;
  tokens?: any;
}

// Tipo para modos de mesclagem
type BlendMode =
  | "PASS_THROUGH"
  | "NORMAL"
  | "DARKEN"
  | "MULTIPLY"
  | "LINEAR_BURN"
  | "COLOR_BURN"
  | "LIGHTEN"
  | "SCREEN"
  | "LINEAR_DODGE"
  | "COLOR_DODGE"
  | "OVERLAY"
  | "SOFT_LIGHT"
  | "HARD_LIGHT"
  | "DIFFERENCE"
  | "EXCLUSION"
  | "HUE"
  | "SATURATION"
  | "COLOR"
  | "LUMINOSITY";

// Interface para representar uma cor RGB
interface RGB {
  r: number;
  g: number;
  b: number;
  a?: number;
}

// Interface para representar um preenchimento sólido
interface SolidPaint {
  type: "SOLID";
  color: RGB;
  opacity?: number;
  visible?: boolean;
  blendMode?: BlendMode;
}

type Paint = SolidPaint;

// Interface para mensagens de exportação de relatório
interface ExportReportMessage {
  type: "export-report";
  html?: string;
  imageData?: string;
  width: number;
  height?: number;
  backgroundColor?: string;
  borderRadius?: number;
}

// Tipo para VectorStrokeCap
type VectorStrokeCap =
  | "NONE"
  | "ROUND"
  | "SQUARE"
  | "ARROW_LINES"
  | "ARROW"
  | "TRIANGLE_FILLED"
  | "CIRCLE_FILLED"
  | "DIAMOND_FILLED";

// Interface para mensagens da UI
interface UIMessage {
  type: string;
  data?: any;
  id?: string;
  field?: string;
  nodes?: string[];
  styleId?: string;
  tokens?: any;
  success?: boolean;
  message?: string;
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
  isInspecting?: boolean;
  html?: string;
  imageData?: string;
  width?: number;
  height?: number;
  backgroundColor?: string;
  borderRadius?: number;
  payload?: any;
  savedTokens?: any[];
}

// Declaração da constante figma
declare const figma: {
  currentPage: {
    selection: any[];
    appendChild: (node: any) => void;
  };
  getNodeById: (id: string) => any;
  viewport: {
    scrollAndZoomIntoView: (nodes: any[]) => void;
    bounds: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
  notify: (message: string, options?: any) => void;
  ui: {
    postMessage: (message: any) => void;
    onmessage: (msg: any) => void;
    resize: (width: number, height: number) => void;
  };
  on: (event: string, callback: (event?: any) => void) => void;
  clientStorage: {
    getAsync: (key: string) => Promise<any>;
    setAsync: (key: string, value: any) => Promise<void>;
  };
  root: {
    name: string;
  };
  createRectangle: () => any;
  createImage: (bytes: Uint8Array) => { hash: string };
  closePlugin: (message?: string) => void;
};

const {
  getLocalPaintStyles,
  getLocalTextStyles,
  getLocalEffectStyles
} = require("./styles");

// @ts-ignore - __html__ é fornecido pelo Figma
figma.showUI(__html__, { width: 480, height: 700 });
figma.ui.resize(480, 700);

// Inicialização do controlador de medições não é necessária aqui; measurementController gerencia seus próprios estados.

// Sempre que a seleção mudar, notificar a UI e, se estiver em modo de medição,
// criar uma medição simples entre dois itens selecionados (modo distância)
figma.on("selectionchange", async () => {
  try {
    const selLen =
      figma.currentPage.selection && figma.currentPage.selection.length
        ? figma.currentPage.selection.length
        : 0;
    figma.ui.postMessage({
      type: "selection-updated",
      payload: { count: selLen }
    });

    if (
      MEASURE_STATE.isMeasuring &&
      (MEASURE_STATE.mode === "distance" || MEASURE_STATE.mode === "angle")
    ) {
      const sel = figma.currentPage.selection as any[];
      if (!sel || sel.length === 0) {
        return;
      }
      const current = sel[0];
      if (!MEASURE_RUNTIME.firstNodeId) {
        // primeiro clique
        MEASURE_RUNTIME.firstNodeId = current.id;
        return;
      }
      if (
        MEASURE_RUNTIME.firstNodeId &&
        current.id !== MEASURE_RUNTIME.firstNodeId
      ) {
        // segundo clique
        const a = figma.getNodeById(MEASURE_RUNTIME.firstNodeId) as any;
        const b = current;
        if (a && b) {
          const ca = getAbsoluteCenter(a);
          const cb = getAbsoluteCenter(b);
          createMeasurement(ca.x, ca.y, cb.x, cb.y, MEASURE_STATE.mode as any);
        }
        // pronto para nova captura
        MEASURE_RUNTIME.firstNodeId = undefined;
      }
    } else if (MEASURE_STATE.isMeasuring && MEASURE_STATE.mode === "area") {
      const sel = figma.currentPage.selection as any[];
      if (!sel || sel.length === 0) return;
      // Criar medição de área para todos os nós selecionados
      for (const node of sel) {
        await createAreaMeasurementForNode(node as SceneNode);
      }
    }
  } catch (e) {
    console.warn("[Controller] selectionchange handler error", e);
  }
});

// Função principal de linting otimizada
function lint(
  nodes: readonly any[],
  libraries: any[],
  parentFrameId: string | null = null,
  savedTokens: any[] = []
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

      // Chama a função de lint para o node, passando o parentFrameId e tokens salvos
      const nodeErrors = determineTypeWithFrame(
        node,
        libraries,
        currentFrameId,
        savedTokens
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
        errors = errors.concat(
          lint(node.children, libraries, currentFrameId, savedTokens)
        );
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
  parentFrameId: string | null,
  savedTokens: any[] = []
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
        errors = lintShapeRules(node, libraries, savedTokens);
        break;
      case "FRAME":
        errors = lintFrameRules(node, libraries, savedTokens);
        break;
      case "INSTANCE":
      case "RECTANGLE":
        errors = lintRectangleRules(node, libraries, savedTokens);
        break;
      case "COMPONENT":
        errors = lintComponentRules(node, libraries, savedTokens);
        break;
      case "TEXT":
        errors = lintTextRules(node, libraries, savedTokens);
        break;
      case "LINE":
        errors = lintLineRules(node, libraries, savedTokens);
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
function lintComponentRules(
  node: any,
  libraries: any[],
  savedTokens: any[] = []
): any[] {
  let errors: any[] = [];
  try {
    // Prepara os objetos de bibliotecas com as propriedades esperadas
    const fillLibraries = { fills: new Set(libraries) };
    const effectLibraries = { effects: new Set(libraries) };
    const textLibraries = { text: new Set(libraries) };

    newCheckFills(node, errors, fillLibraries, savedTokens);
    newCheckEffects(node, errors, effectLibraries, savedTokens);
    newCheckStrokes(node, errors, fillLibraries, savedTokens);
  } catch (error) {
    console.error("[Controller] Erro em component rules:", error);
  }
  return errors;
}

function lintLineRules(
  node: any,
  libraries: any[],
  savedTokens: any[] = []
): any[] {
  let errors: any[] = [];
  try {
    const fillLibraries = { fills: new Set(libraries) };
    newCheckStrokes(node, errors, fillLibraries, savedTokens);
  } catch (error) {
    console.error("[Controller] Erro em line rules:", error);
  }
  return errors;
}

function lintFrameRules(
  node: any,
  libraries: any[],
  savedTokens: any[] = []
): any[] {
  let errors: any[] = [];
  try {
    const fillLibraries = { fills: new Set(libraries) };
    const effectLibraries = { effects: new Set(libraries) };

    newCheckFills(node, errors, fillLibraries, savedTokens);
    newCheckEffects(node, errors, effectLibraries, savedTokens);
    newCheckStrokes(node, errors, fillLibraries, savedTokens);
  } catch (error) {
    console.error("[Controller] Erro em frame rules:", error);
  }
  return errors;
}

function lintTextRules(
  node: any,
  libraries: any[],
  savedTokens: any[] = []
): any[] {
  let errors: any[] = [];
  try {
    const fillLibraries = { fills: new Set(libraries) };
    const effectLibraries = { effects: new Set(libraries) };
    const textLibraries = { text: new Set(libraries) };

    checkType(node, errors, textLibraries, savedTokens);
    newCheckFills(node, errors, fillLibraries, savedTokens);
    newCheckEffects(node, errors, effectLibraries, savedTokens);
    newCheckStrokes(node, errors, fillLibraries, savedTokens);
  } catch (error) {
    console.error("[Controller] Erro em text rules:", error);
  }
  return errors;
}

function lintRectangleRules(
  node: any,
  libraries: any[],
  savedTokens: any[] = []
): any[] {
  let errors: any[] = [];
  try {
    const fillLibraries = { fills: new Set(libraries) };
    const effectLibraries = { effects: new Set(libraries) };

    newCheckFills(node, errors, fillLibraries, savedTokens);
    newCheckEffects(node, errors, effectLibraries, savedTokens);
    newCheckStrokes(node, errors, fillLibraries, savedTokens);
    checkRadius(node, errors, savedTokens);
  } catch (error) {
    console.error("[Controller] Erro em rectangle rules:", error);
  }
  return errors;
}

function lintShapeRules(
  node: any,
  libraries: any[],
  savedTokens: any[] = []
): any[] {
  let errors: any[] = [];
  try {
    const fillLibraries = { fills: new Set(libraries) };
    const effectLibraries = { effects: new Set(libraries) };

    newCheckFills(node, errors, fillLibraries, savedTokens);
    newCheckEffects(node, errors, effectLibraries, savedTokens);
    newCheckStrokes(node, errors, fillLibraries, savedTokens);
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
        hasChildren: n.children && n.children.length > 0 ? true : false
      }))
    );

    const serializeNode = (node: any): any => {
      const childCount =
        node.children && node.children.length ? node.children.length : 0;
      console.log(
        `[Controller] Serializando node: ${node.name} (${node.type}) - filhos: ${childCount}`
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
    const fallbackId = err && err.node && err.node.id ? err.node.id : undefined;
    const fallbackName =
      err && err.node && err.node.name ? err.node.name : undefined;
    return {
      ...err,
      parentFrameId: err && err.parentFrameId ? err.parentFrameId : null,
      nodeId: err && err.nodeId ? err.nodeId : fallbackId,
      nodeName: err && err.nodeName ? err.nodeName : fallbackName,
      type: err && err.type ? err.type : "unknown",
      message: err && err.message ? err.message : "Erro desconhecido",
      value: err && err.value ? err.value : "",
      count: err && err.count ? err.count : 1,
      nodes:
        err && err.nodes
          ? err.nodes
          : [err && err.nodeId ? err.nodeId : fallbackId],
      matches: err && err.matches ? err.matches : [],
      suggestions: err && err.suggestions ? err.suggestions : []
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
    // ===== Handlers do Medidor (canvas) =====
    if (msg.type === "init-measurement-tool") {
      const payload = msg as any; // Usar type assertion para acessar propriedades adicionais
      MEASURE_STATE.isMeasuring =
        payload && typeof payload.isMeasuring === "boolean"
          ? payload.isMeasuring
          : false;
      MEASURE_STATE.mode = payload && payload.mode ? payload.mode : "distance";
      MEASURE_STATE.showGuides =
        payload && typeof payload.showGuides === "boolean"
          ? payload.showGuides
          : true;

      figma.ui.postMessage({
        type: "selection-updated",
        payload: {
          count:
            figma.currentPage.selection && figma.currentPage.selection.length
              ? figma.currentPage.selection.length
              : 0
        }
      });
      return;
    }

    if (msg.type === "get-selection-count") {
      const selCount = figma.currentPage.selection?.length || 0;
      figma.ui.postMessage({
        type: "selection-updated",
        payload: { count: selCount }
      });
      return;
    }

    if (msg.type === "set-measurement-mode") {
      const payload = msg as any; // Usar type assertion para acessar propriedades adicionais
      if (typeof payload.isMeasuring === "boolean") {
        MEASURE_STATE.isMeasuring = payload.isMeasuring;
      }
      if (payload.mode) {
        MEASURE_STATE.mode = payload.mode;
      }
      return;
    }

    if (msg.type === "toggle-guides") {
      const payload = msg as any; // Usar type assertion para acessar propriedades adicionais
      const showGuides =
        typeof payload.showGuides === "boolean"
          ? payload.showGuides
          : MEASURE_STATE.showGuides;
      MEASURE_STATE.showGuides = Boolean(showGuides);
      // Mostrar/ocultar medições no canvas conforme estado
      setMeasurementsVisible(MEASURE_STATE.showGuides);
      return;
    }

    if (msg.type === "create-preset-measurement") {
      try {
        console.log("[DEBUG] Handling create-preset-measurement");
        console.log("[DEBUG] Full message:", JSON.stringify(msg, null, 2));

        const payload = msg.payload as any;
        const position = payload.position;
        const offset = payload.offset;
        const strokeCap = payload.strokeCap;
        const sel = figma.currentPage.selection;

        console.log("[DEBUG] Position:", position);
        console.log("[DEBUG] Selection count:", sel.length);
        console.log("[DEBUG] Offset:", offset);
        console.log("[DEBUG] StrokeCap:", strokeCap);

        if (!position || !sel || sel.length === 0) {
          console.log(
            "[DEBUG] Validation failed. Position or selection missing."
          );
          figma.notify("Selecione ao menos um objeto para aplicar a medida.");
          return;
        }

        console.log("[DEBUG] Validation passed. Starting loop.");
        for (const node of sel) {
          console.log("[DEBUG] Creating measurement for node:", node.id);
          await createPresetMeasurementForNode(
            node as SceneNode,
            position,
            offset,
            strokeCap
          );
        }
        console.log("[DEBUG] Loop finished.");
      } catch (e) {
        console.error("[DEBUG] Error in create-preset-measurement handler:", e);
        figma.notify("Ocorreu um erro ao criar a medida.");
      }
      return;
    }

    if (msg.type === "create-angle-preset") {
      const payload = msg as any; // Usar type assertion para acessar propriedades adicionais
      const corner = payload.corner as
        | "top-left"
        | "top-right"
        | "bottom-left"
        | "bottom-right"
        | "all";
      const sel = figma.currentPage.selection as SceneNode[];
      if (!corner || !sel || sel.length === 0) {
        figma.notify("Selecione ao menos um objeto para inserir ângulos.");
        return;
      }
      for (const node of sel) {
        await createAnglePresetForNode(node, corner);
      }
      // Garantir visibilidade conforme estado atual
      setMeasurementsVisible(MEASURE_STATE.showGuides);
      return;
    }

    if (msg.type === "create-balloon") {
      try {
        console.log("[DEBUG] Handling create-balloon");
        console.log("[DEBUG] Full message:", JSON.stringify(msg, null, 2));

        const payload = msg.payload as any;
        const position = payload.position;
        const sel = figma.currentPage.selection;

        console.log("[DEBUG] Position:", position);
        console.log("[DEBUG] Selection count:", sel.length);

        if (!position || !sel || sel.length === 0) {
          console.log(
            "[DEBUG] Validation failed for balloon. Position or selection missing."
          );
          figma.notify(
            "Selecione ao menos um objeto para inserir o balão de anotação."
          );
          return;
        }

        console.log("[DEBUG] Balloon validation passed. Starting loop.");
        for (const node of sel) {
          console.log("[DEBUG] Creating balloon for node:", node.id);
          await createBalloonForNode(node as SceneNode, position);
        }
        console.log("[DEBUG] Balloon loop finished.");
        setMeasurementsVisible(MEASURE_STATE.showGuides);
      } catch (e) {
        console.error("[DEBUG] Error in create-balloon handler:", e);
        figma.notify("Ocorreu um erro ao criar a anotação.");
      }
      return;
    }

    // Carregar tokens salvos
    if (msg.type === "load-saved-tokens") {
      const result = await loadSavedTokens();
      figma.ui.postMessage({
        type: "saved-tokens-loaded",
        success: result.success,
        tokens: result.success ? result.tokens : [],
        message: result.success ? undefined : result.message
      });
      return;
    }

    // Salvar tokens de design
    if (msg.type === "save-design-tokens" && msg.tokens) {
      const result = await saveDesignTokens(msg.tokens);
      figma.ui.postMessage({
        type: "design-tokens-saved",
        success: result.success,
        message: result.message,
        tokens: result.tokens || []
      });
      return;
    }
    // Handler para atualizar erros (usado pela página de camadas)
    if (msg.type === "update-errors") {
      console.log("[Controller] Processando update-errors");
      try {
        const nodes = figma.currentPage.selection;
        if (nodes && nodes.length > 0) {
          const allNodes = collectAllNodes(nodes);
          const effectiveLibraries = Array.isArray(msg.libraries)
            ? msg.libraries
            : [];

          const lintResults = lint(
            allNodes,
            effectiveLibraries,
            null,
            msg.savedTokens || []
          );
          const groupedErrors = groupErrorsByNode(lintResults);
          const serializedNodes = serializeNodes(nodes);

          figma.ui.postMessage({
            type: "updated errors",
            errors: groupedErrors,
            message: serializedNodes,
            success: true
          });
        } else {
          figma.ui.postMessage({
            type: "updated errors",
            errors: [],
            message: [],
            success: false,
            error: "Nenhum nó selecionado"
          });
        }
      } catch (error) {
        console.error("[Controller] Erro ao processar update-errors:", error);
        figma.ui.postMessage({
          type: "updated errors",
          errors: [],
          message: [],
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
      return;
    }

    if (msg.type === "measurement-tool-ready") {
      const selection = figma.currentPage.selection;
      const node = selection.length > 0 ? selection[0] : null;
      figma.ui.postMessage({
        type: "selection-changed",
        payload: node
          ? {
              id: node.id,
              x: node.x,
              y: node.y,
              width: "width" in node ? node.width : 0,
              height: "height" in node ? node.height : 0,
              rotation: "rotation" in node ? node.rotation : 0,
              visible: "visible" in node ? node.visible : true,
              measurements: {}
            }
          : null
      });
      return;
    }

    if (msg.type === "create-measurement") {
      const { startX, startY, endX, endY } = msg.payload;
      createMeasurement(startX, startY, endX, endY);
      return;
    }

    if (msg.type === "clear-measurements") {
      clearMeasurements();
      return;
    }

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
      const nodesArr = msg && msg.nodes && msg.nodes.length ? msg.nodes : [];
      const node = figma.getNodeById(nodesArr.length > 0 ? nodesArr[0] : "");
      if (node) {
        figma.currentPage.selection = [node];
        figma.viewport.scrollAndZoomIntoView([node]);
      }
    }

    if (msg.type === "select-multiple-layers") {
      console.log("[Controller] Selecionando múltiplas layers");
      const nodesToBeSelected: any[] = [];
      if (msg && Array.isArray(msg.nodes)) {
        msg.nodes.forEach(item => {
          const layer = figma.getNodeById(item);
          if (layer) {
            nodesToBeSelected.push(layer);
          }
        });
      }
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
        const extractNodeData = (
          node: any,
          depth: number = 0,
          parentSummary: any = null
        ): any => {
          // Limitar a profundidade para evitar sobrecarga
          if (depth > 5) return null;

          try {
            const nodeData: any = {
              id: node.id,
              name: node.name,
              type: node.type,
              visible: node.visible !== false,
              locked: node.locked === true,
              // Snapshot mínimo do pai para que a UI consiga subir a hierarquia
              parent: parentSummary,
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
                  // Resumo mínimo do nó atual para ser utilizado como "parent" pelo filho
                  const parentSnapshot = {
                    id: node.id,
                    name: node.name,
                    type: node.type,
                    visible: node.visible !== false,
                    locked: node.locked === true,
                    // Replicar apenas o essencial necessário para cálculo de fundo
                    fills: Array.isArray(node.fills)
                      ? node.fills.map((fill: any) => ({
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
                        }))
                      : undefined,
                    strokes: Array.isArray(node.strokes)
                      ? node.strokes.map((stroke: any) => ({
                          type: stroke.type,
                          visible: stroke.visible !== false,
                          color: stroke.type === "SOLID" ? stroke.color : null,
                          opacity: stroke.opacity,
                          blendMode: stroke.blendMode,
                          weight: node.strokeWeight || 1
                        }))
                      : undefined,
                    opacity: node.opacity
                  };

                  const childData = extractNodeData(
                    child,
                    depth + 1,
                    parentSnapshot
                  );
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
        console.log(
          "[Controller] Salvando",
          libs.length,
          "bibliotecas no clientStorage"
        );
        figma.clientStorage.setAsync("solarops_selected_libs", libs);
        figma.ui.postMessage({ type: "user-libs-saved", success: true });
      } catch (e) {
        console.error("[Controller] Erro ao salvar bibliotecas:", e);
        figma.ui.postMessage({
          type: "user-libs-saved",
          success: false,
          error: String(e)
        });
      }
    }

    if (msg.type === "get-user-libs") {
      // Retorna as bibliotecas salvas do usuário
      try {
        const libs =
          (await figma.clientStorage.getAsync("solarops_selected_libs")) || [];
        console.log(
          "[Controller] Carregando",
          libs.length,
          "bibliotecas do clientStorage"
        );
        figma.ui.postMessage({ type: "user-libs-loaded", libs });
      } catch (e) {
        console.error("[Controller] Erro ao carregar bibliotecas:", e);
        figma.ui.postMessage({ type: "user-libs-loaded", libs: [] });
      }
    }

    // Atualiza as bibliotecas ativas
    if (msg.type === "update-active-libraries") {
      console.log(
        "[Controller] Atualizando bibliotecas ativas:",
        msg.libraries
      );
      try {
        await figma.clientStorage.setAsync(
          "solarops_selected_libs",
          msg.libraries
        );
        console.log("[Controller] Bibliotecas ativas salvas com sucesso");
      } catch (error) {
        console.error("[Controller] Erro ao salvar bibliotecas ativas:", error);
      }
      return;
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

        // Resolve libraries (tokens) to use in audit:
        // Priority: libraries passed from UI; fallback to saved user libs in clientStorage.
        console.log(
          "[Controller] Iniciando resolução das bibliotecas para auditoria"
        );
        console.log(
          "[Controller] Bibliotecas recebidas da UI:",
          (msg as any).libraries
        );

        let effectiveLibraries = Array.isArray((msg as any).libraries)
          ? (msg as any).libraries
          : null;

        console.log(
          "[Controller] Bibliotecas após verificação inicial:",
          effectiveLibraries
        );

        if (!effectiveLibraries || effectiveLibraries.length === 0) {
          console.log(
            "[Controller] Nenhuma biblioteca fornecida pela UI, verificando clientStorage..."
          );
          try {
            const savedLibs = await figma.clientStorage.getAsync(
              "solarops_selected_libs"
            );
            console.log(
              "[Controller] Bibliotecas salvas no clientStorage:",
              savedLibs
            );

            if (Array.isArray(savedLibs) && savedLibs.length > 0) {
              effectiveLibraries = savedLibs;
              console.log("[Controller] Usando bibliotecas do clientStorage");
            } else {
              console.log(
                "[Controller] Nenhuma biblioteca encontrada no clientStorage"
              );
            }
          } catch (e) {
            console.error("[Controller] Erro ao acessar clientStorage:", e);
            effectiveLibraries = [];
          }
        }

        if (!effectiveLibraries || effectiveLibraries.length === 0) {
          console.warn(
            "[Controller] Nenhuma biblioteca disponível para auditoria"
          );
          effectiveLibraries = [];
        }

        console.log(
          "[Controller] Executando auditoria com",
          effectiveLibraries.length,
          "bibliotecas:",
          effectiveLibraries.map((lib: any) => ({
            name: lib && lib.name ? lib.name : undefined,
            id: lib && lib.id ? lib.id : undefined,
            tokens: lib && lib.tokens ? Object.keys(lib.tokens) : []
          }))
        );

        const lintResults = lint(
          allNodes,
          effectiveLibraries,
          null,
          msg.savedTokens || []
        );

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

    if (msg.type === "toggle-inspect-mode") {
      console.log(
        "[Controller] Modo de inspeção:",
        msg.isInspecting ? "ativado" : "desativado"
      );
      // O listener de selectionchange já cuida de enviar os dados do nó selecionado
      return;
    }

    // Handler para exportar o relatório como imagem no canvas
    if (msg.type === "export-report") {
      try {
        console.log("[Controller] Recebendo relatório para exportação");

        // Verificar se temos dados de imagem
        if (!msg.imageData) {
          throw new Error("Dados de imagem não fornecidos");
        }

        console.log("[Controller] Iniciando processamento da imagem...");

        // Extrair os dados da imagem (remover o cabeçalho da data URL)
        let base64Data = msg.imageData.includes(",")
          ? msg.imageData.split(",")[1]
          : msg.imageData;

        console.log(
          "[Controller] Dados base64 extraídos, comprimento:",
          base64Data.length
        );

        // Remover caracteres que não são base64
        base64Data = base64Data.replace(/[^A-Za-z0-9+/=]/g, "");

        console.log(
          "[Controller] Dados base64 limpos, comprimento:",
          base64Data.length
        );

        // Verificar se temos dados suficientes
        if (base64Data.length < 4) {
          throw new Error("Dados de imagem inválidos ou muito curtos");
        }

        // Decodificar a string base64 para bytes
        let binaryString = "";
        const chars =
          "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        let i = 0;

        console.log("[Controller] Iniciando decodificação base64...");

        while (i < base64Data.length) {
          const enc1 = chars.indexOf(base64Data.charAt(i++));
          const enc2 = chars.indexOf(base64Data.charAt(i++) || "=");
          const enc3 = chars.indexOf(base64Data.charAt(i++) || "=");
          const enc4 = chars.indexOf(base64Data.charAt(i++) || "=");

          const chr1 = (enc1 << 2) | (enc2 >> 4);
          const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
          const chr3 = ((enc3 & 3) << 6) | enc4;

          binaryString += String.fromCharCode(chr1);
          if (enc3 !== 64) binaryString += String.fromCharCode(chr2);
          if (enc4 !== 64) binaryString += String.fromCharCode(chr3);
        }

        const len = binaryString.length;
        console.log(
          "[Controller] Tamanho da string binária decodificada:",
          len
        );

        if (len === 0) {
          throw new Error(
            "Falha ao decodificar a imagem: string binária vazia"
          );
        }

        const bytes = new Uint8Array(len);

        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        console.log(
          "[Controller] Bytes da imagem preparados, tamanho:",
          bytes.length,
          "bytes"
        );

        console.log(
          "[Controller] Dados da imagem processados, criando imagem no Figma..."
        );

        // Criar um nó de imagem no Figma
        let image;
        try {
          console.log(
            "[Controller] Chamando figma.createImage com",
            bytes.length,
            "bytes"
          );
          image = figma.createImage(bytes);
          console.log(
            "[Controller] Imagem criada com sucesso, hash:",
            image.hash
          );
        } catch (error) {
          console.error("[Controller] Erro ao criar imagem no Figma:", error);
          throw new Error(`Falha ao criar imagem no Figma: ${error.message}`);
        }

        // Criar um retângulo para conter a imagem
        const width = msg.width || 800;
        const height = msg.height || 1000;
        const rect = figma.createRectangle();
        rect.name = "Relatório de Acessibilidade";
        rect.resize(width, height);

        // Aplicar a imagem como preenchimento
        const fills = [...rect.fills];
        fills[0] = {
          type: "IMAGE",
          imageHash: image.hash,
          scaleMode: "FILL",
          scalingFactor: 0.5
        };
        rect.fills = fills;

        // Definir o raio da borda
        rect.cornerRadius = msg.borderRadius || 16;

        // Posicionar o retângulo no centro da viewport
        const viewport = figma.viewport.bounds;
        rect.x = viewport.x + (viewport.width - width) / 2;
        rect.y = viewport.y + (viewport.height - height) / 2;

        // Adicionar o retângulo à página atual
        figma.currentPage.appendChild(rect);

        // Selecionar o retângulo criado
        figma.currentPage.selection = [rect];
        figma.viewport.scrollAndZoomIntoView([rect]);

        // Enviar confirmação de sucesso para a UI
        figma.ui.postMessage({
          type: "report-exported",
          success: true,
          message: "Relatório exportado com sucesso para o canvas do Figma!"
        });

        console.log("[Controller] Relatório exportado com sucesso");
      } catch (error) {
        console.error("[Controller] Erro ao exportar relatório:", error);

        // Enviar mensagem de erro para a UI
        figma.ui.postMessage({
          type: "report-export-error",
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Erro desconhecido ao exportar relatório"
        });
      }
      return;
    }

    if (msg.type === "save-design-tokens") {
      console.log("[Controller] Salvando tokens de design");
      try {
        if (!msg.tokens) {
          throw new Error("No tokens provided to save");
        }
        await saveDesignTokens(msg.tokens);
        figma.ui.postMessage({
          type: "design-tokens-saved",
          success: true
        });
      } catch (error) {
        console.error("[Controller] Erro ao salvar tokens de design:", error);
        figma.ui.postMessage({
          type: "design-tokens-saved",
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
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

// Função para carregar os tokens salvos
async function loadSavedTokens() {
  try {
    const savedFiles =
      (await figma.clientStorage.getAsync("savedTokenFiles")) || [];
    const tokensList: SavedTokenFile[] = [];

    // Carregar todos os tokens salvos, ordenados do mais recente para o mais antigo
    // Removido o slice(0, 10) para carregar todos os tokens salvos
    for (const file of (savedFiles as SavedTokenFile[]).sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )) {
      try {
        const tokens = await figma.clientStorage.getAsync(file.filename);
        if (typeof tokens === "string" && tokens.trim().length) {
          try {
            const parsed = JSON.parse(tokens);
            tokensList.push({
              ...file,
              tokens: parsed
            });
          } catch (e) {
            console.warn(
              "[loadSavedTokens] Ignorando conteúdo inválido em",
              file.filename
            );
          }
        }
      } catch (error) {
        console.error(`Erro ao carregar tokens de ${file.filename}:`, error);
      }
    }

    return {
      success: true,
      tokens: tokensList
    };
  } catch (error) {
    console.error("Erro ao carregar tokens salvos:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Falha ao carregar os tokens salvos"
    };
  }
}

// Função para salvar os tokens de design
async function saveDesignTokens(tokens: any) {
  try {
    // Criar um nome de arquivo único com timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `design-tokens-${timestamp}.json`;

    // Salvar no clientStorage do Figma
    await figma.clientStorage.setAsync(
      filename,
      JSON.stringify(tokens, null, 2)
    );

    // Obter a lista de arquivos salvos
    const savedFiles =
      (await figma.clientStorage.getAsync("savedTokenFiles")) || [];

    // Adicionar o novo arquivo à lista (limitar a 10 arquivos)
    savedFiles.unshift({
      filename,
      timestamp: new Date().toISOString(),
      name: `Tokens ${new Date().toLocaleString()}`
    });

    // Salvar a lista completa de arquivos
    await figma.clientStorage.setAsync("savedTokenFiles", savedFiles);

    console.log(`Design tokens salvos como: ${filename}`);

    // Retornar a lista atualizada de tokens
    const loadedTokens = await loadSavedTokens();

    return {
      success: true,
      message: "Design tokens salvos com sucesso",
      filename,
      timestamp: new Date().toISOString(),
      tokens: loadedTokens.success ? loadedTokens.tokens : []
    };
  } catch (error) {
    console.error("Erro ao salvar design tokens:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Falha ao salvar os tokens de design"
    };
  }
}

// Listener para mudanças de seleção no Figma
figma.on("selectionchange", () => {
  console.log("Evento selectionchange acionado no Figma");

  try {
    const selectedNodes = figma.currentPage.selection;
    console.log(`Nós selecionados: ${selectedNodes.length} nós`);

    const selectedIds = selectedNodes.map(node => node.id);
    console.log("IDs dos nós selecionados:", selectedIds);

    if (selectedNodes.length > 0) {
      console.log("Primeiro nó selecionado:", {
        id: selectedNodes[0].id,
        name: selectedNodes[0].name,
        type: selectedNodes[0].type
      });

      // Função para extrair dados completos do nó
      const extractNodeData = (node: any) => {
        const nodeData: any = {
          id: node.id,
          name: node.name,
          type: node.type,
          visible: node.visible !== false,
          locked: node.locked === true
        };

        // Dimensões e posição
        if (node.absoluteBoundingBox) {
          nodeData.bounds = {
            width: node.absoluteBoundingBox.width,
            height: node.absoluteBoundingBox.height
          };
          nodeData.position = {
            x: node.absoluteBoundingBox.x,
            y: node.absoluteBoundingBox.y
          };
        }

        // Layout e espaçamento
        if (node.layoutMode) {
          nodeData.layoutMode = node.layoutMode;
        }
        if (node.paddingTop !== undefined) {
          nodeData.padding = {
            top: node.paddingTop,
            right: node.paddingRight || 0,
            bottom: node.paddingBottom || 0,
            left: node.paddingLeft || 0
          };
        }
        if (node.itemSpacing !== undefined) {
          nodeData.gap = node.itemSpacing;
        }
        if (node.cornerRadius !== undefined) {
          nodeData.cornerRadius = node.cornerRadius;
        }

        // Cores e preenchimentos
        if (node.fills && Array.isArray(node.fills)) {
          nodeData.fills = node.fills.map((fill: any) => ({
            type: fill.type,
            visible: fill.visible !== false,
            opacity: fill.opacity,
            color: fill.type === "SOLID" ? fill.color : null,
            gradientStops: fill.gradientStops || null
          }));
        }

        // Bordas
        if (node.strokes && Array.isArray(node.strokes)) {
          nodeData.strokes = node.strokes.map((stroke: any) => ({
            type: stroke.type,
            visible: stroke.visible !== false,
            color: stroke.type === "SOLID" ? stroke.color : null,
            strokeWeight: node.strokeWeight || stroke.strokeWeight
          }));
        }

        // Efeitos
        if (node.effects && Array.isArray(node.effects)) {
          nodeData.effects = node.effects.map((effect: any) => ({
            type: effect.type,
            visible: effect.visible !== false,
            color: effect.color,
            offset: effect.offset,
            radius: effect.radius,
            spread: effect.spread
          }));
        }

        // Propriedades de texto
        if (node.type === "TEXT") {
          nodeData.fontSize = node.fontSize;
          nodeData.fontName = node.fontName;
          nodeData.fontWeight = node.fontWeight;
          nodeData.textAlignHorizontal = node.textAlignHorizontal;
          nodeData.textAlignVertical = node.textAlignVertical;
          nodeData.letterSpacing = node.letterSpacing;
          nodeData.lineHeight = node.lineHeight;
          nodeData.characters = node.characters;

          // Cor do texto (primeiro fill)
          if (
            node.fills &&
            node.fills.length > 0 &&
            node.fills[0].type === "SOLID"
          ) {
            nodeData.textColor = node.fills[0].color;
          }
        }

        // Componentes
        if (node.type === "INSTANCE") {
          nodeData.componentProperties = {
            name:
              node.mainComponent && node.mainComponent.name
                ? node.mainComponent.name
                : "Sem nome",
            key:
              node.mainComponent && node.mainComponent.key
                ? node.mainComponent.key
                : undefined,
            description:
              node.mainComponent && node.mainComponent.description
                ? node.mainComponent.description
                : ""
          };

          // Adiciona todas as propriedades do componente
          if (node.componentProperties) {
            const uniqueProps = new Map();

            // Processa as propriedades
            for (const [key, prop] of Object.entries(
              node.componentProperties
            ) as [string, any][]) {
              if (
                !prop ||
                prop.value === undefined ||
                prop.value === null ||
                prop.value === ""
              ) {
                continue;
              }

              // Limpa o nome da propriedade removendo sufixos de ID
              const cleanKey = key.replace(/#[^:]+:\d+$/, "").trim();

              // Processa o valor da propriedade
              let value;
              if (
                prop.type === "INSTANCE_SWAP" &&
                typeof prop.value === "string"
              ) {
                const instanceNode = figma.getNodeById(prop.value);
                if (instanceNode && instanceNode.mainComponent) {
                  value = instanceNode.mainComponent.name;
                } else if (instanceNode) {
                  value = instanceNode.name;
                } else {
                  value = prop.value; // fallback to ID
                }
              } else if (typeof prop.value === "boolean") {
                value = prop.value;
              } else if (typeof prop.value === "string") {
                value = prop.value.trim();
              } else if (typeof prop.value === "object") {
                value = JSON.stringify(prop.value);
              } else {
                value = String(prop.value).trim();
              }

              // Adiciona ao mapa (isso automaticamente remove duplicatas)
              uniqueProps.set(cleanKey, value);
            }

            // Cria o objeto final de propriedades
            nodeData.componentProperties = {
              name:
                node.mainComponent && node.mainComponent.name
                  ? node.mainComponent.name
                  : "Sem nome",
              key:
                node.mainComponent && node.mainComponent.key
                  ? node.mainComponent.key
                  : undefined,
              description:
                node.mainComponent && node.mainComponent.description
                  ? node.mainComponent.description
                  : "",
              ...Object.fromEntries(uniqueProps)
            };
          }
        }

        // Elementos filhos
        if (node.children && Array.isArray(node.children)) {
          nodeData.children = node.children.slice(0, 10).map((child: any) => ({
            id: child.id,
            name: child.name,
            type: child.type
          }));
        }

        // Ícones (verificar se é um ícone ou contém ícones)
        if (
          node.name &&
          (node.name.toLowerCase().includes("icon") || node.type === "VECTOR")
        ) {
          nodeData.icon = {
            name: node.name,
            type: node.type,
            url: node.exportAsync ? node.exportAsync({ format: "PNG" }) : null
          };
        }

        // Tokens de estilo
        if (node.fillStyleId) {
          nodeData.styleTokens = {
            fillStyle: node.fillStyleId
          };
        }
        if (node.strokeStyleId) {
          nodeData.styleTokens = {
            ...nodeData.styleTokens,
            strokeStyle: node.strokeStyleId
          };
        }
        if (node.textStyleId) {
          nodeData.styleTokens = {
            ...nodeData.styleTokens,
            textStyle: node.textStyleId
          };
        }
        if (node.effectStyleId) {
          nodeData.styleTokens = {
            ...nodeData.styleTokens,
            effectStyle: node.effectStyleId
          };
        }

        return nodeData;
      };

      // Enviar mensagem de nó selecionado com dados completos
      figma.ui.postMessage({
        type: "selected-node",
        node: extractNodeData(selectedNodes[0])
      });

      // For measurement tool
      const node = selectedNodes[0];
      figma.ui.postMessage({
        type: "selection-changed",
        payload: {
          id: node.id,
          x: node.x,
          y: node.y,
          width: "width" in node ? node.width : 0,
          height: "height" in node ? node.height : 0,
          rotation: "rotation" in node ? node.rotation : 0,
          visible: "visible" in node ? node.visible : true,
          measurements: {}
        }
      });
    } else {
      console.log("Nenhum nó selecionado");
      figma.ui.postMessage({
        type: "no-selection"
      });
      // For measurement tool
      figma.ui.postMessage({
        type: "selection-changed",
        payload: null
      });
    }

    // Manter a mensagem original para compatibilidade
    figma.ui.postMessage({
      type: "selection-update",
      selectedNodeIds: selectedIds
    });

    console.log("Mensagens de seleção enviadas para a UI");
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Erro no listener de seleção:", errorMessage);

    // Enviar mensagem de erro para a UI
    figma.ui.postMessage({
      type: "selection-error",
      error: errorMessage
    });
  }
});

// measurementController is self-contained; no explicit initialize function is needed here.
