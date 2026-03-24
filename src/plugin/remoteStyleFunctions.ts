import {
  getLocalPaintStyles,
  getLocalTextStyles,
  getLocalEffectStyles
} from "./styles";
import {
  fetchLibraryStylesFromApi,
  importStyleByKey,
  extractFileKeyFromUrl
} from "./figmaRestApi";

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
    // Buscar estilos locais
    const fileName = figma.root.name || "Estilos Locais";
    const [
      localPaintStyles,
      localTextStyles,
      localEffectStyles
    ] = await Promise.all([
      getLocalPaintStyles(),
      getLocalTextStyles(),
      getLocalEffectStyles()
    ]);

    console.log(
      "[detectTokenLibraries] Estilos locais - Fills:",
      localPaintStyles.length,
      "Text:",
      localTextStyles.length,
      "Effects:",
      localEffectStyles.length
    );

    // Criar um mapa de bibliotecas por key
    const librariesMap = new Map<string, any>();

    // Adicionar biblioteca local
    librariesMap.set(fileName, {
      name: fileName,
      key: "local",
      fills: localPaintStyles || [],
      text: localTextStyles || [],
      effects: localEffectStyles || [],
      strokes: localPaintStyles || [],
      gaps: [],
      paddings: [],
      strokeWidths: [],
      grids: [],
      variables: [],
      isLocal: true
    });

    // NOVA ABORDAGEM: Buscar TODOS os estilos disponíveis (não apenas os usados)
    console.log(
      "[detectTokenLibraries] Buscando TODOS os estilos disponíveis..."
    );

    const styleIdsFound = new Set<string>();
    const importedStyleKeys = new Set<string>();

    // Buscar todos os estilos remotos disponíveis através do teamLibrary
    try {
      const availableLibraryCollections = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();
      console.log(
        `[detectTokenLibraries] Bibliotecas de variáveis encontradas: ${availableLibraryCollections.length}`
      );
    } catch (error) {
      console.log(
        "[detectTokenLibraries] Erro ao buscar bibliotecas de variáveis:",
        error
      );
    }

    // Buscar todos os paint styles (fills/strokes) disponíveis
    try {
      const allPaintStyles = await figma.getLocalPaintStylesAsync();
      console.log(
        `[detectTokenLibraries] Paint styles locais: ${allPaintStyles.length}`
      );
      allPaintStyles.forEach(style => {
        styleIdsFound.add(style.id);
        if (style.key) importedStyleKeys.add(style.key);
      });
    } catch (error) {
      console.log("[detectTokenLibraries] Erro ao buscar paint styles:", error);
    }

    // Buscar todos os text styles disponíveis
    try {
      const allTextStyles = await figma.getLocalTextStylesAsync();
      console.log(
        `[detectTokenLibraries] Text styles locais: ${allTextStyles.length}`
      );
      allTextStyles.forEach(style => {
        styleIdsFound.add(style.id);
        if (style.key) importedStyleKeys.add(style.key);
      });
    } catch (error) {
      console.log("[detectTokenLibraries] Erro ao buscar text styles:", error);
    }

    // Buscar todos os effect styles disponíveis
    try {
      const allEffectStyles = await figma.getLocalEffectStylesAsync();
      console.log(
        `[detectTokenLibraries] Effect styles locais: ${allEffectStyles.length}`
      );
      allEffectStyles.forEach(style => {
        styleIdsFound.add(style.id);
        if (style.key) importedStyleKeys.add(style.key);
      });
    } catch (error) {
      console.log(
        "[detectTokenLibraries] Erro ao buscar effect styles:",
        error
      );
    }

    // NOVO: Buscar TODAS as variables (variáveis) disponíveis
    console.log("[detectTokenLibraries] Buscando variables (variáveis)...");
    const variablesFound = new Map<string, any>();

    try {
      // Buscar todas as coleções de variáveis locais
      const localCollections = await figma.variables.getLocalVariableCollectionsAsync();
      console.log(
        `[detectTokenLibraries] Coleções de variáveis locais: ${localCollections.length}`
      );

      for (const collection of localCollections) {
        console.log(
          `[detectTokenLibraries] Coleção: ${collection.name} (${collection.variableIds.length} variáveis)`
        );

        for (const variableId of collection.variableIds) {
          try {
            const variable = await figma.variables.getVariableByIdAsync(
              variableId
            );
            if (variable) {
              variablesFound.set(variable.id, {
                id: variable.id,
                name: variable.name,
                key: variable.key,
                resolvedType: variable.resolvedType,
                valuesByMode: variable.valuesByMode,
                collectionName: collection.name,
                collectionId: collection.id
              });
              console.log(
                `[detectTokenLibraries] Variable encontrada: ${variable.name} (${variable.resolvedType})`
              );
            }
          } catch (error) {
            console.warn(
              `[detectTokenLibraries] Erro ao buscar variable ${variableId}:`,
              error
            );
          }
        }
      }

      // Buscar coleções de variáveis remotas (de bibliotecas)
      try {
        const remoteCollections = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();
        console.log(
          `[detectTokenLibraries] Coleções de variáveis remotas: ${remoteCollections.length}`
        );

        for (const remoteCollection of remoteCollections) {
          try {
            const importedCollection = await figma.variables.importVariableByKeyAsync(
              remoteCollection.key
            );
            if (importedCollection) {
              console.log(
                `[detectTokenLibraries] Coleção remota importada: ${importedCollection.name}`
              );
            }
          } catch (error) {
            console.log(
              `[detectTokenLibraries] Não foi possível importar coleção remota:`,
              error
            );
          }
        }
      } catch (error) {
        console.log(
          "[detectTokenLibraries] Erro ao buscar coleções remotas:",
          error
        );
      }

      console.log(
        `[detectTokenLibraries] Total de variables encontradas: ${variablesFound.size}`
      );
    } catch (error) {
      console.log("[detectTokenLibraries] Erro ao buscar variables:", error);
    }

    // CRÍTICO: Importar TODOS os estilos da biblioteca que ainda não foram importados
    console.log("[detectTokenLibraries] Importando estilos da biblioteca...");
    try {
      // Buscar componentes para identificar bibliotecas
      const allInstances = figma.root.findAllWithCriteria({
        types: ["INSTANCE"]
      });
      const libraryKeys = new Set<string>();

      for (const instance of allInstances) {
        try {
          const mainComp = await (instance as any).getMainComponentAsync();
          if (mainComp && mainComp.remote && mainComp.key) {
            const compKey = mainComp.key;
            const keyParts = compKey.split(":");
            if (keyParts.length > 1) {
              libraryKeys.add(keyParts[0]);
            }
          }
        } catch (error) {
          // Ignorar erros de componentes quebrados
        }
      }

      console.log(
        `[detectTokenLibraries] Bibliotecas identificadas: ${libraryKeys.size}`
      );

      // Para cada biblioteca, tentar importar seus estilos
      // Nota: Não há API direta para listar TODOS os estilos de uma biblioteca
      // A única forma é através da REST API ou importando estilos conhecidos
    } catch (error) {
      console.log(
        "[detectTokenLibraries] Erro ao importar estilos da biblioteca:",
        error
      );
    }

    // Também buscar estilos usados no documento para incluir estilos remotos
    console.log(
      "[detectTokenLibraries] Buscando estilos usados no documento..."
    );
    const allPages = figma.root.children;

    for (const page of allPages) {
      const allNodes = (page as any).findAllWithCriteria({
        types: [
          "TEXT",
          "FRAME",
          "COMPONENT",
          "RECTANGLE",
          "ELLIPSE",
          "INSTANCE",
          "VECTOR",
          "LINE",
          "POLYGON",
          "STAR",
          "BOOLEAN_OPERATION"
        ]
      });

      console.log(
        `[detectTokenLibraries] Página ${page.name}: ${allNodes.length} nós encontrados`
      );

      for (const node of allNodes) {
        // Fill styles
        if (node.fillStyleId && typeof node.fillStyleId === "string") {
          styleIdsFound.add(node.fillStyleId);
        }
        // Stroke styles
        if (node.strokeStyleId && typeof node.strokeStyleId === "string") {
          styleIdsFound.add(node.strokeStyleId);
        }
        // Text styles
        if (
          node.type === "TEXT" &&
          (node as any).textStyleId &&
          typeof (node as any).textStyleId === "string"
        ) {
          styleIdsFound.add((node as any).textStyleId);
        }
        // Effect styles
        if (node.effectStyleId && typeof node.effectStyleId === "string") {
          styleIdsFound.add(node.effectStyleId);
        }
      }
    }

    console.log(
      "[detectTokenLibraries] Total de IDs de estilos encontrados:",
      styleIdsFound.size
    );

    // Buscar informações de cada estilo e salvar com nome completo
    let remoteStylesCount = 0;
    const processedLibraries = new Set<string>();
    const remoteStylesByKey = new Map<string, any[]>();

    console.log(
      "[detectTokenLibraries] Buscando informações completas de cada estilo..."
    );

    // Array para armazenar todos os estilos (incluindo os simulados de variables)
    const allStyles: any[] = [];

    // Primeiro, adicionar os estilos simulados das variables COLOR
    for (const [variableId, variableData] of variablesFound.entries()) {
      if (variableData.resolvedType === "COLOR") {
        // Obter o valor da variável para o modo atual
        try {
          const variable = await figma.variables.getVariableByIdAsync(
            variableId
          );
          if (variable && variable.valuesByMode) {
            // Pegar o primeiro modo disponível
            const firstMode = Object.keys(variable.valuesByMode)[0];
            const colorValue = variable.valuesByMode[firstMode];

            if (
              colorValue &&
              typeof colorValue === "object" &&
              "r" in colorValue
            ) {
              // Criar um objeto estilo simulado para o processamento normal
              const simulatedStyle = {
                id: `VAR:${variableId}`,
                key: variableData.key || variableId,
                name: variableData.name,
                type: "PAINT",
                description: `Variable from ${variableData.collectionName}`,
                paints: [
                  {
                    type: "SOLID",
                    color: colorValue,
                    opacity: colorValue.a !== undefined ? colorValue.a : 1
                  }
                ],
                remote: false,
                variableId: variableId
              };

              // Adicionar ao array de styles para processamento
              allStyles.push(simulatedStyle);

              console.log(
                `[detectTokenLibraries] Variable COLOR convertida para fill: ${variableData.name}`
              );
            }
          }
        } catch (error) {
          console.warn(
            `[detectTokenLibraries] Erro ao converter variable ${variableData.name}:`,
            error
          );
        }
      }
    }

    // Depois, processar os estilos encontrados no documento
    for (const styleId of styleIdsFound) {
      try {
        // Buscar o estilo completo do Figma
        const style = await figma.getStyleByIdAsync(styleId);

        if (!style) {
          console.warn(
            `[detectTokenLibraries] Estilo ${styleId} não encontrado`
          );
          continue;
        }

        console.log(
          `[detectTokenLibraries] Estilo encontrado: ${style.name} (${style.type})`
        );

        // Adicionar ao array de estilos
        allStyles.push(style);
      } catch (error) {
        console.warn(
          `[detectTokenLibraries] Erro ao buscar estilo ${styleId}:`,
          error
        );
      }
    }

    // Processar todos os estilos (reais e simulados)
    for (const style of allStyles) {
      try {
        // Log detalhado do token sendo salvo
        console.log(`[detectTokenLibraries] === SALVANDO TOKEN ===`);
        console.log(`[detectTokenLibraries]   ID: ${style.id}`);
        console.log(`[detectTokenLibraries]   KEY: ${style.key}`);
        console.log(`[detectTokenLibraries]   NAME: ${style.name}`);
        console.log(`[detectTokenLibraries]   TYPE: ${style.type}`);

        const isRemote = style.remote === true;

        if (isRemote) {
          remoteStylesCount++;
        }

        // Tentar obter o nome da biblioteca de forma correta
        let libraryName = fileName;
        let libraryKey = fileName;

        if (isRemote) {
          // Para estilos remotos, extrair o library key
          try {
            const styleKey = style.key;

            if (styleKey) {
              // Extrair o library key do style key (formato: libraryKey:styleLocalKey)
              const keyParts = styleKey.split(":");
              if (keyParts.length > 1) {
                const libKey = keyParts[0];
                libraryKey = libKey;

                // Tentar extrair do nome do estilo (primeira parte antes da barra)
                // Muitas bibliotecas usam convenção: "LibraryName/Category/Token"
                const nameParts = style.name.split("/");
                if (nameParts.length > 1) {
                  // Usar a primeira parte como nome da biblioteca
                  libraryName = nameParts[0].trim();
                } else {
                  // Fallback: usar um identificador baseado no key
                  libraryName = `Biblioteca Remota (${libKey.substring(0, 8)})`;
                }

                // Log apenas uma vez por biblioteca
                if (!processedLibraries.has(libraryKey)) {
                  console.log(
                    `[detectTokenLibraries] Biblioteca remota identificada: ${libraryName} (key: ${libraryKey})`
                  );
                  processedLibraries.add(libraryKey);
                }
              }
            }
          } catch (error) {
            console.warn(
              `[detectTokenLibraries] Erro ao processar biblioteca remota:`,
              error
            );
            libraryName = "Biblioteca Remota";
            libraryKey = "remote-unknown";
          }
        }

        // Criar biblioteca se não existir
        if (!librariesMap.has(libraryKey)) {
          console.log(
            `[detectTokenLibraries] Criando nova biblioteca: ${libraryName}`
          );
          librariesMap.set(libraryKey, {
            name: libraryName,
            key: libraryKey,
            fills: [],
            text: [],
            effects: [],
            strokes: [],
            gaps: [],
            paddings: [],
            strokeWidths: [],
            grids: [],
            variables: [],
            isLocal: libraryKey === fileName
          });
        }

        const library = librariesMap.get(libraryKey);
        if (!library) continue;

        // Adicionar o estilo à categoria apropriada
        if (style.type === "PAINT") {
          const paint = (style as any).paints?.[0] || null;
          const styleData = {
            id: style.id,
            key: style.key,
            name: style.name,
            description: style.description || "",
            type: paint?.type || "SOLID",
            color: paint?.color || { r: 0, g: 0, b: 0 },
            opacity: paint?.opacity !== undefined ? paint.opacity : 1,
            value: paint?.color
              ? `rgba(${Math.round(paint.color.r * 255)}, ${Math.round(
                  paint.color.g * 255
                )}, ${Math.round(paint.color.b * 255)}, ${
                  paint.opacity !== undefined ? paint.opacity : 1
                })`
              : undefined
          };

          // Evitar duplicatas
          if (!library.fills.find((f: any) => f.id === styleData.id)) {
            library.fills.push(styleData);
          }
          if (!library.strokes.find((s: any) => s.id === styleData.id)) {
            library.strokes.push(styleData);
          }
        } else if (style.type === "TEXT") {
          const styleData = {
            id: style.id,
            key: style.key,
            name: style.name,
            description: style.description || "",
            fontSize: (style as any).fontSize,
            fontFamily: (style as any).fontName?.family,
            fontWeight: (style as any).fontName?.style,
            lineHeight: (style as any).lineHeight,
            letterSpacing: (style as any).letterSpacing
          };

          if (!library.text.find((t: any) => t.id === styleData.id)) {
            library.text.push(styleData);
          }
        } else if (style.type === "EFFECT") {
          const styleData = {
            id: style.id,
            key: style.key,
            name: style.name,
            description: style.description || "",
            effects: (style as any).effects || []
          };

          if (!library.effects.find((e: any) => e.id === styleData.id)) {
            library.effects.push(styleData);
          }
        }
      } catch (error) {
        console.warn(
          `[detectTokenLibraries] Erro ao processar estilo ${style.id}:`,
          error
        );
      }
    }

    console.log(
      `[detectTokenLibraries] Total de estilos remotos encontrados: ${remoteStylesCount}`
    );

    // Log detalhado de cada biblioteca antes de retornar
    console.log("[detectTokenLibraries] === RESUMO FINAL DAS BIBLIOTECAS ===");
    librariesMap.forEach((lib, key) => {
      const totalTokens =
        (lib.fills?.length || 0) +
        (lib.text?.length || 0) +
        (lib.effects?.length || 0) +
        (lib.gaps?.length || 0) +
        (lib.paddings?.length || 0);

      console.log(`[detectTokenLibraries] Biblioteca: ${lib.name}`);
      console.log(
        `[detectTokenLibraries]   - Fills: ${lib.fills?.length || 0}`
      );
      console.log(`[detectTokenLibraries]   - Text: ${lib.text?.length || 0}`);
      console.log(
        `[detectTokenLibraries]   - Effects: ${lib.effects?.length || 0}`
      );
      console.log(`[detectTokenLibraries]   - Gaps: ${lib.gaps?.length || 0}`);
      console.log(
        `[detectTokenLibraries]   - Paddings: ${lib.paddings?.length || 0}`
      );
      console.log(`[detectTokenLibraries]   - TOTAL: ${totalTokens} tokens`);
    });

    const paintStyles = localPaintStyles;
    const textStyles = localTextStyles;
    const effectStyles = localEffectStyles;
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
      grids,
      variables: Array.from(variablesFound.values())
    };

    // Atualizar a biblioteca local com os tokens de layout e variables
    const localLibrary = librariesMap.get(fileName);
    if (localLibrary) {
      localLibrary.gaps = gaps;
      localLibrary.paddings = paddings;
      localLibrary.strokeWidths = strokeWidths;
      localLibrary.grids = grids;
      localLibrary.variables = Array.from(variablesFound.values());
    }

    // Converter o mapa em array
    const allLibraries = Array.from(librariesMap.values());

    console.log(
      "[detectTokenLibraries] Total de bibliotecas detectadas:",
      allLibraries.length
    );

    allLibraries.forEach(lib => {
      console.log(
        `[detectTokenLibraries] Biblioteca: ${lib.name} (${
          lib.isLocal ? "Local" : "Remota"
        })`,
        "- Fills:",
        lib.fills.length,
        "- Text:",
        lib.text.length,
        "- Effects:",
        lib.effects.length,
        "- Gaps:",
        lib.gaps.length,
        "- Paddings:",
        lib.paddings.length,
        "- Variables:",
        lib.variables?.length || 0
      );

      // Log detalhado dos tokens extraídos para verificar se nome e key estão presentes
      if (lib.fills.length > 0) {
        console.log(
          `[detectTokenLibraries] Exemplo de token fill de ${lib.name}:`,
          lib.fills[0]
        );
      }
      if (lib.text.length > 0) {
        console.log(
          `[detectTokenLibraries] Exemplo de token text de ${lib.name}:`,
          lib.text[0]
        );
      }
      if (lib.effects.length > 0) {
        console.log(
          `[detectTokenLibraries] Exemplo de token effect de ${lib.name}:`,
          lib.effects[0]
        );
      }
    });

    return allLibraries;
  } catch (error) {
    console.error("[detectTokenLibraries] Erro ao detectar tokens:", error);
    return [];
  }
}
