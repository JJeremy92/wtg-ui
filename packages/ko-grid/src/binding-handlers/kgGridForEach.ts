import ko from 'knockout';
import sortService from '../sortService';

interface ChangeQueue extends ko.utils.ArrayChanges<object> {
    hasRunFirstCycle?: boolean;
}

export interface GridForEachOptions {
    afterQueueFlush?: (dataProvider: () => Readonly<object[]>) => void;
    batchSizeForAdd?: number;
    data: ko.MaybeSubscribable<object[]>;
    isDebugMode?: boolean;
}

interface PendingAdd {
    readonly changeItem: ko.utils.ArrayChange<object>;
    readonly isPlaceholder: boolean;
    readonly node: Node | undefined;
}

interface VirtualNode {
    readonly dataItem: object;
    readonly isPlaceholder: boolean;
    readonly node: Node | undefined;
}

const defaultBatchSizeForAdd = 3;

enum Status {
    Added = 'added',
    Deleted = 'deleted',
    Retained = 'retained',
}

class ProcessInfo {
    public constructor() {
        this.deletedIndexes = [];
        this.insertedCount = 0;
        this.movedIndexes = new Map();
        this.pendingAdds = [];
        this.usedDataItems = new Set();
    }

    public readonly movedIndexes: Map<number, boolean>;
    public readonly usedDataItems: Set<object>;

    public deletedIndexes: number[];
    public insertedCount: number;
    public pendingAdds: PendingAdd[];

    public addNode(
        changeItem: ko.utils.ArrayChange<object>,
        node: Node | undefined,
        isPlaceholder: boolean
    ): void {
        this.pendingAdds.push({
            changeItem: changeItem,
            node: node,
            isPlaceholder: isPlaceholder,
        });
    }

    public markDataItemAsUsed(dataItem: object): void {
        this.usedDataItems.add(dataItem);
    }
}

class GridForEachHandler {
    public constructor(
        containerNode: HTMLElement,
        bindingContext: ko.BindingContext,
        options: GridForEachOptions
    ) {
        this.containerNode = containerNode;
        this.bindingContext = bindingContext;
        this.data = options.data;
        this.batchSizeForAdd =
            options.batchSizeForAdd != null && options.batchSizeForAdd >= 0
                ? options.batchSizeForAdd
                : defaultBatchSizeForAdd; // 0 = unrestricted
        this.isDebugMode = !!options.isDebugMode;
        this.afterQueueFlush =
            options.afterQueueFlush &&
            options.afterQueueFlush.bind(null, this.getDataItemsMapper());
        this.templateNode = makeTemplateNode(containerNode);
        this.changeQueue = [];
        this.isRenderingQueued = false;
        this.virtualNodes = [];
    }

    private readonly afterQueueFlush?: () => void;
    private readonly batchSizeForAdd: number;
    private readonly bindingContext: ko.BindingContext;
    private readonly containerNode: HTMLElement;
    private readonly data: ko.MaybeSubscribable<object[]>;
    private readonly isDebugMode: boolean;
    private readonly templateNode: Node;
    private readonly virtualNodes: VirtualNode[];

    private changeQueue: ChangeQueue;
    private changeSubscription?: ko.Subscription;
    private isRenderingQueued: boolean;

    public start(): void {
        this.onDataChange(ko.unwrap(this.data));
        this.changeSubscription = this.watchForChanges(this.data);
    }

    public dispose(): void {
        if (this.changeSubscription) {
            this.changeSubscription.dispose();
        }
    }

    private getDataItemsMapper(): () => Readonly<object[]> {
        return (): Readonly<object[]> => {
            return this.virtualNodes.map(getDataItem);
        };
    }

    private watchForChanges(data: ko.MaybeSubscribable<object[]>): ko.Subscription | undefined {
        return ko.isObservable(data) ? data.subscribe(this.onDataChange, this) : undefined;
    }

