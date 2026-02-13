import React, { useState, useEffect, FC, ReactElement } from "react";

interface CodeSnippet {
  language: string;
  code: string;
  title: string;
}

interface CodeSnippetSectionProps {
  selectedNode: any;
}

interface ColorPalette {
  primary?: string;
  secondary?: string;
  accent?: string;
  background?: string;
  text?: string;
  border?: string;
  [key: string]: string | undefined;
}

interface TailwindConfig {
  colors: ColorPalette;
  fonts: string[];
  borderRadius: Record<string, string>;
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

const rgbToHex = (r: number, g: number, b: number, a: number = 1): string => {
  const toHex = (n: number) => {
    const hex = Math.round(Math.max(0, Math.min(255, n * 255))).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;

  if (a < 1) {
    return `${hex}${toHex(a)}`;
  }

  return hex;
};

// Generate Tailwind configuration
const generateTailwindConfig = (node: any): TailwindConfig => {
  const palette = extractColorPalette(node);

  // Set defaults if not found
  const colors: ColorPalette = {
    primary: palette.primary || "#13ec5b",
    secondary: palette.secondary || "#6b7280",
    accent: palette.accent || "#f59e0b",
    "background-light": palette.background || "#f6f8f6",
    "background-dark":
      palette.text?.toLowerCase() === "#ffffff" ? "#102216" : "#1f2937",
    ...palette
  };

  return {
    colors,
    fonts: ["Manrope", "Segoe UI", "Roboto"],
    borderRadius: {
      DEFAULT: "0.25rem",
      lg: "0.5rem",
      xl: "0.75rem",
      full: "9999px"
    }
  };
};

// Convert Figma styles to Tailwind classes
const stylesToTailwindClasses = (
  node: any,
  config: TailwindConfig
): string[] => {
  const classes: string[] = [];

  if (!node) return classes;

  // Width/Height
  if (node.absoluteBoundingBox) {
    const width = Math.round(node.absoluteBoundingBox.width);
    const height = Math.round(node.absoluteBoundingBox.height);

    if (width > 0 && width <= 1280) {
      if (width < 100) classes.push(`w-${Math.round(width / 4)}`);
      else if (width < 500) classes.push(`max-w-${Math.round(width / 4)}`);
    }
    if (height > 0 && height <= 1000) {
      if (height < 100) classes.push(`h-${Math.round(height / 4)}`);
    }
  }

  // Flexbox
  if (node.layoutMode) {
    classes.push("flex");
    if (node.layoutMode === "HORIZONTAL") {
      classes.push("flex-row");
    } else {
      classes.push("flex-col");
    }

    if (node.itemSpacing && node.itemSpacing > 0) {
      const gap = Math.round(node.itemSpacing / 4);
      if (gap <= 16) classes.push(`gap-${gap}`);
    }

    if (node.layoutAlign === "CENTER") classes.push("justify-center");
    if (node.layoutAlign === "MAX") classes.push("justify-end");
    if (node.counterAxisAlignItems === "CENTER") classes.push("items-center");
    if (node.counterAxisAlignItems === "MAX") classes.push("items-end");
  }

  // Colors
  if (node.fills && Array.isArray(node.fills)) {
    const fill = node.fills.find(
      (f: any) => f.type === "SOLID" && f.visible !== false
    );
    if (fill && fill.color) {
      const hex = rgbToHex(
        fill.color.r || 0,
        fill.color.g || 0,
        fill.color.b || 0,
        fill.opacity ?? 1
      );
      if (hex === config.colors.primary) {
        classes.push("bg-primary");
      } else if (hex === config.colors.secondary) {
        classes.push("bg-secondary");
      } else {
        classes.push(`[background-color:${hex}]`);
      }
    }
  }

  // Border Radius
  if (node.cornerRadius) {
    const radius = Math.round(node.cornerRadius);
    if (radius < 5) classes.push("rounded");
    else if (radius < 10) classes.push("rounded-lg");
    else if (radius < 15) classes.push("rounded-xl");
    else classes.push("rounded-full");
  }

  // Padding
  if (node.padding) {
    const top = Math.round((node.padding.top || 0) / 4);
    const left = Math.round((node.padding.left || 0) / 4);
    if (top === left && top > 0 && top <= 16) {
      classes.push(`p-${top}`);
    } else {
      if (left > 0 && left <= 16) classes.push(`px-${left}`);
      if (top > 0 && top <= 16) classes.push(`py-${top}`);
    }
  }

  // Text styles
  if (node.type === "TEXT") {
    if (node.fontSize) {
      const size = Math.round(node.fontSize);
      if (size < 14) classes.push("text-xs");
      else if (size < 16) classes.push("text-sm");
      else if (size < 20) classes.push("text-base");
      else if (size < 24) classes.push("text-lg");
      else if (size < 30) classes.push("text-xl");
      else classes.push("text-2xl");
    }

    if (node.fontWeight) {
      if (node.fontWeight >= 700) classes.push("font-bold");
      else if (node.fontWeight >= 600) classes.push("font-semibold");
      else if (node.fontWeight >= 500) classes.push("font-medium");
    }

    if (node.textAlignHorizontal === "CENTER") classes.push("text-center");
    else if (node.textAlignHorizontal === "RIGHT") classes.push("text-right");
  }

  // Opacity
  if (node.opacity !== undefined && node.opacity < 1) {
    const opacityValue = Math.round(node.opacity * 10) * 10;
    if (opacityValue > 0 && opacityValue < 100) {
      classes.push(`opacity-${opacityValue}`);
    }
  }

  return classes;
};

// Extract better color palette from design (improved version)
const extractColorPalette = (
  node: any,
  palette: ColorPalette = {},
  depth = 0
): ColorPalette => {
  if (!node || depth > 10) return palette;

  // Extract from fills
  if (node.fills && Array.isArray(node.fills)) {
    const fill = node.fills.find(
      (f: any) => f.type === "SOLID" && f.visible !== false
    );
    if (fill && fill.color) {
      const color = fill.color;
      const opacity = fill.opacity ?? color.a ?? 1;
      const hex = rgbToHex(color.r || 0, color.g || 0, color.b || 0, opacity);

      const nodeName = (node.name || "").toLowerCase();

      // Try to identify color by name or appearance
      if (
        !palette.primary &&
        (nodeName.includes("primary") ||
          nodeName.includes("brand") ||
          nodeName.includes("accent") ||
          nodeName.includes("cta"))
      ) {
        palette.primary = hex;
      } else if (!palette.secondary && nodeName.includes("secondary")) {
        palette.secondary = hex;
      } else if (
        !palette.background &&
        (nodeName.includes("background") ||
          nodeName.includes("bg") ||
          nodeName.includes("surface"))
      ) {
        palette.background = hex;
      } else if (
        !palette.text &&
        (nodeName.includes("text") ||
          nodeName.includes("foreground") ||
          nodeName.includes("content"))
      ) {
        palette.text = hex;
      } else if (
        !palette.border &&
        (nodeName.includes("border") || nodeName.includes("stroke"))
      ) {
        palette.border = hex;
      }
    }
  }

  // Process children
  if (node.children && Array.isArray(node.children)) {
    node.children.forEach((child: any) => {
      extractColorPalette(child, palette, depth + 1);
    });
  }

  return palette;
};

// Better Tailwind generation from Figma node
const generateTailwindHTML = (node: any, config?: TailwindConfig): string => {
  if (!node) return "";

  // If node is empty or has no meaningful data, return a helping message
  if (!node.name && !node.type && Object.keys(node).length === 0) {
    return `<!DOCTYPE html>
<html class="light" lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>SolarOps</title>
  <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
</head>
<body class="bg-white">
  <main class="p-8">
    <p class="text-gray-600">⚠️ Element data not fully loaded. Please select an element again.</p>
  </main>
</body>
</html>`;
  }

  const palette = extractColorPalette(node);
  const tailwindConfig = config || {
    colors: {
      primary: palette.primary || "#13ec5b",
      secondary: palette.secondary || "#6b7280",
      accent: palette.accent || "#f59e0b",
      "background-light": palette.background || "#f6f8f6",
      "background-dark": "#102216"
    },
    fonts: ["Manrope", "Segoe UI", "Roboto"],
    borderRadius: {
      DEFAULT: "0.25rem",
      lg: "0.5rem",
      xl: "0.75rem",
      full: "9999px"
    }
  };

  const tailwindScript = `
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    colors: {
                        "primary": "${tailwindConfig.colors.primary}",
                        "secondary": "${tailwindConfig.colors.secondary}",
                        "accent": "${tailwindConfig.colors.accent}",
                        "background-light": "${tailwindConfig.colors["background-light"]}",
                        "background-dark": "${tailwindConfig.colors["background-dark"]}",
                    },
                    fontFamily: {
                        "display": ["Manrope", "sans-serif"]
                    },
                    borderRadius: {
                        "DEFAULT": "0.25rem",
                        "lg": "0.5rem",
                        "xl": "0.75rem",
                        "full": "9999px"
                    },
                },
            },
        }
    `;

  // Advanced Tailwind generation with comprehensive Figma API data extraction
  const buildHTML = (
    n: any,
    indent = 0,
    parentType?: string,
    depth = 0
  ): string => {
    if (!n || depth > 50) return "";

    const indentStr = "  ".repeat(indent);

    // ============ TEXT NODE HANDLING ============
    if (n.type === "TEXT") {
      // Extract the actual text content from the node
      const text = n.characters
        ? String(n.characters).trim()
        : n.content
        ? String(n.content).trim()
        : n.text
        ? String(n.text).trim()
        : n.name
        ? String(n.name).trim()
        : "";

      if (!text || text === "") return "";

      const classes: string[] = [];

      // === COLOR ===
      let textColor = "#000000";
      if (n.fills && Array.isArray(n.fills) && n.fills.length > 0) {
        const fill = n.fills.find(
          (f: any) => f.type === "SOLID" && f.visible !== false
        );
        if (fill && fill.color) {
          textColor = rgbToHex(
            (fill.color.r ?? 0) * 255,
            (fill.color.g ?? 0) * 255,
            (fill.color.b ?? 0) * 255,
            fill.opacity ?? 1
          );
          if (textColor !== "#ffffff" && textColor !== "#000000") {
            classes.push(`[color:${textColor}]`);
          }
        }
      }

      // === FONT SIZE ===
      const size = n.fontSize ?? 16;
      if (size < 12) classes.push("text-xs");
      else if (size < 14) classes.push("text-xs");
      else if (size < 16) classes.push("text-sm");
      else if (size < 18) classes.push("text-base");
      else if (size < 20) classes.push("text-lg");
      else if (size < 24) classes.push("text-xl");
      else if (size < 30) classes.push("text-2xl");
      else if (size < 36) classes.push("text-3xl");
      else if (size < 48) classes.push("text-4xl");
      else classes.push("text-5xl");

      // === FONT WEIGHT ===
      const weight = n.fontWeight ?? 400;
      if (weight >= 900) classes.push("font-black");
      else if (weight >= 700) classes.push("font-bold");
      else if (weight >= 600) classes.push("font-semibold");
      else if (weight >= 500) classes.push("font-medium");
      else if (weight < 400) classes.push("font-light");

      // === LETTER SPACING ===
      if (n.letterSpacing && n.letterSpacing !== 0) {
        if (n.letterSpacing < -2) classes.push("tracking-tighter");
        else if (n.letterSpacing < 0) classes.push("tracking-tight");
        else if (n.letterSpacing > 3) classes.push("tracking-wide");
        else if (n.letterSpacing > 1) classes.push("tracking-normal");
      }

      // === TEXT ALIGNMENT ===
      if (n.textAlignHorizontal) {
        if (n.textAlignHorizontal === "CENTER") classes.push("text-center");
        else if (n.textAlignHorizontal === "RIGHT") classes.push("text-right");
        else if (n.textAlignHorizontal === "JUSTIFIED")
          classes.push("text-justify");
      }

      // === TEXT DECORATION ===
      if (n.textDecoration === "UNDERLINE") classes.push("underline");
      if (n.textDecoration === "STRIKETHROUGH") classes.push("line-through");

      // === LINE HEIGHT ===
      if (n.lineHeight) {
        if (typeof n.lineHeight === "object" && n.lineHeight.value) {
          if (n.lineHeight.value < 1.2) classes.push("leading-tight");
          else if (n.lineHeight.value < 1.5) classes.push("leading-snug");
          else if (n.lineHeight.value > 2) classes.push("leading-loose");
          else classes.push("leading-relaxed");
        } else if (typeof n.lineHeight === "number" && n.lineHeight > 1.2) {
          classes.push("leading-relaxed");
        }
      }

      const classStr =
        classes.length > 0 ? ` class="${classes.join(" ")}"` : "";
      const contentText = escapeHtml(text);

      // Choose heading vs paragraph based on size and weight
      if (size > 24 || weight >= 700 || text.length < 50) {
        return `${indentStr}<h3${classStr}>${contentText}</h3>`;
      }
      return `${indentStr}<p${classStr}>${contentText}</p>`;
    }

    // ============ IMAGE NODE HANDLING ============
    if (n.type === "IMAGE") {
      const classes = ["w-full", "h-auto", "rounded-lg", "object-cover"];

      // Get aspect ratio from bounding box
      if (n.absoluteBoundingBox) {
        const width = n.absoluteBoundingBox.width;
        const height = n.absoluteBoundingBox.height;
        if (height > 0) {
          const aspect = width / height;
          if (aspect > 2) classes.push("aspect-video");
          else if (aspect > 1.5) classes.push("aspect-landscape");
          else if (aspect < 0.7) classes.push("aspect-portrait");
        }
      }

      const classStr = ` class="${classes.join(" ")}"`;
      const altText = (n.name || "Image").substring(0, 100);
      return `${indentStr}<img${classStr} alt="${escapeHtml(
        altText
      )}" src="https://via.placeholder.com/800x600" />`;
    }

    // ============ NODE NAME ANALYSIS ============
    const nodeName = String(n.name || "").toLowerCase();

    // Determine semantic HTML tag
    let tagName = "div";
    let isContainer = false;

    const tagMap: Record<string, [string, boolean]> = {
      "button|btn|cta": ["button", false],
      "link|anchor": ["a", false],
      "header|navbar": ["header", true],
      "nav|navigation": ["nav", true],
      footer: ["footer", true],
      "hero|banner|section": ["section", true],
      "card|item|product": ["article", true],
      "list|menu": ["ul", true],
      form: ["form", true],
      "input|field|textbox": ["input", false]
    };

    for (const [pattern, [tag, isCtainer]] of Object.entries(tagMap)) {
      const patterns = pattern.split("|");
      if (patterns.some(p => nodeName.includes(p))) {
        tagName = tag;
        isContainer = isCtainer;
        break;
      }
    }

    // Default to container if has layout mode
    if (
      !isContainer &&
      (n.layoutMode || (n.children && n.children.length > 0))
    ) {
      isContainer = true;
    }

    // ============ BUILD CLASSES ============
    const classes: string[] = [];

    // === BACKGROUND COLOR ===
    if (n.fills && Array.isArray(n.fills) && n.fills.length > 0) {
      const fill = n.fills.find(
        (f: any) => f.type === "SOLID" && f.visible !== false
      );
      if (fill && fill.color) {
        const bgColor = rgbToHex(
          (fill.color.r ?? 0) * 255,
          (fill.color.g ?? 0) * 255,
          (fill.color.b ?? 0) * 255,
          fill.opacity ?? 1
        );
        if (bgColor === tailwindConfig.colors.primary) {
          classes.push("bg-primary");
        } else if (bgColor === tailwindConfig.colors.secondary) {
          classes.push("bg-secondary");
        } else if (bgColor === tailwindConfig.colors.accent) {
          classes.push("bg-accent");
        } else if (
          bgColor.toLowerCase() !== "#ffffff" &&
          bgColor.toLowerCase() !== "#fff"
        ) {
          classes.push(`[background-color:${bgColor}]`);
        }
      }
    }

    // === BORDER ===
    if (n.strokes && Array.isArray(n.strokes) && n.strokes.length > 0) {
      const stroke = n.strokes[0];
      if (stroke.type === "SOLID" && stroke.color) {
        const borderColor = rgbToHex(
          (stroke.color.r ?? 0) * 255,
          (stroke.color.g ?? 0) * 255,
          (stroke.color.b ?? 0) * 255,
          stroke.opacity ?? 1
        );
        classes.push("border", `[border-color:${borderColor}]`);
      }
      if (n.strokeWeight) {
        const weight = n.strokeWeight;
        if (weight === 1) classes.push("border");
        else if (weight === 2) classes.push("border-2");
        else if (weight >= 4) classes.push("border-4");
      }
    }

    // === BORDER RADIUS ===
    if (n.cornerRadius) {
      const radius = n.cornerRadius;
      if (radius < 4) classes.push("rounded");
      else if (radius < 8) classes.push("rounded-md");
      else if (radius < 12) classes.push("rounded-lg");
      else if (radius < 16) classes.push("rounded-xl");
      else if (radius >= 50) classes.push("rounded-full");
      else classes.push("rounded-2xl");
    } else if (tagName === "button") {
      classes.push("rounded-lg");
    }

    // === PADDING ===
    if (n.paddingTop || n.paddingRight || n.paddingBottom || n.paddingLeft) {
      const top = Math.round((n.paddingTop ?? 0) / 4);
      const right = Math.round((n.paddingRight ?? 0) / 4);
      const bottom = Math.round((n.paddingBottom ?? 0) / 4);
      const left = Math.round((n.paddingLeft ?? 0) / 4);

      if (top === right && right === bottom && bottom === left && top > 0) {
        classes.push(`p-${Math.min(top, 16)}`);
      } else {
        if (top > 0) classes.push(`pt-${Math.min(top, 16)}`);
        if (right > 0) classes.push(`pr-${Math.min(right, 16)}`);
        if (bottom > 0) classes.push(`pb-${Math.min(bottom, 16)}`);
        if (left > 0) classes.push(`pl-${Math.min(left, 16)}`);
      }
    } else if (isContainer && !n.layoutMode) {
      classes.push("p-4");
    }

    // === FLEXBOX LAYOUT ===
    if (n.layoutMode) {
      classes.push("flex");
      if (n.layoutMode === "HORIZONTAL") {
        classes.push("flex-row");
      } else if (n.layoutMode === "VERTICAL") {
        classes.push("flex-col");
      }

      // Item spacing (gap)
      if (n.itemSpacing && n.itemSpacing > 0) {
        const gap = Math.round(n.itemSpacing / 4);
        if (gap > 0) classes.push(`gap-${Math.min(gap, 16)}`);
      }

      // Primary axis alignment
      if (n.layoutAlign) {
        if (n.layoutAlign === "MIN") classes.push("justify-start");
        else if (n.layoutAlign === "CENTER") classes.push("justify-center");
        else if (n.layoutAlign === "MAX") classes.push("justify-end");
        else if (n.layoutAlign === "SPACE_BETWEEN")
          classes.push("justify-between");
      }

      // Cross axis alignment
      if (n.counterAxisAlignItems) {
        if (n.counterAxisAlignItems === "MIN") classes.push("items-start");
        else if (n.counterAxisAlignItems === "CENTER")
          classes.push("items-center");
        else if (n.counterAxisAlignItems === "MAX") classes.push("items-end");
      }

      // Wrap flex items
      if (n.layoutWrap === "WRAP") classes.push("flex-wrap");
    }

    // === SIZE ===
    if (n.absoluteBoundingBox) {
      const width = Math.round(n.absoluteBoundingBox.width);
      const height = Math.round(n.absoluteBoundingBox.height);

      if (!isContainer && width > 0 && width < 1280) {
        const w = Math.round(width / 16);
        if (w > 0 && w <= 80) classes.push(`w-${w}`);
      }

      if (!isContainer && height > 0) {
        const h = Math.round(height / 16);
        if (h > 0 && h <= 96) classes.push(`h-${h}`);
      }
    }

    // === OPACITY ===
    if (n.opacity !== undefined && n.opacity < 1) {
      const op = Math.round((n.opacity * 100) / 10) * 10;
      classes.push(`opacity-${op}`);
    }

    // === BUTTON STYLING ===
    if (tagName === "button") {
      if (!classes.some(c => c.includes("px"))) classes.push("px-6");
      if (!classes.some(c => c.includes("py"))) classes.push("py-2");
      if (!classes.some(c => c.startsWith("bg-"))) classes.push("bg-primary");
      classes.push(
        "text-white",
        "font-medium",
        "hover:opacity-90",
        "transition-opacity",
        "cursor-pointer"
      );
    }

    const classStr = classes.length > 0 ? ` class="${classes.join(" ")}"` : "";

    // ============ RENDER CHILDREN ============
    let childrenHTML = "";
    let hasContent = false;

    if (n.children && Array.isArray(n.children) && n.children.length > 0) {
      const childParts = n.children
        .map((child: any) => {
          const result = buildHTML(child, indent + 1, tagName, depth + 1);
          if (result && result.trim()) hasContent = true;
          return result;
        })
        .filter(x => Boolean(x));

      if (childParts.length > 0) {
        childrenHTML = `\n${childParts.join("\n")}\n${indentStr}`;
      }
    }

    // Placeholder for empty containers
    if (isContainer && !hasContent) {
      const sectionName = nodeName.includes("hero")
        ? "Hero"
        : nodeName.includes("banner")
        ? "Banner"
        : nodeName.includes("card")
        ? "Card"
        : nodeName.includes("section")
        ? "Section"
        : "Container";
      childrenHTML = `\n${indentStr}  <div class="flex items-center justify-center min-h-[200px] bg-slate-50 dark:bg-slate-900 rounded-lg">\n${indentStr}    <p class="text-center text-slate-500 dark:text-slate-400">📦 ${sectionName} vazio</p>\n${indentStr}  </div>\n${indentStr}`;
    }

    // ============ FINAL RENDER ============
    const selfClosing = ["input", "img", "br", "hr"];
    if (selfClosing.includes(tagName)) {
      return `${indentStr}<${tagName}${classStr} />`;
    }

    if (childrenHTML) {
      return `${indentStr}<${tagName}${classStr}>${childrenHTML}</${tagName}>`;
    } else {
      return `${indentStr}<${tagName}${classStr}></${tagName}>`;
    }
  };

  const bodyHTML = buildHTML(node);

  const html = `<!DOCTYPE html>
<html class="light" lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <meta content="width=device-width, initial-scale=1.0" name="viewport"/>
  <meta name="description" content="SolarOps - Design Export"/>
  <title>SolarOps - Extracted Design</title>
  <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@200..800&display=swap" rel="stylesheet"/>
  <script id="tailwind-config">
${tailwindScript}
  </script>
  <style>
    .material-symbols-outlined {
      font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
    }
    body {
      font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
  </style>
</head>
<body class="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100">
  <main class="min-h-screen max-w-[1280px] mx-auto px-4 py-8">
${bodyHTML}
  </main>
</body>
</html>`;

  return html;
};

const extractImprovedCSS = (node: any, parentNode?: any): string => {
  if (!node) return "";

  const nodeName = toKebabCase(node.name || node.type || "unnamed");
  const baseClass = parentNode
    ? `${toKebabCase(parentNode.name || parentNode.type)}__${nodeName}`
    : nodeName;

  let css = "";
  const styles: Record<string, string> = {};

  // Sizing
  if (node.absoluteBoundingBox) {
    const width = node.absoluteBoundingBox.width;
    const height = node.absoluteBoundingBox.height;

    if (width > 0) styles.width = `${Math.round(width)}px`;
    if (height > 0) styles.height = `${Math.round(height)}px`;

    // Positioning only if parent exists
    if (parentNode) {
      styles.position = "absolute";
      const left =
        node.absoluteBoundingBox.x - (parentNode?.absoluteBoundingBox?.x || 0);
      const top =
        node.absoluteBoundingBox.y - (parentNode?.absoluteBoundingBox?.y || 0);
      if (left !== 0) styles.left = `${Math.round(left)}px`;
      if (top !== 0) styles.top = `${Math.round(top)}px`;
    }
  }

  // Layout
  if (node.layoutMode) {
    styles.display = "flex";
    styles.flexDirection = node.layoutMode === "HORIZONTAL" ? "row" : "column";
    if (node.itemSpacing && node.itemSpacing > 0) {
      styles.gap = `${Math.round(node.itemSpacing)}px`;
    }
    if (node.layoutAlign === "MIN") styles.justifyContent = "flex-start";
    if (node.layoutAlign === "CENTER") styles.justifyContent = "center";
    if (node.layoutAlign === "MAX") styles.justifyContent = "flex-end";
    if (node.counterAxisAlignItems === "MIN") styles.alignItems = "flex-start";
    if (node.counterAxisAlignItems === "CENTER") styles.alignItems = "center";
    if (node.counterAxisAlignItems === "MAX") styles.alignItems = "flex-end";
  }

  // Fills (Background)
  if (node.fills && Array.isArray(node.fills)) {
    const fill = node.fills.find(
      (f: any) => f.type === "SOLID" && f.visible !== false
    );
    if (fill && fill.color) {
      const color = fill.color;
      const opacity = fill.opacity ?? color.a ?? 1;
      const hex = rgbToHex(color.r || 0, color.g || 0, color.b || 0, opacity);
      styles.backgroundColor = hex;
    }
  }

  // Strokes (Borders)
  if (node.strokes && Array.isArray(node.strokes) && node.strokes.length > 0) {
    const stroke = node.strokes.find(
      (s: any) => s.type === "SOLID" && s.visible !== false
    );
    if (stroke && stroke.color) {
      const color = stroke.color;
      const opacity = stroke.opacity ?? color.a ?? 1;
      const hex = rgbToHex(color.r || 0, color.g || 0, color.b || 0, opacity);
      const weight = node.strokeWeight || 1;
      styles.border = `${Math.round(weight)}px solid ${hex}`;
    }
  }

  // Border Radius
  if (node.cornerRadius) {
    styles.borderRadius = `${Math.round(node.cornerRadius)}px`;
  }

  // Padding
  if (node.padding) {
    const top = Math.round(node.padding.top || 0);
    const right = Math.round(node.padding.right || 0);
    const bottom = Math.round(node.padding.bottom || 0);
    const left = Math.round(node.padding.left || 0);
    styles.padding = `${top}px ${right}px ${bottom}px ${left}px`;
  }

  // Effects (Shadows, Blur)
  if (node.effects && Array.isArray(node.effects) && node.effects.length > 0) {
    const shadows = node.effects
      .filter((e: any) => e.type === "DROP_SHADOW" && e.visible !== false)
      .map((e: any) => {
        const color = e.color || {};
        const opacity = e.opacity ?? color.a ?? 1;
        const hex = rgbToHex(color.r || 0, color.g || 0, color.b || 0, opacity);
        const x = Math.round(e.offset?.x || 0);
        const y = Math.round(e.offset?.y || 0);
        const blur = Math.round(e.radius || 0);
        return `${x}px ${y}px ${blur}px ${hex}`;
      })
      .join(", ");

    if (shadows) styles.boxShadow = shadows;

    const blurs = node.effects
      .filter((e: any) => e.type === "LAYER_BLUR" && e.visible !== false)
      .map((e: any) => `blur(${Math.round(e.radius || 0)}px)`)
      .join(" ");

    if (blurs) styles.filter = blurs;
  }

  // Text Styles
  if (node.type === "TEXT") {
    if (node.fills && Array.isArray(node.fills)) {
      const fill = node.fills.find((f: any) => f.type === "SOLID");
      if (fill && fill.color) {
        const color = fill.color;
        const opacity = fill.opacity ?? color.a ?? 1;
        const hex = rgbToHex(color.r || 0, color.g || 0, color.b || 0, opacity);
        styles.color = hex;
      }
    }

    if (node.fontName) {
      styles.fontFamily = `"${node.fontName.family}", sans-serif`;
    }
    if (node.fontSize) {
      styles.fontSize = `${Math.round(node.fontSize)}px`;
    }
    if (node.fontWeight) {
      styles.fontWeight = String(node.fontWeight);
    }
    if (node.lineHeight) {
      const value = node.lineHeight.value || 0;
      const unit = node.lineHeight.unit === "PIXELS" ? "px" : "%";
      styles.lineHeight = `${Math.round(value)}${unit}`;
    }
    if (node.letterSpacing && node.letterSpacing.value !== 0) {
      styles.letterSpacing = `${Math.round(node.letterSpacing.value)}px`;
    }
    if (node.textAlignHorizontal) {
      styles.textAlign = node.textAlignHorizontal.toLowerCase();
    }
  }

  // Opacity
  if (node.opacity !== undefined && node.opacity < 1) {
    styles.opacity = String(Math.round(node.opacity * 100) / 100);
  }

  // Generate CSS
  if (Object.keys(styles).length > 0) {
    css += `.${baseClass} {
`;
    for (const [prop, value] of Object.entries(styles)) {
      const cssProp = prop.replace(/([A-Z])/g, "-$1").toLowerCase();
      css += `  ${cssProp}: ${value};
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

  // Determine tag name based on node type and name hints
  let tagName = "div";
  const attributes: string[] = [];
  let textContent = "";

  // Add semantic HTML based on name patterns
  const nameLower = (node.name || "").toLowerCase();
  if (nameLower.includes("button")) tagName = "button";
  else if (nameLower.includes("link") || nameLower.includes("nav"))
    tagName = "a";
  else if (nameLower.includes("heading") || nameLower.includes("title"))
    tagName = "h2";
  else if (nameLower.includes("input") || nameLower.includes("search"))
    tagName = "input";
  else if (nameLower.includes("image") || nameLower.includes("img"))
    tagName = "img";
  else if (node.type === "TEXT") tagName = "p";

  // Add class attribute
  attributes.push(`class="${baseClass}"`);

  // Add data attributes for reference
  if (node.id) attributes.push(`data-node-id="${node.id}"`);
  if (node.type) attributes.push(`data-type="${node.type}"`);

  // Handle TEXT nodes
  if (node.type === "TEXT") {
    textContent = node.characters || "";
  }

  // Handle IMAGE nodes
  if (node.type === "IMAGE" || tagName === "img") {
    attributes.push('src="https://via.placeholder.com/200"');
    attributes.push(`alt="${node.name || "Image"}"`);
  }

  // Handle SVG nodes
  if (
    node.type === "VECTOR" ||
    node.type === "INSTANCE" ||
    node.type === "COMPONENT" ||
    (node.type === "FRAME" && svgCode)
  ) {
    return indentStr + svgCode;
  }

  // Generate child content
  let childrenContent = "";
  if (node.children && Array.isArray(node.children)) {
    const childItems = node.children
      .map((child: any) => generateImprovedHTML(child, null, indent + 1, node))
      .filter(Boolean);

    if (childItems.length > 0) {
      childrenContent = childItems.join("\n");
    }
  }

  // Self-closing tags
  const selfClosingTags = ["img", "input", "br", "hr"];
  if (selfClosingTags.includes(tagName)) {
    return `${indentStr}<${tagName} ${attributes.join(" ")} />`;
  }

  // Generate opening and closing tags
  if (childrenContent.trim() || textContent) {
    return `${indentStr}<${tagName} ${attributes.join(" ")}>
${textContent ? `${indentStr}  ${textContent}\n` : ""}${
      childrenContent ? `${childrenContent}\n${indentStr}` : ""
    }</${tagName}>`;
  }

  return `${indentStr}<${tagName} ${attributes.join(" ")}></${tagName}>`;
};

const generateCompleteHTML = (
  node: any,
  svgCode: string | null = null
): string => {
  if (!node) return "";

  const bodyHTML = generateImprovedHTML(node, svgCode);
  const cssStyles = extractImprovedCSS(node);

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>${node.name || "Imported Design"}</title>
  <style>
    /* CSS Reset & Base Styles */
    * {
      margin: 0;
      padding: 0;
      border: 0;
      box-sizing: border-box;
    }

    *::before,
    *::after {
      box-sizing: inherit;
    }

    html {
      font-size: 16px;
      line-height: 1.5;
    }

    html, body {
      width: 100%;
      height: 100%;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
    }

    body {
      background-color: #fafafa;
      color: #333333;
      overflow-x: hidden;
    }

    main, section, article, header, footer, nav, aside {
      display: block;
    }

    img {
      max-width: 100%;
      height: auto;
      display: block;
    }

    a {
      color: inherit;
      text-decoration: none;
    }

    button {
      cursor: pointer;
      font-family: inherit;
      font-size: inherit;
    }

    input, textarea, select {
      font-family: inherit;
      font-size: inherit;
    }

    /* Generated Component Styles */
${cssStyles}
  </style>
</head>
<body>
  <main>
${bodyHTML}
  </main>
</body>
</html>`;

  return html;
};

// Helper to convert SerializedNode back to HTML with inline styles
const serializeNodeToHTML = (node: any, indent = 1): string => {
  if (!node) return "";

  const indentStr = "  ".repeat(indent);

  if (node.nodeType === "text") {
    return `${indentStr}${escapeHtml(node.text)}`;
  }

  if (node.nodeType === "element") {
    const {
      tagName,
      attrs = {},
      styles = {},
      children = [],
      imageUrl,
      imageData
    } = node;

    // Build style attribute
    const styleStr = Object.entries(styles)
      .map(([key, value]) => `${key}: ${value}`)
      .join("; ");

    // Build attributes
    const attrEntries: string[] = [];
    if (styleStr) attrEntries.push(`style="${styleStr}"`);
    Object.entries(attrs).forEach(([key, value]: [string, any]) => {
      if (key !== "style" && value !== undefined && value !== null) {
        attrEntries.push(`${key}="${escapeHtml(String(value))}"`);
      }
    });

    // Handle image URLs
    if (imageUrl) {
      attrEntries.push(`src="${escapeHtml(imageUrl)}"`);
    }

    const attrStr = attrEntries.length > 0 ? " " + attrEntries.join(" ") : "";

    // Self-closing tags
    if (["img", "input", "br", "hr"].includes(tagName.toLowerCase())) {
      return `${indentStr}<${tagName}${attrStr} />`;
    }

    // Tags with children
    if (children && children.length > 0) {
      const childContent = children
        .map((child: any) => serializeNodeToHTML(child, indent + 1))
        .join("\n");
      return `${indentStr}<${tagName}${attrStr}>\n${childContent}\n${indentStr}</${tagName}>`;
    }

    // Empty self-closing tags
    return `${indentStr}<${tagName}${attrStr}></${tagName}>`;
  }

  return "";
};

const escapeHtml = (text: string): string => {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  };
  return text.replace(/[&<>"']/g, char => map[char]);
};

// Convert inline styles to Tailwind classes
const inlineStylesToTailwind = (
  styles: Record<string, string> = {}
): string[] => {
  const classes: string[] = [];

  const styleMap: Record<string, string> = {};

  // Parse inline styles to object
  Object.entries(styles).forEach(([key, value]) => {
    styleMap[key] = String(value);
  });

  // Color mappings
  if (styleMap.backgroundColor) {
    const bg = styleMap.backgroundColor.toLowerCase();
    if (bg.includes("#")) {
      classes.push(`[background-color:${bg}]`);
    }
  }

  if (styleMap.color) {
    const color = styleMap.color.toLowerCase();
    if (color.includes("#")) {
      classes.push(`[color:${color}]`);
    }
  }

  // Layout
  if (styleMap.display === "flex") {
    classes.push("flex");
    if (styleMap.flexDirection === "row") classes.push("flex-row");
    else if (styleMap.flexDirection === "column") classes.push("flex-col");
  }

  // Sizing
  if (styleMap.width && styleMap.width.match(/^\d+px$/)) {
    const val = parseInt(styleMap.width) / 4;
    if (val > 0 && val <= 96) classes.push(`w-${val}`);
    else classes.push(`[width:${styleMap.width}]`);
  }

  if (styleMap.height && styleMap.height.match(/^\d+px$/)) {
    const val = parseInt(styleMap.height) / 4;
    if (val > 0 && val <= 96) classes.push(`h-${val}`);
    else classes.push(`[height:${styleMap.height}]`);
  }

  // Border radius
  if (styleMap.borderRadius) {
    const radius = parseInt(styleMap.borderRadius);
    if (radius < 5) classes.push("rounded");
    else if (radius < 10) classes.push("rounded-lg");
    else if (radius < 15) classes.push("rounded-xl");
    else classes.push("rounded-full");
  }

  // Padding
  if (styleMap.padding) {
    const match = styleMap.padding.match(/(\d+)px/);
    if (match) {
      const val = parseInt(match[1]) / 4;
      if (val > 0 && val <= 16) classes.push(`p-${val}`);
    }
  }

  // Text properties
  if (styleMap.fontSize) {
    const size = parseInt(styleMap.fontSize);
    if (size < 14) classes.push("text-xs");
    else if (size < 16) classes.push("text-sm");
    else if (size < 20) classes.push("text-base");
    else if (size < 24) classes.push("text-lg");
    else if (size < 30) classes.push("text-xl");
    else classes.push("text-2xl");
  }

  if (styleMap.fontWeight) {
    const weight = parseInt(styleMap.fontWeight);
    if (weight >= 700) classes.push("font-bold");
    else if (weight >= 600) classes.push("font-semibold");
    else if (weight >= 500) classes.push("font-medium");
  }

  if (styleMap.textAlign) {
    if (styleMap.textAlign === "center") classes.push("text-center");
    else if (styleMap.textAlign === "right") classes.push("text-right");
  }

  return classes;
};

// Convert serialized node to Tailwind HTML
const serializeNodeToTailwindHTML = (node: any, indent = 0): string => {
  if (!node) return "";

  const indentStr = "  ".repeat(indent);

  if (node.nodeType === "text") {
    const text = escapeHtml(node.text || "");
    return text.trim() ? `${indentStr}${text}` : "";
  }

  if (node.nodeType === "element") {
    const { tagName, attrs = {}, styles = {}, children = [], imageUrl } = node;

    // Determine tag name
    let tag = tagName;
    const classesFromStyle = inlineStylesToTailwind(styles);

    // Merge with existing classes
    const existingClasses = (attrs.class || "").split(/\s+/).filter(Boolean);
    const allClasses = [...new Set([...classesFromStyle, ...existingClasses])];

    const classAttr =
      allClasses.length > 0 ? ` class="${allClasses.join(" ")}"` : "";

    // Build attributes
    const attrParts: string[] = [classAttr];
    Object.entries(attrs).forEach(([key, value]: [string, any]) => {
      if (
        key !== "class" &&
        key !== "style" &&
        value !== undefined &&
        value !== null
      ) {
        attrParts.push(` ${key}="${escapeHtml(String(value))}"`);
      }
    });

    if (imageUrl) {
      attrParts.push(` src="${escapeHtml(imageUrl)}"`);
    }

    const attrStr = attrParts.join("");

    // Self-closing tags
    if (tag === "img" || tag === "input" || tag === "br" || tag === "hr") {
      return `${indentStr}<${tag}${attrStr} />`;
    }

    // Build children
    let childContent = "";
    if (children && children.length > 0) {
      const childParts = children
        .map(child => serializeNodeToTailwindHTML(child, indent + 1))
        .filter(Boolean);

      if (childParts.length > 0) {
        childContent = `\n${childParts.join("\n")}\n${indentStr}`;
      }
    }

    return `${indentStr}<${tag}${attrStr}>${childContent}</${tag}>`;
  }

  return "";
};

// Generate Tailwind HTML from serialized DOM
const generateTailwindFromSerialized = (tree: any): string => {
  if (!tree) return "";

  // Find colors used in the tree to generate config
  const colors: Record<string, string> = {
    primary: "#13ec5b",
    secondary: "#6b7280",
    accent: "#f59e0b",
    "background-light": "#f6f8f6",
    "background-dark": "#102216"
  };

  const extractColors = (node: any) => {
    if (!node) return;

    const styles = node.styles || {};
    if (styles.backgroundColor?.includes("#")) {
      // Reserve for future color detection
    }

    if (Array.isArray(node.children)) {
      node.children.forEach((child: any) => extractColors(child));
    }
  };

  extractColors(tree);

  const tailwindScript = `
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    colors: {
                        "primary": "${colors.primary}",
                        "secondary": "${colors.secondary}",
                        "accent": "${colors.accent}",
                        "background-light": "${colors["background-light"]}",
                        "background-dark": "${colors["background-dark"]}",
                    },
                    fontFamily: {
                        "display": ["Manrope", "sans-serif"]
                    },
                    borderRadius: {
                        "DEFAULT": "0.25rem",
                        "lg": "0.5rem",
                        "xl": "0.75rem",
                        "full": "9999px"
                    },
                },
            },
        }
    `;

  const bodyContent = serializeNodeToTailwindHTML(tree);

  const html = `<!DOCTYPE html>
<html class="light" lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <meta content="width=device-width, initial-scale=1.0" name="viewport"/>
  <title>SolarOps - Imported Design</title>
  <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@200..800&display=swap" rel="stylesheet"/>
  <script id="tailwind-config">
${tailwindScript}
  </script>
  <style>
    .material-symbols-outlined {
      font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
    }
    body {
      font-family: 'Manrope', sans-serif;
    }
  </style>
</head>
<body class="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen">
  <main class="max-w-[1280px] mx-auto px-4 py-8">
${bodyContent}
  </main>
</body>
</html>`;

  return html;
};

// Generate HTML from serialized DOM structure
const generateHTMLFromSerialized = (tree: any): string => {
  if (!tree) return "";

  const bodyHTML = serializeNodeToHTML(tree);

  // Extract CSS from serialized node styles recursively
  const cssLines: string[] = [];
  const processNode = (node: any) => {
    if (!node) return;

    if (node.nodeType === "element" && node.tagName) {
      const className = "figma__" + node.tagName.toLowerCase();
      if (Object.keys(node.styles || {}).length > 0) {
        cssLines.push(`.${className} {`);
        Object.entries(node.styles).forEach(([key, value]: [string, any]) => {
          const cssKey = key.replace(/([A-Z])/g, "-$1").toLowerCase();
          cssLines.push(`  ${cssKey}: ${value};`);
        });
        cssLines.push("}");
        cssLines.push("");
      }
    }

    if (Array.isArray(node.children)) {
      node.children.forEach((child: any) => processNode(child));
    }
  };

  processNode(tree);

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>Imported Design</title>
  <style>
    /* CSS Reset & Base Styles */
    * {
      margin: 0;
      padding: 0;
      border: 0;
      box-sizing: border-box;
    }

    *::before,
    *::after {
      box-sizing: inherit;
    }

    html {
      font-size: 16px;
      line-height: 1.5;
    }

    html, body {
      width: 100%;
      height: 100%;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
    }

    body {
      background-color: #fafafa;
      color: #333333;
      overflow-x: hidden;
    }

    main, section, article, header, footer, nav, aside {
      display: block;
    }

    img {
      max-width: 100%;
      height: auto;
      display: block;
    }

    a {
      color: inherit;
      text-decoration: none;
    }

    button {
      cursor: pointer;
      font-family: inherit;
      font-size: inherit;
    }

    input, textarea, select {
      font-family: inherit;
      font-size: inherit;
    }

    /* Generated Styles */
${cssLines.join("\n")}
  </style>
</head>
<body>
  <main>
${bodyHTML}
  </main>
</body>
</html>`;

  return html;
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
  const [serializedDOMData, setSerializedDOMData] = useState<any>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, nodeId, svg, data, error } = event.data.pluginMessage;

      if (type === "exported-node-svg" && nodeId === selectedNode?.id) {
        setSvgCode(svg);
      }

      if (type === "serialized-dom-response") {
        if (data) {
          console.log("✓ Dados serializados recebidos do DOM");
          setSerializedDOMData(data);
        } else {
          console.log("✗ Dados serializados não encontrados:", error);
          setSerializedDOMData(null);
        }
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [selectedNode]);

  const loadSnippets = async (): Promise<void> => {
    if (!selectedNode || !selectedNode.id) {
      console.warn("[LoadSnippets] No valid selectedNode");
      setSnippets([]);
      return;
    }

    try {
      setIsLoading(true);

      // Request full node data from plugin
      return new Promise<void>(resolveLoadSnippets => {
        let dataReceived = false;
        let receivedFullNodeData = selectedNode;
        let timeoutId: NodeJS.Timeout | null = null;

        const cleanup = () => {
          if (timeoutId) clearTimeout(timeoutId);
          window.removeEventListener("message", dataHandler);
        };

        const dataHandler = (event: MessageEvent) => {
          try {
            const pluginMessage = event.data?.pluginMessage;

            if (pluginMessage?.type === "full-node-data") {
              if (pluginMessage?.data) {
                console.log(
                  "[LoadSnippets] Full node data received:",
                  Object.keys(pluginMessage.data || {})
                );
                dataReceived = true;
                receivedFullNodeData = pluginMessage.data;
              } else if (pluginMessage?.error) {
                console.warn(
                  "[LoadSnippets] Plugin error:",
                  pluginMessage.error
                );
              }
              cleanup();
              generateSnippets(receivedFullNodeData);
              resolveLoadSnippets();
            }
          } catch (e) {
            console.error("[LoadSnippets] Error in dataHandler:", e);
          }
        };

        timeoutId = setTimeout(() => {
          if (!dataReceived) {
            console.warn(
              "[LoadSnippets] Timeout waiting for full node data, using selectedNode"
            );
            cleanup();
            generateSnippets(receivedFullNodeData);
            resolveLoadSnippets();
          }
        }, 2000);

        // Listen for response from plugin
        window.addEventListener("message", dataHandler);

        // Request full data from plugin
        console.log(
          "[LoadSnippets] Requesting full node data for node:",
          selectedNode.id
        );
        try {
          parent.postMessage(
            {
              pluginMessage: {
                type: "get-full-node-data",
                nodeId: selectedNode.id
              }
            },
            "*"
          );
        } catch (e) {
          console.error("[LoadSnippets] Error posting message:", e);
          cleanup();
          generateSnippets(receivedFullNodeData);
          resolveLoadSnippets();
        }
      });

      function generateSnippets(nodeData: any) {
        try {
          console.log(
            "[LoadSnippets] Generating snippets with data:",
            nodeData?.id,
            nodeData?.name
          );

          // Generate Tailwind HTML with full node data
          let tailwindHtml = "<!-- Unable to generate Tailwind HTML -->";
          try {
            tailwindHtml = generateTailwindHTML(nodeData);
            console.log("✓ HTML com Tailwind CSS gerado com sucesso");
          } catch (e) {
            console.error("Erro ao gerar HTML com Tailwind:", e);
          }

          const nodeSnippets: CodeSnippet[] = [
            {
              title: "HTML (Tailwind CSS) - RECOMENDADO",
              language: "html",
              code: tailwindHtml
            },
            {
              title: "Node Data",
              language: "json",
              code: formatNodeData(nodeData)
            },
            {
              title: "CSS Styles",
              language: "css",
              code: extractImprovedCSS(nodeData)
            },
            {
              title: "TypeScript Types",
              language: "typescript",
              code: generateTypeScriptTypes(nodeData)
            }
          ].filter(snippet => {
            return (
              snippet.code &&
              snippet.code.trim() !== "" &&
              !snippet.code.includes("No styles found") &&
              !snippet.code.includes("No node selected") &&
              !snippet.code.includes("Unable to generate")
            );
          });

          setSnippets(nodeSnippets);
          if (nodeSnippets.length > 0) {
            setSelectedLanguage(nodeSnippets[0].language);
          }
        } catch (e) {
          console.error("[LoadSnippets] Error generating snippets:", e);
          setSnippets([]);
        }
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
    <>
      <div
        style={{
          background: "#252526",
          borderRadius: "6px",
          overflow: "hidden",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
        }}
      >
        {languages.length > 1 && (
          <div
            style={{
              padding: "8px 12px",
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center"
            }}
          >
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
                minWidth: "120px"
              }}
            >
              {languages.map(lang => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div
        style={{
          maxHeight: "300px",
          overflowY: "auto",
          fontSize: "12px"
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
    </>
  );
};

export default CodeSnippetSection;
