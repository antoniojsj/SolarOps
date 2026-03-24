// Sistema híbrido de detecção de tokens: Plugin API + REST API

import { fetchLibraryStylesFromApi, importStyleByKey } from "./figmaRestApi";

interface HybridToken {
  id: string;
  key: string;
  name: string;
  description: string;
  type: string;
  source: "local" | "api" | "both";
  [key: string]: any;
}

interface HybridLibrary {
  name: string;
  fileKey?: string;
  fills: HybridToken[];
  text: HybridToken[];
  effects: HybridToken[];
  strokes: HybridToken[];
  totalTokens: number;
  apiTokens: number;
  localTokens: number;
  duplicates: number;
}

/**
 * Detecta tokens usando abordagem híbrida: Plugin API + REST API
 * @param localTokens - Tokens detectados localmente via Plugin API
 * @param libraryFileKey - File key da biblioteca (opcional)
 * @param accessToken - Token de acesso do Figma (opcional)
 * @returns Biblioteca com tokens mesclados sem duplicação
 */
export async function detectTokensHybrid(
  localTokens: any,
  libraryFileKey?: string,
  accessToken?: string
): Promise<HybridLibrary> {
  console.log("[detectTokensHybrid] Iniciando detecção híbrida de tokens");
  console.log("[detectTokensHybrid] Tokens locais:", {
    fills: localTokens.fills?.length || 0,
    text: localTokens.text?.length || 0,
    effects: localTokens.effects?.length || 0
  });

  const result: HybridLibrary = {
    name: localTokens.name || "Biblioteca",
    fileKey: libraryFileKey,
    fills: [],
    text: [],
    effects: [],
    strokes: [],
    totalTokens: 0,
    apiTokens: 0,
    localTokens: 0,
    duplicates: 0
  };

  // Mapas para detectar duplicatas por key
  const fillsMap = new Map<string, HybridToken>();
  const textMap = new Map<string, HybridToken>();
  const effectsMap = new Map<string, HybridToken>();

  // 1. Adicionar tokens locais aos mapas
  console.log("[detectTokensHybrid] Processando tokens locais...");

  if (localTokens.fills && Array.isArray(localTokens.fills)) {
    localTokens.fills.forEach((token: any) => {
      if (token.key) {
        fillsMap.set(token.key, {
          ...token,
          source: "local"
        });
      }
    });
  }

  if (localTokens.text && Array.isArray(localTokens.text)) {
    localTokens.text.forEach((token: any) => {
      if (token.key) {
        textMap.set(token.key, {
          ...token,
          source: "local"
        });
      }
    });
  }

  if (localTokens.effects && Array.isArray(localTokens.effects)) {
    localTokens.effects.forEach((token: any) => {
      if (token.key) {
        effectsMap.set(token.key, {
          ...token,
          source: "local"
        });
      }
    });
  }

  result.localTokens = fillsMap.size + textMap.size + effectsMap.size;
  console.log(
    `[detectTokensHybrid] Tokens locais processados: ${result.localTokens}`
  );

  // 2. Se tiver fileKey e accessToken, buscar da API
  if (libraryFileKey && accessToken) {
    try {
      console.log("[detectTokensHybrid] Buscando tokens via REST API...");
      const apiStyles = await fetchLibraryStylesFromApi(
        libraryFileKey,
        accessToken
      );

      console.log(
        `[detectTokensHybrid] API retornou ${apiStyles.length} estilos`
      );

      let apiTokensAdded = 0;
      let duplicatesFound = 0;

      // Processar cada estilo da API
      for (const apiStyle of apiStyles) {
        const styleKey = apiStyle.key;

        // Determinar o tipo e o mapa correspondente
        let targetMap: Map<string, HybridToken>;
        let tokenType: string;

        if (apiStyle.style_type === "FILL") {
          targetMap = fillsMap;
          tokenType = "fill";
        } else if (apiStyle.style_type === "TEXT") {
          targetMap = textMap;
          tokenType = "text";
        } else if (apiStyle.style_type === "EFFECT") {
          targetMap = effectsMap;
          tokenType = "effect";
        } else {
          continue; // Ignorar outros tipos por enquanto
        }

        // Verificar se já existe localmente
        if (targetMap.has(styleKey)) {
          // Já existe - marcar como 'both'
          const existingToken = targetMap.get(styleKey)!;
          existingToken.source = "both";
          duplicatesFound++;
        } else {
          // Não existe localmente - importar e adicionar
          try {
            const importedStyle = await importStyleByKey(styleKey);

            if (importedStyle) {
              const newToken: HybridToken = {
                id: importedStyle.id,
                key: styleKey,
                name: apiStyle.name,
                description: apiStyle.description || "",
                type: tokenType,
                source: "api",
                nodeId: apiStyle.node_id,
                fileKey: apiStyle.file_key
              };

              // Adicionar propriedades específicas do tipo
              if (tokenType === "fill" && importedStyle.paints) {
                const paint = importedStyle.paints[0];
                newToken.color = paint?.color;
                newToken.opacity = paint?.opacity;
                newToken.paintType = paint?.type;
              } else if (tokenType === "text") {
                newToken.fontSize = importedStyle.fontSize;
                newToken.fontFamily = importedStyle.fontName?.family;
                newToken.fontWeight = importedStyle.fontName?.style;
                newToken.lineHeight = importedStyle.lineHeight;
                newToken.letterSpacing = importedStyle.letterSpacing;
              } else if (tokenType === "effect") {
                newToken.effects = importedStyle.effects;
              }

              targetMap.set(styleKey, newToken);
              apiTokensAdded++;
            }
          } catch (error) {
            console.warn(
              `[detectTokensHybrid] Erro ao importar estilo ${styleKey}:`,
              error
            );
          }
        }
      }

      result.apiTokens = apiTokensAdded;
      result.duplicates = duplicatesFound;

      console.log(
        `[detectTokensHybrid] Tokens da API adicionados: ${apiTokensAdded}`
      );
      console.log(
        `[detectTokensHybrid] Duplicatas encontradas: ${duplicatesFound}`
      );
    } catch (error) {
      console.error(
        "[detectTokensHybrid] Erro ao buscar tokens da API:",
        error
      );
      console.log("[detectTokensHybrid] Continuando apenas com tokens locais");
    }
  } else {
    console.log(
      "[detectTokensHybrid] Sem fileKey ou accessToken - usando apenas tokens locais"
    );
  }

  // 3. Converter mapas para arrays
  result.fills = Array.from(fillsMap.values());
  result.text = Array.from(textMap.values());
  result.effects = Array.from(effectsMap.values());

  // Strokes usam os mesmos estilos que fills (não duplicar)
  result.strokes = result.fills;

  result.totalTokens =
    result.fills.length + result.text.length + result.effects.length;

  console.log("[detectTokensHybrid] === RESUMO FINAL ===");
  console.log(`[detectTokensHybrid] Total de tokens: ${result.totalTokens}`);
  console.log(`[detectTokensHybrid]   - Fills: ${result.fills.length}`);
  console.log(`[detectTokensHybrid]   - Text: ${result.text.length}`);
  console.log(`[detectTokensHybrid]   - Effects: ${result.effects.length}`);
  console.log(`[detectTokensHybrid]   - Tokens locais: ${result.localTokens}`);
  console.log(`[detectTokensHybrid]   - Tokens da API: ${result.apiTokens}`);
  console.log(
    `[detectTokensHybrid]   - Duplicatas evitadas: ${result.duplicates}`
  );

  return result;
}

/**
 * Extrai o file_key de um estilo remoto
 * @param style - Estilo do Figma
 * @returns File key ou null
 */
export function getFileKeyFromStyle(style: any): string | null {
  try {
    if (style.remote && style.key) {
      // O key de um estilo remoto tem formato: fileKey:styleLocalKey
      const parts = style.key.split(":");
      if (parts.length > 1) {
        return parts[0];
      }
    }
    return null;
  } catch (error) {
    console.error("[getFileKeyFromStyle] Erro:", error);
    return null;
  }
}
