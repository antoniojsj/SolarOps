import { writeFile } from "fs/promises";
import { join } from "path";
import { mkdir } from "fs/promises";

const DATA_DIR = "data_json";

export async function saveTokensToFile(
  tokens: any,
  filename: string = "design-tokens.json"
): Promise<void> {
  try {
    // Ensure the data directory exists
    await mkdir(DATA_DIR, { recursive: true });

    const filePath = join(DATA_DIR, filename);
    const content = JSON.stringify(tokens, null, 2);

    await writeFile(filePath, content, "utf-8");
    console.log(`Design tokens saved to ${filePath}`);
  } catch (error) {
    console.error("Error saving tokens to file:", error);
    throw error;
  }
}
