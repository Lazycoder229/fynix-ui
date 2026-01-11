// Augment global JSX namespace for TypeScript compatibility
export {};
declare global {
  namespace JSX {
    type Element = FynixJSX.Element;
    interface ElementChildrenAttribute extends FynixJSX.ElementChildrenAttribute {}
    interface IntrinsicElements extends FynixJSX.IntrinsicElements {}
    // Optionally, add more interfaces if needed
  }
}
// JSX Type Definitions for Fynix

declare namespace FynixJSX {
  type Element = any;

  interface ElementChildrenAttribute {
    children: {};
  }

  // Base attributes for all HTML elements
  interface HTMLAttributes {
    // Core
    key?: string | number | null;
    children?: any;
    ref?: (el: any) => void;

    // Global HTML Attributes
    id?: string;
    class?: string;
    className?: string;
    style?: string | Partial<CSSStyleDeclaration>;
    title?: string;
    role?: string;
    hidden?: boolean;
    tabIndex?: number;
    tabindex?: number;
    lang?: string;
    draggable?: boolean;
    contentEditable?: boolean | "true" | "false" | "inherit";
    spellCheck?: boolean;
    translate?: "yes" | "no";
    accessKey?: string;
    dir?: "ltr" | "rtl" | "auto";

    // ARIA Attributes
    "aria-label"?: string;
    "aria-labelledby"?: string;
    "aria-describedby"?: string;
    "aria-hidden"?: boolean | "true" | "false";
    "aria-expanded"?: boolean | "true" | "false";
    "aria-controls"?: string;
    "aria-live"?: "polite" | "assertive" | "off";
    "aria-atomic"?: boolean | "true" | "false";
    "aria-busy"?: boolean | "true" | "false";
    "aria-checked"?: boolean | "true" | "false" | "mixed";
    "aria-disabled"?: boolean | "true" | "false";
    "aria-selected"?: boolean | "true" | "false";
    "aria-pressed"?: boolean | "true" | "false" | "mixed";
    "aria-invalid"?: boolean | "true" | "false";
    "aria-required"?: boolean | "true" | "false";

    // Fynix Event Directives (r-*)
    "r-click"?: (this: HTMLElement, event: MouseEvent) => void;
    "r-dblclick"?: (this: HTMLElement, event: MouseEvent) => void;
    "r-input"?: (this: HTMLElement, event: Event) => void;
    "r-change"?: (this: HTMLElement, event: Event) => void;
    "r-submit"?: (this: HTMLElement, event: Event) => void;
    "r-focus"?: (this: HTMLElement, event: FocusEvent) => void;
    "r-blur"?: (this: HTMLElement, event: FocusEvent) => void;
    "r-keydown"?: (this: HTMLElement, event: KeyboardEvent) => void;
    "r-keyup"?: (this: HTMLElement, event: KeyboardEvent) => void;
    "r-keypress"?: (this: HTMLElement, event: KeyboardEvent) => void;
    "r-mouseenter"?: (this: HTMLElement, event: MouseEvent) => void;
    "r-mouseleave"?: (this: HTMLElement, event: MouseEvent) => void;
    "r-mouseover"?: (this: HTMLElement, event: MouseEvent) => void;
    "r-mouseout"?: (this: HTMLElement, event: MouseEvent) => void;
    "r-mousedown"?: (this: HTMLElement, event: MouseEvent) => void;
    "r-mouseup"?: (this: HTMLElement, event: MouseEvent) => void;
    "r-mousemove"?: (this: HTMLElement, event: MouseEvent) => void;
    "r-scroll"?: (this: HTMLElement, event: Event) => void;
    "r-class"?: string | { value: string; subscribe: (cb: () => void) => () => void };
    rc?: string | { value: string; subscribe: (cb: () => void) => () => void };

    // Data attributes
    [dataAttr: `data-${string}`]: any;
  }

  interface AnchorHTMLAttributes extends HTMLAttributes {
    href?: string;
    target?: "_self" | "_blank" | "_parent" | "_top" | string;
    rel?: string;
    download?: string | boolean;
    type?: string;
  }

