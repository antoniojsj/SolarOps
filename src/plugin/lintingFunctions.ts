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

function getRgbaString(color: RGB | RGBA, opacity?: number): string {
  const r = Math.round((color.r || 0) * 255);
  const g = Math.round((color.g || 0) * 255);
  const b = Math.round((color.b || 0) * 255);
  // Verifica se 'a' existe no tipo, já que RGB não tem 'a'
  const a = opacity !== undefined ? opacity : "a" in color ? color.a : 1;
  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
}

// Função para converter uma cor para formato hexadecimal (HEX)
export function getHexString(color: RGB | RGBA, opacity?: number): string {
  const r = Math.round((color.r || 0) * 255);
  const g = Math.round((color.g || 0) * 255);
  const b = Math.round((color.b || 0) * 255);
  // Verifica se 'a' existe no tipo, já que RGB não tem 'a'
  const a = opacity !== undefined ? opacity : "a" in color ? color.a : 1;
  const alpha = Math.round(a * 255);

  const toHex = (c: number) =>
    Math.max(0, Math.min(255, c))
      .toString(16)
      .padStart(2, "0");

  const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;

  if (alpha < 255) {
    return `${hex}${toHex(alpha)}`.toUpperCase();
  }

  return hex.toUpperCase();
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
  preprocessedLibs: { text: Set<string> },
  node?: any,
  savedTokens: any[] = []
): boolean {
  try {
    console.log(`[isTextStyleInLibrary] Verificando estilo ${styleId}`);
    console.log(
      `[isTextStyleInLibrary] Bibliotecas preprocessadas:`,
      preprocessedLibs?.text?.size || 0
    );
    console.log(
      `[isTextStyleInLibrary] Tokens salvos:`,
      savedTokens?.length || 0
    );

    // Verifica se o estilo está nas bibliotecas carregadas
    if (preprocessedLibs?.text?.has(styleId)) {
      console.log(
        `[isTextStyleInLibrary] ✓ Estilo encontrado nas bibliotecas preprocessadas`
      );
      return true;
    }

    // Verifica também apenas a parte do ID sem o sufixo (formato S:hash,nodeId)
    const baseStyleId = styleId.split(",")[0];
    if (baseStyleId !== styleId && preprocessedLibs?.text?.has(baseStyleId)) {
      console.log(
        `[isTextStyleInLibrary] ✓ Estilo base encontrado nas bibliotecas preprocessadas: ${baseStyleId}`
      );
      return true;
    }

    // Se não encontrou nas bibliotecas, verifica nos tokens salvos
    if (savedTokens && savedTokens.length > 0) {
      try {
        // Obtém o estilo do Figma para comparar com os tokens
        const style = figma.getStyleById(styleId) as TextStyle | null;
        if (style) {
          console.log(
            `[isTextStyleInLibrary] Estilo do Figma encontrado: ${style.name}`
          );

          // Verifica se o estilo corresponde a algum token salvo
          const tokenMatch = savedTokens.some(tokenLib => {
            console.log(
              `[isTextStyleInLibrary] Verificando biblioteca de tokens:`,
              tokenLib.name
            );

            // Verificação simples por ID, key e nome primeiro
            if (tokenLib.tokens?.text) {
              const simpleMatch = tokenLib.tokens.text.some((token: any) => {
                // Verificação por ID
                if (token.id && token.id === styleId) {
                  console.log(
                    `[isTextStyleInLibrary] ✓ Correspondência por ID: ${token.id}`
                  );
                  return true;
                }

                // Verificação por key
                if (token.key && style.key && token.key === style.key) {
                  console.log(
                    `[isTextStyleInLibrary] ✓ Correspondência por key: ${token.key}`
                  );
                  return true;
                }

                // Verificação por nome
                if (token.name && style.name && token.name === style.name) {
                  console.log(
                    `[isTextStyleInLibrary] ✓ Correspondência por nome: ${token.name}`
                  );
                  return true;
                }

                return false;
              });

              if (simpleMatch) return true;
            }

            // Verifica nos tokens achatados
            if (tokenLib.flattenedTokens) {
              const flatMatch = tokenLib.flattenedTokens
                .filter((token: any) => token.category === "text")
                .some((token: any) => {
                  // Verificação por ID
                  if (token.id && token.id === styleId) {
                    console.log(
                      `[isTextStyleInLibrary] ✓ Correspondência por ID (flat): ${token.id}`
                    );
                    return true;
                  }

                  // Verificação por key
                  if (token.key && style.key && token.key === style.key) {
                    console.log(
                      `[isTextStyleInLibrary] ✓ Correspondência por key (flat): ${token.key}`
                    );
                    return true;
                  }

                  // Verificação por nome
                  if (token.name && style.name && token.name === style.name) {
                    console.log(
                      `[isTextStyleInLibrary] ✓ Correspondência por nome (flat): ${token.name}`
                    );
                    return true;
                  }

                  return false;
                });

              if (flatMatch) return true;
            }

            // Fallback: verificação detalhada por propriedades (mantém compatibilidade)
            if (tokenLib.tokens?.text) {
              const styleProperties = {
                fontName: style.fontName,
                fontSize: style.fontSize,
                lineHeight: style.lineHeight,
                letterSpacing: style.letterSpacing,
                textCase: style.textCase,
                textDecoration: style.textDecoration,
                paragraphIndent: style.paragraphIndent,
                paragraphSpacing: style.paragraphSpacing
              };

              return tokenLib.tokens.text.some((token: any) => {
                if (!token || !token.value) {
                  return false;
                }

                // Verifica correspondência de fonte
                if (token.value.fontFamily) {
                  const tokenFontFamily = token.value.fontFamily
                    .toLowerCase()
                    .trim();
                  const styleFontFamily = styleProperties.fontName.family
                    .toLowerCase()
                    .trim();

                  if (tokenFontFamily !== styleFontFamily) {
                    return false;
                  }

                  // Verifica peso da fonte se disponível
                  if (
                    token.value.fontWeight &&
                    styleProperties.fontName.style
                  ) {
                    const tokenWeight = token.value.fontWeight
                      .toString()
                      .toLowerCase()
                      .replace(/\s/g, "");
                    const styleWeight = styleProperties.fontName.style
                      .toLowerCase()
                      .replace(/\s/g, "");

                    if (tokenWeight !== styleWeight) {
                      return false;
                    }
                  }
                }

                // Verifica tamanho da fonte
                if (token.value.fontSize && styleProperties.fontSize) {
                  const tokenSize = parseFloat(token.value.fontSize);
                  const styleSize = parseFloat(
                    styleProperties.fontSize.toString()
                  );

                  if (
                    isNaN(tokenSize) ||
                    isNaN(styleSize) ||
                    Math.abs(tokenSize - styleSize) > 0.1
                  ) {
                    return false;
                  }
                }

                // Verifica altura da linha
                if (token.value.lineHeight && styleProperties.lineHeight) {
                  const tokenLineHeight = token.value.lineHeight;
                  const styleLineHeight = styleProperties.lineHeight;

                  // Função para normalizar valores de line height
                  const normalizeLineHeight = (lh: any) => {
                    if (!lh) return null;
                    if (typeof lh === "number") {
                      return { unit: "PIXELS", value: lh };
                    }
                    if (typeof lh === "string") {
                      if (lh.endsWith("%")) {
                        return {
                          unit: "PERCENT",
                          value: parseFloat(lh) || 0
                        };
                      }
                      return {
                        unit: "PIXELS",
                        value: parseFloat(lh) || 0
                      };
                    }
                    if (lh.unit && lh.value !== undefined) {
                      return {
                        unit: lh.unit.toUpperCase(),
                        value:
                          typeof lh.value === "number"
                            ? lh.value
                            : parseFloat(lh.value) || 0
                      };
                    }
                    return null;
                  };

                  const normalizedTokenLH = normalizeLineHeight(
                    tokenLineHeight
                  );
                  const normalizedStyleLH = normalizeLineHeight(
                    styleLineHeight
                  );

                  if (!normalizedTokenLH || !normalizedStyleLH) {
                    return false;
                  }

                  if (normalizedTokenLH.unit !== normalizedStyleLH.unit) {
                    return false;
                  }

                  if (
                    Math.abs(
                      normalizedTokenLH.value - normalizedStyleLH.value
                    ) > 0.1
                  ) {
                    return false;
                  }
                }

                // Verifica espaçamento entre letras
                if (
                  token.value.letterSpacing &&
                  styleProperties.letterSpacing
                ) {
                  const tokenLetterSpacing = token.value.letterSpacing;
                  const styleLetterSpacing = styleProperties.letterSpacing;

                  const normalizeLetterSpacing = (ls: any) => {
                    if (ls === undefined || ls === null) return null;
                    if (typeof ls === "number") {
                      return { unit: "PIXELS", value: ls };
                    }
                    if (typeof ls === "string") {
                      if (ls.endsWith("%")) {
                        return {
                          unit: "PERCENT",
                          value: parseFloat(ls) || 0
                        };
                      }
                      return {
                        unit: "PIXELS",
                        value: parseFloat(ls) || 0
                      };
                    }
                    if (ls.unit && ls.value !== undefined) {
                      return {
                        unit: ls.unit.toUpperCase(),
                        value:
                          typeof ls.value === "number"
                            ? ls.value
                            : parseFloat(ls.value) || 0
                      };
                    }
                    return null;
                  };

                  const normalizedTokenLS = normalizeLetterSpacing(
                    tokenLetterSpacing
                  );
                  const normalizedStyleLS = normalizeLetterSpacing(
                    styleLetterSpacing
                  );

                  if (!normalizedTokenLS || !normalizedStyleLS) {
                    return false;
                  }

                  if (normalizedTokenLS.unit !== normalizedStyleLS.unit) {
                    return false;
                  }

                  if (
                    Math.abs(
                      normalizedTokenLS.value - normalizedStyleLS.value
                    ) > 0.1
                  ) {
                    return false;
                  }
                }

                if (
                  token.value.textCase !== undefined &&
                  token.value.textCase !== styleProperties.textCase
                ) {
                  return false;
                }

                if (
                  token.value.textDecoration !== undefined &&
                  token.value.textDecoration !== styleProperties.textDecoration
                ) {
                  return false;
                }

                if (
                  token.value.paragraphIndent !== undefined &&
                  Math.abs(
                    (token.value.paragraphIndent || 0) -
                      (styleProperties.paragraphIndent || 0)
                  ) > 0.1
                ) {
                  return false;
                }

                if (
                  token.value.paragraphSpacing !== undefined &&
                  Math.abs(
                    (token.value.paragraphSpacing || 0) -
                      (styleProperties.paragraphSpacing || 0)
                  ) > 0.1
                ) {
                  return false;
                }

                return true;
              });
            }

            return false;
          });

          if (tokenMatch) {
            console.log(
              `[isTextStyleInLibrary] ✓ Token encontrado nos tokens salvos`
            );
            return true;
          }
        } else {
          console.log(
            `[isTextStyleInLibrary] Estilo ${styleId} não encontrado no Figma`
          );
        }
      } catch (error) {
        console.error(
          "[isTextStyleInLibrary] Erro ao verificar tokens salvos:",
          error
        );
      }
    }

    console.log(`[isTextStyleInLibrary] ✗ Estilo ${styleId} não encontrado`);
    return false;
  } catch (error) {
    console.error("[isTextStyleInLibrary] Erro:", error);
    return false;
  }
}

