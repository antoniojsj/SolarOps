declare function require(path: string): any;

declare module "*.module.css" {
  const classes: { [key: string]: string };
  export default classes;
}

declare global {
  const parent: {
    postMessage(message: any, targetOrigin: string): void;
  };

  interface Window {
    parent: typeof parent;
  }
}

export {};