  interface ButtonHTMLAttributes extends HTMLAttributes {
    type?: "button" | "submit" | "reset";
    disabled?: boolean;
    name?: string;
    value?: string;
    autoFocus?: boolean;
    autofocus?: boolean;
  }

  interface FormHTMLAttributes extends HTMLAttributes {
    action?: string;
    method?: "get" | "post" | "dialog";
    encType?: string;
    enctype?: string;
    target?: string;
    noValidate?: boolean;
    novalidate?: boolean;
    autoComplete?: "on" | "off";
    autocomplete?: "on" | "off";
  }

  interface InputHTMLAttributes extends HTMLAttributes {
    type?: "button" | "checkbox" | "color" | "date" | "datetime-local" 
      | "email" | "file" | "hidden" | "image" | "month" | "number" 
      | "password" | "radio" | "range" | "reset" | "search" 
      | "submit" | "tel" | "text" | "time" | "url" | "week";
    value?: string | number | readonly string[];
    placeholder?: string;
    checked?: boolean;
    disabled?: boolean;
    required?: boolean;
    readOnly?: boolean;
    readonly?: boolean;
    name?: string;
    accept?: string;
    autoComplete?: string;
    autocomplete?: string;
    autoFocus?: boolean;
    autofocus?: boolean;
    min?: number | string;
    max?: number | string;
    step?: number | string;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    size?: number;
    multiple?: boolean;
  }

  interface TextareaHTMLAttributes extends HTMLAttributes {
    value?: string;
    placeholder?: string;
    rows?: number;
    cols?: number;
    disabled?: boolean;
    required?: boolean;
    readOnly?: boolean;
    readonly?: boolean;
    name?: string;
    maxLength?: number;
    minLength?: number;
    wrap?: "hard" | "soft" | "off";
  }

  interface SelectHTMLAttributes extends HTMLAttributes {
    value?: string | number | readonly string[];
    multiple?: boolean;
    disabled?: boolean;
    required?: boolean;
    name?: string;
    size?: number;
  }

  interface OptionHTMLAttributes extends HTMLAttributes {
    value?: string | number;
    selected?: boolean;
    disabled?: boolean;
    label?: string;
  }

  interface LabelHTMLAttributes extends HTMLAttributes {
    htmlFor?: string;
    for?: string;
    form?: string;
  }

  interface ImgHTMLAttributes extends HTMLAttributes {
    src?: string;
    alt?: string;
    width?: number | string;
    height?: number | string;
    loading?: "lazy" | "eager";
    decoding?: "async" | "sync" | "auto";
    crossOrigin?: "anonymous" | "use-credentials" | "";
    referrerPolicy?: ReferrerPolicy;
    srcSet?: string;
    sizes?: string;
    useMap?: string;
  }

  interface IframeHTMLAttributes extends HTMLAttributes {
    src?: string;
    srcdoc?: string;
    name?: string;
    width?: number | string;
    height?: number | string;
    sandbox?: string;
    allow?: string;
    allowFullScreen?: boolean;
    allowfullscreen?: boolean;
    referrerPolicy?: ReferrerPolicy;
    loading?: "lazy" | "eager";
  }

  interface CanvasHTMLAttributes extends HTMLAttributes {
    width?: number | string;
    height?: number | string;
  }

  interface VideoHTMLAttributes extends HTMLAttributes {
    src?: string;
    poster?: string;
    width?: number | string;
    height?: number | string;
    controls?: boolean;
    autoPlay?: boolean;
    autoplay?: boolean;
    loop?: boolean;
    muted?: boolean;
    preload?: "none" | "metadata" | "auto" | "";
    playsInline?: boolean;
    playsinline?: boolean;
  }

  interface AudioHTMLAttributes extends HTMLAttributes {
    src?: string;
    controls?: boolean;
    autoPlay?: boolean;
    autoplay?: boolean;
    loop?: boolean;
    muted?: boolean;
    preload?: "none" | "metadata" | "auto" | "";
  }

  interface SourceHTMLAttributes extends HTMLAttributes {
    src?: string;
    type?: string;
    media?: string;
    sizes?: string;
    srcSet?: string;
  }

