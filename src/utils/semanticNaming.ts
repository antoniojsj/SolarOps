/**
 * Utilitários para geração de nomes semânticos HTML
 * Compartilhado entre UI (React) e Plugin (Figma)
 */

export interface SemanticNode {
  id: string;
  name: string;
  type: string;
  children?: SemanticNode[];
  fontSize?: number;
  layoutMode?: string;
  fills?: any[];
  locked?: boolean;
}

/**
 * Extrai classe CSS do nome original
 */
export const extractClassName = (originalName: string): string => {
  if (!originalName) return "";

  const cleanName = originalName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return cleanName;
};

/**
 * Detecta semântica de texto baseada no tamanho da fonte
 */
export const getTextSemantic = (node: SemanticNode): string => {
  if (!node.fontSize) return "span";

  if (node.fontSize >= 40) return "h1";
  if (node.fontSize >= 32) return "h2";
  if (node.fontSize >= 24) return "h3";
  if (node.fontSize >= 18) return "h4";
  if (node.fontSize >= 16) return "p";

  return "span";
};

/**
 * Detecta elementos interativos pelo nome
 */
export const detectInteractiveElement = (nodeName: string): string | null => {
  const name = nodeName.toLowerCase();

  if (name.includes("button") || name.includes("btn")) return "button";
  if (name.includes("link")) return "a";
  if (name.includes("input")) return "input";
  if (name.includes("icon")) return "icon";

  return null;
};

/**
 * Retorna tag semântica HTML apropriada para um node
 */
export const getSemanticTag = (node: SemanticNode): string => {
  // Primeiro verificar se é um elemento interativo pelo nome
  const interactiveTag = detectInteractiveElement(node.name);
  if (interactiveTag) return interactiveTag;

  // Verificar tipo do node
  switch (node.type) {
    case "TEXT":
      return getTextSemantic(node);

    case "FRAME":
      if (node.layoutMode === "VERTICAL") return "section";
      if (node.layoutMode === "HORIZONTAL") return "div.row";
      return "div";

    case "GROUP":
      return "div";

    case "RECTANGLE":
      // Verificar se tem preenchimento de imagem
      if (node.fills && node.fills.length > 0) {
        const fill = node.fills[0];
        if (fill.type === "IMAGE") return "img";
      }
      return "div";

    case "COMPONENT":
    case "INSTANCE":
      const className = extractClassName(node.name);
      return `component.${className}`;

    default:
      return "div";
  }
};

/**
 * Gera novo nome semântico para um node
 */
export const generateSemanticName = (node: SemanticNode): string => {
  const tag = getSemanticTag(node);
  const className = extractClassName(node.name);

  // Se já tem prefixo component., manter
  if (tag.startsWith("component.")) return tag;

  // Se tem classe, usar formato tag.class
  if (className && !tag.includes(".")) {
    return `${tag}.${className}`;
  }

  return tag;
};
