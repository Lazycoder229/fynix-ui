/* MIT License

* Copyright (c) 2026 Resty Gonzales

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
* SOFTWARE.
 */

// =====================================================
// types/jsx.d.ts - JSX Namespace for Fynix Framework
// =====================================================

import type { VNode } from "./fnx";

/**
 * Fynix reactive event handler type
 */
type FynixEventHandler<E extends Event = Event> = (event: E) => void;

/**
 * CSS style declaration with additional Fynix support
 */
type CSSStyles = Partial<CSSStyleDeclaration> & {
    [key: `--${string}`]: string | number; // CSS custom properties
};

/**
 * Base HTML attributes shared by all elements
 */
interface FynixHTMLAttributes<T extends EventTarget = HTMLElement> {
    // Core attributes
    id?: string;
    class?: string;
    className?: string;
    style?: string | CSSStyles;
    title?: string;
    tabIndex?: number;
    tabindex?: number;

    // Data attributes
    [key: `data-${string}`]: string | number | boolean | undefined;

    // ARIA attributes
    role?: string;
    "aria-label"?: string;
    "aria-labelledby"?: string;
    "aria-describedby"?: string;
    "aria-hidden"?: boolean | "true" | "false";
    "aria-disabled"?: boolean | "true" | "false";
    "aria-expanded"?: boolean | "true" | "false";
    "aria-selected"?: boolean | "true" | "false";
    "aria-checked"?: boolean | "true" | "false" | "mixed";
    "aria-pressed"?: boolean | "true" | "false" | "mixed";
    "aria-live"?: "off" | "assertive" | "polite";
    "aria-atomic"?: boolean | "true" | "false";
    "aria-busy"?: boolean | "true" | "false";
    "aria-controls"?: string;
    "aria-current"?: boolean | "true" | "false" | "page" | "step" | "location" | "date" | "time";
    "aria-haspopup"?: boolean | "true" | "false" | "menu" | "listbox" | "tree" | "grid" | "dialog";
    "aria-invalid"?: boolean | "true" | "false" | "grammar" | "spelling";
    "aria-modal"?: boolean | "true" | "false";
    "aria-orientation"?: "horizontal" | "vertical";
    "aria-placeholder"?: string;
    "aria-required"?: boolean | "true" | "false";
    "aria-sort"?: "none" | "ascending" | "descending" | "other";
    "aria-valuemax"?: number;
    "aria-valuemin"?: number;
    "aria-valuenow"?: number;
    "aria-valuetext"?: string;
    [key: `aria-${string}`]: string | number | boolean | undefined;

    // Standard HTML attributes
    hidden?: boolean;
    draggable?: boolean | "true" | "false";
    contentEditable?: boolean | "true" | "false" | "inherit";
    contenteditable?: boolean | "true" | "false" | "inherit";
    spellCheck?: boolean | "true" | "false";
    spellcheck?: boolean | "true" | "false";
    translate?: "yes" | "no";
    lang?: string;
    dir?: "ltr" | "rtl" | "auto";
    slot?: string;
    accessKey?: string;
    accesskey?: string;
    autoCapitalize?: "off" | "none" | "on" | "sentences" | "words" | "characters";
    autocapitalize?: "off" | "none" | "on" | "sentences" | "words" | "characters";
    enterKeyHint?: "enter" | "done" | "go" | "next" | "previous" | "search" | "send";
    enterkeyhint?: "enter" | "done" | "go" | "next" | "previous" | "search" | "send";
    inputMode?: "none" | "text" | "decimal" | "numeric" | "tel" | "search" | "email" | "url";
    inputmode?: "none" | "text" | "decimal" | "numeric" | "tel" | "search" | "email" | "url";

    // Fynix reactive event handlers (r-* prefix)
    "r-click"?: FynixEventHandler<MouseEvent>;
    "r-dblclick"?: FynixEventHandler<MouseEvent>;
    "r-mousedown"?: FynixEventHandler<MouseEvent>;
    "r-mouseup"?: FynixEventHandler<MouseEvent>;
    "r-mousemove"?: FynixEventHandler<MouseEvent>;
    "r-mouseenter"?: FynixEventHandler<MouseEvent>;
    "r-mouseleave"?: FynixEventHandler<MouseEvent>;
    "r-mouseover"?: FynixEventHandler<MouseEvent>;
    "r-mouseout"?: FynixEventHandler<MouseEvent>;
    "r-contextmenu"?: FynixEventHandler<MouseEvent>;

