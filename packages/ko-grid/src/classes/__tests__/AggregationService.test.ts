import ko from 'knockout';
import { Mock } from 'ts-mockery';
import { AggregateOperation, GridEventType } from '../../constants';
import { Entity } from '../../types';
import utils from '../../utils';
import { nextEventLoop } from '../../__tests__/test-utils';
import { AggregationService } from '../AggregationService';
import Column, { ColumnConfig } from '../Column';
import Aggregation, {
    AggregationProvider,
    AggregationResult, DefaultAggregationProvider
} from '../DefaultAggregationProvider';
import Grid from '../Grid';
import { GridConfig } from '../grid-config';
import Group from '../Group';
import RowFactory from '../RowFactory';

describe('aggregation', function () {
    let grid: Grid;

    beforeEach(() => {
        grid = Mock.of<Grid>({
            aggregateResults: ko.observableArray(),
            minRowsToRender: () => 10,
            trigger: jest.fn(),
        });

        Mock.extend(grid).with({
            aggregationService: { refreshGroupAggregatesAsync: jest.fn() },
            rowFactory: new RowFactory(grid),
        });
    });

    test('toggling aggregation status should return the correct state of whether the column is being aggregated', async () => {
        const aggregationService = new AggregationService(
            grid,
            new DefaultAggregationProvider(
                () => [
                    { num: 12, bar: 'b' },
                    { num: 2, bar: 'y' },
                    { num: 1, bar: 'z' },
                    { num: 992, bar: 'x' },
                ],
                evalPropertyAsync
            )
        );

        expect(aggregationService.isAggregating('num', AggregateOperation.Total)).toBe(false);
        expect(aggregationService.isAggregating('num', AggregateOperation.Average)).toBe(false);

        await aggregationService.addAggregateColumnAsync('num', AggregateOperation.Total);
        expect(aggregationService.isAggregating('num', AggregateOperation.Total)).toBe(true);
        expect(aggregationService.isAggregating('num', AggregateOperation.Average)).toBe(false);

        await aggregationService.toggleAggregateAsync('num', AggregateOperation.Total);
        expect(aggregationService.isAggregating('num', AggregateOperation.Total)).toBe(false);
        expect(aggregationService.isAggregating('num', AggregateOperation.Average)).toBe(false);

        await aggregationService.toggleAggregateAsync('num', AggregateOperation.Total);
        expect(aggregationService.isAggregating('num', AggregateOperation.Total)).toBe(true);
        expect(aggregationService.isAggregating('num', AggregateOperation.Average)).toBe(false);

        aggregationService.removeAggregateColumn('num', AggregateOperation.Total);
        expect(aggregationService.isAggregating('num', AggregateOperation.Total)).toBe(false);
        expect(aggregationService.isAggregating('num', AggregateOperation.Average)).toBe(false);
    });

    test('when overriding aggregation infos, previous aggregation status should be cleared', async () => {
        const aggregationService = new AggregationService(
            grid,
            new DefaultAggregationProvider(
                () => [
                    { num: 12, bar: 'b' },
                    { num: 2, bar: 'y' },
                    { num: 1, bar: 'z' },
                    { num: 992, bar: 'x' },
                ],
                evalPropertyAsync
            )
        );

        await aggregationService.addAggregateColumnAsync('num', AggregateOperation.Total);
        expect(aggregationService.isAggregating('num', AggregateOperation.Total)).toBe(true);

        await aggregationService.overrideAggregateInfosAsync([
            { field: 'num', operations: [AggregateOperation.Average] },
        ]);
        expect(aggregationService.isAggregating('num', AggregateOperation.Total)).toBe(false);
        expect(aggregationService.isAggregating('num', AggregateOperation.Average)).toBe(true);
    });

    test('adding and removing a column to aggregation config', async function () {
        const aggregationService = new AggregationService(
            grid,
            new DefaultAggregationProvider(
                () => [
                    { num: 12, bar: 'b' },
                    { num: 2, bar: 'y' },
                    { num: 1, bar: 'z' },
                    { num: 992, bar: 'x' },
                ],
                evalPropertyAsync
            )
        );

        await aggregationService.addAggregateColumnAsync('num', AggregateOperation.Total);
        const aggregateConfig = aggregationService.aggregateConfig;
        expect(aggregateConfig.length).toBe(1);
        expect(aggregateConfig[0].field).toBe('num');
        expect(aggregateConfig[0].operations).toEqual([AggregateOperation.Total]);

        await aggregationService.addAggregateColumnAsync('num', AggregateOperation.Average);
        expect(aggregateConfig.length).toBe(1);
        expect(aggregateConfig[0].field).toBe('num');
        expect(aggregateConfig[0].operations).toEqual([
            AggregateOperation.Total,
            AggregateOperation.Average,
        ]);

        let aggResults = grid.aggregateResults();
        expect(aggResults.length).toBe(2);
        expect(aggResults[0].field).toBe('num');
        expect(aggResults[0].operation).toBe(AggregateOperation.Total);
        expect(aggResults[0].result).toBe(1007);
        expect(aggResults[1].field).toBe('num');
        expect(aggResults[1].operation).toBe(AggregateOperation.Average);
        expect(aggResults[1].result).toBe(251.75);

        aggregationService.removeAggregateColumn('num', AggregateOperation.Total);
        expect(aggregateConfig.length).toBe(1);
        aggResults = grid.aggregateResults();
        expect(aggResults.length).toBe(1);

        aggregationService.removeAggregateColumn('num', AggregateOperation.Average);
        expect(aggregateConfig.length).toBe(0);
        aggResults = grid.aggregateResults();
        expect(aggResults.length).toBe(0);
    });

    test('adding same aggregate twice should only have 1 aggregate result', async function () {
        const aggregationService = new AggregationService(
            grid,
            new DefaultAggregationProvider(() => [{ num: 12 }, { num: 992 }], evalPropertyAsync)
        );

        await aggregationService.addAggregateColumnAsync('num', AggregateOperation.Total);
        await aggregationService.addAggregateColumnAsync('num', AggregateOperation.Total);
        let aggregateResults = grid.aggregateResults();
        expect(aggregateResults.length).toBe(1);
        expect(aggregateResults[0].field).toBe('num');
        expect(aggregateResults[0].operation).toBe(AggregateOperation.Total);
        expect(aggregateResults[0].result).toBe(1004);
        expect(aggregationService.aggregateConfig).toEqual([
            { field: 'num', operations: [AggregateOperation.Total] },
        ]);
    });

    test('adding same aggregate twice without waiting for the first one should only have 1 aggregate result', async function () {
        const aggregationService = new AggregationService(
            grid,
            new DefaultAggregationProvider(() => [{ num: 12 }, { num: 992 }], evalPropertyAsync)
        );

        const promiseFirst = aggregationService.addAggregateColumnAsync(
            'num',
            AggregateOperation.Total
        );
        await aggregationService.addAggregateColumnAsync('num', AggregateOperation.Total);
        await promiseFirst;
        let aggregateResults = grid.aggregateResults();
        expect(aggregateResults.length).toBe(1);
        expect(aggregateResults[0].field).toBe('num');
        expect(aggregateResults[0].operation).toBe(AggregateOperation.Total);
        expect(aggregateResults[0].result).toBe(1004);
        expect(aggregationService.aggregateConfig).toEqual([
            { field: 'num', operations: [AggregateOperation.Total] },
        ]);
    });

    test('updating aggregation results should notify at most twice', async function () {
        const aggregationService = new AggregationService(
            grid,
            new DefaultAggregationProvider(
                () => [
                    { num: 12, bar: 'b' },
                    { num: 2, bar: 'y' },
                    { num: 1, bar: 'z' },
                    { num: 992, bar: 'x' },
                ],
                evalPropertyAsync
            )
        );

        let callCount = 0;
        grid.aggregateResults.subscribe((): void => {
            callCount++;
        });
        await aggregationService.addAggregateColumnAsync('num', AggregateOperation.Total);
        expect(callCount).toBe(1);
        await aggregationService.addAggregateColumnAsync('num', AggregateOperation.Average);
        expect(callCount).toBe(3);
        await aggregationService.addAggregateColumnAsync('bar', AggregateOperation.Total);
        expect(callCount).toBe(4);
        aggregationService.removeAggregateColumn('bar', AggregateOperation.Total);
        expect(callCount).toBe(5);
        aggregationService.removeAggregateColumn('bar', AggregateOperation.Average);
        expect(callCount).toBe(5);
    });

    test('adding and removing a column to aggregation config - non numeric', async function () {
        const aggregationService = new AggregationService(
            grid,
            new DefaultAggregationProvider(
                () => [
                    { num: 12, bar: 'b' },
                    { num: 2, bar: 'y' },
                    { num: 1, bar: 'z' },
                    { num: 992, bar: 'x' },
                ],
                evalPropertyAsync
            )
        );

        await aggregationService.addAggregateColumnAsync('bar', AggregateOperation.Total);

        expect(aggregationService.aggregateConfig.length).toBe(1);
        expect(aggregationService.aggregateConfig[0].field).toBe('bar');
        expect(aggregationService.aggregateConfig[0].operations).toEqual([
            AggregateOperation.Total,
        ]);

        let aggResults = grid.aggregateResults();
        expect(aggResults.length).toBe(1);
        expect(aggResults[0].field).toBe('bar');
        expect(aggResults[0].operation).toBe(AggregateOperation.Total);
        expect(aggResults[0].result).toBe(0);

        aggregationService.removeAggregateColumn('bar', AggregateOperation.Total);
        expect(aggregationService.aggregateConfig.length).toBe(0);
        aggResults = grid.aggregateResults();
        expect(aggResults.length).toBe(0);
    });

    test('removing a field or operation which is not in aggregation config', async function () {
        const aggregationService = new AggregationService(
            grid,
            new DefaultAggregationProvider(
                () => [
                    { num: 12, bar: 'b' },
                    { num: 2, bar: 'y' },
                    { num: 1, bar: 'z' },
                    { num: 992, bar: 'x' },
                ],
                evalPropertyAsync
            )
        );

        await aggregationService.addAggregateColumnAsync('num', AggregateOperation.Total);

        expect(aggregationService.aggregateConfig.length).toBe(1);

        aggregationService.removeAggregateColumn('bar', AggregateOperation.Total);
        expect(aggregationService.aggregateConfig.length).toBe(1);

        aggregationService.removeAggregateColumn('num', AggregateOperation.Average);
        expect(aggregationService.aggregateConfig.length).toBe(1);
    });

    test('when removing an aggregation it will cancel the pending aggregation calculations and keep the results that still needs', async () => {
        const calculateSpy = jest.fn();
        const aggregationProvider = Mock.of<AggregationProvider>({
            calculateAggregationsAsync: calculateSpy,
        });

        const aggregationService = new AggregationService(grid, aggregationProvider);

        let calculationFirstResolver: (value: AggregationResult[]) => void;
        let calculationSecondResolver: (value: AggregationResult[]) => void;
        calculateSpy.mockImplementation(
            (aggregation: Aggregation): Promise<AggregationResult[]> => {
                const operations = aggregation.operations;
                if (operations.length === 1 && operations[0] === AggregateOperation.Average) {
                    return new Promise((resolve) => (calculationFirstResolver = resolve));
                } else if (operations.length === 2) {
                    return new Promise((resolve) => (calculationSecondResolver = resolve));
                } else {
                    return Promise.reject('this should not happen');
                }
            }
        );

        const overridePromise = aggregationService.overrideAggregateInfosAsync([
            {
                field: 'num',
                operations: [AggregateOperation.Average, AggregateOperation.Total],
            },
        ]);
        aggregationService.removeAggregateColumn('num', AggregateOperation.Average);

        const averageResult = Mock.of<AggregationResult>({
            field: 'num',
            operation: AggregateOperation.Average,
            result: 502,
        });
        const totalResult = Mock.of<AggregationResult>({
            field: 'num',
            operation: AggregateOperation.Total,
            result: 1004,
        });

        calculationFirstResolver!([averageResult]);
        calculationSecondResolver!([averageResult, totalResult]);

        await overridePromise;

        expect(grid.aggregateResults()).toEqual([totalResult]);
        expect(aggregationService.aggregateConfig).toEqual([
            {
                field: 'num',
                operations: [AggregateOperation.Total],
            },
        ]);
    });

    test('when removing all aggregation it will cancel the pending aggregation calculations and have empty aggregation results', async () => {
        const calculateSpy = jest.fn();
        const aggregationProvider = Mock.of<AggregationProvider>({
            calculateAggregationsAsync: calculateSpy,
        });

        const aggregationService = new AggregationService(grid, aggregationProvider);

        let calculationResolver: (value: AggregationResult[]) => void;
        calculateSpy.mockReturnValueOnce(new Promise((resolve) => (calculationResolver = resolve)));

        const overridePromise = aggregationService.overrideAggregateInfosAsync([
            {
                field: 'num',
                operations: [AggregateOperation.Average],
            },
        ]);
        aggregationService.removeAggregateColumn('num', AggregateOperation.Average);

        calculationResolver!([
            Mock.of<AggregationResult>({
                field: 'num',
                operation: AggregateOperation.Average,
                result: 502,
            }),
        ]);

        await overridePromise;

        expect(grid.aggregateResults()).toEqual([]);
        expect(aggregationService.aggregateConfig).toEqual([]);
    });

    test('overriding aggregation settings always keeps the last one', async () => {
        const calculateSpy = jest.fn();
        const aggregationProvider = Mock.of<AggregationProvider>({
            calculateAggregationsAsync: calculateSpy,
        });

        const aggregationService = new AggregationService(grid, aggregationProvider);

        let firstCallResolve: (value: AggregationResult[]) => void;
        calculateSpy.mockReturnValueOnce(new Promise((resolve) => (firstCallResolve = resolve)));
        const aggregateInfos = [{ field: 'num', operations: [AggregateOperation.Average] }];

        const promiseFirstOverride = aggregationService.overrideAggregateInfosAsync(aggregateInfos);

        const expectedResult = Mock.of<AggregationResult>({
            field: 'num',
            operation: AggregateOperation.Total,
            result: 1004,
        });
        calculateSpy.mockResolvedValueOnce([expectedResult]);
        const secondAggregateInfos = [{ field: 'num', operations: [AggregateOperation.Total] }];
        await aggregationService.overrideAggregateInfosAsync(secondAggregateInfos);

        expect(grid.aggregateResults()).toEqual([expectedResult]);
        expect(aggregationService.aggregateConfig).toEqual(secondAggregateInfos);

        firstCallResolve!([
            Mock.of<AggregationResult>({
                field: 'num',
                operation: AggregateOperation.Average,
                result: 502,
            }),
        ]);

        await promiseFirstOverride;

        expect(grid.aggregateResults()).toEqual([expectedResult]);
        expect(aggregationService.aggregateConfig).toEqual(secondAggregateInfos);
    });

    test('overriding aggregation settings updates aggregation results', async () => {
        const aggregateInfos = [{ field: 'num', operations: [AggregateOperation.Average] }];
        const aggregationService = new AggregationService(
            grid,
            new DefaultAggregationProvider(
                () => [{ num: 12 }, { num: 1 }, { num: 992 }],
                evalPropertyAsync
            )
        );

        expect(aggregationService.aggregateConfig).toEqual([]);
        await aggregationService.overrideAggregateInfosAsync(aggregateInfos);

        expect(aggregationService.aggregateConfig).toEqual(aggregateInfos);
        const aggregateResults = grid.aggregateResults();
        expect(aggregateResults[0].field).toBe('num');
        expect(aggregateResults[0].operation).toBe(AggregateOperation.Average);
        expect(aggregateResults[0].result).toBe(335);
    });

    test('when removing a column then should retain non-removed columns', async function () {
        const aggregationService = new AggregationService(
            grid,
            new DefaultAggregationProvider(() => [], evalPropertyAsync)
        );

        await aggregationService.addAggregateColumnAsync('p0', AggregateOperation.Total);
        await aggregationService.addAggregateColumnAsync('p1', AggregateOperation.Total);
        await aggregationService.addAggregateColumnAsync('p2', AggregateOperation.Total);

        aggregationService.removeAggregateColumn('p1', AggregateOperation.Total);
        expect(aggregationService.aggregateConfig.map((x) => x.field)).toEqual(['p0', 'p2']);
    });

    test('toggling aggregate when it already exists should delete it', async () => {
        const aggregationService = new AggregationService(
            grid,
            new DefaultAggregationProvider(() => [{ num: 12 }, { num: 992 }], evalPropertyAsync)
        );

        await aggregationService.addAggregateColumnAsync('num', AggregateOperation.Total);
        expect(aggregationService.aggregateConfig).toEqual([
            { field: 'num', operations: [AggregateOperation.Total] },
        ]);
        await aggregationService.toggleAggregateAsync('num', AggregateOperation.Total);
        expect(aggregationService.aggregateConfig).toEqual([]);
        expect(grid.trigger).toHaveBeenCalledWith(GridEventType.SettingsChangedByUser, {
            aggregateInfos: aggregationService.aggregateConfig,
        });
    });

    test('toggling aggregate when it already exists but with different operation it should add it', async () => {
        const aggregationService = new AggregationService(
            grid,
            new DefaultAggregationProvider(() => [{ num: 12 }, { num: 992 }], evalPropertyAsync)
        );

        await aggregationService.addAggregateColumnAsync('num', AggregateOperation.Total);
        expect(aggregationService.aggregateConfig).toEqual([
            { field: 'num', operations: [AggregateOperation.Total] },
        ]);
        await aggregationService.toggleAggregateAsync('num', AggregateOperation.Total);
        expect(aggregationService.aggregateConfig).toEqual([]);
        expect(grid.trigger).toHaveBeenCalledWith(GridEventType.SettingsChangedByUser, {
            aggregateInfos: aggregationService.aggregateConfig,
        });
    });

    test('toggling aggregate when it doesnt exist it should add it', async () => {
        const aggregationService = new AggregationService(
            grid,
            new DefaultAggregationProvider(() => [{ num: 12 }, { num: 992 }], evalPropertyAsync)
        );

        await aggregationService.toggleAggregateAsync('num', AggregateOperation.Total);
        expect(aggregationService.aggregateConfig).toEqual([
            { field: 'num', operations: [AggregateOperation.Total] },
        ]);
        expect(grid.trigger).toHaveBeenCalledWith(GridEventType.SettingsChangedByUser, {
            aggregateInfos: aggregationService.aggregateConfig,
        });
    });
});

