// Functions for getting styles from files.

// Tipos do Figma
type BaseStyle = {
  id: string;
  name: string;
  key: string;
  type?: string;
  description?: string;
  paints?: readonly Paint[];
  fontName?: { family: string; style: string };
  fontSize?: number;
  letterSpacing?: number;
  lineHeight?: number | { unit: "AUTO" } | { unit: "PIXELS"; value: number };
  textDecoration?: string;
  textAlignHorizontal?: string;
  textAlignVertical?: string;
  textAutoResize?: string;
  paragraphIndent?: number;
  paragraphSpacing?: number;
  textCase?: string;
  effects?: readonly Effect[];
};

type Paint = {
  type: string;
  color: {
    r: number;
    g: number;
    b: number;
    a: number;
  };
  opacity?: number;
};

type Effect = {
  type: string;
  visible: boolean;
  blendMode: string;
  color: {
    r: number;
    g: number;
    b: number;
    a: number;
  };
  offset: {
    x: number;
    y: number;
  };
  radius: number;
  spread: number;
};

// Declaração da constante figma
declare const figma: {
  getLocalPaintStyles: () => Promise<BaseStyle[]>;
  getLocalTextStyles: () => Promise<BaseStyle[]>;
  getLocalEffectStyles: () => Promise<BaseStyle[]>;
  getStyleById: (id: string) => BaseStyle | null;
  root: {
    children: any[];
  };
  clientStorage: {
    setAsync: (key: string, value: any) => Promise<void>;
  };
  readonly mixed: unique symbol;
};

// Implementação alternativa caso as funções não estejam disponíveis
async function getLocalPaintStylesAlt() {
  try {
    // Tentar usar a API oficial primeiro
    return await figma.getLocalPaintStyles();
  } catch (error) {
    console.warn(
      "[getLocalPaintStyles] API oficial falhou, tentando alternativa:",
      error
    );
    // Fallback: buscar estilos manualmente
    const styles: BaseStyle[] = [];

    // Buscar todos os nós que têm estilos de preenchimento
    function findNodesWithFillStyles(node: any) {
      if (node.fillStyleId && typeof node.fillStyleId === "string") {
        const style = figma.getStyleById(node.fillStyleId);
        if (style && style.type === "PAINT") {
          styles.push(style);
        }
      }

      if (node.children) {
        for (const child of node.children) {
          findNodesWithFillStyles(child);
        }
      }
    }

    // Buscar em todas as páginas
    for (const page of figma.root.children) {
      findNodesWithFillStyles(page);
    }

    // Remover duplicatas
    const uniqueStyles = styles.filter(
      (style, index, self) => index === self.findIndex(s => s.id === style.id)
    );

    return uniqueStyles.map(style => ({
      id: style.id,
      name: style.name,
      key: style.key || style.id,
      description: style.description,
      paints: style.paints || []
    }));
  }
}

async function getLocalTextStylesAlt() {
  try {
    // Tentar usar a API oficial primeiro
    return await figma.getLocalTextStyles();
  } catch (error) {
    console.warn(
      "[getLocalTextStyles] API oficial falhou, tentando alternativa:",
      error
    );
    // Fallback: buscar estilos manualmente
    const styles: BaseStyle[] = [];

    // Buscar todos os nós que têm estilos de texto
    function findNodesWithTextStyles(node: any) {
      if (node.textStyleId && typeof node.textStyleId === "string") {
        const style = figma.getStyleById(node.textStyleId);
        if (style && style.type === "TEXT") {
          styles.push(style);
        }
      }

      if (node.children) {
        for (const child of node.children) {
          findNodesWithTextStyles(child);
        }
      }
    }

    // Buscar em todas as páginas
    for (const page of figma.root.children) {
      findNodesWithTextStyles(page);
    }

    // Remover duplicatas
    const uniqueStyles = styles.filter(
      (style, index, self) => index === self.findIndex(s => s.id === style.id)
    );

    return uniqueStyles.map(style => ({
      id: style.id,
      name: style.name,
      key: style.key || style.id,
      description: style.description,
      fontName: style.fontName,
      fontSize: style.fontSize,
      letterSpacing: style.letterSpacing,
      lineHeight: style.lineHeight,
      textDecoration: style.textDecoration,
      textAlignHorizontal: style.textAlignHorizontal,
      textAlignVertical: style.textAlignVertical,
      textAutoResize: style.textAutoResize,
      paragraphIndent: style.paragraphIndent,
      paragraphSpacing: style.paragraphSpacing,
      textCase: style.textCase
    }));
  }
}