    "r-keydown"?: FynixEventHandler<KeyboardEvent>;
    "r-keyup"?: FynixEventHandler<KeyboardEvent>;
    "r-keypress"?: FynixEventHandler<KeyboardEvent>;

    "r-focus"?: FynixEventHandler<FocusEvent>;
    "r-blur"?: FynixEventHandler<FocusEvent>;
    "r-focusin"?: FynixEventHandler<FocusEvent>;
    "r-focusout"?: FynixEventHandler<FocusEvent>;

    "r-input"?: FynixEventHandler<InputEvent>;
    "r-change"?: FynixEventHandler<Event>;
    "r-submit"?: FynixEventHandler<SubmitEvent>;
    "r-reset"?: FynixEventHandler<Event>;
    "r-invalid"?: FynixEventHandler<Event>;

    "r-scroll"?: FynixEventHandler<Event>;
    "r-resize"?: FynixEventHandler<UIEvent>;
    "r-wheel"?: FynixEventHandler<WheelEvent>;

    "r-drag"?: FynixEventHandler<DragEvent>;
    "r-dragstart"?: FynixEventHandler<DragEvent>;
    "r-dragend"?: FynixEventHandler<DragEvent>;
    "r-dragenter"?: FynixEventHandler<DragEvent>;
    "r-dragleave"?: FynixEventHandler<DragEvent>;
    "r-dragover"?: FynixEventHandler<DragEvent>;
    "r-drop"?: FynixEventHandler<DragEvent>;

    "r-touchstart"?: FynixEventHandler<TouchEvent>;
    "r-touchend"?: FynixEventHandler<TouchEvent>;
    "r-touchmove"?: FynixEventHandler<TouchEvent>;
    "r-touchcancel"?: FynixEventHandler<TouchEvent>;

    "r-pointerdown"?: FynixEventHandler<PointerEvent>;
    "r-pointerup"?: FynixEventHandler<PointerEvent>;
    "r-pointermove"?: FynixEventHandler<PointerEvent>;
    "r-pointerenter"?: FynixEventHandler<PointerEvent>;
    "r-pointerleave"?: FynixEventHandler<PointerEvent>;
    "r-pointerover"?: FynixEventHandler<PointerEvent>;
    "r-pointerout"?: FynixEventHandler<PointerEvent>;
    "r-pointercancel"?: FynixEventHandler<PointerEvent>;

    "r-copy"?: FynixEventHandler<ClipboardEvent>;
    "r-cut"?: FynixEventHandler<ClipboardEvent>;
    "r-paste"?: FynixEventHandler<ClipboardEvent>;

    "r-animationstart"?: FynixEventHandler<AnimationEvent>;
    "r-animationend"?: FynixEventHandler<AnimationEvent>;
    "r-animationiteration"?: FynixEventHandler<AnimationEvent>;

    "r-transitionend"?: FynixEventHandler<TransitionEvent>;
    "r-transitionstart"?: FynixEventHandler<TransitionEvent>;
    "r-transitionrun"?: FynixEventHandler<TransitionEvent>;
    "r-transitioncancel"?: FynixEventHandler<TransitionEvent>;