describe('aggregation with grouping', () => {
    function getGrid() {
        const grid = Mock.of<Grid>({
            aggregateResults: ko.observableArray(),
            groupColOffset: () => 2,
            configGroups: ko.observableArray(),
            filteredData: ko.observableArray([
                { firstName: 'John', lastName: 'Doe', age: 45, weight: 70 },
                { firstName: 'Tim', lastName: 'Smith', age: 36, weight: 65 },
                { firstName: 'John', lastName: 'Smith', age: 22, weight: 75 },
            ]),
            minRowsToRender: () => 3,
            fixColumnIndexes(this: Grid): void {
                this.columns.peek().forEach(function (col, i): void {
                    col.index = i;
                });
            },
            totalNonFixedRowWidth: () => 0,
            visibleFixedColumns: ko.observableArray(),
            config: Mock.of<GridConfig>(),
        });

        return grid;
    }

    function initGrid(grid: Grid, aggregationService: AggregationService) {
        Mock.extend(grid).with({
            aggregationService: aggregationService,
            columns: ko.observableArray([
                new Column(
                    Mock.of<ColumnConfig>({ colDef: { field: 'firstName' } }),
                    grid
                ),
                new Column(
                    Mock.of<ColumnConfig>({ colDef: { field: 'lastName' } }),
                    grid
                ),
                new Column(
                    Mock.of<ColumnConfig>({ colDef: { field: 'age' } }),
                    grid
                ),
                new Column(
                    Mock.of<ColumnConfig>({ colDef: { field: 'weight' } }),
                    grid
                ),
            ]),
            rowFactory: new RowFactory(grid),
            visibleNonFixedColumns: ko.pureComputed(() => grid.columns()),
            refreshDomSizes: jest.fn(),
            renderedRows: ko.observableArray(),
        });
    }

    describe('when a group is added', () => {
        let grid: Grid;
        let aggregationService: AggregationService;
        beforeEach(() => {
            grid = getGrid();

            aggregationService = new AggregationService(
                grid,
                new DefaultAggregationProvider(() => [], evalPropertyAsync)
            );

            initGrid(grid, aggregationService);

            grid.configGroups.push(
                Mock.of<Column>({ field: 'firstName' })
            );
            grid.rowFactory.filteredDataChanged();
        });

        test('should have the right number of group rows', () => {
            expect(grid.rowFactory.groupCache.length).toBe(2);
        });

        test('should not have any aggregated results', () => {
            let groupResults = grid.rowFactory.groupCache[0].aggregateResults();
            expect(groupResults.length).toBe(0);

            grid.rowFactory.groupCache[1].aggregateResults();
            expect(groupResults.length).toBe(0);
        });

        test('should add the aggregated results to groups when aggregate column is added', async () => {
            await aggregationService.addAggregateColumnAsync('age', AggregateOperation.Total);

            let groupResults = grid.rowFactory.groupCache[0].aggregateResults();

            expect(groupResults.length).toBe(1);
            assertAggregationResults(groupResults[0], 'age', AggregateOperation.Total, 67);

            groupResults = grid.rowFactory.groupCache[1].aggregateResults();

            expect(groupResults.length).toBe(1);
            assertAggregationResults(groupResults[0], 'age', AggregateOperation.Total, 36);
        });

        test('overriding aggregation settings updates aggregation results', async () => {
            await aggregationService.addAggregateColumnAsync('age', AggregateOperation.Total);

            expect(aggregationService.aggregateConfig).toEqual([
                { field: 'age', operations: [AggregateOperation.Total] },
            ]);

            const aggregateInfos = [{ field: 'weight', operations: [AggregateOperation.Average] }];
            await aggregationService.overrideAggregateInfosAsync(aggregateInfos);

            expect(aggregationService.aggregateConfig).toEqual(aggregateInfos);

            let groupResults = grid.rowFactory.groupCache[0].aggregateResults();

            expect(groupResults.length).toBe(1);
            assertAggregationResults(groupResults[0], 'weight', AggregateOperation.Average, 72.5);

            groupResults = grid.rowFactory.groupCache[1].aggregateResults();

            expect(groupResults.length).toBe(1);
            assertAggregationResults(groupResults[0], 'weight', AggregateOperation.Average, 65);
        });

        describe('when a second group is added', () => {
            beforeEach(() => {
                grid.configGroups.push(
                    Mock.of<Column>({ field: 'lastName' })
                );
                grid.rowFactory.filteredDataChanged();
            });

            test('should have the right number of group rows', () => {
                expect(grid.rowFactory.groupCache.length).toBe(5);
            });

            describe('when an aggregate column is added', () => {
                beforeEach(async () => {
                    await aggregationService.addAggregateColumnAsync(
                        'age',
                        AggregateOperation.Total
                    );
                });

                test('should add the aggregated results to groups', () => {
                    let groupResults = grid.rowFactory.groupCache[0].aggregateResults();

                    expect(groupResults.length).toBe(1);
                    assertAggregationResults(groupResults[0], 'age', AggregateOperation.Total, 67);
                    groupResults = grid.rowFactory.groupCache[1].aggregateResults();

                    expect(groupResults.length).toBe(1);
                    assertAggregationResults(groupResults[0], 'age', AggregateOperation.Total, 45);

                    groupResults = grid.rowFactory.groupCache[2].aggregateResults();

                    expect(groupResults.length).toBe(1);
                    assertAggregationResults(groupResults[0], 'age', AggregateOperation.Total, 22);

                    groupResults = grid.rowFactory.groupCache[3].aggregateResults();

                    expect(groupResults.length).toBe(1);
                    assertAggregationResults(groupResults[0], 'age', AggregateOperation.Total, 36);

                    groupResults = grid.rowFactory.groupCache[4].aggregateResults();

                    expect(groupResults.length).toBe(1);
                    assertAggregationResults(groupResults[0], 'age', AggregateOperation.Total, 36);
                });

                describe('when another aggregate column is added', () => {
                    beforeEach(async () => {
                        await aggregationService.addAggregateColumnAsync(
                            'age',
                            AggregateOperation.Average
                        );
                    });

                    test('should add the aggregated results to groups', () => {
                        let groupResults = grid.rowFactory.groupCache[0].aggregateResults();

                        expect(groupResults.length).toBe(2);
                        assertAggregationResults(
                            groupResults[1],
                            'age',
                            AggregateOperation.Average,
                            33.5
                        );

                        groupResults = grid.rowFactory.groupCache[1].aggregateResults();

                        expect(groupResults.length).toBe(2);
                        assertAggregationResults(
                            groupResults[1],
                            'age',
                            AggregateOperation.Average,
                            45
                        );

                        groupResults = grid.rowFactory.groupCache[2].aggregateResults();

                        expect(groupResults.length).toBe(2);
                        assertAggregationResults(
                            groupResults[1],
                            'age',
                            AggregateOperation.Average,
                            22
                        );

                        groupResults = grid.rowFactory.groupCache[3].aggregateResults();

                        expect(groupResults.length).toBe(2);
                        assertAggregationResults(
                            groupResults[1],
                            'age',
                            AggregateOperation.Average,
                            36
                        );

                        groupResults = grid.rowFactory.groupCache[4].aggregateResults();

                        expect(groupResults.length).toBe(2);
                        assertAggregationResults(
                            groupResults[1],
                            'age',
                            AggregateOperation.Average,
                            36
                        );
                    });

                    describe('when aggregate column is removed', () => {
                        beforeEach(() => {
                            aggregationService.removeAggregateColumn(
                                'age',
                                AggregateOperation.Total
                            );
                        });

                        test('should remove the aggregate', () => {
                            let groupResults = grid.rowFactory.groupCache[0].aggregateResults();

                            expect(groupResults.length).toBe(1);
                            assertAggregationResults(
                                groupResults[0],
                                'age',
                                AggregateOperation.Average,
                                33.5
                            );

                            groupResults = grid.rowFactory.groupCache[1].aggregateResults();

                            expect(groupResults.length).toBe(1);
                            assertAggregationResults(
                                groupResults[0],
                                'age',
                                AggregateOperation.Average,
                                45
                            );

                            groupResults = grid.rowFactory.groupCache[2].aggregateResults();

                            expect(groupResults.length).toBe(1);
                            assertAggregationResults(
                                groupResults[0],
                                'age',
                                AggregateOperation.Average,
                                22
                            );

                            groupResults = grid.rowFactory.groupCache[3].aggregateResults();

                            expect(groupResults.length).toBe(1);
                            assertAggregationResults(
                                groupResults[0],
                                'age',
                                AggregateOperation.Average,
                                36
                            );

                            groupResults = grid.rowFactory.groupCache[4].aggregateResults();

                            expect(groupResults.length).toBe(1);
                            assertAggregationResults(
                                groupResults[0],
                                'age',
                                AggregateOperation.Average,
                                36
                            );
                        });
                    });

                    describe('when a group is removed', () => {
                        beforeEach(async () => {
                            grid.configGroups.remove((item): boolean => item.field === 'firstName');
                            grid.rowFactory.filteredDataChanged();

                            await nextEventLoop();
                        });

                        test('should refresh aggregated results', async () => {
                            let groupResults = grid.rowFactory.groupCache[0].aggregateResults();

                            expect(groupResults.length).toBe(2);
                            assertAggregationResults(
                                groupResults[0],
                                'age',
                                AggregateOperation.Total,
                                45
                            );

                            groupResults = grid.rowFactory.groupCache[1].aggregateResults();

                            expect(groupResults.length).toBe(2);
                            assertAggregationResults(
                                groupResults[0],
                                'age',
                                AggregateOperation.Total,
                                58
                            );
                        });
                    });

                    describe('when all the aggregated columns are removed', () => {
                        beforeEach(() => {
                            aggregationService.removeAggregateColumn(
                                'age',
                                AggregateOperation.Total
                            );
                            aggregationService.removeAggregateColumn(
                                'age',
                                AggregateOperation.Average
                            );
                        });

                        test('should not have any aggregated columns', () => {
                            let groupResults = grid.rowFactory.groupCache[0].aggregateResults();
                            expect(groupResults.length).toBe(0);
                            groupResults = grid.rowFactory.groupCache[1].aggregateResults();
                            expect(groupResults.length).toBe(0);
                            groupResults = grid.rowFactory.groupCache[2].aggregateResults();
                            expect(groupResults.length).toBe(0);
                        });
                    });
                });
            });
        });
    });

    describe('should handle race condition', () => {
        let grid: Grid;
        let aggregationService: AggregationService;
        let calculateSpy: jest.Mock<any, any>;
        let group: Group;
        beforeEach(() => {
            grid = getGrid();

            calculateSpy = jest.fn();
            const aggregationProvider = Mock.of<AggregationProvider>({
                calculateAggregationsAsync: calculateSpy,
            });

            aggregationService = new AggregationService(grid, aggregationProvider);
            initGrid(grid, aggregationService);

            group = Mock.of<Group>({ aggregateResults: ko.observableArray() });
            grid.rowFactory.groupCache.push(group);
        });

        test('when removing an aggregation it will cancel the pending group aggregation calculations and keep the results that still needs', async () => {
            let calculationFirstResolver: (value: AggregationResult[]) => void;
            let calculationSecondResolver: (value: AggregationResult[]) => void;
            calculateSpy.mockImplementation(
                (aggregation: Aggregation, group?: Group): Promise<AggregationResult[]> => {
                    if (!group) {
                        return Promise.resolve([]);
                    }
                    const operations = aggregation.operations;
                    if (operations.length === 1 && operations[0] === AggregateOperation.Average) {
                        return new Promise((resolve) => (calculationFirstResolver = resolve));
                    } else if (operations.length === 2) {
                        return new Promise((resolve) => (calculationSecondResolver = resolve));
                    } else {
                        return Promise.reject('this should not happen');
                    }
                }
            );

            const overridePromise = aggregationService.overrideAggregateInfosAsync([
                {
                    field: 'age',
                    operations: [AggregateOperation.Average, AggregateOperation.Total],
                },
            ]);

            aggregationService.removeAggregateColumn('age', AggregateOperation.Average);

            const averageResult = Mock.of<AggregationResult>({
                field: 'age',
                operation: AggregateOperation.Average,
                result: 502,
                group: group,
            });
            const totalResult = Mock.of<AggregationResult>({
                field: 'age',
                operation: AggregateOperation.Total,
                result: 1004,
                group: group,
            });

            calculationFirstResolver!([averageResult]);
            calculationSecondResolver!([averageResult, totalResult]);

            await overridePromise;

            expect(group.aggregateResults()).toEqual([totalResult]);
        });

        test('when removing all aggregation it will cancel the pending grou aggregation calculations and have empty aggregation results', async () => {
            let calculationResolver: (value: AggregationResult[]) => void;
            calculateSpy.mockReturnValueOnce(
                new Promise((resolve) => (calculationResolver = resolve))
            );

            const overridePromise = aggregationService.overrideAggregateInfosAsync([
                {
                    field: 'num',
                    operations: [AggregateOperation.Average],
                },
            ]);
            aggregationService.removeAggregateColumn('num', AggregateOperation.Average);

            calculationResolver!([
                Mock.of<AggregationResult>({
                    field: 'num',
                    operation: AggregateOperation.Average,
                    result: 502,
                    group: group,
                }),
            ]);

            await overridePromise;

            expect(group.aggregateResults()).toEqual([]);
            expect(aggregationService.aggregateConfig).toEqual([]);
        });
    });

    function assertAggregationResults(
        aggregationResult: AggregationResult,
        field: string,
        operation: AggregateOperation,
        result: number
    ) {
        expect(aggregationResult.field).toBe(field);
        expect(aggregationResult.operation).toBe(operation);
        expect(aggregationResult.result).toBe(result);
    }
});

function evalPropertyAsync(entity: Entity, path: string) {
    return Promise.resolve(utils.evalProperty(entity, path));
}
