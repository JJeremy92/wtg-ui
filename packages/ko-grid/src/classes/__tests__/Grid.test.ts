import $ from 'jquery';
import ko from 'knockout';
import { Mock } from 'ts-mockery';
import {
    AggregateOperation, GridEventType,
    RowReorderingMode, SortDirection
} from '../../constants';
import domUtilityService from '../../domUtilityService';
import { SortInfo } from '../../sortService';
import templates from '../../templates/templates';
import { Entity } from '../../types';
import utils from '../../utils';
import { nextEventLoop } from '../../__tests__/test-utils';
import Column, { ColumnDefinition } from '../Column';
import {
    AggregateInfo,
    AggregationProvider,
    DefaultAggregationProvider
} from '../DefaultAggregationProvider';
import Dimension from '../Dimension';
import Grid from '../Grid';
import { GridOptions, GridSettings, GroupInfo } from '../grid-config';
import Range from '../Range';
import Row from '../Row';

describe('grid', function () {
    beforeAll(function () {
        domUtilityService.scrollW = 17;
    });

    test('has newly generated id', function () {
        jest.spyOn(utils, 'newId').mockReturnValue(12345);
        const grid = getGrid();
        expect(grid.gridId).toBe('ng12345');
        expect(utils.newId).toHaveBeenCalledTimes(1);
    });

    test('has root dimensions from options', function () {
        const gridDim = new Dimension(2, 8);
        const grid = getGrid({ gridDim });
        expect(grid.rootDim).toBe(gridDim);
    });

    test('has grid containers from options', function () {
        const gridContainers = {
            $canvas: $('<div>'),
            $fixedCanvas: $('<div>'),
            $fixedHeaderContainer: $('<div>'),
            $fixedHeaderScroller: $('<div>'),
            $fixedViewport: $('<div>'),
            $groupPanel: $('<div>'),
            $headerContainer: $('<div>'),
            $headerScroller: $('<div>'),
            $root: $('<div>'),
            $topPanel: $('<div>'),
            $viewport: $('<div>'),
        };

        const grid = getGrid({ gridContainers });
        expect(grid.$canvas).toBe(gridContainers.$canvas);
        expect(grid.$fixedCanvas).toBe(gridContainers.$fixedCanvas);
        expect(grid.$fixedHeaderContainer).toBe(gridContainers.$fixedHeaderContainer);
        expect(grid.$fixedHeaderScroller).toBe(gridContainers.$fixedHeaderScroller);
        expect(grid.$fixedViewport).toBe(gridContainers.$fixedViewport);
        expect(grid.$groupPanel).toBe(gridContainers.$groupPanel);
        expect(grid.$headerContainer).toBe(gridContainers.$headerContainer);
        expect(grid.$headerScroller).toBe(gridContainers.$headerScroller);
        expect(grid.$root).toBe(gridContainers.$root);
        expect(grid.$topPanel).toBe(gridContainers.$topPanel);
        expect(grid.$viewport).toBe(gridContainers.$viewport);
    });

    test('has data from options', function () {
        const data = ko.observableArray();
        const grid = getGrid({ data });
        expect(grid.sortedData).toBe(data);
    });

    test('disables text selection by default', function () {
        const grid = getGrid();
        expect(grid.disableTextSelection).toBe(true);
    });

    test('can enable text selection', function () {
        const grid = getGrid({ disableTextSelection: false });
        expect(grid.disableTextSelection).toBe(false);
    });

    test('row height is 30 by default', function () {
        const grid = getGrid();
        expect(grid.rowHeight).toBe(30);
    });

    test('can specify row height', function () {
        const grid = getGrid({ rowHeight: 25 });
        expect(grid.rowHeight).toBe(25);
    });

    test('has default row template', function () {
        const grid = getGrid();
        expect(grid.rowTemplate).toBe(templates.defaultRowTemplate());
    });

    test('can specify row template', function () {
        const rowTemplate = '<div>foo<div>';
        const grid = getGrid({ rowTemplate });
        expect(grid.rowTemplate).toBe(rowTemplate);
    });

    test('has default group row template', function () {
        const grid = getGrid();
        expect(grid.groupRowTemplate).toBe(templates.defaultGroupRowTemplate());
    });

    test('can specify group row template', function () {
        const groupRowTemplate = '<div>foo<div>';
        const grid = getGrid({ groupRowTemplate });
        expect(grid.groupRowTemplate).toBe(groupRowTemplate);
    });

    test('has default fixed row template', function () {
        const grid = getGrid();
        expect(grid.fixedRowTemplate).toBe(templates.defaultFixedRowTemplate());
    });

    test('can specify fixed row template', function () {
        const fixedRowTemplate = '<div>fixedRowTemplate</div>';
        const grid = getGrid({ fixedRowTemplate });
        expect(grid.fixedRowTemplate).toBe(fixedRowTemplate);
    });

    test('has default fixed header row template', function () {
        const grid = getGrid();
        expect(grid.fixedHeaderRowTemplate).toBe(templates.defaultFixedHeaderRowTemplate());
    });

    test('can specify fixed header row template', function () {
        const fixedHeaderRowTemplate = '<div>fixedHeaderRowTemplate</div>';
        const grid = getGrid({ fixedHeaderRowTemplate });
        expect(grid.fixedHeaderRowTemplate).toBe(fixedHeaderRowTemplate);
    });

    test('jQuery UI theme is disabled by default', function () {
        const grid = getGrid();
        expect(grid.jqueryUITheme).toBe(false);
    });

    test('can enable jQuery UI theme', function () {
        const grid = getGrid({ jqueryUITheme: true });
        expect(grid.jqueryUITheme).toBe(true);
    });

    test('cannot reorder rows by default', function () {
        const grid = getGrid();
        expect(grid.config.rowReorderingMode).toBeUndefined();
    });

    test('no rowReorderingHandle by default', function () {
        const grid = getGrid();
        expect(grid.config.rowReorderingHandle).toBeUndefined();
    });

    test('can enable native reorder rows', function () {
        const grid = getGrid({ rowReorderingMode: RowReorderingMode.Native });
        expect(grid.config.rowReorderingMode).toBe(RowReorderingMode.Native);
    });

    test('can enable jQueryUI reorder rows', function () {
        const grid = getGrid({ rowReorderingMode: RowReorderingMode.jQueryUI });
        expect(grid.config.rowReorderingMode).toBe(RowReorderingMode.jQueryUI);
    });

    test('can specify rowReorderingHandle', function () {
        const rowReorderingHandle = '.my-handle-selector';
        const grid = getGrid({ rowReorderingHandle });
        expect(grid.config.rowReorderingHandle).toBe(rowReorderingHandle);
    });

    test('tab index is -1 by default', function () {
        const grid = getGrid();
        expect(grid.config.tabIndex).toBe(-1);
    });

    test('can specify tab index', function () {
        const grid = getGrid({ tabIndex: 3 });
        expect(grid.config.tabIndex).toBe(3);
    });

    test('max rows is 0 if there is no data', function () {
        const grid = getGrid();
        expect(grid.maxRows()).toBe(0);
    });

    test('max rows is filtered data length if there is data', function () {
        const grid = getGrid();
        grid.sortedData([{ text: 'a' }, { text: 'b' }, { text: 'a' }, { text: 'a' }]);
        grid.filterText('a');
        expect(grid.maxRows()).toBe(3);
    });

    test('max rows does not include destroyed items initially', function () {
        const data = ko.observableArray<Entity>([{ text: 'a' }, { text: 'b' }, { text: 'c' }]);
        data.destroy(data()[1]);
        const grid = getGrid({ data });
        expect(grid.maxRows()).toBe(2);
    });

    test('viewport height is root height minus top panel, footer and padding', function () {
        const grid = getGrid({
            gridDim: new Dimension(0, 100),
            footerRowHeight: 15,
            headerRowHeight: 20,
            enableGrouping: true,
        });
        expect(grid.viewportDimHeight()).toBe(45);
    });

    test('viewport height is not negative', function () {
        const grid = getGrid({ gridDim: new Dimension(0, 10) });
        expect(grid.viewportDimHeight()).toBe(0);
    });

    test('min rows to render is floor of viewport height over row height', function () {
        const grid = getGrid({
            gridDim: new Dimension(0, 100),
            footerRowHeight: 15,
            headerRowHeight: 20,
            rowHeight: 19,
            enableGrouping: true,
        });
        expect(grid.minRowsToRender()).toBe(2);
    });

    test('min rows to render is 0 if viewport is 0', function () {
        const grid = getGrid({ gridDim: new Dimension(0, 10) });
        expect(grid.minRowsToRender()).toBe(0);
    });

    test('has selected item count property', function () {
        const grid = getGrid();
        grid.selectedItems([{}, {}, {}]);
        expect(grid.selectedItemCount()).toBe(3);
    });

    test('has filtered data count property', function () {
        const grid = getGrid();
        grid.filteredData([{}, {}]);
        expect(grid.totalFilteredItemsLength()).toBe(2);
    });

    test('hides group panel by default', function () {
        const grid = getGrid();
        expect(grid.enableGrouping).toBe(false);
    });

    test('can hide group panel', function () {
        const grid = getGrid({ enableGrouping: true });
        expect(grid.enableGrouping).toBe(true);
    });

    test('given initial data then filtered data is populated', function () {
        const data = [{}, {}];
        const grid = getGrid({ data: ko.observableArray(data) });
        expect(grid.filteredData().length).toBe(2);
        expect(grid.filteredData()[0]).toBe(data[0]);
        expect(grid.filteredData()[1]).toBe(data[1]);
    });

    test('can specify group property evaluator', function () {
        const evalPropertyForGroup = jest.fn();
        const grid = getGrid({ evalPropertyForGroup });
        expect(grid.config.evalPropertyForGroup).toBe(evalPropertyForGroup);
    });

    describe('header', function () {
        test('row height is 30 by default', function () {
            const grid = getGrid();
            expect(grid.config.headerRowHeight).toBe(30);
        });

        test('can specify row height', function () {
            const grid = getGrid({ headerRowHeight: 45 });
            expect(grid.config.headerRowHeight).toBe(45);
        });

        test('has default header row template', function () {
            const grid = getGrid();
            expect(grid.headerRowTemplate).toBe(templates.defaultHeaderRowTemplate());
        });

        test('can specify header row template', function () {
            const headerRowTemplate = '<div>bar<div>';
            const grid = getGrid({ headerRowTemplate });
            expect(grid.headerRowTemplate).toBe(headerRowTemplate);
        });

        test('top panel height is header row height if not showing group panel', function () {
            const grid = getGrid({ headerRowHeight: 20, enableGrouping: false });
            expect(grid.topPanelHeight).toBe(20);
        });

        test('top panel height is twice header row height if showing group panel', function () {
            const grid = getGrid({ headerRowHeight: 20, enableGrouping: true });
            expect(grid.topPanelHeight).toBe(40);
        });
    });

    describe('styles', function () {
        let grid: Grid;
        const twoFixedColumns = [
            getColumn({ width: 10, fixed: true }),
            getColumn({ width: 15, fixed: true }),
            getColumn({ width: 20 }),
            getColumn({ width: 23 }),
            getColumn({ width: 27 }),
        ];

        const allNonFixedColumns = [
            getColumn({ width: 10 }),
            getColumn({ width: 15 }),
            getColumn({ width: 20 }),
            getColumn({ width: 23 }),
            getColumn({ width: 27 }),
        ];

        beforeEach(function () {
            grid = getGrid({
                footerRowHeight: 26,
                headerRowHeight: 23,
                enableGrouping: true,
            });
            grid.rootDim.outerHeight(200);
            grid.rootDim.outerWidth(150);
            grid.maxCanvasHt(12);
        });

        test('has canvas style', function () {
            expect(grid.canvasStyle().height).toBe('12px');
        });

        test('has footer style', function () {
            expect(grid.footerStyle().height).toBe('26px');
        });

        test('has header scroller style', function () {
            expect(grid.headerScrollerStyle().height).toBe('23px');
        });

        test('has header style', function () {
            expect(grid.headerStyle().width).toBe('150px');
        });

        test('has top panel style', function () {
            expect(grid.topPanelStyle().height).toBe('46px');
        });

        test('has viewport panel style', function () {
            expect(grid.viewportPanelStyle().height).toBe('128px');
            expect(grid.viewportPanelStyle().width).toBe('150px');
        });

        test('has viewport style with grid having all non fixed columns', function () {
            grid.columns(allNonFixedColumns);
            expect(grid.viewportStyle().width).toBe('150px');
        });

        describe('has viewport style with grid having some fixed columns', function () {
            test('using legacy browser', function () {
                Mock.extend(grid).with({ legacyMode: true });
                grid.columns(twoFixedColumns);
                expect(grid.viewportStyle().width).toBe('125px');
            });

            test('using latest browser', function () {
                Mock.extend(grid).with({ legacyMode: false });
                grid.columns(twoFixedColumns);
                expect(grid.viewportStyle().width).toBe('150px');
            });
        });

        test('has fixedHeaderStyle with grid having all non fixed columns', function () {
            grid.columns(allNonFixedColumns);
            expect(grid.fixedHeaderStyle().height).toBe('23px');
            expect(grid.fixedHeaderStyle().width).toBe('0px');
        });

        test('has fixedHeaderStyle with grid having some fixed columns', function () {
            Mock.extend(grid).with({ legacyMode: true });
            grid.columns(twoFixedColumns);
            expect(grid.fixedHeaderStyle().height).toBe('23px');
            expect(grid.fixedHeaderStyle().width).toBe('25px');
        });

        test('has fixedViewportStyle', function () {
            expect(grid.fixedViewportStyle().height).toBe('128px');
        });
    });

    describe('menu', function () {
        test('shows column menu by default', function () {
            const grid = getGrid();
            expect(grid.showColumnMenu).toBe(true);
        });

        test('can hide column menu', function () {
            const grid = getGrid({ showColumnMenu: false });
            expect(grid.showColumnMenu).toBe(false);
        });

        test('does not show menu initially', function () {
            const grid = getGrid();
            expect(grid.showMenu()).toBe(false);
        });

        test('can toggle show menu to true', function () {
            const grid = getGrid();
            grid.toggleShowMenu();
            expect(grid.showMenu()).toBe(true);
        });

        test('can toggle show menu to false', function () {
            const grid = getGrid();
            grid.toggleShowMenu();
            grid.toggleShowMenu();
            expect(grid.showMenu()).toBe(false);
        });
    });

    describe('filter', function () {
        test('shows filter by default', function () {
            const grid = getGrid();
            expect(grid.showFilter).toBe(true);
        });

        test('can disable show filter', function () {
            const grid = getGrid({ showFilter: false });
            expect(grid.showFilter).toBe(false);
        });

        test('filter text is empty by default', function () {
            const grid = getGrid();
            expect(grid.filterText()).toBe('');
        });

        test('can specify filter text observable', function () {
            const filterText = ko.observable('');
            const grid = getGrid({ filterOptions: { filterText } });
            expect(grid.filterText).toBe(filterText);
        });

        test('does not use external filter by default', function () {
            const grid = getGrid();
            expect(grid.config.filterOptions.useExternalFilter).toBe(false);
        });

        test('can use external filter', function () {
            const grid = getGrid({ filterOptions: { useExternalFilter: true } });
            expect(grid.config.filterOptions.useExternalFilter).toBe(true);
        });

        test('filter throttle is undefined by default', function () {
            const grid = getGrid();
            expect(grid.config.filterOptions.filterThrottle).toBeUndefined();
        });

        test('can specify filter throttle', function () {
            const grid = getGrid({ filterOptions: { filterThrottle: 125 } });
            expect(grid.config.filterOptions.filterThrottle).toBe(125);
        });
    });

    describe('row selection', function () {
        test('has empty selected items by default', function () {
            const grid = getGrid();
            expect(grid.selectedItems.length).toBe(0);
        });

        test('can specify selected items observable', function () {
            const selectedItems = ko.observableArray();
            const grid = getGrid({ selectedItems });
            expect(grid.selectedItems).toBe(selectedItems);
        });

        test('can select rows by default', function () {
            const grid = getGrid();
            expect(grid.config.canSelectRows).toBe(true);
        });

        test('can disable selecting rows', function () {
            const grid = getGrid({ canSelectRows: false });
            expect(grid.config.canSelectRows).toBe(false);
        });

        test('can multi select by default', function () {
            const grid = getGrid();
            expect(grid.multiSelect).toBe(true);
        });

        test('can disable multi select', function () {
            const grid = getGrid({ multiSelect: false });
            expect(grid.multiSelect).toBe(false);
        });

        test('cannot multi select if cannot select rows', function () {
            const grid = getGrid({ canSelectRows: false });
            expect(grid.multiSelect).toBe(false);
        });
    });

    describe('columns', function () {
        test('column resize is enabled by default', function () {
            const grid = getGrid();
            expect(grid.config.enableColumnResize).toBe(true);
        });

        test('can disable column resize', function () {
            const grid = getGrid({ enableColumnResize: false });
            expect(grid.config.enableColumnResize).toBe(false);
        });

        test('can sort by default', function () {
            const grid = getGrid();
            expect(grid.config.enableSorting).toBe(true);
        });

        test('can disable sort', function () {
            const grid = getGrid({ enableSorting: false });
            expect(grid.config.enableSorting).toBe(false);
        });

        test('external sorting is not used by default', function () {
            const grid = getGrid();
            expect(grid.config.useExternalSorting).toBe(false);
        });

        test('can use external sorting', function () {
            const grid = getGrid({ useExternalSorting: true });
            expect(grid.config.useExternalSorting).toBe(true);
        });

        test('has visible fixed columns property', function () {
            const grid = getGrid();
            Mock.extend(grid).with({ legacyMode: true });
            const columns = [
                getColumn({ visible: ko.pureComputed(() => true), fixed: true }),
                getColumn({ visible: ko.pureComputed(() => false), fixed: true }),
                getColumn({ visible: ko.pureComputed(() => true), fixed: true }),
                getColumn({ visible: ko.pureComputed(() => true) }),
                getColumn({ visible: ko.pureComputed(() => false) }),
                getColumn({ visible: ko.pureComputed(() => true) }),
                getColumn({ visible: ko.pureComputed(() => true) }),
            ];
            grid.columns(columns);
            const visibleFixedColumns = grid.visibleFixedColumns();
            expect(visibleFixedColumns.length).toBe(2);
            expect(visibleFixedColumns[0]).toBe(columns[0]);
            expect(visibleFixedColumns[1]).toBe(columns[2]);
        });

        describe('has visible non fixed columns property', function () {
            const columns = [
                getColumn({ visible: ko.pureComputed(() => true), fixed: true }),
                getColumn({ visible: ko.pureComputed(() => false), fixed: true }),
                getColumn({ visible: ko.pureComputed(() => true), fixed: true }),
                getColumn({ visible: ko.pureComputed(() => true) }),
                getColumn({ visible: ko.pureComputed(() => false) }),
                getColumn({ visible: ko.pureComputed(() => true) }),
                getColumn({ visible: ko.pureComputed(() => true) }),
            ];

            function setupGrid(legacyMode: boolean) {
                const grid = getGrid();
                Mock.extend(grid).with({ legacyMode });
                grid.columns(columns);
                return grid;
            }

            test('using legacy browser', function () {
                let grid = setupGrid(true);
                const visibleNonFixedColumns = grid.visibleNonFixedColumns();
                expect(visibleNonFixedColumns.length).toBe(3);
                expect(visibleNonFixedColumns[0]).toBe(columns[3]);
                expect(visibleNonFixedColumns[1]).toBe(columns[5]);
                expect(visibleNonFixedColumns[2]).toBe(columns[6]);
            });

            test('using latest browser', function () {
                let grid = setupGrid(false);
                const visibleNonFixedColumns = grid.visibleNonFixedColumns();
                expect(visibleNonFixedColumns.length).toBe(5);
                expect(visibleNonFixedColumns[0]).toBe(columns[0]);
                expect(visibleNonFixedColumns[1]).toBe(columns[2]);
                expect(visibleNonFixedColumns[2]).toBe(columns[3]);
                expect(visibleNonFixedColumns[3]).toBe(columns[5]);
                expect(visibleNonFixedColumns[4]).toBe(columns[6]);
            });
        });

        test('has non-group columns property', function () {
            const grid = getGrid();
            const columns = [
                getColumn({ isGroupCol: false }),
                getColumn({ isGroupCol: true }),
                getColumn({ isGroupCol: false }),
                getColumn({ isGroupCol: true }),
            ];
            grid.columns(columns);
            expect(grid.nonGroupColumns().length).toBe(2);
            expect(grid.nonGroupColumns()[0]).toBe(columns[0]);
            expect(grid.nonGroupColumns()[1]).toBe(columns[2]);
        });

        describe('that are fixed', function () {
            let grid: Grid;
            beforeEach(() => {
                grid = getGrid();
                Mock.extend(grid).with({ legacyMode: true });
                grid.columns([
                    getColumn({ width: 10, fixed: true }),
                    getColumn({ width: 15, fixed: true }),
                    getColumn({ width: 20 }),
                    getColumn({ width: 23 }),
                    getColumn({ width: 27 }),
                ]);
            });

            test('are used to calc totalFixedRowWidth', () => {
                expect(grid.totalFixedRowWidth()).toBe(25);
            });

            test('are returned by visibleFixedColumns', () => {
                const visibleColumns = grid.visibleFixedColumns();
                expect(visibleColumns.length).toBe(2);
                expect(visibleColumns[0].width).toBe(10);
                expect(visibleColumns[1].width).toBe(15);
            });
        });

        describe('that are not fixed', function () {
            function setupGrid(legacyMode: boolean) {
                let grid = getGrid();
                Mock.extend(grid).with({ legacyMode });
                grid.columns([
                    getColumn({ width: 10, fixed: true }),
                    getColumn({ width: 15, fixed: true }),
                    getColumn({ width: 20 }),
                    getColumn({ width: 23 }),
                    getColumn({ width: 27 }),
                ]);
                return grid;
            }

            describe('using legacy browser', function () {
                let grid: Grid;
                beforeEach(function () {
                    grid = setupGrid(true);
                });

                test('are used to calc totalNonFixedRowWidth', function () {
                    expect(grid.totalNonFixedRowWidth()).toBe(70);
                });

                test('are return by visibleNonFixedColumns', () => {
                    const visibleNonFixedColumns = grid.visibleNonFixedColumns();
                    expect(visibleNonFixedColumns.length).toBe(3);
                    expect(visibleNonFixedColumns[0].width).toBe(20);
                    expect(visibleNonFixedColumns[1].width).toBe(23);
                    expect(visibleNonFixedColumns[2].width).toBe(27);
                });
            });

            describe('using latest browser', function () {
                let grid: Grid;
                beforeEach(function () {
                    grid = setupGrid(true);
                });

                test('are used to calc totalNonFixedRowWidth', function () {
                    expect(grid.totalNonFixedRowWidth()).toBe(70);
                });

                test('are return by visibleNonFixedColumns', () => {
                    const visibleNonFixedColumns = grid.visibleNonFixedColumns();
                    expect(visibleNonFixedColumns.length).toBe(3);
                    expect(visibleNonFixedColumns[0].width).toBe(20);
                    expect(visibleNonFixedColumns[1].width).toBe(23);
                    expect(visibleNonFixedColumns[2].width).toBe(27);
                });
            });
        });
    });

    describe('column building & grouping', function () {
        test('builds columns from specified column definitions', function () {
            const grid = getGrid({
                columnDefs: [
                    { field: 'foo', resizable: false },
                    { field: 'bar', sortable: false },
                    { field: 'meh' },
                ],
            });

            const columns = grid.columns();
            expect(columns.length).toBe(3);

            expect(columns[0].index).toBe(0);
            expect(columns[0].field).toBe('foo');
            expect(columns[0].sortable).toBe(true);
            expect(columns[0].resizable).toBe(false);

            expect(columns[1].index).toBe(1);
            expect(columns[1].field).toBe('bar');
            expect(columns[1].sortable).toBe(false);
            expect(columns[1].resizable).toBe(true);

            expect(columns[2].index).toBe(2);
            expect(columns[2].field).toBe('meh');
            expect(columns[2].sortable).toBe(true);
            expect(columns[2].resizable).toBe(true);
        });

        test('fixed columns come before non-fixed ones', function () {
            const grid = getGrid({
                columnDefs: [
                    { field: 'foo', fixed: false },
                    { field: 'bar', fixed: true },
                    { field: 'meh', fixed: false },
                    { field: 'grr', fixed: true },
                ],
            });

            const columns = grid.columns().map((x) => x.field);
            expect(columns).toEqual(['bar', 'grr', 'foo', 'meh']);
        });

        test('has no columns if there is no column definition', function () {
            const grid = getGrid();
            expect(grid.columns().length).toBe(0);
        });

        test('can specify initial sort info', function () {
            const grid = getGrid({
                columnDefs: [
                    { field: 'foo' },
                    { field: 'bar' },
                    { field: 'meh' },
                    { field: 'grr' },
                ],
                sortInfos: [
                    { column: { field: 'bar' }, direction: SortDirection.Ascending },
                    { column: { field: 'meh' }, direction: SortDirection.Descending },
                ],
            });

            const columns = grid.columns();
            expect(columns[0].sortDirection()).toBe(SortDirection.Unspecified);
            expect(columns[1].sortDirection()).toBe(SortDirection.Ascending);
            expect(columns[2].sortDirection()).toBe(SortDirection.Descending);
            expect(columns[3].sortDirection()).toBe(SortDirection.Unspecified);
        });

        test('has no groups by default', function () {
            const grid = getGrid({ enableGrouping: true });
            expect(grid.configGroups().length).toBe(0);
        });

        test('given grouping is enabled then can add column to group by', function () {
            const grid = getGrid({
                columnDefs: [{ field: 'foo' }, { field: 'bar' }, { field: 'meh' }],
                enableGrouping: true,
            });

            const col = grid.columns()[2];
            grid.groupBy(col);

            expect(grid.configGroups().length).toBe(1);
            expect(grid.configGroups()[0]).toBe(col);

            expect(col.isGroupedBy()).toBe(true);
            expect(col.groupIndex()).toBe(0);

            expect(grid.columns().map((x) => x.index)).toEqual([0, 1, 2, 3]);
            expect(grid.columns().map((x) => x.isGroupCol)).toEqual([true, false, false, false]);
        });

        test('given grouping is not explicitly enabled then cannot add column to group by', function () {
            const grid = getGrid({
                columnDefs: [{ field: 'foo' }, { field: 'bar' }, { field: 'meh' }],
            });

            grid.groupBy(grid.columns()[2]);
            expect(grid.configGroups().length).toBe(0);
        });

        test('can specify condition function to check whether grouping is allowed', function () {
            const grid: Grid = getGrid({
                columnDefs: [{ field: 'foo' }, { field: 'bar' }, { field: 'meh' }],
                enableGrouping: true,
                ensureCanGroupData: () => grid.configGroups().length < 1,
            });

            grid.groupBy(grid.columns()[2]);
            expect(grid.configGroups().length).toBe(1);

            grid.groupBy(grid.columns()[1]);
            expect(grid.configGroups().length).toBe(1);
        });

        test('can specify index for column to group by', function () {
            const grid = getGrid({
                columnDefs: [{ field: 'foo' }, { field: 'bar' }, { field: 'meh' }],
                enableGrouping: true,
            });

            const col1 = grid.columns()[1];
            const col2 = grid.columns()[2];
            grid.groupBy(col1);
            grid.groupBy(col2, 0);

            expect(grid.configGroups().length).toBe(2);
            expect(grid.configGroups()[0]).toBe(col2);
            expect(grid.configGroups()[1]).toBe(col1);

            expect(col2.groupIndex()).toBe(0);
            expect(col1.groupIndex()).toBe(1);

            const styles = grid.styleSheet!.textContent;
            expect(styles).toContain('.col3');
        });

        test('when adding group then notifies settings changed by user', function () {
            const grid = getGrid({
                columnDefs: [{ field: 'foo' }, { field: 'bar' }, { field: 'meh' }],
                enableGrouping: true,
            });

            const col1 = grid.columns()[1];
            const col2 = grid.columns()[2];
            grid.groupBy(col1);
            expectEvent(
                grid,
                GridEventType.SettingsChangedByUser,
                { groupInfos: [{ field: 'bar' }, { field: 'meh' }] },
                () => Promise.resolve(grid.groupBy(col2))
            );
        });

        test('when adding group then notifies group infos changed', function () {
            const grid = getGrid({
                columnDefs: [{ field: 'foo' }, { field: 'bar' }, { field: 'meh' }],
                enableGrouping: true,
            });

            const col1 = grid.columns()[1];
            const spy = jest.fn();
            grid.on(GridEventType.GroupInfosChanged, spy);
            grid.groupBy(col1);
            expect(spy).toHaveBeenCalledTimes(1);
            expect(spy).toHaveBeenCalledWith({
                type: GridEventType.GroupInfosChanged,
                data: [col1],
            });
        });

        test('can remove group', function () {
            const grid = getGrid({
                columnDefs: [{ field: 'foo' }, { field: 'bar' }, { field: 'meh' }],
                enableGrouping: true,
            });

            const col1 = grid.columns()[0];
            const col2 = grid.columns()[1];
            const col3 = grid.columns()[2];
            grid.groupBy(col1);
            grid.groupBy(col2);
            grid.groupBy(col3);
            grid.removeGroup(1);

            expect(grid.configGroups().length).toBe(2);
            expect(grid.configGroups()[0]).toBe(col1);
            expect(grid.configGroups()[1]).toBe(col3);

            expect(col1.isGroupedBy()).toBe(true);
            expect(col2.isGroupedBy()).toBe(false);
            expect(col3.isGroupedBy()).toBe(true);
            expect(col1.groupIndex()).toBe(0);
            expect(col2.groupIndex()).toBe(-1);
            expect(col3.groupIndex()).toBe(1);

            expect(grid.columns().map((x) => x.index)).toEqual([0, 1, 2, 3, 4]);
            expect(grid.columns().map((x) => x.isGroupCol)).toEqual([
                true,
                true,
                false,
                false,
                false,
            ]);

            expect(grid.styleSheet!.textContent).not.toContain('.col6');
        });

        test('can remove final group', function () {
            const grid = getGrid({
                columnDefs: [{ field: 'foo' }, { field: 'bar' }, { field: 'meh' }],
                enableGrouping: true,
            });

            const col1 = grid.columns()[0];
            const col2 = grid.columns()[1];
            grid.groupBy(col1);
            grid.groupBy(col2);
            grid.removeGroup(0);
            grid.removeGroup(0);

            expect(grid.configGroups().length).toBe(0);

            expect(col1.isGroupedBy()).toBe(false);
            expect(col2.isGroupedBy()).toBe(false);
            expect(col1.groupIndex()).toBe(-1);
            expect(col2.groupIndex()).toBe(-1);

            expect(grid.columns().map((x) => x.index)).toEqual([0, 1, 2]);
            expect(grid.columns().map((x) => x.isGroupCol)).toEqual([false, false, false]);

            expect(grid.styleSheet!.textContent).not.toContain('.col3');
        });

        test('when removing group then should remove visible group columns first', function () {
            const grid = getGrid({
                columnDefs: [{ field: 'foo' }, { field: 'bar' }, { field: 'meh' }],
                enableGrouping: true,
            });

            const col1 = grid.columns()[0];
            const col2 = grid.columns()[1];
            const col3 = grid.columns()[2];
            grid.groupBy(col1);
            grid.groupBy(col2);
            grid.groupBy(col3);
            expect(grid.columns().map((x) => x.visible())).toEqual([
                true,
                true,
                false,
                true,
                true,
                true,
            ]);

            grid.removeGroup(0);
            expect(grid.columns().map((x) => x.visible())).toEqual([true, false, true, true, true]);

            grid.removeGroup(1);
            expect(grid.columns().map((x) => x.visible())).toEqual([false, true, true, true]);

            grid.removeGroup(0);
            expect(grid.columns().map((x) => x.visible())).toEqual([true, true, true]);
        });

        test('when removing group then should cater for fixed columns', function () {
            const grid = getGrid({
                columnDefs: [
                    { field: 'foo', fixed: true },
                    { field: 'bar', fixed: true },
                    { field: 'meh' },
                ],
                enableGrouping: true,
            });

            const col1 = grid.columns()[0];
            const col2 = grid.columns()[1];
            const col3 = grid.columns()[2];
            grid.groupBy(col1);
            grid.groupBy(col2);
            grid.groupBy(col3);
            grid.removeGroup(1);
            expect(grid.columns().map((x) => x.field)).toEqual(['foo', 'bar', '', '', 'meh']);
        });

        test('when removing group then triggers settings changed by user event', function () {
            const grid = getGrid({
                columnDefs: [{ field: 'foo' }, { field: 'bar' }, { field: 'meh' }],
                enableGrouping: true,
            });

            const col1 = grid.columns()[0];
            const col2 = grid.columns()[1];
            const col3 = grid.columns()[2];
            grid.groupBy(col1);
            grid.groupBy(col2);
            grid.groupBy(col3);

            expectEvent(
                grid,
                GridEventType.SettingsChangedByUser,
                {
                    groupInfos: [{ field: 'foo' }, { field: 'meh' }],
                },
                () => grid.removeGroup(1)
            );
        });

        test('when removing group then notifies group infos changed', function () {
            const grid = getGrid({
                columnDefs: [{ field: 'foo' }, { field: 'bar' }, { field: 'meh' }],
                enableGrouping: true,
                groupInfos: [{ field: 'foo' }],
            });

            const spy = jest.fn();
            grid.on(GridEventType.GroupInfosChanged, spy);
            grid.removeGroup(0);
            expect(spy).toHaveBeenCalledTimes(1);
            expect(spy).toHaveBeenCalledWith({ type: GridEventType.GroupInfosChanged, data: [] });
        });

        test('can group by column via toggling', function () {
            const grid = getGrid({
                columnDefs: [{ field: 'foo' }, { field: 'bar' }, { field: 'meh' }],
                enableGrouping: true,
            });

            const col = grid.columns()[0];
            grid.toggleGroup(col);
            expect(grid.configGroups().length).toBe(1);
            expect(col.isGroupedBy()).toBe(true);
        });

        test('can remove group for column via toggling', function () {
            const grid = getGrid({
                columnDefs: [{ field: 'foo' }, { field: 'bar' }, { field: 'meh' }],
                enableGrouping: true,
            });

            const col1 = grid.columns()[0];
            const col2 = grid.columns()[1];
            grid.groupBy(col1);
            grid.groupBy(col2);
            grid.toggleGroup(col1);

            expect(grid.configGroups().length).toBe(1);
            expect(col1.isGroupedBy()).toBe(false);
            expect(col2.isGroupedBy()).toBe(true);
        });

        test('when removing group for invalid index then does not change groups', function () {
            const grid = getGrid({
                columnDefs: [{ field: 'foo' }, { field: 'bar' }, { field: 'meh' }],
                enableGrouping: true,
            });
            grid.groupBy(grid.columns()[0]);
            grid.removeGroup(1);
            expect(grid.configGroups().length).toBe(1);
        });

        test('can specify initial groups', function () {
            const grid = getGrid({
                columnDefs: [{ field: 'foo' }, { field: 'bar' }, { field: 'meh' }],
                enableGrouping: true,
                groupInfos: [{ field: 'bar' }, { field: 'nope' }, { field: 'foo' }],
            });

            expect(grid.configGroups().length).toBe(2);
            expect(grid.configGroups()[0].field).toBe('bar');
            expect(grid.configGroups()[0].groupIndex()).toBe(0);
            expect(grid.configGroups()[1].field).toBe('foo');
            expect(grid.configGroups()[1].groupIndex()).toBe(1);
        });

        test('given grouping not enabled then initial groups are not used', function () {
            const grid = getGrid({
                columnDefs: [{ field: 'foo' }, { field: 'bar' }, { field: 'meh' }],
                enableGrouping: false,
                groupInfos: [{ field: 'bar' }, { field: 'nope' }, { field: 'foo' }],
            });

            expect(grid.configGroups().length).toBe(0);
        });
    });

    describe('column widths', function () {
        test('can specify numeric values', function () {
            const grid = getGrid({
                columnDefs: [
                    { field: 'foo', width: 10 },
                    { field: 'bar', width: 30 },
                ],
            });
            grid.configureColumnWidths();
            expect(grid.columns()[0].width).toBe(10);
            expect(grid.columns()[1].width).toBe(30);
        });

        test('can specify asterisk values, which take up all remaining space', function () {
            const grid = getGrid({
                columnDefs: [
                    { field: 'tmp', width: 25 },
                    { field: 'foo', width: '**' },
                    { field: 'bar', width: '*' },
                ],
                gridDim: new Dimension(100, 0),
            });
            grid.configureColumnWidths();
            expect(grid.columns()[1].width).toBe(50);
            expect(grid.columns()[2].width).toBe(23);
        });

        test('last column that has asterisk value is reduced by scrollbar width if the viewport is overflowing', function () {
            const grid = getGrid({
                columnDefs: [
                    { field: 'tmp', width: 25 },
                    { field: 'foo', width: '*' },
                    { field: 'bar', width: '*' },
                ],
                gridDim: new Dimension(100, 0),
            });
            grid.maxCanvasHt(15);
            grid.configureColumnWidths();
            expect(grid.columns()[1].width).toBe(37);
            expect(grid.columns()[2].width).toBe(18);
        });

        test('last column that does not have asterisk value is not reduced by scrollbar width if the viewport is overflowing', function () {
            const grid = getGrid({
                columnDefs: [
                    { field: 'tmp', width: 25 },
                    { field: 'foo', width: '*' },
                    { field: 'bar', width: 30 },
                ],
                gridDim: new Dimension(100, 0),
            });
            grid.maxCanvasHt(15);
            grid.configureColumnWidths();
            expect(grid.columns()[1].width).toBe(45);
            expect(grid.columns()[2].width).toBe(30);
        });

        test('can specify percentage values', function () {
            const grid = getGrid({
                columnDefs: [
                    { field: 'foo', width: '20%' },
                    { field: 'bar', width: '50%' },
                ],
                gridDim: new Dimension(100, 0),
            });
            grid.configureColumnWidths();
            expect(grid.columns()[0].width).toBe(20);
            expect(grid.columns()[1].width).toBe(50);
        });

        test('defaults to asterisk values if no width is specified', function () {
            const grid = getGrid({
                columnDefs: [{ field: 'foo' }, { field: 'bar', width: 40 }],
                gridDim: new Dimension(100, 0),
            });
            grid.configureColumnWidths();
            expect(grid.columns()[0].width).toBe(60);
            expect(grid.columns()[1].width).toBe(40);
        });

        test('throws error if unknown value is specified', function () {
            const grid = getGrid({
                columnDefs: [
                    { field: 'foo', width: 'lol' },
                    { field: 'bar', width: '*' },
                ],
            });
            const action = () => grid.configureColumnWidths();
            expect(action).toThrowError(
                'unable to parse column width, use percentage ("10%","20%", etc...) or "*" to use remaining width of grid'
            );
        });

        test.each<boolean | undefined>([true, undefined])(
            'given maintain column ratios = %s and there are asterisk values then should maintain column ratios',
            function (maintainColumnRatios) {
                const grid = getGrid({
                    columnDefs: [{ field: 'foo', width: 10 }, { field: 'bar' }],
                    maintainColumnRatios: maintainColumnRatios,
                });
                grid.configureColumnWidths();
                expect(grid.shouldMaintainColumnRatios()).toBe(true);
            }
        );

        test('given maintain column ratios = false and there are asterisk values then should not maintain column ratios', function () {
            const grid = getGrid({
                columnDefs: [{ field: 'foo', width: 10 }, { field: 'bar' }],
                maintainColumnRatios: false,
            });
            grid.configureColumnWidths();
            expect(grid.shouldMaintainColumnRatios()).toBe(false);
        });

        test('given maintain column ratios = true and there are no asterisk values then should not maintain column ratios', function () {
            const grid = getGrid({
                columnDefs: [
                    { field: 'foo', width: 10 },
                    { field: 'bar', width: 20 },
                ],
                maintainColumnRatios: true,
            });
            grid.configureColumnWidths();
            expect(grid.shouldMaintainColumnRatios()).toBe(false);
        });
    });

    describe('column sorting - internal mechanism', function () {
        test('sets sort info', function () {
            const sortInfos: SortInfo[] = [];
            const grid = getGrid({
                columnDefs: [{ field: 'foo' }, { field: 'bar' }],
                data: ko.observableArray<Entity>([{ foo: 'x', bar: 'y' }]),
                sortInfos,
            });

            grid.columns()[0].sort();
            expect(grid.settings().sortInfos).toEqual([
                {
                    column: grid.columns()[0],
                    direction: SortDirection.Ascending,
                },
            ]);
        });

        test('sorts data', function () {
            const grid = getGrid({
                columnDefs: [{ field: 'foo' }, { field: 'bar' }],
                data: ko.observableArray<Entity>([
                    { foo: 'x', bar: 'b' },
                    { foo: 'b', bar: 'y' },
                ]),
            });

            grid.columns()[0].sort();
            expect(grid.sortedData()[0].foo).toBe('b');
            expect(grid.sortedData()[1].foo).toBe('x');
        });

        test('can sort again by same column', function () {
            const grid = getGrid({
                columnDefs: [{ field: 'foo' }, { field: 'bar' }],
                data: ko.observableArray<Entity>([
                    { foo: 'x', bar: 'b' },
                    { foo: 'b', bar: 'y' },
                ]),
            });

            const col = grid.columns()[0];
            col.sort();
            col.sort();
            expect(grid.sortedData()[0].foo).toBe('x');
            expect(grid.sortedData()[1].foo).toBe('b');
            expect(col.sortDirection()).toBe(SortDirection.Descending);
        });

        test('when sorting by different column then clears sort direction of previous column', function () {
            const grid = getGrid({
                columnDefs: [{ field: 'foo' }, { field: 'bar' }],
                data: ko.observableArray<Entity>([{ foo: 'x', bar: 'b' }]),
            });
            grid.columns()[0].sort();
            grid.columns()[1].sort();
            expect(grid.columns()[0].sortDirection()).toBe(SortDirection.Unspecified);
            expect(grid.columns()[1].sortDirection()).toBe(SortDirection.Ascending);
        });

        test('with grid already sorted with sortInfos from server, sorting by different column then clears sort direction of previous column', function () {
            const grid = getGrid({
                columnDefs: [{ field: 'foo' }, { field: 'bar' }],
                data: ko.observableArray<Entity>([{ foo: 'x', bar: 'b' }]),
                sortInfos: [{ column: { field: 'foo' }, direction: SortDirection.Ascending }],
            });
            grid.columns()[1].sort();
            expect(grid.columns()[0].sortDirection()).toBe(SortDirection.Unspecified);
            expect(grid.columns()[1].sortDirection()).toBe(SortDirection.Ascending);
        });

        test('triggers SortInfosChanged event', function () {
            const grid = getGrid({
                columnDefs: [{ field: 'foo' }, { field: 'bar' }],
                data: ko.observableArray<Entity>([
                    { foo: 'x', bar: 'b' },
                    { foo: 'b', bar: 'y' },
                ]),
            });

            const spy = jest.fn();
            grid.on(GridEventType.SortInfosChanged, spy);
            grid.columns()[0].sort();
            expect(spy).toHaveBeenCalledTimes(1);
            expect(spy).toHaveBeenCalledWith({
                type: GridEventType.SortInfosChanged,
                data: [{ column: grid.columns()[0], direction: SortDirection.Ascending }],
            });
        });

        test('triggers SettingsChangedByUser event', function () {
            const grid = getGrid({
                columnDefs: [{ field: 'foo' }, { field: 'bar' }],
                data: ko.observableArray<Entity>([
                    { foo: 'x', bar: 'b' },
                    { foo: 'b', bar: 'y' },
                ]),
            });

            expectEvent(
                grid,
                GridEventType.SettingsChangedByUser,
                {
                    sortInfos: [{ column: grid.columns()[0], direction: SortDirection.Ascending }],
                },
                () => {
                    grid.columns()[0].sort();
                }
            );
        });
    });

    describe('column sorting - external mechanism', function () {
        test('sets sort info', function () {
            const sortInfos: SortInfo[] = [];
            const grid = getGrid({
                columnDefs: [{ field: 'foo' }, { field: 'bar' }],
                data: ko.observableArray<Entity>([{ foo: 'x', bar: 'y' }]),
                sortInfos,
                useExternalSorting: true,
            });

            grid.columns()[0].sort();
            expect(grid.settings().sortInfos).toEqual([
                {
                    column: grid.columns()[0],
                    direction: SortDirection.Ascending,
                },
            ]);
        });

        test('does not sort data', function () {
            const grid = getGrid({
                columnDefs: [{ field: 'foo' }, { field: 'bar' }],
                data: ko.observableArray<Entity>([
                    { foo: 'x', bar: 'b' },
                    { foo: 'b', bar: 'y' },
                ]),
                useExternalSorting: true,
            });

            grid.columns()[0].sort();
            expect(grid.sortedData()[0].foo).toBe('x');
            expect(grid.sortedData()[1].foo).toBe('b');
        });

        test('triggers SortInfosChanged event', function () {
            const grid = getGrid({
                columnDefs: [{ field: 'foo' }, { field: 'bar' }],
                data: ko.observableArray<Entity>([
                    { foo: 'x', bar: 'b' },
                    { foo: 'b', bar: 'y' },
                ]),
                useExternalSorting: true,
            });

            const spy = jest.fn();
            grid.on(GridEventType.SortInfosChanged, spy);
            grid.columns()[0].sort();
            expect(spy).toHaveBeenCalledTimes(1);
            expect(spy).toHaveBeenCalledWith({
                type: GridEventType.SortInfosChanged,
                data: [{ column: grid.columns()[0], direction: SortDirection.Ascending }],
            });
        });

        test('triggers SettingsChangedByUser event', function () {
            const grid = getGrid({
                columnDefs: [{ field: 'foo' }, { field: 'bar' }],
                data: ko.observableArray<Entity>([{ foo: 'x', bar: 'y' }]),
                useExternalSorting: true,
            });

            expectEvent(
                grid,
                GridEventType.SettingsChangedByUser,
                {
                    sortInfos: [{ column: grid.columns()[0], direction: SortDirection.Ascending }],
                },
                () => {
                    grid.columns()[0].sort();
                }
            );
        });
    });

    describe('column multi sorting - internal mechanism', function () {
        test('sets sort info', function () {
            const sortInfos: SortInfo[] = [];
            const grid = getGridWithSortingData(sortInfos);
            grid.columns()[0].sort(undefined, $.Event('click', { shiftKey: true }));
            grid.columns()[1].sort(undefined, $.Event('click', { shiftKey: true }));
            expect(grid.settings().sortInfos).toEqual([
                {
                    column: grid.columns()[0],
                    direction: SortDirection.Ascending,
                },
                {
                    column: grid.columns()[1],
                    direction: SortDirection.Ascending,
                },
            ]);
        });

        test('sorts data', function () {
            const grid = getGridWithSortingData();
            grid.columns()[0].sort(undefined, $.Event('click', { shiftKey: true }));
            grid.columns()[1].sort(undefined, $.Event('click', { shiftKey: true }));
            expect(grid.sortedData()[0].bar).toBe('y');
            expect(grid.sortedData()[1].bar).toBe('z');
            expect(grid.sortedData()[2].bar).toBe('a');
        });

        test('sorting again by same column adds it to the end of sort info', function () {
            const sortInfos: SortInfo[] = [];
            const grid = getGridWithSortingData(sortInfos);
            grid.columns()[0].sort(undefined, $.Event('click', { shiftKey: true }));
            grid.columns()[1].sort(undefined, $.Event('click', { shiftKey: true }));
            grid.columns()[0].sort(undefined, $.Event('click', { shiftKey: true }));
            expect(grid.settings().sortInfos).toEqual([
                {
                    column: grid.columns()[1],
                    direction: SortDirection.Ascending,
                },
                {
                    column: grid.columns()[0],
                    direction: SortDirection.Descending,
                },
            ]);
        });

        test('retains sort direction of previous column', function () {
            const grid = getGridWithSortingData();
            grid.columns()[0].sort(undefined, $.Event('click', { shiftKey: true }));
            grid.columns()[1].sort(undefined, $.Event('click', { shiftKey: true }));
            expect(grid.columns()[0].sortDirection()).toBe(SortDirection.Ascending);
            expect(grid.columns()[1].sortDirection()).toBe(SortDirection.Ascending);
        });

        test('resets sort direction of previous columns selected when another column selected', function () {
            const sortInfos: SortInfo[] = [];
            const grid = getGrid({
                columnDefs: [{ field: 'foo' }, { field: 'bar' }, { field: 'foobar' }],
                data: ko.observableArray<Entity>([
                    { foo: 'y', bar: 'a', foobar: 'b' },
                    { foo: 'x', bar: 'z', foobar: 'c' },
                    { foo: 'x', bar: 'y', foobar: 'd' },
                ]),
                sortInfos: sortInfos,
            });
            grid.columns()[0].sort(undefined, $.Event('click', { shiftKey: true }));
            grid.columns()[1].sort(undefined, $.Event('click', { shiftKey: true }));
            expect(grid.columns()[0].sortDirection()).toBe(SortDirection.Ascending);
            expect(grid.columns()[1].sortDirection()).toBe(SortDirection.Ascending);

            grid.columns()[2].sort();
            expect(grid.columns()[0].sortDirection()).toBe(SortDirection.Unspecified);
            expect(grid.columns()[1].sortDirection()).toBe(SortDirection.Unspecified);
            expect(grid.columns()[2].sortDirection()).toBe(SortDirection.Ascending);
        });

        test('with grid already sorted with sortInfos, resets sort direction of previous columns selected when another column selected', function () {
            const grid = getGrid({
                columnDefs: [{ field: 'foo' }, { field: 'bar' }, { field: 'foobar' }],
                data: ko.observableArray<Entity>([
                    { foo: 'y', bar: 'a', foobar: 'b' },
                    { foo: 'x', bar: 'z', foobar: 'c' },
                    { foo: 'x', bar: 'y', foobar: 'd' },
                ]),
                sortInfos: [
                    { column: { field: 'foo' }, direction: SortDirection.Ascending },
                    { column: { field: 'foobar' }, direction: SortDirection.Ascending },
                ],
            });
            grid.columns()[2].sort();
            expect(grid.columns()[0].sortDirection()).toBe(SortDirection.Unspecified);
            expect(grid.columns()[1].sortDirection()).toBe(SortDirection.Unspecified);
            expect(grid.columns()[2].sortDirection()).toBe(SortDirection.Descending);
        });

        function getGridWithSortingData(sortInfos?: SortInfo[] | undefined) {
            return getGrid({
                columnDefs: [{ field: 'foo' }, { field: 'bar' }],
                data: ko.observableArray<Entity>([
                    { foo: 'y', bar: 'a' },
                    { foo: 'x', bar: 'z' },
                    { foo: 'x', bar: 'y' },
                ]),
                sortInfos: sortInfos,
            });
        }
    });

    describe('column resizing width to data - non-legacy mode', function () {
        let grid: Grid;

        beforeEach(function () {
            grid = getGrid({
                columnDefs: [
                    { field: 'f1', fixed: true, width: 10 },
                    { field: 'f2', fixed: true, width: 15 },
                    { field: 'nf1', width: 25 },
                    { field: 'nf2', width: 22, minWidth: 20, maxWidth: 50 },
                    { field: 'nf3', width: 30, maxWidth: 100 },
                ],
                legacyMode: false,
            });
            grid.$headerScroller.html(`
<div>
    <div class="col0"><div class="kgHeaderText f1h"></div></div>
    <div class="col1"><div class="kgHeaderText f2h"></div></div>
    <div class="col2"><div class="kgHeaderText nf1h"></div></div>
    <div class="col3"><div class="kgHeaderText nf2h"></div></div>
    <div class="col4"><div class="kgHeaderText nf3h"></div></div>
</div>`);
            grid.$viewport.html(`
<div>
    <div>
        <div class="col0"><div class="kgCellText f1a"></div></div>
        <div class="col1"><div class="kgCellText f2a"></div></div>
        <div class="col2"><div class="kgCellText nf1a"></div></div>
        <div class="col3"><div class="kgCellText nf2a"></div></div>
        <div class="col4 kgCellText nf3a"></div>
    </div>
    <div>
        <div class="col0"><div class="kgCellText f1b"></div></div>
        <div class="col1"><div class="kgCellText f2b"></div></div>
        <div class="col2"><div class="kgCellText nf1b"></div></div>
        <div class="col3"><div class="kgCellText nf2b"></div></div>
        <div class="col4 kgCellText nf3b"></div>
    </div>
    <div>
        <div class="col0"><div class="kgCellText f1c"></div></div>
        <div class="col1"><div class="kgCellText f2c"></div></div>
        <div class="col2"><div class="kgCellText nf1c"></div></div>
        <div class="col3"><div class="kgCellText nf2c"></div></div>
        <div class="col4 kgCellText nf3c"></div>
    </div>
</div>`);

            jest.spyOn(utils, 'visualLength').mockImplementation(function (node) {
                const width = node.attr('data-width');
                return width ? parseInt(width, 10) : 0;
            });
        });

        test('fits non-fixed column to longest cell text', function () {
            grid.$headerScroller.find('.nf2h').attr('data-width', 20);
            grid.$headerScroller.find('.f2h').attr('data-width', 100);
            grid.$viewport.find('.nf2a').attr('data-width', 25);
            grid.$viewport.find('.nf2b').attr('data-width', 30);
            grid.$viewport.find('.nf2c').attr('data-width', 28);
            expect(triggerResize(3)).toBe(47);
        });

        test('fits non-fixed column to header text size if that is longer than all cell text', function () {
            grid.$headerScroller.find('.nf2h').attr('data-width', 27);
            grid.$headerScroller.find('.nf2a, .nf2b, .nf2c').attr('data-width', 20);
            expect(triggerResize(3)).toBe(44);
        });

        test('when fitting non-fixed column then does not adjust fixed column width', function () {
            grid.$headerScroller.find('.nf2h').attr('data-width', 30);
            grid.$headerScroller.find('.f2h').attr('data-width', 100);
            triggerResize(3);
            expect(grid.columns()[1].width).toBe(15);
        });

        test('fits fixed column to longest cell text', function () {
            grid.$headerScroller.find('.f2h').attr('data-width', 55);
            grid.$headerScroller.find('.nf2h').attr('data-width', 100);
            grid.$viewport.find('.f2b').attr('data-width', 60);
            expect(triggerResize(1)).toBe(77);
        });

        test('when fitting fixed column then does not adjust non-fixed column width', function () {
            grid.$headerScroller.find('.f2h').attr('data-width', 60);
            grid.$headerScroller.find('.nf2h').attr('data-width', 100);
            triggerResize(1);
            expect(grid.columns()[3].width).toBe(22);
        });

        test('supports column that has both col and kgCellText classes on same element', function () {
            grid.$viewport.find('.nf3b').attr('data-width', 70);
            expect(triggerResize(4)).toBe(87);
        });

        test('honors min width', function () {
            (utils.visualLength as jest.Mock).mockReturnValue(2);
            expect(triggerResize(3)).toBe(20);
        });

        test('honors max width', function () {
            (utils.visualLength as jest.Mock).mockReturnValue(100);
            expect(triggerResize(3)).toBe(50);
        });

        test('rebuilds styles', function () {
            (utils.visualLength as jest.Mock).mockReturnValue(20);
            triggerResize(3);
            expect(grid.styleSheet!.textContent).toContain('.kgNonFixedColumn.col3 { width: 37px');
        });

        function triggerResize(colIndex: number): number {
            const col = grid.columns()[colIndex];
            col.gripClick(undefined, $.Event('click'));
            col.gripClick(undefined, $.Event('click'));

            return col.width;
        }
    });

    describe('column resizing width to data - legacy mode', function () {
        let grid: Grid;

        beforeEach(function () {
            grid = getGrid({
                columnDefs: [
                    { field: 'f1', fixed: true, width: 10 },
                    { field: 'f2', fixed: true, width: 15 },
                    { field: 'nf1', width: 25 },
                    { field: 'nf2', width: 22, minWidth: 20, maxWidth: 50 },
                    { field: 'nf3', width: 30, maxWidth: 100 },
                ],
                legacyMode: true,
            });
            grid.$fixedHeaderScroller.html(`
<div data-bind="foreach: visibleFixedColumns">
    <div class="col0"><div class="kgHeaderText f1h"></div></div>
    <div class="col1"><div class="kgHeaderText f2h"></div></div>
</div>`);
            grid.$headerScroller.html(`
<div>
    <div class="col0"><div class="kgHeaderText nf1h"></div></div>
    <div class="col1"><div class="kgHeaderText nf2h"></div></div>
    <div class="col2"><div class="kgHeaderText nf3h"></div></div>
</div>`);
            grid.$fixedViewport.html(`
<div>
    <div>
        <div class="col0"><div class="kgCellText f1a"></div></div>
        <div class="col1"><div class="kgCellText f2a"></div></div>
    </div>
    <div>
        <div class="col0"><div class="kgCellText f1b"></div></div>
        <div class="col1"><div class="kgCellText f2b"></div></div>
    </div>
    <div>
        <div class="col0"><div class="kgCellText f1c"></div></div>
        <div class="col1"><div class="kgCellText f2c"></div></div>
    </div>
</div>`);
            grid.$viewport.html(`
<div>
    <div>
        <div class="col0"><div class="kgCellText nf1a"></div></div>
        <div class="col1"><div class="kgCellText nf2a"></div></div>
        <div class="col2 kgCellText nf3a"></div>
    </div>
    <div>
        <div class="col0"><div class="kgCellText nf1b"></div></div>
        <div class="col1"><div class="kgCellText nf2b"></div></div>
        <div class="col2 kgCellText nf3b"></div>
    </div>
    <div>
        <div class="col0"><div class="kgCellText nf1c"></div></div>
        <div class="col1"><div class="kgCellText nf2c"></div></div>
        <div class="col2 kgCellText nf3c"></div>
    </div>
</div>`);

            jest.spyOn(utils, 'visualLength').mockImplementation(function (node) {
                const width = node.attr('data-width');
                return width ? parseInt(width, 10) : 0;
            });
        });

        test('fits non-fixed column to longest cell text', function () {
            grid.$headerScroller.find('.nf2h').attr('data-width', 20);
            grid.$fixedHeaderScroller.find('.f2h').attr('data-width', 100);
            grid.$viewport.find('.nf2a').attr('data-width', 25);
            grid.$viewport.find('.nf2b').attr('data-width', 30);
            grid.$viewport.find('.nf2c').attr('data-width', 28);
            expect(triggerResize(3)).toBe(47);
        });

        test('fits non-fixed column to header text size if that is longer than all cell text', function () {
            grid.$headerScroller.find('.nf2h').attr('data-width', 27);
            grid.$headerScroller.find('.nf2a, .nf2b, .nf2c').attr('data-width', 20);
            expect(triggerResize(3)).toBe(44);
        });

        test('when fitting non-fixed column then does not adjust fixed column width', function () {
            grid.$headerScroller.find('.nf2h').attr('data-width', 30);
            grid.$fixedHeaderScroller.find('.f2h').attr('data-width', 100);
            triggerResize(3);
            expect(grid.columns()[1].width).toBe(15);
        });

        test('fits fixed column to longest cell text', function () {
            grid.$fixedHeaderScroller.find('.f2h').attr('data-width', 55);
            grid.$headerScroller.find('.nf2h').attr('data-width', 100);
            grid.$fixedViewport.find('.f2b').attr('data-width', 60);
            expect(triggerResize(1)).toBe(77);
        });

        test('when fitting fixed column then does not adjust non-fixed column width', function () {
            grid.$fixedHeaderScroller.find('.f2h').attr('data-width', 60);
            grid.$headerScroller.find('.nf2h').attr('data-width', 100);
            triggerResize(1);
            expect(grid.columns()[3].width).toBe(22);
        });

        test('supports column that has both col and kgCellText classes on same element', function () {
            grid.$viewport.find('.nf3b').attr('data-width', 70);
            expect(triggerResize(4)).toBe(87);
        });

        test('honors min width', function () {
            (utils.visualLength as jest.Mock).mockReturnValue(2);
            expect(triggerResize(3)).toBe(20);
        });

        test('honors max width', function () {
            (utils.visualLength as jest.Mock).mockReturnValue(100);
            expect(triggerResize(3)).toBe(50);
        });

        test('rebuilds styles', function () {
            (utils.visualLength as jest.Mock).mockReturnValue(20);
            triggerResize(3);
            expect(grid.styleSheet!.textContent).toContain('.kgNonFixedColumn.col1 { width: 37px');
        });

        function triggerResize(colIndex: number): number {
            const col = grid.columns()[colIndex];
            col.gripClick(undefined, $.Event('click'));
            col.gripClick(undefined, $.Event('click'));

            return col.width;
        }
    });

    describe('footer', function () {
        test('is visible by default', function () {
            const grid = getGrid();
            expect(grid.footerVisible).toBe(true);
        });

        test('can be hidden', function () {
            const grid = getGrid({ footerVisible: false });
            expect(grid.footerVisible).toBe(false);
        });

        test('row height is 55 by default', function () {
            const grid = getGrid();
            expect(grid.config.footerRowHeight).toBe(55);
        });

        test('can specify row height', function () {
            const grid = getGrid({ footerRowHeight: 58 });
            expect(grid.config.footerRowHeight).toBe(58);
        });

        test('row height is 0 if not visible', function () {
            const grid = getGrid({ footerVisible: false });
            expect(grid.config.footerRowHeight).toBe(0);
        });
    });

    describe('paging', function () {
        test('is not enabled by default', function () {
            const grid = getGrid();
            expect(grid.enablePaging).toBe(false);
        });

        test('can be enabled', function () {
            const grid = getGrid({ enablePaging: true });
            expect(grid.enablePaging).toBe(true);
        });

        test('current page is 1 by default', function () {
            const grid = getGrid();
            expect(grid.pagingOptions.currentPage()).toBe(1);
        });

        test('can specify current page observable', function () {
            const currentPage = ko.observable();
            const grid = getGrid({ pagingOptions: { currentPage } });
            expect(grid.pagingOptions.currentPage).toBe(currentPage);
        });

        test('page size is 250 by default', function () {
            const grid = getGrid();
            expect(grid.pagingOptions.pageSize()).toBe(250);
        });

        test('can specify page size observable', function () {
            const pageSize = ko.observable();
            const grid = getGrid({ pagingOptions: { pageSize } });
            expect(grid.pagingOptions.pageSize).toBe(pageSize);
        });

        test('page sizes is 250, 500, 1000 by default', function () {
            const grid = getGrid();
            expect(grid.pagingOptions.pageSizes()).toEqual([250, 500, 1000]);
        });

        test('can specify page sizes observable', function () {
            const pageSizes = ko.observableArray();
            const grid = getGrid({ pagingOptions: { pageSizes } });
            expect(grid.pagingOptions.pageSizes).toBe(pageSizes);
        });

        test('total server items is 0 by default', function () {
            const grid = getGrid();
            expect(grid.pagingOptions.totalServerItems()).toBe(0);
        });

        test('can specify total server items observable', function () {
            const totalServerItems = ko.observable();
            const grid = getGrid({ pagingOptions: { totalServerItems } });
            expect(grid.pagingOptions.totalServerItems).toBe(totalServerItems);
        });

        test('max rows is total server items', function () {
            const grid = getGridWithPagingData();
            expect(grid.maxRows()).toBe(100);
        });

        test('max rows is data length if that is larger than total server items', function () {
            const grid = getGridWithPagingData();
            grid.pagingOptions.totalServerItems(0);
            expect(grid.maxRows()).toBe(1);
        });

        test('cannot page forward if on last page', function () {
            const grid = getGridWithPagingData();
            grid.pagingOptions.currentPage(34);
            expect(grid.cantPageForward()).toBe(true);
        });

        test('can page backward if not on first page', function () {
            const grid = getGridWithPagingData();
            grid.pagingOptions.currentPage(2);
            expect(grid.cantPageBackward()).toBe(false);
        });

        test('cannot page backward if on first page', function () {
            const grid = getGridWithPagingData();
            grid.pagingOptions.currentPage(1);
            expect(grid.cantPageBackward()).toBe(true);
        });

        test('when paging forward then goes to next page', function () {
            const grid = getGridWithPagingData();
            grid.pagingOptions.currentPage(10);
            grid.pageForward();
            expect(grid.pagingOptions.currentPage()).toBe(11);
        });

        test('when paging forward then it is bound by the last page', function () {
            const grid = getGridWithPagingData();
            grid.pagingOptions.currentPage(34);
            grid.pageForward();
            expect(grid.pagingOptions.currentPage()).toBe(34);
        });

        test('when paging backward then goes to previous page', function () {
            const grid = getGridWithPagingData();
            grid.pagingOptions.currentPage(10);
            grid.pageBackward();
            expect(grid.pagingOptions.currentPage()).toBe(9);
        });

        test('when paging backward then it is bound by the first page', function () {
            const grid = getGridWithPagingData();
            grid.pagingOptions.currentPage(1);
            grid.pageBackward();
            expect(grid.pagingOptions.currentPage()).toBe(1);
        });

        test('can switch to first page', function () {
            const grid = getGridWithPagingData();
            grid.pagingOptions.currentPage(10);
            grid.pageToFirst();
            expect(grid.pagingOptions.currentPage()).toBe(1);
        });

        test('can switch to last page', function () {
            const grid = getGridWithPagingData();
            grid.pagingOptions.currentPage(10);
            grid.pageToLast();
            expect(grid.pagingOptions.currentPage()).toBe(34);
        });

        function getGridWithPagingData() {
            return getGrid({
                data: ko.observableArray<Entity>([{ text: 'a' }]),
                pagingOptions: {
                    pageSize: ko.observable(3),
                    pageSizes: ko.observableArray([3, 10]),
                    totalServerItems: ko.observable(100),
                },
            });
        }
    });

    describe('scrolling', function () {
        let grid: Grid;

        beforeEach(function () {
            const data = [];
            for (let i = 0; i < 50; i++) {
                data.push({});
            }

            grid = getGrid({
                data: ko.observableArray(data),
                footerRowHeight: 0,
                headerRowHeight: 13,
                gridDim: new Dimension(100, 50),
                rowHeight: 10,
            });
        });

        test('can adjust scroll left', function () {
            grid.adjustScrollLeft(123);
            expect(grid.$headerScroller.css('margin-left')).toBe('-123px');
        });

        test('when adjusting scroll top then updates rendered rows', function () {
            testScrollTop(150, undefined, true, 8, 26);
        });

        test('when scrolling downwards below threshold amount then does not update rendered rows', function () {
            grid.adjustScrollTop(150);
            testScrollTop(200, undefined, false, 8, 26);
        });

        test('when scrolling downwards below threshold amount with force flag then updates rendered rows', function () {
            grid.adjustScrollTop(150);
            testScrollTop(200, true, true, 13, 31);
        });

        test('when scrolling downwards above threshold amount then updates rendered rows', function () {
            grid.adjustScrollTop(150);
            testScrollTop(210, undefined, true, 14, 32);
        });

        test('when scrolling upwards below threshold amount then does not update rendered rows', function () {
            grid.adjustScrollTop(150);
            testScrollTop(100, undefined, false, 8, 26);
        });

        test('when scrolling upwards below threshold amount with force flag then updates rendered rows', function () {
            grid.adjustScrollTop(150);
            testScrollTop(100, true, true, 3, 21);
        });

        test('when scrolling upwards above threshold amount then updates rendered rows', function () {
            grid.adjustScrollTop(150);
            testScrollTop(90, undefined, true, 2, 20);
        });

        test('when scrolling to same position then does not update rendered rows', function () {
            grid.adjustScrollTop(150);
            testScrollTop(150, undefined, false, 8, 26);
        });

        it('when forcing scroll and new range = old range then does not update rendered rows', function () {
            grid.rowFactory.updateViewableRange(new Range(7, 26));
            testScrollTop(150, undefined, false, 8, 26);
        });

        it('when forcing scroll and new range top < old range top then updates rendered rows', function () {
            grid.rowFactory.updateViewableRange(new Range(8, 26));
            testScrollTop(150, true, true, 8, 26);
        });

        it('when forcing scroll and new range top > old range top then does not update rendered rows', function () {
            grid.rowFactory.updateViewableRange(new Range(6, 26));
            testScrollTop(150, true, false, 7, 26);
        });

        it('when forcing scroll and new range bottom > old range bottom then updates rendered rows', function () {
            grid.rowFactory.updateViewableRange(new Range(7, 25));
            testScrollTop(150, true, true, 8, 26);
        });

        it('when forcing scroll and new range bottom < old range bottom then does not update rendered rows', function () {
            grid.rowFactory.updateViewableRange(new Range(7, 27));
            testScrollTop(150, true, false, 8, 27);
        });

        function testScrollTop(
            scrollTop: number,
            force: boolean | undefined,
            changed: boolean,
            rowIndexTop: number,
            rowIndexBottom: number
        ) {
            let notifyCount = 0;
            grid.renderedRows.subscribe(() => notifyCount++);
            grid.adjustScrollTop(scrollTop, force);
            expect(notifyCount).toBe(changed ? 1 : 0);

            const rows = grid.renderedRows() as Row[];
            expect(rows[0].rowIndex()).toBe(rowIndexTop);
            expect(rows[rows.length - 1].rowIndex()).toBe(rowIndexBottom);
        }
    });

    describe('max canvas height', function () {
        test('is calculated based on initial data size', function () {
            const grid = getGrid({ data: ko.observableArray([{}, {}]), rowHeight: 25 });
            expect(grid.maxCanvasHt()).toBe(50);
        });

        test('is updated when filtered data changes', function () {
            const grid = getGrid({ rowHeight: 25 });
            grid.filteredData([{}, {}, {}]);
            expect(grid.maxCanvasHt()).toBe(75);
        });

        test('is updated when grouped by column', function () {
            const grid = getGrid({
                columnDefs: [{ field: 'val' }],
                data: ko.observableArray<Entity>([
                    { val: 'foo1' },
                    { val: 'foo1' },
                    { val: 'foo2' },
                ]),
                enableGrouping: true,
                rowHeight: 25,
            });

            grid.groupBy(grid.columns()[0]);
            expect(grid.maxCanvasHt()).toBe(50);
        });

        test('is updated when group is expanded', function () {
            const grid = getGrid({
                columnDefs: [{ field: 'val' }],
                data: ko.observableArray<Entity>([
                    { val: 'foo1' },
                    { val: 'foo1' },
                    { val: 'foo2' },
                ]),
                enableGrouping: true,
                rowHeight: 25,
            });

            grid.groupBy(grid.columns()[0]);
            grid.rowFactory.groupCache[0].toggleExpand();
            expect(grid.maxCanvasHt()).toBe(100);
        });
    });

    describe('refreshing DOM size', function () {
        test('sets root dimensions if value is specified', function () {
            const grid = getGrid();
            grid.refreshDomSizes({ width: 123, height: 456 });
            expect(grid.rootDim.outerWidth()).toBe(123);
            expect(grid.rootDim.outerHeight()).toBe(456);
        });

        test('does not set root dimension if value is not specified', function () {
            const grid = getGrid({ gridDim: new Dimension(1, 2) });
            grid.refreshDomSizes();
            expect(grid.rootDim.outerWidth()).toBe(1);
            expect(grid.rootDim.outerHeight()).toBe(2);
        });

        test('updates max canvas height', function () {
            const grid = getGrid({ data: ko.observableArray([{}, {}]), rowHeight: 25 });
            grid.maxCanvasHt(0);
            grid.refreshDomSizes();
            expect(grid.maxCanvasHt()).toBe(50);
        });
    });

    describe('viewportDimWidth', () => {
        let grid: Grid;
        beforeEach(() => {
            grid = getGrid();
            grid.rootDim.outerWidth(150);
        });

        test('when grid has all non fixed columns', () => {
            grid.columns([
                getColumn({ width: 11 }),
                getColumn({ width: 13 }),
                getColumn({ width: 17 }),
                getColumn({ width: 19 }),
            ]);

            expect(grid.viewportDimWidth()).toBe(150);
        });

        test('when grid has some columns', () => {
            Mock.extend(grid).with({ legacyMode: true });
            grid.columns([
                getColumn({ width: 11, fixed: true }),
                getColumn({ width: 13, fixed: true }),
                getColumn({ width: 17 }),
                getColumn({ width: 19 }),
            ]);

            expect(grid.viewportDimWidth()).toBe(126);
        });

        test('when grid has some columns', () => {
            Mock.extend(grid).with({ legacyMode: false });
            grid.columns([
                getColumn({ width: 11, fixed: true }),
                getColumn({ width: 13, fixed: true }),
                getColumn({ width: 17 }),
                getColumn({ width: 19 }),
            ]);

            expect(grid.viewportDimWidth()).toBe(150);
        });
    });

    describe('fixedViewportDimWidth', () => {
        let grid: Grid;
        beforeEach(() => {
            grid = getGrid();
            Mock.extend(grid).with({ legacyMode: true });
            grid.rootDim.outerWidth(150);
        });

        test('when grid has all non fixed columns', () => {
            grid.columns([
                getColumn({ width: 11 }),
                getColumn({ width: 13 }),
                getColumn({ width: 17 }),
                getColumn({ width: 19 }),
            ]);

            expect(grid.fixedViewportDimWidth()).toBe(0);
        });

        test('when grid has some fixed columns', () => {
            grid.columns([
                getColumn({ width: 11, fixed: true }),
                getColumn({ width: 13, fixed: true }),
                getColumn({ width: 17 }),
                getColumn({ width: 19 }),
            ]);

            expect(grid.fixedViewportDimWidth()).toBe(24);
        });
    });

    describe('adjustFixedViewportScrollTop', function () {
        test('scrolls margin-bottom when using legacy browser', function () {
            const grid = getGrid({ legacyMode: true });
            grid.$viewport.scrollTop(100);

            grid.adjustFixedViewportScrollTop();

            expect(grid.$fixedCanvas.css('margin-bottom')).toBe('100px');
            expect(grid.$fixedViewport.scrollTop()).toBe(100);
        });

        test('scrolls margin-bottom when using legacy browser', function () {
            const grid = getGrid({ legacyMode: false });
            jest.spyOn(grid.$fixedViewport, 'find');
            jest.spyOn(grid.$fixedViewport, 'scrollTop');
            grid.$viewport.scrollTop(100);

            grid.adjustFixedViewportScrollTop();

            expect(grid.$fixedViewport.find).not.toHaveBeenCalled();
            expect(grid.$fixedViewport.scrollTop).not.toHaveBeenCalled();
        });
    });

    describe('aggregation', function () {
        test('should have default aggregation provider', async () => {
            const spy = jest.spyOn(
                DefaultAggregationProvider.prototype,
                'calculateAggregationsAsync'
            );
            const grid = getGrid();

            await grid.aggregationService.addAggregateColumnAsync('num', AggregateOperation.Total);
            expect(spy).toHaveBeenCalled();
        });

        test('should refresh grid aggregates when filteredData are updated', () => {
            const aggregateInfos = [{ field: 'num', operations: [AggregateOperation.Average] }];
            const grid = getGrid({ aggregateInfos: aggregateInfos });

            const spy = jest.spyOn(
                DefaultAggregationProvider.prototype,
                'calculateAggregationsAsync'
            );

            grid.filteredData.notifySubscribers();
            expect(spy).toHaveBeenCalled();
        });

        test('should use options.aggregationProvider aggregation service', async () => {
            const mockAggregationProvider = Mock.of<AggregationProvider>({
                calculateAggregationsAsync: jest.fn().mockResolvedValue([]),
            });

            const grid = getGrid({
                aggregationProvider: mockAggregationProvider,
            });

            await grid.aggregationService.addAggregateColumnAsync('num', AggregateOperation.Total);
            expect(mockAggregationProvider.calculateAggregationsAsync).toHaveBeenCalled();
        });

        test('initializing with aggregation config should set initial aggregations correctly', async () => {
            const aggregateInfos = [{ field: 'num', operations: [AggregateOperation.Average] }];
            const grid = getGrid({
                columnDefs: [{ field: 'num' }, { field: 'bar' }],
                aggregateInfos: aggregateInfos,
                data: ko.observableArray<Entity>([
                    { num: 12, bar: 'b' },
                    { num: 2, bar: 'y' },
                    { num: 1, bar: 'z' },
                    { num: 992, bar: 'x' },
                ]),
            });
            const gridSettings = grid.settings();
            expect(gridSettings.aggregateInfos).toEqual(aggregateInfos);

            await nextEventLoop();

            expect(grid.aggregateResults()).toEqual([
                { field: 'num', operation: AggregateOperation.Average, result: 251.75 },
            ]);
        });
    });

    describe('overriding column definitions', function () {
        test('updates columns', () => {
            const grid = getGrid({
                columnDefs: [{ field: 'field1' }, { field: 'field2' }],
                gridDim: new Dimension(100, 0),
            });

            grid.overrideSettings(
                { columnDefs: [{ field: 'field3', width: 25 }, { field: 'field4' }] },
                false
            );

            assertColumnInfos(grid.settings().columnDefs, [
                { field: 'field3', width: 25 },
                { field: 'field4', width: '*' },
            ]);
        });

        test('reconfigures column widths', () => {
            const grid = getGrid({
                columnDefs: [{ field: 'field1' }, { field: 'field2' }],
            });
            jest.spyOn(grid, 'configureColumnWidths');
            grid.overrideSettings(
                { columnDefs: [{ field: 'field3' }, { field: 'field4' }] },
                false
            );
            expect(grid.configureColumnWidths).toHaveBeenCalledTimes(1);
        });

        test('retains previous groups that are still valid', () => {
            const grid = getGrid({
                columnDefs: [
                    { field: 'field1' },
                    { field: 'field2' },
                    { field: 'field3' },
                    { field: 'field4' },
                ],
                enableGrouping: true,
                groupInfos: [{ field: 'field1' }, { field: 'field3' }, { field: 'field4' }],
            });

            grid.overrideSettings(
                {
                    columnDefs: [{ field: 'field2' }, { field: 'field3' }, { field: 'field4' }],
                },
                false
            );

            assertGroupInfos(grid.settings().groupInfos, [
                { field: 'field3' },
                { field: 'field4' },
            ]);
        });

        test('when retaining previous groups then notifies group infos changed', function () {
            const grid = getGrid({
                columnDefs: [{ field: 'field1' }, { field: 'field2' }],
                enableGrouping: true,
                groupInfos: [{ field: 'field1' }, { field: 'field2' }],
            });

            const spy = jest.fn();
            grid.on(GridEventType.GroupInfosChanged, spy);
            grid.overrideSettings(
                { columnDefs: [{ field: 'field1' }, { field: 'field2' }, { field: 'field3' }] },
                false
            );
            expect(spy).toHaveBeenCalledTimes(1);
        });

        test('when there are no groups then does not notify group infos changed', function () {
            const grid = getGrid({
                columnDefs: [{ field: 'field1' }, { field: 'field2' }],
            });

            const spy = jest.fn();
            grid.on(GridEventType.GroupInfosChanged, spy);
            grid.overrideSettings(
                { columnDefs: [{ field: 'field1' }, { field: 'field2' }, { field: 'field3' }] },
                false
            );
            expect(spy).not.toHaveBeenCalled();
        });

        test('triggers column widths changed event', () => {
            const grid = getGrid({
                columnDefs: [{ field: 'field1' }, { field: 'field2' }],
            });

            expectEvent(grid, GridEventType.ColumnWidthsChanged, grid.columns(), () =>
                grid.overrideSettings(
                    { columnDefs: [{ field: 'field2' }, { field: 'field3' }, { field: 'field4' }] },
                    false
                )
            );
        });

        test('when overriding with shouldTriggerEvent = false then does not trigger settings changed by user event', () => {
            const grid = getGrid({
                columnDefs: [{ field: 'field1' }, { field: 'field2' }],
                gridDim: new Dimension(100, 0),
            });

            expectNoEvent(grid, GridEventType.SettingsChangedByUser, () =>
                grid.overrideSettings({ columnDefs: [{ field: 'field1' }] }, false)
            );
        });

        test('when overriding with shouldTriggerEvent = true then triggers settings changed by user event', () => {
            const grid = getGrid({
                columnDefs: [{ field: 'field1' }, { field: 'field2' }],
                gridDim: new Dimension(100, 0),
            });

            expectEvent(
                grid,
                GridEventType.SettingsChangedByUser,
                { columnDefs: [{ field: 'field1', width: '*' }] },
                () => grid.overrideSettings({ columnDefs: [{ field: 'field1' }] }, true)
            );
        });
    });

    describe('overriding column definitions and group infos together', function () {
        test('updates groups', () => {
            const grid = getGrid({
                columnDefs: [
                    { field: 'field1' },
                    { field: 'field2' },
                    { field: 'field3' },
                    { field: 'field4' },
                ],
                enableGrouping: true,
                groupInfos: [{ field: 'field1' }, { field: 'field3' }, { field: 'field4' }],
            });

            grid.overrideSettings(
                {
                    columnDefs: [{ field: 'field2' }, { field: 'field3' }, { field: 'field4' }],
                    groupInfos: [{ field: 'field3' }, { field: 'field1' }, { field: 'field2' }],
                },
                false
            );

            assertGroupInfos(grid.settings().groupInfos, [
                { field: 'field3' },
                { field: 'field2' },
            ]);
        });

        test('when overriding with shouldTriggerEvent = false then does not trigger settings changed by user event', () => {
            const grid = getGrid({
                columnDefs: [
                    { field: 'field1' },
                    { field: 'field2' },
                    { field: 'field3' },
                    { field: 'field4' },
                ],
                enableGrouping: true,
                groupInfos: [{ field: 'field1' }, { field: 'field3' }, { field: 'field4' }],
            });

            expectNoEvent(grid, GridEventType.SettingsChangedByUser, () =>
                grid.overrideSettings(
                    {
                        columnDefs: [{ field: 'field2' }, { field: 'field3' }, { field: 'field4' }],
                        groupInfos: [{ field: 'field3' }, { field: 'field1' }, { field: 'field2' }],
                    },
                    false
                )
            );
        });

        test('when overriding with shouldTriggerEvent = true then triggers settings changed by user event', () => {
            const grid = getGrid({
                columnDefs: [
                    { field: 'field1' },
                    { field: 'field2' },
                    { field: 'field3' },
                    { field: 'field4' },
                ],
                enableGrouping: true,
                groupInfos: [{ field: 'field1' }, { field: 'field3' }, { field: 'field4' }],
            });

            const gridSettings = {
                columnDefs: [
                    { field: 'field2', width: 10 },
                    { field: 'field3', width: 20 },
                    { field: 'field4', width: 30 },
                ],
                groupInfos: [{ field: 'field3' }, { field: 'field1' }, { field: 'field2' }],
            };

            expectEvent(grid, GridEventType.SettingsChangedByUser, gridSettings, () =>
                grid.overrideSettings(gridSettings, true)
            );
        });
    });

    describe('overriding group infos without specifying column definitions', function () {
        describe('when increasing number of groups', function () {
            let grid: Grid;

            beforeEach(function () {
                grid = getGrid({
                    columnDefs: [
                        { field: 'field1', fixed: true },
                        { field: 'field2' },
                        { field: 'field3' },
                        { field: 'field4' },
                    ],
                    enableGrouping: true,
                    groupInfos: [{ field: 'field1' }],
                });
            });

            test('updates groups', () => {
                overrideSettings();
                assertGroupInfos(grid.settings().groupInfos, [
                    { field: 'field2' },
                    { field: 'field3' },
                    { field: 'field1' },
                ]);
                expect(grid.configGroups().map((x) => x.groupIndex())).toEqual([0, 1, 2]);
                expect(grid.columns().map((x) => x.field)).toEqual([
                    'field1',
                    '',
                    '',
                    '',
                    'field2',
                    'field3',
                    'field4',
                ]);
                expect(grid.columns().map((x) => x.groupIndex())).toEqual([
                    2,
                    -1,
                    -1,
                    -1,
                    0,
                    1,
                    -1,
                ]);
                expect(grid.columns().map((x) => x.index)).toEqual([0, 1, 2, 3, 4, 5, 6]);
            });

            test('notifies columns changed once', function () {
                let count = 0;
                grid.columns.subscribe(() => count++);
                overrideSettings();
                expect(count).toBe(1);
            });

            test('notifies config groups changed once', function () {
                let count = 0;
                grid.configGroups.subscribe(() => count++);
                overrideSettings();
                expect(count).toBe(1);
            });

            test('does not notify column widths changed', function () {
                expectNoEvent(grid, GridEventType.ColumnWidthsChanged, overrideSettings);
            });

            test('notifies group infos changed', function () {
                const spy = jest.fn();
                grid.on(GridEventType.GroupInfosChanged, spy);
                overrideSettings();
                expect(spy).toHaveBeenCalledTimes(1);
            });

            test('when overriding with shouldTriggerEvent = false then does not trigger settings changed by user event', () => {
                expectNoEvent(grid, GridEventType.SettingsChangedByUser, overrideSettings);
            });

            test('when overriding with shouldTriggerEvent = true then triggers settings changed by user event', () => {
                expectEvent(
                    grid,
                    GridEventType.SettingsChangedByUser,
                    {
                        groupInfos: [{ field: 'field2' }, { field: 'field3' }, { field: 'field1' }],
                    },
                    () => overrideSettings(true)
                );
            });

            function overrideSettings(shouldTriggerEvent?: boolean) {
                grid.overrideSettings(
                    { groupInfos: [{ field: 'field2' }, { field: 'field3' }, { field: 'field1' }] },
                    shouldTriggerEvent || false
                );
            }
        });

        describe('when reducing number of groups', function () {
            let grid: Grid;

            beforeEach(function () {
                grid = getGrid({
                    columnDefs: [
                        { field: 'field1', fixed: true },
                        { field: 'field2' },
                        { field: 'field3' },
                        { field: 'field4' },
                    ],
                    enableGrouping: true,
                    groupInfos: [{ field: 'field2' }, { field: 'field3' }, { field: 'field1' }],
                });
            });

            test('updates groups', () => {
                overrideSettings();
                assertGroupInfos(grid.settings().groupInfos, [{ field: 'field1' }]);
                expect(grid.configGroups().map((x) => x.groupIndex())).toEqual([0]);
                expect(grid.columns().map((x) => x.field)).toEqual([
                    'field1',
                    '',
                    'field2',
                    'field3',
                    'field4',
                ]);
                expect(grid.columns().map((x) => x.groupIndex())).toEqual([0, -1, -1, -1, -1]);
                expect(grid.columns().map((x) => x.index)).toEqual([0, 1, 2, 3, 4]);
            });

            test('rebuilds styles', function () {
                const spy = jest.spyOn(domUtilityService, 'buildStyles');
                overrideSettings();
                expect(spy).toHaveBeenCalledTimes(1);
                expect(spy).toHaveBeenCalledWith(grid);
            });

            test('notifies columns changed once', function () {
                let count = 0;
                grid.columns.subscribe(() => count++);
                overrideSettings();
                expect(count).toBe(1);
            });

            test('notifies config groups changed once', function () {
                let count = 0;
                grid.configGroups.subscribe(() => count++);
                overrideSettings();
                expect(count).toBe(1);
            });

            test('does not notify column widths changed', function () {
                expectNoEvent(grid, GridEventType.ColumnWidthsChanged, overrideSettings);
            });

            test('when overriding with shouldTriggerEvent = false then does not trigger settings changed by user event', () => {
                expectNoEvent(grid, GridEventType.SettingsChangedByUser, overrideSettings);
            });

            test('when overriding with shouldTriggerEvent = true then triggers settings changed by user event', () => {
                expectEvent(
                    grid,
                    GridEventType.SettingsChangedByUser,
                    { groupInfos: [{ field: 'field1' }] },
                    () => overrideSettings(true)
                );
            });

            function overrideSettings(shouldTriggerEvent?: boolean) {
                grid.overrideSettings(
                    { groupInfos: [{ field: 'field1' }] },
                    shouldTriggerEvent || false
                );
            }
        });

        describe('when keeping same number of groups', function () {
            let grid: Grid;

            beforeEach(function () {
                grid = getGrid({
                    columnDefs: [
                        { field: 'field1', fixed: true },
                        { field: 'field2' },
                        { field: 'field3' },
                        { field: 'field4' },
                    ],
                    enableGrouping: true,
                    groupInfos: [{ field: 'field2' }, { field: 'field3' }, { field: 'field1' }],
                });
            });

            test('updates groups', () => {
                overrideSettings();
                assertGroupInfos(grid.settings().groupInfos, [
                    { field: 'field2' },
                    { field: 'field3' },
                    { field: 'field4' },
                ]);
                expect(grid.configGroups().map((x) => x.groupIndex())).toEqual([0, 1, 2]);
                expect(grid.columns().map((x) => x.field)).toEqual([
                    'field1',
                    '',
                    '',
                    '',
                    'field2',
                    'field3',
                    'field4',
                ]);
                expect(grid.columns().map((x) => x.groupIndex())).toEqual([
                    -1,
                    -1,
                    -1,
                    -1,
                    0,
                    1,
                    2,
                ]);
                expect(grid.columns().map((x) => x.index)).toEqual([0, 1, 2, 3, 4, 5, 6]);
            });

            test('does not notify columns changed', function () {
                let count = 0;
                grid.columns.subscribe(() => count++);
                overrideSettings();
                expect(count).toBe(0);
            });

            test('notifies config groups changed once', function () {
                let count = 0;
                grid.configGroups.subscribe(() => count++);
                overrideSettings();
                expect(count).toBe(1);
            });

            test('does not notify column widths changed', function () {
                expectNoEvent(grid, GridEventType.ColumnWidthsChanged, overrideSettings);
            });

            test('when overriding with shouldTriggerEvent = false then does not trigger settings changed by user event', () => {
                expectNoEvent(grid, GridEventType.SettingsChangedByUser, overrideSettings);
            });

            test('when overriding with shouldTriggerEvent = true then triggers settings changed by user event', () => {
                expectEvent(
                    grid,
                    GridEventType.SettingsChangedByUser,
                    { groupInfos: [{ field: 'field2' }, { field: 'field3' }, { field: 'field4' }] },
                    () => overrideSettings(true)
                );
            });

            function overrideSettings(shouldTriggerEvent?: boolean) {
                grid.overrideSettings(
                    { groupInfos: [{ field: 'field2' }, { field: 'field3' }, { field: 'field4' }] },
                    shouldTriggerEvent || false
                );
            }
        });

        describe('when groups do not change', function () {
            let grid: Grid;

            beforeEach(function () {
                grid = getGrid({
                    columnDefs: [
                        { field: 'field1', fixed: true },
                        { field: 'field2' },
                        { field: 'field3' },
                        { field: 'field4' },
                    ],
                    enableGrouping: true,
                    groupInfos: [{ field: 'field2' }, { field: 'field3' }, { field: 'field1' }],
                });
            });

            test('groups remain the same', () => {
                overrideSettings();
                assertGroupInfos(grid.settings().groupInfos, [
                    { field: 'field2' },
                    { field: 'field3' },
                    { field: 'field1' },
                ]);
                expect(grid.configGroups().map((x) => x.groupIndex())).toEqual([0, 1, 2]);
                expect(grid.columns().map((x) => x.field)).toEqual([
                    'field1',
                    '',
                    '',
                    '',
                    'field2',
                    'field3',
                    'field4',
                ]);
                expect(grid.columns().map((x) => x.groupIndex())).toEqual([
                    2,
                    -1,
                    -1,
                    -1,
                    0,
                    1,
                    -1,
                ]);
                expect(grid.columns().map((x) => x.index)).toEqual([0, 1, 2, 3, 4, 5, 6]);
            });

            test('does not notify columns changed', function () {
                let count = 0;
                grid.columns.subscribe(() => count++);
                overrideSettings();
                expect(count).toBe(0);
            });

            test('does not notify config groups changed', function () {
                let count = 0;
                grid.configGroups.subscribe(() => count++);
                overrideSettings();
                expect(count).toBe(0);
            });

            test('when overriding with shouldTriggerEvent = false then does not trigger settings changed by user event', () => {
                expectNoEvent(grid, GridEventType.SettingsChangedByUser, overrideSettings);
            });

            test('when overriding with shouldTriggerEvent = true then triggers settings changed by user event', () => {
                expectEvent(
                    grid,
                    GridEventType.SettingsChangedByUser,
                    {
                        groupInfos: [
                            { field: 'field2' },
                            { field: 'field3' },
                            { field: 'field5' },
                            { field: 'field1' },
                        ],
                    },
                    () => overrideSettings(true)
                );
            });

            function overrideSettings(shouldTriggerEvent?: boolean) {
                grid.overrideSettings(
                    {
                        groupInfos: [
                            { field: 'field2' },
                            { field: 'field3' },
                            { field: 'field5' },
                            { field: 'field1' },
                        ],
                    },
                    shouldTriggerEvent || false
                );
            }
        });

        describe('when groups are empty and do not change', function () {
            let grid: Grid;

            beforeEach(function () {
                grid = getGrid({
                    columnDefs: [
                        { field: 'field1', fixed: true },
                        { field: 'field2' },
                        { field: 'field3' },
                        { field: 'field4' },
                    ],
                    enableGrouping: true,
                });
            });

            test('groups remain the same', () => {
                overrideSettings();
                assertGroupInfos(grid.settings().groupInfos, []);
                expect(grid.configGroups().length).toBe(0);
                expect(grid.columns().map((x) => x.field)).toEqual([
                    'field1',
                    'field2',
                    'field3',
                    'field4',
                ]);
                expect(grid.columns().map((x) => x.groupIndex())).toEqual([-1, -1, -1, -1]);
                expect(grid.columns().map((x) => x.index)).toEqual([0, 1, 2, 3]);
            });

            test('does not notify columns changed', function () {
                let count = 0;
                grid.columns.subscribe(() => count++);
                overrideSettings();
                expect(count).toBe(0);
            });

            test('does not notify config groups changed', function () {
                let count = 0;
                grid.configGroups.subscribe(() => count++);
                overrideSettings();
                expect(count).toBe(0);
            });

            test('when overriding with shouldTriggerEvent = false then does not trigger settings changed by user event', () => {
                expectNoEvent(grid, GridEventType.SettingsChangedByUser, overrideSettings);
            });

            test('when overriding with shouldTriggerEvent = true then triggers settings changed by user event', () => {
                expectEvent(grid, GridEventType.SettingsChangedByUser, { groupInfos: [] }, () =>
                    overrideSettings(true)
                );
            });

            function overrideSettings(shouldTriggerEvent?: boolean) {
                grid.overrideSettings({ groupInfos: [] }, shouldTriggerEvent || false);
            }
        });

        describe('when removing all groups', function () {
            let grid: Grid;

            beforeEach(function () {
                grid = getGrid({
                    columnDefs: [
                        { field: 'field1', fixed: true },
                        { field: 'field2' },
                        { field: 'field3' },
                        { field: 'field4' },
                    ],
                    enableGrouping: true,
                    groupInfos: [{ field: 'field2' }, { field: 'field3' }, { field: 'field1' }],
                });
            });

            test('updates groups', () => {
                overrideSettings();
                assertGroupInfos(grid.settings().groupInfos, []);
                expect(grid.configGroups().length).toBe(0);
                expect(grid.columns().map((x) => x.field)).toEqual([
                    'field1',
                    'field2',
                    'field3',
                    'field4',
                ]);
                expect(grid.columns().map((x) => x.groupIndex())).toEqual([-1, -1, -1, -1]);
                expect(grid.columns().map((x) => x.index)).toEqual([0, 1, 2, 3]);
            });

            test('rebuilds styles', function () {
                const spy = jest.spyOn(domUtilityService, 'buildStyles');
                overrideSettings();
                expect(spy).toHaveBeenCalledTimes(1);
                expect(spy).toHaveBeenCalledWith(grid);
            });

            test('notifies columns changed once', function () {
                let count = 0;
                grid.columns.subscribe(() => count++);
                overrideSettings();
                expect(count).toBe(1);
            });

            test('notifies config groups changed once', function () {
                let count = 0;
                grid.configGroups.subscribe(() => count++);
                overrideSettings();
                expect(count).toBe(1);
            });

            test('does not notify column widths changed', function () {
                expectNoEvent(grid, GridEventType.ColumnWidthsChanged, overrideSettings);
            });

            test('when overriding with shouldTriggerEvent = false then does not trigger settings changed by user event', () => {
                expectNoEvent(grid, GridEventType.SettingsChangedByUser, overrideSettings);
            });

            test('when overriding with shouldTriggerEvent = true then triggers settings changed by user event', () => {
                expectEvent(grid, GridEventType.SettingsChangedByUser, { groupInfos: [] }, () =>
                    overrideSettings(true)
                );
            });

            function overrideSettings(shouldTriggerEvent?: boolean) {
                grid.overrideSettings({ groupInfos: [] }, shouldTriggerEvent || false);
            }
        });

        describe('when overriding with no valid groups then removes all groups', function () {
            let grid: Grid;

            beforeEach(function () {
                grid = getGrid({
                    columnDefs: [
                        { field: 'field1' },
                        { field: 'field2' },
                        { field: 'field3' },
                        { field: 'field4' },
                    ],
                    enableGrouping: true,
                    groupInfos: [{ field: 'field2' }, { field: 'field3' }, { field: 'field1' }],
                });
            });

            test('updates groups', () => {
                overrideSettings();
                assertGroupInfos(grid.settings().groupInfos, []);
                expect(grid.configGroups().length).toBe(0);
                expect(grid.columns().map((x) => x.groupIndex())).toEqual([-1, -1, -1, -1]);
                expect(grid.columns().map((x) => x.index)).toEqual([0, 1, 2, 3]);
            });

            test('notifies columns changed once', function () {
                let count = 0;
                grid.columns.subscribe(() => count++);
                overrideSettings();
                expect(count).toBe(1);
            });

            test('notifies config groups changed once', function () {
                let count = 0;
                grid.configGroups.subscribe(() => count++);
                overrideSettings();
                expect(count).toBe(1);
            });

            test('does not notify column widths changed', function () {
                expectNoEvent(grid, GridEventType.ColumnWidthsChanged, overrideSettings);
            });

            test('when overriding with shouldTriggerEvent = false then does not trigger settings changed by user event', () => {
                expectNoEvent(grid, GridEventType.SettingsChangedByUser, overrideSettings);
            });

            test('when overriding with shouldTriggerEvent = true then triggers settings changed by user event', () => {
                expectEvent(
                    grid,
                    GridEventType.SettingsChangedByUser,
                    { groupInfos: [{ field: 'field5' }] },
                    () => overrideSettings(true)
                );
            });

            function overrideSettings(shouldTriggerEvent?: boolean) {
                grid.overrideSettings(
                    { groupInfos: [{ field: 'field5' }] },
                    shouldTriggerEvent || false
                );
            }
        });

        describe('given grouping not allowed then removes all groups', function () {
            let grid: Grid;

            beforeEach(function () {
                let canGroup = true;
                grid = getGrid({
                    columnDefs: [
                        { field: 'field1' },
                        { field: 'field2' },
                        { field: 'field3' },
                        { field: 'field4' },
                    ],
                    enableGrouping: true,
                    ensureCanGroupData: () => canGroup,
                    groupInfos: [{ field: 'field2' }, { field: 'field3' }, { field: 'field1' }],
                });

                canGroup = false;
            });

            test('updates groups', () => {
                overrideSettings();
                assertGroupInfos(grid.settings().groupInfos, []);
                expect(grid.configGroups().length).toBe(0);
                expect(grid.columns().map((x) => x.groupIndex())).toEqual([-1, -1, -1, -1]);
                expect(grid.columns().map((x) => x.index)).toEqual([0, 1, 2, 3]);
            });

            test('notifies columns changed once', function () {
                let count = 0;
                grid.columns.subscribe(() => count++);
                overrideSettings();
                expect(count).toBe(1);
            });

            test('notifies config groups changed once', function () {
                let count = 0;
                grid.configGroups.subscribe(() => count++);
                overrideSettings();
                expect(count).toBe(1);
            });

            test('does not notify column widths changed', function () {
                expectNoEvent(grid, GridEventType.ColumnWidthsChanged, overrideSettings);
            });

            test('when overriding with shouldTriggerEvent = false then does not trigger settings changed by user event', () => {
                expectNoEvent(grid, GridEventType.SettingsChangedByUser, overrideSettings);
            });

            test('when overriding with shouldTriggerEvent = true then triggers settings changed by user event', () => {
                expectEvent(
                    grid,
                    GridEventType.SettingsChangedByUser,
                    { groupInfos: [{ field: 'field1' }] },
                    () => overrideSettings(true)
                );
            });

            function overrideSettings(shouldTriggerEvent?: boolean) {
                grid.overrideSettings(
                    { groupInfos: [{ field: 'field1' }] },
                    shouldTriggerEvent || false
                );
            }
        });
    });

    describe('overriding sort infos', () => {
        test('sort single column', () => {
            const initGridSettings = {
                columnDefs: [{ field: 'field1' }, { field: 'field2' }],
                sortInfos: [{ column: { field: 'field1' }, direction: SortDirection.Ascending }],
            };
            const grid = getGrid(initGridSettings);
            const gridSettings = {
                sortInfos: [{ column: { field: 'field2' }, direction: SortDirection.Ascending }],
            };
            grid.overrideSettings(gridSettings, false);

            assertSortInfos(grid.settings().sortInfos, gridSettings.sortInfos);
        });

        test('sort multi column', () => {
            const initGridSettings = {
                columnDefs: [{ field: 'field1' }, { field: 'field2' }, { field: 'field3' }],
                sortInfos: [{ column: { field: 'field1' }, direction: SortDirection.Ascending }],
            };
            const grid = getGrid(initGridSettings);
            const gridSettings = {
                sortInfos: [
                    { column: { field: 'field2' }, direction: SortDirection.Ascending },
                    { column: { field: 'field3' }, direction: SortDirection.Ascending },
                ],
            };
            grid.overrideSettings(gridSettings, false);

            assertSortInfos(grid.settings().sortInfos, gridSettings.sortInfos);
        });

        test('sort multi column should update sorting arrow of columns', () => {
            const initGridSettings = {
                columnDefs: [{ field: 'field1' }, { field: 'field2' }, { field: 'field3' }],
                sortInfos: [{ column: { field: 'field1' }, direction: SortDirection.Ascending }],
            };
            const grid = getGrid(initGridSettings);
            const beforeOverrideColumns = grid.columns();

            expect(beforeOverrideColumns[0].showSortButtonDown()).toBe(false);
            expect(beforeOverrideColumns[0].showSortButtonUp()).toBe(true);
            expect(beforeOverrideColumns[1].showSortButtonDown()).toBe(false);
            expect(beforeOverrideColumns[1].showSortButtonUp()).toBe(false);
            expect(beforeOverrideColumns[2].showSortButtonDown()).toBe(false);
            expect(beforeOverrideColumns[2].showSortButtonUp()).toBe(false);

            const gridSettings = {
                columnDefs: [{ field: 'field1' }, { field: 'field2' }, { field: 'field3' }],
                sortInfos: [
                    { column: { field: 'field1' }, direction: SortDirection.Descending },
                    { column: { field: 'field2' }, direction: SortDirection.Ascending },
                    { column: { field: 'field3' }, direction: SortDirection.Descending },
                ],
            };
            grid.overrideSettings(gridSettings, false);
            const afterOverrideColumns = grid.columns();

            expect(afterOverrideColumns[0].showSortButtonDown()).toBe(true);
            expect(afterOverrideColumns[0].showSortButtonUp()).toBe(false);
            expect(afterOverrideColumns[1].showSortButtonDown()).toBe(false);
            expect(afterOverrideColumns[1].showSortButtonUp()).toBe(true);
            expect(afterOverrideColumns[2].showSortButtonDown()).toBe(true);
            expect(afterOverrideColumns[2].showSortButtonUp()).toBe(false);
        });

        test('given sort info is undefined should keep sorting arrow of columns', () => {
            const initGridSettings = {
                columnDefs: [{ field: 'field1' }, { field: 'field2' }, { field: 'field3' }],
                sortInfos: [{ column: { field: 'field1' }, direction: SortDirection.Ascending }],
            };
            const grid = getGrid(initGridSettings);
            const beforeOverrideColumns = grid.columns();

            expect(beforeOverrideColumns[0].showSortButtonDown()).toBe(false);
            expect(beforeOverrideColumns[0].showSortButtonUp()).toBe(true);
            expect(beforeOverrideColumns[1].showSortButtonDown()).toBe(false);
            expect(beforeOverrideColumns[1].showSortButtonUp()).toBe(false);
            expect(beforeOverrideColumns[2].showSortButtonDown()).toBe(false);
            expect(beforeOverrideColumns[2].showSortButtonUp()).toBe(false);

            const gridSettings = {
                columnDefs: [{ field: 'field1' }, { field: 'field2' }, { field: 'field3' }],
            };
            grid.overrideSettings(gridSettings, false);
            const afterOverrideColumns = grid.columns();

            expect(afterOverrideColumns[0].showSortButtonDown()).toBe(false);
            expect(afterOverrideColumns[0].showSortButtonUp()).toBe(true);
            expect(afterOverrideColumns[1].showSortButtonDown()).toBe(false);
            expect(afterOverrideColumns[1].showSortButtonUp()).toBe(false);
            expect(afterOverrideColumns[2].showSortButtonDown()).toBe(false);
            expect(afterOverrideColumns[2].showSortButtonUp()).toBe(false);
        });

        test('given override settings contains different columns should update and keep sorting arrow of columns', () => {
            const initGridSettings = {
                columnDefs: [{ field: 'field1' }],
                sortInfos: [{ column: { field: 'field1' }, direction: SortDirection.Ascending }],
            };
            const grid = getGrid(initGridSettings);
            const beforeOverrideColumns = grid.columns();

            expect(beforeOverrideColumns[0].field).toBe('field1');
            expect(beforeOverrideColumns[0].showSortButtonDown()).toBe(false);
            expect(beforeOverrideColumns[0].showSortButtonUp()).toBe(true);

            const gridSettings = {
                columnDefs: [{ field: 'field2' }, { field: 'field3' }],
                sortInfos: [
                    { column: { field: 'field2' }, direction: SortDirection.Ascending },
                    { column: { field: 'field3' }, direction: SortDirection.Descending },
                ],
            };
            grid.overrideSettings(gridSettings, false);
            const afterOverrideColumns = grid.columns();

            expect(afterOverrideColumns[0].field).toBe('field2');
            expect(afterOverrideColumns[1].field).toBe('field3');
            expect(afterOverrideColumns[0].showSortButtonDown()).toBe(false);
            expect(afterOverrideColumns[0].showSortButtonUp()).toBe(true);
            expect(afterOverrideColumns[1].showSortButtonDown()).toBe(true);
            expect(afterOverrideColumns[1].showSortButtonUp()).toBe(false);
        });

        test('given override settings contains different columns and sort info is undefined, should update and keep sorting arrow of columns', () => {
            const initGridSettings = {
                columnDefs: [{ field: 'field1' }],
                sortInfos: [{ column: { field: 'field1' }, direction: SortDirection.Ascending }],
            };
            const grid = getGrid(initGridSettings);
            const beforeOverrideColumns = grid.columns();

            expect(beforeOverrideColumns[0].field).toBe('field1');
            expect(beforeOverrideColumns[0].showSortButtonDown()).toBe(false);
            expect(beforeOverrideColumns[0].showSortButtonUp()).toBe(true);

            const gridSettings = {
                columnDefs: [{ field: 'field2' }, { field: 'field3' }],
            };

            grid.overrideSettings(gridSettings, false);
            const afterOverrideColumns = grid.columns();

            expect(afterOverrideColumns[0].field).toBe('field2');
            expect(afterOverrideColumns[1].field).toBe('field3');
            expect(afterOverrideColumns[0].showSortButtonDown()).toBe(false);
            expect(afterOverrideColumns[0].showSortButtonUp()).toBe(false);
            expect(afterOverrideColumns[1].showSortButtonDown()).toBe(false);
            expect(afterOverrideColumns[1].showSortButtonUp()).toBe(false);
        });

        test('triggers SortInfosChanged event', function () {
            const grid = getGrid({
                columnDefs: [{ field: 'field1' }, { field: 'field2' }],
            });
            const gridSettings = {
                sortInfos: [{ column: { field: 'field1' }, direction: SortDirection.Ascending }],
            };
            const spy = jest.fn();
            grid.on(GridEventType.SortInfosChanged, spy);
            grid.overrideSettings(gridSettings, false);
            expect(spy).toHaveBeenCalledTimes(1);
            expect(spy).toHaveBeenCalledWith({
                type: GridEventType.SortInfosChanged,
                data: gridSettings.sortInfos,
            });
        });

        test('when overriding with shouldTriggerEvent = false then does not trigger SettingsChangedByUser event', () => {
            const grid = getGrid({
                columnDefs: [{ field: 'field1' }, { field: 'field2' }],
            });
            expectNoEvent(grid, GridEventType.SettingsChangedByUser, () =>
                grid.overrideSettings(
                    {
                        sortInfos: [
                            { column: { field: 'field1' }, direction: SortDirection.Ascending },
                        ],
                    },
                    false
                )
            );
        });

        test('when overriding with shouldTriggerEvent = true then triggers SettingsChangedByUser event', () => {
            const grid = getGrid({
                columnDefs: [{ field: 'field1' }, { field: 'field2' }],
            });
            const gridSettings = {
                sortInfos: [{ column: { field: 'field1' }, direction: SortDirection.Ascending }],
            };
            expectEvent(grid, GridEventType.SettingsChangedByUser, gridSettings, () =>
                grid.overrideSettings(gridSettings, true)
            );
        });
    });

    test('can override all settings together', function () {
        const grid = getGrid({
            columnDefs: [{ field: 'field1' }, { field: 'field2' }],
            enableGrouping: true,
            sortInfos: [{ column: { field: 'field1' }, direction: SortDirection.Ascending }],
            aggregateInfos: [{ field: 'field1', operations: [AggregateOperation.Average] }],
        });
        const gridSettings = {
            columnDefs: [
                { field: 'field2', width: 1 },
                { field: 'field3', width: 2 },
            ],
            groupInfos: [{ field: 'field2' }],
            sortInfos: [{ column: { field: 'field2' }, direction: SortDirection.Ascending }],
            aggregateInfos: [{ field: 'field2', operations: [AggregateOperation.Total] }],
        };
        grid.overrideSettings(gridSettings, false);
        assertSettings(grid.settings(), gridSettings);
    });

    describe('grid on/off', () => {
        test('on and off valid event', () => {
            const initGridSettings = { columnDefs: [{ field: 'field1' }, { field: 'field2' }] };
            const grid = getGrid(initGridSettings);
            const gridSettings = { columnDefs: [{ field: 'field3' }, { field: 'field4' }] };
            let handlerCalled = 0;
            const handler = () => {
                handlerCalled++;
            };
            grid.on(GridEventType.SettingsChangedByUser, handler);
            grid.overrideSettings(gridSettings, true);

            expect(handlerCalled).toBe(1);

            grid.off(GridEventType.SettingsChangedByUser, handler);
            const gridSettings1 = { columnDefs: [{ field: 'field5' }, { field: 'field6' }] };
            grid.overrideSettings(gridSettings1, true);

            expect(handlerCalled).toBe(1);
        });

        test('when on a type that is invalid', () => {
            const grid = getGrid();
            expect(() => grid.on('' as GridEventType, () => {})).not.toThrow();
        });

        test('when off a type that is invalid', () => {
            const grid = getGrid();
            expect(() => grid.off('' as GridEventType, () => {})).not.toThrow();
        });
    });

    describe('isHoveredEntity', function () {
        test('should not match different entity', function () {
            const grid = getGrid({ legacyMode: true });
            grid.hoveredEntity({});
            expect(grid.isHoveredEntity({})).toBe(false);
        });

        test('should match same entity', function () {
            const entity = {};
            const grid = getGrid({ legacyMode: true });
            grid.hoveredEntity(entity);
            expect(grid.isHoveredEntity(entity)).toBe(true);
        });

        test('given non-legacy mode then should never match', function () {
            const entity = {};
            const grid = getGrid({ legacyMode: false });
            grid.hoveredEntity(entity);
            expect(grid.isHoveredEntity(entity)).toBe(false);
        });
    });

    describe('group panel', function () {
        const groupedText = 'Grouping By:';
        const ungroupedText = 'Drag column here to group rows';
        let grid: Grid;

        beforeEach(function () {
            grid = getGrid({
                columnDefs: [{ field: 'foo' }, { field: 'bar' }],
                enableGrouping: true,
            });
        });

        test('is not dragging over groups initially', function () {
            expect(grid.isDraggingOverGroups()).toBe(false);
        });

        test('panel has ungrouped text initially', function () {
            expect(grid.groupPanelText()).toBe(ungroupedText);
        });

        test('when dragging over groups then panel has grouped text', function () {
            grid.isDraggingOverGroups(true);
            expect(grid.groupPanelText()).toBe(groupedText);
        });

        test('when group is added then panel has grouped text', function () {
            grid.groupBy(grid.columns()[0]);
            expect(grid.groupPanelText()).toBe(groupedText);
        });
    });

    function getGrid(options?: Partial<GridOptions>) {
        const defaults: Partial<GridOptions> = {
            data: ko.observableArray(),
            gridContainers: {
                $canvas: $('<div>'),
                $fixedCanvas: $('<div>'),
                $fixedHeaderContainer: $('<div>'),
                $fixedHeaderScroller: $('<div>'),
                $fixedViewport: $('<div><div class="kgFixedCanvas"></div></div>'),
                $groupPanel: $('<div>'),
                $headerContainer: $('<div>'),
                $headerScroller: $('<div>'),
                $root: $('<div>'),
                $topPanel: $('<div>'),
                $viewport: $('<div>'),
            },
            gridDim: new Dimension(0, 0),
            userViewModel: {},
        };

        const merged = Mock.of<GridOptions>(Object.assign(defaults, options));
        const grid = Grid.init(merged);
        grid.sortedData.subscribe(function () {
            grid.searchProvider.evalFilter();
        });

        return grid;
    }

    function getColumn(props?: Partial<Column>) {
        props = Object.assign(
            {
                field: '',
                displayName: ko.observable(''),
                visible: ko.pureComputed(() => true),
            },
            props
        );
        return Mock.of<Column>(props);
    }

    function assertSettings(current: GridSettings, expected: GridSettings) {
        assertAggregateInfos(current.aggregateInfos, expected.aggregateInfos);
        assertColumnInfos(current.columnDefs, expected.columnDefs);
        assertGroupInfos(current.groupInfos, expected.groupInfos);
        assertSortInfos(current.sortInfos, expected.sortInfos);
    }

    function assertAggregateInfos(
        current: AggregateInfo[] | undefined,
        expected: AggregateInfo[] | undefined
    ) {
        assertInfos(current, expected, (currentItem, expectedItem) => {
            expect(currentItem.field).toBe(expectedItem.field);
            expect(currentItem.operations).toEqual(expectedItem.operations);
        });
    }

    function assertColumnInfos(
        current: ColumnDefinition[] | undefined,
        expected: ColumnDefinition[] | undefined
    ) {
        assertInfos(current, expected, (currentItem, expectedItem) => {
            expect(currentItem.field).toBe(expectedItem.field);
            expect(currentItem.width).toBe(expectedItem.width);
        });
    }

    function assertGroupInfos(current: GroupInfo[] | undefined, expected: GroupInfo[] | undefined) {
        assertInfos(current, expected, (currentItem, expectedItem) => {
            expect(currentItem.field).toBe(expectedItem.field);
        });
    }

    function assertSortInfos(current: SortInfo[] | undefined, expected: SortInfo[] | undefined) {
        assertInfos(current, expected, (currentItem, expectedItem) => {
            expect(currentItem.column.field).toBe(expectedItem.column.field);
            expect(currentItem.direction).toBe(expectedItem.direction);
        });
    }

    function assertInfos<T>(
        current: T[] | undefined,
        expected: T[] | undefined,
        assertion: (currentItem: T, expectedItem: T) => void
    ) {
        expect(!!current).toBe(!!expected);
        if (current && expected) {
            expect(current.length).toBe(expected.length);
            current.forEach((info, index) => {
                assertion(info, expected[index]);
            });
        }
    }

    function expectEvent<T>(
        grid: Grid,
        eventType: GridEventType,
        expectedData: T,
        action: () => void
    ) {
        const eventHandler = jest.fn();
        grid.on(eventType, eventHandler);

        action();
        expect(eventHandler).toHaveBeenCalledTimes(1);

        const event = eventHandler.mock.calls.pop()[0];
        expect(event.type).toBe(eventType);
        assertSettings(event.data, expectedData);
    }

    function expectNoEvent(grid: Grid, eventType: GridEventType, action: () => void) {
        const eventHandler = jest.fn();
        grid.on(eventType, eventHandler);
        action();
        expect(eventHandler).not.toHaveBeenCalled();
    }
});