// Função para verificar se um estilo de efeito está na biblioteca
function isEffectStyleInLibrary(
  styleId: string,
  preprocessedLibs: { effects: Set<string> }
): boolean {
  try {
    if (!preprocessedLibs || !preprocessedLibs.effects) {
      return false;
    }

    // Verifica o ID completo
    if (preprocessedLibs.effects.has(styleId)) {
      return true;
    }

    // Verifica também apenas a parte do ID sem o sufixo (formato S:hash,nodeId)
    const baseStyleId = styleId.split(",")[0];
    if (baseStyleId !== styleId && preprocessedLibs.effects.has(baseStyleId)) {
      return true;
    }

    return false;
  } catch (error) {
    console.error("[isEffectStyleInLibrary] Erro:", error);
    return false;
  }
}

// Função auxiliar para verificar se um estilo de cor está na biblioteca ou nos tokens salvos
function isColorStyleInLibrary(
  styleId: string,
  preprocessedLibs: { fills: Set<string> },
  node?: any,
  savedTokens: any[] = []
): boolean {
  try {
    console.log(`[isColorStyleInLibrary] Verificando estilo ${styleId}`);
    console.log(
      `[isColorStyleInLibrary] Bibliotecas preprocessadas:`,
      preprocessedLibs?.fills?.size || 0
    );
    console.log(
      `[isColorStyleInLibrary] Tokens salvos:`,
      savedTokens?.length || 0
    );

    // Primeiro verifica se o estilo está nas bibliotecas carregadas
    if (preprocessedLibs?.fills?.has(styleId)) {
      console.log(
        `[isColorStyleInLibrary] ✓ Estilo encontrado nas bibliotecas preprocessadas`
      );
      return true;
    }

    // Verifica também apenas a parte do ID sem o sufixo (formato S:hash,nodeId)
    const baseStyleId = styleId.split(",")[0];
    if (baseStyleId !== styleId && preprocessedLibs?.fills?.has(baseStyleId)) {
      console.log(
        `[isColorStyleInLibrary] ✓ Estilo base encontrado nas bibliotecas preprocessadas: ${baseStyleId}`
      );
      return true;
    }

    // Verifica nos tokens salvos se houver
    if (savedTokens && savedTokens.length > 0) {
      try {
        // Obtém o estilo do Figma para comparar
        const style = figma.getStyleById(styleId) as PaintStyle | null;
        if (style) {
          console.log(
            `[isColorStyleInLibrary] Estilo do Figma encontrado: ${style.name}`
          );

          // Verifica se o estilo corresponde a algum token salvo
          const tokenMatch = savedTokens.some(tokenLib => {
            console.log(
              `[isColorStyleInLibrary] Verificando biblioteca de tokens:`,
              tokenLib.name
            );

            // Verifica se há tokens de fills na biblioteca
            if (!tokenLib.tokens?.fills && !tokenLib.flattenedTokens) {
              console.log(
                `[isColorStyleInLibrary] Biblioteca sem tokens de fills`
              );
              return false;
            }

            // Verifica nos tokens estruturados
            if (tokenLib.tokens?.fills) {
              const fillTokenMatch = tokenLib.tokens.fills.some(
                (token: any) => {
                  // Verificação por ID (mais precisa)
                  if (token.id && token.id === styleId) {
                    console.log(
                      `[isColorStyleInLibrary] ✓ Correspondência por ID: ${token.id}`
                    );
                    return true;
                  }

                  // Verificação por key
                  if (token.key && style.key && token.key === style.key) {
                    console.log(
                      `[isColorStyleInLibrary] ✓ Correspondência por key: ${token.key}`
                    );
                    return true;
                  }

                  // Verificação por nome
                  if (token.name && style.name && token.name === style.name) {
                    console.log(
                      `[isColorStyleInLibrary] ✓ Correspondência por nome: ${token.name}`
                    );
                    return true;
                  }

                  return false;
                }
              );

              if (fillTokenMatch) return true;
            }

            // Verifica nos tokens achatados (flattenedTokens)
            if (tokenLib.flattenedTokens) {
              const flatTokenMatch = tokenLib.flattenedTokens
                .filter((token: any) => token.category === "fills")
                .some((token: any) => {
                  // Verificação por ID
                  if (token.id && token.id === styleId) {
                    console.log(
                      `[isColorStyleInLibrary] ✓ Correspondência por ID (flat): ${token.id}`
                    );
                    return true;
                  }

                  // Verificação por key
                  if (token.key && style.key && token.key === style.key) {
                    console.log(
                      `[isColorStyleInLibrary] ✓ Correspondência por key (flat): ${token.key}`
                    );
                    return true;
                  }

                  // Verificação por nome
                  if (token.name && style.name && token.name === style.name) {
                    console.log(
                      `[isColorStyleInLibrary] ✓ Correspondência por nome (flat): ${token.name}`
                    );
                    return true;
                  }

                  return false;
                });

              if (flatTokenMatch) return true;
            }

            return false;
          });

          if (tokenMatch) {
            console.log(
              `[isColorStyleInLibrary] ✓ Token encontrado nos tokens salvos`
            );
            return true;
          }
        } else {
          console.log(
            `[isColorStyleInLibrary] Estilo ${styleId} não encontrado no Figma`
          );
        }
      } catch (error) {
        console.error(
          "[isColorStyleInLibrary] Erro ao verificar tokens salvos:",
          error
        );
      }
    }

    console.log(`[isColorStyleInLibrary] ✗ Estilo ${styleId} não encontrado`);
    return false;
  } catch (error) {
    console.error("[isColorStyleInLibrary] Erro:", error);
    return false;
  }
}

