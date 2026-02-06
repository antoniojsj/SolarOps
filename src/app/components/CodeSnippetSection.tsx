import React, { useState, useEffect, FC, ReactElement } from "react";

interface CodeSnippet {
  language: string;
  code: string;
  title: string;
}

interface CodeSnippetSectionProps {
  selectedNode: any;
}

const formatNodeData = (node: any): string => {
  if (!node) return "";

  const cleanNode = (data: any, seen = new WeakSet()): any => {
    if (typeof data !== "object" || data === null) return data;
    if (seen.has(data)) return "[Circular]";

    seen.add(data);

    if (Array.isArray(data)) {
      return data.map(item => cleanNode(item, seen));
    }

    const result: Record<string, any> = {};
    Object.keys(data).forEach(key => {
      if (typeof data[key] === "function") return;
      if (key.startsWith("_")) return;

      result[key] = cleanNode(data[key], seen);
    });

    return result;
  };

  const cleanedNode = cleanNode(node);
  return JSON.stringify(cleanedNode, null, 2);
};

const toKebabCase = (str: string) => {
  if (!str) return "";
  return str
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
};

const extractImprovedCSS = (node: any, parentNode?: any): string => {
  if (!node) return "";

  const nodeName = toKebabCase(node.name || node.type || "unnamed");
  const baseClass = parentNode
    ? `${toKebabCase(parentNode.name || parentNode.type)}__${nodeName}`
    : nodeName;

  let css = "";
  const styles: Record<string, any> = {};

  // Positioning
  if (node.absoluteBoundingBox) {
    styles.position = "absolute";
    styles.left = `${node.absoluteBoundingBox.x -
      (parentNode?.absoluteBoundingBox?.x || 0)}px`;
    styles.top = `${node.absoluteBoundingBox.y -
      (parentNode?.absoluteBoundingBox?.y || 0)}px`;
    styles.width = `${node.absoluteBoundingBox.width}px`;
    styles.height = `${node.absoluteBoundingBox.height}px`;
  }

  if (node.layoutMode) {
    styles.display = "flex";
    styles.flexDirection = node.layoutMode === "HORIZONTAL" ? "row" : "column";
    if (node.itemSpacing) styles.gap = `${node.itemSpacing}px`;
  }

  if (node.fills && Array.isArray(node.fills) && node.fills.length > 0) {
    const fill = node.fills.find((f: any) => f.type === "SOLID" && f.visible);
    if (fill && fill.color) {
      const { r, g, b, a } = fill.color;
      styles.backgroundColor = `rgba(${Math.round(r * 255)}, ${Math.round(
        g * 255
      )}, ${Math.round(b * 255)}, ${fill.opacity ?? a ?? 1})`;
    }
  }

  if (node.strokes && Array.isArray(node.strokes) && node.strokeWeight > 0) {
    const stroke = node.strokes.find((s: any) => s.type === "SOLID");
    if (stroke && stroke.color) {
      const { r, g, b, a } = stroke.color;
      styles.border = `${node.strokeWeight}px solid rgba(${Math.round(
        r * 255
      )}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a || 1})`;
    }
  }

  if (node.cornerRadius) styles.borderRadius = `${node.cornerRadius}px`;

  if (node.padding) {
    styles.padding = `${node.padding.top || 0}px ${node.padding.right ||
      0}px ${node.padding.bottom || 0}px ${node.padding.left || 0}px`;
  }

  if (node.effects && node.effects.length > 0) {
    const shadows = node.effects
      .filter((e: any) => e.type === "DROP_SHADOW" && e.visible)
      .map((e: any) => {
        const { color, offset, radius } = e;
        const { r, g, b, a } = color;
        return `${offset.x}px ${offset.y}px ${radius}px rgba(${Math.round(
          r * 255
        )}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
      })
      .join(", ");

    if (shadows) styles.boxShadow = shadows;

    const blurs = node.effects
      .filter((e: any) => e.type === "LAYER_BLUR" && e.visible)
      .map((e: any) => `blur(${e.radius}px)`)
      .join(" ");

    if (blurs) styles.filter = blurs;
  }

  if (node.type === "TEXT") {
    if (node.fills && Array.isArray(node.fills)) {
      const fill = node.fills.find((f: any) => f.type === "SOLID");
      if (fill && fill.color) {
        const { r, g, b, a } = fill.color;
        styles.color = `rgba(${Math.round(r * 255)}, ${Math.round(
          g * 255
        )}, ${Math.round(b * 255)}, ${a || 1})`;
      }
    }
    if (node.fontName)
      styles.fontFamily = `"${node.fontName.family}", sans-serif`;
    if (node.fontSize) styles.fontSize = `${node.fontSize}px`;
    if (node.fontWeight) styles.fontWeight = node.fontWeight;
    if (node.lineHeight)
      styles.lineHeight = `${node.lineHeight.value}${
        node.lineHeight.unit === "PIXELS" ? "px" : "%"
      }`;
    if (node.letterSpacing)
      styles.letterSpacing = `${node.letterSpacing.value}px`;
    if (node.textAlignHorizontal)
      styles.textAlign = node.textAlignHorizontal.toLowerCase();
  }

  if (Object.keys(styles).length > 0) {
    css += `.${baseClass} {
`;
    for (const [prop, value] of Object.entries(styles)) {
      css += `  ${prop.replace(/([A-Z])/g, "-$1").toLowerCase()}: ${value};
`;
    }
    css += `}

`;
  }

  if (node.children && Array.isArray(node.children)) {
    for (const child of node.children) {
      css += extractImprovedCSS(child, node);
    }
  }

  return css;
};

const generateImprovedHTML = (
  node: any,
  svgCode: string | null,
  indent = 0,
  parentNode?: any
): string => {
  if (!node) return "";

  const indentStr = "  ".repeat(indent);
  const nodeName = toKebabCase(node.name || node.type || "unnamed");
  const baseClass = parentNode
    ? `${toKebabCase(parentNode.name || parentNode.type)}__${nodeName}`
    : nodeName;

  let tagName = "div";
  const attributes = [`class="${baseClass}"`];
  let textContent = "";

  if (
    node.type === "VECTOR" ||
    node.type === "INSTANCE" ||
    node.type === "COMPONENT" ||
    (node.type === "FRAME" && svgCode)
  ) {
    return indentStr + svgCode;
  }

  if (node.type === "TEXT") {
    tagName = "p";
    textContent = node.characters || "";
  }

  let childrenContent = "";
  if (node.children && Array.isArray(node.children)) {
    childrenContent = node.children
      .map((child: any) => generateImprovedHTML(child, null, indent + 1, node))
      .filter(Boolean)
      .join("\n");
  }

  const selfClosingTags = ["img"];
  if (selfClosingTags.includes(tagName)) {
    return `${indentStr}<${tagName} ${attributes.join(" ")} />`;
  }

  if (childrenContent.trim() || textContent) {
    return `${indentStr}<${tagName} ${attributes.join(" ")}>
${
  textContent
    ? `${indentStr}  ${textContent}
`
    : ""
}${
      childrenContent
        ? `${childrenContent}
${indentStr}`
        : ""
    }</${tagName}>`;
  }

  return `${indentStr}<${tagName} ${attributes.join(" ")}></${tagName}>`;
};

const generateTypeScriptTypes = (node: any): string => {
  if (!node) return "// No node selected";

  const typeName = (node.type || "Node").replace(/[^a-zA-Z0-9]/g, "") + "Props";
  const properties: string[] = [];
  const imports = new Set<string>();

  if (node.id)
    properties.push(
      `  /** Unique identifier for the component */\n  id: string;`
    );

  if (node.name) {
    properties.push(`  /** Display name of the component */\n  name: string;`);
  }

  if (node.type) {
    properties.push(`  /** Type of the component */\n  type: '${node.type}';`);
  }

  if (node.children && node.children.length > 0) {
    imports.add(`import { ReactNode } from 'react';`);
    properties.unshift("  /** Child components */\n  children?: ReactNode;");
  }

  properties.unshift("  /** CSS class name */\n  className?: string;");

  const importStatements = Array.from(imports).join("\n");

  return `${importStatements}\n\n/**\n * Props for the ${typeName.replace(
    "Props",
    ""
  )} component\n */\ninterface ${typeName} {\n${properties.join("\n\n")}\n}`;
};

const CodeSnippetSection: FC<CodeSnippetSectionProps> = ({
  selectedNode
}): ReactElement => {
  const [snippets, setSnippets] = useState<CodeSnippet[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [svgCode, setSvgCode] = useState<string | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, nodeId, svg } = event.data.pluginMessage;
      if (type === "exported-node-svg" && nodeId === selectedNode?.id) {
        setSvgCode(svg);
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [selectedNode]);

  const loadSnippets = async (): Promise<void> => {
    if (!selectedNode) {
      setSnippets([]);
      return;
    }

    try {
      setIsLoading(true);

      const nodeSnippets: CodeSnippet[] = [
        {
          title: "Node Data",
          language: "json",
          code: formatNodeData(selectedNode)
        },
        {
          title: "CSS Styles",
          language: "css",
          code: extractImprovedCSS(selectedNode)
        },
        {
          title: "HTML",
          language: "html",
          code:
            generateImprovedHTML(selectedNode, svgCode) ||
            "<!-- No HTML available -->"
        },
        {
          title: "TypeScript Types",
          language: "typescript",
          code: generateTypeScriptTypes(selectedNode)
        }
      ].filter(snippet => {
        return (
          snippet.code &&
          snippet.code.trim() !== "" &&
          !snippet.code.includes("No styles found") &&
          !snippet.code.includes("No node selected")
        );
      });

      setSnippets(nodeSnippets);
      if (nodeSnippets.length > 0) {
        setSelectedLanguage(nodeSnippets[0].language);
      }
    } catch (error) {
      console.error("Erro ao carregar snippets:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedNode) {
      const exportableTypes = [
        "VECTOR",
        "INSTANCE",
        "COMPONENT",
        "FRAME",
        "RECTANGLE",
        "ELLIPSE",
        "POLYGON",
        "STAR",
        "LINE",
        "TEXT"
      ];
      if (exportableTypes.includes(selectedNode.type)) {
        parent.postMessage(
          {
            pluginMessage: {
              type: "export-node-as-svg",
              nodeId: selectedNode.id
            }
          },
          "*"
        );
      }
      loadSnippets();
    } else {
      setSnippets([]);
    }
  }, [selectedNode, svgCode]);

  if (!selectedNode) {
    return (
      <div
        style={{
          color: "#9e9e9e",
          fontStyle: "italic",
          padding: "16px",
          textAlign: "center",
          backgroundColor: "#252526",
          borderRadius: "4px",
          marginTop: "16px",
          border: "1px dashed #333"
        }}
      >
        Selecione um nó para visualizar ou editar os snippets.
      </div>
    );
  }

  const languages = Array.from(new Set(snippets.map(s => s.language)));
  const filteredSnippets = snippets.filter(
    s => !selectedLanguage || s.language === selectedLanguage
  );

  return (
    <div
      style={{
        marginTop: "16px",
        background: "#252526",
        borderRadius: "6px",
        border: "1px solid #333",
        overflow: "hidden",
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
      }}
    >
      <div
        style={{
          padding: "8px 12px",
          borderBottom: "1px solid #333",
          backgroundColor: "#2D2D2D",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "11px",
            fontWeight: 600,
            color: "#9CDCFE",
            textTransform: "uppercase",
            letterSpacing: "0.5px"
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M16 18l6-6-6-6"></path>
            <path d="M8 6l-6 6 6 6"></path>
          </svg>
          Snippets de Código
        </div>

        {languages.length > 0 && (
          <select
            value={selectedLanguage}
            onChange={e => setSelectedLanguage(e.target.value)}
            style={{
              padding: "6px 32px 6px 12px",
              borderRadius: "4px",
              backgroundColor: "#3c3c3c",
              color: "#e0e0e0",
              border: "1px solid #555",
              fontSize: "13px",
              cursor: "pointer",
              outline: "none",
              minWidth: "120px",
              marginLeft: "8px"
            }}
          >
            {languages.map(lang => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        )}
      </div>

      <div
        style={{
          maxHeight: "300px",
          overflowY: "auto",
          fontSize: "12px"
        }}
      >
        <div
          style={{
            width: "100%",
            color: "#D4D4D4"
          }}
        >
          {filteredSnippets.length > 0 ? (
            filteredSnippets.map((snippet, index) => (
              <div
                key={index}
                style={{
                  borderBottom: "1px solid #333",
                  backgroundColor: index % 2 === 0 ? "#252526" : "#2A2D2E",
                  padding: "12px",
                  position: "relative"
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: "4px",
                    right: "8px",
                    fontSize: "10px",
                    color: "#6b6b6b",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}
                >
                  {snippet.language}
                </div>
                <pre
                  style={{
                    margin: 0,
                    padding: "8px",
                    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    color: "#d4d4d4",
                    fontSize: "11px",
                    lineHeight: "1.4",
                    backgroundColor: "transparent",
                    borderRadius: "4px",
                    overflowX: "auto"
                  }}
                >
                  <code>{snippet.code}</code>
                </pre>
              </div>
            ))
          ) : (
            <div
              style={{
                padding: "16px",
                textAlign: "center",
                color: "#9e9e9e",
                fontStyle: "italic"
              }}
            >
              Nenhum snippet encontrado para esta linguagem.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CodeSnippetSection;
