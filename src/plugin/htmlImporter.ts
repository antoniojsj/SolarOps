/// <reference types="@figma/plugin-typings" />

// Interface for color with alpha
interface RGBWithAlpha extends RGB {
  a?: number;
}

// Helper function to parse CSS and create styles
function parseCSS(cssText: string): { [key: string]: any } {
  const styles: { [key: string]: any } = {};

  // Simple CSS parser - this is a basic implementation
  const rules = cssText.split("}");
  rules.forEach(rule => {
    if (!rule.trim()) return;

    const [selector, ...declarations] = rule.split("{");
    if (!selector || !declarations.length) return;

    const style: { [key: string]: string } = {};
    const styleText = declarations.join("{").trim();

    styleText.split(";").forEach(declaration => {
      const [property, value] = declaration.split(":").map(s => s.trim());
      if (property && value) {
        style[property] = value;
      }
    });

    // Support selector lists like ".btn, .btn-primary"
    const selectorList = selector.split(",");
    selectorList.forEach(rawSelector => {
      const cleanSelector = rawSelector.trim();
      if (cleanSelector && Object.keys(style).length > 0) {
        // Merge styles if the selector was already defined earlier
        styles[cleanSelector] = {
          ...(styles[cleanSelector] || {}),
          ...style
        };
      }
    });
  });

  return styles;
}

// Helper to create a rectangle with styles
function createStyledRectangle(
  node: FrameNode | ComponentNode | RectangleNode,
  styles: any
) {
  if (!styles) return;

  // Helper to read a style with both camelCase and kebab-case variants
  const getStyle = (keys: string[]): string | undefined => {
    for (const key of keys) {
      if (styles[key] !== undefined) return styles[key];
    }
    return undefined;
  };

  // Handle background color
  const background = getStyle([
    "background",
    "backgroundColor",
    "background-color"
  ]);
  if (background) {
    const color = background;
    const parsedColor = parseColor(color);
    if (parsedColor) {
      const paint: SolidPaint = {
        type: "SOLID",
        color: {
          r: parsedColor.r,
          g: parsedColor.g,
          b: parsedColor.b
        },
        opacity: parsedColor.a || 1
      };
      node.fills = [paint];
    }
  }

  // Handle border
  const borderWidthValue = getStyle(["borderWidth", "border-width"]);
  const borderColorValue = getStyle(["borderColor", "border-color", "border"]);
  if (borderWidthValue || borderColorValue) {
    const borderWidth = parseInt(borderWidthValue || "1", 10) || 1;
    const borderColor = borderColorValue || "#000000";
    const parsedBorderColor = parseColor(borderColor);

    if (parsedBorderColor) {
      node.strokes = [
        {
          type: "SOLID",
          color: {
            r: parsedBorderColor.r,
            g: parsedBorderColor.g,
            b: parsedBorderColor.b
          },
          opacity: parsedBorderColor.a || 1
        }
      ];
      node.strokeWeight = borderWidth;
    }
  }

  // Handle border radius
  const borderRadiusValue = getStyle(["borderRadius", "border-radius"]);
  if (borderRadiusValue) {
    const radius = parseInt(borderRadiusValue, 10) || 0;
    if (radius > 0) {
      node.cornerRadius = radius;
    }
  }
}

