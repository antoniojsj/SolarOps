// Funções para interagir com a REST API do Figma

interface FigmaStyle {
  key: string;
  file_key: string;
  node_id: string;
  style_type: "FILL" | "TEXT" | "EFFECT" | "GRID";
  name: string;
  description: string;
}

interface FigmaApiResponse {
  status: number;
  error: boolean;
  meta: {
    styles: FigmaStyle[];
  };
}

/**
 * Busca todos os estilos de um arquivo de biblioteca usando a REST API
 * @param fileKey - Key do arquivo da biblioteca (ex: "abc123def456")
 * @param accessToken - Token de acesso pessoal do Figma
 * @returns Array de estilos da biblioteca
 */
export async function fetchLibraryStylesFromApi(
  fileKey: string,
  accessToken: string
): Promise<FigmaStyle[]> {
  try {
    console.log(
      `[fetchLibraryStylesFromApi] Buscando estilos do arquivo: ${fileKey}`
    );

    const response = await fetch(
      `https://api.figma.com/v1/files/${fileKey}/styles`,
      {
        method: "GET",
        headers: {
          "X-Figma-Token": accessToken
        }
      }
    );

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data: FigmaApiResponse = await response.json();

    console.log(
      `[fetchLibraryStylesFromApi] Estilos encontrados: ${data.meta.styles.length}`
    );

    return data.meta.styles;
  } catch (error) {
    console.error("[fetchLibraryStylesFromApi] Erro ao buscar estilos:", error);
    throw error;
  }
}

/**
 * Importa um estilo da biblioteca para o documento atual usando sua key
 * @param styleKey - Key do estilo a ser importado
 * @returns O estilo importado
 */
export async function importStyleByKey(styleKey: string): Promise<any> {
  try {
    const style = await figma.importStyleByKeyAsync(styleKey);
    return style;
  } catch (error) {
    console.error(
      `[importStyleByKey] Erro ao importar estilo ${styleKey}:`,
      error
    );
    return null;
  }
}

/**
 * Extrai o file_key de uma URL do Figma
 * @param url - URL do arquivo Figma (ex: "https://www.figma.com/file/abc123/My-Library")
 * @returns O file_key extraído ou null
 */
export function extractFileKeyFromUrl(url: string): string | null {
  try {
    const match = url.match(/\/file\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  } catch (error) {
    console.error("[extractFileKeyFromUrl] Erro ao extrair file_key:", error);
    return null;
  }
}

/**
 * Obtém detalhes completos de um estilo usando a REST API
 * @param styleKey - Key do estilo
 * @param accessToken - Token de acesso pessoal do Figma
 * @returns Detalhes do estilo
 */
export async function fetchStyleDetails(
  styleKey: string,
  accessToken: string
): Promise<any> {
  try {
    const response = await fetch(
      `https://api.figma.com/v1/styles/${styleKey}`,
      {
        method: "GET",
        headers: {
          "X-Figma-Token": accessToken
        }
      }
    );

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.meta;
  } catch (error) {
    console.error(
      `[fetchStyleDetails] Erro ao buscar detalhes do estilo ${styleKey}:`,
      error
    );
    return null;
  }
}
