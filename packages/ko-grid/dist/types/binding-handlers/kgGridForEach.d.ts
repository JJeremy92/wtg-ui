import ko from 'knockout';
export interface GridForEachOptions {
    afterQueueFlush?: (dataProvider: () => Readonly<object[]>) => void;
    batchSizeForAdd?: number;
    data: ko.MaybeSubscribable<object[]>;
    isDebugMode?: boolean;
}
declare const kgGridForEach: {
    animateFrame: (callback: () => any) => number;
    init: (element: HTMLElement, valueAccessor: () => any, allBindings: ko.AllBindings, viewModel: any, bindingContext: ko.BindingContext) => ko.BindingHandlerControlsDescendant;
};
export declare function getAnimateFrame(): (callback: () => any) => number;
export default kgGridForEach;