    private onDataChange(newData: object[]): void {
        const oldData = this.virtualNodes.map(getDataItemDiscriminator);
        let changeQueue = ko.utils.compareArrays(oldData, newData, { dontLimitMoves: true });
        changeQueue = normalizeChangeQueue(changeQueue);

        const hasChanges =
            changeQueue.length && changeQueue[changeQueue.length - 1].status !== Status.Retained;
        if (hasChanges) {
            this.changeQueue = changeQueue;
            this.changeQueue.hasRunFirstCycle = false;

            if (!this.isRenderingQueued) {
                this.isRenderingQueued = true;
                this.enqueueRendering();
            }
        } else {
            this.changeQueue = [];
        }
    }

    private enqueueRendering(): void {
        enqueueRendering(this.processQueue.bind(this));
    }

    private processQueue(): void {
        const isFirstCycle = !this.changeQueue.hasRunFirstCycle;
        const processInfo = new ProcessInfo();

        if (isFirstCycle) {
            if (this.bindingContext.$data.beforeRenderStarted) {
                this.bindingContext.$data.beforeRenderStarted(this);
            }
            this.processFirstCycle(processInfo);
            this.changeQueue.hasRunFirstCycle = true;
        }

        this.processCycle(processInfo);

        if (isFirstCycle) {
            processInfo.deletedIndexes.sort(sortService.sortNumber);
            processInfo.pendingAdds.sort(sortPendingAdd);
        }

        this.flushPendingDeletes(processInfo);
        this.flushPendingAdds(processInfo);

        if (this.isDebugMode) {
            this.ensureConsistentState();
        }

        if (this.changeQueue.length) {
            this.enqueueRendering();
        } else {
            this.isRenderingQueued = false;
            if (this.afterQueueFlush) {
                this.afterQueueFlush();
            }
            if (this.bindingContext.$data.afterRenderFinished) {
                this.bindingContext.$data.afterRenderFinished(this);
            }
        }
    }

    private processFirstCycle(processInfo: ProcessInfo): void {
        let lastAddedIndex = -2;
        const changeQueue = this.changeQueue;

        for (let i = 0; i < changeQueue.length; i++) {
            const changeItem = changeQueue[i];

            if (changeItem.status === Status.Retained) {
                processInfo.markDataItemAsUsed(changeItem.value);
                changeQueue.splice(i--, 1);
            } else if (changeItem.status === Status.Added) {
                const moveFromIndex = changeItem.moved;
                if (moveFromIndex !== undefined) {
                    processInfo.markDataItemAsUsed(changeItem.value);
                    processInfo.movedIndexes.set(moveFromIndex, true);
                    processInfo.addNode(changeItem, this.virtualNodes[moveFromIndex].node, false);
                    changeQueue.splice(i--, 1);
                    lastAddedIndex = changeItem.index;
                }
            } else if (changeItem.index === lastAddedIndex) {
                processInfo.deletedIndexes.push(changeItem.index);
                changeQueue.splice(i--, 1);
            }
        }
    }