    // Standard DOM event handlers (on* prefix)
    onclick?: FynixEventHandler<MouseEvent>;
    ondblclick?: FynixEventHandler<MouseEvent>;
    onmousedown?: FynixEventHandler<MouseEvent>;
    onmouseup?: FynixEventHandler<MouseEvent>;
    onmousemove?: FynixEventHandler<MouseEvent>;
    onmouseenter?: FynixEventHandler<MouseEvent>;
    onmouseleave?: FynixEventHandler<MouseEvent>;
    onmouseover?: FynixEventHandler<MouseEvent>;
    onmouseout?: FynixEventHandler<MouseEvent>;
    oncontextmenu?: FynixEventHandler<MouseEvent>;
    onkeydown?: FynixEventHandler<KeyboardEvent>;
    onkeyup?: FynixEventHandler<KeyboardEvent>;
    onkeypress?: FynixEventHandler<KeyboardEvent>;
    onfocus?: FynixEventHandler<FocusEvent>;
    onblur?: FynixEventHandler<FocusEvent>;
    oninput?: FynixEventHandler<InputEvent>;
    onchange?: FynixEventHandler<Event>;
    onsubmit?: FynixEventHandler<SubmitEvent>;
    onreset?: FynixEventHandler<Event>;
    onscroll?: FynixEventHandler<Event>;
    onwheel?: FynixEventHandler<WheelEvent>;

    // Fynix-specific attributes
    key?: string | number;
    ref?: { current: T | null } | ((el: T | null) => void);
    children?: FynixChild;
}

/**
 * Fynix Child type (recursive)
 */
type FynixChild = VNode | string | number | boolean | null | undefined | FynixChild[];

/**
 * Anchor element attributes
 */
interface AnchorHTMLAttributes extends FynixHTMLAttributes<HTMLAnchorElement> {
    href?: string;
    target?: "_self" | "_blank" | "_parent" | "_top" | string;
    rel?: string;
    download?: boolean | string;
    hreflang?: string;
    ping?: string;
    referrerPolicy?: ReferrerPolicy;
    type?: string;
}

/**
 * Button element attributes
 */
interface ButtonHTMLAttributes extends FynixHTMLAttributes<HTMLButtonElement> {
    type?: "button" | "submit" | "reset";
    disabled?: boolean;
    form?: string;
    formAction?: string;
    formaction?: string;
    formEncType?: string;
    formenctype?: string;
    formMethod?: string;
    formmethod?: string;
    formNoValidate?: boolean;
    formnovalidate?: boolean;
    formTarget?: string;
    formtarget?: string;
    name?: string;
    value?: string | number | readonly string[];
    popovertarget?: string;
    popovertargetaction?: "toggle" | "show" | "hide";
}

/**
 * Form element attributes
 */
interface FormHTMLAttributes extends FynixHTMLAttributes<HTMLFormElement> {
    action?: string;
    method?: "get" | "post" | "dialog";
    encType?: string;
    enctype?: string;
    target?: string;
    noValidate?: boolean;
    novalidate?: boolean;
    autoComplete?: string;
    autocomplete?: string;
    name?: string;
    acceptCharset?: string;
}

/**
 * Input element attributes
 */
interface InputHTMLAttributes extends FynixHTMLAttributes<HTMLInputElement> {
    type?:
    | "text"
    | "password"
    | "email"
    | "number"
    | "tel"
    | "url"
    | "search"
    | "date"
    | "time"
    | "datetime-local"
    | "month"
    | "week"
    | "color"
    | "checkbox"
    | "radio"
    | "file"
    | "hidden"
    | "image"
    | "range"
    | "reset"
    | "submit"
    | "button";
    value?: string | number | readonly string[];
    defaultValue?: string | number | readonly string[];
    checked?: boolean;
    defaultChecked?: boolean;
    placeholder?: string;
    name?: string;
    disabled?: boolean;
    readonly?: boolean;
    readOnly?: boolean;
    required?: boolean;
    min?: string | number;
    max?: string | number;
    step?: string | number;
    minLength?: number;
    minlength?: number;
    maxLength?: number;
    maxlength?: number;
    pattern?: string;
    autoComplete?: string;
    autocomplete?: string;
    autoFocus?: boolean;
    autofocus?: boolean;
    multiple?: boolean;
    accept?: string;
    capture?: boolean | "user" | "environment";
    form?: string;
    formAction?: string;
    formaction?: string;
    list?: string;
    size?: number;
    width?: number | string;
    height?: number | string;
    alt?: string;
    src?: string;
}

/**
 * Textarea element attributes
 */
