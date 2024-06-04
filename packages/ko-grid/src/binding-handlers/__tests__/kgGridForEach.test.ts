import $ from 'jquery';
import ko from 'knockout';
import kgGridForEach, { getAnimateFrame, GridForEachOptions } from '../kgGridForEach';

describe('kgGridForEach core', function () {
    beforeAll(function () {
        jest.useFakeTimers();
    });

    afterAll(function () {
        jest.useRealTimers();
    });

    afterEach(function () {
        (window as any).requestAnimationFrame = kgGridForEach.animateFrame;
        delete (window as any).webkitRequestAnimationFrame;
        delete (window as any).mozRequestAnimationFrame;
        delete (window as any).msRequestAnimationFrame;
    });

    test('exports binding handler', function () {
        expect(ko.bindingHandlers.kgGridForEach).toBe(kgGridForEach);
    });

    test('animateFrame is window.requestAnimationFrame by default', function () {
        expect(window.requestAnimationFrame).toBeTruthy();
        expect(kgGridForEach.animateFrame).toBe(window.requestAnimationFrame);
    });

    test('animateFrame falls back to webkitRequestAnimationFrame', function () {
        const mock = jest.fn();
        (window as any).requestAnimationFrame = undefined;
        (window as any).webkitRequestAnimationFrame = mock;
        const fn = getAnimateFrame();
        expect(fn).toBe(mock);
    });

    test('animateFrame falls back to mozRequestAnimationFrame', function () {
        const mock = jest.fn();
        (window as any).requestAnimationFrame = undefined;
        (window as any).mozRequestAnimationFrame = mock;
        const fn = getAnimateFrame();
        expect(fn).toBe(mock);
    });

    test('animateFrame falls back to msRequestAnimationFrame', function () {
        const mock = jest.fn();
        (window as any).requestAnimationFrame = undefined;
        (window as any).msRequestAnimationFrame = mock;
        const fn = getAnimateFrame();
        expect(fn).toBe(mock);
    });

    test('animateFrame falls back to setTimeout as last resort', function () {
        (window as any).requestAnimationFrame = undefined;
        const fn = getAnimateFrame();
        const callback = jest.fn();
        fn(callback);

        jest.runTimersToTime(15);
        expect(callback).not.toHaveBeenCalled();

        jest.runTimersToTime(1);
        expect(callback).toHaveBeenCalled();
    });
});

