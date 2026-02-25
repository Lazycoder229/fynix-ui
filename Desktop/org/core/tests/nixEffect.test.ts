import { describe, it, expect, vi, beforeEach } from 'vitest';
import { nixEffect, nixEffectOnce } from '../hooks/nixEffect';
import { setActiveContext } from '../context/context';

describe('nixEffect', () => {
    let mockContext: any;

    beforeEach(() => {
        // Setup a mock component context
        mockContext = {
            hooks: [],
            hookIndex: 0,
            cleanups: [],
            version: 0
        };
        setActiveContext(mockContext);
    });

    it('should run effect on mount', () => {
        const effect = vi.fn();
        nixEffect(effect, []);

        expect(effect).toHaveBeenCalledTimes(1);
    });

    it('should run effect when dependencies change', () => {
        const effect = vi.fn();

        // Initial render
        nixEffect(effect, [1]);
        expect(effect).toHaveBeenCalledTimes(1);

        // Re-render with same dependency
        mockContext.hookIndex = 0;
        nixEffect(effect, [1]);
        expect(effect).toHaveBeenCalledTimes(1);

        // Re-render with changed dependency
        mockContext.hookIndex = 0;
        nixEffect(effect, [2]);
        expect(effect).toHaveBeenCalledTimes(2);
    });

    it('should call cleanup before re-running the effect', () => {
        const cleanup = vi.fn();
        const effect = vi.fn(() => cleanup);

        // Initial render
        nixEffect(effect, [1]);

        // Re-render with changed dependency
        mockContext.hookIndex = 0;
        nixEffect(effect, [2]);

        expect(cleanup).toHaveBeenCalledTimes(1);
        expect(effect).toHaveBeenCalledTimes(2);
    });

    it('should handle nixEffectOnce', () => {
        const effect = vi.fn();

        // Initial render
        nixEffectOnce(effect);
        expect(effect).toHaveBeenCalledTimes(1);

        // Subsequent render (mocking re-render by resetting hookIndex)
        mockContext.hookIndex = 0;
        nixEffectOnce(effect);
        expect(effect).toHaveBeenCalledTimes(1); // Should still be 1
    });

    it('should register cleanups in context', () => {
        const cleanup = vi.fn();
        const effect = vi.fn(() => cleanup);

        nixEffect(effect, []);

        expect(mockContext.cleanups).toContain(cleanup);
    });
});
