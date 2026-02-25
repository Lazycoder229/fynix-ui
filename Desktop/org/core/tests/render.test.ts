import { describe, it, expect } from 'vitest';
import { renderToHTML } from '../ssr/render';
import { h, Fragment } from '../runtime';

describe('renderToHTML', () => {
    it('should render basic HTML elements', async () => {
        const vnode = h('div', { class: 'container', id: 'main' }, h('span', null, 'Hello'));
        const html = await renderToHTML(vnode);
        expect(html).toBe('<div class="container" id="main"><span>Hello</span></div>');
    });

    it('should render text nodes and escape HTML', async () => {
        const html = await renderToHTML('<b>Bold Content</b>');
        expect(html).toBe('&lt;b&gt;Bold Content&lt;/b&gt;');
    });

    it('should handle boolean attributes', async () => {
        const vnode = h('input', { type: 'checkbox', checked: true, disabled: false });
        const html = await renderToHTML(vnode);
        // checked is a boolean attribute, disabled: false should not be present
        expect(html).toBe('<input type="checkbox" checked>');
    });

    it('should render Fragments', async () => {
        const vnode = h(Fragment, null, [
            h('p', null, 'Para 1'),
            h('p', null, 'Para 2')
        ]);
        const html = await renderToHTML(vnode);
        expect(html).toBe('<p>Para 1</p><p>Para 2</p>');
    });

    it('should render components', async () => {
        const MyComponent = (props: { name: string }) => h('h1', null, `Hello, ${props.name}`);
        const vnode = h(MyComponent, { name: 'Fynix' });
        const html = await renderToHTML(vnode);
        expect(html).toBe('<h1>Hello, Fynix</h1>');
    });

    it('should handle self-closing tags', async () => {
        const vnode = h('img', { src: 'logo.png', alt: 'Logo' });
        const html = await renderToHTML(vnode);
        expect(html).toBe('<img src="logo.png" alt="Logo">');
    });
});
