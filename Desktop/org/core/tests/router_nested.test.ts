import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFynix } from '../router/router';
import * as runtime from '../runtime';

vi.mock('../runtime', async () => {
    const actual = await vi.importActual('../runtime');
    return {
        ...actual as any,
        mount: vi.fn(),
        h: vi.fn((type, props, ...children) => ({ type, props: { ...props, children }, key: props?.key || null })),
    };
});

describe('Router Nested Layouts', () => {
    let router: any;

    beforeEach(() => {
        vi.clearAllMocks();

        global.window = {
            location: { pathname: '/', origin: 'http://localhost' },
            history: { pushState: vi.fn(), replaceState: vi.fn(), state: {} },
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            __fynixPropsCache: new Map(),
        } as any;

        global.document = {
            querySelector: vi.fn().mockReturnValue({ innerHTML: '', appendChild: vi.fn() }),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            createElement: vi.fn().mockReturnValue({ style: {}, appendChild: vi.fn(), setAttribute: vi.fn() }),
        } as any;

        router = createFynix();
    });

    it('should wrap component in layout when nested routing is enabled', async () => {
        const MainLayout = vi.fn(({ children }: any) => {
            return { type: 'div', props: { id: 'layout', children } };
        });

        const HomePage = vi.fn(() => {
            return { type: 'h1', props: { children: ['Home'] } };
        });

        router.enableNestedRouting([
            {
                path: 'home',
                component: HomePage,
                layout: MainLayout
            }
        ]);

        global.window.location.pathname = '/home';
        router.mountRouter();

        await new Promise(r => setTimeout(r, 100));

        expect(runtime.mount).toHaveBeenCalled();

        const wrapper = (runtime.mount as any).mock.calls[0][0];
        const content = wrapper();

        // Check structure - LayoutRouter EXECUTED the functions
        // So content.type is 'div' from MainLayout's return
        expect(content.type).toBe('div');
        expect(content.props.children.type).toBe('h1');

        expect(MainLayout).toHaveBeenCalled();
        expect(HomePage).toHaveBeenCalled();
    });

    it('should handle root path with nested layout', async () => {
        const Layout = vi.fn(({ children }) => ({ type: 'layout-div', props: { children } }));
        const Index = vi.fn(() => ({ type: 'index-div', props: {} }));

        router.enableNestedRouting([
            {
                path: '',
                component: Index,
                layout: Layout
            }
        ]);

        global.window.location.pathname = '/';
        router.mountRouter();

        await new Promise(r => setTimeout(r, 100));

        expect(runtime.mount).toHaveBeenCalled();
        const content = (runtime.mount as any).mock.calls[0][0]();

        expect(content.type).toBe('layout-div');
        expect(content.props.children.type).toBe('index-div');
    });
});
