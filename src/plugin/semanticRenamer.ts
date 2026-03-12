// Funções de ajuda (Helpers)

/**
 * Verifica se o nome é genérico (frame, component, números, etc)
 */
function isGenericName(name: string): boolean {
  const genericPatterns = [
    /^frame\s*\d*$/i, // frame, frame 1, frame 01
    /^component\s*\d*$/i, // component, component 1, component 01
    /^componente\s*\d*$/i, // componente, componente 1
    /^instance\s*\d*$/i, // instance, instance 1
    /^layer\s*\d*$/i, // layer, layer 1
    /^group\s*\d*$/i, // group, group 1
    /^artboard\s*\d*$/i, // artboard
    /^\d+$/, // só números (01, 02, 1, 2)
    /^\d+\.\d+$/, // números tipo 1.2, 2.5
    /^[a-z]+\s*\d+$/i, // qualquer palavra seguida de número
    /^rectangle\s*\d*$/i, // rectangle
    /^ellipse\s*\d*$/i, // ellipse
    /^polygon\s*\d*$/i, // polygon
    /^star\s*\d*$/i, // star
    /^vector\s*\d*$/i, // vector
    /^text\s*\d*$/i, // text
    /^line\s*\d*$/i // line
  ];

  return genericPatterns.some(pattern => pattern.test(name.trim()));
}

/**
 * Quebra uma string em camelCase ou PascalCase em palavras separadas.
 * Ex: "PrimaryButton" -> "Primary Button"
 */
function splitCamelCase(name: string): string {
  return name.replace(/([a-z])([A-Z])/g, "$1 $2");
}

/**
 * Extrai palavras-chave significativas de um nome de componente.
 * Para componentes, palavras como 'button', 'input', 'icon' são importantes.
 */
function extractComponentKeywords(name: string): string {
  // Se o nome for genérico, retorna vazio
  if (isGenericName(name)) {
    return "";
  }

  // Remove paths (ex: "Buttons/Primary")
  const cleanName = name
    .split("/")
    .pop()
    .trim();

  // Lista de palavras-chave importantes para componentes (oposto de stop words)
  const componentKeywords = [
    "button",
    "btn",
    "link",
    "input",
    "icon",
    "image",
    "img",
    "card",
    "modal",
    "dialog",
    "tooltip",
    "badge",
    "tag",
    "avatar",
    "chip",
    "checkbox",
    "radio",
    "toggle",
    "switch",
    "slider",
    "dropdown",
    "select",
    "textfield",
    "textarea",
    "search",
    "menu",
    "tab",
    "header",
    "footer",
    "sidebar",
    "navbar",
    "breadcrumb",
    "pagination",
    "loader",
    "spinner",
    "progress",
    "alert",
    "toast",
    "notification"
  ];

  const lowerName = cleanName.toLowerCase();

  // Procura por keywords no nome (camelCase ou separado)
  const normalizedName = splitCamelCase(cleanName).toLowerCase();
  const words = normalizedName.split(/[\s\-_\.]+/);

  // Encontra a primeira keyword que existe no nome
  for (const keyword of componentKeywords) {
    if (lowerName.includes(keyword)) {
      // Extrai a palavra exata como aparece (ou próxima)
      const matchingWord = words.find(
        w => w.includes(keyword) || keyword.includes(w)
      );
      if (matchingWord && matchingWord.length > 1) {
        return keyword; // Usa a keyword padronizada
      }
    }
  }

  // Se não encontrou keyword, usa o nome limpo (sem stop words genéricas)
  const stopWords = [
    "component",
    "instance",
    "frame",
    "group",
    "layer",
    "element",
    "item"
  ];
  const filteredWords = words.filter(
    w => w.length > 1 && !stopWords.includes(w)
  );

  return filteredWords.join("-");
}

/**
 * Limpa e sanitiza um nome para ser usado como classe CSS.
 */
function generateClassName(name: string): string {
  // Se o nome for genérico, não tentar extrair classe dele
  if (isGenericName(name)) {
    return "";
  }

  const stopWords = [
    "button",
    "btn",
    "link",
    "input",
    "icon",
    "image",
    "img",
    "section",
    "header",
    "nav",
    "main",
    "footer",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "p",
    "span",
    "div",
    "frame",
    "group",
    "component",
    "instance",
    "artboard",
    "layer",
    "row",
    "container"
  ];

  const processedName = splitCamelCase(name)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ") // Substitui caracteres não-alfanuméricos por espaços
    .split(/\s+/) // Quebra por um ou mais espaços
    .filter(word => word.length > 1 && !stopWords.includes(word))
    .slice(0, 2) // Limita a 2 palavras para evitar nomes muito longos
    .join("-");

  return processedName;
}

// Funções de Determinação de Tag (Tag Determination)

async function determineTagForText(node: TextNode): Promise<string> {
  if (node.fontSize === figma.mixed) return "span";
  const fontSize = node.fontSize;
  if (fontSize >= 40) return "h1";
  if (fontSize >= 32) return "h2";
  if (fontSize >= 24) return "h3";
  if (fontSize >= 18) return "h4";
  if (fontSize >= 16) return "p";
  return "span";
}

function determineTagForFrame(node: FrameNode): string {
  if (node.layoutMode === "VERTICAL") return "section";
  if (node.layoutMode === "HORIZONTAL") return "div";
  return "div";
}

