export interface ComponentContext {
    hooks: any[];
    hookIndex: number;
    effects: Function[];
    cleanups: Function[];
    stateCleanups?: Function[];
    _vnode: object;
    _accessedStates: Set<any>;
    _subscriptions: Set<any>;
    _subscriptionCleanups: Function[];
    version: number;
    rerender: (() => void) | null;
    Component: Function;
    _isMounted: boolean;
    _isRerendering: boolean;
}
export declare let activeContext: ComponentContext | null;
export declare function setActiveContext(ctx: ComponentContext | null): void;
