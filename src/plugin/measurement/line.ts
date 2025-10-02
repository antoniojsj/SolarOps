import { findAndReplaceNumberPattern } from "../shared/helpers";
import { Alignments, LineParameterTypes } from "../shared/interfaces";

import { getColor, solidColor } from "./helper";

export const createLabel = ({
  baseNode,
  text,
  color,
  isVertical,
  labelFontSize = 10
}: {
  baseNode?: SceneNode;
  text: string;
  color: unknown;
  isVertical?: boolean;
  labelFontSize?: number;
}) => {
  const labelFrame = figma.createFrame();
  const label = figma.createText();

  label.characters = text;
  label.fontName = {
    family: "Inter",
    style: "Bold"
  };
  label.fontSize = labelFontSize;
  label.fills = [].concat(solidColor(255, 255, 255));

  labelFrame.appendChild(label);
  labelFrame.name = "label";

  // LABEL RECT
  labelFrame.cornerRadius = 3;

  labelFrame.paddingLeft = (6 * labelFontSize) / 10;
  labelFrame.paddingRight = (6 * labelFontSize) / 10;
  labelFrame.paddingTop = (3 * labelFontSize) / 10;
  labelFrame.paddingBottom = (3 * labelFontSize) / 10;
  labelFrame.counterAxisSizingMode = "AUTO";

  if (baseNode) {
    labelFrame.x = baseNode.x;
    labelFrame.y = baseNode.y;
  }
  labelFrame.layoutMode = "HORIZONTAL";

  if (baseNode) {
    if (isVertical) {
      labelFrame.x = Number(labelFrame.x) - Number(labelFrame.width) / 2;
      labelFrame.y =
        Number(labelFrame.y) +
        Number(baseNode.height) / 2 -
        Number(labelFrame.height) / 2;
    } else {
      labelFrame.x =
        Number(labelFrame.x) +
        Number(baseNode.width) / 2 -
        Number(labelFrame.width) / 2;
      labelFrame.y = Number(labelFrame.y) - Number(labelFrame.height) / 2;
    }
  }
  labelFrame.fills = [].concat(color);

  return labelFrame;
};

export const getLineFrame = (node, data) => {
  const name = "line";
  const lineFrame = figma.createFrame();

  lineFrame.name = name;
  lineFrame.resize(
    data.isHorizontal ? node.width : data.labelWidth,
    data.isHorizontal ? data.labelHeight : node.height
  );
  lineFrame.backgrounds = [];
  lineFrame.clipsContent = false;

  lineFrame.expanded = false;

  return lineFrame;
};

/**
 * Creates a line cap (T-shaped end) for measurement lines
 * @param params Configuration for the line cap
 * @returns The created line cap node
 */
/**
 * Cria uma extremidade em T para as linhas de medição
 * @param params Parâmetros de configuração
 * @returns O nó da linha de extremidade criada
 */
