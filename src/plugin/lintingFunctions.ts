// Utility functions for color conversion.
export function convertColor(color: any) {
  try {
    if (!color || typeof color !== "object") {
      return { r: 0, g: 0, b: 0, a: 1 };
    }

    // Se o color já tem as propriedades r, g, b, a, retorna diretamente
    if (
      color.r !== undefined &&
      color.g !== undefined &&
      color.b !== undefined
    ) {
      return {
        r: color.r,
        g: color.g,
        b: color.b,
        a: color.a !== undefined ? color.a : 1
      };
    }

    // Caso contrário, retorna um valor padrão
    return { r: 0, g: 0, b: 0, a: 1 };
  } catch (error) {
    console.error("[convertColor] Erro:", error);
    return { r: 0, g: 0, b: 0, a: 1 };
  }
}

// Função para comparar cores
function colorsMatch(
  color1: any,
  color2: any,
  tolerance: number = 0.01
): boolean {
  try {
    const c1 = convertColor(color1);
    const c2 = convertColor(color2);

    return (
      Math.abs(c1.r - c2.r) <= tolerance &&
      Math.abs(c1.g - c2.g) <= tolerance &&
      Math.abs(c1.b - c2.b) <= tolerance &&
      Math.abs(c1.a - c2.a) <= tolerance
    );
  } catch (error) {
    return false;
  }
}

// Função para verificar se uma cor corresponde a um token salvo
function isColorInTokens(color: any, tokens: any[]): boolean {
  if (!tokens || !Array.isArray(tokens)) return false;

  try {
    const targetColor = convertColor(color);

    return tokens.some(token => {
      if (!token.value) return false;

      // Handle different token value formats
      let tokenColor;
      if (typeof token.value === "string") {
        // Handle hex colors
        if (token.value.startsWith("#")) {
          const hex = token.value.replace("#", "");
          const r = parseInt(hex.substring(0, 2), 16) / 255;
          const g = parseInt(hex.substring(2, 4), 16) / 255;
          const b = parseInt(hex.substring(4, 6), 16) / 255;
          const a =
            hex.length > 6 ? parseInt(hex.substring(6, 8), 16) / 255 : 1;
          tokenColor = { r, g, b, a };
        }
      } else if (token.value.r !== undefined) {
        // Handle RGB/RGBA objects
        tokenColor = {
          r: token.value.r / 255,
          g: token.value.g / 255,
          b: token.value.b / 255,
          a: token.value.a !== undefined ? token.value.a : 1
        };
      }

      return tokenColor ? colorsMatch(targetColor, tokenColor) : false;
    });
  } catch (error) {
    console.error("[isColorInTokens] Erro:", error);
    return false;
  }
}

// Função para verificar se uma cor está na biblioteca ou nos tokens salvos
function isColorInLibrary(
  color: any,
  library: any,
  savedTokens: any[] = []
): boolean {
  // Primeiro verifica nos tokens salvos
  if (isColorInTokens(color, savedTokens)) {
    return true;
  }

  // Depois verifica na biblioteca
  try {
    if (!library || !library.fills || !Array.isArray(library.fills)) {
      return false;
    }

    for (const fillStyle of library.fills) {
      if (
        fillStyle.paint &&
        fillStyle.paint.type === "SOLID" &&
        fillStyle.paint.color
      ) {
        if (colorsMatch(color, fillStyle.paint.color)) {
          return true;
        }
      }
      if (fillStyle.value && fillStyle.value.r !== undefined) {
        if (colorsMatch(color, fillStyle.value)) {
          return true;
        }
      }
    }
    return false;
  } catch (error) {
    console.error("[isColorInLibrary] Erro:", error);
    return false;
  }
}