// Helper to parse color from various formats
function parseColor(colorStr: string): RGBWithAlpha | null {
  if (!colorStr) return null;

  // Handle named colors
  const namedColors: {
    [key: string]: { r: number; g: number; b: number; a?: number };
  } = {
    black: { r: 0, g: 0, b: 0 },
    white: { r: 1, g: 1, b: 1 },
    red: { r: 1, g: 0, b: 0 },
    green: { r: 0, g: 0.5, b: 0 },
    blue: { r: 0, g: 0, b: 1 },
    yellow: { r: 1, g: 1, b: 0 },
    transparent: { r: 0, g: 0, b: 0, a: 0 }
  };

  // Check if it's a named color
  const lowerColorStr = colorStr.toLowerCase().trim();
  if (namedColors[lowerColorStr]) {
    return namedColors[lowerColorStr];
  }

  // Handle hex colors (#RRGGBB or #RGB)
  if (colorStr.startsWith("#")) {
    const hex = colorStr.substring(1);
    let r = 0,
      g = 0,
      b = 0,
      a = 1;

    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16) / 255;
      g = parseInt(hex[1] + hex[1], 16) / 255;
      b = parseInt(hex[2] + hex[2], 16) / 255;
    } else if (hex.length === 6) {
      r = parseInt(hex.substring(0, 2), 16) / 255;
      g = parseInt(hex.substring(2, 4), 16) / 255;
      b = parseInt(hex.substring(4, 6), 16) / 255;
    } else if (hex.length === 8) {
      r = parseInt(hex.substring(0, 2), 16) / 255;
      g = parseInt(hex.substring(2, 4), 16) / 255;
      b = parseInt(hex.substring(4, 6), 16) / 255;
      a = parseInt(hex.substring(6, 8), 16) / 255;
    }

    return { r, g, b, a };
  }

  // Handle rgb() and rgba()
  const rgbMatch = colorStr.match(
    /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/i
  );
  if (rgbMatch) {
    const r = Math.min(255, parseInt(rgbMatch[1], 10)) / 255;
    const g = Math.min(255, parseInt(rgbMatch[2], 10)) / 255;
    const b = Math.min(255, parseInt(rgbMatch[3], 10)) / 255;
    const a = rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1;
    return { r, g, b, a };
  }

  return null;
}

