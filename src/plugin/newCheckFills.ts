// Função auxiliar para verificar se uma cor está na biblioteca
function isColorInLibrary(color: any, library: any): boolean {
  if (!library || !library.fills) return false;

  return library.fills.some((style: any) => {
    if (!style || !style.paint) return false;

    if (style.paint.type === "SOLID" && style.paint.color) {
      return colorsMatch(color, style.paint.color);
    }

    return false;
  });
}

// Função auxiliar para comparar cores com tolerância
function colorsMatch(color1: any, color2: any): boolean {
  if (!color1 || !color2) return false;

  const tolerance = 0.01; // Tolerância de 1%

  return (
    Math.abs(color1.r - color2.r) < tolerance &&
    Math.abs(color1.g - color2.g) < tolerance &&
    Math.abs(color1.b - color2.b) < tolerance &&
    Math.abs((color1.a || 1) - (color2.a || 1)) < tolerance
  );
}

// Importar funções necessárias
import { convertColor } from "./lintingFunctions";

// Função auxiliar para verificar se um estilo de cor está na biblioteca ou nos tokens salvos
function isColorStyleInLibrary(
  styleId: string,
  preprocessedLibs: { fills: Set<string> },
  node?: any,
  savedTokens: any[] = []
): boolean {
  try {
    // Verifica se o estilo está nas bibliotecas carregadas
    if (preprocessedLibs?.fills?.has(styleId)) {
      return true;
    }

    // Se não encontrou nas bibliotecas, verifica nos tokens salvos
    if (node && savedTokens && savedTokens.length > 0) {
      try {
        // Obtém o estilo do nó para comparar com os tokens
        const style = figma.getStyleById(styleId) as PaintStyle | null;
        if (style) {
          // Verifica se o estilo corresponde a algum token salvo
          return savedTokens.some(token => {
            if (!token.value) return false;

            // Verifica se o token tem uma cor para comparar
            if (token.value.color) {
              // Se o nó tiver preenchimento, compara as cores
              if (node.fills && Array.isArray(node.fills)) {
                const nodeFill = node.fills[0];
                if (nodeFill && nodeFill.type === "SOLID") {
                  const tokenColor = token.value.color;
                  const nodeColor = nodeFill.color;

                  // Compara os componentes de cor (R, G, B) com uma pequena margem de erro
                  const colorMatch =
                    Math.abs(tokenColor.r - nodeColor.r) < 0.01 &&
                    Math.abs(tokenColor.g - nodeColor.g) < 0.01 &&
                    Math.abs(tokenColor.b - nodeColor.b) < 0.01;

                  // Se houver opacidade, compara também
                  if (tokenColor.a !== undefined && nodeColor.a !== undefined) {
                    return (
                      colorMatch && Math.abs(tokenColor.a - nodeColor.a) < 0.01
                    );
                  }

                  return colorMatch;
                }
              }
            }

            return false;
          });
        }
      } catch (error) {
        console.error(
          "[isColorStyleInLibrary] Erro ao verificar tokens salvos:",
          error
        );
      }
    }

    return false;
  } catch (error) {
    console.error("[isColorStyleInLibrary] Erro:", error);
    return false;
  }
}

// Função para verificar fills (cores)
export function newCheckFills(
  node: any,
  errors: any[],
  libraries: any[],
  savedTokens: any[] = []
) {
  try {
    if (!node) return;

    // Se nenhuma biblioteca foi selecionada, marcar como não validado e sair
    if (!libraries || libraries.length === 0) {
      errors.push({
        type: "fill-unvalidated",
        message:
          "Nenhuma biblioteca selecionada; preenchimentos não podem ser validados",
        nodeId: node.id,
        nodeName: node.name,
        suggestions: []
      });
      return;
    }

    // Verificar se tem estilo de fill definido
    if (node.fillStyleId && node.fillStyleId !== "") {
      // Verificar se o estilo está na biblioteca (se houver biblioteca)
      if (libraries && libraries.length > 0) {
        let styleFound = false;
        for (const library of libraries) {
          if (isColorStyleInLibrary(node.fillStyleId, library)) {
            styleFound = true;
            break;
          }
        }

        if (!styleFound) {
          errors.push({
            type: "fill-style-library",
            message: "Estilo de preenchimento não está na biblioteca",
            nodeId: node.id,
            nodeName: node.name,
            suggestions: []
          });
        }
      }
      return;
    }

    // Verificar fills diretos
    if (node.fills && Array.isArray(node.fills) && node.fills.length > 0) {
      for (const fill of node.fills) {
        if (fill.type === "SOLID" && fill.color) {
          const color = convertColor(fill.color);
          let colorFound = false;

          // Primeiro verifica nos tokens salvos
          if (savedTokens && savedTokens.length > 0) {
            for (const tokenLib of savedTokens) {
              if (tokenLib.tokens && tokenLib.tokens.fills) {
                const matchingToken = tokenLib.tokens.fills.find(
                  (token: any) => {
                    if (
                      token.paint &&
                      token.paint.type === "SOLID" &&
                      token.paint.color
                    ) {
                      return colorsMatch(color, token.paint.color);
                    }
                    return false;
                  }
                );

                if (matchingToken) {
                  colorFound = true;
                  break;
                }
              }
            }
          }

          // Se não encontrou nos tokens, verifica se é uma cor padrão problemática
          if (!colorFound) {
            if (colorsMatch(color, { r: 0, g: 0, b: 0, a: 1 })) {
              errors.push({
                type: "fill-color-default",
                message: "Preenchimento com cor preta padrão",
                nodeId: node.id,
                nodeName: node.name,
                suggestions: []
              });
            } else if (colorsMatch(color, { r: 1, g: 1, b: 1, a: 1 })) {
              errors.push({
                type: "fill-color-default",
                message: "Preenchimento com cor branca padrão",
                nodeId: node.id,
                nodeName: node.name,
                suggestions: []
              });
            } else {
              // Verificar se a cor está na biblioteca (se houver biblioteca)
              if (libraries && libraries.length > 0) {
                let libraryColorFound = false;
                for (const library of libraries) {
                  if (isColorInLibrary(color, library)) {
                    libraryColorFound = true;
                    break;
                  }
                }

                if (!libraryColorFound) {
                  errors.push({
                    type: "fill-color-library",
                    message: "Cor não está na biblioteca",
                    nodeId: node.id,
                    nodeName: node.name,
                    suggestions: []
                  });
                }
              }
            }
          }
        }
      }
    } else {
      // Node sem fill definido
      errors.push({
        type: "fill-missing",
        message: "Elemento sem preenchimento definido",
        nodeId: node.id,
        nodeName: node.name,
        suggestions: []
      });
    }
  } catch (error) {
    console.error("[newCheckFills] Erro:", error);
  }
}
