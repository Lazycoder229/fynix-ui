import { VNode } from "../types/fnx";
interface ReactiveState<T> {
    value: T;
    _isNixState: boolean;
    subscribe(callback: (value: T) => void): () => void;
}
interface ForProps<T> {
    each: T[] | ReactiveState<T[]>;
    children?: ((item: T, index: number) => VNode) | ((item: T, index: number) => VNode)[];
}
export declare function For<T>(props: ForProps<T>): VNode;
export {};
