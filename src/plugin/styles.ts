// Functions for getting styles from files.

// Tipos do Figma
type BaseStyle = {
  id: string;
  name: string;
  key: string;
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
  clientStorage: {
    setAsync: (key: string, value: any) => Promise<void>;
  };
  readonly mixed: unique symbol;
};

async function getLocalPaintStyles() {
  const paintStyles = await figma.getLocalPaintStyles();
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
}

async function getLocalTextStyles() {
  const textStyles = await figma.getLocalTextStyles();
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
}

async function getLocalEffectStyles() {
  const effectStyles = await figma.getLocalEffectStyles();
  const effectStylesData = effectStyles.map(style => ({
    id: style.id,
    name: style.name,
    effects: style.effects || []
  }));

  return effectStylesData;
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
