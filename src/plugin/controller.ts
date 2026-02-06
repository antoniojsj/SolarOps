/// <reference types="@figma/plugin-typings" />

// Declaração para o require do Node.js
declare const require: any;

// Importações locais
import {
  checkType,
  newCheckFills,
  newCheckEffects,
  newCheckStrokes,
  checkRadius,
  checkGap,
  checkPadding,
  getHexString
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
  flattenedTokens?: any[];
  totalTokens?: number;
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
  html?: string;
  css?: string;
  index?: number;
  count?: number;
  nodeId?: string;
  property?: string;
  styleKey?: string;
  styleId?: string;
  nodes?: string[];
  suggestions?: any[];
  field?: string;
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

  // Add specific message types for restore component
  "restore-component"?: {
    nodeId: string;
  };
  "component-restored"?: {
    success: boolean;
    message: string;
    nodeId: string;
  };
}

// Declaração da constante figma
declare const figma: {
  currentPage: {
    selection: any[];
    appendChild: (node: any) => void;
  };
  getNodeById: (id: string) => any;
  getStyleById: (id: string) => any;
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
  variables?: {
    getLocalVariablesAsync: () => Promise<any[]>;
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

// Ouve mensagens vindas da UI para fornecer sugestões sob demanda e gerenciar tokens/libs
figma.ui.onmessage = async (msg: any) => {
  try {
    if (!msg || !msg.type) return;
    if (msg.type === "fetch-suggestions") {
      const error = msg.error || {};
      const type = (error.type || error.errorType || "").toLowerCase();
      let suggestions: any[] = [];

      if (type === "fill" || type === "stroke") {
        try {
          const paints = await getLocalPaintStyles();
          suggestions = Array.isArray(paints) ? paints : [];
        } catch (e) {
          console.warn(
            "[controller] Falha ao obter estilos de pintura locais",
            e
          );
        }
      } else if (type === "text") {
        try {
          const texts = await getLocalTextStyles();
          suggestions = Array.isArray(texts) ? texts : [];
        } catch (e) {
          console.warn(
            "[controller] Falha ao obter estilos de texto locais",
            e
          );
        }
      } else if (type === "effects") {
        try {
          const effects = await getLocalEffectStyles();
          suggestions = Array.isArray(effects) ? effects : [];
        } catch (e) {
          console.warn(
            "[controller] Falha ao obter estilos de efeito locais",
            e
          );
        }
      }

      figma.ui.postMessage({
        type: "fetched-suggestions",
        error,
        suggestions
      });
      return;
    }

    if (msg.type === "fetch-token-libraries") {
      try {
        // Estilos locais
        const paints = await getLocalPaintStyles();
        const texts = await getLocalTextStyles();
        const effects = await getLocalEffectStyles();

        // Variáveis locais (radius, gap, grid)
        let radius: any[] = [];
        let gaps: any[] = [];
        let grids: any[] = [];
        try {
          // APIs de variáveis podem não existir em alguns ambientes; proteger com try
          // @ts-ignore
          const allVars = await figma.variables.getLocalVariablesAsync?.();
          if (Array.isArray(allVars)) {
            radius = allVars
              .filter(
                (v: any) =>
                  v.resolvedType === "FLOAT" &&
                  (v.name.toLowerCase().includes("radius") ||
                    v.name.toLowerCase().includes("corner"))
              )
              .map((v: any) => ({
                id: v.id,
                name: v.name,
                value: v.valuesByMode[Object.keys(v.valuesByMode)[0]]
              }));
            gaps = allVars
              .filter(
                (v: any) =>
                  v.resolvedType === "FLOAT" &&
                  (v.name.toLowerCase().includes("gap") ||
                    v.name.toLowerCase().includes("spacing"))
              )
              .map((v: any) => ({
                id: v.id,
                name: v.name,
                value: v.valuesByMode[Object.keys(v.valuesByMode)[0]]
              }));
            grids = allVars
              .filter((v: any) => v.name.toLowerCase().includes("grid"))
              .map((v: any) => ({
                id: v.id,
                name: v.name,
                value: v.valuesByMode[Object.keys(v.valuesByMode)[0]]
              }));
          }
        } catch (e) {
          // Silencioso: ambiente pode não ter API de variáveis
        }

        const tokenLibraries = [
          {
            id: "local-styles",
            name: "Local Styles",
            fills: Array.isArray(paints) ? paints : [],
            text: Array.isArray(texts) ? texts : [],
            effects: Array.isArray(effects) ? effects : [],
            radius,
            gaps,
            grids
          }
        ];

        figma.ui.postMessage({
          type: "fetched-token-libraries",
          tokenLibraries
        });
      } catch (e) {
        figma.ui.postMessage({
          type: "fetched-token-libraries",
          tokenLibraries: []
        });
      }
      return;
    }

    if (msg.type === "save-user-libs") {
      try {
        const libs = Array.isArray(msg.libs) ? msg.libs : [];
        await figma.clientStorage.setAsync("user-libs", libs);
        figma.ui.postMessage({ type: "user-libs-saved", success: true });
      } catch (e) {
        figma.ui.postMessage({
          type: "user-libs-saved",
          success: false,
          message: String(e)
        });
      }
      return;
    }

    if (msg.type === "get-user-libs") {
      try {
        const libs = (await figma.clientStorage.getAsync("user-libs")) || [];
        figma.ui.postMessage({ type: "user-libs-loaded", libs });
      } catch (e) {
        figma.ui.postMessage({ type: "user-libs-loaded", libs: [] });
      }
      return;
    }

    if (msg.type === "save-design-tokens") {
      try {
        const tokens = msg.tokens || {};

        console.log("[save-design-tokens] Dados recebidos para salvar:", {
          hasFills: !!tokens.fills,
          hasText: !!tokens.text,
          hasEffects: !!tokens.effects,
          fillsCount: tokens.fills?.length || 0,
          textCount: tokens.text?.length || 0,
          effectsCount: tokens.effects?.length || 0,
          radiusCount: tokens.radius?.length || 0,
          gapsCount: tokens.gaps?.length || 0,
          gridsCount: tokens.grids?.length || 0
        });

        // Melhorar a estrutura dos tokens salvos para incluir ID, key e outras informações importantes
        const enhancedTokens = {};

        if (tokens.fills && Array.isArray(tokens.fills)) {
          enhancedTokens.fills = tokens.fills.map(fill => ({
            id: fill.id || null,
            key: fill.key || fill.id || null,
            name: fill.name || "",
            value: fill.value || fill.color || null,
            paint: fill.paint || null,
            description: fill.description || null
          }));
          console.log(
            "[save-design-tokens] Fills salvos:",
            enhancedTokens.fills.length
          );
        }

        if (tokens.text && Array.isArray(tokens.text)) {
          enhancedTokens.text = tokens.text.map(text => ({
            id: text.id || null,
            key: text.key || text.id || null,
            name: text.name || "",
            description: text.description || null,
            style: text.style || null
          }));
          console.log(
            "[save-design-tokens] Text styles salvos:",
            enhancedTokens.text.length
          );
        }

        if (tokens.effects && Array.isArray(tokens.effects)) {
          enhancedTokens.effects = tokens.effects.map(effect => ({
            id: effect.id || null,
            key: effect.key || effect.id || null,
            name: effect.name || "",
            effects: effect.effects || [],
            description: effect.description || null
          }));
          console.log(
            "[save-design-tokens] Effects salvos:",
            enhancedTokens.effects.length
          );
        }

        // Preservar outras propriedades como radius, gaps, grids
        if (tokens.radius) enhancedTokens.radius = tokens.radius;
        if (tokens.gaps) enhancedTokens.gaps = tokens.gaps;
        if (tokens.grids) enhancedTokens.grids = tokens.grids;

        console.log("[save-design-tokens] Estrutura final para salvar:", {
          hasFills: !!enhancedTokens.fills,
          hasText: !!enhancedTokens.text,
          hasEffects: !!enhancedTokens.effects,
          totalTokens:
            (enhancedTokens.fills?.length || 0) +
            (enhancedTokens.text?.length || 0) +
            (enhancedTokens.effects?.length || 0)
        });

        const fileData = {
          metadata: {
            savedAt: new Date().toISOString(),
            version: "1.0",
            totalTokens:
              (enhancedTokens.fills?.length || 0) +
              (enhancedTokens.text?.length || 0) +
              (enhancedTokens.effects?.length || 0)
          },
          tokens: enhancedTokens,
          timestamp: new Date().toISOString().replace(/[:.]/g, "-"),
          filename: "data.json"
        };

        await figma.clientStorage.setAsync(
          "data.json",
          JSON.stringify(fileData)
        );

        console.log(
          "[save-design-tokens] Dados salvos com sucesso no clientStorage em data.json"
        );

        figma.ui.postMessage({
          type: "design-tokens-saved",
          success: true,
          tokens: enhancedTokens // UI might still expect the raw tokens object
        });
      } catch (e) {
        console.error("[save-design-tokens] Erro ao salvar:", e);
        figma.ui.postMessage({
          type: "design-tokens-saved",
          success: false,
          message: String(e)
        });
      }
      return;
    }

    if (msg.type === "get-selection") {
      try {
        const selectedNodes = figma.currentPage.selection;
        console.log(
          "[Plugin] get-selection solicitado. Nós selecionados:",
          selectedNodes.length
        );

        if (selectedNodes.length > 0) {
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
                color:
                  fill.type === "SOLID" && fill.color
                    ? {
                        r: Math.round(fill.color.r * 255),
                        g: Math.round(fill.color.g * 255),
                        b: Math.round(fill.color.b * 255)
                      }
                    : null
              }));
            }

            // Texto
            if (node.type === "TEXT") {
              nodeData.characters = node.characters;
              if (node.fontName) {
                nodeData.fontName = node.fontName;
              }
              if (node.fontSize) {
                nodeData.fontSize = node.fontSize;
              }
            }

            return nodeData;
          };

          const nodesData = selectedNodes.map(extractNodeData);

          figma.ui.postMessage({
            type: "selection-changed",
            selection: nodesData
          });
        } else {
          figma.ui.postMessage({
            type: "selection-changed",
            selection: []
          });
        }
      } catch (e) {
        console.error("[Plugin] Erro ao processar get-selection:", e);
        figma.ui.postMessage({
          type: "selection-changed",
          selection: []
        });
      }
      return;
    }
    if (msg.type === "debug-client-storage") {
      try {
        console.log("[DEBUG] Verificando estado do clientStorage");

        // Verificar todos os dados no clientStorage
        const allKeys = await figma.clientStorage.keysAsync();
        console.log("[DEBUG] Todas as chaves no clientStorage:", allKeys);

        // Verificar especificamente design-tokens
        const designTokens = await figma.clientStorage.getAsync(
          "design-tokens"
        );
        console.log("[DEBUG] Dados de design-tokens:", designTokens);

        // Verificar user-libs
        const userLibs = await figma.clientStorage.getAsync("user-libs");
        console.log("[DEBUG] Dados de user-libs:", userLibs);

        figma.ui.postMessage({
          type: "debug-storage-results",
          data: {
            allKeys,
            designTokens,
            userLibs,
            hasDesignTokens:
              !!designTokens && Object.keys(designTokens).length > 0,
            designTokensCount: designTokens
              ? Object.keys(designTokens).length
              : 0
          }
        });
      } catch (e) {
        console.error("[DEBUG] Erro ao verificar clientStorage:", e);
      }
      return;
    }
  } catch (e) {
    console.error("[controller] ui.onmessage error", e);
  }
};

