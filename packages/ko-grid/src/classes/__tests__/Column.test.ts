import $ from 'jquery';
import ko from 'knockout';
import { Mock } from 'ts-mockery';
import Column, { ColumnConfig, ColumnDefinition } from '../Column';
import Grid from '../Grid';
import Row from '../Row';
import { SortDirection, GridEventType } from '../../constants';
import domUtilityService from '../../domUtilityService';
import templates from '../../templates/templates';

describe('column', function () {
    test('uses field from definition', function () {
        const col = getColumn({ colDef: { field: 'meh' } });
        expect(col.field).toBe('meh');
    });

    test('uses number width from config', function () {
        const col = getColumn({ colDef: { width: 20 } });
        expect(col.width).toBe(20);
    });

    test('does not use string width from config', function () {
        const col = getColumn({ colDef: { width: '20%' } });
        expect(col.width).toBe(0);
    });

    test('group index is -1 initially', function () {
        expect(getColumn().groupIndex()).toBe(-1);
    });

    test('is not grouped by initially', function () {
        expect(getColumn().isGroupedBy()).toBe(false);
    });

    test('index is value from config initially', function () {
        const col = getColumn({ config: { index: 123 } });
        expect(col.index).toBe(123);
    });

    test('uses cell filter from definition', function () {
        const cellFilter = (prop: any) => prop;
        const col = getColumn({ colDef: { cellFilter } });
        expect(col.cellFilter).toBe(cellFilter);
    });

    test('sort direction is not specified initially', function () {
        expect(getColumn().sortDirection()).toBe(SortDirection.Unspecified);
    });

    test('uses sort function from definition', function () {
        const sortFn = () => 0;
        const col = getColumn({ colDef: { sortFn } });
        expect(col.sortingAlgorithm).toBe(sortFn);
    });

    describe('is group column', function () {
        test('is true if config says true', function () {
            const col = getColumn({ config: { isGroupCol: true } });
            expect(col.isGroupCol).toBe(true);
        });

        test('is false if config says false', function () {
            const col = getColumn({ config: { isGroupCol: false } });
            expect(col.isGroupCol).toBe(false);
        });

        test('is false if config does not say anything', function () {
            expect(getColumn().isGroupCol).toBe(false);
        });
    });

    test.each<[boolean, boolean?]>([
        [true, true],
        [false, false],
        [false, undefined],
    ])('fixed = %s if colDef.fixed = %s', function (expected, colDefFixed) {
        const column = getColumn({ colDef: { fixed: colDefFixed } });
        expect(column.fixed).toBe(expected);
    });

    describe('cell class', function () {
        test('is kgNonFixedColumn if not fixed', function () {
            expect(getColumn().cellClass).toBe('kgNonFixedColumn');
        });

        test('is kgFixedColumn if fixed', function () {
            expect(getColumn({ colDef: { fixed: true } }).cellClass).toBe('kgFixedColumn');
        });

        test('includes value from definition', function () {
            const col = getColumn({ colDef: { cellClass: 'abc' } });
            expect(col.cellClass).toBe('abc kgNonFixedColumn');
        });
    });

    describe('cell template', function () {
        test('uses value from definition', function () {
            const col = getColumn({ colDef: { cellTemplate: 'hello' } });
            expect(col.cellTemplate).toBe('hello');
        });

        test('has no cellTemplate defined', function () {
            expect(getColumn().cellTemplate).toBeUndefined();
        });
    });

    describe('header cell class', function () {
        test('is kgNonFixedColumn if not fixed', function () {
            expect(getColumn().headerClass).toBe('kgNonFixedColumn');
        });

        test('is kgFixedColumn if fixed', function () {
            expect(getColumn({ colDef: { fixed: true } }).headerClass).toBe('kgFixedColumn');
        });

        test('includes value from definition', function () {
            const col = getColumn({ colDef: { headerClass: 'abc' } });
            expect(col.headerClass).toBe('abc kgNonFixedColumn');
        });
    });

    describe('header cell template', function () {
        test('uses value from definition', function () {
            const col = getColumn({ colDef: { headerCellTemplate: 'goodbye' } });
            expect(col.headerCellTemplate).toBe('goodbye');
        });

        test('falls back to default header cell template', function () {
            expect(getColumn().headerCellTemplate).toBe(templates.defaultHeaderCellTemplate());
        });
    });

    describe('min width', function () {
        test('uses value from definition', function () {
            const col = getColumn({ colDef: { minWidth: 30 } });
            expect(col.minWidth).toBe(30);
        });

        test('given value not specified on definition then value is 50', function () {
            expect(getColumn().minWidth).toBe(50);
        });

        test('given value of 0 on definition then value is 50', function () {
            const col = getColumn({ colDef: { minWidth: 0 } });
            expect(col.minWidth).toBe(50);
        });
    });

    describe('max width', function () {
        test('uses value from definition', function () {
            const col = getColumn({ colDef: { maxWidth: 40 } });
            expect(col.maxWidth).toBe(40);
        });

        test('given value not specified on definition then value is 50', function () {
            expect(getColumn().maxWidth).toBe(9000);
        });

        test('given value of 0 on definition then value is 50', function () {
            const col = getColumn({ colDef: { maxWidth: 0 } });
            expect(col.maxWidth).toBe(9000);
        });
    });

    describe('display name', function () {
        test('uses value from definition', function () {
            const col = getColumn({ colDef: { displayName: 'foo' } });
            expect(col.displayName()).toBe('foo');
        });

        test('falls back to field', function () {
            const col = getColumn({ colDef: { field: 'bar' } });
            expect(col.displayName()).toBe('bar');
        });
    });

    describe('is grouped by', function () {
        test('is true if group index != -1', function () {
            const col = getColumn();
            col.groupIndex(0);
            expect(col.isGroupedBy()).toBe(true);
        });

        test('is false if group index = -1', function () {
            const col = getColumn();
            col.groupIndex(0);
            col.groupIndex(-1);
            expect(col.isGroupedBy()).toBe(false);
        });
    });

    describe('grouped by class', function () {
        test('is kgGroupedByIcon if grouped', function () {
            const col = getColumn();
            col.groupIndex(0);
            expect(col.groupedByClass()).toBe('kgGroupedByIcon');
        });

        test('is kgGroupIcon if not grouped', function () {
            const col = getColumn();
            col.groupIndex(-1);
            expect(col.groupedByClass()).toBe('kgGroupIcon');
        });
    });

    describe('sortable', function () {
        test('given sortable grid and sortable definition then is sortable', function () {
            const col = getColumn({ config: { enableSort: true }, colDef: { sortable: true } });
            expect(col.sortable).toBe(true);
        });

        test('given sortable grid and definition sortable not specified then is sortable', function () {
            const col = getColumn({
                config: { enableSort: true },
                colDef: { sortable: undefined },
            });
            expect(col.sortable).toBe(true);
        });

        test('given sortable grid and non-sortable definition then is not sortable', function () {
            const col = getColumn({ config: { enableSort: true }, colDef: { sortable: false } });
            expect(col.sortable).toBe(false);
        });

        test('given non-sortable grid and sortable definition then is not sortable', function () {
            const col = getColumn({ config: { enableSort: false }, colDef: { sortable: true } });
            expect(col.sortable).toBe(false);
        });
    });

    describe('show sort button up', function () {
        test('is true if is sortable and direction is ascending', function () {
            const col = getColumn({ config: { enableSort: true } });
            col.sortDirection(SortDirection.Ascending);
            expect(col.showSortButtonUp()).toBe(true);
        });

        test('is false if is not sortable', function () {
            const col = getColumn({ config: { enableSort: false } });
            col.sortDirection(SortDirection.Ascending);
            expect(col.showSortButtonUp()).toBe(false);
        });

        test('is false if direction is not ascending', function () {
            const col = getColumn({ config: { enableSort: true } });
            col.sortDirection(SortDirection.Descending);
            expect(col.showSortButtonUp()).toBe(false);
        });
    });

    describe('show sort button down', function () {
        test('is true if is sortable and direction is descending', function () {
            const col = getColumn({ config: { enableSort: true } });
            col.sortDirection(SortDirection.Descending);
            expect(col.showSortButtonDown()).toBe(true);
        });

        test('is false if is not sortable', function () {
            const col = getColumn({ config: { enableSort: false } });
            col.sortDirection(SortDirection.Descending);
            expect(col.showSortButtonDown()).toBe(false);
        });

        test('is false if direction is not descending', function () {
            const col = getColumn({ config: { enableSort: true } });
            col.sortDirection(SortDirection.Ascending);
            expect(col.showSortButtonDown()).toBe(false);
        });
    });

    describe('no sort visible', function () {
        test('is true if sort direction is not specified', function () {
            const col = getColumn();
            col.sortDirection(SortDirection.Unspecified);
            expect(col.noSortVisible()).toBe(true);
        });

        test('is false if sort direction is ascending', function () {
            const col = getColumn();
            col.sortDirection(SortDirection.Ascending);
            expect(col.noSortVisible()).toBe(false);
        });

        test('is false if sort direction is decending', function () {
            const col = getColumn();
            col.sortDirection(SortDirection.Descending);
            expect(col.noSortVisible()).toBe(false);
        });
    });

    describe('resizable', function () {
        test.each([
            [false, false, false, false, false],
            [false, false, false, true, false],
            [false, false, true, false, false],
            [false, false, true, true, false],
            [false, false, undefined, false, false],
            [false, false, undefined, true, false],
            [false, true, false, false, false],
            [false, true, false, true, false],
            [false, true, true, false, true],
            [false, true, true, true, true],
            [false, true, undefined, false, true],
            [false, true, undefined, true, true],

            [true, false, false, false, false],
            [true, false, false, true, false],
            [true, false, true, false, false],
            [true, false, true, true, false],
            [true, false, undefined, false, false],
            [true, false, undefined, true, false],
            [true, true, false, false, false],
            [true, true, false, true, false],
            [true, true, true, false, true],
            [true, true, true, true, false],
            [true, true, undefined, false, true],
            [true, true, undefined, true, false],
        ])(
            'legacyMode %s, config.enableResize %s, colDef.resizable %s, colDef.fixed %s, col.resizable = %s',
            (legacyMode, enableResize, resizable, fixed, expectedResult) => {
                const col = getColumn({
                    config: { enableResize },
                    colDef: { resizable, fixed },
                    grid: Mock.of<Grid>({ legacyMode }),
                });
                expect(col.resizable).toBe(expectedResult);
            }
        );
    });

    describe('visibility', function () {
        beforeEach(function () {
            jest.spyOn(domUtilityService, 'buildStyles').mockImplementation(() => {});
        });

        test('given true value on definition then is visible initially', function () {
            const col = getColumn({ colDef: { visible: true } });
            expect(col.visible()).toBe(true);
        });

        test('given undefined value on definition then is visible initially', function () {
            expect(getColumn().visible()).toBe(true);
        });

        test('given false value on definition then is not visible initially', function () {
            const col = getColumn({ colDef: { visible: false } });
            expect(col.visible()).toBe(false);
        });

        test('can set to false', function () {
            const col = getColumn();
            col.visible(false);
            expect(col.visible()).toBe(false);
        });

        test('builds grid styles after setting to false', function () {
            const grid = Mock.of<Grid>();
            const col = getColumn({ grid });
            (domUtilityService.buildStyles as jest.Mock).mockImplementation(function (_grid) {
                expect(_grid).toBe(grid);
                expect(col.visible()).toBe(false);
            });
            col.visible(false);
            expect(domUtilityService.buildStyles).toHaveBeenCalled();
        });

        test('can set to true', function () {
            const col = getColumn({ colDef: { visible: false } });
            col.visible(true);
            expect(col.visible()).toBe(true);
        });

        test('builds grid styles after setting to true', function () {
            const grid = Mock.of<Grid>();
            const col = getColumn({ colDef: { visible: false }, grid });
            (domUtilityService.buildStyles as jest.Mock).mockImplementation(function (_grid) {
                expect(_grid).toBe(grid);
                expect(col.visible()).toBe(true);
            });
            col.visible(true);
            expect(domUtilityService.buildStyles).toHaveBeenCalled();
        });

        test('can set to same value', function () {
            const col = getColumn({ colDef: { visible: false } });
            col.visible(false);
            expect(col.visible()).toBe(false);
        });

        test('can toggle to false', function () {
            const col = getColumn();
            col.toggleVisible(false);
            expect(col.visible()).toBe(false);
        });

        test('can toggle to true', function () {
            const col = getColumn({ colDef: { visible: false } });
            col.toggleVisible(true);
            expect(col.visible()).toBe(true);
        });

        test('can toggle from true to same value', function () {
            const col = getColumn({ colDef: { visible: false } });
            col.toggleVisible(true);
            expect(col.visible()).toBe(true);
        });

        test('can toggle from true to inverse value', function () {
            const col = getColumn({ colDef: { visible: false } });
            col.toggleVisible();
            expect(col.visible()).toBe(true);
        });

        test('can toggle from false to same value', function () {
            const col = getColumn({ colDef: { visible: false } });
            col.toggleVisible(false);
            expect(col.visible()).toBe(false);
        });

        test('can toggle from false to inverse value', function () {
            const col = getColumn();
            col.toggleVisible();
            expect(col.visible()).toBe(false);
        });

        test('builds grid styles after toggling', function () {
            const grid = Mock.of<Grid>();
            const col = getColumn({ grid });
            (domUtilityService.buildStyles as jest.Mock).mockImplementation(function (_grid) {
                expect(_grid).toBe(grid);
                expect(col.visible()).toBe(false);
            });
            col.toggleVisible(false);
            expect(domUtilityService.buildStyles).toHaveBeenCalled();
        });
    });

    describe('getting property', function () {
        let row: Row;

        beforeEach(function () {
            row = Mock.of<Row>({ getProperty: (field: string) => field + '_val' });
        });

        test('uses row to get value', function () {
            const col = getColumn({ colDef: { field: 'foo' } });
            const result = col.getProperty(row);
            expect(result).toBe('foo_val');
        });

        test('uses cell filter to map value', function () {
            const col = getColumn({
                colDef: { field: 'foo', cellFilter: (val: number) => val + '_map' },
            });
            const result = col.getProperty(row);
            expect(result).toBe('foo_val_map');
        });
    });

    describe('sorting', function () {
        describe('given sortable column', function () {
            let col: Column;
            let sortCallback: (col: Column, direction: string) => void;

            beforeEach(function () {
                sortCallback = jest.fn();
                col = getColumn({ config: { enableSort: true, sortCallback } });
            });

            test('does not allow events to bubble up', function () {
                expect(col.sort()).toBe(false);
            });

            test('inverts sort direction from unspecified to ascending', function () {
                col.sort();
                expect(col.sortDirection()).toBe(SortDirection.Ascending);
            });

            test('inverts sort direction from descending to ascending', function () {
                col.sortDirection(SortDirection.Descending);
                col.sort();
                expect(col.sortDirection()).toBe(SortDirection.Ascending);
            });

            test('inverts sort direction from ascending to descending', function () {
                col.sortDirection(SortDirection.Ascending);
                col.sort();
                expect(col.sortDirection()).toBe(SortDirection.Descending);
            });

            test('invokes sort callback', function () {
                col.sort(undefined, $.Event('click'));
                expect(sortCallback).toHaveBeenCalledWith(col, SortDirection.Ascending, false);
            });

            test('when shift key is pressed then invokes sort callback with multi sort', function () {
                col.sort(undefined, $.Event('click', { shiftKey: true }));
                expect(sortCallback).toHaveBeenCalledWith(col, SortDirection.Ascending, true);
            });
        });

        describe('given no sort callback', function () {
            test('still works', function () {
                const col = getColumn({ config: { enableSort: true } });
                col.sort();
                expect(col.sortDirection()).toBe(SortDirection.Ascending);
            });
        });

        describe('given non-sortable column', function () {
            let col: Column;

            beforeEach(function () {
                col = getColumn({ config: { enableSort: false } });
            });

            test('allows events to bubble up', function () {
                expect(col.sort()).toBe(true);
            });

            test('does not sort', function () {
                col.sort();
                expect(col.sortDirection()).toBe(SortDirection.Unspecified);
            });
        });
    });

    describe('clicking', function () {
        let col: Column;
        let resizeOnDataCallback: (col: Column) => void;

        beforeEach(function () {
            jest.useFakeTimers();
            resizeOnDataCallback = jest.fn();
            col = getColumn({ config: { resizeOnDataCallback } });
        });

        afterEach(function () {
            jest.useRealTimers();
        });

        test('stops propagation', function () {
            const event = $.Event('click');
            col.gripClick(undefined, event);
            expect(event.isPropagationStopped()).toBe(true);
        });

        test('single click does not trigger resize callback', function () {
            col.gripClick(undefined, $.Event('click'));
            jest.advanceTimersByTime(500);
            expect(resizeOnDataCallback).not.toHaveBeenCalled();
        });

        test('double click triggers resize callback', function () {
            col.gripClick(undefined, $.Event('click'));
            jest.advanceTimersByTime(499);
            col.gripClick(undefined, $.Event('click'));
            expect(resizeOnDataCallback).toHaveBeenCalledWith(col);
        });

        test('double click detection is reset after 500ms', function () {
            col.gripClick(undefined, $.Event('click'));
            jest.advanceTimersByTime(500);
            col.gripClick(undefined, $.Event('click'));
            expect(resizeOnDataCallback).not.toHaveBeenCalled();
        });

        test('double click detection is reset after double click', function () {
            col.gripClick(undefined, $.Event('click'));
            jest.advanceTimersByTime(499);
            col.gripClick(undefined, $.Event('click'));
            col.gripClick(undefined, $.Event('click'));
            expect(resizeOnDataCallback).toHaveBeenCalledTimes(1);
        });

        test('double click reset timer is cleared after double click', function () {
            col.gripClick(undefined, $.Event('click'));
            jest.advanceTimersByTime(499);
            col.gripClick(undefined, $.Event('click'));
            col.gripClick(undefined, $.Event('click'));
            jest.advanceTimersByTime(10);
            col.gripClick(undefined, $.Event('click'));
            expect(resizeOnDataCallback).toHaveBeenCalledTimes(2);
        });
    });

    describe('clicking without resize callback', function () {
        beforeEach(function () {
            jest.useFakeTimers();
        });

        afterEach(function () {
            jest.useRealTimers();
        });

        test('double click still works', function () {
            const col = getColumn();
            col.gripClick(undefined, $.Event('click'));
            expect(() => col.gripClick(undefined, $.Event('click'))).not.toThrow();
        });
    });

    describe('gripping', function () {
        afterEach(function () {
            $(document).off('mousemove.kgColumn mouseup.kgColumn');
        });

        describe('on mouse down', function () {
            let col: Column;
            let event: JQuery.MouseDownEvent;

            beforeEach(function () {
                col = getColumn();
                event = $.Event('mousedown', {
                    target: $('<div><div /></div>').children()[0],
                }) as JQuery.MouseDownEvent;
            });

            test('stops propagation', function () {
                col.gripOnMouseDown(event);
                expect(event.isPropagationStopped()).toBe(true);
            });

            test('prevents default', function () {
                const result = col.gripOnMouseDown(event);
                expect(result).toBe(false);
            });

            test('sets cursor style on parent element', function () {
                col.gripOnMouseDown(event);
                expect(event.target.parentElement!.style.cursor).toBe('col-resize');
            });
        });

        describe('on moving', function () {
            let grid: Grid;
            let col: Column;
            let event: JQuery.TriggeredEvent;

            beforeEach(function () {
                const mouseDownEvent = $.Event('mousedown', {
                    clientX: 100,
                    target: $('<div><div /></div>').children()[0],
                }) as JQuery.MouseDownEvent;

                grid = Mock.of<Grid>();
                col = getColumn({ colDef: { minWidth: 20, maxWidth: 60, width: 40 }, grid });
                col.gripOnMouseDown(mouseDownEvent);
                event = $.Event('mousemove.kgColumn');
                jest.spyOn(domUtilityService, 'buildStyles').mockImplementation(() => {});
            });

            test('stops propagation', function () {
                $(document).trigger(event);
                expect(event.isPropagationStopped()).toBe(true);
            });

            test('prevents default', function () {
                $(document).trigger(event);
                expect(event.isDefaultPrevented()).toBe(true);
            });

            test('increases width according to mouse cursor distance from initial grip', function () {
                event.clientX = 119;
                $(document).trigger(event);
                expect(col.width).toBe(59);
            });

            test('decreases width according to mouse cursor distance from initial grip', function () {
                event.clientX = 81;
                $(document).trigger(event);
                expect(col.width).toBe(21);
            });

            test('enforces max width', function () {
                event.clientX = 121;
                $(document).trigger(event);
                expect(col.width).toBe(60);
            });

            test('enforces min width', function () {
                event.clientX = 79;
                $(document).trigger(event);
                expect(col.width).toBe(20);
            });

            test('builds grid styles after updating width', function () {
                (domUtilityService.buildStyles as jest.Mock).mockImplementation(function (_grid) {
                    expect(_grid).toBe(grid);
                    expect(col.width).toBe(50);
                });

                event.clientX = 110;
                $(document).trigger(event);
                expect(domUtilityService.buildStyles).toHaveBeenCalled();
            });
        });

        describe('on mouse up', function () {
            let grid: Grid;
            let event: JQuery.TriggeredEvent;
            let target: HTMLElement;

            beforeEach(function () {
                target = $('<div><div /></div>').children()[0];
                grid = Mock.of<Grid>({
                    columns: ko.observableArray(),
                    settings: jest.fn().mockReturnValue({}),
                    trigger: jest.fn(),
                });
                event = $.Event('mouseup.kgColumn');
            });

            test('stops propagation', function () {
                initColumn();
                $(document).trigger(event);
                expect(event.isPropagationStopped()).toBe(true);
            });

            test('prevents default', function () {
                initColumn();
                $(document).trigger(event);
                expect(event.isDefaultPrevented()).toBe(true);
            });

            test('resets cursor style on parent element to pointer if sortable', function () {
                initColumn(true);
                $(document).trigger(event);
                expect(target.parentElement!.style.cursor).toBe('pointer');
            });

            test('resets cursor style on parent element to default if not sortable', function () {
                initColumn(false);
                $(document).trigger(event);
                expect(target.parentElement!.style.cursor).toBe('default');
            });

            test('triggers column widths changed event', function () {
                const col = initColumn();
                const cols = [Mock.of<Column>({ field: 'c1' }), Mock.of<Column>({ field: 'c2' })];
                grid.columns(cols);
                $(document).trigger(event);
                expect(grid.trigger).toHaveBeenCalledWith(GridEventType.ColumnWidthsChanged, [col]);
            });

            test('triggers settings changed by user event', function () {
                const gridSettings = { columnDefs: [{ field: 'dummy' }] };
                (grid.settings as jest.Mock).mockReturnValue(gridSettings);
                initColumn();
                $(document).trigger(event);
                expect(grid.trigger).toHaveBeenCalledWith(
                    GridEventType.SettingsChangedByUser,
                    gridSettings
                );
            });

            test('does not error when mouse up is called twice', function () {
                const col = initColumn();
                col.gripOnMouseDown($.Event('mousedown', { target }) as JQuery.MouseDownEvent);
                $(document).trigger(event);
                expect(event.isPropagationStopped()).toBe(true);
            });

            test('removes mouse move event handlers', function () {
                initColumn();
                const spy = jest.fn();
                $(document).on('mousemove.kgColumn', spy).trigger(event).trigger('mousemove');
                expect(spy).not.toHaveBeenCalled();
            });

            test('removes mouse up event handlers', function () {
                initColumn();
                const spy = jest.fn();
                const $document = $(document);
                $document.on('mouseup.kgColumn', spy).trigger(event);
                spy.mockReset();
                $document.trigger('mouseup');
                expect(spy).not.toHaveBeenCalled();
            });

            test('does not remove unrelated event handlers', function () {
                initColumn();
                const spy = jest.fn();
                $(document).on('mousemove', spy).trigger(event).trigger('mousemove');
                expect(spy).toHaveBeenCalled();
            });

            function initColumn(sortable?: boolean) {
                const col = getColumn({
                    config: { enableSort: sortable },
                    colDef: { field: 'dummy' },
                    grid,
                });
                col.gripOnMouseDown($.Event('mousedown', { target }) as JQuery.MouseDownEvent);
                return col;
            }
        });

        describe('on grip with no parent element', function () {
            let col: Column;
            let event: JQuery.MouseDownEvent;

            beforeEach(function () {
                col = getColumn();
                event = $.Event('mousedown', { target: $('<div>')[0] }) as JQuery.MouseDownEvent;
            });

            test('stops propagation', function () {
                col.gripOnMouseDown(event);
                expect(event.isPropagationStopped()).toBe(true);
            });

            test('prevents default', function () {
                const result = col.gripOnMouseDown(event);
                expect(result).toBe(false);
            });

            test('does not cause errors on mouse move', function () {
                col.gripOnMouseDown(event);
                expect(() => $(document).trigger('mousemove.kgColumn')).not.toThrowError();
            });

            test('does not cause errors on mouse up', function () {
                col.gripOnMouseDown(event);
                expect(() => $(document).trigger('mouseup.kgColumn')).not.toThrowError();
            });
        });
    });

    function getColumn(args?: {
        colDef?: Partial<ColumnDefinition>;
        config?: Partial<ColumnConfig>;
        grid?: Grid;
    }) {
        args = args || {};
        const colDef = Mock.of<ColumnDefinition>(args.colDef);
        const config = Object.assign({ colDef }, args.config);
        return new Column(Mock.of<ColumnConfig>(config), args.grid || Mock.of<Grid>());
    }
});
