import bowser from 'bowser';
import $ from 'jquery';
import ko from 'knockout';
import { Mock } from 'ts-mockery';
import EventProvider from '../../classes/EventProvider';
import Grid from '../../classes/Grid';
import { GridOptions, GroupInfo } from '../../classes/grid-config';
import configuration from '../../configuration';
import { SortDirection } from '../../constants';
import domUtilityService from '../../domUtilityService';
import { SortInfo } from '../../sortService';
import templates from '../../templates/templates';
import { PropertyBag } from '../../types';
import kgGridForEach from '../kgGridForEach';
import '../koGrid';

describe('koGrid binding', function () {
    let element: JQuery;

    beforeAll(function () {
        kgGridForEach.animateFrame = function (callback) {
            callback();
            return 0;
        };
    });

    beforeEach(function () {
        element = $('<div data-bind="koGrid: options">');
    });

    afterEach(function () {
        ko.removeNode(element[0]);
    });

    test('checks that data is specified', function () {
        const action = () => bind({ options: { data: undefined } });
        expect(action).toThrowError('data must be specified');
    });

    test('appends grid template', function () {
        bind();
        expect(element.find('.kgTopPanel').length).toBe(1);
        expect(element.find('.kgViewport').length).toBe(1);
    });

    test('can specify custom grid template', function () {
        const gridTemplate = $(templates.defaultGridTemplate());
        gridTemplate.find('.kgTopPanel').addClass('kgFoo');
        bind({ options: { gridTemplate: gridTemplate[0].outerHTML } });
        expect(element.find('.kgTopPanel').hasClass('kgFoo')).toBe(true);
    });

    test('binds content to grid object', function () {
        bind();
        const viewModel = ko.dataFor(element.children()[0]);
        expect(viewModel.constructor).toBe(Grid);
    });

    test('binding context is a child of parent context', function () {
        bind();
        const context = ko.contextFor(element.children()[0]);
        expect(context.$parentContext).toBe(ko.contextFor(element[0]));
    });

    test('adds koGrid class to element', function () {
        bind();
        expect(element.hasClass('koGrid')).toBe(true);
    });

    test('adds grid id class to element', function () {
        bind();
        const gridId = getGrid().gridId;
        expect(gridId).toBeTruthy();
        expect(element.hasClass(gridId)).toBe(true);
    });

    test('sets grid dimensions on grid', function () {
        element.width(100);
        element.height(50);
        bind();
        const grid = getGrid();
        expect(grid.rootDim.outerWidth()).toBe(100);
        expect(grid.rootDim.outerHeight()).toBe(50);
    });

    test('sets grid containers on grid', function () {
        const gridContainers = {
            $root: $('<div>'),
            $topPanel: $('<div>'),
            $groupPanel: $('<div>'),
            $headerContainer: $('<div>'),
            $fixedHeaderContainer: $('<div>'),
            $headerScroller: $('<div>'),
            $fixedHeaderScroller: $('<div>'),
            $viewport: $('<div>'),
            $canvas: $('<div>'),
            $fixedViewport: $('<div>'),
            $fixedCanvas: $('<div>'),
        };

        jest.spyOn(domUtilityService, 'getGridContainers').mockImplementation(function (rootEl) {
            expect(rootEl[0]).toBe(element[0]);
            return gridContainers;
        });

        bind();
        const grid = getGrid();
        expect(grid.$root).toBe(gridContainers.$root);
        expect(grid.$topPanel).toBe(gridContainers.$topPanel);
        expect(grid.$groupPanel).toBe(gridContainers.$groupPanel);
        expect(grid.$headerContainer).toBe(gridContainers.$headerContainer);
        expect(grid.$fixedHeaderContainer).toBe(gridContainers.$fixedHeaderContainer);
        expect(grid.$headerScroller).toBe(gridContainers.$headerScroller);
        expect(grid.$fixedHeaderScroller).toBe(gridContainers.$fixedHeaderScroller);
        expect(grid.$viewport).toBe(gridContainers.$viewport);
        expect(grid.$canvas).toBe(gridContainers.$canvas);
        expect(grid.$fixedViewport).toBe(gridContainers.$fixedViewport);
        expect(grid.$fixedCanvas).toBe(gridContainers.$fixedCanvas);
    });

    test.each<[boolean, number]>([
        [true, 1],
        [false, 0],
    ])('when browser is legacy %s there should be %s fixed container', function (
        isLegacyBrowser,
        expectedLength
    ) {
        const gridContainers = {
            $root: $('<div>'),
            $topPanel: $('<div>'),
            $groupPanel: $('<div>'),
            $headerContainer: $('<div>'),
            $headerScroller: $('<div>'),
            $fixedHeaderContainer: $('<div>'),
            $fixedHeaderScroller: $('<div>'),
            $viewport: $('<div>'),
            $canvas: $('<div>'),
            $fixedViewport: $('<div>'),
            $fixedCanvas: $('<div>'),
        };

        jest.spyOn(domUtilityService, 'getGridContainers').mockImplementation(function (rootEl) {
            expect(rootEl[0]).toBe(element[0]);
            return gridContainers;
        });

        jest.spyOn(bowser, 'test').mockReturnValue(isLegacyBrowser);

        bind();
        getGrid();

        expect(bowser.test).toBeCalledWith(['msie', 'msedge']);
        expect(gridContainers.$fixedHeaderContainer.length).toBe(expectedLength);
        expect(gridContainers.$fixedHeaderScroller.length).toBe(expectedLength);
        expect(gridContainers.$fixedViewport.length).toBe(expectedLength);
        expect(gridContainers.$fixedCanvas.length).toBe(expectedLength);
    });

    test('can override legacy mode in configuration', function () {
        try {
            configuration.legacyMode = true;
            jest.spyOn(bowser, 'test');
            bind();
            expect(bowser.test).not.toHaveBeenCalled();
            expect(getGrid().legacyMode).toBe(true);
        } finally {
            configuration.legacyMode = undefined;
        }
    });

    test('sets user view model on grid', function () {
        const viewModel = {};
        bind({ viewModel });
        expect(getGrid().$userViewModel).toBe(viewModel);
    });

    test('sets css object on binding context', function () {
        bind();
        expect(ko.contextFor(element.children()[0]).$css).toBe(configuration.css);
    });

    test('sets grid on binding context', function () {
        bind();
        expect(ko.contextFor(element.children()[0]).$grid).toBe(getGrid());
    });

    test('sets resource strings provider on binding context', function () {
        bind();
        expect(ko.contextFor(element.children()[0]).$resStrings).toBe(
            configuration.resourceStringsProvider
        );
    });

    test('sets user view model on binding context', function () {
        bind();
        expect(ko.contextFor(element.children()[0]).$userViewModel).toBe(getGrid().$userViewModel);
    });

    test('updates grid layout after applying bindings', function () {
        jest.spyOn(domUtilityService, 'updateGridLayout').mockImplementation(function (grid) {
            expect(grid).toBe(getGrid());
        });

        bind();
        expect(domUtilityService.updateGridLayout).toHaveBeenCalled();
    });

    test('configures column widths after updating grid layout', function () {
        jest.spyOn(domUtilityService, 'updateGridLayout').mockImplementation(function (grid) {
            jest.spyOn(grid, 'configureColumnWidths');
        });

        bind();
        expect(getGrid().configureColumnWidths).toHaveBeenCalled();
    });

    test('refreshes DOM sizes after configuring column widths', function () {
        jest.spyOn(domUtilityService, 'updateGridLayout').mockImplementation(function (grid) {
            jest.spyOn(grid, 'configureColumnWidths').mockImplementation(function () {
                jest.spyOn(grid, 'refreshDomSizes');
            });
        });

        bind();
        expect(getGrid().refreshDomSizes).toHaveBeenCalled();
    });

    test('initializes event provider', function () {
        let initGrid: Grid | undefined;
        let initOptions: GridOptions | undefined;
        const eventProvider = Mock.of<EventProvider>();
        jest.spyOn(EventProvider, 'init').mockImplementation(function (grid, options) {
            initGrid = grid;
            initOptions = options;
            return eventProvider;
        });

        const columnDefs = [{ field: 'foo' }];
        bind({ options: { columnDefs } });
        const grid = getGrid();
        expect(EventProvider.init).toHaveBeenCalled();
        expect(initGrid).toBe(grid);
        expect(initOptions!.columnDefs).toBe(columnDefs);
        expect(initOptions!.gridContainers.$root).toBe(grid.$root);
        expect(initOptions!.userViewModel).toBe(grid.$userViewModel);
        expect(grid.eventProvider).toBe(eventProvider);
    });

    test('builds grid styles', function () {
        jest.spyOn(domUtilityService, 'buildStyles');
        bind();
        expect(domUtilityService.buildStyles).toHaveBeenCalledWith(getGrid());
    });

    test('initializes plugins', function () {
        const options = { plugins: [{ onGridInit: jest.fn() }, { onGridInit: jest.fn() }] };
        bind({ options });
        const grid = getGrid();
        expect(options.plugins[0].onGridInit).toHaveBeenCalledWith(grid);
        expect(options.plugins[1].onGridInit).toHaveBeenCalledWith(grid);
    });

    test('when data changes then evaluates filter and refreshes DOM sizes', function () {
        const data = ko.observableArray();
        bind({ options: { data } });
        const grid = getGrid();
        jest.spyOn(grid.searchProvider, 'evalFilter');
        jest.spyOn(grid, 'refreshDomSizes');
        data.push({});
        expect(grid.searchProvider.evalFilter).toHaveBeenCalled();
        expect(grid.refreshDomSizes).toHaveBeenCalled();
    });

    test('can specify viewport binding string', function () {
        bind({ options: { viewportBindingString: "attr: { 'data-foo': 'bar' }" } });
        const viewport = getGrid().$viewport;
        expect(viewport.attr('data-bind')).toBe(
            "css: {'ui-widget-content': jqueryUITheme}, style: viewportStyle, attr: { 'data-foo': 'bar' }"
        );
        expect(viewport.attr('data-foo')).toBe('bar');
    });

    test('can omit viewport binding string', function () {
        bind();
        const viewport = getGrid().$viewport;
        expect(viewport.attr('data-bind')).toBe(
            "css: {'ui-widget-content': jqueryUITheme}, style: viewportStyle"
        );
    });

    test('can specify row binding string', function () {
        bind({
            options: {
                data: ko.observableArray([{}]),
                rowBindingString: "attr: { 'data-meh': 'grr' }",
            },
        });
        const row = getGrid().$viewport.find('.kgRow');
        expect(row.attr('data-bind')).toMatch(/, kgRow, attr: { 'data-meh': 'grr' }$/);
        expect(row.attr('data-meh')).toBe('grr');
    });

    test('can omit row binding string', function () {
        bind({ options: { data: ko.observableArray([{}]) } });
        const row = getGrid().$viewport.find('.kgRow');
        expect(row.attr('data-bind')).toMatch(/, kgRow$/);
    });

    test('when grid is removed then removes stylesheet', function () {
        bind();

        const grid = getGrid();
        expect($('style#' + grid.gridId).length).toBe(1);

        ko.removeNode(element[0]);
        expect($('style#' + grid.gridId).length).toBe(0);
    });

    test('can remove grid without stylesheet', function () {
        bind();
        const grid = getGrid();
        grid.styleSheet!.remove();
        grid.styleSheet = undefined;
        expect(() => ko.removeNode(element[0])).not.toThrow();
    });

    test('given empty events option then does not have error', function () {
        expect(() => bind({ options: { events: {} } })).not.toThrow();
    });

    describe('group infos changed event handler', function () {
        let eventData: GroupInfo[] | undefined;

        beforeEach(function () {
            bind({
                options: {
                    columnDefs: [{ field: 'a' }, { field: 'b' }],
                    groupInfos: [{ field: 'a' }],
                    enableGrouping: true,
                    events: { groupInfosChanged: (event) => (eventData = event.data) },
                },
            });
        });

        test('is not triggered initially', function () {
            expect(eventData).toBeUndefined();
        });

        test('is triggered when groups change', function () {
            getGrid().overrideSettings({ groupInfos: [{ field: 'b' }] }, false);
            expect(eventData).toBeDefined();
            expect(eventData!.map((x) => x.field)).toEqual(['b']);
        });
    });

    describe('sort infos changed event handler', function () {
        let eventData: SortInfo[] | undefined;

        beforeEach(function () {
            bind({
                options: {
                    columnDefs: [{ field: 'a' }, { field: 'b' }],
                    sortInfos: [{ column: { field: 'a' }, direction: SortDirection.Ascending }],
                    events: { sortInfosChanged: (event) => (eventData = event.data) },
                },
            });
        });

        test('is not triggered initially', function () {
            expect(eventData).toBeUndefined();
        });

        test('is triggered when groups change', function () {
            getGrid().overrideSettings(
                { sortInfos: [{ column: { field: 'b' }, direction: SortDirection.Ascending }] },
                false
            );
            expect(eventData).toBeDefined();
            expect(eventData!.map((x) => x.column.field)).toEqual(['b']);
        });
    });

    test('does not mutate original options object', function () {
        const options = {};
        bind({ options });
        expect((options as PropertyBag).userViewModel).toBeUndefined();
    });

    function bind(args?: { viewModel?: PropertyBag; options?: Partial<GridOptions> }) {
        args = args || {};
        const options = args.options || {};
        const viewModel = args.viewModel || {};
        viewModel.options = options;
        if (!('data' in options)) {
            options.data = ko.observableArray();
        }

        ko.applyBindings(viewModel, element[0]);
    }

    function getGrid(): Grid {
        return ko.dataFor(element.children()[0]);
    }
});