interface TextareaHTMLAttributes extends FynixHTMLAttributes<HTMLTextAreaElement> {
    value?: string;
    defaultValue?: string;
    placeholder?: string;
    name?: string;
    disabled?: boolean;
    readonly?: boolean;
    readOnly?: boolean;
    required?: boolean;
    rows?: number;
    cols?: number;
    minLength?: number;
    minlength?: number;
    maxLength?: number;
    maxlength?: number;
    autoComplete?: string;
    autocomplete?: string;
    autoFocus?: boolean;
    autofocus?: boolean;
    wrap?: "hard" | "soft" | "off";
    form?: string;
}

/**
 * Select element attributes
 */
interface SelectHTMLAttributes extends FynixHTMLAttributes<HTMLSelectElement> {
    value?: string | number | readonly string[];
    defaultValue?: string | number | readonly string[];
    name?: string;
    disabled?: boolean;
    required?: boolean;
    multiple?: boolean;
    size?: number;
    autoComplete?: string;
    autocomplete?: string;
    autoFocus?: boolean;
    autofocus?: boolean;
    form?: string;
}

/**
 * Option element attributes
 */
interface OptionHTMLAttributes extends FynixHTMLAttributes<HTMLOptionElement> {
    value?: string | number | readonly string[];
    label?: string;
    disabled?: boolean;
    selected?: boolean;
}

/**
 * Label element attributes
 */
interface LabelHTMLAttributes extends FynixHTMLAttributes<HTMLLabelElement> {
    for?: string;
    htmlFor?: string;
    form?: string;
}

/**
 * Image element attributes
 */
interface ImgHTMLAttributes extends FynixHTMLAttributes<HTMLImageElement> {
    src?: string;
    alt?: string;
    width?: number | string;
    height?: number | string;
    loading?: "eager" | "lazy";
    decoding?: "async" | "auto" | "sync";
    crossOrigin?: "anonymous" | "use-credentials" | "";
    crossorigin?: "anonymous" | "use-credentials" | "";
    referrerPolicy?: ReferrerPolicy;
    referrerpolicy?: ReferrerPolicy;
    srcSet?: string;
    srcset?: string;
    sizes?: string;
    useMap?: string;
    usemap?: string;
    isMap?: boolean;
    ismap?: boolean;
    fetchpriority?: "high" | "low" | "auto";
}

/**
 * Table element attributes
 */
interface TableHTMLAttributes extends FynixHTMLAttributes<HTMLTableElement> {
    cellPadding?: number | string;
    cellSpacing?: number | string;
    summary?: string;
}

/**
 * Table cell attributes (td, th)
 */
interface TdHTMLAttributes extends FynixHTMLAttributes<HTMLTableCellElement> {
    colSpan?: number;
    colspan?: number;
    rowSpan?: number;
    rowspan?: number;
    headers?: string;
    scope?: "col" | "colgroup" | "row" | "rowgroup";
}

/**
 * Iframe element attributes
 */
interface IframeHTMLAttributes extends FynixHTMLAttributes<HTMLIFrameElement> {
    src?: string;
    srcDoc?: string;
    srcdoc?: string;
    name?: string;
    width?: number | string;
    height?: number | string;
    loading?: "eager" | "lazy";
    sandbox?: string;
    allow?: string;
    allowFullScreen?: boolean;
    allowfullscreen?: boolean;
    referrerPolicy?: ReferrerPolicy;
    referrerpolicy?: ReferrerPolicy;
}

/**
 * Video element attributes
 */
interface VideoHTMLAttributes extends FynixHTMLAttributes<HTMLVideoElement> {
    src?: string;
    poster?: string;
    width?: number | string;
    height?: number | string;
    autoPlay?: boolean;
    autoplay?: boolean;
    controls?: boolean;
    loop?: boolean;
    muted?: boolean;
    playsInline?: boolean;
    playsinline?: boolean;
    preload?: "none" | "metadata" | "auto" | "";
    crossOrigin?: "anonymous" | "use-credentials" | "";
    crossorigin?: "anonymous" | "use-credentials" | "";
    disablePictureInPicture?: boolean;
    disableRemotePlayback?: boolean;
}

/**
 * Audio element attributes
 */
