import {
  getLocalPaintStyles,
  getLocalTextStyles,
  getLocalEffectStyles
} from "./styles";

// Minimal declarations for Figma plugin environment
// These keep TypeScript satisfied in this isolated module.
declare const figma: any;
type SceneNode = any;

export async function fetchRemoteStyles(usedRemoteStyles: any) {
  try {
    const currentPage = figma.currentPage;
    if (!currentPage) {
      return usedRemoteStyles;
    }

    const nodes = currentPage
      .findAllWithCriteria({
        types: [
          "TEXT",
          "FRAME",
          "COMPONENT",
          "RECTANGLE",
          "ELLIPSE",
          "INSTANCE",
          "VECTOR",
          "LINE"
        ]
      })
      .filter(node => {
        // Check for remote styles
        return (
          node.fillStyleId ||
          node.strokeStyleId ||
          (node.type === "TEXT" && (node as any).textStyleId) ||
          node.effectStyleId
        );
      });

    for (const node of nodes) {
      try {
        if (node.fillStyleId) {
          const styleId = node.fillStyleId;
          if (typeof styleId !== "symbol") {
            // Check if the style with the given styleId already exists in the usedRemoteStyles
            const existingStyle = usedRemoteStyles.fills.find(
              (style: any) => style.id === styleId
            );
            if (!existingStyle) {
              usedRemoteStyles.fills.push({
                id: styleId,
                name: node.name,
                type: "fill"
              });
            }
          }
        }

        if (node.strokeStyleId) {
          const styleId = node.strokeStyleId;
          if (typeof styleId !== "symbol") {
            const existingStyle = usedRemoteStyles.fills.find(
              (style: any) => style.id === styleId
            );
            if (!existingStyle) {
              usedRemoteStyles.fills.push({
                id: styleId,
                name: node.name,
                type: "stroke"
              });
            }
          }
        }

        if (node.type === "TEXT" && (node as any).textStyleId) {
          const styleId = (node as any).textStyleId;
          if (typeof styleId !== "symbol") {
            const existingStyle = usedRemoteStyles.text.find(
              (style: any) => style.id === styleId
            );
            if (!existingStyle) {
              usedRemoteStyles.text.push({
                id: styleId,
                name: node.name,
                type: "text"
              });
            }
          }
        }

        if (node.effectStyleId) {
          const styleId = node.effectStyleId;
          if (typeof styleId !== "symbol") {
            const existingStyle = usedRemoteStyles.effects.find(
              (style: any) => style.id === styleId
            );
            if (!existingStyle) {
              usedRemoteStyles.effects.push({
                id: styleId,
                name: node.name,
                type: "effect"
              });
            }
          }
        }
      } catch (nodeError) {
        console.error("[fetchRemoteStyles] Erro ao processar node:", nodeError);
        // Continua processando outros nodes
      }
    }

    return usedRemoteStyles;
  } catch (error) {
    console.error("[fetchRemoteStyles] Erro geral:", error);
    return usedRemoteStyles;
  }
}

// Nova função para identificar bibliotecas de componentes remotos ativas
export async function fetchActiveComponentLibraries() {
  try {
    const currentPage = figma.currentPage;
    if (!currentPage) return [];

    const libraryUsage: {
      [libraryName: string]: { count: number; keys: Set<string> };
    } = {};

    function findAllInstances(node: SceneNode) {
      if ("children" in node) {
        for (const child of node.children) {
          findAllInstances(child);
        }
      }

      if (node.type === "INSTANCE") {
        const mainComponent = node.mainComponent;
        if (
          mainComponent &&
          mainComponent.remote &&
          typeof mainComponent.remote === "object"
        ) {
          const libraryName =
            (mainComponent.remote as any).name ?? "Desconhecida";
          const componentKey = mainComponent.key;
          if (!libraryUsage[libraryName]) {
            libraryUsage[libraryName] = { count: 0, keys: new Set() };
          }
          libraryUsage[libraryName].count++;
          libraryUsage[libraryName].keys.add(componentKey);
        }
      }
    }

    findAllInstances(figma.root as any);

    // Monta o array para a UI
    const result = Object.entries(libraryUsage).map(([name, data]) => ({
      name,
      count: data.count,
      componentKeys: Array.from(data.keys)
    }));

    return result;
  } catch (error) {
    console.error("[fetchActiveComponentLibraries] Erro:", error);
    return [];
  }
}

