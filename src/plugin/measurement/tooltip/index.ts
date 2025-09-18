import { SetTooltipOptions, TooltipPositions } from "../../shared/interfaces";
import { solidColor, hexToRgb } from "../helper";

import { addNode } from "./types";

const getTooltipFrame = (node): FrameNode => {
  let tooltipFrame;

  if (!tooltipFrame) {
    tooltipFrame = figma.createFrame();
  }
  tooltipFrame.expanded = false;
  tooltipFrame.name = `Tooltip ${node.name}`;
  tooltipFrame.clipsContent = false;
  tooltipFrame.fills = [];

  return tooltipFrame;
};

interface TooltipData extends SetTooltipOptions {
  vertical?: TooltipPositions;
  horizontal?: TooltipPositions;
  backgroundColor: string;
  fontColor: string;
  fontSize: number;
  offset: number;
}

export const setTooltip = async (
  options: SetTooltipOptions,
  specificNode: SceneNode | null = null
): Promise<FrameNode | null> => {
  try {
    console.log("[setTooltip] Iniciando setTooltip com opções:", options);
    console.log(
      "[setTooltip] Nó específico fornecido:",
      specificNode ? "Sim" : "Não"
    );

    // Validação inicial das opções
    if (!options) {
      console.error("[setTooltip] Nenhuma opção fornecida");
      return null;
    }

    // Validar posição
    if (
      !options.position ||
      !Object.values(TooltipPositions).includes(
        options.position as TooltipPositions
      )
    ) {
      console.error("[setTooltip] Posição inválida:", options.position);
      return null;
    }

    // Preparar dados do tooltip com valores padrão
    const data: TooltipData = {
      ...options,
      backgroundColor: options.backgroundColor || "#000000",
      fontColor: options.fontColor || "#ffffff",
      fontSize: options.labelFontSize || 11,
      offset: options.offset || 10,
      vertical: undefined,
      horizontal: undefined
    };

    // Definir direção vertical ou horizontal
    if (
      options.position === TooltipPositions.TOP ||
      options.position === TooltipPositions.BOTTOM
    ) {
      data.vertical = options.position;
    } else {
      data.horizontal = options.position;
    }

    console.log("[setTooltip] Dados processados:", data);

    // Verificar se há um nó selecionado
    if (figma.currentPage.selection.length === 0 && !specificNode) {
      const msg = "Nenhum nó selecionado";
      console.warn("[setTooltip]", msg);
      figma.notify(msg, { error: true });
      return null;
    }

    const node: SceneNode =
      specificNode || (figma.currentPage.selection[0] as SceneNode);

    // Verificar se o nó é válido
    if (!node || typeof node !== "object") {
      const msg = "Nó inválido";
      console.error("[setTooltip]", msg, node);
      return null;
    }

    console.log("[setTooltip] Nó selecionado:", {
      id: node.id,
      name: node.name,
      type: node.type,
      visible: node.visible,
      parent: node.parent
        ? { id: node.parent.id, name: node.parent.name }
        : null
    });

    // Verificar se o nó está visível e acessível
    if ("visible" in node && !node.visible) {
      const msg = "Não é possível adicionar tooltip a um nó invisível";
      console.warn("[setTooltip]", msg);
      figma.notify(msg, { error: true });
      return null;
    }

    // Verificar tipos de nós não suportados
    if (node.type === "TEXT" && !(node as TextNode).characters) {
      const msg = "Não é possível adicionar tooltip a um nó de texto vazio";
      console.warn("[setTooltip]", msg);
      figma.notify(msg, { error: true });
      return null;
    }

    const unsupportedNodeTypes = ["BOOLEAN_OPERATION", "SLICE", "STICKY"];
    if (unsupportedNodeTypes.includes(node.type)) {
      const msg = `Tipo de elemento não suportado: ${node.type}`;
      console.warn("[setTooltip]", msg);
      figma.notify(msg, { error: true });
      return null;
    }

    const tooltipFrame = getTooltipFrame(node);
    const contentFrame = figma.createFrame();
    tooltipFrame.appendChild(contentFrame);

    // auto-layout
    contentFrame.layoutMode = "VERTICAL";
    contentFrame.cornerRadius = 7;
    contentFrame.paddingTop = 12;
    contentFrame.paddingBottom = 12;
    contentFrame.paddingLeft = 10;
    contentFrame.paddingRight = 10;
    contentFrame.itemSpacing = 3;
    contentFrame.counterAxisSizingMode = "AUTO";

    // background
    const bg = hexToRgb(data.backgroundColor);
    const bgColor = solidColor(bg.r, bg.g, bg.b);
    contentFrame.backgrounds = bgColor ? [bgColor] : [];

    //-----

    switch (node.type) {
      case "GROUP":
      case "INSTANCE":
      case "COMPONENT":
      case "VECTOR":
      case "STAR":
      case "LINE":
      case "ELLIPSE":
      case "FRAME":
      case "POLYGON":
      case "RECTANGLE":
      case "TEXT":
        await addNode(contentFrame, node, data);
        break;
      default:
        tooltipFrame.remove();
        break;
    }

    // ----
    console.log("[setTooltip] Tamanho do conteúdo do tooltip:", {
      width: contentFrame.width,
      height: contentFrame.height
    });

    // Removido: não criamos seta. Apenas o card de conteúdo.
    tooltipFrame.resize(contentFrame.width, contentFrame.height);

    // ----
    const nodeBounds = (node as any).absoluteBoundingBox;

    if (!nodeBounds) {
      console.error("[setTooltip] Não foi possível obter os limites do nó:", {
        nodeId: node.id,
        nodeType: node.type,
        hasParent: !!node.parent,
        parentType: node.parent ? node.parent.type : "none"
      });
      figma.notify(
        "Não foi possível posicionar o balão: nó inválido ou sem limites definidos",
        {
          error: true,
          timeout: 3000
        }
      );
      tooltipFrame.remove();
      return null;
    }

    console.log("[setTooltip] Limites do nó:", nodeBounds);
    tooltipFrame.x = nodeBounds.x;
    tooltipFrame.y = nodeBounds.y;

    if (data.vertical) {
      tooltipFrame.x -= contentFrame.width / 2 - nodeBounds.width / 2;

      switch (data.vertical) {
        case TooltipPositions.TOP:
          tooltipFrame.y += (contentFrame.height + data.offset) * -1;
          break;
        case TooltipPositions.BOTTOM:
          tooltipFrame.y += nodeBounds.height + data.offset;
          break;
      }
    } else {
      tooltipFrame.y += nodeBounds.height / 2 - contentFrame.height / 2;

      switch (data.horizontal) {
        case TooltipPositions.LEFT:
          tooltipFrame.x -= tooltipFrame.width + data.offset;
          break;
        case TooltipPositions.RIGHT:
          tooltipFrame.x += nodeBounds.width + data.offset;
          break;
      }
    }

    // Aplicar sombra e estilos visuais
    try {
      const shadowEffect: DropShadowEffect = {
        type: "DROP_SHADOW",
        color: { r: 0, g: 0, b: 0, a: 0.3 },
        offset: { x: 0, y: 2 },
        radius: 4,
        spread: 0,
        visible: true,
        blendMode: "NORMAL",
        showShadowBehindNode: false
      };
      tooltipFrame.effects = [shadowEffect];

      // Garantir que o tooltip esteja visível e desbloqueado
      tooltipFrame.locked = false;
      tooltipFrame.visible = true;

      // Forçar atualização do layout
      await new Promise(resolve => setTimeout(resolve, 0));

      console.log("[setTooltip] Tooltip criado com sucesso:", {
        id: tooltipFrame.id,
        name: tooltipFrame.name,
        bounds: {
          x: tooltipFrame.x,
          y: tooltipFrame.y,
          width: tooltipFrame.width,
          height: tooltipFrame.height
        },
        parent: tooltipFrame.parent
          ? {
              id: tooltipFrame.parent.id,
              name: tooltipFrame.parent.name,
              type: (tooltipFrame.parent as any).type
            }
          : null
      });

      return tooltipFrame;
    } catch (error) {
      console.error("[setTooltip] Erro ao configurar o tooltip:", error);
      try {
        tooltipFrame.remove();
      } catch (e) {
        console.error("[setTooltip] Erro ao remover tooltip inválido:", e);
      }
      return null;
    }
  } catch (error) {
    console.error("[setTooltip] Erro inesperado:", error);
    try {
      figma.notify("Ocorreu um erro ao criar o tooltip", { error: true });
    } catch (e) {
      console.error("[setTooltip] Erro ao notificar usuário:", e);
    }
    return null;
  }
};
