import $ from 'jquery';
import ko from 'knockout';
import { Mock } from 'ts-mockery';
import domUtilityService from '../domUtilityService';
import Column from '../classes/Column';
import Grid from '../classes/Grid';

describe('dom utility service', function () {
    test('measures scrollbars', function () {
        const scrollH = domUtilityService.scrollH;
        const scrollW = domUtilityService.scrollW;
        expect(scrollH).toBeGreaterThan(0);
        expect(scrollW).toBeGreaterThan(0);
        expect(scrollH).toBeLessThanOrEqual(100);
        expect(scrollW).toBeLessThanOrEqual(100);
    });

    test('can get grid containers', function () {
        const root = $('<div>');
        const topPanel = $('<div class="kgTopPanel">').appendTo(root);
        const groupPanel = $('<div class="kgGroupPanel">').appendTo(topPanel);
        const headerContainer = $('<div class="kgNonFixedHeaderContainer">').appendTo(topPanel);
        const headerScroller = $('<div class="kgHeaderScroller">').appendTo(headerContainer);
        const viewport = $('<div class="kgNonFixedViewport">').appendTo(root);
        const canvas = $('<div class="kgCanvas">').appendTo(viewport);
        const fixedHeaderContainer = $('<div class="kgFixedHeaderContainer">').appendTo(topPanel);
        const fixedHeaderScroller = $('<div class="kgHeaderScroller">').appendTo(
            fixedHeaderContainer
        );
        const fixedViewport = $('<div class="kgFixedViewport">').appendTo(root);
        const fixedCanvas = $('<div class="kgCanvas">').appendTo(fixedViewport);

        const result = domUtilityService.getGridContainers(root);
        expect(result.$root).toBe(root);
        expectElement(result.$topPanel, topPanel);
        expectElement(result.$groupPanel, groupPanel);
        expectElement(result.$headerContainer, headerContainer);
        expectElement(result.$headerScroller, headerScroller);
        expectElement(result.$viewport, viewport);
        expectElement(result.$canvas, canvas);
        expectElement(result.$fixedHeaderContainer, fixedHeaderContainer);
        expectElement(result.$fixedHeaderScroller, fixedHeaderScroller);
        expectElement(result.$fixedViewport, fixedViewport);
        expectElement(result.$fixedCanvas, fixedCanvas);

        function expectElement(actual: JQuery, expected: JQuery) {
            expect(actual.length).toBe(1);
            expect(actual[0]).toBe(expected[0]);
        }
    });

    describe('updating grid layout', function () {
        let grid: Grid;

        beforeEach(function () {
            grid = Mock.of<Grid>({
                $root: $('<div>'),
                $viewport: $('<div>'),
                refreshDomSizes: jest.fn(),
                adjustScrollTop: jest.fn(),
            });

            grid.$root.width(50);
            grid.$root.height(60);
        });

        test('refreshes DOM sizes', function () {
            domUtilityService.updateGridLayout(grid);
            expect(grid.refreshDomSizes).toHaveBeenCalledWith({ width: 50, height: 60 });
        });

        test('adjusts scroll top after refreshing DOM sizes', function () {
            grid.$viewport.scrollTop(15);
            (grid.adjustScrollTop as jest.Mock<any, any>).mockImplementation(function () {
                expect(grid.refreshDomSizes).toHaveBeenCalled();
            });
            domUtilityService.updateGridLayout(grid);
            expect(grid.adjustScrollTop).toHaveBeenCalledWith(15, true);
        });
    });

    describe('building styles', function () {
        let grid: Grid;

        beforeEach(function () {
            const visibleFixedColumns = ko.observableArray([
                { width: 10, fixedClass: 'kgFixedColumn' },
                { width: 13, fixedClass: 'kgFixedColumn' },
                { width: 20, fixedClass: 'kgFixedColumn' },
            ]);
            const visibleNonFixedColumns = ko.observableArray([
                { width: 15, fixedClass: 'kgNonFixedColumn' },
                { width: 23, fixedClass: 'kgNonFixedColumn' },
                { width: 20, fixedClass: 'kgNonFixedColumn' },
            ]);
            grid = Mock.of<Grid>({
                config: { headerRowHeight: 8 },
                gridId: 'some-grid',
                rowHeight: 10,
                visibleNonFixedColumns: visibleNonFixedColumns,
                visibleFixedColumns: visibleFixedColumns,
                totalFixedRowWidth: () =>
                    visibleFixedColumns().reduce((acc, cv) => (acc = acc + cv.width), 0),
                totalNonFixedRowWidth: () =>
                    visibleNonFixedColumns().reduce((acc, cv) => (acc = acc + cv.width), 0),
                viewportDimWidth: () => 400,
            });

            domUtilityService.scrollH = 120;
        });

        describe('using non-legacy browser', function () {
            beforeEach(function () {
                Mock.extend(grid).with({ legacyMode: false });
                domUtilityService.buildStyles(grid);
            });

            test('adds style element to DOM', function () {
                const style = getStyle();
                expect(style.length).toBe(1);
                expect(style.prop('tagName')).toBe('STYLE');
                expect(style.attr('type')).toBe('text/css');
            });

            test('sets style element on grid', function () {
                expect(grid.styleSheet).toBe(getStyle()[0]);
            });

            test('CSS is correct', function () {
                const styleContent = getStyleContent();
                expect(styleContent).toEqual([
                    '.kgNonFixedCanvas { width: 58px; }',
                    '.kgNonFixedRow { width: 58px; height: 10px; }',
                    '.kgHeaderCell { height: 7px; }',
                    '.kgCell { height: 9px; }',
                    '.kgNonFixedHeaderScroller { width: 178px; }',
                    '.kgNonFixedColumn.col0 { width: 15px; left: 0px; }',
                    '.kgNonFixedColumn.col1 { width: 23px; left: 15px; }',
                    '.kgNonFixedColumn.col2 { width: 20px; left: 38px; }',
                ]);
            });

            test('when building again then retains previous style element', function () {
                const style = grid.styleSheet;
                domUtilityService.buildStyles(grid);
                expect(getStyle()[0]).toBe(style);
                expect(grid.styleSheet).toBe(style);
            });

            test('when building again then updates CSS', function () {
                (grid.visibleFixedColumns() as Column[]).push(
                    Mock.of<Column>({ width: 8, fixedClass: 'kgFixed' })
                );
                domUtilityService.buildStyles(grid);
                const styleContent = getStyleContent();
                expect(styleContent).toEqual([
                    '.kgNonFixedCanvas { width: 58px; }',
                    '.kgNonFixedRow { width: 58px; height: 10px; }',
                    '.kgHeaderCell { height: 7px; }',
                    '.kgCell { height: 9px; }',
                    '.kgNonFixedHeaderScroller { width: 178px; }',
                    '.kgNonFixedColumn.col0 { width: 15px; left: 0px; }',
                    '.kgNonFixedColumn.col1 { width: 23px; left: 15px; }',
                    '.kgNonFixedColumn.col2 { width: 20px; left: 38px; }',
                ]);
            });

            afterEach(function () {
                getStyle().remove();
            });
        });

        describe('using legacy browser', function () {
            beforeEach(function () {
                Mock.extend(grid).with({ legacyMode: true });
                domUtilityService.buildStyles(grid);
            });

            test('adds style element to DOM', function () {
                const style = getStyle();
                expect(style.length).toBe(1);
                expect(style.prop('tagName')).toBe('STYLE');
                expect(style.attr('type')).toBe('text/css');
            });

            test('sets style element on grid', function () {
                expect(grid.styleSheet).toBe(getStyle()[0]);
            });

            test('CSS is correct', function () {
                const styleContent = getStyleContent();
                expect(styleContent).toEqual([
                    '.kgNonFixedCanvas { width: 58px; }',
                    '.kgNonFixedRow { width: 58px; height: 10px; }',
                    '.kgHeaderCell { height: 7px; }',
                    '.kgCell { height: 9px; }',
                    '.kgNonFixedHeaderScroller { width: 178px; }',
                    '.kgNonFixedColumn.col0 { width: 15px; left: 0px; }',
                    '.kgNonFixedColumn.col1 { width: 23px; left: 15px; }',
                    '.kgNonFixedColumn.col2 { width: 20px; left: 38px; }',
                    '.kgFixedRow { width: 43px; height: 10px; }',
                    '.kgFixedColumn.col0 { width: 10px; left: 0px; }',
                    '.kgFixedColumn.col1 { width: 13px; left: 10px; }',
                    '.kgFixedColumn.col2 { width: 20px; left: 23px; }',
                ]);
            });

            test('when building again then retains previous style element', function () {
                const style = grid.styleSheet;
                domUtilityService.buildStyles(grid);
                expect(getStyle()[0]).toBe(style);
                expect(grid.styleSheet).toBe(style);
            });

            test('when building again then updates CSS', function () {
                (grid.visibleFixedColumns() as Column[]).push(
                    Mock.of<Column>({ width: 8, fixedClass: 'kgFixedColumn' })
                );
                domUtilityService.buildStyles(grid);
                const styleContent = getStyleContent();
                expect(styleContent).toEqual([
                    '.kgNonFixedCanvas { width: 58px; }',
                    '.kgNonFixedRow { width: 58px; height: 10px; }',
                    '.kgHeaderCell { height: 7px; }',
                    '.kgCell { height: 9px; }',
                    '.kgNonFixedHeaderScroller { width: 178px; }',
                    '.kgNonFixedColumn.col0 { width: 15px; left: 0px; }',
                    '.kgNonFixedColumn.col1 { width: 23px; left: 15px; }',
                    '.kgNonFixedColumn.col2 { width: 20px; left: 38px; }',
                    '.kgFixedRow { width: 51px; height: 10px; }',
                    '.kgFixedColumn.col0 { width: 10px; left: 0px; }',
                    '.kgFixedColumn.col1 { width: 13px; left: 10px; }',
                    '.kgFixedColumn.col2 { width: 20px; left: 23px; }',
                    '.kgFixedColumn.col3 { width: 8px; left: 43px; }',
                ]);
            });

            afterEach(function () {
                getStyle().remove();
            });
        });

        function getStyle() {
            return $('#some-grid');
        }

        function getStyleContent() {
            return getStyle()
                .text()
                .split('.some-grid ')
                .filter((x) => x);
        }
    });
});
