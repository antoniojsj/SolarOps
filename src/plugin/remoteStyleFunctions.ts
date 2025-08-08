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
        if (mainComponent && mainComponent.remote) {
          const libraryName = mainComponent.remote.name ?? "Desconhecida";
          const componentKey = mainComponent.key;
          if (!libraryUsage[libraryName]) {
            libraryUsage[libraryName] = { count: 0, keys: new Set() };
          }
          libraryUsage[libraryName].count++;
          libraryUsage[libraryName].keys.add(componentKey);
        }
      }
    }

    findAllInstances(figma.root);

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