// Função para verificar se um estilo de texto corresponde a um token salvo
function isTextStyleInTokens(node: any, tokens: any[]): boolean {
  if (!tokens || !Array.isArray(tokens)) return false;

  try {
    const nodeFontName = node.fontName;
    const nodeFontSize = node.fontSize;
    const nodeLineHeight = node.lineHeight;
    const nodeLetterSpacing = node.letterSpacing;

    return tokens.some(token => {
      if (!token.value) return false;

      // Verifica correspondência de fonte
      if (token.value.fontFamily && nodeFontName) {
        const tokenFontFamily = token.value.fontFamily.toLowerCase();
        const nodeFontFamily = (typeof nodeFontName === "string"
          ? nodeFontName
          : nodeFontName.family
        ).toLowerCase();
        if (tokenFontFamily !== nodeFontFamily) return false;
      }

      // Verifica tamanho da fonte
      if (token.value.fontSize && nodeFontSize) {
        if (
          Math.abs(Number(token.value.fontSize) - Number(nodeFontSize)) > 0.1
        ) {
          return false;
        }
      }

      // Verifica altura da linha
      if (token.value.lineHeight && nodeLineHeight) {
        const tokenLineHeight = token.value.lineHeight;
        if (
          tokenLineHeight.unit === "PIXELS" &&
          nodeLineHeight.unit === "PIXELS"
        ) {
          if (
            Math.abs(
              Number(tokenLineHeight.value) - Number(nodeLineHeight.value)
            ) > 0.1
          ) {
            return false;
          }
        }
        // Adicionar outras unidades conforme necessário
      }

      // Verifica espaçamento entre letras
      if (token.value.letterSpacing && nodeLetterSpacing) {
        const tokenLetterSpacing = token.value.letterSpacing;
        if (
          tokenLetterSpacing.unit === "PIXELS" &&
          nodeLetterSpacing.unit === "PIXELS"
        ) {
          if (
            Math.abs(
              Number(tokenLetterSpacing.value) - Number(nodeLetterSpacing.value)
            ) > 0.1
          ) {
            return false;
          }
        }
      }

      return true;
    });
  } catch (error) {
    console.error("[isTextStyleInTokens] Erro:", error);
    return false;
  }
}

// Função para verificar se um estilo de texto está na biblioteca ou nos tokens salvos
function isTextStyleInLibrary(
  styleId: string,
  library: any,
  savedTokens: any[] = []
): boolean {
  // Primeiro verifica nos tokens salvos
  if (isTextStyleInTokens(styleId, savedTokens)) {
    return true;
  }

  // Depois verifica na biblioteca
  try {
    if (!library || !library.text || !Array.isArray(library.text)) {
      return false;
    }

    return library.text.some((textStyle: any) => textStyle.id === styleId);
  } catch (error) {
    console.error("[isTextStyleInLibrary] Erro:", error);
    return false;
  }
}

// Função para verificar se um estilo de efeito está na biblioteca
function isEffectStyleInLibrary(styleId: string, library: any): boolean {
  try {
    if (!library || !library.effects || !Array.isArray(library.effects)) {
      return false;
    }

    return library.effects.some(
      (effectStyle: any) => effectStyle.id === styleId
    );
  } catch (error) {
    console.error("[isEffectStyleInLibrary] Erro:", error);
    return false;
  }
}

// Função auxiliar para verificar se um efeito específico está na biblioteca
function isEffectInLibrary(effect: any, library: any): boolean {
  try {
    if (!library || !library.effects || !Array.isArray(library.effects)) {
      return false;
    }

    return library.effects.some((effectStyle: any) => {
      if (effectStyle.effect && effectStyle.effect.type === effect.type) {
        // Compara propriedades básicas do efeito
        const sameColor =
          !effect.color ||
          (effectStyle.effect.color &&
            colorsMatch(effect.color, effectStyle.effect.color));
        const sameOffset =
          !effect.offset ||
          (effectStyle.effect.offset &&
            effect.offset.x === effectStyle.effect.offset.x &&
            effect.offset.y === effectStyle.effect.offset.y);
        const sameRadius =
          !effect.radius || effectStyle.effect.radius === effect.radius;

        return sameColor && sameOffset && sameRadius;
      }
      return false;
    });
  } catch (error) {
    console.error("[isEffectInLibrary] Erro:", error);
    return false;
  }
}