  interface TrackHTMLAttributes extends HTMLAttributes {
    src?: string;
    kind?: "subtitles" | "captions" | "descriptions" | "chapters" | "metadata";
    srcLang?: string;
    label?: string;
    default?: boolean;
  }

  interface ScriptHTMLAttributes extends HTMLAttributes {
    src?: string;
    type?: string;
    async?: boolean;
    defer?: boolean;
    crossOrigin?: "anonymous" | "use-credentials" | "";
    integrity?: string;
    noModule?: boolean;
    nomodule?: boolean;
    referrerPolicy?: ReferrerPolicy;
  }

  interface LinkHTMLAttributes extends HTMLAttributes {
    href?: string;
    rel?: string;
    type?: string;
    as?: string;
    crossOrigin?: "anonymous" | "use-credentials" | "";
    integrity?: string;
    media?: string;
    referrerPolicy?: ReferrerPolicy;
    sizes?: string;
  }

  interface MetaHTMLAttributes extends HTMLAttributes {
    name?: string;
    content?: string;
    httpEquiv?: string;
    charset?: string;
  }

  interface StyleHTMLAttributes extends HTMLAttributes {
    media?: string;
    scoped?: boolean;
    type?: string;
  }

  interface TableHTMLAttributes extends HTMLAttributes {
    cellPadding?: number | string;
    cellpadding?: number | string;
    cellSpacing?: number | string;
    cellspacing?: number | string;
  }

  interface ColHTMLAttributes extends HTMLAttributes {
    span?: number;
  }

  interface ColgroupHTMLAttributes extends HTMLAttributes {
    span?: number;
  }

  interface TdHTMLAttributes extends HTMLAttributes {
    colSpan?: number;
    colspan?: number;
    rowSpan?: number;
    rowspan?: number;
    headers?: string;
  }

  interface ThHTMLAttributes extends HTMLAttributes {
    colSpan?: number;
    colspan?: number;
    rowSpan?: number;
    rowspan?: number;
    headers?: string;
    scope?: "col" | "row" | "colgroup" | "rowgroup";
    abbr?: string;
  }

  interface ProgressHTMLAttributes extends HTMLAttributes {
    value?: number | string;
    max?: number | string;
  }

  interface MeterHTMLAttributes extends HTMLAttributes {
    value?: number | string;
    min?: number | string;
    max?: number | string;
    low?: number | string;
    high?: number | string;
    optimum?: number | string;
  }

  interface DetailsHTMLAttributes extends HTMLAttributes {
    open?: boolean;
  }

  interface DialogHTMLAttributes extends HTMLAttributes {
    open?: boolean;
  }

  interface EmbedHTMLAttributes extends HTMLAttributes {
    src?: string;
    type?: string;
    width?: number | string;
    height?: number | string;
  }

  interface ObjectHTMLAttributes extends HTMLAttributes {
    data?: string;
    type?: string;
    name?: string;
    useMap?: string;
    width?: number | string;
    height?: number | string;
  }

  interface ParamHTMLAttributes extends HTMLAttributes {
    name?: string;
    value?: string;
  }

  interface FieldsetHTMLAttributes extends HTMLAttributes {
    disabled?: boolean;
    form?: string;
    name?: string;
  }

  interface TimeHTMLAttributes extends HTMLAttributes {
    dateTime?: string;
  }

  interface OutputHTMLAttributes extends HTMLAttributes {
    htmlFor?: string;
    for?: string;
    form?: string;
    name?: string;
  }

  interface DataHTMLAttributes extends HTMLAttributes {
    value?: string;
  }

  interface BlockquoteHTMLAttributes extends HTMLAttributes {
    cite?: string;
  }

  interface QHTMLAttributes extends HTMLAttributes {
    cite?: string;
  }

  interface DelHTMLAttributes extends HTMLAttributes {
    cite?: string;
    dateTime?: string;
  }

  interface InsHTMLAttributes extends HTMLAttributes {
    cite?: string;
    dateTime?: string;
  }

  interface OlHTMLAttributes extends HTMLAttributes {
    reversed?: boolean;
    start?: number;
    type?: "1" | "a" | "A" | "i" | "I";
  }

  interface LiHTMLAttributes extends HTMLAttributes {
    value?: number;
  }

