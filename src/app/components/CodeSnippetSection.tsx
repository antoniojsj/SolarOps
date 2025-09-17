import React, { useState, useEffect, FC, ReactElement, useMemo } from "react";

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

  // Create a clean copy of the node data without circular references
  const cleanNode = (data: any, seen = new WeakSet()): any => {
    if (typeof data !== "object" || data === null) return data;
    if (seen.has(data)) return "[Circular]";

    seen.add(data);

    if (Array.isArray(data)) {
      return data.map(item => cleanNode(item, seen));
    }

    const result: Record<string, any> = {};
    Object.keys(data).forEach(key => {
      // Skip internal properties and functions
      if (typeof data[key] === "function") return;
      if (key.startsWith("_")) return;

      result[key] = cleanNode(data[key], seen);
    });

    return result;
  };

  const cleanedNode = cleanNode(node);
  return JSON.stringify(cleanedNode, null, 2);
};

const extractCSS = (node: any): string => {
  if (!node) return "/* No styles found */";

  // Try different possible style properties
  const styles = node.styles || node.css || node.style || {};
  let css = "";

  // Group related CSS properties
  const propertyGroups: Record<string, [string, string | number][]> = {
    layout: [],
    spacing: [],
    typography: [],
    colors: [],
    borders: [],
    effects: [],
    other: []
  };

  // Convert styles object to CSS with grouping
  if (typeof styles === "object") {
    Object.entries(styles).forEach(([property, value]) => {
      if (value === undefined || value === null || value === "") return;

      const cssProperty = property.replace(/([A-Z])/g, "-$1").toLowerCase();
      const valueStr = String(value);

      // Categorize properties
      if (
        [
          "display",
          "position",
          "top",
          "right",
          "bottom",
          "left",
          "z-index",
          "overflow",
          "visibility"
        ].includes(cssProperty)
      ) {
        propertyGroups.layout.push([cssProperty, valueStr]);
      } else if (
        [
          "width",
          "height",
          "min-width",
          "max-width",
          "min-height",
          "max-height",
          "margin",
          "padding"
        ].some(p => cssProperty.startsWith(p))
      ) {
        propertyGroups.spacing.push([cssProperty, valueStr]);
      } else if (
        [
          "color",
          "background",
          "background-color",
          "background-image",
          "opacity"
        ].includes(cssProperty) ||
        cssProperty.includes("color") ||
        (typeof value === "string" &&
          (value.startsWith("#") ||
            value.startsWith("rgb") ||
            value.startsWith("hsl")))
      ) {
        propertyGroups.colors.push([cssProperty, valueStr]);
      } else if (
        [
          "font",
          "font-family",
          "font-size",
          "font-weight",
          "line-height",
          "text-align",
          "text-transform",
          "letter-spacing",
          "white-space"
        ].includes(cssProperty)
      ) {
        propertyGroups.typography.push([cssProperty, valueStr]);
      } else if (
        cssProperty.includes("border") ||
        cssProperty.includes("radius") ||
        cssProperty.includes("shadow")
      ) {
        propertyGroups.borders.push([cssProperty, valueStr]);
      } else if (
        cssProperty.includes("shadow") ||
        cssProperty.includes("filter") ||
        cssProperty.includes("transform")
      ) {
        propertyGroups.effects.push([cssProperty, valueStr]);
      } else {
        propertyGroups.other.push([cssProperty, valueStr]);
      }
    });

    // Generate CSS with comments for each group
    Object.entries(propertyGroups).forEach(([group, properties]) => {
      if (properties.length === 0) return;

      css += `\n  /* ${group.charAt(0).toUpperCase() + group.slice(1)} */\n`;

      properties.forEach(([prop, val]) => {
        // Add comments for important or complex values
        let comment = "";
        if (prop === "z-index" && Number(val) > 100) {
          comment = " /* High z-index, ensure this is intentional */";
        } else if (prop === "position" && val === "fixed") {
          comment = " /* Fixed positioning, may affect layout */";
        } else if (prop === "display" && val === "none") {
          comment = " /* Hides the element */";
        }

        css += `  ${prop}: ${val};${comment}\n`;
      });
    });

    // Add responsive design considerations
    if (propertyGroups.spacing.length > 0 || propertyGroups.layout.length > 0) {
      css += "\n  /* Responsive Design Considerations */";
      css += "\n  @media (max-width: 768px) {";
      css += "\n    /* Adjust for tablets and mobile */";

      // Make layout more mobile-friendly
      if (
        propertyGroups.layout.some(
          ([p, v]) => p === "flex-direction" && v !== "column"
        )
      ) {
        css += "\n    flex-direction: column;";
      }

      // Adjust spacing for mobile
      if (
        propertyGroups.spacing.some(
          ([p]) => p.startsWith("padding") || p.startsWith("margin")
        )
      ) {
        css += "\n    padding: 16px;";
        css += "\n    margin: 8px 0;";
      }

      // Ensure text is readable on mobile
      if (
        propertyGroups.typography.some(
          ([p]) => p === "font-size" || p === "line-height"
        )
      ) {
        css += "\n    font-size: 16px;";
        css += "\n    line-height: 1.5;";
      }

      css += "\n  }\n";
    }
  } else if (typeof styles === "string") {
    // If styles is already a string, use it directly with some formatting
    css = styles
      .split(";")
      .filter(Boolean)
      .map(prop => `  ${prop.trim()};`)
      .join("\n");
  }

  // Generate a meaningful selector based on node properties
  let selector = "." + (node.type || "component").toLowerCase();
  if (node.name) {
    selector += "-" + node.name.toLowerCase().replace(/\s+/g, "-");
  }

  return `${selector} {${css}\n}\n\n/* Add hover and focus states */\n${selector}:hover {\n  /* Add hover styles here */\n}\n\n${selector}:focus {\n  /* Add focus styles here */\n  outline: 2px solid #4d90fe;\n  outline-offset: 2px;\n}\n\n/* Accessibility improvements */\n${selector}[aria-disabled="true"] {\n  opacity: 0.6;\n  cursor: not-allowed;\n}\n\n/* Dark mode support */\n@media (prefers-color-scheme: dark) {\n  ${selector} {\n    /* Adjust colors for dark mode */\n    background-color: #2d2d2d;\n    color: #ffffff;\n  }\n}`;
};

