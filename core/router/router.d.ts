// Type definitions for Fynix Router

export interface FynixRouter {
  mountRouter(selector?: string): void;
  navigate(path: string, props?: Record<string, any>): void;
  replace(path: string, props?: Record<string, any>): void;
  back(): void;
  cleanup(): void;
  routes: Record<string, any>;
  dynamicRoutes: Array<{
    pattern: string;
    regex: RegExp;
    component: any;
    params: string[];
  }>;
}

export default function createFynix(): FynixRouter;

export function setLinkProps(key: string, props: Record<string, any>): void;
export function clearLinkProps(key: string): void;