  interface MapHTMLAttributes extends HTMLAttributes {
    name?: string;
  }

  interface AreaHTMLAttributes extends HTMLAttributes {
    alt?: string;
    coords?: string;
    shape?: "rect" | "circle" | "poly" | "default";
    href?: string;
    target?: string;
    download?: string;
    rel?: string;
  }

  interface BaseHTMLAttributes extends HTMLAttributes {
    href?: string;
    target?: string;
  }

  interface SlotHTMLAttributes extends HTMLAttributes {
    name?: string;
  }

  interface SVGAttributes extends HTMLAttributes {
    // Presentation attributes
    fill?: string;
    stroke?: string;
    strokeWidth?: string | number;
    strokeLinecap?: "butt" | "round" | "square";
    strokeLinejoin?: "miter" | "round" | "bevel";
    strokeDasharray?: string | number;
    strokeDashoffset?: string | number;
    strokeOpacity?: string | number;
    fillOpacity?: string | number;
    opacity?: string | number;
    
    // SVG specific
    viewBox?: string;
    xmlns?: string;
    xmlnsXlink?: string;
    preserveAspectRatio?: string;
    transform?: string;
    
    // Geometry
    width?: string | number;
    height?: string | number;
    cx?: string | number;
    cy?: string | number;
    r?: string | number;
    rx?: string | number;
    ry?: string | number;
    x?: string | number;
    y?: string | number;
    x1?: string | number;
    y1?: string | number;
    x2?: string | number;
    y2?: string | number;
    d?: string;
    points?: string;
    pathLength?: number;
    
    // Text
    textAnchor?: "start" | "middle" | "end";
    dominantBaseline?: "auto" | "middle" | "hanging" | "alphabetic";
    
    // Gradient/Filter
    offset?: string | number;
    stopColor?: string;
    stopOpacity?: string | number;
    gradientUnits?: "userSpaceOnUse" | "objectBoundingBox";
    gradientTransform?: string;
  }

  interface IntrinsicElements {
    // HTML Elements - Complete HTML5 Coverage
    a: AnchorHTMLAttributes;
    abbr: HTMLAttributes;
    address: HTMLAttributes;
    area: AreaHTMLAttributes;
    article: HTMLAttributes;
    aside: HTMLAttributes;
    audio: AudioHTMLAttributes;
    b: HTMLAttributes;
    base: BaseHTMLAttributes;
    bdi: HTMLAttributes;
    bdo: HTMLAttributes;
    big: HTMLAttributes;
    blockquote: BlockquoteHTMLAttributes;
    body: HTMLAttributes;
    br: HTMLAttributes;
    button: ButtonHTMLAttributes;
    canvas: CanvasHTMLAttributes;
    caption: HTMLAttributes;
    cite: HTMLAttributes;
    code: HTMLAttributes;
    col: ColHTMLAttributes;
    colgroup: ColgroupHTMLAttributes;
    data: DataHTMLAttributes;
    datalist: HTMLAttributes;
    dd: HTMLAttributes;
    del: DelHTMLAttributes;
    details: DetailsHTMLAttributes;
    dfn: HTMLAttributes;
    dialog: DialogHTMLAttributes;
    div: HTMLAttributes;
    dl: HTMLAttributes;
    dt: HTMLAttributes;
    em: HTMLAttributes;
    embed: EmbedHTMLAttributes;
    fieldset: FieldsetHTMLAttributes;
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
    head: HTMLAttributes;
    header: HTMLAttributes;
    hgroup: HTMLAttributes;
    hr: HTMLAttributes;
    html: HTMLAttributes;
    i: HTMLAttributes;
    iframe: IframeHTMLAttributes;
    img: ImgHTMLAttributes;
    input: InputHTMLAttributes;
    ins: InsHTMLAttributes;
    kbd: HTMLAttributes;
    label: LabelHTMLAttributes;
    legend: HTMLAttributes;
    li: LiHTMLAttributes;
    link: LinkHTMLAttributes;
    main: HTMLAttributes;
    map: MapHTMLAttributes;
    mark: HTMLAttributes;
    menu: HTMLAttributes;
    meta: MetaHTMLAttributes;
    meter: MeterHTMLAttributes;
    nav: HTMLAttributes;
    noscript: HTMLAttributes;
    object: ObjectHTMLAttributes;
    ol: OlHTMLAttributes;
    optgroup: HTMLAttributes;
    option: OptionHTMLAttributes;
    output: OutputHTMLAttributes;
    p: HTMLAttributes;
    param: ParamHTMLAttributes;
    picture: HTMLAttributes;
    pre: HTMLAttributes;
    progress: ProgressHTMLAttributes;
    q: QHTMLAttributes;
    rp: HTMLAttributes;
    rt: HTMLAttributes;
    ruby: HTMLAttributes;
    s: HTMLAttributes;
    samp: HTMLAttributes;
    script: ScriptHTMLAttributes;
    search: HTMLAttributes;
    section: HTMLAttributes;
    select: SelectHTMLAttributes;
    slot: SlotHTMLAttributes;
    small: HTMLAttributes;
    source: SourceHTMLAttributes;
    span: HTMLAttributes;
    strong: HTMLAttributes;
    style: StyleHTMLAttributes;
    sub: HTMLAttributes;
    summary: HTMLAttributes;
    sup: HTMLAttributes;
    table: TableHTMLAttributes;
    tbody: HTMLAttributes;
    td: TdHTMLAttributes;
    template: HTMLAttributes;
    textarea: TextareaHTMLAttributes;
    tfoot: HTMLAttributes;
    th: ThHTMLAttributes;
    thead: HTMLAttributes;
    time: TimeHTMLAttributes;
    title: HTMLAttributes;
    tr: HTMLAttributes;
    track: TrackHTMLAttributes;
    u: HTMLAttributes;
    ul: HTMLAttributes;
    var: HTMLAttributes;
    video: VideoHTMLAttributes;
    wbr: HTMLAttributes;