    private processCycle(processInfo: ProcessInfo): void {
        const changeQueue = this.changeQueue;

        for (let i = 0; i < changeQueue.length; i++) {
            const changeItem = changeQueue[i];

            if (changeItem.status === Status.Added) {
                if (this.batchSizeForAdd && processInfo.insertedCount === this.batchSizeForAdd) {
                    const nextQueueIndex = i + 1;
                    const isDeletingThisIndex =
                        changeQueue.length > nextQueueIndex &&
                        changeQueue[nextQueueIndex].index === changeItem.index;

                    if (isDeletingThisIndex) {
                        const isDataItemUsedByAnotherIndex =
                            this.virtualNodes.length > changeItem.index &&
                            processInfo.usedDataItems.has(
                                this.virtualNodes[changeItem.index].dataItem
                            );
                        if (isDataItemUsedByAnotherIndex) {
                            processInfo.addNode(changeItem, undefined, true);
                        } else {
                            // Keep the existing node. It'll be removed and replaced in subsequent cycles. This helps prevent flickering.
                            processInfo.movedIndexes.set(changeItem.index, true);
                            processInfo.addNode(
                                changeItem,
                                this.virtualNodes[changeItem.index].node,
                                true
                            );
                        }
                        processInfo.deletedIndexes.push(changeItem.index);
                    } else {
                        processInfo.addNode(changeItem, undefined, true);
                        changeQueue.splice(i + 1, 0, {
                            status: Status.Deleted,
                            value: changeItem.value,
                            index: changeItem.index,
                        }); // Enqueue a deletion to remove the placeholder node.
                    }

                    i++; // Keep the enqueued deletion and skip to the next index.
                } else {
                    processInfo.addNode(changeItem, this.templateNode.cloneNode(true), false);
                    processInfo.insertedCount++;
                    changeQueue.splice(i--, 1);
                }
            } else {
                processInfo.deletedIndexes.push(changeItem.index);
                changeQueue.splice(i--, 1);
            }
        }
    }

    private flushPendingDeletes(processInfo: ProcessInfo): void {
        for (let i = processInfo.deletedIndexes.length - 1; i >= 0; i--) {
            const index = processInfo.deletedIndexes[i];
            if (!processInfo.movedIndexes.get(index)) {
                const node = this.virtualNodes[index].node;
                if (node) {
                    ko.removeNode(node);
                }
            }

            this.virtualNodes.splice(index, 1);
        }
    }

    private flushPendingAdds(processInfo: ProcessInfo): void {
        let lastAddedIndex = -2;
        const contiguousGroups: (Node[] & { changeItemIndex: number })[] = [];
        processInfo.pendingAdds.forEach((pendingAdd): void => {
            const changeItem = pendingAdd.changeItem;
            this.virtualNodes.splice(changeItem.index, 0, {
                dataItem: changeItem.value,
                node: pendingAdd.node,
                isPlaceholder: pendingAdd.isPlaceholder,
            });

            if (pendingAdd.node) {
                let group: Node[] & { changeItemIndex: number };
                if (changeItem.index !== lastAddedIndex + 1) {
                    group = [] as any;
                    group.changeItemIndex = changeItem.index;
                    contiguousGroups.push(group);
                } else {
                    group = contiguousGroups[contiguousGroups.length - 1];
                }

                group.push(pendingAdd.node);
                lastAddedIndex = changeItem.index;
            }
        });

        const containerNode = this.containerNode;
        contiguousGroups.forEach((group): void => {
            const previousNode = this.getNodeBeforeIndex(group.changeItemIndex);
            insertAllAfter(containerNode, group, previousNode);
        });

        processInfo.pendingAdds.forEach((pendingAdd): void => {
            const changeItem = pendingAdd.changeItem;
            if (changeItem.moved === undefined && !pendingAdd.isPlaceholder) {
                const childContext = this.bindingContext.createChildContext(changeItem.value);
                ko.applyBindings(childContext, pendingAdd.node as Node);
            }
        });
    }

    private ensureConsistentState(): void {
        const data = ko.unwrap(this.data);
        const expectedLength = data.length;
        const actualLength = this.virtualNodes.length;
        /* istanbul ignore next */
        if (this.virtualNodes.length !== expectedLength) {
            throw new Error(
                `Internal state is invalid. Expected ${expectedLength} node(s) but there are ${actualLength}.`
            );
        }
    }

    private getNodeBeforeIndex(changeItemIndex: number): Node | undefined {
        if (changeItemIndex === 0) {
            return undefined;
        }

        let virtualNode;
        let index = changeItemIndex - 1;
        while (!(virtualNode = this.virtualNodes[index]).node && index > 0) {
            index--;
        }

        return virtualNode.node;
    }
}