// Debounce selection updates to avoid flooding and UI jank
let selectionTimer: number | undefined;
figma.on("selectionchange", () => {
  if (selectionTimer) {
    // @ts-ignore
    clearTimeout(selectionTimer);
  }
  // @ts-ignore
  selectionTimer = setTimeout(async () => {
    try {
      const selLen =
        figma.currentPage.selection && figma.currentPage.selection.length
          ? figma.currentPage.selection.length
          : 0;
      figma.ui.postMessage({
        type: "selection-updated",
        payload: { count: selLen }
      });

      if (selLen > 0) {
        const selectedNode = figma.currentPage.selection[0];
        if (selectedNode.reactions && selectedNode.reactions.length > 0) {
          const animations = selectedNode.reactions
            .map(reaction => {
              const action = reaction.action;
              if (action.type === "NODE" && action.transition) {
                const destinationNode = figma.getNodeById(action.destinationId);
                return {
                  fromNode: selectedNode.name,
                  toNode: destinationNode ? destinationNode.name : "Unknown",
                  trigger: reaction.trigger.type,
                  transition: {
                    type: action.transition.type,
                    duration: action.transition.duration,
                    easing: action.transition.easing.type
                  }
                };
              }
              return null;
            })
            .filter(Boolean);

          if (animations.length > 0) {
            figma.ui.postMessage({
              type: "animation-data",
              payload: {
                animations: animations
              }
            });
          }
        }
      }

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
            createMeasurement(
              ca.x,
              ca.y,
              cb.x,
              cb.y,
              MEASURE_STATE.mode as any
            );
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
  }, 120);
});

// Função para extrair e pré-processar os IDs de estilo das bibliotecas
function preprocessLibraries(
  libraries: any[]
): {
  fills: Set<string>;
  text: Set<string>;
  effects: Set<string>;
  strokes: Set<string>;
} {
  const fillStyleIds = new Set<string>();
  const textStyleIds = new Set<string>();
  const effectStyleIds = new Set<string>();

  for (const lib of libraries || []) {
    if (!lib) continue;

    // Processa apenas bibliotecas que têm tokens salvos pelo usuário
    // Não tenta acessar estilos locais do Figma

    // Estilos de preenchimento (usados também para bordas)
    if (lib.tokens?.fills && Array.isArray(lib.tokens.fills)) {
      for (const style of lib.tokens.fills) {
        if (style && style.id) {
          fillStyleIds.add(style.id);
        }
      }
    }

    // Estilos de texto
    if (lib.tokens?.text && Array.isArray(lib.tokens.text)) {
      for (const style of lib.tokens.text) {
        if (style && style.id) {
          textStyleIds.add(style.id);
        }
      }
    }

    // Estilos de efeito
    if (lib.tokens?.effects && Array.isArray(lib.tokens.effects)) {
      for (const style of lib.tokens.effects) {
        if (style && style.id) {
          effectStyleIds.add(style.id);
        }
      }
    }
  }

  return {
    fills: fillStyleIds,
    text: textStyleIds,
    effects: effectStyleIds,
    strokes: fillStyleIds // Bordas usam os mesmos PaintStyles que os preenchimentos
  };
}

// Função para encontrar instâncias quebradas de forma isolada e robusta.
async function findBrokenInstances(
  nodes: readonly SceneNode[]
): Promise<any[]> {
  const instances: InstanceNode[] = [];
  console.log("[Controller] Iniciando busca por instâncias quebradas...");

  // Helper para encontrar recursivamente todas as instâncias na seleção
  function collectInstances(nodesToSearch: readonly SceneNode[]) {
    for (const node of nodesToSearch) {
      console.log(`[Controller] Verificando nó: ${node.name} (${node.type})`);

      // Verifica se é uma instância ou um componente que pode conter instâncias
      if (node.type === "INSTANCE") {
        console.log(
          `[Controller] Instância encontrada: ${node.name} (${node.id})`
        );
        instances.push(node as InstanceNode);
      }

      // Verifica se o nó tem filhos e continua a recursão
      if ("children" in node && (node as any).children.length > 0) {
        console.log(`[Controller] Procurando em filhos de ${node.name}...`);
        collectInstances((node as any).children);
      }
    }
  }

  collectInstances(nodes);
  console.log(
    `[Controller] Total de instâncias encontradas: ${instances.length}`
  );

  const promises = instances.map(async instance => {
    try {
      console.log(
        `[Controller] Verificando instância: ${instance.name} (${instance.id})`
      );

      // Tenta acessar o componente principal
      const mainComponent = await instance.getMainComponentAsync();

      // Verifica se o mainComponent é nulo ou indefinido
      if (!mainComponent) {
        console.log(
          `[Controller] Componente principal nulo para: ${instance.name} (${instance.id})`
        );
        return {
          type: "restore-component",
          message: "Componente principal não encontrado",
          nodeId: instance.id,
          nodeName: instance.name,
          value: instance.name
        };
      }

      // Verifica se o mainComponent foi excluído
      if ("removed" in mainComponent && mainComponent.removed) {
        console.log(
          `[Controller] Componente principal removido para: ${instance.name} (${instance.id})`
        );
        return {
          type: "restore-component",
          message: "Componente principal foi removido",
          nodeId: instance.id,
          nodeName: instance.name,
          value: instance.name
        };
      }

      // Verifica se o mainComponent tem um parent (não está órfão)
      if (!mainComponent.parent) {
        console.log(
          `[Controller] Componente principal sem parent: ${instance.name} (${instance.id})`
        );
        return {
          type: "restore-component",
          message: "Componente principal está órfão",
          nodeId: instance.id,
          nodeName: instance.name,
          value: instance.name
        };
      }

      // Se chegou até aqui, o componente parece estar OK
      console.log(
        `[Controller] Instância OK: ${instance.name} (${instance.id})`
      );
      return null;
    } catch (e) {
      // Se houver qualquer erro, consideramos como instância quebrada
      console.log(
        `[Controller] INSTÂNCIA QUEBRADA DETECTADA: ${instance.name} (${instance.id})`,
        e.message
      );
      return {
        type: "restore-component",
        message: "Erro ao acessar componente principal: " + e.message,
        nodeId: instance.id,
        nodeName: instance.name,
        value: instance.name
      };
    }
  });

  const results = await Promise.all(promises);
  const errors = results.filter(Boolean) as any[];

  console.log(
    `[Controller] Total de instâncias quebradas encontradas: ${errors.length}`
  );
  if (errors.length > 0) {
    console.log(
      "[Controller] Detalhes das instâncias quebradas:",
      JSON.stringify(errors, null, 2)
    );
  }
  return errors;
}

// Função principal de linting otimizada
async function lint(
  nodes: readonly any[],
  libraries: any[],
  parentFrameId: string | null = null,
  savedTokens: any[] = []
): Promise<any[]> {
  // 1. Faz uma varredura separada e robusta para encontrar instâncias quebradas.
  // Isso evita que a lógica complexa de linting interfira na detecção.
  const brokenInstanceErrors = await findBrokenInstances(nodes);

  // 2. Usa APENAS tokens salvos pelo usuário para auditoria
  // Não usa estilos locais do Figma
  const preprocessedLibs = preprocessLibraries(libraries);
  const otherErrors = await lintRecursive(
    nodes,
    preprocessedLibs,
    parentFrameId,
    savedTokens,
    libraries
  );

  // 3. Combina os erros de instâncias quebradas com os outros erros de linting.
  console.log(
    "[Controller] Erros de instâncias quebradas (antes de combinar):",
    JSON.stringify(brokenInstanceErrors, null, 2)
  );
  console.log(
    "[Controller] Outros erros (antes de combinar):",
    JSON.stringify(otherErrors, null, 2)
  );

  const combinedErrors = [...brokenInstanceErrors, ...otherErrors];

  console.log("[Controller] Total de erros combinados:", combinedErrors.length);
  console.log("[Controller] Erros combinados (objeto):", combinedErrors);
  console.log(
    "[Controller] Erros combinados (JSON):",
    JSON.stringify(combinedErrors, null, 2)
  );

  // Verifica se há erros do tipo restore-component
  const restoreComponentErrors = combinedErrors.filter(
    err => err.type === "restore-component"
  );
  console.log(
    `[Controller] Encontrados ${restoreComponentErrors.length} erros do tipo 'restore-component'`
  );
  restoreComponentErrors.forEach((err, i) => {
    console.log(
      `[Controller] Erro restore-component ${i + 1}:`,
      JSON.stringify(err, null, 2)
    );
  });

  return combinedErrors;
}

async function lintRecursive(
  nodes: readonly any[],
  preprocessedLibs: {
    fills: Set<string>;
    text: Set<string>;
    effects: Set<string>;
    strokes: Set<string>;
  },
  parentFrameId: string | null,
  savedTokens: any[],
  libraries: any[]
): Promise<any[]> {
  let allErrors: any[] = [];

  for (const node of nodes) {
    if (!node || node.visible === false || node.locked === true) {
      continue;
    }

    // Determine the current frame context for this node and its children.
    const currentFrameId = node.type === "FRAME" ? node.id : parentFrameId;

    // Lint the current node unless it's a type we completely ignore for linting.
    if (node.type !== "SLICE" && node.type !== "GROUP") {
      try {
        const nodeErrors = await determineTypeWithFrame(
          node,
          preprocessedLibs,
          currentFrameId,
          savedTokens,
          libraries
        );
        if (nodeErrors && nodeErrors.length > 0) {
          allErrors.push(...nodeErrors);
        }
      } catch (e) {
        console.error(`Error linting node ${node.id} (${node.name}):`, e);
      }
    }

    // Recurse into children, if any. This is now independent of the parent's type.
    if (node.children && node.children.length > 0) {
      try {
        const childErrors = await lintRecursive(
          node.children,
          preprocessedLibs,
          currentFrameId,
          savedTokens,
          libraries
        );
        if (childErrors && childErrors.length > 0) {
          allErrors.push(...childErrors);
        }
      } catch (e) {
        console.error(`Error recursing into children of ${node.id}:`, e);
      }
    }
  }

  return allErrors;
}

// Função para determinar o tipo de node e aplicar regras de linting, incluindo o parentFrameId
async function determineTypeWithFrame(
  node: any,
  preprocessedLibs: {
    fills: Set<string>;
    text: Set<string>;
    effects: Set<string>;
    strokes: Set<string>;
  },
  parentFrameId: string | null,
  savedTokens: any[] = [],
  libraries: any[]
): Promise<any[]> {
  try {
    let errors: any[] = [];
    // A verificação de instâncias quebradas foi movida para uma função separada (`findBrokenInstances`)
    // para maior robustez e para evitar que a lógica de linting de estilos interfira.

    switch (node.type) {
      case "SLICE":
      case "GROUP":
        // Não há regras para esses tipos, então apenas continuamos.
        break;
      case "CIRCLE":
      case "VECTOR":
      case "STAR":
      case "BOOLEAN_OPERATION":
      case "SQUARE":
        errors.push(
          ...(await lintShapeRules(
            node,
            preprocessedLibs,
            savedTokens,
            libraries
          ))
        );
        break;
      case "FRAME":
        errors.push(
          ...(await lintFrameRules(
            node,
            preprocessedLibs,
            savedTokens,
            libraries
          ))
        );
        break;
      case "INSTANCE":
      case "RECTANGLE":
        errors.push(
          ...(await lintRectangleRules(
            node,
            preprocessedLibs,
            savedTokens,
            libraries
          ))
        );
        break;
      case "COMPONENT":
        errors.push(
          ...(await lintComponentRules(
            node,
            preprocessedLibs,
            savedTokens,
            libraries
          ))
        );
        break;
      case "TEXT":
        errors.push(
          ...(await lintTextRules(
            node,
            preprocessedLibs,
            savedTokens,
            libraries
          ))
        );
        break;
      case "LINE":
        errors.push(
          ...(await lintLineRules(
            node,
            preprocessedLibs,
            savedTokens,
            libraries
          ))
        );
        break;
      default:
        // Para tipos não tratados, não fazemos nada.
        break;
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
async function lintComponentRules(
  node: any,
  preprocessedLibs: any,
  savedTokens: any[] = [],
  libraries: any[]
): Promise<any[]> {
  const errors: any[] = [];
  try {
    // Execute all checks in parallel for better performance
    await Promise.all([
      newCheckFills(node, errors, preprocessedLibs, savedTokens, libraries),
      newCheckEffects(node, errors, preprocessedLibs, savedTokens, libraries),
      newCheckStrokes(node, errors, preprocessedLibs, savedTokens, libraries)
    ]);
    checkRadius(node, errors, savedTokens, libraries);
    checkGap(node, errors, savedTokens, libraries);
    checkPadding(node, errors, savedTokens, libraries);
  } catch (error) {
    console.error("[Controller] Erro em component rules:", error);
  }
  return errors;
}

async function lintLineRules(
  node: any,
  preprocessedLibs: any,
  savedTokens: any[] = [],
  libraries: any[]
): Promise<any[]> {
  const errors: any[] = [];
  try {
    await newCheckStrokes(
      node,
      errors,
      preprocessedLibs,
      savedTokens,
      libraries
    );
  } catch (error) {
    console.error("[Controller] Erro em line rules:", error);
  }
  return errors;
}

async function lintFrameRules(
  node: any,
  preprocessedLibs: any,
  savedTokens: any[] = [],
  libraries: any[]
): Promise<any[]> {
  const errors: any[] = [];
  try {
    await Promise.all([
      newCheckFills(node, errors, preprocessedLibs, savedTokens, libraries),
      newCheckEffects(node, errors, preprocessedLibs, savedTokens, libraries),
      newCheckStrokes(node, errors, preprocessedLibs, savedTokens, libraries)
    ]);
    checkRadius(node, errors, savedTokens, libraries);
    checkGap(node, errors, savedTokens, libraries);
    checkPadding(node, errors, savedTokens, libraries);
  } catch (error) {
    console.error("[Controller] Erro em frame rules:", error);
  }
  return errors;
}

async function lintTextRules(
  node: any,
  preprocessedLibs: any,
  savedTokens: any[] = [],
  libraries: any[]
): Promise<any[]> {
  const errors: any[] = [];
  try {
    // Executa cada verificação sequencialmente para garantir que os erros sejam coletados corretamente
    await checkType(node, errors, preprocessedLibs, savedTokens, libraries);
    await newCheckFills(node, errors, preprocessedLibs, savedTokens, libraries);
    await newCheckEffects(
      node,
      errors,
      preprocessedLibs,
      savedTokens,
      libraries
    );
    await newCheckStrokes(
      node,
      errors,
      preprocessedLibs,
      savedTokens,
      libraries
    );

    // Adiciona logs para depuração
    if (errors.length > 0) {
      console.log(
        `[lintTextRules] Encontrados ${errors.length} erros para o nó ${node.name} (${node.id})`
      );
      console.log("Erros encontrados:", errors);
    }
  } catch (error) {
    console.error("[Controller] Erro em text rules:", error);
    // Adiciona o erro à lista de erros para que seja exibido ao usuário
    errors.push({
      type: "error",
      message: `Erro ao verificar estilos: ${
        error instanceof Error ? error.message : String(error)
      }`,
      nodeId: node.id,
      nodeName: node.name,
      value: "Erro na verificação"
    });
  }
  return errors;
}

async function lintRectangleRules(
  node: any,
  preprocessedLibs: any,
  savedTokens: any[] = [],
  libraries: any[]
): Promise<any[]> {
  const errors: any[] = [];
  try {
    await Promise.all([
      newCheckFills(node, errors, preprocessedLibs, savedTokens, libraries),
      newCheckEffects(node, errors, preprocessedLibs, savedTokens, libraries),
      newCheckStrokes(node, errors, preprocessedLibs, savedTokens, libraries)
    ]);
    checkRadius(node, errors, savedTokens, libraries);
    checkGap(node, errors, savedTokens, libraries);
    checkPadding(node, errors, savedTokens, libraries);
  } catch (error) {
    console.error("[Controller] Erro em rectangle rules:", error);
  }
  return errors;
}

async function lintShapeRules(
  node: any,
  preprocessedLibs: any,
  savedTokens: any[] = [],
  libraries: any[]
): Promise<any[]> {
  const errors: any[] = [];
  try {
    await Promise.all([
      newCheckFills(node, errors, preprocessedLibs, savedTokens, libraries),
      newCheckEffects(node, errors, preprocessedLibs, savedTokens, libraries),
      newCheckStrokes(node, errors, preprocessedLibs, savedTokens, libraries)
    ]);
    checkRadius(node, errors, savedTokens, libraries);
    checkGap(node, errors, savedTokens, libraries);
    checkPadding(node, errors, savedTokens, libraries);
  } catch (error) {
    console.error("[Controller] Erro em shape rules:", error);
  }
  return errors;
}

// Função para serializar nodes
function serializeNodes(nodes: readonly SceneNode[]): any[] {
  try {
    console.log("[Controller] Serializando", nodes.length, "nodes");

    const serialize = (node: SceneNode): any => {
      if (!node) return null;

      // Base properties
      const serializedNode: any = {
        id: node.id,
        name: node.name || "Sem nome",
        type: node.type || "UNKNOWN",
        visible: node.visible,
        width: "width" in node ? node.width : undefined,
        height: "height" in node ? node.height : undefined
      };

      // Properties for conformity checks
      const checkProps = [
        "fillStyleId",
        "strokeStyleId",
        "effectStyleId",
        "textStyleId",
        "fills",
        "strokes",
        "effects",
        "backgrounds",
        "backgroundColor",
        "cornerRadius",
        "topLeftRadius",
        "topRightRadius",
        "bottomLeftRadius",
        "bottomRightRadius",
        "characters",
        "itemSpacing",
        "layoutMode" // Adicionado para verificação de 'gap'
      ];

      for (const prop of checkProps) {
        if (prop in node) {
          if (typeof node[prop] === "symbol") {
            serializedNode[prop] = "figma-mixed-symbol";
          } else {
            serializedNode[prop] = node[prop];
          }
        }
      }

      // Recursively serialize children
      if ("children" in node) {
        serializedNode.children = node.children.map(serialize).filter(Boolean);
      }

      return serializedNode;
    };

    return nodes.map(serialize).filter(Boolean);
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

async function getLibrariesWithLocalVariables(
  baseLibraries: any[] | null | undefined
): Promise<any[]> {
  // Cria uma cópia para não modificar o array original que pode vir do estado da UI
  let effectiveLibraries = Array.isArray(baseLibraries)
    ? JSON.parse(JSON.stringify(baseLibraries))
    : [];

  // Injeta uma biblioteca virtual com as variáveis locais do arquivo
  try {
    const allVariables = await figma.variables.getLocalVariablesAsync();

    const radiusVariables = allVariables
      .filter(
        v =>
          v.resolvedType === "FLOAT" &&
          (v.name.toLowerCase().includes("radius") ||
            v.name.toLowerCase().includes("corner"))
      )
      .map(v => ({
        id: v.id,
        name: v.name,
        value: v.valuesByMode[Object.keys(v.valuesByMode)[0]]
      }));

    const gapVariables = allVariables
      .filter(
        v =>
          v.resolvedType === "FLOAT" &&
          (v.name.toLowerCase().includes("gap") ||
            v.name.toLowerCase().includes("spacing"))
      )
      .map(v => ({
        id: v.id,
        name: v.name,
        value: v.valuesByMode[Object.keys(v.valuesByMode)[0]]
      }));

    // Remove a biblioteca virtual antiga se existir para evitar duplicação
    effectiveLibraries = effectiveLibraries.filter(
      lib => lib.id !== "local-variables"
    );

    if (radiusVariables.length > 0 || gapVariables.length > 0) {
      effectiveLibraries.push({
        name: "Local Variables",
        id: "local-variables",
        radius: radiusVariables,
        gaps: gapVariables
      });
    }
  } catch (e) {
    console.error("Erro ao buscar variáveis locais:", e);
  }

  return effectiveLibraries;
}

// Função para restaurar um componente quebrado
async function restoreBrokenComponent(
  nodeId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const node = figma.getNodeById(nodeId) as InstanceNode;

    if (!node) {
      return { success: false, message: "Node não encontrado" };
    }

    if (node.type !== "INSTANCE") {
      return {
        success: false,
        message: "Apenas instâncias podem ser restauradas"
      };
    }

    // Tenta restaurar o componente principal
    try {
      // Tenta obter o componente principal
      const mainComponent = node.mainComponent;
      if (mainComponent) {
        // Se o componente principal ainda estiver disponível, tenta restaurar
        // Cria uma nova instância do componente principal
        const newInstance = mainComponent.createInstance();

        // Copia as propriedades visuais e de layout da instância quebrada para a nova
        if (node.parent) {
          // Salva a posição e tamanho
          const { x, y, width, height, rotation } = node;

          // Insere a nova instância na mesma posição
          (node.parent as any).appendChild(newInstance);

          // Aplica as mesmas propriedades visuais
          newInstance.x = x;
          newInstance.y = y;
          newInstance.resize(width, height);
          newInstance.rotation = rotation;

          // Remove a instância quebrada
          node.remove();

          // Seleciona a nova instância
          figma.currentPage.selection = [newInstance];

          return {
            success: true,
            message: "Componente restaurado com sucesso"
          };
        } else {
          return {
            success: false,
            message: "Não foi possível acessar o nó pai"
          };
        }
      } else {
        return {
          success: false,
          message: "Componente principal não encontrado"
        };
      }
    } catch (e) {
      console.error("Erro ao restaurar componente:", e);
      return {
        success: false,
        message: `Erro ao restaurar componente: ${e.message}`
      };
    }
  } catch (e) {
    console.error("Erro ao processar restauração:", e);
    return {
      success: false,
      message: `Erro ao processar restauração: ${e.message}`
    };
  }
}

// Helper function to load and format tokens from clientStorage
async function loadAndFormatSavedTokens(): Promise<any[]> {
  try {
    console.log(
      "[loadAndFormatSavedTokens] Iniciando carregamento de tokens..."
    );

    // The primary storage mechanism is a single "data.json" key
    const dataFile = await figma.clientStorage.getAsync("data.json");

    if (dataFile && typeof dataFile === "string") {
      const parsedData = JSON.parse(dataFile);
      const tokens = parsedData.tokens; // Get the actual tokens object

      console.log("[loadAndFormatSavedTokens] Dados carregados do data.json:", {
        hasTokens: !!tokens,
        tokenKeys: tokens ? Object.keys(tokens) : [],
        fillsCount: tokens?.fills?.length || 0,
        textCount: tokens?.text?.length || 0,
        effectsCount: tokens?.effects?.length || 0
      });

      const formattedTokens = [];
      if (
        tokens &&
        typeof tokens === "object" &&
        Object.keys(tokens).length > 0
      ) {
        // Criar tokens achatados para facilitar a busca
        const flattenedTokens: any[] = [];

        Object.keys(tokens).forEach(category => {
          const categoryTokens = tokens[category];
          if (Array.isArray(categoryTokens)) {
            categoryTokens.forEach((token: any) => {
              flattenedTokens.push({
                id: token.id,
                key: token.key || token.id,
                name: token.name,
                value: token.value,
                category: category,
                type: category,
                // Propriedades específicas por categoria
                ...(category === "fills" && {
                  color: token.color || token.value?.color,
                  paint: token.paint
                }),
                ...(category === "text" && {
                  fontFamily: token.fontFamily || token.value?.fontFamily,
                  fontSize: token.fontSize || token.value?.fontSize
                })
              });
            });
          }
        });

        // Wrap the tokens object in the library structure expected by the linting functions
        formattedTokens.push({
          name: "Saved Design Tokens",
          tokens: tokens,
          flattenedTokens: flattenedTokens
        });

        console.log("[loadAndFormatSavedTokens] Tokens formatados:", {
          librariesCount: formattedTokens.length,
          flattenedCount: flattenedTokens.length,
          firstLibrary: formattedTokens[0]?.name
        });

        return formattedTokens;
      }
    }

    // Fallback or if no data.json is found
    console.log(
      "[loadAndFormatSavedTokens] 'data.json' not found or is empty. No saved tokens loaded."
    );
    return [];
  } catch (e) {
    console.error(
      "[loadAndFormatSavedTokens] Error loading/formatting tokens:",
      e
    );
    return []; // Return an empty array on error
  }
}

// Importar a função addNote do measurementController
import { addNote } from "./measurementController";
import { importHTML } from "./htmlImporter";
import { importRenderedDOM } from "./domImporter";

// Listener para mensagens da UI
figma.ui.onmessage = async (msg: UIMessage) => {
  // Handle rendered DOM import (Tailwind / computed styles)
  if (msg.type === "import-rendered-dom") {
    try {
      console.log("[Controller] ✓ Recebido message type=import-rendered-dom");
      const tree = (msg as any).tree;
      const viewport = (msg as any).viewport || { width: 1440, height: 900 };

      console.log("[Controller] Tree details:", {
        nodeType: tree?.nodeType,
        tagName: tree?.tagName,
        hasChildren: Array.isArray(tree?.children),
        childrenCount: tree?.children?.length || 0
      });

      if (!tree) {
        console.error("[Controller] ❌ Nenhuma árvore recebida");
        figma.notify("Nenhuma árvore renderizada recebida para importar", {
          error: true
        });
        return;
      }

      if (tree.nodeType !== "element") {
        console.error("[Controller] ❌ Tipo de nó inválido:", tree.nodeType);
        figma.notify("Estrutura de DOM inválida recebida", {
          error: true
        });
        return;
      }

      console.log("[Controller] ✓ Iniciando importRenderedDOM...");
      figma.notify("Importando layout renderizado...");
      await importRenderedDOM(tree, viewport);
      console.log("[Controller] ✓ importRenderedDOM completado com sucesso!");
      figma.notify("Layout importado com sucesso!");
    } catch (error) {
      console.error(
        "[Controller] ❌ Erro ao importar layout renderizado:",
        error
      );
      figma.notify(
        `Erro ao importar layout renderizado: ${error?.message || error}`,
        {
          error: true
        }
      );
    }
    return;
  }

  // Handle HTML/CSS import
  if (msg.type === "import-html-css") {
    try {
      const { html, css } = msg;

      if (!html && !css) {
        figma.notify("Por favor, forneça HTML ou CSS para importar", {
          error: true
        });
        return;
      }

      // Mostrar notificação de início
      figma.notify("Importando HTML/CSS...");

      try {
        // Chamar a função de importação
        await importHTML(html || "<div></div>", css || "");

        // Notificar sucesso
        figma.notify("HTML/CSS importado com sucesso!");
      } catch (error) {
        console.error("Erro ao importar HTML/CSS:", error);
        figma.notify(`Erro ao importar: ${error.message}`, { error: true });
      }
    } catch (error) {
      console.error("Erro ao processar importação:", error);
      figma.notify(`Erro ao processar importação: ${error.message}`, {
        error: true
      });
    }
    return;
  }

  console.log("[Controller] Mensagem recebida da UI:", msg.type);

  // Verificar se é uma mensagem de adicionar nota
  if (msg.type === "add-note") {
    try {
      console.log(
        "[Controller] Recebida mensagem para adicionar nota:",
        msg.payload
      );
      const success = await addNote(msg.payload);
      if (!success) {
        console.error("[Controller] Falha ao adicionar nota");
      }
    } catch (error) {
      console.error("[Controller] Erro ao processar adição de nota:", error);
    }
    return;
  }

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

    // Handle restore component action
    if (msg.type === "restore-component" && msg.nodeId) {
      try {
        const result = await restoreBrokenComponent(msg.nodeId);

        // Notify the UI about the result
        figma.ui.postMessage({
          type: "component-restored",
          success: result.success,
          message: result.message,
          nodeId: msg.nodeId
        });

        // If successful, update the UI to reflect the changes
        if (result.success) {
          // Trigger a re-check of the current selection
          const nodesToCheck = figma.currentPage.selection;
          if (nodesToCheck.length > 0) {
            const errors = await lint(nodesToCheck, [], null, []);
            const groupedErrors = groupErrorsByNode(errors);

            figma.ui.postMessage({
              type: "errors-updated",
              errors: groupedErrors,
              totalErrors: errors.length
            });
          }
        }

        return;
      } catch (e) {
        console.error("Error in restore-component handler:", e);
        figma.ui.postMessage({
          type: "component-restored",
          success: false,
          message: `Erro ao restaurar componente: ${e.message}`,
          nodeId: msg.nodeId
        });
      }
      return;
    }
    // Handler para atualizar erros (usado pela página de camadas)
    if (msg.type === "update-errors") {
      console.log("[Controller] Processando update-errors");
      try {
        const nodesToLint = figma.currentPage.selection;
        if (nodesToLint && nodesToLint.length > 0) {
          const baseLibraries = Array.isArray(msg.libraries)
            ? msg.libraries
            : [];

          const effectiveLibraries = await getLibrariesWithLocalVariables(
            baseLibraries
          );

          // Load fresh tokens directly from storage to ensure the audit is up-to-date.
          const savedTokens = await loadAndFormatSavedTokens();

          const lintResults = await lint(
            nodesToLint,
            effectiveLibraries,
            null,
            savedTokens
          );
          const groupedErrors = groupErrorsByNode(lintResults);
          const serializedNodes = serializeNodes(nodesToLint);

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

    if (msg.type === "apply-styles") {
      console.log("[Controller] Aplicando estilos");
      try {
        const { error, field, index, count } = msg;
        if (!error || !field || index === undefined) {
          throw new Error("Dados insuficientes para aplicar o estilo.");
        }

        const suggestion = error[field][index];
        if (!suggestion || !suggestion.id) {
          throw new Error("Sugestão de estilo inválida.");
        }

        const nodesToApply = error.nodes || [error.nodeId];
        if (!nodesToApply || nodesToApply.length === 0) {
          throw new Error("Nenhum nó para aplicar o estilo.");
        }

        let appliedCount = 0;
        for (const nodeId of nodesToApply) {
          if (count && appliedCount >= count) break;

          const node = figma.getNodeById(nodeId);
          if (!node) continue;

          switch (error.type) {
            case "text":
              if (node.type === "TEXT") {
                node.textStyleId = suggestion.id;
              }
              break;
            case "fill":
              if ("fillStyleId" in node) {
                node.fillStyleId = suggestion.id;
              }
              break;
            case "stroke":
              if ("strokeStyleId" in node) {
                node.strokeStyleId = suggestion.id;
              }
              break;
            case "effects":
              if ("effectStyleId" in node) {
                node.effectStyleId = suggestion.id;
              }
              break;
            case "radius":
              if (
                "setBoundVariable" in node &&
                suggestion.id &&
                error.property
              ) {
                // A suggestion.id é o ID da variável.
                node.setBoundVariable(error.property, suggestion.id);
              }
              break;
            case "gap":
              if (
                "setBoundVariable" in node &&
                suggestion.id &&
                error.property === "itemSpacing"
              ) {
                node.setBoundVariable("itemSpacing", suggestion.id);
              }
              break;

            case "padding":
              if (
                "setBoundVariable" in node &&
                suggestion.id &&
                error.property &&
                typeof error.property === "string" &&
                error.property.startsWith("padding")
              ) {
                // Aplica a variável ao lado específico do padding (top, right, bottom, left)
                node.setBoundVariable(error.property, suggestion.id);
              }
              break;
          }
          appliedCount++;
        }

        figma.notify(`${appliedCount} erro(s) corrigido(s).`);

        // Solicita à UI que atualize os erros
        figma.ui.postMessage({
          type: "update-errors-after-fix"
        });
      } catch (e) {
        console.error("[Controller] Erro ao aplicar estilo:", e);
        figma.notify(`Erro ao aplicar estilo: ${e.message}`, { error: true });
      }
      return;
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
        const nodesToLint = figma.currentPage.selection;

        // Limitar o tempo de processamento
        const startTime = Date.now();
        const maxProcessingTime = 5000; // 5 segundos máximo

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

        // CRÍTICA: Não usar bibliotecas locais automaticamente
        // O sistema deve usar APENAS tokens salvos explicitamente pelo usuário
        if (!effectiveLibraries || effectiveLibraries.length === 0) {
          console.warn(
            "[Controller] Nenhuma biblioteca disponível - usuário deve salvar tokens primeiro"
          );
          effectiveLibraries = [];
        }

        // CRÍTICA: Usar APENAS tokens salvos explicitamente pelo usuário
        // Não adicionar estilos locais automaticamente
        const effectiveLibrariesWithVariables = effectiveLibraries || [];

        console.log(
          "[Controller] Executando auditoria com",
          effectiveLibrariesWithVariables.length,
          "bibliotecas salvas pelo usuário:",
          effectiveLibrariesWithVariables.map((lib: any) => ({
            name: lib && lib.name ? lib.name : undefined,
            id: lib && lib.id ? lib.id : undefined,
            tokens: lib && lib.tokens ? Object.keys(lib.tokens) : []
          }))
        );

        console.log(
          "[Controller] DEBUG - Carregando tokens salvos para a auditoria inicial..."
        );

        // FIX: Load fresh tokens directly from storage for the initial run.
        const savedTokensResult = await loadSavedTokens();
        const savedTokens = savedTokensResult.success
          ? savedTokensResult.tokens
          : [];

        // NOVO: Se não há tokens salvos, usar bibliotecas carregadas diretamente
        let effectiveTokens = savedTokens;
        if (
          savedTokens.length === 0 &&
          effectiveLibrariesWithVariables.length > 0
        ) {
          console.log(
            "[Controller] Nenhum token salvo encontrado, usando bibliotecas carregadas diretamente"
          );
          // Converter bibliotecas para formato de tokens
          const librariesAsTokens = effectiveLibrariesWithVariables.map(
            (lib: any) => ({
              name: lib?.name || "Biblioteca Ativa",
              tokens: {
                fills: lib?.fills || [],
                text: lib?.text || [],
                effects: lib?.effects || [],
                strokes: lib?.strokes || [],
                radius: lib?.radius || [],
                gaps: lib?.gaps || [],
                paddings: lib?.paddings || []
              },
              flattenedTokens: [
                ...(lib?.fills || []).map((token: any) => ({
                  ...token,
                  category: "fills",
                  type: "fills"
                })),
                ...(lib?.text || []).map((token: any) => ({
                  ...token,
                  category: "text",
                  type: "text"
                })),
                ...(lib?.effects || []).map((token: any) => ({
                  ...token,
                  category: "effects",
                  type: "effects"
                })),
                ...(lib?.strokes || []).map((token: any) => ({
                  ...token,
                  category: "strokes",
                  type: "strokes"
                })),
                ...(lib?.radius || []).map((token: any) => ({
                  ...token,
                  category: "radius",
                  type: "radius"
                })),
                ...(lib?.gaps || []).map((token: any) => ({
                  ...token,
                  category: "gaps",
                  type: "gaps"
                })),
                ...(lib?.paddings || []).map((token: any) => ({
                  ...token,
                  category: "paddings",
                  type: "paddings"
                }))
              ]
            })
          );
          effectiveTokens = librariesAsTokens;
        }

        console.log(
          "[Controller] DEBUG - Tokens disponíveis para linting:",
          effectiveTokens.length,
          "conjuntos"
        );
        if (effectiveTokens.length > 0) {
          console.log("[Controller] DEBUG - Primeiro conjunto:", {
            name: effectiveTokens[0]?.name,
            hasTokens: !!effectiveTokens[0]?.tokens,
            hasFlattenedTokens: !!effectiveTokens[0]?.flattenedTokens,
            tokenKeys: effectiveTokens[0]?.tokens
              ? Object.keys(effectiveTokens[0].tokens)
              : [],
            flattenedCount: effectiveTokens[0]?.flattenedTokens?.length || 0
          });
        }

        // Execute linting on selected nodes
        const lintResults = await lint(
          nodesToLint,
          effectiveLibrariesWithVariables,
          null,
          effectiveTokens
        );

        // Check if processing took too long
        if (Date.now() - startTime > maxProcessingTime) {
          console.warn(
            "[Controller] Processamento demorou mais que 5 segundos"
          );
        }

        const groupedErrors = groupErrorsByNode(lintResults);
        const serializedNodes = serializeNodes(nodesToLint);

        // Count total nodes for summary
        let totalNodeCount = 0;
        const countNodes = (nodesToCount: any[]) => {
          totalNodeCount += nodesToCount.length;
          nodesToCount.forEach(n => {
            if (n.children) countNodes(n.children);
          });
        };
        countNodes(serializedNodes);

        const inspectorData = {
          errors: groupedErrors,
          nodes: serializedNodes,
          date: new Date().toISOString(),
          summary: {
            totalNodes: totalNodeCount,
            totalErrors: lintResults.length
          }
        };
        // Manter em cache em memória para exportações sem depender de armazenamento persistente
        (globalThis as any).LAST_INSPECTOR_DATA = inspectorData;
        // Tentar salvar de forma resiliente, mas não falhar a auditoria caso exceda a cota
        try {
          // Nota: dados podem exceder 5MB dependendo do documento. Evitar travar em caso de erro.
          await figma.clientStorage.setAsync("inspectorData", inspectorData);
        } catch (e) {
          console.warn(
            "[Controller] Não foi possível salvar inspectorData no clientStorage (ignorado):",
            e instanceof Error ? e.message : String(e)
          );
        }
        figma.ui.postMessage({
          type: "step-3-complete",
          errors: groupedErrors,
          message: serializedNodes,
          success: true,
          activeComponentLibraries: effectiveLibrariesWithVariables
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
        let inspectorData = await figma.clientStorage.getAsync("inspectorData");
        if (!inspectorData) {
          inspectorData = (globalThis as any).LAST_INSPECTOR_DATA || null;
        }
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

    if (msg.type === "export-node-as-svg") {
      try {
        const node = figma.getNodeById(msg.nodeId);
        if (node && node.exportAsync) {
          const svgBytes = await node.exportAsync({ format: "SVG" });
          const svg = String.fromCharCode.apply(null, new Uint8Array(svgBytes));
          figma.ui.postMessage({
            type: "exported-node-svg",
            nodeId: msg.nodeId,
            svg: svg
          });
        }
      } catch (e) {
        console.error("Error exporting node as SVG:", e);
        figma.ui.postMessage({
          type: "export-error",
          nodeId: msg.nodeId,
          error: e.toString()
        });
      }
      return;
    }

    if (msg.type === "force-save-tokens") {
      console.log("[Controller] Forçando salvamento de tokens");
      try {
        if (!msg.tokens) {
          throw new Error("No tokens provided for force save");
        }

        // Forçar salvamento no arquivo data.json
        const result = await saveDesignTokens(msg.tokens);

        if (result.success) {
          console.log("[Controller] Tokens salvos com sucesso via force-save");
          figma.ui.postMessage({
            type: "design-tokens-saved",
            success: true,
            message: "Tokens salvos com sucesso",
            tokens: result.tokens
          });
        }
      } catch (error) {
        console.error("[Controller] Erro ao salvar tokens:", error);
        figma.ui.postMessage({
          type: "design-tokens-saved",
          success: false,
          message: "Erro ao salvar tokens",
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    if (msg.type === "fetch-suggestions") {
      console.log("[Controller] Buscando sugestões para erro:", msg.error);
      try {
        const error = msg.error;
        const suggestions: any[] = [];

        // Buscar bibliotecas ativas para sugestões
        const savedLibs = await figma.clientStorage.getAsync(
          "solarops_selected_libs"
        );
        const libraries = Array.isArray(savedLibs) ? savedLibs : [];

        console.log(
          "[Controller] Bibliotecas disponíveis para sugestões:",
          libraries.length
        );

        // Buscar tokens salvos também para sugestões
        const savedTokensResult = await loadSavedTokens();
        const savedTokens = savedTokensResult.success
          ? savedTokensResult.tokens
          : [];

        console.log(
          "[Controller] Tokens salvos disponíveis para sugestões:",
          savedTokens.length
        );

        // Gerar sugestões baseadas no tipo de erro
        if (error.type === "fill" || error.type === "color") {
          // Sugestões de cores (fills)
          libraries.forEach((lib: any) => {
            if (lib.fills && Array.isArray(lib.fills)) {
              lib.fills.forEach((fill: any) => {
                suggestions.push({
                  id: fill.id,
                  name: fill.name,
                  value: fill.color || fill.value,
                  type: "STYLE",
                  description: fill.description || `Cor: ${fill.name}`,
                  paint: fill.paint || { type: "SOLID", color: fill.color },
                  key: fill.key || fill.id,
                  style: {
                    type: "STYLE",
                    name: fill.name,
                    value: fill.color || fill.value,
                    description: fill.description || `Cor: ${fill.name}`,
                    id: fill.id
                  }
                });
              });
            }
          });

          // Adicionar tokens salvos de cores
          savedTokens.forEach((tokenLib: any) => {
            if (tokenLib.flattenedTokens) {
              tokenLib.flattenedTokens
                .filter((token: any) => token.category === "fills")
                .forEach((token: any) => {
                  suggestions.push({
                    id: token.id,
                    name: token.name,
                    value: token.value,
                    type: "SAVED_TOKEN",
                    description: `Token salvo: ${token.name}`,
                    paint: { type: "SOLID", color: token.color },
                    key: token.key || token.id,
                    style: {
                      type: "SAVED_TOKEN",
                      name: token.name,
                      value: token.value,
                      description: `Token salvo: ${token.name}`,
                      id: token.id
                    }
                  });
                });
            }
          });
        }

        if (error.type === "text" || error.type === "typography") {
          // Sugestões de tipografia
          libraries.forEach((lib: any) => {
            if (lib.text && Array.isArray(lib.text)) {
              lib.text.forEach((textStyle: any) => {
                suggestions.push({
                  id: textStyle.id,
                  name: textStyle.name,
                  value: textStyle.fontSize
                    ? `${textStyle.fontSize}px`
                    : textStyle.name,
                  type: "STYLE",
                  description:
                    textStyle.description || `Texto: ${textStyle.name}`,
                  paint: { type: "TEXT" },
                  key: textStyle.key || textStyle.id,
                  style: {
                    type: "STYLE",
                    name: textStyle.name,
                    value: textStyle.fontSize
                      ? `${textStyle.fontSize}px`
                      : textStyle.name,
                    description:
                      textStyle.description || `Texto: ${textStyle.name}`,
                    id: textStyle.id,
                    fontFamily: textStyle.fontFamily,
                    fontSize: textStyle.fontSize,
                    fontWeight: textStyle.fontWeight
                  }
                });
              });
            }
          });

          // Adicionar tokens salvos de texto
          savedTokens.forEach((tokenLib: any) => {
            if (tokenLib.flattenedTokens) {
              tokenLib.flattenedTokens
                .filter((token: any) => token.category === "text")
                .forEach((token: any) => {
                  suggestions.push({
                    id: token.id,
                    name: token.name,
                    value: token.fontSize ? `${token.fontSize}px` : token.name,
                    type: "SAVED_TOKEN",
                    description: `Token salvo: ${token.name}`,
                    paint: { type: "TEXT" },
                    key: token.key || token.id,
                    style: {
                      type: "SAVED_TOKEN",
                      name: token.name,
                      value: token.fontSize
                        ? `${token.fontSize}px`
                        : token.name,
                      description: `Token salvo: ${token.name}`,
                      id: token.id,
                      fontFamily: token.fontFamily,
                      fontSize: token.fontSize,
                      fontWeight: token.fontWeight
                    }
                  });
                });
            }
          });
        }

        if (error.type === "effects" || error.type === "effect") {
          // Sugestões de efeitos
          libraries.forEach((lib: any) => {
            if (lib.effects && Array.isArray(lib.effects)) {
              lib.effects.forEach((effectStyle: any) => {
                suggestions.push({
                  id: effectStyle.id,
                  name: effectStyle.name,
                  value: effectStyle.name,
                  type: "STYLE",
                  description:
                    effectStyle.description || `Efeito: ${effectStyle.name}`,
                  paint: { type: "EFFECT" },
                  key: effectStyle.key || effectStyle.id,
                  style: {
                    type: "STYLE",
                    name: effectStyle.name,
                    value: effectStyle.name,
                    description:
                      effectStyle.description || `Efeito: ${effectStyle.name}`,
                    id: effectStyle.id
                  }
                });
              });
            }
          });

          // Adicionar tokens salvos de efeitos
          savedTokens.forEach((tokenLib: any) => {
            if (tokenLib.flattenedTokens) {
              tokenLib.flattenedTokens
                .filter((token: any) => token.category === "effects")
                .forEach((token: any) => {
                  suggestions.push({
                    id: token.id,
                    name: token.name,
                    value: token.name,
                    type: "SAVED_TOKEN",
                    description: `Token salvo: ${token.name}`,
                    paint: { type: "EFFECT" },
                    key: token.key || token.id,
                    style: {
                      type: "SAVED_TOKEN",
                      name: token.name,
                      value: token.name,
                      description: `Token salvo: ${token.name}`,
                      id: token.id
                    }
                  });
                });
            }
          });
        }

        // Para outros tipos (radius, gaps, paddings), buscar das bibliotecas e tokens
        if (["radius", "gap", "padding"].includes(error.type)) {
          libraries.forEach((lib: any) => {
            const categoryMap: Record<string, string> = {
              radius: "radius",
              gap: "gaps",
              padding: "paddings"
            };

            const categoryKey = categoryMap[error.type];
            if (lib[categoryKey] && Array.isArray(lib[categoryKey])) {
              lib[categoryKey].forEach((item: any) => {
                suggestions.push({
                  id: item.id,
                  name: item.name,
                  value: item.value,
                  type: "VARIABLE",
                  description:
                    item.description || `${error.type}: ${item.name}`,
                  paint: { type: "VARIABLE" },
                  key: item.key || item.id,
                  style: {
                    type: "VARIABLE",
                    name: item.name,
                    value: item.value,
                    description:
                      item.description || `${error.type}: ${item.name}`,
                    id: item.id
                  }
                });
              });
            }
          });

          // Adicionar tokens salvos para essas categorias
          savedTokens.forEach((tokenLib: any) => {
            if (tokenLib.flattenedTokens) {
              tokenLib.flattenedTokens
                .filter((token: any) => token.category === error.type + "s")
                .forEach((token: any) => {
                  suggestions.push({
                    id: token.id,
                    name: token.name,
                    value: token.value,
                    type: "SAVED_TOKEN",
                    description: `Token salvo: ${token.name}`,
                    paint: { type: "VARIABLE" },
                    key: token.key || token.id,
                    style: {
                      type: "SAVED_TOKEN",
                      name: token.name,
                      value: token.value,
                      description: `Token salvo: ${token.name}`,
                      id: token.id
                    }
                  });
                });
            }
          });
        }

        console.log(
          `[Controller] Total de sugestões encontradas: ${suggestions.length}`
        );

        // Enviar sugestões de volta para a UI
        figma.ui.postMessage({
          type: "fetched-suggestions",
          error: error,
          suggestions: suggestions,
          success: true
        });
      } catch (error) {
        console.error("[Controller] Erro ao buscar sugestões:", error);
        figma.ui.postMessage({
          type: "fetched-suggestions",
          error: error,
          suggestions: [],
          success: false,
          message: error instanceof Error ? error.message : String(error)
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

// Função para carregar os tokens salvos
async function loadSavedTokens() {
  try {
    console.log("[loadSavedTokens] Iniciando carregamento de tokens salvos");

    // Primeiro tenta carregar do arquivo único
    const dataFile = await figma.clientStorage.getAsync("data.json");

    if (dataFile && typeof dataFile === "string") {
      try {
        const parsedData = JSON.parse(dataFile);
        console.log("[loadSavedTokens] Dados carregados do arquivo data.json");
        console.log(
          "[loadSavedTokens] Total de tokens:",
          parsedData.metadata?.totalTokens || 0
        );
        console.log(
          "[loadSavedTokens] Categorias:",
          parsedData.metadata?.categories || []
        );

        // Transforma os tokens salvos no formato esperado pelas funções de linting
        const flattenedTokens: any[] = [];

        if (parsedData.tokens) {
          // Para cada categoria, transforma os tokens no formato esperado
          Object.keys(parsedData.tokens).forEach(category => {
            const categoryTokens = parsedData.tokens[category];

            if (Array.isArray(categoryTokens)) {
              categoryTokens.forEach((token: any) => {
                // Cada token precisa ter uma estrutura específica para as funções de linting
                const lintingToken = {
                  id:
                    token.id ||
                    `${category}_${Math.random()
                      .toString(36)
                      .substr(2, 9)}`,
                  name: token.name || `${category} token`,
                  value: token.value || token,
                  type: category,
                  category: category,
                  // Propriedades específicas por categoria
                  ...(category === "fills" && {
                    color: token.color || token.value?.color,
                    opacity: token.opacity ?? token.value?.opacity
                  }),
                  ...(category === "text" && {
                    fontFamily: token.fontFamily || token.value?.fontFamily,
                    fontSize: token.fontSize || token.value?.fontSize,
                    fontWeight: token.fontWeight || token.value?.fontWeight,
                    lineHeight: token.lineHeight || token.value?.lineHeight,
                    letterSpacing:
                      token.letterSpacing || token.value?.letterSpacing
                  }),
                  ...(category === "effects" && {
                    effectType:
                      token.effectType || token.value?.effectType || token.type,
                    radius: token.radius || token.value?.radius,
                    offset: token.offset || token.value?.offset,
                    color: token.color || token.value?.color
                  }),
                  ...(category === "gaps" && {
                    gapValue: token.value || token.gapValue || token,
                    unit: token.unit || "PIXELS"
                  })
                };

                flattenedTokens.push(lintingToken);
              });
            }
          });
        }

        console.log(
          "[loadSavedTokens] Tokens transformados:",
          flattenedTokens.length,
          "tokens individuais"
        );

        // Retorna no formato esperado pela UI e funções de linting
        const tokensList = [
          {
            filename: "data.json",
            timestamp: parsedData.timestamp || parsedData.metadata?.savedAt,
            name: `Tokens ${new Date(
              parsedData.metadata?.savedAt || Date.now()
            ).toLocaleString()}`,
            tokens: parsedData.tokens, // Mantém estrutura original para UI
            flattenedTokens: flattenedTokens, // Adiciona versão achatada para linting
            totalTokens: parsedData.metadata?.totalTokens || 0
          }
        ];

        console.log(
          "[loadSavedTokens] Total de conjuntos de tokens carregados:",
          tokensList.length
        );

        return {
          success: true,
          tokens: tokensList
        };
      } catch (parseError) {
        console.error(
          "[loadSavedTokens] Erro ao parsear data.json:",
          parseError
        );
      }
    }

    // Fallback: tentar carregar arquivos antigos se data.json não existir
    console.log(
      "[loadSavedTokens] data.json não encontrado, tentando arquivos antigos..."
    );
    const savedFiles =
      (await figma.clientStorage.getAsync("savedTokenFiles")) || [];
    console.log(
      "[loadSavedTokens] Arquivos antigos encontrados:",
      savedFiles.length
    );

    const tokensList: SavedTokenFile[] = [];

    // Carregar tokens dos arquivos antigos (compatibilidade)
    for (const file of (savedFiles as SavedTokenFile[]).slice(0, 5)) {
      // Limitar a 5 arquivos
      try {
        console.log(
          "[loadSavedTokens] Carregando arquivo antigo:",
          file.filename
        );
        const tokens = await figma.clientStorage.getAsync(file.filename);

        if (typeof tokens === "string" && tokens.trim().length) {
          try {
            const parsed = JSON.parse(tokens);
            console.log(
              "[loadSavedTokens] Tokens antigos parseados com sucesso"
            );

            // Tentar transformar tokens antigos também
            const flattenedTokens: any[] = [];
            if (parsed && typeof parsed === "object") {
              Object.keys(parsed).forEach(category => {
                if (Array.isArray(parsed[category])) {
                  parsed[category].forEach((token: any) => {
                    flattenedTokens.push({
                      id:
                        token.id ||
                        `${category}_${Math.random()
                          .toString(36)
                          .substr(2, 9)}`,
                      name: token.name || `${category} token`,
                      value: token.value || token,
                      type: category,
                      category: category
                    });
                  });
                }
              });
            }

            tokensList.push({
              ...file,
              tokens: parsed,
              flattenedTokens: flattenedTokens
            });
          } catch (e) {
            console.warn(
              "[loadSavedTokens] Ignorando conteúdo inválido em",
              file.filename,
              e
            );
          }
        }
      } catch (error) {
        console.error(`Erro ao carregar tokens de ${file.filename}:`, error);
      }
    }

    console.log(
      "[loadSavedTokens] Total de conjuntos de tokens carregados:",
      tokensList.length
    );

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

// Função para salvar os tokens de design em arquivo único
async function saveDesignTokens(tokens: any) {
  try {
    console.log("[saveDesignTokens] Iniciando salvamento de tokens");
    console.log("[saveDesignTokens] Tokens recebidos:", {
      type: typeof tokens,
      isArray: Array.isArray(tokens),
      length: tokens?.length,
      keys: tokens ? Object.keys(tokens) : []
    });

    if (!tokens) {
      throw new Error("No tokens provided to save");
    }

    // Criar estrutura de dados para o arquivo único
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = "data.json";

    console.log("[saveDesignTokens] Nome do arquivo:", filename);
    console.log(
      "[saveDesignTokens] Tamanho dos dados a salvar:",
      JSON.stringify(tokens).length
    );

    // Estrutura completa para salvar
    const fileData = {
      metadata: {
        savedAt: new Date().toISOString(),
        version: "1.0",
        totalTokens: Object.keys(tokens).reduce(
          (acc: number, category: string) => {
            return (
              acc +
              (Array.isArray(tokens[category]) ? tokens[category].length : 0)
            );
          },
          0
        ),
        categories: Object.keys(tokens)
      },
      tokens: tokens,
      timestamp: timestamp,
      filename: filename
    };

    // Salvar no clientStorage do Figma em arquivo único
    await figma.clientStorage.setAsync(
      filename,
      JSON.stringify(fileData, null, 2)
    );

    console.log(
      "[saveDesignTokens] Dados salvos no clientStorage em",
      filename
    );

    // Atualizar lista de arquivos salvos
    const savedFiles =
      (await figma.clientStorage.getAsync("savedTokenFiles")) || [];
    const existingIndex = savedFiles.findIndex(
      (file: any) => file.filename === filename
    );

    const fileInfo = {
      filename,
      timestamp: new Date().toISOString(),
      name: `Tokens ${new Date().toLocaleString()}`,
      totalTokens: fileData.metadata.totalTokens
    };

    if (existingIndex !== -1) {
      savedFiles[existingIndex] = fileInfo;
    } else {
      savedFiles.unshift(fileInfo);
    }

    // Salvar a lista atualizada
    await figma.clientStorage.setAsync("savedTokenFiles", savedFiles);

    console.log("[saveDesignTokens] Lista de arquivos salva");

    // Retornar dados atualizados
    const loadedTokens = await loadSavedTokens();

    return {
      success: true,
      message: "Design tokens salvos com sucesso",
      filename,
      timestamp: new Date().toISOString(),
      tokens: loadedTokens.success ? loadedTokens.tokens : [],
      totalTokens: fileData.metadata.totalTokens
    };
  } catch (error) {
    console.error("[saveDesignTokens] Erro ao salvar design tokens:", error);
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
            color:
              fill.type === "SOLID" && fill.color
                ? {
                    r: Math.round(fill.color.r * 255),
                    g: Math.round(fill.color.g * 255),
                    b: Math.round(fill.color.b * 255)
                  }
                : null
          }));
        }

        // Texto
        if (node.type === "TEXT") {
          nodeData.characters = node.characters;
          if (node.fontName) {
            nodeData.fontName = node.fontName;
          }
          if (node.fontSize) {
            nodeData.fontSize = node.fontSize;
          }
        }

        return nodeData;
      };

      // Extrair dados dos nós selecionados
      const nodesData = selectedNodes.map(extractNodeData);

      // Enviar dados para a UI
      figma.ui.postMessage({
        type: "selection-changed",
        selection: nodesData
      });
    } else {
      // Nenhum nó selecionado
      figma.ui.postMessage({
        type: "selection-changed",
        selection: []
      });
    }
  } catch (error) {
    console.error("Erro no listener selectionchange:", error);
  }
});
