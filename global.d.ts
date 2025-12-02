// ===============================================================
// 🌐 RestJS JSX Type Declarations with "r-" directives
// ===============================================================

declare namespace RestJSX {
  // ---------- 🔹 Base Attributes ----------
  interface DirectiveAttributes {
    //  Custom RestJS Directives
    "r-if"?: boolean;
    "r-show"?: boolean;
    "r-for"?: string;
    "r-text"?: string | number | boolean;
    "r-html"?: string;
    "r-bind"?: Record<string, any>;
    "r-model"?: any;

    //  Event Directives (strongly typed)
    "r-click"?: (event: MouseEvent) => void;
    "r-dblclick"?: (event: MouseEvent) => void;
    "r-input"?: (event: InputEvent) => void;
    "r-change"?: (event: Event) => void;
    "r-submit"?: (event: SubmitEvent) => void;
    "r-focus"?: (event: FocusEvent) => void;
    "r-blur"?: (event: FocusEvent) => void;
    "r-keydown"?: (event: KeyboardEvent) => void;
    "r-keyup"?: (event: KeyboardEvent) => void;
    "r-mouseenter"?: (event: MouseEvent) => void;
    "r-mouseleave"?: (event: MouseEvent) => void;
  }

  // ---------- 🔹 HTML + Global Attributes ----------
  interface HTMLAttributes<T = any> extends DirectiveAttributes {
    id?: string;
    class?: string;
    style?: string | Record<string, string | number>;
    title?: string;
    role?: string;
    hidden?: boolean;
    tabIndex?: number;
    lang?: string;
    draggable?: boolean;
    accessKey?: string;
    dir?: "ltr" | "rtl" | "auto";
    spellCheck?: boolean;
    // Data & ARIA
    [dataAttr: `data-${string}`]: any;
    [ariaAttr: `aria-${string}`]: any;
  }

  // ---------- 🔹 Element-Specific ----------
  interface AnchorHTMLAttributes extends HTMLAttributes<HTMLAnchorElement> {
    href?: string;
    target?: "_self" | "_blank" | "_parent" | "_top";
    rel?: string;
    download?: string | boolean;
  }

  interface ImgHTMLAttributes extends HTMLAttributes<HTMLImageElement> {
    src?: string;
    alt?: string;
    width?: number | string;
    height?: number | string;
    loading?: "lazy" | "eager";
  }

  interface InputHTMLAttributes extends HTMLAttributes<HTMLInputElement> {
    type?: string;
    value?: string | number | readonly string[];
    placeholder?: string;
    checked?: boolean;
    disabled?: boolean;
    name?: string;
    readOnly?: boolean;
  }

  interface ButtonHTMLAttributes extends HTMLAttributes<HTMLButtonElement> {
    type?: "button" | "submit" | "reset";
    disabled?: boolean;
  }

  interface FormHTMLAttributes extends HTMLAttributes<HTMLFormElement> {
    action?: string;
    method?: "get" | "post";
  }

  interface TextareaHTMLAttributes extends HTMLAttributes<HTMLTextAreaElement> {
    value?: string;
    placeholder?: string;
    rows?: number;
    cols?: number;
  }

  interface SelectHTMLAttributes extends HTMLAttributes<HTMLSelectElement> {
    value?: string | number | readonly string[];
    multiple?: boolean;
    disabled?: boolean;
  }

  interface OptionHTMLAttributes extends HTMLAttributes<HTMLOptionElement> {
    value?: string | number;
    selected?: boolean;
    disabled?: boolean;
  }

  // ---------- 🔹 SVG ----------
  interface SVGAttributes extends HTMLAttributes<SVGElement> {
    fill?: string;
    stroke?: string;
    strokeWidth?: string | number;
    viewBox?: string;
    cx?: string | number;
    cy?: string | number;
    r?: string | number;
    d?: string;
    x?: string | number;
    y?: string | number;
    width?: string | number;
    height?: string | number;
  }

  // ---------- 🔹 Intrinsic Elements ----------
  interface IntrinsicElements {
    // Common HTML Elements
    a: AnchorHTMLAttributes;
    abbr: HTMLAttributes;
    address: HTMLAttributes;
    article: HTMLAttributes;
    aside: HTMLAttributes;
    audio: HTMLAttributes;
    b: HTMLAttributes;
    button: ButtonHTMLAttributes;
    canvas: HTMLAttributes;
    caption: HTMLAttributes;
    cite: HTMLAttributes;
    code: HTMLAttributes;
    col: HTMLAttributes;
    colgroup: HTMLAttributes;
    data: HTMLAttributes;
    datalist: HTMLAttributes;
    dd: HTMLAttributes;
    del: HTMLAttributes;
    details: HTMLAttributes;
    div: HTMLAttributes;
    dl: HTMLAttributes;
    dt: HTMLAttributes;
    em: HTMLAttributes;
    fieldset: HTMLAttributes;
    figcaption: HTMLAttributes;
    figure: HTMLAttributes;
    footer: HTMLAttributes;
    form: FormHTMLAttributes;
    h1: HTMLAttributes;
    h2: HTMLAttributes;
    h3: HTMLAttributes;
    h4: HTMLAttributes;
    h5: HTMLAttributes;
    h6: HTMLAttributes;
    header: HTMLAttributes;
    hr: HTMLAttributes;
    i: HTMLAttributes;
    iframe: HTMLAttributes;
    img: ImgHTMLAttributes;
    input: InputHTMLAttributes;
    label: HTMLAttributes;
    legend: HTMLAttributes;
    li: HTMLAttributes;
    main: HTMLAttributes;
    mark: HTMLAttributes;
    menu: HTMLAttributes;
    meta: HTMLAttributes;
    nav: HTMLAttributes;
    noscript: HTMLAttributes;
    object: HTMLAttributes;
    ol: HTMLAttributes;
    option: OptionHTMLAttributes;
    output: HTMLAttributes;
    p: HTMLAttributes;
    pre: HTMLAttributes;
    progress: HTMLAttributes;
    q: HTMLAttributes;
    section: HTMLAttributes;
    select: SelectHTMLAttributes;
    small: HTMLAttributes;
    span: HTMLAttributes;
    strong: HTMLAttributes;
    sub: HTMLAttributes;
    sup: HTMLAttributes;
    svg: SVGAttributes;
    path: SVGAttributes;
    circle: SVGAttributes;
    rect: SVGAttributes;
    line: SVGAttributes;
    polygon: SVGAttributes;
    polyline: SVGAttributes;
    g: SVGAttributes;
    text: SVGAttributes;
    defs: SVGAttributes;
    symbol: SVGAttributes;
    use: SVGAttributes;
    // Modern
    dialog: HTMLAttributes;
    search: HTMLAttributes;
    summary: HTMLAttributes;
    time: HTMLAttributes;
    video: HTMLAttributes;
    // Fallback for custom components
    [elemName: string]: any;
  }
}

// ---------- 🔹 Extend Global JSX ----------
declare namespace JSX {
  interface IntrinsicElements extends RestJSX.IntrinsicElements {}
}
