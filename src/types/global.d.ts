declare function require(path: string): any;

declare global {
  const parent: {
    postMessage(message: any, targetOrigin: string): void;
  };

  interface Window {
    parent: typeof parent;
  }
}

export {};
