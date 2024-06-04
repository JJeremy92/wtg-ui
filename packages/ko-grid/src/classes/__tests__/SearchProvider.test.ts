import ko from 'knockout';
import { Mock } from 'ts-mockery';
import { Entity } from '../../types';
import Column from '../Column';
import Grid from '../Grid';
import { FilterOptions, GridConfig } from '../grid-config';
import RowFactory from '../RowFactory';
import SearchProvider from '../SearchProvider';

describe('search provider', function () {
    interface DataItem extends Entity {
        column1: ko.ObservableArray<string>;
        column2: string;
        column3: string;
    }

    function getData(): DataItem[] {
        const parent = {
            column1: '0000',
            column2: ko.observable('ABBA'),
            column3: '542',
        };
        const item1 = Object.setPrototypeOf(parent, { column4: 'AAA' });
        const item2 = {
            column1: '1111',
            column2: ko.observable('TOTO'),
            column3: '3935',
        };
        const item3 = {
            column1: '2222',
            column2: ko.observable('ACDC'),
            column3: '1293',
        };
        const item4 = {
            column1: '3333',
            column2: ko.observable('ACDC'),
            column3: '6283',
        };
        const item5 = {
            column1: '4444',
            column2: ko.observable('KISS'),
            column3: '6281',
        };
        const item6 = {
            column1: '5555',
            column2: ko.observable('WHAM'),
            column3: null,
        };

        return [item1, item2, item3, item4, item5, item6];
    }

    function getGrid(filterOptions?: Partial<FilterOptions>) {
        const grid = getGridCore(filterOptions);
        Mock.extend(grid).with({ searchProvider: new SearchProvider(grid) });

        return grid;
    }

    function getGridCore(filterOptions?: Partial<FilterOptions>) {
        const data = getData();

        const config = Mock.of<GridConfig>({
            filterOptions: Mock.of<FilterOptions>(filterOptions),
        });

        const rowFactory = Mock.of<RowFactory>({ filteredDataChanged: jest.fn() });

        const grid = Mock.of<Grid>({
            columns: ko.observableArray(),
            config: config,
            filteredData: ko.observableArray(data),
            filterText: ko.observable(''),
            rowFactory: rowFactory,
            sortedData: ko.observableArray(data),
        });

        return grid;
    }

    test('data is unfiltered initially', function () {
        const grid = getGrid();
        expect(grid.searchProvider).toBeTruthy();
        expect(grid.filteredData().length).toBe(6);
    });

    test('does not evaluate filter initially', function () {
        let notifyCount = 0;
        const grid = getGridCore();
        grid.filteredData.subscribe(() => notifyCount++);
        Mock.extend(grid).with({ searchProvider: new SearchProvider(grid) });
        expect(notifyCount).toBe(0);
    });

    describe('when filtering', function () {
        test('with one condition', function () {
            const grid = getGrid();
            grid.filterText('00');

            expect((grid.filteredData()[0] as DataItem).column1).toBe('0000');
            expect(grid.filteredData().length).toBe(1);
        });

        test('and then resetting the filter', function () {
            const grid = getGrid();
            grid.filterText('00');
            grid.filterText('');

            expect(grid.filteredData().length).toBe(6);
        });

        test('with two conditions', function () {
            const grid = getGrid();
            grid.filterText('3$;ACD');

            expect(grid.filteredData().length).toBe(2);
            expect((grid.filteredData()[0] as DataItem).column1).toBe('2222');
            expect((grid.filteredData()[1] as DataItem).column1).toBe('3333');
        });

        test('with empty condition should ignore the empty one', function () {
            const grid = getGrid();
            grid.filterText(';00');

            expect(grid.filteredData().length).toBe(1);
        });

        test('filteredDataChanged should get called', function () {
            const grid = getGrid();
            grid.filterText('5');

            expect(grid.rowFactory.filteredDataChanged).toHaveBeenCalled();
        });

        test('with External Filtering should ignore internal filtering', function () {
            const grid = getGrid({ useExternalFilter: true });

            grid.filterText('5');
            expect(grid.rowFactory.filteredDataChanged).not.toHaveBeenCalled();
            expect(grid.filteredData().length).toBe(6);
        });

        test('with Throttling should throttle filter text processing', function (done) {
            expect.assertions(2);
            const grid = getGrid({ filterThrottle: 100 });

            grid.filteredData.subscribe((data) => {
                expect(data.length).toBe(1);
                expect((data[0] as DataItem).column1).toBe('1111');
                done();
            });

            grid.filterText('0000');
            grid.filterText('1111'); // only the second call should be processed because throttling
        });

        describe('with destroyed item', function () {
            let grid: Grid;

            beforeEach(function () {
                grid = getGrid();
                const entity = grid.sortedData()[0];
                grid.sortedData.destroy(entity);
            });

            test('and no filter text should skip', function () {
                grid.searchProvider.evalFilter();
                expect(grid.filteredData().length).toBe(5);
                expect(grid.filteredData()[0]).toBe(grid.sortedData()[1]);
            });

            test('and filter text should skip', function () {
                grid.filterText('^A');
                expect(grid.filteredData().length).toBe(2);
            });
        });

        describe('with null item (race condition)', function () {
            let grid: Grid;
            let entities: Entity[];

            beforeEach(function () {
                grid = getGrid();
                entities = grid.sortedData();
                Mock.extend(grid).with({ sortedData: ko.observableArray([...entities, null]) });
            });

            test('and no filter text should skip', function () {
                grid.searchProvider.evalFilter();
                expect(grid.filteredData().length).toBe(6);
                expect(grid.filteredData()).toEqual(entities);
            });

            test('and filter text should skip', function () {
                grid.filterText('^A');
                expect(grid.filteredData().length).toBe(3);
            });
        });

        describe('by column', function () {
            let grid: Grid;

            beforeEach(function () {
                const column1 = Mock.of<Column>();
                const column1properties: Partial<Column> = {
                    field: 'column1',
                    displayName: ko.observable('Column One'),
                };
                Mock.extend(column1).with(column1properties);

                const column2 = Mock.of<Column>();
                const column2properties: Partial<Column> = {
                    field: 'column2',
                    displayName: ko.observable('Column Two'),
                };
                Mock.extend(column2).with(column2properties);

                const column3 = Mock.of<Column>();
                const column3properties: Partial<Column> = {
                    field: 'column3',
                    displayName: ko.observable('Column Three'),
                };
                Mock.extend(column3).with(column3properties);

                grid = getGrid();
                grid.columns([column1, column2, column3]);
            });

            test('with proper name should only search in that column', function () {
                grid.filterText('column1:3$');

                expect(grid.filteredData().length).toBe(1);
            });

            test('with friendly name should only search in that column', function () {
                grid.filterText('columnone:3$');

                expect(grid.filteredData().length).toBe(1);
            });

            test('with bad column name should find nothing', function () {
                grid.filterText('column4:3$');

                expect(grid.filteredData().length).toBe(0);
            });

            test('with empty column name should ignore', function () {
                grid.filterText(':3$');

                expect(grid.filteredData().length).toBe(6);
            });
        });

        test('with bad regex should escape regex metacharacters', function () {
            const grid = getGrid();
            grid.filterText('A/\\');

            expect(grid.filteredData().length).toBe(0);
        });
    });
});
