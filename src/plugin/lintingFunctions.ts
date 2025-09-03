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
  preprocessedLibs: { text: Set<string> }
): boolean {
  try {
    if (!preprocessedLibs || !preprocessedLibs.text) {
      return false;
    }
    return preprocessedLibs.text.has(styleId);
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

// Função para verificar tipos de texto
export function checkType(
  node: any,
  errors: any[],
  preprocessedLibs: { text: Set<string> },
  savedTokens: any[] = []
) {
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
        nodeName: node.name
      });
      return;
    }

    // Erro se não houver um estilo de texto aplicado.
    if (!node.textStyleId || node.textStyleId === "") {
      const styleDesc = `${node.fontName.family} ${node.fontSize}px`;
      errors.push({
        type: "text",
        message: "Estilo de texto não utiliza um token (estilo)",
        nodeId: node.id,
        nodeName: node.name,
        value: styleDesc
      });
    } else {
      // Se um estilo é aplicado, verifica se ele pertence a uma biblioteca válida.
      const styleFound = isTextStyleInLibrary(
        node.textStyleId,
        preprocessedLibs
      );

      if (!styleFound) {
        errors.push({
          type: "text-style-library",
          message: "Estilo de texto não pertence a uma biblioteca selecionada",
          nodeId: node.id,
          nodeName: node.name
        });
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
  preprocessedLibs: { fills: Set<string> },
  savedTokens: any[] = []
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
        nodeName: node.name
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
          const r = Math.round(color.r * 255)
            .toString(16)
            .padStart(2, "0");
          const g = Math.round(color.g * 255)
            .toString(16)
            .padStart(2, "0");
          const b = Math.round(color.b * 255)
            .toString(16)
            .padStart(2, "0");
          fillValue = `#${r}${g}${b}`.toUpperCase();
        } else if (firstVisibleFill) {
          fillValue = firstVisibleFill.type;
        }

        errors.push({
          type: "fill",
          message: "Preenchimento não utiliza um token (estilo)",
          nodeId: node.id,
          nodeName: node.name,
          value: fillValue
        });
      } else {
        const styleFound = isColorStyleInLibrary(
          node.fillStyleId,
          preprocessedLibs
        );

        if (!styleFound) {
          errors.push({
            type: "fill-style-library",
            message:
              "Estilo de preenchimento não pertence a uma biblioteca selecionada",
            nodeId: node.id,
            nodeName: node.name
          });
        }
      }
    }
  } catch (error) {
    console.error("[newCheckFills] Erro:", error);
  }
}

// Função auxiliar para verificar se um estilo de cor está na biblioteca
function isColorStyleInLibrary(
  styleId: string,
  preprocessedLibs: { fills: Set<string> }
): boolean {
  try {
    if (!preprocessedLibs || !preprocessedLibs.fills) {
      return false;
    }
    return preprocessedLibs.fills.has(styleId);
  } catch (error) {
    console.error("[isColorStyleInLibrary] Erro:", error);
    return false;
  }
}

// Função para verificar effects
export function newCheckEffects(
  node: any,
  errors: any[],
  preprocessedLibs: { effects: Set<string> },
  savedTokens: any[] = []
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
        nodeName: node.name
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
      errors.push({
        type: "effects",
        message: "Efeito não utiliza um token (estilo)",
        nodeId: node.id,
        nodeName: node.name,
        value: firstEffect.type
      });
    } else if (node.effectStyleId) {
      const styleFound = isEffectStyleInLibrary(
        node.effectStyleId,
        preprocessedLibs
      );

      if (!styleFound) {
        errors.push({
          type: "effect-style-library",
          message: "Estilo de efeito não pertence a uma biblioteca selecionada",
          nodeId: node.id,
          nodeName: node.name
        });
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
  preprocessedLibs: { fills: Set<string> },
  savedTokens: any[] = []
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
        nodeName: node.name
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
          const r = Math.round(color.r * 255)
            .toString(16)
            .padStart(2, "0");
          const g = Math.round(color.g * 255)
            .toString(16)
            .padStart(2, "0");
          const b = Math.round(color.b * 255)
            .toString(16)
            .padStart(2, "0");
          strokeValue = `#${r}${g}${b}`.toUpperCase();
        } else if (firstVisibleStroke) {
          strokeValue = firstVisibleStroke.type;
        }

        errors.push({
          type: "stroke",
          message: "Borda não utiliza um token (estilo)",
          nodeId: node.id,
          nodeName: node.name,
          value: strokeValue
        });
      } else {
        const styleFound = isColorStyleInLibrary(
          node.strokeStyleId,
          preprocessedLibs
        );

        if (!styleFound) {
          errors.push({
            type: "stroke-style-library",
            message:
              "Estilo de borda não pertence a uma biblioteca selecionada",
            nodeId: node.id,
            nodeName: node.name
          });
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
    if (!node || node.visible === false) return;

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
          value: `${radiusValue}px`
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