// Detecta e agrupa bibliotecas de tokens por tipo (fills, text, effects, strokes)
export async function detectTokenLibraries() {
  try {
    const fileName = figma.root.name || "Estilos Locais";
    const [paintStyles, textStyles, effectStyles] = await Promise.all([
      getLocalPaintStyles(),
      getLocalTextStyles(),
      getLocalEffectStyles()
    ]);
    // Scan document for layout tokens (gaps, paddings), stroke widths and grids
    const gapsSet = new Set<number>();
    const paddingsSet = new Set<string>(); // encode as side:value to keep each side
    const strokeWidthSet = new Set<number>();
    const gridsSet = new Set<string>();

    function collectFromNode(node: SceneNode) {
      // Auto layout gaps and paddings
      // @ts-ignore - check layout props guardedly
      const layoutMode = (node as any).layoutMode as
        | "HORIZONTAL"
        | "VERTICAL"
        | "NONE"
        | undefined;
      if (layoutMode && layoutMode !== "NONE") {
        // itemSpacing (gap)
        const itemSpacing = (node as any).itemSpacing as number | undefined;
        if (
          typeof itemSpacing === "number" &&
          isFinite(itemSpacing) &&
          itemSpacing >= 0
        ) {
          gapsSet.add(itemSpacing);
        }
        // paddings
        const pTop = (node as any).paddingTop as number | undefined;
        const pRight = (node as any).paddingRight as number | undefined;
        const pBottom = (node as any).paddingBottom as number | undefined;
        const pLeft = (node as any).paddingLeft as number | undefined;
        if (typeof pTop === "number") paddingsSet.add(`Top:${pTop}`);
        if (typeof pRight === "number") paddingsSet.add(`Right:${pRight}`);
        if (typeof pBottom === "number") paddingsSet.add(`Bottom:${pBottom}`);
        if (typeof pLeft === "number") paddingsSet.add(`Left:${pLeft}`);
      }

      // Stroke widths
      // @ts-ignore
      const strokeWeight = (node as any).strokeWeight as number | undefined;
      if (
        typeof strokeWeight === "number" &&
        isFinite(strokeWeight) &&
        strokeWeight >= 0
      ) {
        strokeWidthSet.add(strokeWeight);
      }

      // Layout grids on frames/instances/components
      // @ts-ignore
      const layoutGrids = (node as any).layoutGrids as
        | readonly any[]
        | undefined;
      if (Array.isArray(layoutGrids) && layoutGrids.length > 0) {
        for (const g of layoutGrids) {
          // Create a compact signature to dedupe
          const sig = `${g.pattern || g.type || "UNKNOWN"}|${g.sectionSize ??
            g.count ??
            "-"}|${g.gutterSize ?? "-"}|${g.alignment ?? "-"}|${g.offset ?? 0}`;
          gridsSet.add(sig);
        }
      }

      if ("children" in node) {
        // @ts-ignore
        for (const child of (node as any).children || [])
          collectFromNode(child);
      }
    }

    // Start from document root pages
    // @ts-ignore
    for (const page of (figma.root as any).children || [])
      collectFromNode(page as any);

    // Build token arrays with names organized for the UI accordion (group/subgroup)
    const gaps = Array.from(gapsSet)
      .sort((a, b) => a - b)
      .map(value => ({ name: `Spacing/Gaps/${value}`, value }));

    const paddings = Array.from(paddingsSet)
      .sort()
      .map(entry => {
        const [side, val] = entry.split(":");
        const value = Number(val);
        return { name: `Spacing/Padding/${side}/${value}`, value };
      });

    const strokeWidths = Array.from(strokeWidthSet)
      .sort((a, b) => a - b)
      .map(value => ({ name: `Stroke/Width/${value}`, value }));

    const grids = Array.from(gridsSet).map(sig => {
      const [pattern, count, gutter, alignment, offset] = sig.split("|");
      const label = `${pattern}/${count}/${gutter}`;
      return {
        name: `Grid/${label}`,
        value: { pattern, count, gutter, alignment, offset }
      };
    });

    const tokenLibrary = {
      name: fileName,
      fills: paintStyles || [],
      text: textStyles || [],
      effects: effectStyles || [],
      strokes: paintStyles || [],
      gaps,
      paddings,
      strokeWidths,
      grids
    };
    return [tokenLibrary];
  } catch (error) {
    console.error("[detectTokenLibraries] Erro ao detectar tokens:", error);
    return [];
  }
}