// Função para verificar estilos de texto
export async function checkType(
  node: any,
  errors: any[],
  preprocessedLibs: { text: Set<string> },
  savedTokens: any[] = [],
  libraries: any[] = []
): Promise<void> {
  try {
    // Aplica-se apenas a nós de TEXTO visíveis com algum conteúdo.
    if (
      !node ||
      node.type !== "TEXT" ||
      node.visible === false ||
      !node.characters ||
      node.characters.length === 0
    ) {
      return;
    }

    // Erro se houver estilos de texto mistos, pois não é possível validar.
    if (typeof node.textStyleId === "symbol") {
      errors.push({
        type: "text",
        message: "Texto com estilos mistos",
        nodeId: node.id,
        nodeName: node.name,
        value: "Múltiplos estilos de texto",
        suggestions: []
      });
      console.log(
        `[checkType] Texto com estilos mistos encontrado: ${node.name} (${node.id})`
      );
      return;
    }

    // Erro se não houver um estilo de texto aplicado.
    if (!node.textStyleId || node.textStyleId === "") {
      const styleDesc = `${node.fontName.family} ${node.fontSize}px`;
      const suggestions =
        libraries?.flatMap(lib => lib.text).filter(Boolean) || [];

      errors.push({
        type: "text",
        message: "Estilo de texto não utiliza um token (estilo)",
        nodeId: node.id,
        nodeName: node.name,
        value: styleDesc,
        suggestions: suggestions
      });
    } else {
      // Se um estilo é aplicado, verifica se ele pertence a uma biblioteca válida ou corresponde a um token salvo
      const styleFoundInTokens = isTextStyleInLibrary(
        node.textStyleId,
        preprocessedLibs,
        node,
        savedTokens
      );

      console.log(`[checkType] Verificando estilo ${node.textStyleId}:`, {
        styleId: node.textStyleId,
        foundInTokens: styleFoundInTokens,
        hasTokens: savedTokens && savedTokens.length > 0
      });

      // Se não encontrou nos tokens, mostrar erro
      if (!styleFoundInTokens) {
        try {
          const textStyle = (await figma.getStyleById(
            node.textStyleId
          )) as TextStyle;
          const value = textStyle
            ? `${(textStyle.fontName as FontName).family} ${
                textStyle.fontSize
              }px`
            : "Estilo de texto desconhecido";

          if (textStyle) {
            console.log(
              `[checkType] Estilo de texto não encontrado na biblioteca: ${textStyle.name}`
            );
          }

          const suggestions =
            libraries?.flatMap(lib => lib.text).filter(Boolean) || [];

          errors.push({
            type: "text",
            message:
              "Estilo de texto não pertence a uma biblioteca ou foi modificado",
            nodeId: node.id,
            nodeName: node.name,
            value: value,
            suggestions: suggestions
          });
        } catch (error) {
          console.error("[checkType] Erro ao buscar estilo de texto:", error);
          errors.push({
            type: "text",
            message: "Erro ao verificar estilo de texto",
            nodeId: node.id,
            nodeName: node.name,
            value: "Erro ao carregar estilo",
            suggestions: []
          });
        }
      } else {
        console.log(
          `[checkType] ✓ Estilo ${node.textStyleId} encontrado - sem erro`
        );
      }
    }
  } catch (error) {
    console.error("[checkType] Erro:", error);
  }
}

