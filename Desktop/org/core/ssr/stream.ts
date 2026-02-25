import { Writable } from "stream";
import { VNode, h, Fragment } from "../runtime";
import { renderToHTML } from "./render";
import { Suspense } from "../hooks/nixLazy";

/**
 * Renders a VNode to a stream, supporting out-of-order delivery for Suspense.
 */
export async function renderToStream(vnode: VNode, stream: Writable) {
    const renderer = new StreamingRenderer(stream);
    await renderer.render(vnode);
    await renderer.finalize();
}

class StreamingRenderer {
    private stream: Writable;
    private pendingSuspense = new Map<string, Promise<void>>();
    private idCounter = 0;

    constructor(stream: Writable) {
        this.stream = stream;
    }

    private write(chunk: string) {
        this.stream.write(chunk);
    }

    private generateId() {
        return `fynix-s-${this.idCounter++}`;
    }

    async render(vnode: VNode | any): Promise<void> {
        if (vnode == null || vnode === false) return;

        if (typeof vnode === "string" || typeof vnode === "number") {
            this.write(await renderToHTML(vnode));
            return;
        }

        // Handle Suspense specifically for streaming
        if (vnode.type === Suspense) {
            const id = this.generateId();
            const { fallback } = vnode.props;

            // Fynix 'h' normalizes children into an array in props.children
            const childrenArr = vnode.props.children;
            const children = (typeof childrenArr === "function" ? childrenArr :
                (Array.isArray(childrenArr) ? childrenArr[0] : null));

            if (typeof children !== "function") {
                this.write(await renderToHTML(fallback));
                return;
            }

            // Start a placeholder
            this.write(`<div id="${id}">`);

            try {
                // Try rendering children immediately
                const childVNode = children();
                await this.render(childVNode);
            } catch (promise) {
                if (promise instanceof Promise) {
                    // Send fallback
                    this.write(await renderToHTML(fallback));

                    // Defer the resolution
                    const deferredTask = (async () => {
                        try {
                            await promise;
                            const content = await renderToHTML(children());
                            this.write(`
                <template id="${id}-t">${content}</template>
                <script>
                  (function() {
                    var template = document.getElementById("${id}-t");
                    var dest = document.getElementById("${id}");
                    if (template && dest) {
                      dest.innerHTML = template.innerHTML;
                      template.remove();
                    }
                  })();
                </script>
              `);
                        } catch (err) {
                            console.error("[Fynix Stream] Deferred rendering error:", err);
                        }
                    })();

                    this.pendingSuspense.set(id, deferredTask);
                } else {
                    throw promise;
                }
            }

            this.write(`</div>`);
            return;
        }

        // Generic VNode rendering
        if (typeof vnode.type === "function") {
            const Component = vnode.type as any;
            const result = await Component(vnode.props);
            await this.render(result);
            return;
        }

        if (vnode.type === Fragment) {
            const children = vnode.props.children || [];
            for (const child of children) {
                await this.render(child);
            }
            return;
        }

        if (typeof vnode.type === "string") {
            const tag = vnode.type;
            let propsStr = "";
            for (const [key, value] of Object.entries(vnode.props)) {
                if (key !== "children" && key !== "key" && !key.startsWith("on")) {
                    propsStr += ` ${key}="${String(value).replace(/"/g, "&quot;")}"`;
                }
            }

            this.write(`<${tag}${propsStr}>`);
            const children = vnode.props.children || [];
            for (const child of children) {
                await this.render(child);
            }
            this.write(`</${tag}>`);
        }
    }

    async finalize() {
        if (this.pendingSuspense.size > 0) {
            await Promise.all(this.pendingSuspense.values());
        }
        this.stream.end();
    }
}