// Função para verificar tipos de texto
export function checkType(
  node: any,
  errors: any[],
  libraries: any[],
  savedTokens: any[] = []
) {
  try {
    if (!node) return;

    // Verifica se o nó tem um estilo de texto
    if (node.textStyleId && typeof node.textStyleId === "string") {
      let isStyleValid = false;
      let tokenLib = null;

      // Verificar se o texto tem estilo definido
      if (node.textStyleId === "") {
        errors.push({
          type: "text-style",
          message: "Texto sem estilo definido",
          nodeId: node.id,
          nodeName: node.name,
          suggestions: []
        });
        return;
      }

      // Primeiro verifica nos tokens salvos
      if (
        savedTokens &&
        savedTokens.length > 0 &&
        isTextStyleInTokens(node, savedTokens)
      ) {
        isStyleValid = true;
      }
      // Se não encontrou nos tokens, verifica nas bibliotecas
      else if (libraries && libraries.length > 0) {
        isStyleValid = libraries.some(library =>
          isTextStyleInLibrary(node.textStyleId, library, savedTokens)
        );

        if (!isStyleValid) {
          errors.push({
            type: "text-style-library",
            message:
              "Estilo de texto não está na biblioteca nem nos tokens salvos",
            nodeId: node.id,
            nodeName: node.name,
            suggestions: []
          });
        }
      }

      // Verificar propriedades de texto
      if (node.fontSize && typeof node.fontSize === "number") {
        // Verificar se o tamanho da fonte é um valor padrão problemático
        if (node.fontSize === 12 || node.fontSize === 14) {
          errors.push({
            type: "text-font-size",
            message: `Tamanho de fonte padrão (${node.fontSize}px)`,
            nodeId: node.id,
            nodeName: node.name,
            suggestions: []
          });
        }
      }
    }
  } catch (error) {
    console.error("[checkType] Erro:", error);
  }
}