// Simple HTML parser that works in Figma's environment
function parseHTML(
  html: string
): {
  tag: string;
  text?: string;
  children: any[];
  attributes: Record<string, string>;
} {
  try {
    // Normalize line endings and remove unnecessary whitespace
    html = html.replace(/\r\n|\r/g, "\n").trim();

    // Remove script and style tags for security
    html = html.replace(
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      ""
    );
    html = html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

    // If the HTML doesn't have a root element, wrap it in a div
    if (!/^<[a-z][\s\S]*>$/i.test(html.trim())) {
      html = `<div>${html}</div>`;
    }

    // Create a root node
    const root = { tag: "div", children: [], attributes: {} };
    const stack: any[] = [root];

    // Regular expressions for parsing tags and attributes
    const tagRegex = /<\/?([a-z][^\s>]*)([^>]*)>/gi;
    const attrRegex = /(\w+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+)))?/g;

    let lastIndex = 0;
    let match;

    // Process all tags
    while ((match = tagRegex.exec(html)) !== null) {
      const fullMatch = match[0];
      const tagName = match[1].toLowerCase();
      const isClosing = fullMatch.startsWith("</");
      const isSelfClosing =
        fullMatch.endsWith("/>") ||
        [
          "img",
          "br",
          "hr",
          "input",
          "meta",
          "link",
          "meta",
          "!doctype"
        ].includes(tagName);

      // Handle text content before the tag
      const textBefore = html.substring(lastIndex, match.index).trim();
      if (textBefore && stack.length > 0) {
        const parent = stack[stack.length - 1];
        if (textBefore !== "\n" && textBefore !== " ") {
          // Skip empty text nodes
          parent.children.push({
            tag: "#text",
            text: textBefore.replace(/\s+/g, " "), // Normalize whitespace
            children: [],
            attributes: {}
          });
        }
      }

      lastIndex = tagRegex.lastIndex;

      // Handle closing tag
      if (isClosing) {
        if (stack.length > 1) {
          stack.pop();
        }
        continue;
      }

      // Skip processing for self-closing tags or void elements
      const voidElements = [
        "area",
        "base",
        "br",
        "col",
        "embed",
        "hr",
        "img",
        "input",
        "link",
        "meta",
        "param",
        "source",
        "track",
        "wbr"
      ];
      if (isSelfClosing || voidElements.includes(tagName)) {
        const parent = stack[stack.length - 1];
        const node = {
          tag: tagName,
          attributes: {},
          children: []
        };

        // Parse attributes
        const attrs = match[2];
        let attrMatch;
        while ((attrMatch = attrRegex.exec(attrs)) !== null) {
          const name = attrMatch[1].toLowerCase();
          const value = (
            attrMatch[2] ||
            attrMatch[3] ||
            attrMatch[4] ||
            ""
          ).replace(/^['"]|['"]$/g, "");
          if (name && value !== undefined) {
            node.attributes[name] = value;
          }
        }

        parent.children.push(node);
        continue;
      }

      // Handle opening tag
      const node = {
        tag: tagName,
        attributes: {},
        children: []
      };

      // Parse attributes
      const attrs = match[2];
      let attrMatch;
      while ((attrMatch = attrRegex.exec(attrs)) !== null) {
        const name = attrMatch[1].toLowerCase();
        const value = (
          attrMatch[2] ||
          attrMatch[3] ||
          attrMatch[4] ||
          ""
        ).replace(/^['"]|['"]$/g, "");
        if (name && value !== undefined) {
          node.attributes[name] = value;
        }
      }

      // Add to parent and push to stack
      if (stack.length > 0) {
        const parent = stack[stack.length - 1];
        parent.children.push(node);
      }

      // Only push to stack if not a void element
      if (!voidElements.includes(tagName)) {
        stack.push(node);
      }
    }

    // Handle any remaining text
    const remainingText = html.substring(lastIndex).trim();
    if (remainingText && stack.length > 0) {
      const parent = stack[stack.length - 1];
      parent.children.push({
        tag: "#text",
        text: remainingText.replace(/\s+/g, " "), // Normalize whitespace
        children: [],
        attributes: {}
      });
    }

    // If we have more than one root element, wrap them in a div
    if (root.children.length > 1) {
      return {
        tag: "div",
        children: [...root.children],
        attributes: {}
      };
    }

    return root.children[0] || root;
  } catch (error) {
    console.error("Error parsing HTML:", error);
    // Return a minimal valid structure in case of error
    return {
      tag: "div",
      children: [
        {
          tag: "#text",
          text: "Error parsing HTML",
          children: [],
          attributes: {}
        }
      ],
      attributes: {}
    };
  }
}

// Helper function to parse inline styles
function parseInlineStyles(styleString: string): Record<string, string> {
  const styles: Record<string, string> = {};
  if (!styleString) return styles;

  const stylePairs = styleString.split(";");
  for (const pair of stylePairs) {
    const [key, value] = pair.split(":").map(s => s.trim());
    if (key && value) {
      styles[key] = value;
    }
  }
  return styles;
}

// Process a node and create corresponding Figma nodes
async function processNode(
  node: {
    tag: string;
    text?: string;
    children: any[];
    attributes: Record<string, string>;
    parent?: any;
  },
  parent: FrameNode | InstanceNode | ComponentNode | GroupNode,
  styles: any
) {
  console.log("Processing node:", node.tag, node);

  // Handle text nodes
  if (node.tag === "#text") {
    if (node.text && node.text.trim()) {
      try {
        const text = figma.createText();
        text.characters = node.text.trim();

        // Load default font
        await figma.loadFontAsync({ family: "Inter", style: "Regular" });

        // Apply default styles
        text.fontSize = 14;
        text.fills = [{ type: "SOLID", color: { r: 0.1, g: 0.1, b: 0.1 } }];

        // Apply styles from parent or node attributes
        const nodeStyles = {
          ...(styles[parent.name?.toLowerCase()] || {}),
          ...(node.attributes.style
            ? parseInlineStyles(node.attributes.style)
            : {})
        };

        // Apply color if specified
        if (nodeStyles.color) {
          const color = parseColor(nodeStyles.color);
          if (color) {
            text.fills = [
              {
                type: "SOLID",
                color: { r: color.r, g: color.g, b: color.b },
                opacity: color.a || 1
              }
            ];
          }
        }

        // Apply font size if specified
        if (nodeStyles["font-size"]) {
          const fontSize = parseInt(nodeStyles["font-size"], 10);
          if (!isNaN(fontSize)) {
            text.fontSize = fontSize;
          }
        }

        // Apply font weight if specified
        if (nodeStyles["font-weight"]) {
          const fontWeight = nodeStyles["font-weight"];
          if (fontWeight === "bold") {
            await figma.loadFontAsync({ family: "Inter", style: "Bold" });
            text.fontName = { family: "Inter", style: "Bold" };
          }
        }

        // Apply text alignment if specified
        if (nodeStyles["text-align"]) {
          const align = nodeStyles["text-align"].toLowerCase();
          // We'll handle alignment by setting the parent's layout properties
          // since textAlignHorizontal is not available on all node types
          if (["left", "center", "right", "justified"].includes(align)) {
            // For text nodes, we can set textAlign on the node itself if it's supported
            if ("textAlign" in text) {
              text.textAlign = align.toUpperCase() as any;
            }
            // For the parent frame, we can set the alignment properties
            if ("primaryAxisAlignItems" in parent) {
              const alignMap: Record<
                string,
                "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN"
              > = {
                left: "MIN",
                center: "CENTER",
                right: "MAX",
                justified: "SPACE_BETWEEN"
              };
              parent.primaryAxisAlignItems = alignMap[align] || "MIN";
            }
          }
        }

        // Add text to parent
        if ("appendChild" in parent) {
          parent.appendChild(text);
          console.log("Text node added:", text.characters);
          return text;
        }
      } catch (error) {
        console.error("Error creating text node:", error);
      }
    }
    return null;
  }

  // Handle different HTML elements
  try {
    const tag = node.tag.toLowerCase();
    console.log(`Processing element: ${tag}`, node);

    // Skip unwanted tags
    if (["head", "script", "style", "meta", "link", "title"].includes(tag)) {
      console.log(`Skipping ${tag} element`);
      return;
    }

    // Get element styles from class, id, or tag
    const elementStyles = {
      // Default styles
      ...(styles[tag] || {}),
      // Class styles
      ...(node.attributes.class
        ? node.attributes.class.split(" ").reduce(
            (acc: any, cls: string) => ({
              ...acc,
              ...(styles[`.${cls}`] || {})
            }),
            {}
          )
        : {}),
      // ID styles
      ...(node.attributes.id ? styles[`#${node.attributes.id}`] || {} : {}),
      // Inline styles
      ...(node.attributes.style ? parseInlineStyles(node.attributes.style) : {})
    };

    console.log(`Computed styles for ${tag}:`, elementStyles);

    // Handle container elements
    if (
      [
        "div",
        "section",
        "header",
        "footer",
        "article",
        "main",
        "aside",
        "nav",
        "body",
        "html"
      ].includes(tag)
    ) {
      await createFrame(node, parent, { ...styles, ...elementStyles });
    }
    // Handle headings
    else if (["h1", "h2", "h3", "h4", "h5", "h6"].includes(tag)) {
      const headingLevel = parseInt(tag.substring(1), 10);
      const fontSize = 32 - (headingLevel - 1) * 4; // h1: 32px, h2: 28px, etc.
      await createText(
        {
          ...node,
          attributes: {
            ...node.attributes,
            style: `font-size: ${fontSize}px; font-weight: bold; ${node
              .attributes.style || ""}`
          }
        },
        parent,
        { ...styles, ...elementStyles }
      );
    }
    // Handle paragraphs and spans
    else if (["p", "span", "a", "strong", "em", "b", "i", "u"].includes(tag)) {
      await createText(node, parent, { ...styles, ...elementStyles });
    }
    // Handle buttons
    else if (tag === "button") {
      await createButton(node, parent, { ...styles, ...elementStyles });
    }
    // Handle images
    else if (tag === "img") {
      await createImage(node, parent, { ...styles, ...elementStyles });
    }
    // Handle lists
    else if (["ul", "ol", "li"].includes(tag)) {
      const listFrame = figma.createFrame();
      listFrame.name =
        tag === "li"
          ? "List Item"
          : tag === "ul"
          ? "Unordered List"
          : "Ordered List";
      listFrame.layoutMode = tag === "li" ? "HORIZONTAL" : "VERTICAL";
      listFrame.primaryAxisSizingMode = "AUTO";
      listFrame.counterAxisSizingMode = "AUTO";
      listFrame.itemSpacing = tag === "li" ? 8 : 4;
      listFrame.paddingLeft = tag === "ul" || tag === "ol" ? 20 : 0;

      // Add bullet for list items
      if (tag === "li") {
        const bullet = figma.createText();
        await figma.loadFontAsync({ family: "Inter", style: "Regular" });
        bullet.characters = "•";
        bullet.fontSize = 16;
        listFrame.appendChild(bullet);
      }

      if ("appendChild" in parent) {
        parent.appendChild(listFrame);
      }

      // Process children
      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
          await processNode(child, listFrame, { ...styles, ...elementStyles });
        }
      } else if (tag === "li" && node.text) {
        // Handle direct text content in list items
        const text = figma.createText();
        await figma.loadFontAsync({ family: "Inter", style: "Regular" });
        text.characters = node.text;
        text.fontSize = 14;
        listFrame.appendChild(text);
      }

      return;
    }
    // Handle other elements with children
    else if (node.children && node.children.length > 0) {
      console.log(
        `Creating container for ${tag} with ${node.children.length} children`
      );
      const frame = figma.createFrame();
      frame.name = tag;
      frame.layoutMode = "VERTICAL";
      frame.primaryAxisSizingMode = "AUTO";
      frame.counterAxisSizingMode = "AUTO";
      frame.itemSpacing = 8;
      frame.paddingTop = 8;
      frame.paddingRight = 8;
      frame.paddingBottom = 8;
      frame.paddingLeft = 8;

      // Apply background color if specified
      if (elementStyles["background-color"] || elementStyles["background"]) {
        const color = parseColor(
          elementStyles["background-color"] || elementStyles["background"]
        );
        if (color) {
          frame.fills = [
            {
              type: "SOLID",
              color: { r: color.r, g: color.g, b: color.b },
              opacity: color.a || 1
            }
          ];
        }
      }

      if ("appendChild" in parent) {
        parent.appendChild(frame);
        console.log(`Added ${tag} container`);
      }

      // Process children
      for (const child of node.children) {
        await processNode(child, frame, { ...styles, ...elementStyles });
      }
    }
  } catch (error) {
    console.error(`Error processing node ${node.tag}:`, error);
    return null;
  }
}

