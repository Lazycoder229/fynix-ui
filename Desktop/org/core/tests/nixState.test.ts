import { describe, it, expect, vi, beforeEach } from 'vitest';
import { nixState } from '../hooks/nixState';
import { setActiveContext } from '../context/context';

describe('nixState', () => {
    let mockContext: any;

    beforeEach(() => {
        // Setup a mock component context
        mockContext = {
            hooks: [],
            hookIndex: 0,
            _accessedStates: new Set(),
            stateCleanups: []
        };
        setActiveContext(mockContext);
    });

    it('should initialize with the provided value', () => {
        const state = nixState(10);
        expect(state.value).toBe(10);
    });

    it('should update the value and trigger subscribers', () => {
        const state = nixState(0);
        const subscriber = vi.fn();

        state.subscribe(subscriber);

        state.value = 1;
        expect(state.value).toBe(1);
        expect(subscriber).toHaveBeenCalledWith(1);
    });

    it('should not trigger subscribers if value is the same', () => {
        const state = nixState('test');
        const subscriber = vi.fn();

        state.subscribe(subscriber);

        state.value = 'test';
        expect(subscriber).not.toHaveBeenCalled();
    });

    it('should handle multiple states in the same context', () => {
        const state1 = nixState(1);
        const state2 = nixState(2);

        expect(state1.value).toBe(1);
        expect(state2.value).toBe(2);
        expect(mockContext.hooks.length).toBe(2);
    });

    it('should cleanup subscribers', () => {
        const state = nixState(0);
        const subscriber = vi.fn();
        const unsubscribe = state.subscribe(subscriber);

        unsubscribe();
        state.value = 1;

        expect(subscriber).not.toHaveBeenCalled();
    });
});