const generateTypeScriptTypes = (node: any): string => {
  if (!node) return "// No node selected";

  const typeName = (node.type || "Node").replace(/[^a-zA-Z0-9]/g, "") + "Props";
  const properties: string[] = [];
  const imports = new Set<string>();

  // Add common properties
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

  // Add styles with detailed type information
  const styles = node.styles || node.style || {};
  if (Object.keys(styles).length > 0) {
    imports.add(`import { CSSProperties } from 'react';`);

    const styleProperties = Object.entries(styles)
      .filter(
        ([_, value]) => value !== undefined && value !== null && value !== ""
      )
      .map(([key]) => {
        const propName = key.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
        return `    /** CSS property: ${propName} */\n    ${key}?: string | number;`;
      });

    if (styleProperties.length > 0) {
      properties.push(
        "  /** Component styles */",
        "  style?: CSSProperties & {",
        ...styleProperties,
        "  } & React.CSSProperties;"
      );
    }
  }

  // Add children if node has children
  if (node.children && node.children.length > 0) {
    imports.add(`import { ReactNode } from 'react';`);
    properties.unshift("  /** Child components */\n  children?: ReactNode;");
  }

  // Add className prop
  properties.unshift("  /** CSS class name */\n  className?: string;");

  // Add event handlers if needed
  if (node.onClick || node.onHover) {
    properties.push(
      "  /** Click event handler */\n  onClick?: (event: React.MouseEvent<HTMLElement>) => void;",
      "  /** Hover event handler */\n  onMouseEnter?: (event: React.MouseEvent<HTMLElement>) => void;",
      "  /** Mouse leave event handler */\n  onMouseLeave?: (event: React.MouseEvent<HTMLElement>) => void;"
    );
  }

  const importStatements = Array.from(imports).join("\n");

  return `${importStatements}

/**
 * Props for the ${typeName.replace("Props", "")} component
 */
interface ${typeName} {
${properties.join("\n\n")}
}

/**
 * ${typeName.replace("Props", "")} component
 */
const ${typeName.replace("Props", "")}: React.FC<${typeName}> = ({
  className = '',
  style = {},
  children,
  ...props
}) => {
  return (
    <div 
      className={\`${(
        node.type || "component"
      ).toLowerCase()}-container \${className}\`}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
};

export default ${typeName.replace("Props", "")};`;
};

