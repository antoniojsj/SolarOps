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
  const a =
    opacity !== undefined ? opacity : color.a !== undefined ? color.a : 1;
  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
}

// Função para converter uma cor para formato hexadecimal (HEX)
export function getHexString(color: RGB | RGBA, opacity?: number): string {
  const r = Math.round((color.r || 0) * 255);
  const g = Math.round((color.g || 0) * 255);
  const b = Math.round((color.b || 0) * 255);
  const a =
    opacity !== undefined ? opacity : color.a !== undefined ? color.a : 1;
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
    console.log(
      `[isTextStyleInLibrary] Verificando estilo ${styleId} para o nó ${node?.name ||
        "sem nome"}`
    );

    // Verifica se o estilo está nas bibliotecas carregadas
    if (preprocessedLibs?.text?.has(styleId)) {
      console.log(
        `[isTextStyleInLibrary] Estilo ${styleId} encontrado nas bibliotecas carregadas`
      );
      return true;
    }

    // Se não encontrou nas bibliotecas, verifica nos tokens salvos
    if (savedTokens && savedTokens.length > 0) {
      console.log(
        `[isTextStyleInLibrary] Verificando ${savedTokens.length} tokens salvos`
      );

      try {
        // Obtém o estilo do Figma para comparar com os tokens
        const style = figma.getStyleById(styleId) as TextStyle | null;
        if (style) {
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

          console.log(
            `[isTextStyleInLibrary] Propriedades do estilo ${style.name}:`,
            {
              fontFamily: styleProperties.fontName.family,
              fontWeight: styleProperties.fontName.style,
              fontSize: styleProperties.fontSize,
              lineHeight: styleProperties.lineHeight,
              letterSpacing: styleProperties.letterSpacing
            }
          );

          // Verifica se o estilo corresponde a algum token salvo
          const tokenMatch = savedTokens.some((token, index) => {
            if (!token || !token.value) {
              console.log(
                `[isTextStyleInLibrary] Token ${index} inválido ou sem valor`
              );
              return false;
            }

            console.log(`[isTextStyleInLibrary] Verificando token ${index}:`, {
              name: token.name,
              value: token.value
            });

            // Verifica correspondência de fonte
            if (token.value.fontFamily) {
              const tokenFontFamily = token.value.fontFamily
                .toLowerCase()
                .trim();
              const styleFontFamily = styleProperties.fontName.family
                .toLowerCase()
                .trim();

              // Remove espaços extras e normaliza a string
              const normalizeFontName = (name: string) => {
                return name
                  .replace(/\s+/g, " ") // Substitui múltiplos espaços por um único
                  .replace(/[^a-z0-9\s]/g, "") // Remove caracteres especiais
                  .trim();
              };

              const normalizedToken = normalizeFontName(tokenFontFamily);
              const normalizedStyle = normalizeFontName(styleFontFamily);

              if (normalizedToken !== normalizedStyle) {
                console.log(
                  `[isTextStyleInLibrary] Fontes não correspondem: token=${tokenFontFamily} (${normalizedToken}), estilo=${styleFontFamily} (${normalizedStyle})`
                );
                return false;
              }

              // Verifica peso da fonte se disponível
              if (token.value.fontWeight && styleProperties.fontName.style) {
                const tokenWeight = token.value.fontWeight.toLowerCase();
                const styleWeight = styleProperties.fontName.style.toLowerCase();

                // Mapeia estilos de fonte para pesos numéricos aproximados
                const weightMap: Record<string, number> = {
                  thin: 100,
                  extralight: 200,
                  light: 300,
                  regular: 400,
                  normal: 400,
                  medium: 500,
                  semibold: 600,
                  "semi-bold": 600,
                  demibold: 600,
                  "demi-bold": 600,
                  bold: 700,
                  extrabold: 800,
                  "extra-bold": 800,
                  ultrabold: 800,
                  "ultra-bold": 800,
                  black: 900,
                  heavy: 900
                };

                // Normaliza os pesos para minúsculas e remove espaços/hífens
                const normalizeWeight = (weight: string): number => {
                  if (!weight) return 400;

                  const normalized = weight
                    .toString()
                    .toLowerCase()
                    .replace(/[-\s]/g, "");

                  // Tenta encontrar no mapa
                  const mapped = weightMap[normalized];
                  if (mapped !== undefined) return mapped;

                  // Tenta extrair número (ex: '700', '400italic')
                  const numMatch = normalized.match(/^(\d+)/);
                  if (numMatch) return parseInt(numMatch[1], 10);

                  return 400; // Valor padrão
                };

                const tokenWeightNum = normalizeWeight(tokenWeight);
                const styleWeightNum = normalizeWeight(styleWeight);

                if (tokenWeightNum !== styleWeightNum) {
                  console.log(
                    `[isTextStyleInLibrary] Pesos de fonte não correspondem: token=${tokenWeight} (${tokenWeightNum}), estilo=${styleWeight} (${styleWeightNum})`
                  );
                  return false;
                }
              }
            }

            // Verifica tamanho da fonte
            if (token.value.fontSize && styleProperties.fontSize) {
              const tokenSize = parseFloat(token.value.fontSize);
              const styleSize = parseFloat(styleProperties.fontSize.toString());

              if (
                isNaN(tokenSize) ||
                isNaN(styleSize) ||
                Math.abs(tokenSize - styleSize) > 0.1
              ) {
                console.log(
                  `[isTextStyleInLibrary] Tamanhos de fonte não correspondem: token=${tokenSize}, estilo=${styleSize}`
                );
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

                // Se for um número, assume PIXELS
                if (typeof lh === "number") {
                  return { unit: "PIXELS", value: lh };
                }

                // Se for string, tenta converter para número
                if (typeof lh === "string") {
                  // Se terminar com %, é percentual
                  if (lh.endsWith("%")) {
                    return {
                      unit: "PERCENT",
                      value: parseFloat(lh) || 0
                    };
                  }
                  // Senão, assume PIXELS
                  return {
                    unit: "PIXELS",
                    value: parseFloat(lh) || 0
                  };
                }

                // Se for objeto com unit e value
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

              const normalizedTokenLH = normalizeLineHeight(tokenLineHeight);
              const normalizedStyleLH = normalizeLineHeight(styleLineHeight);

              if (!normalizedTokenLH || !normalizedStyleLH) {
                console.log(
                  "[isTextStyleInLibrary] Não foi possível normalizar os valores de line height"
                );
                return false;
              }

              // Se as unidades são diferentes, não correspondem
              if (normalizedTokenLH.unit !== normalizedStyleLH.unit) {
                console.log(
                  `[isTextStyleInLibrary] Unidades de altura de linha não correspondem: token=${normalizedTokenLH.unit}, estilo=${normalizedStyleLH.unit}`
                );
                return false;
              }

              // Compara os valores com uma pequena margem de erro
              if (
                Math.abs(normalizedTokenLH.value - normalizedStyleLH.value) >
                0.1
              ) {
                console.log(
                  `[isTextStyleInLibrary] Valores de altura de linha (${normalizedTokenLH.unit}) não correspondem: token=${normalizedTokenLH.value}, estilo=${normalizedStyleLH.value}`
                );
                return false;
              }
            }

            // Verifica espaçamento entre letras
            if (token.value.letterSpacing && styleProperties.letterSpacing) {
              const tokenLetterSpacing = token.value.letterSpacing;
              const styleLetterSpacing = styleProperties.letterSpacing;

              // Função para normalizar valores de letter spacing
              const normalizeLetterSpacing = (ls: any) => {
                if (ls === undefined || ls === null) return null;

                // Se for um número, assume PIXELS
                if (typeof ls === "number") {
                  return { unit: "PIXELS", value: ls };
                }

                // Se for string, tenta converter para número
                if (typeof ls === "string") {
                  // Se terminar com %, é percentual
                  if (ls.endsWith("%")) {
                    return {
                      unit: "PERCENT",
                      value: parseFloat(ls) || 0
                    };
                  }
                  // Senão, assume PIXELS
                  return {
                    unit: "PIXELS",
                    value: parseFloat(ls) || 0
                  };
                }

                // Se for objeto com unit e value
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
                console.log(
                  "[isTextStyleInLibrary] Não foi possível normalizar os valores de espaçamento entre letras"
                );
                return false;
              }

              // Se as unidades são diferentes, não correspondem
              if (normalizedTokenLS.unit !== normalizedStyleLS.unit) {
                console.log(
                  `[isTextStyleInLibrary] Unidades de espaçamento entre letras não correspondem: token=${normalizedTokenLS.unit}, estilo=${normalizedStyleLS.unit}`
                );
                return false;
              }

              // Compara os valores com uma pequena margem de erro
              if (
                Math.abs(normalizedTokenLS.value - normalizedStyleLS.value) >
                0.1
              ) {
                console.log(
                  `[isTextStyleInLibrary] Valores de espaçamento entre letras (${normalizedTokenLS.unit}) não correspondem: token=${normalizedTokenLS.value}, estilo=${normalizedStyleLS.value}`
                );
                return false;
              }
            }

            // Verifica propriedades adicionais se disponíveis
            if (
              token.value.textCase !== undefined &&
              token.value.textCase !== styleProperties.textCase
            ) {
              console.log(
                `[isTextStyleInLibrary] Caso de texto não corresponde: token=${token.value.textCase}, estilo=${styleProperties.textCase}`
              );
              return false;
            }

            if (
              token.value.textDecoration !== undefined &&
              token.value.textDecoration !== styleProperties.textDecoration
            ) {
              console.log(
                `[isTextStyleInLibrary] Decoração de texto não corresponde: token=${token.value.textDecoration}, estilo=${styleProperties.textDecoration}`
              );
              return false;
            }

            if (
              token.value.paragraphIndent !== undefined &&
              Math.abs(
                (token.value.paragraphIndent || 0) -
                  (styleProperties.paragraphIndent || 0)
              ) > 0.1
            ) {
              console.log(
                `[isTextStyleInLibrary] Recuo de parágrafo não corresponde: token=${token.value.paragraphIndent}, estilo=${styleProperties.paragraphIndent}`
              );
              return false;
            }

            if (
              token.value.paragraphSpacing !== undefined &&
              Math.abs(
                (token.value.paragraphSpacing || 0) -
                  (styleProperties.paragraphSpacing || 0)
              ) > 0.1
            ) {
              console.log(
                `[isTextStyleInLibrary] Espaçamento de parágrafo não corresponde: token=${token.value.paragraphSpacing}, estilo=${styleProperties.paragraphSpacing}`
              );
              return false;
            }

            console.log(
              `[isTextStyleInLibrary] Token ${index} (${token.name}) corresponde ao estilo ${style.name}`
            );
            return true;
          });

          if (tokenMatch) {
            console.log(
              `[isTextStyleInLibrary] Estilo ${style.name} (${styleId}) corresponde a um token salvo`
            );
            return true;
          } else {
            console.log(
              `[isTextStyleInLibrary] Nenhum token salvo corresponde ao estilo ${style.name} (${styleId})`
            );

            // Log detalhado das propriedades do estilo para depuração
            console.log("[isTextStyleInLibrary] Propriedades do estilo:", {
              name: style.name,
              id: style.id,
              fontName: style.fontName,
              fontSize: style.fontSize,
              lineHeight: style.lineHeight,
              letterSpacing: style.letterSpacing,
              textCase: style.textCase,
              textDecoration: style.textDecoration,
              paragraphIndent: style.paragraphIndent,
              paragraphSpacing: style.paragraphSpacing
            });

            // Log dos tokens disponíveis para comparação
            console.log(
              "[isTextStyleInLibrary] Tokens disponíveis para comparação:",
              savedTokens.map(t => ({
                name: t.name,
                value: t.value
              }))
            );
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
    return preprocessedLibs.effects.has(styleId);
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

// Função para verificar tipos de texto
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
      const styleFound = isTextStyleInLibrary(
        node.textStyleId,
        preprocessedLibs,
        node,
        savedTokens
      );

      if (!styleFound) {
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
        value: "Múltiplos preenchimentos", // Added value for mixed fills
        suggestions: []
      });
      return;
    }

    const hasVisibleFills = node.fills.some(fill => fill.visible !== false);

    if (hasVisibleFills) {
      if (!node.fillStyleId || node.fillStyleId === "") {
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

        const suggestions =
          libraries?.flatMap(lib => lib.fills).filter(Boolean) || [];

        errors.push({
          type: "fill",
          message: "Preenchimento não utiliza um token (estilo)",
          nodeId: node.id,
          nodeName: node.name,
          value: fillValue,
          suggestions: suggestions
        });
      } else {
        const styleFound = isColorStyleInLibrary(
          node.fillStyleId,
          preprocessedLibs,
          node,
          savedTokens
        );

        if (!styleFound) {
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

            const suggestions =
              libraries?.flatMap(lib => lib.fills).filter(Boolean) || [];

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
        const styleFound = isColorStyleInLibrary(
          node.strokeStyleId,
          preprocessedLibs,
          node,
          savedTokens
        );

        if (!styleFound) {
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
          id: v.id,
          name: v.name,
          value: v.value,
          // Adiciona uma propriedade 'paint' mínima para que a UI reconheça a sugestão
          // e exiba o dropdown. O tipo 'VARIABLE' é um marcador customizado.
          paint: { type: "VARIABLE" }
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
          property: propertyName
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
            id: v.id,
            name: v.name,
            value: v.value,
            // Adiciona uma propriedade 'paint' mínima para que a UI reconheça a sugestão
            // e exiba o dropdown. O tipo 'VARIABLE' é um marcador customizado.
            paint: { type: "VARIABLE" }
          })) || [];

      errors.push({
        type: "gap",
        message: "Espaçamento (gap) não utiliza um token (variável)",
        nodeId: node.id,
        nodeName: node.name,
        value: `${node.itemSpacing}px`,
        suggestions: gapSuggestions,
        property: "itemSpacing" // Propriedade para vincular
      });
    }
  } catch (error) {
    console.error("[checkGap] Erro:", error);
  }
}
