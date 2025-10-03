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
  if (!color1 || !color2) {
    console.log("[colorsMatch] DEBUG - Um dos valores é nulo:", {
      color1,
      color2
    });
    return false;
  }

  // Converte ambos para RGB se necessário
  const rgb1 = normalizeColorToRGB(color1);
  const rgb2 = normalizeColorToRGB(color2);

  if (!rgb1 || !rgb2) {
    console.log("[colorsMatch] DEBUG - Falha ao normalizar cores:", {
      color1,
      color2,
      rgb1,
      rgb2
    });
    return false;
  }

  const tolerance = 0.01; // Tolerância de 1%

  const match =
    Math.abs(rgb1.r - rgb2.r) < tolerance &&
    Math.abs(rgb1.g - rgb2.g) < tolerance &&
    Math.abs(rgb1.b - rgb2.b) < tolerance &&
    Math.abs((rgb1.a || 1) - (rgb2.a || 1)) < tolerance;

  console.log("[colorsMatch] DEBUG - Comparação:", {
    color1,
    color2,
    rgb1,
    rgb2,
    match,
    diffR: Math.abs(rgb1.r - rgb2.r),
    diffG: Math.abs(rgb1.g - rgb2.g),
    diffB: Math.abs(rgb1.b - rgb2.b),
    diffA: Math.abs((rgb1.a || 1) - (rgb2.a || 1))
  });

  return match;
}