describe('kgGridForEach', function () {
    let animateFrame: jest.SpyInstance;
    let data: ko.ObservableArray;
    let sandbox: JQuery;

    beforeEach(function () {
        animateFrame = jest.spyOn(kgGridForEach, 'animateFrame').mockImplementation(() => 0);
        data = ko.observableArray();
        sandbox = $('<div>').appendTo(document.body);
    });

    afterEach(function () {
        ko.removeNode(sandbox[0]);
    });

    test('when binding with empty initial data then should not enqueue changes', function () {
        bind();
        expect(animateFrame).not.toHaveBeenCalled();
    });

    test('when binding with non-empty initial data then should enqueue changes', function () {
        data.push({});
        bind();
        expect(animateFrame).toHaveBeenCalledTimes(1);
    });

    test('should enqueue changes with correct arguments', function () {
        let animateFrameContext: any;
        animateFrame.mockImplementation(function (this: any) {
            animateFrameContext = this;
        });

        data.push({});
        bind();
        expect(animateFrame).toHaveBeenCalledWith(expect.any(Function));
        expect(animateFrameContext).toBe(window);
    });

    test('should not render initial data synchronously', function () {
        data.push({});

        const element = bind();
        expect(element.children().length).toBe(0);
    });

    test('when animation frame elapses then should render initial data', function () {
        data.push({ value: 'foo' });

        const element = bind();
        nextFrame();
        expect(element.children().length).toBe(1);
        expect(element.text()).toBe('foo');
    });

    test('when initial data is rendered then change queue should be empty', function () {
        data.push({});

        bind();
        nextFrame();
        expect(animateFrame.mock.calls.length).toBe(0);
    });

    test('rendered element should have own binding context', function () {
        data.push({});

        const element = bind();
        nextFrame();

        const parentContext = ko.contextFor(element[0]);
        const childContext = ko.contextFor(element.children()[0]);
        expect(childContext !== parentContext);
        expect(childContext.$parentContext).toBe(parentContext);
    });

    test('should apply bindings after adding element to the DOM', function () {
        data.push({});

        const element = bind();
        nextFrame();
        expect(element.children().attr('data-dom')).toBe('true');
    });

    test('should render new elements up to specified batch size - 1', function () {
        data([{ value: 'a' }, { value: 'b' }, { value: 'c' }]);

        const element = bind(1);
        nextFrame();
        expect(element.children().text()).toBe('a');

        nextFrame();
        expect(element.children().text()).toBe('ab');
    });

    test('should render new elements up to specified batch size - 2', function () {
        data([{ value: 'a' }, { value: 'b' }, { value: 'c' }]);

        const element = bind(2);
        nextFrame();
        expect(element.children().text()).toBe('ab');

        nextFrame();
        expect(element.children().text()).toBe('abc');
    });

    test('should have default batch size of 3', function () {
        data([{ value: 'a' }, { value: 'b' }, { value: 'c' }, { value: 'd' }]);

        const element = bind();
        nextFrame();
        expect(element.children().text()).toBe('abc');
    });

    test('should support unrestricted batch size', function () {
        data([{ value: 'a' }, { value: 'b' }, { value: 'c' }, { value: 'd' }]);

        const element = bind(0);
        nextFrame();
        expect(element.children().text()).toBe('abcd');
    });

    test('should append contiguous elements in one go', function () {
        data([{}, {}, {}]);

        const element = bind(2);
        const args: number[] = [];
        const originalAppendChild = HTMLDivElement.prototype.appendChild;

        jest.spyOn(HTMLDivElement.prototype, 'appendChild').mockImplementation(function (
            this: HTMLDivElement,
            newChild
        ) {
            if (this === element[0]) {
                args.push($(newChild).children().length);
            }

            return originalAppendChild.apply(this, arguments as any);
        });

        nextFrame();
        expect(args).toEqual([2]);
    });

    test('when adding new item then should render after animation frame elapses', function () {
        const element = bind();
        data.push({});
        expect(element.children().length).toBe(0);

        nextFrame();
        expect(element.children().length).toBe(1);
    });

    test('can append item to the end of the list', function () {
        data([{ value: 'a' }]);

        const element = bind();
        nextFrame();

        data.push({ value: 'b' });
        nextFrame();
        expect(element.children().text()).toBe('ab');
    });

    test('can prepend item to the start of the list', function () {
        data([{ value: 'a' }]);

        const element = bind();
        nextFrame();

        data.unshift({ value: 'b' });
        nextFrame();
        expect(element.children().text()).toBe('ba');
    });

    test('can insert item into the middle of the list', function () {
        data([{ value: 'a' }, { value: 'b' }]);

        const element = bind(2);
        nextFrame();

        data.splice(1, 0, { value: 'c' });
        nextFrame();
        expect(element.children().text()).toBe('acb');
    });

    test('can insert non-contiguous items', function () {
        const items = [{ value: 'a' }, { value: 'b' }];
        data(items);

        const element = bind(2);
        nextFrame();

        data([items[0], { value: 'c' }, items[1], { value: 'd' }]);
        nextFrame();
        expect(element.children().text()).toBe('acbd');
    });

    test('can add new item while change queue is not empty', function () {
        data([{ value: 'a' }, { value: 'b' }]);

        const element = bind(1);
        nextFrame();

        data.push({ value: 'c' });
        nextFrame();
        expect(element.children().text()).toBe('ab');

        nextFrame();
        expect(element.children().text()).toBe('abc');
    });

    test('when removing item then should remove after animation frame elapses', function () {
        data([{}]);

        const element = bind();
        nextFrame();

        data.pop();
        expect(element.children().length).toBe(1);

        nextFrame();
        expect(element.children().length).toBe(0);
    });

    test('can remove item from end of list', function () {
        data([{ value: 'a' }, { value: 'b' }]);

        const element = bind(2);
        nextFrame();

        data.pop();
        nextFrame();
        expect(element.children().text()).toBe('a');
    });

    test('can remove item from start of list', function () {
        data([{ value: 'a' }, { value: 'b' }]);

        const element = bind(2);
        nextFrame();

        data.shift();
        nextFrame();
        expect(element.children().text()).toBe('b');
    });

    test('can remove item from middle of list', function () {
        data([{ value: 'a' }, { value: 'b' }, { value: 'c' }]);

        const element = bind(3);
        nextFrame();

        data.splice(1, 1);
        nextFrame();
        expect(element.children().text()).toBe('ac');
    });

    test('should remove multiple items in one animation frame', function () {
        data([{ value: 'a' }, { value: 'b' }, { value: 'c' }]);

        const element = bind(1);
        nextFrameAll();

        data([data()[0]]);
        nextFrame();
        expect(element.children().text()).toBe('a');
    });

    test('can remove rendered item while change queue is not empty', function () {
        data([{ value: 'a' }, { value: 'b' }]);

        const element = bind(1);
        nextFrame();

        data.shift();
        nextFrame();
        expect(element.children().text()).toBe('b');
    });

    test('can remove non-rendered item while change queue is not empty', function () {
        data([{ value: 'a' }, { value: 'b' }]);

        const element = bind(1);
        nextFrame();

        data.pop();
        nextFrame();
        expect(element.children().text()).toBe('a');
    });

    test('when removing and then adding same item before animation frame then should retain same element', function () {
        data([{ value: 'a' }, { value: 'b' }]);

        const element = bind(2);
        nextFrame();

        const child = element.children().last();
        const item = data.pop();
        data.push(item);
        nextFrame();
        expect(element.children().length).toBe(2);
        expect(element.children().last()[0]).toBe(child[0]);
    });

    test('can move item', function () {
        const items = [{ value: 'a' }, { value: 'b' }, { value: 'c' }];
        data(items);

        const element = bind(3);
        nextFrame();

        data([items[0], items[2], items[1]]);
        nextFrame();
        expect(element.children().text()).toBe('acb');
    });

    test('should move multiple items in one animation frame', function () {
        const items = [
            { value: 'a' },
            { value: 'b' },
            { value: 'c' },
            { value: 'd' },
            { value: 'e' },
        ];
        data(items);

        const element = bind(1);
        nextFrameAll();

        data([items[2], items[3], items[4], { value: 'f' }, { value: 'g' }]);
        nextFrame();
        expect(element.children().text()).toBe('cdef');
    });

    test('when moving multiple items then should retain reusable elements', function () {
        const items = [
            { value: 'a' },
            { value: 'b' },
            { value: 'c' },
            { value: 'd' },
            { value: 'e' },
        ];
        data(items);

        const element = bind(1);
        nextFrameAll();

        const children = element.children().toArray();
        data([items[2], items[3], items[4], { value: 'f' }, { value: 'g' }]);
        nextFrame(2);
        expect(element.children().text()).toBe('cdefg');
        expect(element.children().eq(0)[0]).toBe(children[2]);
        expect(element.children().eq(1)[0]).toBe(children[3]);
        expect(element.children().eq(2)[0]).toBe(children[4]);
    });

    test('can shift list partially upwards multiple times correctly', function () {
        let value = 0;
        const createItems = function (count: number) {
            return range(count).map(function () {
                return { value: '_' + value++ };
            });
        };

        data(createItems(20));

        const element = bind(3);
        nextFrameAll();

        const shift = function () {
            const items = data().slice(15).concat(createItems(15));
            data(items);
            nextFrame();
        };

        shift();
        shift();
        nextFrameAll();
        expect(element.children().text()).toBe(
            '_30_31_32_33_34_35_36_37_38_39_40_41_42_43_44_45_46_47_48_49'
        );
    });

    test('can shift list downwards across multiple animation frames correctly', function () {
        let value = 0;
        const createItems = function (count: number) {
            return range(count).map(function () {
                return { value: '_' + value++ };
            });
        };

        data(createItems(20));

        const element = bind(3);
        nextFrameAll();

        data(createItems(10).concat(data().slice(0, 10)));
        nextFrameAll();
        expect(element.children().text()).toBe(
            '_20_21_22_23_24_25_26_27_28_29_0_1_2_3_4_5_6_7_8_9'
        );
    });

    test('can handle combination of retains, adds and deletes correctly', function () {
        const initialItems = [
            { value: '_1' },
            { value: '_2' },
            { value: '_2a' },
            { value: '_3' },
            { value: '_3a' },
            { value: '_4' },
            { value: '_4a' },
        ];
        data(initialItems);

        const element = bind(3);
        nextFrameAll();

        data([
            initialItems[0],
            { value: '_1a' },
            { value: '_1b' },
            initialItems[1],
            { value: '_2b' },
            initialItems[3],
            { value: '_3b' },
            initialItems[5],
            { value: '_4b' },
        ]);
        nextFrame();
        expect(element.children().text()).toBe('_1_1a_1b_2_2b_3_4a_4');

        nextFrame();
        expect(element.children().text()).toBe('_1_1a_1b_2_2b_3_3b_4_4b');
    });

    test('should remove previously rendered rows only after they are re-rendered', function () {
        data([{ value: 'a' }, { value: 'b' }, { value: 'c' }, { value: 'd' }, { value: 'e' }]);

        const element = bind(2);
        nextFrameAll();

        data([{ value: 'f' }, { value: 'g' }, { value: 'h' }, { value: 'i' }, { value: 'j' }]);
        nextFrame();
        expect(element.children().text()).toBe('fgcde');

        nextFrame();
        expect(element.children().text()).toBe('fghie');

        nextFrame();
        expect(element.children().text()).toBe('fghij');
    });

    test('when node insertion fails then should retry', function () {
        data([{ value: 'a' }, { value: 'b' }, { value: 'c' }, { value: 'd' }]);

        const element = bind(1);
        nextFrame();

        jest.spyOn(ko.virtualElements, 'insertAfter').mockImplementationOnce(function () {
            throw new Error('Random IE error!');
        });

        nextFrame();
        expect(element.children().text()).toBe('ab');
        expect(ko.virtualElements.insertAfter).toHaveBeenCalledTimes(2);
    });

    test('when element is disposed then should stop watching for changes', function () {
        const element = bind();
        ko.removeNode(element[0]);

        data.push({});
        expect(animateFrame).not.toHaveBeenCalled();
    });

    test('should be able to dispose element bound to non-observable data', function () {
        const element = bind({ data: [] });
        expect(() => ko.removeNode(element[0])).not.toThrowError();
    });

    test('should support binding without options', function () {
        const markup = `
<div data-bind="kgGridForEach: items">
    <div data-bind="text: $data.value"></div>
</div>`;

        const element = $(markup).appendTo(sandbox);
        data([{}, {}]);
        ko.applyBindings({ items: data }, element[0]);
        nextFrame();
        expect(element.children().length).toBe(2);
    });

    test('should not support template with multiple nodes', function () {
        const markup = `
<div data-bind="kgGridForEach: items">
    foo
    <div></div>
</div>`;

        const element = $(markup).appendTo(sandbox);
        const action = function () {
            ko.applyBindings({ items: data }, element[0]);
        };

        expect(action).toThrowError(/Templates with more than one element are not supported\./);
    });

    test('should not support empty template', function () {
        const markup = '<div data-bind="kgGridForEach: items">';
        const element = $(markup).appendTo(sandbox);
        const action = function () {
            ko.applyBindings({ items: data }, element[0]);
        };

        expect(action).toThrowError(/Template does not contain any content\./);
    });

    test('can specify callback to invoke when change queue is flushed', function () {
        const callback = jest.fn();
        bind({ batchSizeForAdd: 1, afterQueueFlush: callback });

        const items = [{ value: 'a' }, { value: 'b' }, { value: 'c' }];
        data(items);
        nextFrame(3);
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith(expect.any(Function));

        const dataProvider = callback.mock.calls.pop()[0];
        expect(dataProvider()).toEqual(items);
    });

    test('can specify render callbacks in viewModel after it is bound', function () {
        bind({ batchSizeForAdd: 1 });
        const viewModel = ko.dataFor(sandbox.find('>div')[0]);
        viewModel.beforeRenderStarted = jest.fn();
        viewModel.afterRenderFinished = jest.fn();

        const items = [{ value: 'a' }, { value: 'b' }];
        data(items);
        nextFrame();
        expect(viewModel.beforeRenderStarted).toHaveBeenCalledTimes(1);
        expect(viewModel.beforeRenderStarted).toHaveBeenCalledWith(expect.any(Object));
        expect(viewModel.afterRenderFinished).not.toHaveBeenCalled();

        nextFrame();

        expect(viewModel.beforeRenderStarted).toHaveBeenCalledTimes(1);
        expect(viewModel.beforeRenderStarted).toHaveBeenCalledWith(expect.any(Object));
        expect(viewModel.afterRenderFinished).toHaveBeenCalledTimes(1);
        expect(viewModel.afterRenderFinished).toHaveBeenCalledWith(expect.any(Object));
    });

    function bind(options?: number | Partial<GridForEachOptions>): JQuery {
        const markup = `
<div data-bind="kgGridForEach: $data">
    <div data-bind="text: $data.value, gwDomTracker"></div>
</div>`;

        options = typeof options === 'number' ? { batchSizeForAdd: options } : options || {};
        options.data = options.data || data;
        options.isDebugMode = true;

        const element = $(markup).appendTo(sandbox);
        ko.applyBindings(options, element[0]);

        return element;
    }

    function nextFrame(times?: number) {
        times = times || 1;

        for (let i = 0; i < times; i++) {
            const count = animateFrame.mock.calls.length;
            if (count !== 1) {
                throw new Error(
                    'Expect animateFrame call count to be 1 time but was ' + count + '.'
                );
            }

            const callback = animateFrame.mock.calls.pop()[0];
            animateFrame.mockReset();
            callback();
        }
    }

    function nextFrameAll() {
        while (animateFrame.mock.calls.length > 0) {
            nextFrame();
        }
    }

    function range(count: number) {
        return new Array(count).fill(0).map((_, i) => i);
    }

    ko.bindingHandlers.gwDomTracker = {
        init: function (element: HTMLElement) {
            const isInDom = $.contains(document.body, element);
            $(element).attr('data-dom', isInDom.toString());
        },
    };
});