// Função para verificar fills (cores)
export function newCheckFills(
  node: any,
  errors: any[],
  libraries: any[],
  savedTokens: any[] = []
  // usedRemoteStyles?: any,
  // storageArray?: any,
  // ignoredErrorArray?: any
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
          if (
            savedTokens &&
            savedTokens.length > 0 &&
            isColorInTokens(color, savedTokens)
          ) {
            colorFound = true;
          }
          // Se não encontrou nos tokens, verifica nas bibliotecas
          else if (libraries && libraries.length > 0) {
            colorFound = libraries.some(library =>
              isColorInLibrary(color, library, savedTokens)
            );
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

// Função auxiliar para verificar se um estilo de cor está na biblioteca
function isColorStyleInLibrary(styleId: string, library: any): boolean {
  try {
    if (!library || !library.fills || !Array.isArray(library.fills)) {
      return false;
    }

    return library.fills.some((fillStyle: any) => fillStyle.id === styleId);
  } catch (error) {
    console.error("[isColorStyleInLibrary] Erro:", error);
    return false;
  }
}

// Função para verificar effects
export function newCheckEffects(
  node: any,
  errors: any[],
  libraries: any[],
  savedTokens: any[] = []
  // usedRemoteStyles?: any,
  // storageArray?: any
) {
  try {
    if (!node) return;

    // Se nenhuma biblioteca foi selecionada, marcar como não validado e sair
    if (!libraries || libraries.length === 0) {
      errors.push({
        type: "effect-unvalidated",
        message:
          "Nenhuma biblioteca selecionada; efeitos não podem ser validados",
        nodeId: node.id,
        nodeName: node.name,
        suggestions: []
      });
      return;
    }

    // Verificar se tem estilo de efeito definido
    if (node.effectStyleId && node.effectStyleId !== "") {
      // Verificar se o estilo está na biblioteca (se houver biblioteca)
      if (libraries && libraries.length > 0) {
        let styleFound = false;
        for (const library of libraries) {
          if (isEffectStyleInLibrary(node.effectStyleId, library)) {
            styleFound = true;
            break;
          }
        }

        if (!styleFound) {
          console.log(
            "[Lint] Erro: Estilo de efeito não encontrado na biblioteca em",
            node.name
          );
          errors.push({
            type: "effect-style-library",
            message: "Estilo de efeito não está na biblioteca",
            nodeId: node.id,
            nodeName: node.name,
            suggestions: []
          });
        }
      }
      return;
    }

    // Verificar effects diretos
    if (
      node.effects &&
      Array.isArray(node.effects) &&
      node.effects.length > 0
    ) {
      for (const effect of node.effects) {
        if (effect.type === "DROP_SHADOW" || effect.type === "INNER_SHADOW") {
          let effectFound = false;

          // Primeiro verifica nos tokens salvos
          if (savedTokens && savedTokens.length > 0) {
            for (const tokenLib of savedTokens) {
              if (tokenLib.tokens && tokenLib.tokens.effects) {
                const matchingToken = tokenLib.tokens.effects.find(
                  (token: any) => {
                    if (token.effect && token.effect.type === effect.type) {
                      // Compara propriedades básicas do efeito
                      const sameColor =
                        !effect.color ||
                        (token.effect.color &&
                          colorsMatch(effect.color, token.effect.color));
                      const sameOffset =
                        !effect.offset ||
                        (token.effect.offset &&
                          effect.offset.x === token.effect.offset.x &&
                          effect.offset.y === token.effect.offset.y);
                      const sameRadius =
                        !effect.radius || token.effect.radius === effect.radius;

                      return sameColor && sameOffset && sameRadius;
                    }
                    return false;
                  }
                );

                if (matchingToken) {
                  effectFound = true;
                  break;
                }
              }
            }
          }

          // Se não encontrou nos tokens, verifica se tem valores problemáticos
          if (!effectFound) {
            // Verificar se o efeito tem offset zero
            if (
              effect.offset &&
              effect.offset.x === 0 &&
              effect.offset.y === 0
            ) {
              errors.push({
                type: "effect-offset",
                message: "Efeito com offset zero",
                nodeId: node.id,
                nodeName: node.name,
                suggestions: []
              });
            }

            // Verificar se o efeito está na biblioteca (se houver biblioteca)
            if (libraries && libraries.length > 0) {
              let libraryEffectFound = false;
              for (const library of libraries) {
                if (isEffectInLibrary(effect, library)) {
                  libraryEffectFound = true;
                  break;
                }
              }

              if (!libraryEffectFound) {
                errors.push({
                  type: "effect-library",
                  message: `Efeito ${effect.type.toLowerCase()} não está na biblioteca`,
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
  } catch (error) {
    console.error("[newCheckEffects] Erro:", error);
  }
}

// Função para verificar strokes
export function newCheckStrokes(
  node: any,
  errors: any[],
  libraries: any[],
  savedTokens: any[] = []
  // usedRemoteStyles?: any,
  // storageArray?: any
) {
  try {
    if (!node) return;

    // Se nenhuma biblioteca foi selecionada, marcar como não validado e sair
    if (!libraries || libraries.length === 0) {
      errors.push({
        type: "stroke-unvalidated",
        message: "Nenhuma biblioteca selecionada para validação de strokes",
        nodeId: node.id,
        nodeName: node.name,
        suggestions: []
      });
      return;
    }

    // Verificar se o node tem strokes
    if (node.strokes && node.strokes.length > 0) {
      // Verificar cada stroke
      for (const stroke of node.strokes) {
        if (stroke.visible !== false) {
          // Se o stroke estiver visível
          // Verificar se o stroke tem uma cor
          if (stroke.color) {
            if (stroke.type === "SOLID") {
              const color = convertColor(stroke.color);

              // Primeiro verifica se é uma cor padrão problemática
              if (colorsMatch(color, { r: 0, g: 0, b: 0, a: 1 })) {
                console.log(
                  "[Lint] Erro: Stroke com cor preta padrão em",
                  node.name
                );
                errors.push({
                  type: "stroke-color-default",
                  message: "Stroke com cor preta padrão",
                  nodeId: node.id,
                  nodeName: node.name,
                  suggestions: []
                });
              } else {
                // Verificar se a cor está nos tokens salvos ou na biblioteca
                let colorFound = false;

                // Primeiro verifica nos tokens salvos
                if (
                  savedTokens &&
                  savedTokens.length > 0 &&
                  isColorInTokens(color, savedTokens)
                ) {
                  colorFound = true;
                }
                // Se não encontrou nos tokens, verifica nas bibliotecas
                else if (libraries && libraries.length > 0) {
                  colorFound = libraries.some(library =>
                    isColorInLibrary(color, library, savedTokens)
                  );
                }

                if (!colorFound) {
                  console.log(
                    "[Lint] Erro: Cor de stroke não encontrada na biblioteca em",
                    node.name
                  );
                  errors.push({
                    type: "stroke-color-library",
                    message: "Cor do stroke não está na biblioteca",
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
    }
  } catch (error) {
    console.error("[newCheckStrokes] Erro:", error);
  }
}

// Função para verificar radius
export function checkRadius(node: any, errors: any[], savedTokens: any[] = []) {
  try {
    if (!node) return;

    // Verificar se o node tem cornerRadius
    if (node.cornerRadius !== undefined) {
      const radius = node.cornerRadius;
      let radiusFoundInTokens = false;

      // Primeiro verifica nos tokens salvos
      if (savedTokens && savedTokens.length > 0 && typeof radius === "number") {
        for (const tokenLib of savedTokens) {
          if (tokenLib.tokens && tokenLib.tokens.radius) {
            const matchingToken = tokenLib.tokens.radius.find((token: any) => {
              // Verifica se o token tem um valor que corresponde ao raio do node
              return token.value === radius;
            });

            if (matchingToken) {
              radiusFoundInTokens = true;
              break;
            }
          }
        }
      }

      // Se não encontrou nos tokens, faz as verificações padrão
      if (!radiusFoundInTokens) {
        if (typeof radius === "number") {
          if (radius < 0) {
            errors.push({
              type: "corner-radius-negative",
              message: "Corner radius negativo",
              nodeId: node.id,
              nodeName: node.name,
              suggestions: []
            });
          } else if (radius > 100) {
            errors.push({
              type: "corner-radius-high",
              message: "Corner radius muito alto",
              nodeId: node.id,
              nodeName: node.name,
              suggestions: []
            });
          }
        } else {
          errors.push({
            type: "corner-radius-invalid",
            message: "Corner radius inválido",
            nodeId: node.id,
            nodeName: node.name,
            suggestions: []
          });
        }
      }
    }

    // Verificar cornerRadius individual
    if (
      node.topLeftRadius !== undefined ||
      node.topRightRadius !== undefined ||
      node.bottomLeftRadius !== undefined ||
      node.bottomRightRadius !== undefined
    ) {
      const radii = [
        { value: node.topLeftRadius, corner: "topLeft" },
        { value: node.topRightRadius, corner: "topRight" },
        { value: node.bottomLeftRadius, corner: "bottomLeft" },
        { value: node.bottomRightRadius, corner: "bottomRight" }
      ];

      for (const { value: radius, corner } of radii) {
        if (radius !== undefined) {
          let radiusFoundInTokens = false;

          // Primeiro verifica nos tokens salvos
          if (
            savedTokens &&
            savedTokens.length > 0 &&
            typeof radius === "number"
          ) {
            for (const tokenLib of savedTokens) {
              if (tokenLib.tokens && tokenLib.tokens.radius) {
                const matchingToken = tokenLib.tokens.radius.find(
                  (token: any) => {
                    // Verifica se o token tem um valor que corresponde ao raio do node
                    return (
                      token.value === radius &&
                      (!token.corner ||
                        token.corner === corner ||
                        token.corner === "all")
                    );
                  }
                );

                if (matchingToken) {
                  radiusFoundInTokens = true;
                  break;
                }
              }
            }
          }

          // Se não encontrou nos tokens, faz as verificações padrão
          if (!radiusFoundInTokens) {
            if (typeof radius !== "number" || radius < 0) {
              console.log(
                `[Lint] Erro: Corner radius ${corner} inválido em`,
                node.name
              );
              errors.push({
                type: "corner-radius-individual",
                message: `Corner radius ${corner} inválido`,
                nodeId: node.id,
                nodeName: node.name,
                suggestions: []
              });
              break;
            } else if (radius > 100) {
              console.log(
                `[Lint] Aviso: Corner radius ${corner} muito alto em`,
                node.name
              );
              errors.push({
                type: "corner-radius-individual-high",
                message: `Corner radius ${corner} muito alto`,
                nodeId: node.id,
                nodeName: node.name,
                suggestions: []
              });
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("[checkRadius] Erro:", error);
  }
}