// Helper function to create a frame with styles
async function createFrame(
  node: any,
  parent: FrameNode | InstanceNode | ComponentNode | GroupNode,
  styles: any
) {
  try {
    const frame = figma.createFrame();
    frame.name = node.tag || "Frame";

    // Default layout
    frame.layoutMode = "VERTICAL";
    frame.primaryAxisSizingMode = "AUTO";
    frame.counterAxisSizingMode = "AUTO";
    frame.itemSpacing = 8;
    frame.paddingTop = 8;
    frame.paddingRight = 8;
    frame.paddingBottom = 8;
    frame.paddingLeft = 8;

    // Apply styles
    const elementStyles = styles;
    const getStyle = (keys: string[]): string | undefined => {
      for (const key of keys) {
        if (elementStyles[key] !== undefined) return elementStyles[key];
      }
      return undefined;
    };

    // Apply background color
    const background = getStyle([
      "background",
      "backgroundColor",
      "background-color"
    ]);
    if (background) {
      const color = parseColor(background);
      if (color) {
        frame.fills = [
          {
            type: "SOLID",
            color: { r: color.r, g: color.g, b: color.b },
            opacity: color.a || 1
          }
        ];
      }
    } else {
      // Default to transparent background
      frame.fills = [];
    }

    // Apply border
    const borderWidthValue = getStyle(["borderWidth", "border-width"]);
    const borderColorValue = getStyle([
      "borderColor",
      "border-color",
      "border"
    ]);
    if (borderWidthValue || borderColorValue) {
      const borderWidth = parseInt(borderWidthValue || "1", 10) || 1;
      const borderColor = borderColorValue || "#000000";
      const parsedBorderColor = parseColor(borderColor);

      if (parsedBorderColor) {
        frame.strokes = [
          {
            type: "SOLID",
            color: {
              r: parsedBorderColor.r,
              g: parsedBorderColor.g,
              b: parsedBorderColor.b
            },
            opacity: parsedBorderColor.a || 1
          }
        ];
        frame.strokeWeight = borderWidth;
      }
    }

    // Apply border radius
    const borderRadiusValue = getStyle(["borderRadius", "border-radius"]);
    if (borderRadiusValue) {
      const radius = parseInt(borderRadiusValue, 10) || 0;
      if (radius > 0) {
        frame.cornerRadius = radius;
      }
    }

    // Add to parent
    if ("appendChild" in parent) {
      parent.appendChild(frame);
    }

    // Process children
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        await processNode(child, frame, styles);
      }
    }

    return frame;
  } catch (error) {
    console.error("Error creating frame:", error);
    return null;
  }
}

