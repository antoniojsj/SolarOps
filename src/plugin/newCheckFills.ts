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