interface AudioHTMLAttributes extends FynixHTMLAttributes<HTMLAudioElement> {
    src?: string;
    autoPlay?: boolean;
    autoplay?: boolean;
    controls?: boolean;
    loop?: boolean;
    muted?: boolean;
    preload?: "none" | "metadata" | "auto" | "";
    crossOrigin?: "anonymous" | "use-credentials" | "";
    crossorigin?: "anonymous" | "use-credentials" | "";
}

/**
 * Source element attributes
 */
interface SourceHTMLAttributes extends FynixHTMLAttributes<HTMLSourceElement> {
    src?: string;
    srcSet?: string;
    srcset?: string;
    type?: string;
    media?: string;
    sizes?: string;
    width?: number | string;
    height?: number | string;
}

/**
 * Canvas element attributes
 */
interface CanvasHTMLAttributes extends FynixHTMLAttributes<HTMLCanvasElement> {
    width?: number | string;
    height?: number | string;
}

/**
 * SVG element attributes
 */
interface SVGAttributes extends FynixHTMLAttributes<SVGElement> {
    viewBox?: string;
    xmlns?: string;
    fill?: string;
    stroke?: string;
    strokeWidth?: number | string;
    "stroke-width"?: number | string;
    strokeLinecap?: "butt" | "round" | "square";
    "stroke-linecap"?: "butt" | "round" | "square";
    strokeLinejoin?: "miter" | "round" | "bevel";
    "stroke-linejoin"?: "miter" | "round" | "bevel";
    d?: string;
    cx?: number | string;
    cy?: number | string;
    r?: number | string;
    rx?: number | string;
    ry?: number | string;
    x?: number | string;
    y?: number | string;
    x1?: number | string;
    y1?: number | string;
    x2?: number | string;
    y2?: number | string;
    width?: number | string;
    height?: number | string;
    points?: string;
    transform?: string;
    opacity?: number | string;
    fillOpacity?: number | string;
    "fill-opacity"?: number | string;
    strokeOpacity?: number | string;
    "stroke-opacity"?: number | string;
    preserveAspectRatio?: string;
}

/**
 * Meta element attributes
 */
interface MetaHTMLAttributes extends FynixHTMLAttributes<HTMLMetaElement> {
    name?: string;
    content?: string;
    httpEquiv?: string;
    "http-equiv"?: string;
    charset?: string;
    property?: string;
}

/**
 * Link element attributes
 */
interface LinkHTMLAttributes extends FynixHTMLAttributes<HTMLLinkElement> {
    href?: string;
    rel?: string;
    type?: string;
    media?: string;
    as?: string;
    crossOrigin?: "anonymous" | "use-credentials" | "";
    crossorigin?: "anonymous" | "use-credentials" | "";
    integrity?: string;
    referrerPolicy?: ReferrerPolicy;
    referrerpolicy?: ReferrerPolicy;
    sizes?: string;
    disabled?: boolean;
}

/**
 * Script element attributes
 */
interface ScriptHTMLAttributes extends FynixHTMLAttributes<HTMLScriptElement> {
    src?: string;
    type?: string;
    async?: boolean;
    defer?: boolean;
    crossOrigin?: "anonymous" | "use-credentials" | "";
    crossorigin?: "anonymous" | "use-credentials" | "";
    integrity?: string;
    referrerPolicy?: ReferrerPolicy;
    referrerpolicy?: ReferrerPolicy;
    noModule?: boolean;
    nomodule?: boolean;
}

/**
 * Style element attributes
 */
interface StyleHTMLAttributes extends FynixHTMLAttributes<HTMLStyleElement> {
    media?: string;
    type?: string;
    scoped?: boolean;
}

/**
 * Progress element attributes
 */
interface ProgressHTMLAttributes extends FynixHTMLAttributes<HTMLProgressElement> {
    value?: number | string;
    max?: number | string;
}

/**
 * Meter element attributes
 */
interface MeterHTMLAttributes extends FynixHTMLAttributes<HTMLMeterElement> {
    value?: number | string;
    min?: number | string;
    max?: number | string;
    low?: number | string;
    high?: number | string;
    optimum?: number | string;
}

/**
 * Dialog element attributes
 */
