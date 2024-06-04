import $ from 'jquery';
import ko from 'knockout';
import { Mock } from 'ts-mockery';
import { EXCESS_ROWS } from '../constants';
import moveSelectionHandler from '../moveSelectionHandler';
import Grid from '../classes/Grid';
import Row from '../classes/Row';
import SelectionService from '../classes/SelectionService';

describe('move selection handler', function () {
    const keyUp = 38;
    const keyDown = 40;
    let grid: Grid;

    beforeEach(function () {
        grid = Mock.of<Grid>({
            $viewport: $('<div>'),
            renderedRows: ko.observableArray(),
            rowHeight: 10,
            selectionService: Mock.of<SelectionService>({ changeSelection: jest.fn() }),
        });
        grid.$viewport.scrollTop(100);
    });

    describe('given non-empty grid', function () {
        beforeEach(function () {
            const rows = [];
            const count = 2 * EXCESS_ROWS;
            for (let i = 0; i < count; i++) {
                rows.push(Mock.of<Row>());
            }

            grid.renderedRows(rows);
        });

        describe('when pressing up key on row within rendered range', function () {
            addTests(keyUp, 1, 0, 0);
        });

        describe('when pressing up key on row at top edge of rendered range', function () {
            addTests(keyUp, 0, -1, -80);
        });

        describe('when pressing up key with no row selected', function () {
            test('ignores key press', function () {
                const bubble = moveSelectionHandler(grid, getEvent(keyUp));
                expect(bubble).toBe(true);
            });
        });

        describe('when pressing down key on row within rendered range', function () {
            addTests(keyDown, -1, 0, 0);
        });

        describe('when pressing down key on row at bottom edge of rendered range', function () {
            addTests(keyDown, 0, 1, 80);
        });

        describe('when pressing down key with no row selected', function () {
            test('ignores key press', function () {
                const bubble = moveSelectionHandler(grid, getEvent(keyDown));
                expect(bubble).toBe(true);
            });
        });

        function addTests(
            key: number,
            lastClickedOffset: number,
            newSelectedOffset: number,
            scrollOffset: number
        ): void {
            let evt: JQuery.Event;

            beforeEach(function () {
                evt = getEvent(key);
                Mock.extend(grid.selectionService).with({
                    lastClickedRow: grid.renderedRows()[EXCESS_ROWS + lastClickedOffset],
                });
            });

            test('should handle key', function () {
                const bubble = moveSelectionHandler(grid, evt);
                expect(bubble).toBe(false);
            });

            test('should select adjacent row', function () {
                moveSelectionHandler(grid, evt);
                expect(grid.selectionService.changeSelection).toHaveBeenCalledWith(
                    grid.renderedRows()[EXCESS_ROWS + newSelectedOffset],
                    evt
                );
            });

            if (scrollOffset) {
                test('should scroll', function () {
                    moveSelectionHandler(grid, evt);
                    expect(grid.$viewport.scrollTop()).toBe(100 + scrollOffset);
                });
            } else {
                test('should not scroll', function () {
                    moveSelectionHandler(grid, evt);
                    expect(grid.$viewport.scrollTop()).toBe(100);
                });
            }
        }

        test('ignores key other than up or down', function () {
            const bubble = moveSelectionHandler(grid, getEvent(39));
            expect(bubble).toBe(true);
        });
    });

    describe('given empty grid', function () {
        test('ignores up key', () => runTest(keyUp));

        test('ignores down key', () => runTest(keyDown));

        function runTest(key: number) {
            Mock.extend(grid.selectionService).with({ lastClickedRow: Mock.of<Row>() });
            const bubble = moveSelectionHandler(grid, getEvent(key));
            expect(grid.selectionService.changeSelection).not.toHaveBeenCalled();
            expect(bubble).toBe(true);
        }
    });

    function getEvent(key: number) {
        return Mock.of<JQuery.Event>({ which: key });
    }
});