async function determineTag(node: SceneNode): Promise<string> {
  // Prioridade MÁXIMA: Se o nó é um Componente ou Instância.
  if (node.type === "COMPONENT" || node.type === "INSTANCE") {
    return "component";
  }

  const lowerCaseName = node.name.toLowerCase();

  // Prioridade 2: Padrões no nome que indicam interatividade.
  if (lowerCaseName.includes("button") || lowerCaseName.includes("btn"))
    return "button";
  if (lowerCaseName.includes("link")) return "a";
  if (lowerCaseName.includes("input")) return "input";
  if (lowerCaseName.includes("icon")) return "icon";

  // Prioridade 3: Outros tipos de nó e suas propriedades.
  switch (node.type) {
    case "TEXT":
      return await determineTagForText(node);
    case "FRAME":
    case "GROUP":
      return determineTagForFrame(node as FrameNode);
    case "RECTANGLE":
      return node.fills &&
        Array.isArray(node.fills) &&
        node.fills.some(fill => fill.type === "IMAGE")
        ? "img"
        : "div";
  }

  return "div"; // Fallback padrão
}

// Lógica Principal de Renomeação (Main Rename Logic)

/**
 * Verifica se um nome já está no formato semântico válido
 * para evitar reprocessar layers já renomeadas
 */
function isAlreadySemanticFormat(name: string, tag: string): boolean {
  // Padrões válidos: "div", "section.header", "component.button", "h1", etc
  const validTags = [
    "div",
    "section",
    "h1",
    "h2",
    "h3",
    "h4",
    "p",
    "span",
    "button",
    "a",
    "input",
    "img",
    "icon",
    "component"
  ];

  // Se é apenas a tag (ex: "div", "h1")
  if (name.toLowerCase() === tag.toLowerCase()) {
    return true;
  }

  // Se está no formato tag.classe (ex: "section.header", "component.button")
  const semanticPattern = new RegExp(`^${tag}\\.[a-z][a-z0-9-]*$`, "i");
  if (semanticPattern.test(name)) {
    return true;
  }

  // Se é outro formato semântico válido (outra tag conhecida)
  for (const validTag of validTags) {
    if (validTag === tag) continue;
    const otherTagPattern = new RegExp(
      `^${validTag}(\\.[a-z][a-z0-9-]*)?$`,
      "i"
    );
    if (otherTagPattern.test(name)) {
      return true;
    }
  }

  return false;
}

async function getNewNameForNode(node: SceneNode): Promise<string> {
  const currentName = node.name.trim();
  const tag = await determineTag(node);

  // Se já está em formato semântico válido, não renomeia
  if (isAlreadySemanticFormat(currentName, tag)) {
    return currentName;
  }

  // Caso especial para Componentes
  if (tag === "component") {
    const componentName = currentName
      .split("/")
      .pop()
      .trim();

    // Extrai keywords específicas para componentes (button, input, etc)
    const className = extractComponentKeywords(componentName);

    // Se não gerou classe válida, verifica se já está no formato correto
    if (!className) {
      // Verifica se já é 'component' ou 'component.xxx' válido
      const componentPattern = /^component(\.[a-z][a-z0-9-]*)?$/i;
      if (componentPattern.test(currentName)) {
        return currentName;
      }
      return "component";
    }

    const candidateName = `component.${className}`;

    // Evita renomear se já estiver correto (component.xxx)
    if (currentName.toLowerCase() === candidateName.toLowerCase()) {
      return currentName;
    }

    // Se já tem formato component.xxx, mas classe diferente, atualiza
    const existingComponentPattern = /^component\.[a-z][a-z0-9-]*$/i;
    if (existingComponentPattern.test(currentName)) {
      // Só atualiza se a classe for significativamente diferente
      const existingClass = currentName.split(".")[1].toLowerCase();
      if (existingClass === className.toLowerCase()) {
        return currentName;
      }
    }

    return candidateName;
  }

  let className = generateClassName(currentName);

  // REGRA-CHAVE: Se a classe gerada contém a tag, é lixo e deve ser descartada.
  // Isso evita "section.section..." ou "button.primary-button".
  if (className.includes(tag)) {
    className = "";
  }

  const candidateName = className ? `${tag}.${className}` : tag;

  // Compara o nome candidato (em minúsculas) com o nome atual para decidir se renomeia.
  if (candidateName.toLowerCase() === currentName.toLowerCase()) {
    return currentName;
  }

  return candidateName;
}

/**
 * Função principal exportada.
 */
export async function renameLayersWithHtmlSemantics(): Promise<number> {
  const selection =
    figma.currentPage.selection.length > 0
      ? figma.currentPage.selection
      : figma.currentPage.children;

  let renamedCount = 0;
  const processedNodes = new Set<string>();

  async function traverseAndRename(nodes: readonly SceneNode[]) {
    for (const node of nodes) {
      if (processedNodes.has(node.id)) {
        continue;
      }
      processedNodes.add(node.id);

      const newName = await getNewNameForNode(node);
      if (node.name !== newName) {
        node.name = newName;
        renamedCount++;
      }

      if ("children" in node) {
        await traverseAndRename(node.children);
      }
    }
  }

  await traverseAndRename(selection);

  console.log(`Total de camadas renomeadas: ${renamedCount}`);
  return renamedCount;
}