const createLineCap = (params: {
  /** Grupo pai para adicionar a extremidade */
  group?: FrameNode | GroupNode;
  /** Linha à qual a extremidade será adicionada */
  line: VectorNode;
  /** Se a linha é horizontal (true) ou vertical (false) */
  isHorizontal: boolean;
  /** Altura da linha */
  height: number;
  /** Largura da linha */
  width: number;
  /** Cor da extremidade */
  mainColor: SolidPaint;
  /** Qual extremidade da linha ('start' ou 'end') */
  position: "start" | "end";
  /** Se deve adicionar ao grupo (padrão: true) */
  addToGroup?: boolean;
}) => {
  const {
    group,
    line,
    isHorizontal,
    height,
    width,
    mainColor,
    position,
    addToGroup = true
  } = params;

  // Garantir que strokeWeight é um número
  const strokeWeight =
    typeof line.strokeWeight === "number" ? line.strokeWeight : 1;

  // Tamanho da extremidade (3px de cada lado = 6px no total)
  const capLength = 6;
  const halfCapLength = capLength / 2;

  // Criar a linha da extremidade
  const capLine = figma.createLine();

  // Estilização padrão para todas as extremidades
  capLine.strokeWeight = strokeWeight;
  capLine.strokes = [mainColor];
  capLine.strokeCap = "NONE";
  capLine.strokeJoin = "MITER";
  capLine.strokeMiterLimit = 1;

  // Obter a posição da linha
  const lineX = "x" in line ? (typeof line.x === "number" ? line.x : 0) : 0;
  const lineY = "y" in line ? (typeof line.y === "number" ? line.y : 0) : 0;

  if (isHorizontal) {
    // Para linhas horizontais, criar extremidades verticais
    capLine.resize(0, capLength);

    // Posicionar a extremidade
    if (position === "start") {
      // Extremidade esquerda
      capLine.x = lineX;
      capLine.y = lineY - halfCapLength + strokeWeight / 2;

      // Configurar restrições para redimensionamento
      capLine.constraints = {
        vertical: "CENTER",
        horizontal: "MIN"
      };
    } else {
      // Extremidade direita
      capLine.x = lineX + width - strokeWeight;
      capLine.y = lineY - halfCapLength + strokeWeight / 2;

      // Configurar restrições para redimensionamento
      capLine.constraints = {
        vertical: "CENTER",
        horizontal: "MAX"
      };
    }
  } else {
    // Para linhas verticais, criar extremidades horizontais
    capLine.resize(capLength, 0);

    // Posicionar a extremidade
    if (position === "start") {
      // Extremidade superior
      capLine.x = lineX - halfCapLength;
      capLine.y = lineY;

      // Configurar restrições para redimensionamento
      capLine.constraints = {
        vertical: "MIN",
        horizontal: "CENTER"
      };
    } else {
      // Extremidade inferior
      capLine.x = lineX - halfCapLength;
      capLine.y = lineY + height - strokeWeight;

      // Configurar restrições para redimensionamento
      capLine.constraints = {
        vertical: "MAX",
        horizontal: "CENTER"
      };
    }
  }

  // Adicionar ao grupo, se especificado
  if (addToGroup && group) {
    group.appendChild(capLine);
  }

  return capLine;
};

interface CreateStandardCapForSpacingParams {
  line: VectorNode;
  height: number;
  width: number;
  mainColor: SolidPaint;
  isHorizontal?: boolean;
  isFirst?: boolean;
}

export const createStandardCapForSpacing = ({
  line,
  height,
  width,
  mainColor,
  isHorizontal = false,
  isFirst = false
}: CreateStandardCapForSpacingParams) => {
  // Return null to prevent creating any caps
  return null;
};

interface CreateStandardCapParams {
  group: FrameNode;
  line: VectorNode;
  isHorizontal: boolean;
  height: number;
  width: number;
  mainColor: SolidPaint;
}

export const createStandardCap = ({
  group,
  line,
  isHorizontal,
  height,
  width,
  mainColor
}: CreateStandardCapParams) => {
  // Do nothing to prevent creating any caps
  return;
};