// Função auxiliar para normalizar qualquer formato de cor para RGB
function normalizeColorToRGB(
  color: any
): { r: number; g: number; b: number; a?: number } | null {
  if (!color) return null;

  // Se já estiver no formato RGB, retorna diretamente
  if (color.r !== undefined && color.g !== undefined && color.b !== undefined) {
    return {
      r: color.r,
      g: color.g,
      b: color.b,
      a: color.a !== undefined ? color.a : 1
    };
  }

  // Se for uma string hexadecimal, converte para RGB
  if (typeof color === "string" && color.match(/^#[0-9A-Fa-f]{6,8}$/)) {
    return hexToRgb(color);
  }

  return null;
}

// Função auxiliar para converter hexadecimal para RGB
function hexToRgb(
  hex: string
): { r: number; g: number; b: number; a: number } | null {
  // Remove o # se presente
  hex = hex.replace("#", "");

  // Trata cores com e sem alpha
  let r,
    g,
    b,
    a = 1;

  if (hex.length === 6) {
    // Hex sem alpha (6 caracteres)
    r = parseInt(hex.substr(0, 2), 16);
    g = parseInt(hex.substr(2, 2), 16);
    b = parseInt(hex.substr(4, 2), 16);
  } else if (hex.length === 8) {
    // Hex com alpha (8 caracteres)
    r = parseInt(hex.substr(0, 2), 16);
    g = parseInt(hex.substr(2, 2), 16);
    b = parseInt(hex.substr(4, 2), 16);
    a = parseInt(hex.substr(6, 2), 16) / 255;
  } else {
    return null;
  }

  return {
    r: r / 255,
    g: g / 255,
    b: b / 255,
    a: a
  };
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
    // Verifica se o estilo está nas bibliotecas carregadas usando o preprocessedLibs
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

                  // Usa a nova função de comparação que normaliza formatos
                  return colorsMatch(tokenColor, nodeColor);
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
  preprocessedLibs: any,
  savedTokens: any[] = [],
  libraries: any[] = []
) {
  try {
    if (!node) return;

    console.log(
      "[newCheckFills] DEBUG - Iniciando verificação para nó:",
      node.name,
      node.id
    );
    console.log(
      "[newCheckFills] DEBUG - Tokens salvos recebidos:",
      savedTokens?.length || 0
    );
    console.log(
      "[newCheckFills] DEBUG - Estrutura dos tokens salvos:",
      savedTokens
    );
    console.log(
      "[newCheckFills] DEBUG - Bibliotecas preprocessadas:",
      preprocessedLibs
    );

    // Se nenhuma biblioteca foi selecionada, marcar como não validado e sair
    if (!preprocessedLibs || Object.keys(preprocessedLibs).length === 0) {
      console.log(
        "[newCheckFills] DEBUG - Nenhuma biblioteca preprocessada disponível"
      );
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

    console.log(
      "[newCheckFills] DEBUG - Nó tem fillStyleId:",
      node.fillStyleId
    );

    // Verificar se tem estilo de fill definido
    if (node.fillStyleId && node.fillStyleId !== "") {
      console.log(
        "[newCheckFills] DEBUG - Verificando estilo de fill:",
        node.fillStyleId
      );

      // Verificar se o estilo está na biblioteca usando preprocessedLibs
      const styleFound = isColorStyleInLibrary(
        node.fillStyleId,
        preprocessedLibs,
        node,
        savedTokens
      );

      console.log(
        "[newCheckFills] DEBUG - Estilo encontrado na biblioteca:",
        styleFound
      );

      if (!styleFound) {
        console.log(
          "[newCheckFills] DEBUG - Estilo NÃO encontrado - gerando erro"
        );

        // Obter o nome do estilo inválido para mostrar no erro
        let invalidStyleName = "Desconhecido";
        try {
          const invalidStyle = figma.getStyleById(node.fillStyleId);
          if (invalidStyle) {
            invalidStyleName = invalidStyle.name;
          }
        } catch (error) {
          console.error(
            "[newCheckFills] Erro ao obter nome do estilo inválido:",
            error
          );
        }

        errors.push({
          type: "fill-style-library",
          message: `Estilo de preenchimento "${invalidStyleName}" não está na biblioteca`,
          nodeId: node.id,
          nodeName: node.name,
          value: invalidStyleName,
          suggestions: []
        });
        // Se o estilo é inválido, ainda verificar as cores diretas
        return;
      }

      console.log(
        "[newCheckFills] DEBUG - Estilo encontrado - verificação passou"
      );
    } else {
      // Nó sem fillStyleId - verificar fills diretos
      console.log(
        "[newCheckFills] DEBUG - Nó sem fillStyleId, verificando fills diretos"
      );

      if (node.fills && Array.isArray(node.fills)) {
        console.log(
          "[newCheckFills] DEBUG - Nó tem fills diretos:",
          node.fills.length
        );

        for (const fill of node.fills) {
          if (fill.type === "SOLID" && fill.color) {
            console.log(
              "[newCheckFills] DEBUG - Verificando fill sólido:",
              fill.color
            );

            const color = convertColor(fill.color);
            let colorFound = false;

            console.log(
              "[newCheckFills] DEBUG - Verificando cor nos tokens salvos..."
            );

            // Primeiro verifica nos tokens salvos
            for (const tokenLib of savedTokens) {
              console.log(
                "[newCheckFills] DEBUG - Verificando biblioteca de tokens:",
                tokenLib.name
              );

              if (tokenLib.tokens && tokenLib.tokens.fills) {
                console.log(
                  "[newCheckFills] DEBUG - Tokens de fills encontrados:",
                  tokenLib.tokens.fills.length
                );

                const matchingToken = tokenLib.tokens.fills.find(
                  (token: any) => {
                    if (
                      token.paint &&
                      token.paint.type === "SOLID" &&
                      token.paint.color
                    ) {
                      const match = colorsMatch(color, token.paint.color);
                      console.log(
                        "[newCheckFills] DEBUG - Comparando cores:",
                        color,
                        "vs",
                        token.paint.color,
                        "Match:",
                        match
                      );
                      return match;
                    }
                    return false;
                  }
                );

                if (matchingToken) {
                  console.log(
                    "[newCheckFills] DEBUG - Cor encontrada nos tokens salvos!"
                  );
                  colorFound = true;
                  break;
                }
              }
            }

            // Se não encontrou nos tokens, verifica se é uma cor padrão problemática
            if (!colorFound) {
              if (colorsMatch(color, { r: 0, g: 0, b: 0, a: 1 })) {
                console.log(
                  "[newCheckFills] DEBUG - Cor preta padrão detectada"
                );
                errors.push({
                  type: "fill-color-default",
                  message: "Preenchimento com cor preta padrão",
                  nodeId: node.id,
                  nodeName: node.name,
                  suggestions: []
                });
              } else if (colorsMatch(color, { r: 1, g: 1, b: 1, a: 1 })) {
                console.log(
                  "[newCheckFills] DEBUG - Cor branca padrão detectada"
                );
                errors.push({
                  type: "fill-color-default",
                  message: "Preenchimento com cor branca padrão",
                  nodeId: node.id,
                  nodeName: node.name,
                  suggestions: []
                });
              } else {
                console.log(
                  "[newCheckFills] DEBUG - Cor não encontrada em lugar nenhum"
                );
                // Verificar se a cor está na biblioteca (se houver biblioteca)
                if (
                  preprocessedLibs &&
                  Object.keys(preprocessedLibs).length > 0
                ) {
                  let libraryColorFound = false;
                  for (const library of libraries) {
                    if (isColorInLibrary(color, library)) {
                      libraryColorFound = true;
                      break;
                    }
                  }

                  if (!libraryColorFound) {
                    // Obter representação hexadecimal da cor inválida
                    const hexColor = convertColor(fill.color);

                    errors.push({
                      type: "fill-color-library",
                      message: `Cor "${hexColor}" não está na biblioteca`,
                      nodeId: node.id,
                      nodeName: node.name,
                      value: hexColor,
                      suggestions: []
                    });
                  }
                }
              }
            }
          }
        }
      } else if (!node.fillStyleId || node.fillStyleId === "") {
        // Node sem fill definido
        errors.push({
          type: "fill-missing",
          message: "Elemento sem preenchimento definido",
          nodeId: node.id,
          nodeName: node.name,
          suggestions: []
        });
      }
    }
  } catch (error) {
    console.error("[newCheckFills] Erro:", error);
  }
}
