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

// Função para verificar se uma cor está na biblioteca
function isColorInLibrary(color: any, library: any): boolean {
  try {
    if (!library || !library.fills || !Array.isArray(library.fills)) {
      return false;
    }

    for (const fillStyle of library.fills) {
      // Verificar se tem paint com cor sólida
      if (
        fillStyle.paint &&
        fillStyle.paint.type === "SOLID" &&
        fillStyle.paint.color
      ) {
        if (colorsMatch(color, fillStyle.paint.color)) {
          return true;
        }
      }
      // Verificar se tem value (estrutura alternativa)
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

// Função para verificar se um estilo de texto está na biblioteca
function isTextStyleInLibrary(styleId: string, library: any): boolean {
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
  // usedRemoteStyles?: any,
  // storageArray?: any
) {
  try {
    if (!node || !node.type) return;

    if (node.type === "TEXT") {
      // Se nenhuma biblioteca foi selecionada, marcar como não validado e sair
      if (!libraries || libraries.length === 0) {
        errors.push({
          type: "text-unvalidated",
          message:
            "Nenhuma biblioteca selecionada; textos não podem ser validados",
          nodeId: node.id,
          nodeName: node.name,
          suggestions: []
        });
        return;
      }
      // Verificar se o texto tem estilo definido
      if (!node.textStyleId || node.textStyleId === "") {
        errors.push({
          type: "text-style",
          message: "Texto sem estilo definido",
          nodeId: node.id,
          nodeName: node.name,
          suggestions: []
        });
        return;
      }

      let styleFound = false;

      // Primeiro verifica nos tokens salvos
      if (savedTokens && savedTokens.length > 0) {
        for (const tokenLib of savedTokens) {
          if (tokenLib.tokens && tokenLib.tokens.typography) {
            const matchingToken = tokenLib.tokens.typography.find(
              (token: any) => {
                // Verifica se o token tem um ID de estilo que corresponde ao do node
                return token.styleId === node.textStyleId;
              }
            );

            if (matchingToken) {
              styleFound = true;
              break;
            }
          }
        }
      }

      // Se não encontrou nos tokens, verifica nas bibliotecas
      if (!styleFound && libraries && libraries.length > 0) {
        for (const library of libraries) {
          if (isTextStyleInLibrary(node.textStyleId, library)) {
            styleFound = true;
            break;
          }
        }

        if (!styleFound) {
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
        message:
          "Nenhuma biblioteca selecionada; strokes não podem ser validados",
        nodeId: node.id,
        nodeName: node.name,
        suggestions: []
      });
      return;
    }

    // Verificar se tem estilo de stroke definido
    if (node.strokeStyleId && node.strokeStyleId !== "") {
      // Verificar se o estilo está na biblioteca (se houver biblioteca)
      if (libraries && libraries.length > 0) {
        let styleFound = false;
        for (const library of libraries) {
          if (isColorStyleInLibrary(node.strokeStyleId, library)) {
            styleFound = true;
            break;
          }
        }

        if (!styleFound) {
          console.log(
            "[Lint] Erro: Estilo de stroke não encontrado na biblioteca em",
            node.name
          );
          errors.push({
            type: "stroke-style-library",
            message: "Estilo de stroke não está na biblioteca",
            nodeId: node.id,
            nodeName: node.name,
            suggestions: []
          });
        }
      }
      return;
    }

    // Verificar strokes diretos
    if (
      node.strokes &&
      Array.isArray(node.strokes) &&
      node.strokes.length > 0
    ) {
      for (const stroke of node.strokes) {
        if (stroke.type === "SOLID" && stroke.color) {
          const color = convertColor(stroke.color);

          // Verificar se é uma cor padrão problemática
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
            // Verificar se a cor está na biblioteca (se houver biblioteca)
            if (libraries && libraries.length > 0) {
              let colorFound = false;
              for (const library of libraries) {
                if (isColorInLibrary(color, library)) {
                  colorFound = true;
                  break;
                }
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
