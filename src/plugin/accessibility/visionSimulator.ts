// Matrizes de daltonismo baseadas em modelos matemáticos (LMS / RGB)
const COLOR_BLINDNESS_MATRICES: Record<string, number[][]> = {
  protanopia: [
    [0.567, 0.433, 0],
    [0.558, 0.442, 0],
    [0, 0.242, 0.758]
  ],
  deuteranopia: [
    [0.625, 0.375, 0],
    [0.7, 0.3, 0],
    [0, 0.3, 0.7]
  ],
  tritanopia: [
    [0.95, 0.05, 0],
    [0, 0.433, 0.567],
    [0, 0.475, 0.525]
  ],
  achromatopsia: [
    [0.299, 0.587, 0.114],
    [0.299, 0.587, 0.114],
    [0.299, 0.587, 0.114]
  ]
};

// Nomes de exibição
const TYPE_NAMES: Record<string, string> = {
  protanopia: "Protanopia",
  deuteranopia: "Deuteranopia",
  tritanopia: "Tritanopia",
  achromatopsia: "Acromatopsia",
  catarata: "Catarata",
  baixa_visao: "Baixa Visão"
};

// Aplicar matriz de transformação em uma cor (RGB de 0 a 1)
function applyMatrixToColor(color: RGB, matrix: number[][]): RGB {
  const { r, g, b } = color;
  return {
    r: Math.max(
      0,
      Math.min(1, r * matrix[0][0] + g * matrix[0][1] + b * matrix[0][2])
    ),
    g: Math.max(
      0,
      Math.min(1, r * matrix[1][0] + g * matrix[1][1] + b * matrix[1][2])
    ),
    b: Math.max(
      0,
      Math.min(1, r * matrix[2][0] + g * matrix[2][1] + b * matrix[2][2])
    )
  };
}

// Clonar e modificar Paints (fills/strokes)
function modifyPaints(
  paints: ReadonlyArray<Paint>,
  matrix: number[][]
): Paint[] {
  return paints.map(paint => {
    if (paint.type === "SOLID") {
      return {
        ...paint,
        color: applyMatrixToColor(paint.color, matrix)
      };
    } else if (
      paint.type === "GRADIENT_LINEAR" ||
      paint.type === "GRADIENT_RADIAL" ||
      paint.type === "GRADIENT_ANGULAR" ||
      paint.type === "GRADIENT_DIAMOND"
    ) {
      return {
        ...paint,
        gradientStops: paint.gradientStops.map(stop => ({
          ...stop,
          color: {
            ...stop.color,
            r: applyMatrixToColor(stop.color, matrix).r,
            g: applyMatrixToColor(stop.color, matrix).g,
            b: applyMatrixToColor(stop.color, matrix).b
          }
        }))
      };
    }
    return paint;
  });
}

// Função recursiva para percorrer os nós e alterar suas cores
async function processNodeColors(node: SceneNode, matrix: number[][]) {
  // Alterar fills
  if ("fills" in node && Array.isArray(node.fills)) {
    const newFills = modifyPaints(node.fills, matrix);
    if (newFills.length > 0 || node.fills.length === 0) {
      try {
        node.fills = newFills;
      } catch (e) {
        // Ignora erros ao aplicar (ex: componentes instanciados sem override)
      }
    }
  }

  // Alterar strokes
  if ("strokes" in node && Array.isArray(node.strokes)) {
    const newStrokes = modifyPaints(node.strokes, matrix);
    if (newStrokes.length > 0 || node.strokes.length === 0) {
      try {
        node.strokes = newStrokes;
      } catch (e) {
        // Ignora erros
      }
    }
  }

  // Recursão para filhos (apenas se for container)
  if ("children" in node) {
    for (const child of node.children) {
      await processNodeColors(child, matrix);
    }
  }
}

// Função principal exportada
export async function simulateColorBlindness(types: string[]) {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    figma.notify("Por favor, selecione um frame para simular.", {
      error: true
    });
    return;
  }

  const selectedNode = selection[0];

  if (!("clone" in selectedNode)) {
    figma.notify("Nó selecionado não suporta cópia.", { error: true });
    return;
  }

  // Deslocamento para as cópias
  let offsetX = selectedNode.width + 100;

  const createdNodes: SceneNode[] = [];

  for (const type of types) {
    const clone = selectedNode.clone();

    // Nome do frame e posição
    clone.name = `${selectedNode.name} - ${TYPE_NAMES[type]}`;
    clone.x = selectedNode.x + offsetX;
    clone.y = selectedNode.y;

    if (selectedNode.parent) {
      selectedNode.parent.appendChild(clone);
    } else {
      figma.currentPage.appendChild(clone);
    }

    offsetX += clone.width + 100;

    if (type === "catarata" || type === "baixa_visao") {
      // Aplicar blur
      const blurRadius = type === "catarata" ? 4 : 8;
      const blurEffect = {
        type: "LAYER_BLUR" as const,
        radius: blurRadius,
        visible: true
      };

      if ("effects" in clone && Array.isArray(clone.effects)) {
        try {
          clone.effects = [...clone.effects, blurEffect];
        } catch (e) {
          console.error("Erro ao aplicar effects", e);
        }
      }

      // Adicionar overlay de redução de contraste (fill semitransparente)
      if ("fills" in clone && Array.isArray(clone.fills)) {
        const overlayColor = { r: 0.9, g: 0.9, b: 0.9 };
        const opacity = type === "catarata" ? 0.3 : 0.4;
        const overlay: SolidPaint = {
          type: "SOLID",
          color: overlayColor,
          opacity,
          blendMode: "NORMAL"
        };
        try {
          clone.fills = [...clone.fills, overlay];
        } catch (e) {
          console.error("Erro ao aplicar fills", e);
        }
      }
    } else {
      const matrix = COLOR_BLINDNESS_MATRICES[type];
      if (matrix) {
        await processNodeColors(clone, matrix);
      }
    }

    createdNodes.push(clone);
  }

  figma.notify(`Simulação criada para ${types.length} tipo(s).`);
  figma.currentPage.selection = [selectedNode, ...createdNodes];
  figma.viewport.scrollAndZoomIntoView([selectedNode, ...createdNodes]);
}