const generateHTML = (node: any, indent = 0, parentNode?: any): string => {
  if (!node) return "<!-- No node selected -->";

  const indentStr = "  ".repeat(indent);
  let tagName = "div";

  // Determine tag name based on node type and properties
  if (node.type) {
    const type = node.type.toLowerCase();
    tagName =
      type === "text"
        ? "span"
        : type === "image"
        ? "img"
        : type === "button"
        ? "button"
        : type === "input"
        ? "input"
        : type === "link" || node.href
        ? "a"
        : type;
  }

  const attributes: string[] = [];
  const classes: string[] = [];
  const styles: Record<string, any> = {};

  // Add ID if exists
  if (node.id) {
    attributes.push(`id="${node.id}"`);
  }

  // Add name as class if it exists
  if (node.name) {
    const nameClass = node.name
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .toLowerCase();
    if (nameClass) classes.push(nameClass);
  }

  // Add type-specific classes
  if (node.type) {
    classes.push(node.type.toLowerCase());
  }

  // Handle common HTML attributes
  const htmlAttributes: Record<string, string> = {
    type: node.type,
    href: node.href || node.url,
    target: node.target,
    rel: node.rel,
    title: node.title || node.name,
    alt: node.alt || node.name,
    placeholder: node.placeholder,
    value: node.value,
    disabled: node.disabled ? "disabled" : undefined,
    checked: node.checked ? "checked" : undefined,
    selected: node.selected ? "selected" : undefined,
    "aria-label": node.ariaLabel || node.name,
    role: node.role || (tagName === "button" ? "button" : undefined)
  };

  // Add valid HTML attributes
  Object.entries(htmlAttributes).forEach(([key, value]) => {
    if (value !== undefined && value !== "" && value !== false) {
      attributes.push(`${key}="${String(value).replace(/"/g, "&quot;")}"`);
    }
  });

  // Process styles from various possible locations
  const styleSources = [
    node.styles,
    node.style,
    node.css,
    node.props?.style,
    node.props?.css
  ];

  // Merge all style sources
  for (const style of styleSources) {
    if (style && typeof style === "object") {
      Object.assign(styles, style);
    }
  }

  // Add dimensions if they exist
  if (node.width) styles.width = `${node.width}px`;
  if (node.height) styles.height = `${node.height}px`;
  if (node.x !== undefined) styles.left = `${node.x}px`;
  if (node.y !== undefined) styles.top = `${node.y}px`;

  // Add flex properties if this is a flex container
  if (node.layoutMode) {
    styles.display = "flex";
    if (node.layoutMode === "HORIZONTAL") {
      styles.flexDirection = "row";
    } else if (node.layoutMode === "VERTICAL") {
      styles.flexDirection = "column";
    }
    if (node.itemSpacing) {
      styles.gap = `${node.itemSpacing}px`;
    }
  }

  // Add border radius if it exists
  if (node.cornerRadius) {
    styles.borderRadius =
      typeof node.cornerRadius === "number"
        ? `${node.cornerRadius}px`
        : node.cornerRadius;
  }

  // Add background color if it exists
  if (node.backgroundColor) {
    styles.backgroundColor = node.backgroundColor;
  } else if (node.fills && Array.isArray(node.fills)) {
    const fill = node.fills.find((f: any) => f.type === "SOLID");
    if (fill && fill.color) {
      const { r, g, b, a } = fill.color;
      styles.backgroundColor = `rgba(${Math.round(r * 255)}, ${Math.round(
        g * 255
      )}, ${Math.round(b * 255)}, ${a || 1})`;
    }
  }

  // Add text styles if they exist
  if (node.fontSize) styles.fontSize = `${node.fontSize}px`;
  if (node.fontFamily) styles.fontFamily = node.fontFamily;
  if (node.fontWeight) styles.fontWeight = node.fontWeight;
  if (node.textAlign) styles.textAlign = node.textAlign.toLowerCase();
  if (node.letterSpacing) styles.letterSpacing = `${node.letterSpacing}px`;
  if (node.lineHeight) {
    styles.lineHeight =
      typeof node.lineHeight === "number"
        ? `${node.lineHeight}px`
        : node.lineHeight;
  }

  // Add padding if it exists
  if (node.padding) {
    const p = node.padding;
    if (typeof p === "number") {
      styles.padding = `${p}px`;
    } else if (typeof p === "object") {
      styles.paddingTop = `${p.top || 0}px`;
      styles.paddingRight = `${p.right || 0}px`;
      styles.paddingBottom = `${p.bottom || 0}px`;
      styles.paddingLeft = `${p.left || 0}px`;
    }
  }

  // Add margin if it exists
  if (node.margin) {
    const m = node.margin;
    if (typeof m === "number") {
      styles.margin = `${m}px`;
    } else if (typeof m === "object") {
      styles.marginTop = `${m.top || 0}px`;
      styles.marginRight = `${m.right || 0}px`;
      styles.marginBottom = `${m.bottom || 0}px`;
      styles.marginLeft = `${m.left || 0}px`;
    }
  }

  // Add border if it exists
  if (node.stroke || (node.border && node.border.width > 0)) {
    const border = node.stroke || node.border;
    if (border) {
      const { width = 1, color = "#000000" } = border;
      const borderColor = color.startsWith("#")
        ? color
        : `rgba(${Math.round(color.r * 255)}, ${Math.round(
            color.g * 255
          )}, ${Math.round(color.b * 255)}, ${color.a || 1})`;

      styles.border = `${width}px solid ${borderColor}`;
    }
  }

  // Add box shadow if it exists
  if (node.effects && node.effects.length > 0) {
    const shadow = node.effects.find(
      (e: any) => e.type === "DROP_SHADOW" || e.type === "INNER_SHADOW"
    );
    if (shadow) {
      const { color, offset, radius, spread } = shadow;
      const shadowColor = color.startsWith("#")
        ? color
        : `rgba(${Math.round(color.r * 255)}, ${Math.round(
            color.g * 255
          )}, ${Math.round(color.b * 255)}, ${color.a || 1})`;

      const shadowStr = `${offset?.x || 0}px ${offset?.y || 0}px ${radius ||
        0}px ${spread || 0}px ${shadowColor}`;
      styles.boxShadow =
        shadow.type === "INNER_SHADOW" ? `inset ${shadowStr}` : shadowStr;
    }
  }

  // Add opacity if it exists
  if (node.opacity !== undefined && node.opacity !== 1) {
    styles.opacity = node.opacity;
  }

  // Add transform if it exists
  if (node.rotation) {
    styles.transform = `rotate(${node.rotation}deg)`;
  }

  // Add position if it exists
  if (node.position) {
    styles.position = node.position;
  }

  // Add z-index if it exists
  if (node.zIndex !== undefined) {
    styles.zIndex = node.zIndex;
  }

  // Add overflow if it exists
  if (node.overflow) {
    styles.overflow = node.overflow.toLowerCase();
  }

  // Add display property if it exists
  if (node.display) {
    styles.display = node.display;
  }

  // Add flex properties if they exist
  if (node.flex !== undefined) styles.flex = node.flex;
  if (node.flexGrow !== undefined) styles.flexGrow = node.flexGrow;
  if (node.flexShrink !== undefined) styles.flexShrink = node.flexShrink;
  if (node.flexBasis !== undefined) {
    styles.flexBasis =
      typeof node.flexBasis === "number"
        ? `${node.flexBasis}px`
        : node.flexBasis;
  }
  if (node.alignSelf) styles.alignSelf = node.alignSelf.toLowerCase();
  if (node.justifySelf) styles.justifySelf = node.justifySelf.toLowerCase();

  // Add grid properties if this is a grid container
  if (node.gridStyle) {
    styles.display = "grid";
    if (node.gridStyle.columnCount) {
      styles.gridTemplateColumns = `repeat(${node.gridStyle.columnCount}, 1fr)`;
    }
    if (node.gridStyle.rowCount) {
      styles.gridTemplateRows = `repeat(${node.gridStyle.rowCount}, 1fr)`;
    }
    if (node.gridStyle.columnGap) {
      styles.columnGap = `${node.gridStyle.columnGap}px`;
    }
    if (node.gridStyle.rowGap) {
      styles.rowGap = `${node.gridStyle.rowGap}px`;
    }
  }

  // Add grid item properties if they exist
  if (node.gridColumnStart !== undefined)
    styles.gridColumnStart = node.gridColumnStart;
  if (node.gridColumnEnd !== undefined)
    styles.gridColumnEnd = node.gridColumnEnd;
  if (node.gridRowStart !== undefined) styles.gridRowStart = node.gridRowStart;
  if (node.gridRowEnd !== undefined) styles.gridRowEnd = node.gridRowEnd;

  // Add text content if it exists
  let textContent = "";
  if (node.text || node.characters) {
    textContent = node.text || node.characters;
  }

  // Handle image elements
  if (tagName === "img") {
    if (node.src || node.url) {
      attributes.push(`src="${node.src || node.url}"`);
    } else if (node.fills && node.fills.length > 0) {
      const imageFill = node.fills.find((f: any) => f.type === "IMAGE");
      if (imageFill?.imageRef) {
        attributes.push(`src="${imageFill.imageRef}"`);
      }
    }
    if (!attributes.some(attr => attr.startsWith("alt="))) {
      attributes.push('alt=""');
    }
  }

  // Handle input elements
  if (tagName === "input") {
    if (node.type === "checkbox" || node.type === "radio") {
      if (node.checked) {
        attributes.push("checked");
      }
    } else if (
      node.type === "text" ||
      node.type === "password" ||
      node.type === "email"
    ) {
      if (node.placeholder) {
        attributes.push(`placeholder="${node.placeholder}"`);
      }
      if (node.value) {
        attributes.push(`value="${node.value}"`);
      }
    }
  }

  // Handle button elements
  if (tagName === "button" && node.disabled) {
    attributes.push("disabled");
  }

  // Add styles to attributes if any exist
  if (Object.keys(styles).length > 0) {
    const styleString = Object.entries(styles)
      .filter(([_, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => `${k.replace(/([A-Z])/g, "-$1").toLowerCase()}: ${v};`)
      .join(" ");

    if (styleString) {
      attributes.push(`style="${styleString}"`);
    }
  }

  // Add class attribute if classes exist
  if (classes.length > 0) {
    attributes.unshift(`class="${classes.join(" ")}"`);
  }

  // Handle self-closing tags
  const selfClosingTags = ["img", "input", "br", "hr", "meta", "link"];
  const isSelfClosing = selfClosingTags.includes(tagName.toLowerCase());

  if (isSelfClosing) {
    return `${indentStr}<${tagName} ${attributes.join(" ")} />`;
  }

  // Handle children
  let childrenContent = "";
  if (
    node.children &&
    Array.isArray(node.children) &&
    node.children.length > 0
  ) {
    const childNodes = node.children
      .map((child: any) => generateHTML(child, indent + 1, node))
      .filter(Boolean);

    if (childNodes.length > 0) {
      childrenContent = `\n${childNodes.join("\n")}\n${indentStr}`;
    }
  }

  // If there's text content but no children, use the text content
  if (textContent && !childrenContent) {
    return `${indentStr}<${tagName} ${attributes.join(
      " "
    )}>${textContent}</${tagName}>`;
  }

  // If there are children, include them
  if (childrenContent) {
    return `${indentStr}<${tagName} ${attributes.join(
      " "
    )}>${childrenContent}</${tagName}>`;
  }

  // If there's text content and children, include both
  if (textContent) {
    return `${indentStr}<${tagName} ${attributes.join(
      " "
    )}>${textContent}</${tagName}>`;
  }

  // For empty elements, use self-closing tag if appropriate
  return `${indentStr}<${tagName} ${attributes.join(" ")}></${tagName}>`;
};

const CodeSnippetSection: FC<CodeSnippetSectionProps> = ({
  selectedNode
}): ReactElement => {
  const [snippets, setSnippets] = useState<CodeSnippet[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  // Get unique languages from snippets
  const languages = Array.from(new Set(snippets.map(s => s.language)));
  const filteredSnippets = selectedLanguage
    ? snippets.filter(s => s.language === selectedLanguage)
    : snippets;

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
          code: extractCSS(selectedNode)
        },
        {
          title: "HTML",
          language: "html",
          code: generateHTML(selectedNode) || "<div>No HTML available</div>"
        },
        {
          title: "TypeScript Types",
          language: "typescript",
          code: generateTypeScriptTypes(selectedNode)
        }
      ].filter(snippet => {
        // Only include snippets that have actual content
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

  // Carrega os snippets quando o nó selecionado mudar
  useEffect(() => {
    loadSnippets();
  }, [selectedNode]);

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
