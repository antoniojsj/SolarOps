/**
 * Network Configuration and Error Handling
 * Manages allowed domains and provides safe fetch wrapper
 */

// Whitelist of allowed domains for security and CORS compliance
export const ALLOWED_DOMAINS = [
  "cdn.tailwindcss.com",
  "fonts.googleapis.com",
  "fonts.gstatic.com",
  "lh3.googleusercontent.com",
  "www.figma.com",
  "static.figma.com"
];

/**
 * Check if a URL is from an allowed domain
 */
export function isUrlAllowed(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return ALLOWED_DOMAINS.some(domain => urlObj.hostname.includes(domain));
  } catch {
    return false;
  }
}

/**
 * Safe fetch wrapper with timeout and domain validation
 */
export async function safeFetch(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = 5000, ...fetchOptions } = options;

  // Validate domain
  if (!isUrlAllowed(url)) {
    throw new Error(`URL not from whitelisted domain: ${url}`);
  }

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Retry logic for failed network requests
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit & { timeout?: number; retries?: number } = {}
): Promise<Response> {
  const { retries = 2, ...fetchOptions } = options;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await safeFetch(url, fetchOptions);
    } catch (error) {
      lastError = error as Error;
      if (attempt < retries) {
        // Exponential backoff: 100ms, 200ms, 400ms, etc.
        await new Promise(resolve =>
          setTimeout(resolve, 100 * Math.pow(2, attempt))
        );
      }
    }
  }

  throw lastError || new Error("Failed to fetch after retries");
}