// Helper function to create text elements
async function createText(
  node: any,
  parent: FrameNode | InstanceNode | ComponentNode | GroupNode,
  styles: any
) {
  try {
    const text = figma.createText();
    text.characters = node.children?.[0]?.text || node.text || "";

    // Load default font
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });

    // Apply default styles
    text.fontSize = 16;
    text.fills = [{ type: "SOLID", color: { r: 0.1, g: 0.1, b: 0.1 } }];

    // Apply styles
    const elementStyles = styles;
    const getStyle = (keys: string[]): string | undefined => {
      for (const key of keys) {
        if (elementStyles[key] !== undefined) return elementStyles[key];
      }
      return undefined;
    };

    // Apply color
    const colorValue = getStyle(["color"]);
    if (colorValue) {
      const color = parseColor(colorValue);
      if (color) {
        text.fills = [
          {
            type: "SOLID",
            color: { r: color.r, g: color.g, b: color.b },
            opacity: color.a || 1
          }
        ];
      }
    }

    // Apply font size
    const fontSizeValue = getStyle(["fontSize", "font-size"]);
    if (fontSizeValue) {
      const fontSize = parseInt(fontSizeValue, 10);
      if (!isNaN(fontSize)) {
        text.fontSize = fontSize;
      }
    }

    // Apply font weight
    const fontWeightValue = getStyle(["fontWeight", "font-weight"]);
    if (fontWeightValue) {
      const weight = fontWeightValue;
      if (weight === "bold" || parseInt(weight, 10) >= 600) {
        await figma.loadFontAsync({ family: "Inter", style: "Bold" });
        text.fontName = { family: "Inter", style: "Bold" };
      }
    }

    // Apply text alignment
    const textAlignValue = getStyle(["textAlign", "text-align"]);
    if (textAlignValue) {
      const align = textAlignValue.toLowerCase();
      if (["left", "center", "right", "justified"].includes(align)) {
        if ("textAlign" in text) {
          (text as any).textAlign = align.toUpperCase();
        }
      }
    }

    // Add to parent
    if ("appendChild" in parent) {
      parent.appendChild(text);
    }

    return text;
  } catch (error) {
    console.error("Error creating text element:", error);
    return null;
  }
}