function makeTemplateNode(containerNode: HTMLElement): Node {
    let result;
    for (let i = containerNode.childNodes.length - 1; i >= 0; i--) {
        const node = containerNode.childNodes[i];
        containerNode.removeChild(node);

        if (
            node.nodeType === Node.TEXT_NODE &&
            (!node.textContent || node.textContent.trim().length === 0)
        ) {
            continue;
        }

        if (result) {
            throw new Error('Templates with more than one element are not supported.');
        }

        result = node;
    }

    if (!result) {
        throw new Error('Template does not contain any content.');
    }

    return result;
}

function getDataItem(virtualNode: VirtualNode): object {
    return virtualNode.dataItem;
}

function getDataItemDiscriminator(virtualNode: VirtualNode): object {
    return !virtualNode.isPlaceholder ? virtualNode.dataItem : virtualNode;
}

function normalizeChangeQueue(changeQueue: ko.utils.ArrayChanges<object>): ChangeQueue {
    return changeQueue.sort(compareChangeItem);
}

function compareChangeItem(
    a: ko.utils.ArrayChange<object>,
    b: ko.utils.ArrayChange<object>
): number {
    const bIsRetained = b.status === Status.Retained;
    if (a.status === Status.Retained) {
        return bIsRetained ? 0 : -1;
    }
    if (bIsRetained) {
        return 1;
    }
    if (a.index !== b.index) {
        return a.index - b.index;
    }
    // We have a pair of added and deleted, in any order.
    return a.status === Status.Deleted ? 1 : -1;
}

function sortPendingAdd(a: PendingAdd, b: PendingAdd): number {
    return a.changeItem.index - b.changeItem.index;
}

function insertAllAfter(
    containerNode: HTMLElement,
    nodesToInsert: Node[],
    nodeToInsertAfter: Node | undefined
): void {
    let nodeToInsert: Node;
    if (nodesToInsert.length === 1) {
        nodeToInsert = nodesToInsert[0];
    } else {
        nodeToInsert = document.createDocumentFragment();
        nodesToInsert.forEach(function (node): void {
            nodeToInsert.appendChild(node);
        });
    }

    try {
        // insertAfter actually supports having undefined nodeToInsertAfter but the type definition is wrong.
        ko.virtualElements.insertAfter(containerNode, nodeToInsert, nodeToInsertAfter as Node);
    } catch (error) {
        // IE can randomly fail with an "Unspecified error". Simply retrying will succeed.
        ko.virtualElements.insertAfter(containerNode, nodeToInsert, nodeToInsertAfter as Node);
    }
}

const kgGridForEach = {
    animateFrame: getAnimateFrame(),
    init: function (
        element: HTMLElement,
        valueAccessor: () => any,
        allBindings: ko.AllBindings,
        viewModel: any,
        bindingContext: ko.BindingContext
    ): ko.BindingHandlerControlsDescendant {
        let options: Partial<GridForEachOptions> = valueAccessor();
        if (Object.getPrototypeOf(options) !== Object.prototype) {
            options = { data: options as ko.MaybeSubscribable<object[]> };
        }

        const handler = new GridForEachHandler(
            element,
            bindingContext,
            options as GridForEachOptions
        );

        handler.start();
        ko.utils.domNodeDisposal.addDisposeCallback(element, function (): void {
            handler.dispose();
        });

        return { controlsDescendantBindings: true };
    },
};

export function getAnimateFrame(): (callback: () => any) => number {
    return (
        window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        (window as any).mozRequestAnimationFrame ||
        (window as any).msRequestAnimationFrame ||
        function (callback): number {
            return window.setTimeout(callback, 1000 / 60);
        }
    );
}

function enqueueRendering(callback: () => void): void {
    kgGridForEach.animateFrame.call(window, callback);
}

ko.bindingHandlers.kgGridForEach = kgGridForEach;
export default kgGridForEach;
