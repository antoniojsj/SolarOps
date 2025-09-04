// Using Figma's clientStorage for data persistence instead of file system
const DATA_NAMESPACE = "solarops_data";
const TOKENS_KEY = `${DATA_NAMESPACE}/tokens`;
const LIBRARIES_KEY = `${DATA_NAMESPACE}/libraries`;

/**
 * Saves design tokens to a JSON file
 * @param tokens - The tokens to save
 * @param filename - The name of the file (default: "design-tokens.json")
 */
export async function saveTokensToFile(
  tokens: any,
  filename: string = "design-tokens.json"
): Promise<string> {
  try {
    // Store tokens with filename as key
    const key = `${TOKENS_KEY}/${filename}`;
    await figma.clientStorage.setAsync(key, JSON.stringify(tokens, null, 2));
    console.log(`Tokens saved to client storage: ${key}`);
    return key;
  } catch (error) {
    console.error("Error saving tokens to client storage:", error);
    throw error;
  }
}

/**
 * Saves library tokens to Figma's client storage
 * @param libraries - Array of library objects to save
 * @param filename - Optional custom filename (without extension)
 * @returns The path to the saved file
 */
export async function saveLibraryTokens(
  libraries: any[],
  filename?: string
): Promise<string> {
  try {
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .replace("T", "_")
      .slice(0, 19);

    // Create a safe key from library names or use default
    const libNames = libraries
      .map(lib =>
        (lib.name || "library").toLowerCase().replace(/[^a-z0-9]/g, "_")
      )
      .join("_");

    const baseName = filename || `libraries_${libNames}_${timestamp}.json`;
    const key = `${LIBRARIES_KEY}/${baseName}`;

    const data = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      libraries: libraries
    };

    await figma.clientStorage.setAsync(key, JSON.stringify(data));

    console.log(`Library tokens saved to client storage: ${key}`);
    return key;
  } catch (error) {
    console.error("Error saving library tokens to client storage:", error);
    throw error;
  }
}