// Helper function to create buttons
async function createButton(
  node: any,
  parent: FrameNode | InstanceNode | ComponentNode | GroupNode,
  styles: any
) {
  const button = figma.createFrame();
  button.name = "Button";

  // Default button styles
  button.layoutMode = "HORIZONTAL";
  button.primaryAxisSizingMode = "AUTO";
  button.counterAxisSizingMode = "AUTO";
  button.paddingTop = 8;
  button.paddingRight = 16;
  button.paddingBottom = 8;
  button.paddingLeft = 16;
  button.cornerRadius = 4;

  // Apply styles
  const elementStyles = styles.button || {};
  const getStyle = (keys: string[]): string | undefined => {
    for (const key of keys) {
      if (elementStyles[key] !== undefined) return elementStyles[key];
    }
    return undefined;
  };

  // Background color
  const background = getStyle([
    "background",
    "backgroundColor",
    "background-color"
  ]);
  if (background) {
    const color = background;
    const parsedColor = parseColor(color);
    if (parsedColor) {
      button.fills = [
        {
          type: "SOLID",
          color: { r: parsedColor.r, g: parsedColor.g, b: parsedColor.b },
          opacity: parsedColor.a || 1
        }
      ];
    } else {
      // Default button color
      button.fills = [
        {
          type: "SOLID",
          color: { r: 0.2, g: 0.4, b: 0.8 }
        }
      ];
    }
  }

  // Add text
  const text = figma.createText();
  text.characters = node.children?.[0]?.text || "Button";
  text.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
  await figma.loadFontAsync({ family: "Inter", style: "Medium" });
  text.fontSize = 14;

  button.appendChild(text);

  if ("appendChild" in parent) {
    parent.appendChild(button);
  }

  return button;
}

