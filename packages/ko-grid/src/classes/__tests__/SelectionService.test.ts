import ko from 'knockout';
import { Mock } from 'ts-mockery';
import domUtilityService from '../../domUtilityService';
import { Entity } from '../../types';
import Column from '../Column';
import Grid from '../Grid';
import { GridConfig } from '../grid-config';
import Row from '../Row';
import RowFactory from '../RowFactory';
import SelectionService from '../SelectionService';

describe('selection service', function () {
    const keyCodeUp = 38;
    const keyCodeDown = 40;

    beforeEach(function () {
        jest.spyOn(domUtilityService, 'buildStyles').mockImplementation(function () {});
    });

    test('last clicked row is undefined initially', function () {
        expect(getGrid().selectionService.lastClickedRow).toBeUndefined();
    });

    [true, false].forEach(function (value) {
        test(`can select rows = ${value} if grid config says so`, function () {
            const grid = getGrid({ config: Mock.of<GridConfig>({ canSelectRows: value }) });
            expect(grid.selectionService.canSelectRows).toBe(value);
        });
    });

    describe('changing selection', function () {
        describe('given multi-select disabled', function () {
            let grid: Grid;
            let row: Row;
            let service: SelectionService;

            beforeEach(function () {
                grid = getGrid({ multiSelect: false });
                row = grid.rowFactory.rowCache[0];
                service = grid.selectionService;
            });

            test('when clicking on non-selected row then selects it', function () {
                service.changeSelection(row, Mock.of<JQuery.Event>());
                expect(row.isSelected()).toBe(true);
            });

            test('when clicking on non-selected row then sets it as last clicked row', function () {
                service.changeSelection(row, Mock.of<JQuery.Event>());
                expect(service.lastClickedRow).toBe(row);
            });

            test('when clicking on selected row then retains selection', function () {
                service.changeSelection(row, Mock.of<JQuery.Event>());
                service.changeSelection(row, Mock.of<JQuery.Event>());
                expect(row.isSelected()).toBe(true);
                expect(grid.selectedItems().length).toBe(1);
            });

            test('when clicking on selected row then does not update selected items', function () {
                service.changeSelection(row, Mock.of<JQuery.Event>());
                expectNotifyCount(0, grid, function () {
                    service.changeSelection(row, Mock.of<JQuery.Event>());
                });
            });

            test('when clicking on selected row and there are others selected then updates selected items', function () {
                service.changeSelection(row, Mock.of<JQuery.Event>());
                grid.selectedItems.push(grid.filteredData()[8]);
                expectNotifyCount(1, grid, function () {
                    service.changeSelection(row, Mock.of<JQuery.Event>());
                });
                expect(getSelectedIds(grid)).toEqual(['r1']);
            });

            test('when clicking on different row then deselects previous row and selects new one', function () {
                const anotherRow = grid.rowFactory.rowCache[2];
                service.changeSelection(row, Mock.of<JQuery.Event>());
                service.changeSelection(anotherRow, Mock.of<JQuery.Event>());
                expect(row.isSelected()).toBe(false);
                expect(anotherRow.isSelected()).toBe(true);
                expect(service.lastClickedRow).toBe(anotherRow);
            });

            test('when clicking on different row then updates selected items only once', function () {
                const anotherRow = grid.rowFactory.rowCache[2];
                service.changeSelection(row, Mock.of<JQuery.Event>());
                expectNotifyCount(1, grid, function () {
                    service.changeSelection(anotherRow, Mock.of<JQuery.Event>());
                });
            });

            test('when ctrl+click on non-selected row then selects it', function () {
                service.changeSelection(
                    row,
                    Mock.of<JQuery.Event>({ ctrlKey: true })
                );
                expect(row.isSelected()).toBe(true);
            });

            test('when ctrl+click on selected row then deselects it', function () {
                service.changeSelection(row, Mock.of<JQuery.Event>());
                service.changeSelection(
                    row,
                    Mock.of<JQuery.Event>({ ctrlKey: true })
                );
                expect(row.isSelected()).toBe(false);
            });

            test('when ctrl+click on selected row then updates selected items only once', function () {
                service.changeSelection(row, Mock.of<JQuery.Event>());
                expectNotifyCount(1, grid, function () {
                    service.changeSelection(
                        row,
                        Mock.of<JQuery.Event>({ ctrlKey: true })
                    );
                });
            });

            test('when ctrl+click on different row then deselects previous row and selects new one', function () {
                const anotherRow = grid.rowFactory.rowCache[2];
                service.changeSelection(row, Mock.of<JQuery.Event>());
                service.changeSelection(
                    anotherRow,
                    Mock.of<JQuery.Event>({ ctrlKey: true })
                );
                expect(row.isSelected()).toBe(false);
                expect(anotherRow.isSelected()).toBe(true);
            });

            function addCtrlKeyTests(keyCode: number, description: string) {
                test(`when ctrl+${description} on non-selected row then selects it`, function () {
                    service.changeSelection(
                        row,
                        Mock.of<JQuery.Event>({ keyCode })
                    );
                    expect(row.isSelected()).toBe(true);
                });

                test(`when ctrl+${description} on selected row then retains selection`, function () {
                    service.changeSelection(row, Mock.of<JQuery.Event>());
                    service.changeSelection(
                        row,
                        Mock.of<JQuery.Event>({ keyCode })
                    );
                    expect(row.isSelected()).toBe(true);
                });

                test(`when ctrl+${description} on different row then deselects previous row and selects new one`, function () {
                    const anotherRow = grid.rowFactory.rowCache[2];
                    service.changeSelection(row, Mock.of<JQuery.Event>());
                    service.changeSelection(
                        anotherRow,
                        Mock.of<JQuery.Event>({ keyCode })
                    );
                    expect(row.isSelected()).toBe(false);
                    expect(anotherRow.isSelected()).toBe(true);
                });
            }

            addCtrlKeyTests(keyCodeUp, 'up');
            addCtrlKeyTests(keyCodeDown, 'down');
        });

        describe('given multi-select disabled and there are groups', function () {
            let grid: Grid;
            let service: SelectionService;

            beforeEach(function () {
                grid = getGrid({ multiSelect: false });
                grid.configGroups(grid.columns().slice());
                grid.rowFactory.filteredDataChanged();
                grid.rowFactory.groupCache[5].toggleExpand();
                service = grid.selectionService;
            });

            test('when clicking on non-selected group row then does not select it', function () {
                const group = grid.rowFactory.groupCache[0];
                service.changeSelection(group, Mock.of<JQuery.Event>());
                expect(group.isSelected()).toBe(false);
            });

            test('when clicking on non-selected row then selects it', function () {
                const row = grid.rowFactory.rowCache.find((x) => x) as Row;
                service.changeSelection(row, Mock.of<JQuery.Event>());
                expect(row.isSelected()).toBe(true);
            });

            test('when ctrl+click on non-selected group row then does not select it', function () {
                const group = grid.rowFactory.groupCache[0];
                service.changeSelection(
                    group,
                    Mock.of<JQuery.Event>({ ctrlKey: true })
                );
                expect(group.isSelected()).toBe(false);
            });

            test('when ctrl+click on partially selected group row then deselects it', function () {
                const group = grid.rowFactory.groupCache[0];
                service.changeSelection(
                    grid.rowFactory.rowCache.find((x) => x) as Row,
                    Mock.of<JQuery.Event>({ ctrlKey: true })
                );
                service.changeSelection(
                    group,
                    Mock.of<JQuery.Event>({ ctrlKey: true })
                );
                expect(group.isSelected()).toBe(false);
                expect(grid.selectedItems().length).toBe(0);
            });

            test('when ctrl+click on fully partially selected group row then updates selected items only once', function () {
                service.changeSelection(
                    grid.rowFactory.rowCache.find((x) => x) as Row,
                    Mock.of<JQuery.Event>({ ctrlKey: true })
                );
                expectNotifyCount(1, grid, function () {
                    service.changeSelection(
                        grid.rowFactory.groupCache[0],
                        Mock.of<JQuery.Event>({ ctrlKey: true })
                    );
                });
            });
        });

        describe('given multi-select enabled', function () {
            let grid: Grid;
            let service: SelectionService;

            beforeEach(function () {
                grid = getGrid({ multiSelect: true });
                service = grid.selectionService;
            });

            test('when clicking on row then selects it', function () {
                const row = grid.rowFactory.rowCache[1];
                service.changeSelection(row, Mock.of<JQuery.Event>());
                expect(row.isSelected()).toBe(true);
                expect(service.lastClickedRow).toBe(row);
            });

            test('when clicking on selected row then retains selection', function () {
                const row = grid.rowFactory.rowCache[1];
                service.changeSelection(row, Mock.of<JQuery.Event>());
                service.changeSelection(row, Mock.of<JQuery.Event>());
                expect(row.isSelected()).toBe(true);
                expect(grid.selectedItems().length).toBe(1);
            });

            test('when clicking on different row then deselects previous row and selects new one', function () {
                const row = grid.rowFactory.rowCache[1];
                const anotherRow = grid.rowFactory.rowCache[0];
                service.changeSelection(row, Mock.of<JQuery.Event>());
                service.changeSelection(anotherRow, Mock.of<JQuery.Event>());
                expect(row.isSelected()).toBe(false);
                expect(anotherRow.isSelected()).toBe(true);
                expect(service.lastClickedRow).toBe(anotherRow);
            });

            test('when ctrl+click on non-selected row then adds it to selection', function () {
                const row = grid.rowFactory.rowCache[1];
                const anotherRow = grid.rowFactory.rowCache[0];
                service.changeSelection(row, Mock.of<JQuery.Event>());
                service.changeSelection(
                    anotherRow,
                    Mock.of<JQuery.Event>({ ctrlKey: true })
                );
                expect(row.isSelected()).toBe(true);
                expect(anotherRow.isSelected()).toBe(true);
                expect(grid.selectedItems().length).toBe(2);
            });

            test('when ctrl+click on non-selected row then updates selected items only once', function () {
                const row = grid.rowFactory.rowCache[1];
                const anotherRow = grid.rowFactory.rowCache[0];
                service.changeSelection(row, Mock.of<JQuery.Event>());
                expectNotifyCount(1, grid, function () {
                    service.changeSelection(
                        anotherRow,
                        Mock.of<JQuery.Event>({ ctrlKey: true })
                    );
                });
            });

            test('when ctrl+click on selected row then removes it from selection', function () {
                const row = grid.rowFactory.rowCache[1];
                const anotherRow = grid.rowFactory.rowCache[0];
                service.changeSelection(row, Mock.of<JQuery.Event>());
                service.changeSelection(
                    anotherRow,
                    Mock.of<JQuery.Event>({ ctrlKey: true })
                );
                service.changeSelection(
                    row,
                    Mock.of<JQuery.Event>({ ctrlKey: true })
                );
                expect(row.isSelected()).toBe(false);
                expect(anotherRow.isSelected()).toBe(true);
                expect(grid.selectedItems().length).toBe(1);
            });

            function addCtrlKeyTests(keyCode: number, description: string) {
                test(`when ctrl+${description} on non-selected row then selects it`, function () {
                    const row = grid.rowFactory.rowCache[1];
                    service.changeSelection(
                        row,
                        Mock.of<JQuery.Event>({ keyCode })
                    );
                    expect(row.isSelected()).toBe(true);
                });

                test(`when ctrl+${description} on selected row then retains selection`, function () {
                    const row = grid.rowFactory.rowCache[1];
                    service.changeSelection(row, Mock.of<JQuery.Event>());
                    service.changeSelection(
                        row,
                        Mock.of<JQuery.Event>({ keyCode })
                    );
                    expect(row.isSelected()).toBe(true);
                });

                test(`when ctrl+${description} on different row then deselects previous row and selects new one`, function () {
                    const row = grid.rowFactory.rowCache[1];
                    const anotherRow = grid.rowFactory.rowCache[2];
                    service.changeSelection(row, Mock.of<JQuery.Event>());
                    service.changeSelection(
                        anotherRow,
                        Mock.of<JQuery.Event>({ keyCode })
                    );
                    expect(row.isSelected()).toBe(false);
                    expect(anotherRow.isSelected()).toBe(true);
                });
            }

            addCtrlKeyTests(keyCodeUp, 'up');
            addCtrlKeyTests(keyCodeDown, 'down');

            test('when shift+click on row without previously clicked row then adds it to selection', function () {
                const row = grid.rowFactory.rowCache[1];
                grid.selectedItems.push(grid.filteredData()[8]);
                service.changeSelection(
                    row,
                    Mock.of<JQuery.Event>({ shiftKey: true })
                );
                expect(row.isSelected()).toBe(true);
                expect(service.lastClickedRow).toBe(row);
                expect(grid.selectedItems().length).toBe(2);
            });

            test('when shift+click on selected row without previously clicked row then does not update selected items', function () {
                const row = grid.rowFactory.rowCache[1];
                grid.selectedItems.push(row.entity);
                grid.selectedItems.push(grid.filteredData()[8]);
                expectNotifyCount(0, grid, function () {
                    service.changeSelection(
                        row,
                        Mock.of<JQuery.Event>({ shiftKey: true })
                    );
                });
            });

            test('when shift+click on row with invalid previously clicked row then adds new row to selection', function () {
                service.changeSelection(grid.rowFactory.rowCache[0], Mock.of<JQuery.Event>());
                grid.filteredData.shift();
                grid.rowFactory.filteredDataChanged();
                service.changeSelection(
                    grid.rowFactory.rowCache[5],
                    Mock.of<JQuery.Event>({ shiftKey: true })
                );
                expect(grid.selectedItems().length).toBe(2);
            });

            test('when shift+click on previously clicked row then adds it to selection', function () {
                const row = grid.rowFactory.rowCache[1];
                const anotherRow = grid.rowFactory.rowCache[0];
                service.changeSelection(row, Mock.of<JQuery.Event>());
                service.changeSelection(anotherRow, Mock.of<JQuery.Event>());
                service.changeSelection(
                    row,
                    Mock.of<JQuery.Event>({ ctrlKey: true })
                );
                service.changeSelection(
                    row,
                    Mock.of<JQuery.Event>({ shiftKey: true })
                );
                expect(row.isSelected()).toBe(true);
                expect(anotherRow.isSelected()).toBe(true);
                expect(grid.selectedItems().length).toBe(2);
            });

            test('when shift+click on row below previously selected row then selects range downwards', function () {
                const rows = grid.rowFactory.rowCache;
                service.changeSelection(rows[1], Mock.of<JQuery.Event>());
                service.changeSelection(
                    rows[3],
                    Mock.of<JQuery.Event>({ shiftKey: true })
                );
                expect(rows[0].isSelected()).toBe(false);
                expect(rows[1].isSelected()).toBe(true);
                expect(rows[2].isSelected()).toBe(true);
                expect(rows[3].isSelected()).toBe(true);
                expect(rows[4].isSelected()).toBe(false);
                expect(grid.selectedItems().length).toBe(3);
                expect(service.lastClickedRow).toBe(rows[3]);
            });

            test('when shift+click on row below previously deselected row then selects range downwards', function () {
                const rows = grid.rowFactory.rowCache;
                service.changeSelection(rows[1], Mock.of<JQuery.Event>());
                service.changeSelection(
                    rows[1],
                    Mock.of<JQuery.Event>({ ctrlKey: true })
                );
                service.changeSelection(
                    rows[3],
                    Mock.of<JQuery.Event>({ shiftKey: true })
                );
                expect(rows[0].isSelected()).toBe(false);
                expect(rows[1].isSelected()).toBe(true);
                expect(rows[2].isSelected()).toBe(true);
                expect(rows[3].isSelected()).toBe(true);
                expect(rows[4].isSelected()).toBe(false);
            });

            test('when shift+click on row above previously selected row then selects range upwards', function () {
                const rows = grid.rowFactory.rowCache;
                service.changeSelection(rows[3], Mock.of<JQuery.Event>());
                service.changeSelection(
                    rows[1],
                    Mock.of<JQuery.Event>({ shiftKey: true })
                );
                expect(rows[0].isSelected()).toBe(false);
                expect(rows[1].isSelected()).toBe(true);
                expect(rows[2].isSelected()).toBe(true);
                expect(rows[3].isSelected()).toBe(true);
                expect(rows[4].isSelected()).toBe(false);
                expect(grid.selectedItems().length).toBe(3);
                expect(service.lastClickedRow).toBe(rows[1]);
            });

            test('when shift+click on row above previously deselected row then selects range upwards', function () {
                const rows = grid.rowFactory.rowCache;
                service.changeSelection(rows[3], Mock.of<JQuery.Event>());
                service.changeSelection(
                    rows[3],
                    Mock.of<JQuery.Event>({ ctrlKey: true })
                );
                service.changeSelection(
                    rows[1],
                    Mock.of<JQuery.Event>({ shiftKey: true })
                );
                expect(rows[0].isSelected()).toBe(false);
                expect(rows[1].isSelected()).toBe(true);
                expect(rows[2].isSelected()).toBe(true);
                expect(rows[3].isSelected()).toBe(true);
                expect(rows[4].isSelected()).toBe(false);
            });

            test('when selecting range then retains previously selected rows', function () {
                const rows = grid.rowFactory.rowCache;
                service.changeSelection(rows[8], Mock.of<JQuery.Event>());
                service.changeSelection(
                    rows[1],
                    Mock.of<JQuery.Event>({ ctrlKey: true })
                );
                service.changeSelection(
                    rows[4],
                    Mock.of<JQuery.Event>({ shiftKey: true })
                );
                expect(rows[8].isSelected()).toBe(true);
                expect(grid.selectedItems().length).toBe(5);
            });

            test("when selecting range then doesn't add entities already selected", function () {
                const rows = grid.rowFactory.rowCache;
                service.changeSelection(rows[2], Mock.of<JQuery.Event>());
                service.changeSelection(rows[4], Mock.of<JQuery.Event>());
                service.changeSelection(
                    rows[1],
                    Mock.of<JQuery.Event>({ shiftKey: true })
                );
                expect(rows[0].isSelected()).toBe(false);
                expect(rows[1].isSelected()).toBe(true);
                expect(rows[2].isSelected()).toBe(true);
                expect(rows[3].isSelected()).toBe(true);
                expect(rows[4].isSelected()).toBe(true);
                expect(grid.selectedItems().length).toBe(4);
            });

            test('when selecting range then updates selected items only once', function () {
                const rows = grid.rowFactory.rowCache;
                service.changeSelection(rows[2], Mock.of<JQuery.Event>());
                service.changeSelection(rows[4], Mock.of<JQuery.Event>());
                expectNotifyCount(1, grid, function () {
                    service.changeSelection(
                        rows[1],
                        Mock.of<JQuery.Event>({ shiftKey: true })
                    );
                });
            });
        });

        describe('given multi-select enabled and there are groups', function () {
            let grid: Grid;
            let service: SelectionService;

            beforeEach(function () {
                grid = getGrid({ multiSelect: true });
                grid.configGroups(grid.columns().slice());
                grid.rowFactory.filteredDataChanged();
                grid.rowFactory.groupCache.forEach((x) => x.toggleExpand());
                service = grid.selectionService;
            });

            test('when clicking on non-selected group row then selects it', function () {
                const group = grid.rowFactory.groupCache[0];
                service.changeSelection(group, Mock.of<JQuery.Event>());
                expect(group.isFullySelected()).toBe(true);
                expect(getSelectedIds(grid)).toEqual(['r1', 'r2', 'r3', 'r4', 'r5']);
            });

            test('when clicking on non-selected group row then updates selected items only once', function () {
                expectNotifyCount(1, grid, function () {
                    service.changeSelection(grid.rowFactory.groupCache[0], Mock.of<JQuery.Event>());
                });
            });

            test('when clicking on partially selected group row then selects it', function () {
                const group = grid.rowFactory.groupCache[0];
                service.changeSelection(grid.rowFactory.groupCache[1], Mock.of<JQuery.Event>());
                expect(group.isSelected()).toBe(true);
                expect(group.isFullySelected()).toBe(false);
                service.changeSelection(group, Mock.of<JQuery.Event>());
                expect(group.isFullySelected()).toBe(true);
                expect(grid.selectedItems().length).toBe(5);
            });

            test('when clicking on fully-selected group row then retains selection', function () {
                const group = grid.rowFactory.groupCache[0];
                service.changeSelection(group, Mock.of<JQuery.Event>());
                service.changeSelection(group, Mock.of<JQuery.Event>());
                expect(group.isFullySelected()).toBe(true);
                expect(grid.selectedItems().length).toBe(5);
            });

            test('when clicking on fully-selected group row then does not update selected items', function () {
                const group = grid.rowFactory.groupCache[0];
                service.changeSelection(group, Mock.of<JQuery.Event>());
                expectNotifyCount(0, grid, function () {
                    service.changeSelection(group, Mock.of<JQuery.Event>());
                });
            });

            test('when clicking on fully-selected group row and there are others selected then updates selected items', function () {
                const group = grid.rowFactory.groupCache[0];
                service.changeSelection(group, Mock.of<JQuery.Event>());
                grid.selectedItems.push(grid.filteredData()[8]);
                expectNotifyCount(1, grid, function () {
                    service.changeSelection(group, Mock.of<JQuery.Event>());
                });
                expect(group.isFullySelected()).toBe(true);
                expect(grid.selectedItems().length).toBe(5);
            });

            test('when clicking on different group row then deselects previous group row and selects new one', function () {
                const group = grid.rowFactory.groupCache[0];
                const anotherGroup = grid.rowFactory.groupCache[6];
                service.changeSelection(group, Mock.of<JQuery.Event>());
                service.changeSelection(anotherGroup, Mock.of<JQuery.Event>());
                expect(group.isSelected()).toBe(false);
                expect(anotherGroup.isFullySelected()).toBe(true);
                expect(getSelectedIds(grid)).toEqual(['r6', 'r7', 'r8', 'r9']);
            });

            test('when clicking on different group row then updates selected items only once', function () {
                const group = grid.rowFactory.groupCache[0];
                const anotherGroup = grid.rowFactory.groupCache[6];
                service.changeSelection(group, Mock.of<JQuery.Event>());
                expectNotifyCount(1, grid, function () {
                    service.changeSelection(anotherGroup, Mock.of<JQuery.Event>());
                });
            });

            test('when ctrl+click on non-selected group row then adds it to selection', function () {
                const group = grid.rowFactory.groupCache[0];
                const anotherGroup = grid.rowFactory.groupCache[6];
                service.changeSelection(group, Mock.of<JQuery.Event>());
                service.changeSelection(
                    anotherGroup,
                    Mock.of<JQuery.Event>({ ctrlKey: true })
                );
                expect(group.isFullySelected()).toBe(true);
                expect(anotherGroup.isFullySelected()).toBe(true);
                expect(grid.selectedItems().length).toBe(9);
            });

            test('when ctrl+click on non-selected group row then updates selected items only once', function () {
                const group = grid.rowFactory.groupCache[0];
                const anotherGroup = grid.rowFactory.groupCache[6];
                service.changeSelection(group, Mock.of<JQuery.Event>());
                expectNotifyCount(1, grid, function () {
                    service.changeSelection(
                        anotherGroup,
                        Mock.of<JQuery.Event>({ ctrlKey: true })
                    );
                });
            });

            test('when ctrl+click on selected group row then removes it from selection', function () {
                const group = grid.rowFactory.groupCache[0];
                const anotherGroup = grid.rowFactory.groupCache[6];
                service.changeSelection(group, Mock.of<JQuery.Event>());
                service.changeSelection(
                    anotherGroup,
                    Mock.of<JQuery.Event>({ ctrlKey: true })
                );
                service.changeSelection(
                    group,
                    Mock.of<JQuery.Event>({ ctrlKey: true })
                );
                expect(group.isSelected()).toBe(false);
                expect(anotherGroup.isFullySelected()).toBe(true);
                expect(grid.selectedItems().length).toBe(4);
            });

            test('when ctrl+click on selected group row then updates selected items only once', function () {
                const group = grid.rowFactory.groupCache[0];
                const anotherGroup = grid.rowFactory.groupCache[6];
                service.changeSelection(group, Mock.of<JQuery.Event>());
                service.changeSelection(
                    anotherGroup,
                    Mock.of<JQuery.Event>({ ctrlKey: true })
                );
                expectNotifyCount(1, grid, function () {
                    service.changeSelection(
                        group,
                        Mock.of<JQuery.Event>({ ctrlKey: true })
                    );
                });
            });

            test('when shift+click on group row without previously clicked row then adds it to selection', function () {
                const group = grid.rowFactory.groupCache[0];
                grid.selectedItems.push(grid.filteredData()[8]);
                service.changeSelection(
                    group,
                    Mock.of<JQuery.Event>({ shiftKey: true })
                );
                expect(group.isFullySelected()).toBe(true);
                expect(grid.selectedItems().length).toBe(6);
            });

            test('when shift+click on selected group row without previously clicked row then does not update selected items', function () {
                const group = grid.rowFactory.groupCache[0];
                grid.selectedItems(grid.filteredData().slice(0, 6));
                expectNotifyCount(0, grid, function () {
                    service.changeSelection(
                        group,
                        Mock.of<JQuery.Event>({ shiftKey: true })
                    );
                });
            });

            test('when shift+click on partially selected group row without previously clicked row then adds it to selection', function () {
                const group = grid.rowFactory.groupCache[0];
                grid.selectedItems.push(grid.filteredData()[0]);
                grid.selectedItems.push(grid.filteredData()[8]);
                service.changeSelection(
                    group,
                    Mock.of<JQuery.Event>({ shiftKey: true })
                );
                expect(group.isFullySelected()).toBe(true);
                expect(grid.selectedItems().length).toBe(6);
            });

            test('when shift+click on Group row below previously selected group row then selects range downwards', function () {
                const groups = grid.rowFactory.groupCache;
                service.changeSelection(groups[4], Mock.of<JQuery.Event>());
                service.changeSelection(
                    groups[7],
                    Mock.of<JQuery.Event>({ shiftKey: true })
                );
                expect(getSelectedIds(grid)).toEqual(['r3', 'r4', 'r5', 'r6', 'r7']);
            });

            test('when shift+click on row below previously selected row then selects range downwards', function () {
                const rows = grid.rowFactory.rowCache;
                service.changeSelection(
                    rows.find((x) => x && x.entity.id === 'r4')!,
                    Mock.of<JQuery.Event>()
                );
                service.changeSelection(
                    rows.find((x) => x && x.entity.id === 'r8')!,
                    Mock.of<JQuery.Event>({ shiftKey: true })
                );
                expect(getSelectedIds(grid)).toEqual(['r4', 'r5', 'r6', 'r7', 'r8']);
            });

            test('when shift+click on group row above previously selected group row then selects range upwards', function () {
                const groups = grid.rowFactory.groupCache;
                service.changeSelection(groups[8], Mock.of<JQuery.Event>());
                service.changeSelection(
                    groups[4],
                    Mock.of<JQuery.Event>({ shiftKey: true })
                );
                expect(getSelectedIds(grid)).toEqual(['r3', 'r4', 'r5', 'r6', 'r7']);
            });

            test('when shift+click on row above previously selected row then selects range upwards', function () {
                const rows = grid.rowFactory.rowCache;
                service.changeSelection(
                    rows.find((x) => x && x.entity.id === 'r8')!,
                    Mock.of<JQuery.Event>()
                );
                service.changeSelection(
                    rows.find((x) => x && x.entity.id === 'r4')!,
                    Mock.of<JQuery.Event>({ shiftKey: true })
                );
                expect(getSelectedIds(grid)).toEqual(['r4', 'r5', 'r6', 'r7', 'r8']);
            });
        });
    });

    describe('selecting range', function () {
        let grid: Grid;
        let service: SelectionService;

        beforeEach(function () {
            grid = getGrid({ multiSelect: true });
            service = grid.selectionService;
        });

        test('when selecting valid range then returns true', function () {
            const rows = grid.rowFactory.rowCache;
            const result = service.selectRange(rows[1], rows[3]);
            expect(result).toBe(true);
        });

        test('when selecting valid range then performs selection', function () {
            const rows = grid.rowFactory.rowCache;
            service.selectRange(rows[1], rows[3]);
            expect(getSelectedIds(grid)).toEqual(['r2', 'r3', 'r4']);
            expect(service.lastClickedRow).toBe(rows[3]);
        });

        test('clears previous selection by default', function () {
            const rows = grid.rowFactory.rowCache;
            service.selectRange(rows[0], rows[3]);
            service.selectRange(rows[3], rows[5]);
            expect(getSelectedIds(grid)).toEqual(['r4', 'r5', 'r6']);
        });

        test('can specify option to keep previous selection', function () {
            const rows = grid.rowFactory.rowCache;
            service.selectRange(rows[0], rows[3]);
            service.selectRange(rows[3], rows[5], true);
            expect(getSelectedIds(grid)).toEqual(['r1', 'r2', 'r3', 'r4', 'r5', 'r6']);
        });

        describe('when selecting invalid start row', function () {
            let rows: Row[];
            let startRow: Row;

            beforeEach(function () {
                rows = grid.rowFactory.rowCache;
                startRow = rows[0];
                grid.filteredData.shift();
                grid.rowFactory.filteredDataChanged();
            });

            test('when selecting invalid start row then returns false', function () {
                const result = service.selectRange(startRow, rows[3]);
                expect(result).toBe(false);
            });

            test('when selecting invalid start row then does not perform selection', function () {
                service.selectRange(startRow, rows[3]);
                expect(grid.selectedItems().length).toBe(0);
            });

            test('when selecting invalid start row then sets last clicked row', function () {
                service.selectRange(startRow, rows[3]);
                expect(service.lastClickedRow).toBe(rows[3]);
            });
        });

        describe('when selecting invalid end row', function () {
            let rows: Row[];
            let endRow: Row;

            beforeEach(function () {
                rows = grid.rowFactory.rowCache;
                endRow = rows[8];
                grid.filteredData.pop();
                grid.rowFactory.filteredDataChanged();
            });

            test('when selecting invalid end row then returns false', function () {
                const result = service.selectRange(rows[0], endRow);
                expect(result).toBe(false);
            });

            test('when selecting invalid end row then does not perform selection', function () {
                service.selectRange(rows[0], endRow);
                expect(grid.selectedItems().length).toBe(0);
            });

            test('when selecting invalid end row then does not set last clicked row', function () {
                service.selectRange(rows[0], endRow);
                expect(service.lastClickedRow).toBeUndefined();
            });
        });
    });

    function expectNotifyCount(count: number, grid: Grid, action: () => void) {
        let notifyCount = 0;
        grid.selectedItems.subscribe(() => notifyCount++);
        action();
        expect(notifyCount).toBe(count);
    }

    function getGrid(options?: Partial<Grid>) {
        const defaults: Partial<Grid> = {
            groupColOffset: () => 0,
            columns: ko.observableArray([
                Mock.of<Column>({ field: 'num1' }),
                Mock.of<Column>({ field: 'num2' }),
                Mock.of<Column>({ field: 'num3' }),
            ]),
            config: Mock.of<GridConfig>(),
            configGroups: ko.observableArray(),
            filteredData: ko.observableArray(getData()),
            fixColumnIndexes: jest.fn(),
            minRowsToRender: () => 10,
            refreshDomSizes: jest.fn(),
            renderedRows: ko.observableArray(),
            selectedItems: ko.observableArray(),
            trigger: jest.fn(),
        };

        const grid = Mock.of<Grid>(Object.assign(defaults, options));
        Mock.extend(grid).with({
            aggregationService: { refreshGroupAggregatesAsync: jest.fn() },
            rowFactory: new RowFactory(grid),
            selectionService: new SelectionService(grid),
        });

        grid.rowFactory.filteredDataChanged();
        return grid;
    }

    function getData(): Entity[] {
        return [
            { id: 'r1', num1: 1, num2: 1, num3: 1 },
            { id: 'r2', num1: 1, num2: 1, num3: 1 },
            { id: 'r3', num1: 1, num2: 2, num3: 1 },
            { id: 'r4', num1: 1, num2: 2, num3: 1 },
            { id: 'r5', num1: 1, num2: 2, num3: 2 },
            { id: 'r6', num1: 2, num2: 1, num3: 1 },
            { id: 'r7', num1: 2, num2: 1, num3: 1 },
            { id: 'r8', num1: 2, num2: 2, num3: 1 },
            { id: 'r9', num1: 2, num2: 2, num3: 1 },
        ];
    }

    function getSelectedIds(grid: Grid): string[] {
        return grid
            .selectedItems()
            .map((x) => x.id as string)
            .sort();
    }
});
