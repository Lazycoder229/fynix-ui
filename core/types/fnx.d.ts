// Enhanced .fnx file type declarations
// This file provides better TypeScript support for Fynix Single File Components

/**
 * Virtual DOM node type for Fynix
 */
export interface VNode {
    type: string | symbol | ((props: any) => any);
    props: Record<string, any>;
    key: string | number | null;
    _domNode?: Node;
    _rendered?: VNode;
    _state?: any;
}

/**
 * Props type for Fynix components
 */
export interface FynixComponentProps {
    children?: VNode | VNode[];
    key?: string | number;
    [prop: string]: any;
}

/**
 * Fynix component function type
 */
export type FynixComponent<P extends FynixComponentProps = FynixComponentProps> =
    (props: P) => VNode | Promise<VNode>;

/**
 * Parsed SFC structure for .fnx files
 */
export interface ParsedFnxFile {
    /** The <logic> block content */
    logic: string;
    /** The <view> block content (JSX) */
    view: string;
    /** The <style> block content */
    style: string;
    /** Whether the style is scoped */
    isScoped: boolean;
}

/**
 * Module declaration for .fnx files with enhanced typing
 */
declare module "*.fnx" {
    const Component: FynixComponent;
    export default Component;
}