interface DialogHTMLAttributes extends FynixHTMLAttributes<HTMLDialogElement> {
    open?: boolean;
}

/**
 * Details element attributes
 */
interface DetailsHTMLAttributes extends FynixHTMLAttributes<HTMLDetailsElement> {
    open?: boolean;
}

/**
 * Time element attributes
 */
interface TimeHTMLAttributes extends FynixHTMLAttributes<HTMLTimeElement> {
    dateTime?: string;
    datetime?: string;
}

/**
 * Fieldset element attributes
 */
interface FieldsetHTMLAttributes extends FynixHTMLAttributes<HTMLFieldSetElement> {
    disabled?: boolean;
    form?: string;
    name?: string;
}

/**
 * Output element attributes
 */
interface OutputHTMLAttributes extends FynixHTMLAttributes<HTMLOutputElement> {
    for?: string;
    htmlFor?: string;
    form?: string;
    name?: string;
}

/**
 * Optgroup element attributes
 */
interface OptgroupHTMLAttributes extends FynixHTMLAttributes<HTMLOptGroupElement> {
    disabled?: boolean;
    label?: string;
}

/**
 * Col/Colgroup element attributes
 */
interface ColHTMLAttributes extends FynixHTMLAttributes<HTMLTableColElement> {
    span?: number;
}

/**
 * Data element attributes
 */
interface DataHTMLAttributes extends FynixHTMLAttributes<HTMLDataElement> {
    value?: string;
}

/**
 * Object element attributes
 */
interface ObjectHTMLAttributes extends FynixHTMLAttributes<HTMLObjectElement> {
    data?: string;
    type?: string;
    name?: string;
    useMap?: string;
    usemap?: string;
    form?: string;
    width?: number | string;
    height?: number | string;
}

/**
 * Embed element attributes
 */
interface EmbedHTMLAttributes extends FynixHTMLAttributes<HTMLEmbedElement> {
    src?: string;
    type?: string;
    width?: number | string;
    height?: number | string;
}

/**
 * Map element attributes
 */
interface MapHTMLAttributes extends FynixHTMLAttributes<HTMLMapElement> {
    name?: string;
}

/**
 * Area element attributes
 */
interface AreaHTMLAttributes extends FynixHTMLAttributes<HTMLAreaElement> {
    alt?: string;
    coords?: string;
    download?: boolean | string;
    href?: string;
    hreflang?: string;
    ping?: string;
    referrerPolicy?: ReferrerPolicy;
    referrerpolicy?: ReferrerPolicy;
    rel?: string;
    shape?: "rect" | "circle" | "poly" | "default";
    target?: string;
}

/**
 * Base element attributes
 */
interface BaseHTMLAttributes extends FynixHTMLAttributes<HTMLBaseElement> {
    href?: string;
    target?: string;
}

/**
 * Blockquote element attributes
 */
interface BlockquoteHTMLAttributes extends FynixHTMLAttributes<HTMLQuoteElement> {
    cite?: string;
}

/**
 * Q element attributes
 */
interface QuoteHTMLAttributes extends FynixHTMLAttributes<HTMLQuoteElement> {
    cite?: string;
}

/**
 * Del/Ins element attributes
 */
interface ModHTMLAttributes extends FynixHTMLAttributes<HTMLModElement> {
    cite?: string;
    dateTime?: string;
    datetime?: string;
}

/**
 * Track element attributes
 */
interface TrackHTMLAttributes extends FynixHTMLAttributes<HTMLTrackElement> {
    default?: boolean;
    kind?: "subtitles" | "captions" | "descriptions" | "chapters" | "metadata";
    label?: string;
    src?: string;
    srcLang?: string;
    srclang?: string;
}

/**
 * Slot element attributes
 */
interface SlotHTMLAttributes extends FynixHTMLAttributes<HTMLSlotElement> {
    name?: string;
}

// =====================================================
// JSX Namespace Declaration
// =====================================================