// Função para verificar fills (cores)
export async function newCheckFills(
  node: any,
  errors: any[],
  preprocessedLibs: { fills: Set<string> },
  savedTokens: any[] = [],
  libraries: any[] = []
) {
  try {
    if (
      !node ||
      node.visible === false ||
      !node.fills ||
      (Array.isArray(node.fills) && node.fills.length === 0)
    ) {
      return;
    }

    if (typeof node.fills === "symbol") {
      errors.push({
        type: "fill",
        message: "Preenchimento com valores mistos",
        nodeId: node.id,
        nodeName: node.name,
        value: "Múltiplos preenchimentos",
        suggestions: []
      });
      return;
    }

    const hasVisibleFills = node.fills.some(fill => fill.visible !== false);

    if (hasVisibleFills) {
      if (!node.fillStyleId || node.fillStyleId === "") {
        // Caso 1: Não há estilo aplicado - sempre mostrar erro se não for estilo local
        const firstVisibleFill = node.fills.find(
          fill => fill.visible !== false
        );
        let fillValue = "Preenchimento complexo";

        if (firstVisibleFill && firstVisibleFill.type === "SOLID") {
          const color = convertColor(firstVisibleFill.color);
          fillValue = getHexString(color, firstVisibleFill.opacity);
        } else if (firstVisibleFill) {
          fillValue = firstVisibleFill.type;
        }

        const suggestions = [];

        // Adicionar sugestões das bibliotecas locais
        if (libraries && libraries.length > 0) {
          libraries.forEach(lib => {
            if (lib.fills && Array.isArray(lib.fills)) {
              suggestions.push(...lib.fills.filter(Boolean));
            }
          });
        }

        // Adicionar sugestões dos tokens salvos
        if (savedTokens && savedTokens.length > 0) {
          savedTokens.forEach(tokenLib => {
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

        errors.push({
          type: "fill",
          message: "Preenchimento não utiliza um token (estilo)",
          nodeId: node.id,
          nodeName: node.name,
          value: fillValue,
          suggestions: suggestions
        });
      } else {
        // Caso 2: Há estilo aplicado - verificar se está na biblioteca ou tokens salvos
        const styleFoundInLibraries =
          preprocessedLibs?.fills?.has(node.fillStyleId) || false;

        // IMPORTANTE: Usar a função isColorStyleInLibrary que já verifica tanto bibliotecas quanto tokens
        const styleFoundInTokens = isColorStyleInLibrary(
          node.fillStyleId,
          preprocessedLibs,
          node,
          savedTokens
        );

        console.log(`[newCheckFills] Verificando estilo ${node.fillStyleId}:`, {
          styleId: node.fillStyleId,
          foundInLibraries: styleFoundInLibraries,
          foundInTokens: styleFoundInTokens,
          hasTokens: savedTokens && savedTokens.length > 0,
          preprocessedLibsSize: preprocessedLibs?.fills?.size || 0
        });

        // Se encontrou nos tokens (que já inclui verificação de bibliotecas), não mostrar erro
        if (!styleFoundInTokens) {
          try {
            const paintStyle = (await figma.getStyleById(
              node.fillStyleId
            )) as PaintStyle;
            let value = "Cor desconhecida";
            if (
              paintStyle &&
              paintStyle.paints &&
              paintStyle.paints.length > 0
            ) {
              const paint = paintStyle.paints[0];
              if (paint.type === "SOLID") {
                value = getHexString(paint.color, paint.opacity);
              } else if (
                paint.type === "GRADIENT_LINEAR" ||
                paint.type === "GRADIENT_RADIAL" ||
                paint.type === "GRADIENT_ANGULAR" ||
                paint.type === "GRADIENT_DIAMOND"
              ) {
                value = `Gradiente ${paint.type.split("_")[1].toLowerCase()}`;
              } else if (paint.type === "IMAGE") {
                value = "Imagem de preenchimento";
              }
            }

            const suggestions = [];

            // Adicionar sugestões das bibliotecas locais
            if (libraries && libraries.length > 0) {
              libraries.forEach(lib => {
                if (lib.fills && Array.isArray(lib.fills)) {
                  suggestions.push(...lib.fills.filter(Boolean));
                }
              });
            }

            // Adicionar sugestões dos tokens salvos
            if (savedTokens && savedTokens.length > 0) {
              savedTokens.forEach(tokenLib => {
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

            errors.push({
              type: "fill",
              message:
                "Estilo de preenchimento não pertence a uma biblioteca ou foi modificado",
              nodeId: node.id,
              nodeName: node.name,
              value: value,
              suggestions: suggestions
            });
          } catch (error) {
            console.error(
              "[newCheckFills] Erro ao buscar estilo de preenchimento:",
              error
            );
            errors.push({
              type: "fill",
              message: "Erro ao verificar estilo de preenchimento",
              nodeId: node.id,
              nodeName: node.name,
              value: "Erro ao carregar estilo",
              suggestions: []
            });
          }
        } else {
          console.log(
            `[newCheckFills] ✓ Estilo ${node.fillStyleId} encontrado - sem erro`
          );
        }
      }
    }
  } catch (error) {
    console.error("[newCheckFills] Erro:", error);
  }
}

// Função para verificar effects
export async function newCheckEffects(
  node: any,
  errors: any[],
  preprocessedLibs: { effects: Set<string> },
  savedTokens: any[] = [],
  libraries: any[] = []
) {
  try {
    if (
      !node ||
      node.visible === false ||
      !node.effects ||
      (Array.isArray(node.effects) && node.effects.length === 0)
    ) {
      return;
    }

    if (typeof node.effects === "symbol") {
      errors.push({
        type: "effects",
        message: "Efeitos com valores mistos",
        nodeId: node.id,
        nodeName: node.name,
        value: "Múltiplos efeitos", // Added value for mixed effects
        suggestions: []
      });
      return;
    }

    const hasVisibleEffects = node.effects.some(
      effect => effect.visible !== false
    );

    if (
      hasVisibleEffects &&
      (!node.effectStyleId || node.effectStyleId === "")
    ) {
      const firstEffect = node.effects.find(e => e.visible !== false);
      let effectValue = firstEffect?.type || "Efeito desconhecido";

      // Adiciona detalhes específicos do tipo de efeito
      if (firstEffect) {
        if (
          firstEffect.type === "DROP_SHADOW" ||
          firstEffect.type === "INNER_SHADOW"
        ) {
          const shadow = firstEffect as DropShadowEffect | InnerShadowEffect;
          effectValue = `${
            firstEffect.type === "DROP_SHADOW" ? "Sombra" : "Sombra interna"
          }: ${shadow.offset.x}px ${shadow.offset.y}px ${shadow.radius}px`;
          if (shadow.color) {
            effectValue += ` ${getHexString(shadow.color)}`;
          }
        } else if (firstEffect.type === "LAYER_BLUR") {
          const blur = firstEffect as BlurEffect;
          effectValue = `Desfoque: ${blur.radius}px`;
        } else if (firstEffect.type === "BACKGROUND_BLUR") {
          const blur = firstEffect as BlurEffect;
          effectValue = `Desfoque de fundo: ${blur.radius}px`;
        }
      }

      const suggestions =
        libraries?.flatMap(lib => lib.effects).filter(Boolean) || [];

      errors.push({
        type: "effects",
        message: "Efeito não utiliza um token (estilo)",
        nodeId: node.id,
        nodeName: node.name,
        value: effectValue,
        suggestions: suggestions
      });
    } else if (node.effectStyleId) {
      const styleFound = isEffectStyleInLibrary(
        node.effectStyleId,
        preprocessedLibs
      );

      if (!styleFound) {
        try {
          const effectStyle = (await figma.getStyleById(
            node.effectStyleId
          )) as EffectStyle;
          let value = "Efeito desconhecido";

          if (
            effectStyle &&
            effectStyle.effects &&
            effectStyle.effects.length > 0
          ) {
            const effect = effectStyle.effects[0];

            if (
              effect.type === "DROP_SHADOW" ||
              effect.type === "INNER_SHADOW"
            ) {
              const shadow = effect as DropShadowEffect | InnerShadowEffect;
              value = `${
                effect.type === "DROP_SHADOW" ? "Sombra" : "Sombra interna"
              }: ${shadow.offset.x}px ${shadow.offset.y}px ${shadow.radius}px`;
              if (shadow.color) {
                value += ` ${getHexString(shadow.color)}`;
              }
            } else if (effect.type === "LAYER_BLUR") {
              const blur = effect as BlurEffect;
              value = `Desfoque: ${blur.radius}px`;
            } else if (effect.type === "BACKGROUND_BLUR") {
              const blur = effect as BlurEffect;
              value = `Desfoque de fundo: ${blur.radius}px`;
            } else {
              value = effect.type;
            }
          }

          const suggestions =
            libraries?.flatMap(lib => lib.effects).filter(Boolean) || [];

          errors.push({
            type: "effects",
            message:
              "Estilo de efeito não pertence a uma biblioteca ou foi modificado",
            nodeId: node.id,
            nodeName: node.name,
            value: value,
            suggestions: suggestions
          });
        } catch (error) {
          console.error(
            "[newCheckEffects] Erro ao buscar estilo de efeito:",
            error
          );
          errors.push({
            type: "effects",
            message: "Erro ao verificar estilo de efeito",
            nodeId: node.id,
            nodeName: node.name,
            value: "Erro ao carregar estilo",
            suggestions: []
          });
        }
      }
    }
  } catch (error) {
    console.error("[newCheckEffects] Erro:", error);
  }
}

// Função para verificar strokes
export async function newCheckStrokes(
  node: any,
  errors: any[],
  preprocessedLibs: { fills: Set<string> },
  savedTokens: any[] = [],
  libraries: any[] = []
) {
  try {
    if (
      !node ||
      node.visible === false ||
      !node.strokes ||
      (Array.isArray(node.strokes) && node.strokes.length === 0)
    ) {
      return;
    }

    if (typeof node.strokes === "symbol") {
      errors.push({
        type: "stroke",
        message: "Borda com valores mistos",
        nodeId: node.id,
        nodeName: node.name,
        value: "Múltiplas bordas", // Added value for mixed strokes
        suggestions: []
      });
      return;
    }

    const hasVisibleStrokes = node.strokes.some(
      stroke => stroke.visible !== false
    );

    if (hasVisibleStrokes) {
      if (!node.strokeStyleId || node.strokeStyleId === "") {
        const firstVisibleStroke = node.strokes.find(s => s.visible !== false);
        let strokeValue = "Borda complexa";

        if (firstVisibleStroke && firstVisibleStroke.type === "SOLID") {
          const color = convertColor(firstVisibleStroke.color);
          strokeValue = getHexString(color, firstVisibleStroke.opacity);
        } else if (firstVisibleStroke) {
          strokeValue = firstVisibleStroke.type;
        }

        const suggestions =
          libraries
            ?.flatMap(lib => lib.strokes || lib.fills) // strokes can use fill styles
            .filter(Boolean) || [];

        errors.push({
          type: "stroke",
          message: "Borda não utiliza um token (estilo)",
          nodeId: node.id,
          nodeName: node.name,
          value: strokeValue,
          suggestions: suggestions
        });
      } else {
        // Caso 2: Há estilo aplicado - verificar se está na biblioteca ou tokens salvos
        const styleFoundInTokens = isColorStyleInLibrary(
          node.strokeStyleId,
          preprocessedLibs,
          node,
          savedTokens
        );

        console.log(
          `[newCheckStrokes] Verificando estilo ${node.strokeStyleId}:`,
          {
            styleId: node.strokeStyleId,
            foundInTokens: styleFoundInTokens,
            hasTokens: savedTokens && savedTokens.length > 0
          }
        );

        // Se não encontrou nos tokens, mostrar erro
        if (!styleFoundInTokens) {
          try {
            const paintStyle = (await figma.getStyleById(
              node.strokeStyleId
            )) as PaintStyle;
            let value = "Cor desconhecida";
            if (
              paintStyle &&
              paintStyle.paints &&
              paintStyle.paints.length > 0
            ) {
              const paint = paintStyle.paints[0];
              if (paint.type === "SOLID") {
                value = getHexString(paint.color, paint.opacity);
              } else if (
                paint.type === "GRADIENT_LINEAR" ||
                paint.type === "GRADIENT_RADIAL" ||
                paint.type === "GRADIENT_ANGULAR" ||
                paint.type === "GRADIENT_DIAMOND"
              ) {
                value = `Gradiente ${paint.type.split("_")[1].toLowerCase()}`;
              } else if (paint.type === "IMAGE") {
                value = "Imagem de borda";
              }
            }

            // Adiciona informações adicionais sobre a borda, se disponíveis
            let strokeInfo = [];
            if (node.strokeWeight !== undefined) {
              strokeInfo.push(`${node.strokeWeight}px`);
            }
            if (node.strokeAlign) {
              strokeInfo.push(node.strokeAlign);
            }
            if (strokeInfo.length > 0) {
              value += ` (${strokeInfo.join(", ")})`;
            }

            const suggestions =
              libraries
                ?.flatMap(lib => lib.strokes || lib.fills) // strokes can use fill styles
                .filter(Boolean) || [];

            errors.push({
              type: "stroke",
              message:
                "Estilo de borda não pertence a uma biblioteca ou foi modificado",
              nodeId: node.id,
              nodeName: node.name,
              value: value,
              suggestions: suggestions
            });
          } catch (error) {
            console.error(
              "[newCheckStrokes] Erro ao buscar estilo de borda:",
              error
            );
            errors.push({
              type: "stroke",
              message: "Erro ao verificar estilo de borda",
              nodeId: node.id,
              nodeName: node.name,
              value: "Erro ao carregar estilo",
              suggestions: []
            });
          }
        } else {
          console.log(
            `[newCheckStrokes] ✓ Estilo ${node.strokeStyleId} encontrado - sem erro`
          );
        }
      }
    }
  } catch (error) {
    console.error("[newCheckStrokes] Erro:", error);
  }
}

// Função para verificar radius
export function checkRadius(
  node: any,
  errors: any[],
  savedTokens: any[] = [],
  libraries: any[] = []
) {
  try {
    if (!node || node.visible === false) return;
    const radiusSuggestions =
      libraries
        ?.flatMap(lib => lib.radius || [])
        .filter(Boolean)
        .map(v => ({
          id: v.id, // ID da variável do Figma
          name: v.name,
          value: v.value,
          // Propriedades necessárias para a UI
          type: "VARIABLE",
          description: v.description || `Raio de ${v.value}px`,
          paint: { type: "VARIABLE" },
          // Adicionando propriedades adicionais para compatibilidade
          key: v.id, // Garantir que a chave única esteja disponível
          style: {
            // Estrutura esperada pelo componente de sugestões
            type: "VARIABLE",
            name: v.name,
            value: v.value,
            description: v.description || `Raio de ${v.value}px`,
            id: v.id
          }
        })) || [];

    // Helper para verificar uma propriedade de raio.
    // O token para raio é uma variável, então verificamos `boundVariables`.
    const checkRadiusProperty = (
      radiusValue,
      propertyName,
      variableBinding
    ) => {
      // Ignora se o raio não estiver definido ou for 0.
      if (radiusValue === undefined || radiusValue === 0) {
        return;
      }

      // Se um raio é definido, ele DEVE estar vinculado a uma variável.
      if (!variableBinding) {
        errors.push({
          type: "radius",
          message: `Raio (${propertyName}) não utiliza um token (variável)`,
          nodeId: node.id,
          nodeName: node.name,
          value: `${radiusValue}px`,
          suggestions: radiusSuggestions,
          property: propertyName,
          // Garantir que os nós estejam disponíveis para a função apply-styles
          nodes: [node.id],
          // Adicionar referência à propriedade específica
          styleKey: propertyName
        });
      }
      // Opcional: se estiver vinculado, poderíamos validar se a variável pertence
      // a uma coleção válida, mas por enquanto, apenas a verificação de vínculo
      // atende ao requisito.
    };

    // Verifica o raio de canto uniforme.
    if (
      node.cornerRadius !== undefined &&
      typeof node.cornerRadius !== "symbol"
    ) {
      checkRadiusProperty(
        node.cornerRadius,
        "cornerRadius",
        node.boundVariables?.cornerRadius
      );
    }

    // Verifica raios de canto individuais se o raio uniforme for misto.
    if (typeof node.cornerRadius === "symbol") {
      checkRadiusProperty(
        node.topLeftRadius,
        "topLeftRadius",
        node.boundVariables?.topLeftRadius
      );
      checkRadiusProperty(
        node.topRightRadius,
        "topRightRadius",
        node.boundVariables?.topRightRadius
      );
      checkRadiusProperty(
        node.bottomLeftRadius,
        "bottomLeftRadius",
        node.boundVariables?.bottomLeftRadius
      );
      checkRadiusProperty(
        node.bottomRightRadius,
        "bottomRightRadius",
        node.boundVariables?.bottomRightRadius
      );
    }
  } catch (error) {
    console.error("[checkRadius] Erro:", error);
  }
}

/**
 * Verifica se os valores de padding estão usando tokens de variáveis
 */
export function checkPadding(
  node: any,
  errors: any[],
  savedTokens: any[] = [],
  libraries: any[] = []
) {
  try {
    if (!node || node.visible === false || !("paddingTop" in node)) return;

    // Verifica se há algum valor de padding definido
    const hasPadding =
      (node.paddingTop !== undefined && node.paddingTop > 0) ||
      (node.paddingRight !== undefined && node.paddingRight > 0) ||
      (node.paddingBottom !== undefined && node.paddingBottom > 0) ||
      (node.paddingLeft !== undefined && node.paddingLeft > 0);

    if (!hasPadding) return;

    // Verifica se há variáveis vinculadas para cada lado do padding
    const boundVariables = node.boundVariables || {};
    const paddingSides = [
      "paddingTop",
      "paddingRight",
      "paddingBottom",
      "paddingLeft"
    ];
    const missingVariables = [];

    // Verifica cada lado do padding
    for (const side of paddingSides) {
      if (node[side] > 0 && !boundVariables[side]) {
        missingVariables.push({
          side,
          value: node[side]
        });
      }
    }

    if (missingVariables.length > 0) {
      // Busca sugestões de tokens de espaçamento
      const paddingSuggestions =
        libraries
          ?.flatMap(lib => lib.paddings || [])
          .filter(Boolean)
          .map(v => ({
            id: v.id,
            name: v.name,
            value: v.value,
            type: "VARIABLE",
            description: v.description || `Espaçamento de ${v.value}px`,
            paint: { type: "VARIABLE" },
            key: v.id,
            style: {
              type: "VARIABLE",
              name: v.name,
              value: v.value,
              description: v.description || `Espaçamento de ${v.value}px`,
              id: v.id
            }
          })) || [];

      // Cria uma mensagem de erro para cada lado sem variável
      for (const { side, value } of missingVariables) {
        const sideName = side.replace("padding", "").toLowerCase();
        const sideDisplayName =
          sideName.charAt(0).toUpperCase() + sideName.slice(1);

        errors.push({
          type: "padding",
          message: `Padding ${sideDisplayName} (${value}px) não utiliza um token (variável)`,
          nodeId: node.id,
          nodeName: node.name,
          value: `${value}px`,
          suggestions: paddingSuggestions,
          property: side,
          nodes: [node.id],
          styleKey: side,
          side: sideName // Adiciona a propriedade side para referência
        });
      }
    }
  } catch (error) {
    console.error("[checkPadding] Erro:", error);
  }
}

export function checkGap(
  node: any,
  errors: any[],
  savedTokens: any[] = [],
  libraries: any[] = []
) {
  try {
    if (!node || node.visible === false) return;
    if (
      (node.layoutMode !== "HORIZONTAL" && node.layoutMode !== "VERTICAL") ||
      node.itemSpacing <= 0
    ) {
      return;
    }
    // Verifica se itemSpacing está vinculado a uma variável
    if (!node.boundVariables?.itemSpacing) {
      const gapSuggestions =
        libraries
          ?.flatMap(lib => lib.gaps || [])
          .filter(Boolean)
          .map(v => ({
            id: v.id, // ID da variável do Figma
            name: v.name,
            value: v.value,
            // Propriedades necessárias para a UI
            type: "VARIABLE",
            description: v.description || `Espaçamento de ${v.value}px`,
            paint: { type: "VARIABLE" },
            // Adicionando propriedades adicionais para compatibilidade
            key: v.id, // Garantir que a chave única esteja disponível
            style: {
              // Estrutura esperada pelo componente de sugestões
              type: "VARIABLE",
              name: v.name,
              value: v.value,
              description: v.description || `Espaçamento de ${v.value}px`,
              id: v.id
            }
          })) || [];

      errors.push({
        type: "gap",
        message: "Espaçamento (gap) não utiliza um token (variável)",
        nodeId: node.id,
        nodeName: node.name,
        value: `${node.itemSpacing}px`,
        suggestions: gapSuggestions,
        property: "itemSpacing", // Propriedade para vincular
        // Garantir que os nós estejam disponíveis para a função apply-styles
        nodes: [node.id],
        // Adicionar referência à propriedade específica
        styleKey: "itemSpacing"
      });
    }
  } catch (error) {
    console.error("[checkGap] Erro:", error);
  }
}
