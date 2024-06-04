import ko from 'knockout';
import { Mock } from 'ts-mockery';
import { EXCESS_ROWS } from '../../constants';
import { GridRow, Maybe, PropertyBag } from '../../types';
import utils from '../../utils';
import Column, { ColumnConfig } from '../Column';
import Grid from '../Grid';
import { GridConfig, PagingOptions } from '../grid-config';
import Group from '../Group';
import Range from '../Range';
import Row from '../Row';
import RowFactory from '../RowFactory';
import SelectionService from '../SelectionService';

describe('Row Manager Tests', function () {
    function getGrid() {
        const grid = Mock.of<Grid>({
            groupColOffset: () => 2,
            config: Mock.of<GridConfig>(),
            configGroups: ko.observableArray(),
            configureColumnWidths: jest.fn(),
            aggregationService: { refreshGroupAggregatesAsync: jest.fn() },
            filteredData: ko.observableArray([
                //48 rows
                { firstName: 'John', lastName: 'Doe', age: 45 },
                { firstName: 'Jane', lastName: 'Doe', age: 42 },
                { firstName: 'Tim', lastName: 'Smith', age: 36 },
                { firstName: 'John', lastName: 'Doe', age: 45 },
                { firstName: 'Jane', lastName: 'Doe', age: 42 },
                { firstName: 'Tim', lastName: 'Smith', age: 36 },
                { firstName: 'John', lastName: 'Doe', age: 45 },
                { firstName: 'Jane', lastName: 'Doe', age: 42 },
                { firstName: 'Tim', lastName: 'Smith', age: 36 },
                { firstName: 'John', lastName: 'Doe', age: 45 },
                { firstName: 'Jane', lastName: 'Doe', age: 42 },
                { firstName: 'Tim', lastName: 'Smith', age: 36 },
                { firstName: 'John', lastName: 'Doe', age: 45 },
                { firstName: 'Jane', lastName: 'Doe', age: 42 },
                { firstName: 'Tim', lastName: 'Smith', age: 36 },
                { firstName: 'John', lastName: 'Doe', age: 45 },
                { firstName: 'Jane', lastName: 'Doe', age: 42 },
                { firstName: 'Tim', lastName: 'Smith', age: 36 },
                { firstName: 'John', lastName: 'Doe', age: 45 },
                { firstName: 'Jane', lastName: 'Doe', age: 42 },
                { firstName: 'Tim', lastName: 'Smith', age: 36 },
                { firstName: 'John', lastName: 'Doe', age: 45 },
                { firstName: 'Jane', lastName: 'Doe', age: 42 },
                { firstName: 'Tim', lastName: 'Smith', age: 36 },
                { firstName: 'John', lastName: 'Doe', age: 45 },
                { firstName: 'Jane', lastName: 'Doe', age: 42 },
                { firstName: 'Tim', lastName: 'Smith', age: 36 },
                { firstName: 'John', lastName: 'Doe', age: 45 },
                { firstName: 'Jane', lastName: 'Doe', age: 42 },
                { firstName: 'Tim', lastName: 'Smith', age: 36 },
                { firstName: 'John', lastName: 'Doe', age: 45 },
                { firstName: 'Jane', lastName: 'Doe', age: 42 },
                { firstName: 'Tim', lastName: 'Smith', age: 36 },
                { firstName: 'John', lastName: 'Doe', age: 45 },
                { firstName: 'Jane', lastName: 'Doe', age: 42 },
                { firstName: 'Tim', lastName: 'Smith', age: 36 },
                { firstName: 'John', lastName: 'Doe', age: 45 },
                { firstName: 'Jane', lastName: 'Doe', age: 42 },
                { firstName: 'Tim', lastName: 'Smith', age: 36 },
                { firstName: 'John', lastName: 'Doe', age: 45 },
                { firstName: 'Jane', lastName: 'Doe', age: 42 },
                { firstName: 'Tim', lastName: 'Smith', age: 36 },
                { firstName: 'John', lastName: 'Doe', age: 45 },
                { firstName: 'Jane', lastName: 'Doe', age: 0 },
                { firstName: 'Tim', lastName: 'Smith', age: 36 },
                { firstName: '', lastName: 'Doe', age: 45 },
                { firstName: null, lastName: 'Doe', age: null },
                { lastName: 'Smith', age: 0 },
            ]),
            fixColumnIndexes(this: Grid): void {
                this.columns.peek().forEach(function (col, i): void {
                    col.index = i;
                });
            },
            minRowsToRender: () => 3,
            pagingOptions: Mock.of<PagingOptions>({
                currentPage: ko.observable(1),
                pageSize: ko.observable(100),
            }),
            refreshDomSizes: jest.fn(),
            renderedRows: ko.observableArray(),
            rowHeight: 30,
            selectionService: Mock.of<SelectionService>(),
            totalFixedRowWidth: () => 0,
            totalNonFixedRowWidth: () => 0,
            trigger: jest.fn(),
            visibleFixedColumns: ko.observableArray(),
            viewportDimWidth: ko.observable(300),
            viewportDimHeight: ko.observable(50),
        });

        const rowFactory = new RowFactory(grid);
        Mock.extend(grid).with({
            columns: ko.observableArray([
                new Column(
                    Mock.of<ColumnConfig>({ colDef: { field: 'spacer1' } }),
                    grid
                ),
                new Column(
                    Mock.of<ColumnConfig>({ colDef: { field: 'spacer2' } }),
                    grid
                ),
                new Column(
                    Mock.of<ColumnConfig>({ colDef: { field: 'firstName' } }),
                    grid
                ),
                new Column(
                    Mock.of<ColumnConfig>({
                        colDef: { field: 'lastName', cellFilter: (prop: any) => prop + '1' },
                    }),
                    grid
                ),
                new Column(
                    Mock.of<ColumnConfig>({ colDef: { field: 'age' } }),
                    grid
                ),
            ]),
            rowFactory,
            visibleNonFixedColumns: ko.pureComputed(() => grid.columns()),
        });

        return grid;
    }

    let grid: Grid;
    let factory: RowFactory;

    const defaultRangeBottom = 3 + EXCESS_ROWS;

    beforeEach(function () {
        grid = getGrid();
        factory = grid.rowFactory;
    });

    describe('initially', function () {
        test('many rows should be rendered', function () {
            factory.updateViewableRange(new Range(0, 3));
            expect(grid.renderedRows().length).toBe(3);
        });

        test('a single row should be rendered', function () {
            const singleRow = grid.filteredData()[0];
            grid.filteredData([singleRow]);

            factory.updateViewableRange(new Range(0, 1));
            expect(grid.renderedRows().length).toBe(1);
        });

        test("shouldn't create groups", function () {
            expect(factory.groupCache.length).toBe(0);
        });
    });

    test('RowIndex stays in tune with paging', function () {
        grid.pagingOptions.currentPage(2);
        grid.pagingOptions.pageSize(100);

        //kickoff a rendering
        factory.updateViewableRange(new Range(0, 3));

        //test the row
        const row = grid.renderedRows()[0] as Row;

        expect(row).toBeTruthy();
        expect(row.rowIndex()).toBe(1);
    });

    describe('when filtered data changed', function () {
        describe('with group', function () {
            beforeEach(function () {
                grid.configGroups.push(
                    Mock.of<Column>({ field: 'firstName' })
                );
                factory.filteredDataChanged();
            });

            test('should refresh group aggregates', () => {
                expect(grid.aggregationService.refreshGroupAggregatesAsync).toHaveBeenCalled();
            });

            test('should get groupings', function () {
                expect(factory.groupCache.length).toBe(4);
            });

            test('should add group columns', function () {
                const cols = grid.columns();
                expect(cols.map((x) => x.field)).toEqual([
                    'spacer1',
                    'spacer2',
                    '',
                    'firstName',
                    'lastName',
                    'age',
                ]);
                expect(cols.map((x) => x.index)).toEqual([0, 1, 2, 3, 4, 5]);
                expect(cols.map((x) => x.isGroupCol)).toEqual([
                    false,
                    false,
                    true,
                    false,
                    false,
                    false,
                ]);
            });

            test('group column should have expected properties', function () {
                const col = grid.columns()[2];
                expect(col.field).toBe('');
                expect(col.width).toBe(25);
                expect(col.sortable).toBe(false);
                expect(col.resizable).toBe(false);
                expect(col.headerCellTemplate).toBe('<div class="kgGroupHeader"></div>');
                expect(col.isGroupCol).toBe(true);
            });

            test('group column should not be visible if it is the only one', function () {
                expect(grid.columns()[2].visible()).toBe(false);
            });
        });

        test('with multiple groups should add group columns', function () {
            grid.configGroups([
                Mock.of<Column>({ field: 'firstName' }),
                Mock.of<Column>({ field: 'lastName' }),
            ]);
            factory.filteredDataChanged();

            const cols = grid.columns();
            expect(cols.map((x) => x.field)).toEqual([
                'spacer1',
                'spacer2',
                '',
                '',
                'firstName',
                'lastName',
                'age',
            ]);
            expect(cols.map((x) => x.index)).toEqual([0, 1, 2, 3, 4, 5, 6]);
            expect(cols.map((x) => x.isGroupCol)).toEqual([
                false,
                false,
                true,
                true,
                false,
                false,
                false,
            ]);
            expect(cols.map((x) => x.visible())).toEqual([
                true,
                true,
                true,
                false,
                true,
                true,
                true,
            ]);
        });

        test('group column with depth <= 1 should have kgGroupColumn--head class', function () {
            grid.configGroups([
                Mock.of<Column>({ field: 'firstName' }),
                Mock.of<Column>({ field: 'lastName' }),
                Mock.of<Column>({ field: 'age' }),
            ]);
            factory.filteredDataChanged();
            expect(grid.columns()[3].headerClass).toContain('kgGroupColumn--head');
            expect(grid.columns()[4].headerClass).toContain('kgGroupColumn--head');
        });

        test('group column with depth > 1 should have kgGroupColumn--tail class', function () {
            grid.configGroups([
                Mock.of<Column>({ field: 'firstName' }),
                Mock.of<Column>({ field: 'lastName' }),
                Mock.of<Column>({ field: 'age' }),
            ]);
            factory.filteredDataChanged();
            expect(grid.columns()[2].headerClass).toContain('kgGroupColumn--tail');
        });

        test('with group and no data then should add group columns', function () {
            grid.filteredData.removeAll();
            grid.configGroups([Mock.of<Column>({ field: 'firstName' })]);
            factory.filteredDataChanged();
            expect(grid.columns().map((x) => x.isGroupCol)).toEqual([
                false,
                false,
                true,
                false,
                false,
                false,
            ]);
        });

        test('should render changes', function () {
            let notifyCount = 0;
            grid.renderedRows.subscribe(() => notifyCount++);
            factory.filteredDataChanged();
            expect(notifyCount).toBe(1);
            expect(grid.refreshDomSizes).toHaveBeenCalled();
        });
    });

    describe('row caching when filtered data changed', function () {
        beforeEach(function () {
            const data = [];
            for (let i = 0; i < 20; i++) {
                data.push({ value: i });
            }
            grid.filteredData(data);
            factory.filteredDataChanged();
        });

        test('when adding new entity to the end then reuses previously built rows', function () {
            const rows1 = factory.rowCache.slice();
            factory.updateViewableRange(new Range(7, 26));

            const newEntity = { value: 20 };
            grid.filteredData.push(newEntity);
            factory.filteredDataChanged();

            const rows2 = factory.rowCache;
            expect(rows2.length).toBe(21);

            for (let i = 7; i < 21; i++) {
                expect(rows2[i].entity.value).toBe(i);
                if (i < 11) {
                    expect(rows2[i]).toBe(rows1[i]);
                }
            }
        });

        test('when deleting entity from the middle then reuses previously built rows for smaller indexes', function () {
            const rows1 = factory.rowCache.slice();
            grid.filteredData.splice(5, 1);
            factory.filteredDataChanged();

            const rows2 = factory.rowCache;
            expect(rows2.length).toBe(11);

            let i;
            for (i = 0; i < 5; i++) {
                expect(rows2[i]).toBe(rows1[i]);
            }
            for (; i < 10; i++) {
                expect(rows2[i].entity.value).toBe(i + 1);
                expect(rows2[i].rowIndex()).toBe(rows1[i].rowIndex());
                expect(rows2[i]).not.toBe(rows1[i]);
            }
            expect(rows2[i].entity.value).toBe(i + 1);
        });

        test('when adding new entity to the start then does not reuse previously built rows', function () {
            const rows1 = factory.rowCache.slice();
            grid.filteredData.splice(0, 0, { value: -1 });
            factory.filteredDataChanged();

            const rows2 = factory.rowCache;
            for (let i = 0; i < rows1.length - 1; i++) {
                expect(rows2[i + 1].rowIndex()).toBe(rows1[i].rowIndex() + 1);
                expect(rows2[i + 1]).not.toBe(rows1[i]);
            }
        });

        test('when clearing entities then should clear row cache', function () {
            grid.filteredData.removeAll();
            factory.filteredDataChanged();
            expect(factory.rowCache.length).toBe(0);
        });

        test('limits size of reused rows to rendered range', function () {
            const rows1 = factory.rowCache.slice();
            factory.updateViewableRange(new Range(7, 26));
            factory.filteredDataChanged();
            factory.updateViewableRange(new Range(0, 11));
            factory.filteredDataChanged();

            const rows2 = factory.rowCache;
            expect(rows2.length).toBe(11);

            let i;
            for (i = 0; i < 7; i++) {
                expect(rows2[i].rowIndex()).toBe(rows1[i].rowIndex());
                expect(rows2[i]).not.toBe(rows1[i]);
            }
            for (; i < 11; i++) {
                expect(rows2[i]).toBe(rows1[i]);
            }
        });

        test('when removing groups then rebuilds row cache correctly', function () {
            factory.updateViewableRange(new Range(0, 10));
            grid.configGroups.push(
                Mock.of<Column>({ field: 'firstName' })
            );
            factory.filteredDataChanged();
            factory.groupCache[0].toggleExpand();
            grid.configGroups.removeAll();
            factory.filteredDataChanged();

            const rows = factory.rowCache;
            expect(rows.length).toBe(10);

            for (let i = 0; i < 10; i++) {
                expect(rows[i].rowIndex()).toBe(i + 1);
                expect(rows[i].entity.value).toBe(i);
            }
        });
    });

    describe('when rendering changes', function () {
        describe('with no groups', function () {
            let rows: Row[];
            beforeEach(function () {
                factory.renderedChange();
                rows = grid.renderedRows() as Row[];
            });

            test('should only render entity rows within render range', function () {
                expect(rows.length).toBe(defaultRangeBottom);
            });

            test('should provide row index', function () {
                rows.forEach((row, i): void => {
                    expect(row.rowIndex()).toBe(i + 1);
                });
            });

            test('should set offset top', function () {
                rows.forEach((row, i): void => {
                    expect(row.offsetTop()).toBe((30 * i).toString() + 'px');
                });
            });

            test('should cache row', function () {
                rows.forEach((row, i): void => {
                    expect(factory.rowCache[i]).toBe(row);
                });
            });

            test('should refresh dom sizes', function () {
                expect(grid.refreshDomSizes).toHaveBeenCalled();
            });

            test('and then rendering again should use cache', function () {
                expect(factory.rowCache.length).toBe(defaultRangeBottom);

                factory.renderedChange();
                const rows = grid.renderedRows() as Row[];

                expect(rows.length).toBe(defaultRangeBottom);
                expect(factory.rowCache.length).toBe(defaultRangeBottom);
            });
        });

        describe('with group', function () {
            let rows: GridRow[];
            beforeEach(function () {
                grid.configGroups.push(
                    Mock.of<Column>({ field: 'firstName' })
                );
                factory.filteredDataChanged();
                rows = grid.renderedRows();
            });

            test('then should hide all non-group entities', function () {
                expect(rows.length).toBe(4);
                let row = rows[0] as Group;
                expect(row.label).toBe('John');
                row = rows[1] as Group;
                expect(row.label).toBe('Jane');
                row = rows[2] as Group;
                expect(row.label).toBe('Tim');
                row = rows[3] as Group;
                expect(row.label).toBe('null');
            });

            test('when non-group entities then become visible should render them within range', function () {
                rows.forEach((x) => (x as Group).toggleExpand());
                rows = grid.renderedRows();

                expect(rows.length).toBe(defaultRangeBottom);
                let groupRow = rows[0] as Group;
                expect(groupRow.label).toBe('John');
                rows.slice(1).forEach((gridRow) => {
                    let row = gridRow as Row;
                    expect(row.entity.firstName).toBe('John');
                });
            });

            test('and with cell filter then should use filter', function () {
                grid.configGroups([Mock.of<Column>({ field: 'lastName' })]);
                factory.filteredDataChanged();
                rows = grid.renderedRows();

                expect(rows.length).toBe(2);
                let row = rows[0] as Group;
                expect(row.label).toBe('Doe1');
                row = rows[1] as Group;
                expect(row.label).toBe('Smith1');
            });

            test('then should refresh dom sizes', function () {
                expect(grid.refreshDomSizes).toHaveBeenCalled();
            });

            test('can collapse group entities', function () {
                rows.forEach((x) => (x as Group).toggleExpand());
                (rows[0] as Group).toggleExpand();
                rows = grid.renderedRows();

                expect(rows.length).toBe(defaultRangeBottom);
                expect((rows[0] as Group).label).toBe('John');
                expect((rows[1] as Group).label).toBe('Jane');
                rows.slice(2).forEach((gridRow) => {
                    let row = gridRow as Row;
                    expect(row.entity.firstName).toBe('Jane');
                });
            });
        });

        describe('with multiple groups', function () {
            beforeEach(function () {
                grid.configGroups([
                    Mock.of<Column>({ field: 'firstName' }),
                    Mock.of<Column>({ field: 'age' }),
                ]);
                factory.filteredDataChanged();
            });

            test('then rows should render in a hierarchy', function () {
                const rows = grid.renderedRows();
                expect(rows.length).toBe(11);

                let row = rows[0] as Group;
                expect(row.label).toBe('John');
                expect(row.groupChildren.length).toBe(1);
                expect(row.groupChildren[0]).toBe(rows[1]);
                row = rows[1] as Group;
                expect(row.label).toBe('45');
                expect(row.parent).toBe(rows[0]);

                row = rows[2] as Group;
                expect(row.label).toBe('Jane');
                expect(row.groupChildren.length).toBe(2);
                expect(row.groupChildren[0]).toBe(rows[3]);
                expect(row.groupChildren[1]).toBe(rows[4]);
                row = rows[3] as Group;
                expect(row.label).toBe('42');
                expect(row.parent).toBe(rows[2]);
                row = rows[4] as Group;
                expect(row.label).toBe('0');
                expect(row.parent).toBe(rows[2]);

                row = rows[5] as Group;
                expect(row.label).toBe('Tim');
                expect(row.groupChildren.length).toBe(1);
                expect(row.groupChildren[0]).toBe(rows[6]);
                row = rows[6] as Group;
                expect(row.label).toBe('36');
                expect(row.parent).toBe(rows[5]);

                row = rows[7] as Group;
                expect(row.label).toBe('null');
                expect(row.groupChildren.length).toBe(3);
                expect(row.groupChildren[0]).toBe(rows[8]);
                expect(row.groupChildren[1]).toBe(rows[9]);
                expect(row.groupChildren[2]).toBe(rows[10]);
                row = rows[8] as Group;
                expect(row.label).toBe('45');
                expect(row.parent).toBe(rows[7]);
                row = rows[9] as Group;
                expect(row.label).toBe('null');
                expect(row.parent).toBe(rows[7]);
                row = rows[10] as Group;
                expect(row.label).toBe('0');
                expect(row.parent).toBe(rows[7]);
            });

            test('can remove single group', function () {
                grid.configGroups.remove(grid.configGroups()[0]);
                factory.filteredDataChanged();

                const labels = grid.renderedRows().map((x) => (x as Group).label);
                expect(labels).toEqual(['45', '42', '36', '0', 'null']);
                expect(factory.groupCache.length).toBe(5);
            });

            test('can remove all groups', function () {
                grid.configGroups.removeAll();
                factory.filteredDataChanged();

                const rows = grid.renderedRows();
                expect(rows.length).toBe(defaultRangeBottom);
                rows.forEach((x) => expect(x.isGroupRow).toBe(false));
                expect(factory.groupCache.length).toBe(0);
            });
        });

        describe('with group and no data', function () {
            test('should have no rows', function () {
                grid.filteredData.removeAll();
                grid.configGroups.push(
                    Mock.of<Column>({ field: 'firstName' })
                );
                factory.filteredDataChanged();
                expect(grid.renderedRows().length).toBe(0);
            });
        });

        describe('with group and custom group property evaluator', function () {
            test('should group by evaluated value', function () {
                Mock.extend(grid.config).with({
                    evalPropertyForGroup: function (entity, colDef) {
                        const address = entity.address as Maybe<PropertyBag>;
                        return colDef.field !== 'address' || !address
                            ? utils.evalProperty(entity, colDef.field)
                            : address.line1 + ', ' + address.line2;
                    },
                });

                const data = grid.filteredData();
                data[0].address = { line1: 'Unit 1', line2: '123 St' };
                data[1].address = { line1: 'Unit 2', line2: '456 St' };
                data[2].address = { line1: 'Unit 1', line2: '123 St' };

                const col = new Column(
                    Mock.of<ColumnConfig>({ colDef: { field: 'address' } }),
                    grid
                );
                grid.columns.push(col);
                grid.configGroups.push(col);
                factory.filteredDataChanged();

                const rows = grid.renderedRows();
                expect(rows.length).toBe(3);

                let row = rows[0] as Group;
                expect(row.label).toBe('Unit 1, 123 St');
                expect(row.children.length).toBe(2);

                row = rows[1] as Group;
                expect(row.label).toBe('Unit 2, 456 St');
                expect(row.children.length).toBe(1);

                row = rows[2] as Group;
                expect(row.label).toBe('null');
                expect(row.children.length).toBe(45);
            });
        });
    });

    describe('row entities', function () {
        test('given no groups then is filtered data', function () {
            expect(factory.rowEntities()).toBe(grid.filteredData());
        });

        test('given groups then is filtered data including group entities', function () {
            grid.configGroups.push(
                Mock.of<Column>({ field: 'firstName' })
            );
            factory.filteredDataChanged();

            const data = grid.filteredData();
            const result = factory.rowEntities();
            expect(result.length).toBe(data.length + 4);

            const johns = data.filter((x) => x.firstName === 'John');
            expect(factory.isGroupEntity(result[0])).toBe(true);
            expect(result[0].label).toBe('John');
            for (let i = 0; i < johns.length; i++) {
                expect(factory.isGroupEntity(result[i + 1])).toBe(false);
                expect(result[i + 1]).toBe(johns[i]);
            }

            const janes = data.filter((x) => x.firstName === 'Jane');
            expect(factory.isGroupEntity(result[johns.length + 1])).toBe(true);
            expect(result[johns.length + 1].label).toBe('Jane');
            for (let i = 0; i < janes.length; i++) {
                expect(factory.isGroupEntity(result[johns.length + 2 + i])).toBe(false);
                expect(result[johns.length + 2 + i]).toBe(janes[i]);
            }
        });
    });
});