export const createLine = options => {
  const {
    node,
    direction = "horizontal",
    // name = 'Group',
    txtVerticalAlign = Alignments.CENTER,
    txtHorizontalAlign = Alignments.CENTER,
    lineVerticalAlign = Alignments.LEFT,
    lineHorizontalAlign = Alignments.BOTTOM,
    strokeCap = "NONE",
    strokeOffset = 3,
    color = "",
    labels = true,
    labelsOutside = false,
    labelPattern = "",
    labelFontSize = 10
  }: LineParameterTypes = options;

  const LINE_OFFSET = strokeOffset * -1;
  const LABEL_OUTSIDE_MARGIN = 4 * (labelFontSize / 10);

  const mainColor = getColor(color);

  const isHorizontal = direction === "horizontal";

  const nodeHeight = node.height;
  const nodeWidth = node.width;

  const heightOrWidth = isHorizontal ? nodeWidth : nodeHeight;

  if (heightOrWidth > 0.01) {
    // needed elements
    const line = figma.createVector();

    // LABEL
    let labelFrame;
    const alignment = isHorizontal ? lineHorizontalAlign : lineVerticalAlign;

    if (labels) {
      labelFrame = createLabel({
        labelFontSize,
        text: findAndReplaceNumberPattern(labelPattern, heightOrWidth),
        color: mainColor
      });
    }

    // GROUP
    const group = getLineFrame(node, {
      isHorizontal,
      alignment,
      labelWidth: labelFrame ? labelFrame.width : 7,
      labelHeight: labelFrame ? labelFrame.height : 7
    });

    group.appendChild(line);

    if (isHorizontal) {
      line.constraints = {
        vertical: "CENTER",
        horizontal: "STRETCH"
      };
    } else {
      line.constraints = {
        vertical: "STRETCH",
        horizontal: "CENTER"
      };
    }

    // add label frame
    if (labelFrame) {
      labelFrame.constraints = {
        vertical: "CENTER",
        horizontal: "CENTER"
      };
      group.appendChild(labelFrame);
    }

    // LINE
    line.strokeWeight = labelFontSize / 5;
    line.x = isHorizontal ? 0 : group.width / 2 - line.strokeWeight / 2;
    line.y = isHorizontal ? group.height / 2 + line.strokeWeight / 2 : 0;

    line.vectorPaths = [
      {
        windingRule: "NONE",
        // M x y L x y Z is close
        data: isHorizontal
          ? `M 0 0 L ${node.height} 0`
          : `M 0 0 L 0 ${node.width}`
      }
    ];

    line.strokes = [].concat(mainColor);
    line.resize(
      isHorizontal ? node.width : line.strokeWeight,
      isHorizontal ? line.strokeWeight : node.height
    );

    // Configure stroke properties to ensure no caps are shown
    line.strokeCap = "NONE";
    line.strokeJoin = "MITER";
    line.strokeMiterLimit = 1;

    line.handleMirroring = "ANGLE_AND_LENGTH";

    // place text group
    if (labels) {
      if (isHorizontal) {
        labelFrame.x = 0;
        labelFrame.y =
          Number(nodeHeight) - Number(LINE_OFFSET) - Number(line.strokeWeight);

        // vertical text align
        if (txtVerticalAlign === Alignments.CENTER) {
          if (labelsOutside) {
            if (lineHorizontalAlign === Alignments.TOP) {
              labelFrame.y =
                (labelFrame.height / 2 + LABEL_OUTSIDE_MARGIN) * -1;
            } else if (lineHorizontalAlign === Alignments.BOTTOM) {
              labelFrame.y =
                labelFrame.height / 2 +
                LABEL_OUTSIDE_MARGIN +
                line.strokeWeight;
            } else {
              labelFrame.y = 0;
            }
          } else {
            labelFrame.y = 0;
          }
        }

        // horizontal text align
        if (txtHorizontalAlign === Alignments.CENTER) {
          labelFrame.x = nodeWidth / 2 - labelFrame.width / 2;
        }
      } else {
        labelFrame.x = 0;

        // vertical text align
        if (txtVerticalAlign === Alignments.CENTER) {
          labelFrame.y = Number(nodeHeight) / 2 - Number(labelFrame.height) / 2;
        }

        // vertical text align
        if (txtHorizontalAlign === Alignments.CENTER) {
          if (labelsOutside) {
            if (lineVerticalAlign === Alignments.RIGHT) {
              labelFrame.x = labelFrame.width / 2 + LABEL_OUTSIDE_MARGIN;
            } else if (lineVerticalAlign === Alignments.LEFT) {
              labelFrame.x =
                Number(labelFrame.x) -
                (Number(labelFrame.width) / 2 +
                  Number(LABEL_OUTSIDE_MARGIN) +
                  Number(line.strokeWeight));
            } else {
              labelFrame.x = 0;
            }
          } else {
            labelFrame.x = 0;
          }
        }
      }
    }

    // line position
    const halfGroupHeight = group.height / 2;
    const halfGroupWidth = group.width / 2;

    let transformPosition = node.absoluteTransform;
    let newX = transformPosition[0][2];
    let newY = transformPosition[1][2];

    const xCos = transformPosition[0][0];
    const xSin = transformPosition[0][1];

    const yCos = transformPosition[1][0];
    const ySin = transformPosition[1][1];

    // horizonzal line position
    if (isHorizontal) {
      if (lineHorizontalAlign === Alignments.CENTER) {
        newY =
          Number(newY) +
          (Number(nodeHeight) - Number(group.height)) / 2 -
          Number(line.strokeWeight) / 2;
      } else if (lineHorizontalAlign === Alignments.TOP) {
        newY =
          Number(newY) -
          (Number(group.height) / 2 -
            Number(LINE_OFFSET) +
            Number(line.strokeWeight));
      }
      // BOTTOM
      else {
        newY =
          Number(newY) +
          Number(nodeHeight) -
          Number(group.height) / 2 -
          Number(LINE_OFFSET);
      }

      // check if element is rotated
      const rotation =
        "relativeTransform" in node
          ? Math.atan2(
              node.relativeTransform[1][0],
              node.relativeTransform[0][0]
            ) *
            (180 / Math.PI)
          : 0;
      if (rotation > 0 || rotation < 0) {
        // reset
        newX = transformPosition[0][2];
        newY = transformPosition[1][2];

        // center
        if (lineHorizontalAlign === Alignments.CENTER) {
          newY =
            Number(newY) +
            Number(ySin) * (Number(nodeHeight) / 2 - Number(halfGroupHeight));
          newX =
            Number(newX) -
            Number(yCos) * (Number(nodeHeight) / 2 - Number(halfGroupHeight));
        }
        // top
        else if (lineHorizontalAlign === Alignments.TOP) {
          newY =
            Number(newY) -
            Number(ySin) *
              (Number(halfGroupHeight) -
                Number(LINE_OFFSET) +
                Number(line.strokeWeight));
          newX =
            Number(newX) +
            Number(yCos) *
              (Number(halfGroupHeight) -
                Number(LINE_OFFSET) +
                Number(line.strokeWeight));
        }
        // bottom
        else {
          newY =
            Number(newY) +
            Number(ySin) *
              (Number(nodeHeight) -
                Number(halfGroupHeight) -
                Number(LINE_OFFSET));
          newX =
            Number(newX) -
            Number(yCos) *
              (Number(nodeHeight) -
                Number(halfGroupHeight) -
                Number(LINE_OFFSET));
        }
      }
    }
    // vertical line position
    else {
      if (lineVerticalAlign === Alignments.CENTER) {
        newX =
          Number(newX) +
          (Number(nodeWidth) - Number(group.width)) / 2 +
          Number(line.strokeWeight) / 2;
      } else if (lineVerticalAlign === Alignments.RIGHT) {
        newX =
          Number(newX) +
          Number(nodeWidth) -
          Number(group.width) / 2 -
          Number(LINE_OFFSET) +
          Number(line.strokeWeight);
      }
      // LEFT
      else {
        newX = Number(newX) - (Number(group.width) / 2 - Number(LINE_OFFSET));
      }

      // check if element is rotated
      const rotation =
        "relativeTransform" in node
          ? Math.atan2(
              node.relativeTransform[1][0],
              node.relativeTransform[0][0]
            ) *
            (180 / Math.PI)
          : 0;
      if (rotation > 0 || rotation < 0) {
        // reset
        newX = transformPosition[0][2];
        newY = transformPosition[1][2];

        // center
        if (lineVerticalAlign === Alignments.CENTER) {
          newY =
            Number(newY) -
            (Number(xSin) * (Number(nodeWidth) - Number(group.width))) / 2;
          newX =
            Number(newX) +
            (Number(xCos) * (Number(nodeWidth) - Number(group.width))) / 2;
        }
        // right
        else if (lineVerticalAlign === Alignments.RIGHT) {
          newY =
            Number(newY) -
            Number(xSin) *
              (Number(nodeWidth) -
                Number(halfGroupWidth) -
                Number(LINE_OFFSET) +
                Number(line.strokeWeight));
          newX =
            Number(newX) +
            Number(xCos) *
              (Number(nodeWidth) -
                Number(halfGroupWidth) -
                Number(LINE_OFFSET) +
                Number(line.strokeWeight));
        }
        // left
        else {
          newY =
            Number(newY) +
            Number(xSin) * (Number(halfGroupWidth) - Number(LINE_OFFSET));
          newX =
            Number(newX) -
            Number(xCos) * (Number(halfGroupWidth) - Number(LINE_OFFSET));
        }
      }
    }

    transformPosition = [
      [
        xCos, // cos
        xSin, // sin
        newX
      ],
      [
        yCos, // -sin
        ySin, // cos
        newY
      ]
    ];

    group.relativeTransform = transformPosition;

    return group;
  }
  return null;
};