// Helper function to create image placeholders
async function createImage(
  node: any,
  parent: FrameNode | InstanceNode | ComponentNode | GroupNode,
  styles: any
) {
  try {
    // Create a rectangle as a placeholder for the image
    const image = figma.createRectangle();
    image.name = "Image";

    // Set default size
    image.resize(100, 100);

    // Apply styles
    const elementStyles = styles.img || {};
    const getStyle = (keys: string[]): string | undefined => {
      for (const key of keys) {
        if (elementStyles[key] !== undefined) return elementStyles[key];
      }
      return undefined;
    };

    // Apply border radius
    const borderRadiusValue = getStyle(["borderRadius", "border-radius"]);
    if (borderRadiusValue) {
      const radius = parseInt(borderRadiusValue, 10) || 0;
      image.cornerRadius = radius;
    }

    // Add alt text if available
    if (node.attributes.alt) {
      image.name = node.attributes.alt;
    }

    // Add to parent
    if ("appendChild" in parent) {
      parent.appendChild(image);
    }

    // In a real implementation, you would load the image here
    // For now, we'll just use a placeholder color
    image.fills = [
      {
        type: "SOLID",
        color: { r: 0.9, g: 0.9, b: 0.9 }
      }
    ];

    return image;
  } catch (error) {
    console.error("Error creating image:", error);
    return null;
  }
}

// Main function to import HTML/CSS
export async function importHTML(
  html: string,
  css: string
): Promise<FrameNode> {
  try {
    // Parse the HTML
    const doc = parseHTML(`<div>${html}</div>`);

    // Parse the CSS
    const styles = parseCSS(css);

    // Create a frame to hold the imported content
    const frame = figma.createFrame();
    frame.name = "Imported HTML";
    frame.layoutMode = "VERTICAL";
    frame.primaryAxisSizingMode = "AUTO";
    frame.counterAxisSizingMode = "AUTO";
    frame.itemSpacing = 0;
    frame.paddingTop = 20;
    frame.paddingRight = 20;
    frame.paddingBottom = 20;
    frame.paddingLeft = 20;

    // Process the root element's children
    if (doc.children && doc.children.length > 0) {
      for (const child of doc.children) {
        await processNode(child, frame, styles);
      }
    } else {
      // If no children, try to process the root node itself
      await processNode(doc, frame, styles);
    }

    // Auto-layout setup
    frame.layoutSizingHorizontal = "HUG";
    frame.layoutSizingVertical = "HUG";

    // Apply some default styling if the frame is empty
    if (frame.children.length === 0) {
      const text = figma.createText();
      text.characters = "No content to display";
      frame.appendChild(text);
      await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    }

    // Fit the frame to its contents
    frame.resizeWithoutConstraints(frame.width, frame.height);

    // Center the frame in the viewport
    frame.x = (figma.viewport.bounds.width - frame.width) / 2;
    frame.y = (figma.viewport.bounds.height - frame.height) / 2;

    // Select the new frame
    figma.currentPage.selection = [frame];
    figma.viewport.scrollAndZoomIntoView([frame]);

    console.log("HTML import completed successfully");

    return frame;
  } catch (error) {
    console.error("Error importing HTML:", error);
    throw error;
  }
}