declare global {
    namespace JSX {
        /**
         * The type returned from JSX expressions
         */
        interface Element extends VNode { }

        /**
         * Mapping of HTML tag names to their attribute types
         */
        interface IntrinsicElements {
            // Document structure
            html: FynixHTMLAttributes<HTMLHtmlElement>;
            head: FynixHTMLAttributes<HTMLHeadElement>;
            body: FynixHTMLAttributes<HTMLBodyElement>;
            title: FynixHTMLAttributes<HTMLTitleElement>;
            base: BaseHTMLAttributes;
            link: LinkHTMLAttributes;
            meta: MetaHTMLAttributes;
            style: StyleHTMLAttributes;
            script: ScriptHTMLAttributes;
            noscript: FynixHTMLAttributes<HTMLElement>;

            // Sections
            article: FynixHTMLAttributes<HTMLElement>;
            section: FynixHTMLAttributes<HTMLElement>;
            nav: FynixHTMLAttributes<HTMLElement>;
            aside: FynixHTMLAttributes<HTMLElement>;
            header: FynixHTMLAttributes<HTMLElement>;
            footer: FynixHTMLAttributes<HTMLElement>;
            main: FynixHTMLAttributes<HTMLElement>;
            address: FynixHTMLAttributes<HTMLElement>;
            hgroup: FynixHTMLAttributes<HTMLElement>;
            search: FynixHTMLAttributes<HTMLElement>;

            // Content grouping
            div: FynixHTMLAttributes<HTMLDivElement>;
            span: FynixHTMLAttributes<HTMLSpanElement>;
            p: FynixHTMLAttributes<HTMLParagraphElement>;
            pre: FynixHTMLAttributes<HTMLPreElement>;
            blockquote: BlockquoteHTMLAttributes;
            hr: FynixHTMLAttributes<HTMLHRElement>;
            ol: FynixHTMLAttributes<HTMLOListElement>;
            ul: FynixHTMLAttributes<HTMLUListElement>;
            li: FynixHTMLAttributes<HTMLLIElement>;
            dl: FynixHTMLAttributes<HTMLDListElement>;
            dt: FynixHTMLAttributes<HTMLElement>;
            dd: FynixHTMLAttributes<HTMLElement>;
            figure: FynixHTMLAttributes<HTMLElement>;
            figcaption: FynixHTMLAttributes<HTMLElement>;

            // Headings
            h1: FynixHTMLAttributes<HTMLHeadingElement>;
            h2: FynixHTMLAttributes<HTMLHeadingElement>;
            h3: FynixHTMLAttributes<HTMLHeadingElement>;
            h4: FynixHTMLAttributes<HTMLHeadingElement>;
            h5: FynixHTMLAttributes<HTMLHeadingElement>;
            h6: FynixHTMLAttributes<HTMLHeadingElement>;

            // Text-level semantics
            a: AnchorHTMLAttributes;
            em: FynixHTMLAttributes<HTMLElement>;
            strong: FynixHTMLAttributes<HTMLElement>;
            small: FynixHTMLAttributes<HTMLElement>;
            s: FynixHTMLAttributes<HTMLElement>;
            cite: FynixHTMLAttributes<HTMLElement>;
            q: QuoteHTMLAttributes;
            dfn: FynixHTMLAttributes<HTMLElement>;
            abbr: FynixHTMLAttributes<HTMLElement>;
            ruby: FynixHTMLAttributes<HTMLElement>;
            rt: FynixHTMLAttributes<HTMLElement>;
            rp: FynixHTMLAttributes<HTMLElement>;
            data: DataHTMLAttributes;
            time: TimeHTMLAttributes;
            code: FynixHTMLAttributes<HTMLElement>;
            var: FynixHTMLAttributes<HTMLElement>;
            samp: FynixHTMLAttributes<HTMLElement>;
            kbd: FynixHTMLAttributes<HTMLElement>;
            sub: FynixHTMLAttributes<HTMLElement>;
            sup: FynixHTMLAttributes<HTMLElement>;
            i: FynixHTMLAttributes<HTMLElement>;
            b: FynixHTMLAttributes<HTMLElement>;
            u: FynixHTMLAttributes<HTMLElement>;
            mark: FynixHTMLAttributes<HTMLElement>;
            bdi: FynixHTMLAttributes<HTMLElement>;
            bdo: FynixHTMLAttributes<HTMLElement>;
            br: FynixHTMLAttributes<HTMLBRElement>;
            wbr: FynixHTMLAttributes<HTMLElement>;

            // Edits
            ins: ModHTMLAttributes;
            del: ModHTMLAttributes;

            // Embedded content
            picture: FynixHTMLAttributes<HTMLPictureElement>;
            source: SourceHTMLAttributes;
            img: ImgHTMLAttributes;
            iframe: IframeHTMLAttributes;
            embed: EmbedHTMLAttributes;
            object: ObjectHTMLAttributes;
            video: VideoHTMLAttributes;
            audio: AudioHTMLAttributes;
            track: TrackHTMLAttributes;
            map: MapHTMLAttributes;
            area: AreaHTMLAttributes;
            canvas: CanvasHTMLAttributes;

            // SVG
            svg: SVGAttributes;
            path: SVGAttributes;
            circle: SVGAttributes;
            ellipse: SVGAttributes;
            line: SVGAttributes;
            polygon: SVGAttributes;
            polyline: SVGAttributes;
            rect: SVGAttributes;
            g: SVGAttributes;
            defs: SVGAttributes;
            use: SVGAttributes;
            symbol: SVGAttributes;
            clipPath: SVGAttributes;
            mask: SVGAttributes;
            linearGradient: SVGAttributes;
            radialGradient: SVGAttributes;
            stop: SVGAttributes;
            text: SVGAttributes;
            tspan: SVGAttributes;
            image: SVGAttributes;
            foreignObject: SVGAttributes;

            // Tables
            table: TableHTMLAttributes;
            caption: FynixHTMLAttributes<HTMLTableCaptionElement>;
            colgroup: ColHTMLAttributes;
            col: ColHTMLAttributes;
            thead: FynixHTMLAttributes<HTMLTableSectionElement>;
            tbody: FynixHTMLAttributes<HTMLTableSectionElement>;
            tfoot: FynixHTMLAttributes<HTMLTableSectionElement>;
            tr: FynixHTMLAttributes<HTMLTableRowElement>;
            td: TdHTMLAttributes;
            th: TdHTMLAttributes;

            // Forms
            form: FormHTMLAttributes;
            fieldset: FieldsetHTMLAttributes;
            legend: FynixHTMLAttributes<HTMLLegendElement>;
            label: LabelHTMLAttributes;
            input: InputHTMLAttributes;
            button: ButtonHTMLAttributes;
            select: SelectHTMLAttributes;
            datalist: FynixHTMLAttributes<HTMLDataListElement>;
            optgroup: OptgroupHTMLAttributes;
            option: OptionHTMLAttributes;
            textarea: TextareaHTMLAttributes;
            output: OutputHTMLAttributes;
            progress: ProgressHTMLAttributes;
            meter: MeterHTMLAttributes;

            // Interactive elements
            details: DetailsHTMLAttributes;
            summary: FynixHTMLAttributes<HTMLElement>;
            dialog: DialogHTMLAttributes;
            menu: FynixHTMLAttributes<HTMLMenuElement>;

            // Web Components
            slot: SlotHTMLAttributes;
            template: FynixHTMLAttributes<HTMLTemplateElement>;

            // Deprecated but still valid
            center: FynixHTMLAttributes<HTMLElement>;
            font: FynixHTMLAttributes<HTMLFontElement>;
        }

        /**
         * Attributes for custom elements / components
         */
        interface IntrinsicAttributes {
            key?: string | number;
        }

        /**
         * Children type for components
         */
        interface ElementChildrenAttribute {
            children: {};
        }
    }
}

// Export types for use in other modules
export type {
    FynixHTMLAttributes,
    FynixEventHandler,
    CSSStyles,
    AnchorHTMLAttributes,
    ButtonHTMLAttributes,
    FormHTMLAttributes,
    InputHTMLAttributes,
    TextareaHTMLAttributes,
    SelectHTMLAttributes,
    OptionHTMLAttributes,
    LabelHTMLAttributes,
    ImgHTMLAttributes,
    SVGAttributes,
};