    // SVG Elements - Complete Coverage
    svg: SVGAttributes;
    animate: SVGAttributes;
    animateMotion: SVGAttributes;
    animateTransform: SVGAttributes;
    circle: SVGAttributes;
    clipPath: SVGAttributes;
    defs: SVGAttributes;
    desc: SVGAttributes;
    ellipse: SVGAttributes;
    feBlend: SVGAttributes;
    feColorMatrix: SVGAttributes;
    feComponentTransfer: SVGAttributes;
    feComposite: SVGAttributes;
    feConvolveMatrix: SVGAttributes;
    feDiffuseLighting: SVGAttributes;
    feDisplacementMap: SVGAttributes;
    feDistantLight: SVGAttributes;
    feDropShadow: SVGAttributes;
    feFlood: SVGAttributes;
    feFuncA: SVGAttributes;
    feFuncB: SVGAttributes;
    feFuncG: SVGAttributes;
    feFuncR: SVGAttributes;
    feGaussianBlur: SVGAttributes;
    feImage: SVGAttributes;
    feMerge: SVGAttributes;
    feMergeNode: SVGAttributes;
    feMorphology: SVGAttributes;
    feOffset: SVGAttributes;
    fePointLight: SVGAttributes;
    feSpecularLighting: SVGAttributes;
    feSpotLight: SVGAttributes;
    feTile: SVGAttributes;
    feTurbulence: SVGAttributes;
    filter: SVGAttributes;
    foreignObject: SVGAttributes;
    g: SVGAttributes;
    image: SVGAttributes;
    line: SVGAttributes;
    linearGradient: SVGAttributes;
    marker: SVGAttributes;
    mask: SVGAttributes;
    metadata: SVGAttributes;
    mpath: SVGAttributes;
    path: SVGAttributes;
    pattern: SVGAttributes;
    polygon: SVGAttributes;
    polyline: SVGAttributes;
    radialGradient: SVGAttributes;
    rect: SVGAttributes;
    set: SVGAttributes;
    stop: SVGAttributes;
    switch: SVGAttributes;
    symbol: SVGAttributes;
    text: SVGAttributes;
    textPath: SVGAttributes;
    tspan: SVGAttributes;
    use: SVGAttributes;
    view: SVGAttributes;
  }
}