async function getLocalEffectStylesAlt() {
  try {
    // Tentar usar a API oficial primeiro
    return await figma.getLocalEffectStyles();
  } catch (error) {
    console.warn(
      "[getLocalEffectStyles] API oficial falhou, tentando alternativa:",
      error
    );
    // Fallback: buscar estilos manualmente
    const styles: BaseStyle[] = [];

    // Buscar todos os nós que têm estilos de efeito
    function findNodesWithEffectStyles(node: any) {
      if (node.effectStyleId && typeof node.effectStyleId === "string") {
        const style = figma.getStyleById(node.effectStyleId);
        if (style && style.type === "EFFECT") {
          styles.push(style);
        }
      }

      if (node.children) {
        for (const child of node.children) {
          findNodesWithEffectStyles(child);
        }
      }
    }

    // Buscar em todas as páginas
    for (const page of figma.root.children) {
      findNodesWithEffectStyles(page);
    }

    // Remover duplicatas
    const uniqueStyles = styles.filter(
      (style, index, self) => index === self.findIndex(s => s.id === style.id)
    );

    return uniqueStyles.map(style => ({
      id: style.id,
      name: style.name,
      key: style.key || style.id,
      description: style.description,
      effects: style.effects || []
    }));
  }
}

async function getLocalPaintStyles() {
  try {
    const paintStyles = await getLocalPaintStylesAlt();
    const paintStylesData = paintStyles.map(style => {
      const paint = style.paints?.[0] || null;
      return {
        id: style.id,
        name: style.name,
        value:
          paint && paint.color
            ? {
                ...paint.color,
                a:
                  paint.opacity !== undefined
                    ? paint.opacity
                    : paint.color.a !== undefined
                    ? paint.color.a
                    : 1
              }
            : null,
        // Para compatibilidade, ainda inclui paint
        paint: paint || null
      };
    });

    return paintStylesData;
  } catch (error) {
    console.error("[getLocalPaintStyles] Erro geral:", error);
    return [];
  }
}

async function getLocalTextStyles() {
  try {
    const textStyles = await getLocalTextStylesAlt();
    const textStylesData = textStyles.map(style => ({
      id: style.id,
      key: style.key,
      name: style.name,
      description: style.description,
      style: {
        ...style,
        fontFamily: style.fontName?.family || "",
        fontStyle: style.fontName?.style || "",
        fontSize: style.fontSize || 0,
        letterSpacing: style.letterSpacing || 0,
        lineHeight: style.lineHeight || 0,
        textDecoration: style.textDecoration || "",
        textAlignHorizontal: style.textAlignHorizontal || "",
        textAlignVertical: style.textAlignVertical || "",
        textAutoResize: style.textAutoResize || "",
        paragraphIndent: style.paragraphIndent || 0,
        paragraphSpacing: style.paragraphSpacing || 0,
        textCase: style.textCase || ""
      }
    }));

    return textStylesData;
  } catch (error) {
    console.error("[getLocalTextStyles] Erro geral:", error);
    return [];
  }
}

async function getLocalEffectStyles() {
  try {
    const effectStyles = await getLocalEffectStylesAlt();
    const effectStylesData = effectStyles.map(style => ({
      id: style.id,
      name: style.name,
      effects: style.effects || []
    }));

    return effectStylesData;
  } catch (error) {
    console.error("[getLocalEffectStyles] Erro geral:", error);
    return [];
  }
}

async function saveToLocalStorage(data: any, fileName: string) {
  console.log("set storage");
  await figma.clientStorage.setAsync(fileName, data);
}

export {
  getLocalPaintStyles,
  saveToLocalStorage,
  getLocalTextStyles,
  getLocalEffectStyles
};
