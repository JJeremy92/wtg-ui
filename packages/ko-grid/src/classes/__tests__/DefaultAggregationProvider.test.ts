import { Mock } from 'ts-mockery';
import { AggregateOperation } from '../../constants';
import { Entity, Maybe, Value } from '../../types';
import utils from '../../utils';
import Column from '../Column';
import Aggregation, {
    AggregationProvider, DefaultAggregationProvider
} from '../DefaultAggregationProvider';
import Grid from '../Grid';
import Group, { GroupEntity } from '../Group';
import RowFactory from '../RowFactory';

describe('DefaultAggregationProvider', function () {
    describe('calculateAggregationAsync', () => {
        let aggregationProvider: AggregationProvider;
        beforeEach(function () {
            aggregationProvider = getAggregationProvider(() => [
                { num: 12 },
                { num: 2 },
                { num: 1 },
                { num: 992 },
            ]);
        });

        describe('without groupRow', () => {
            assertOperationsAreSupported();
        });

        describe('with groupRow', () => {
            assertOperationsAreSupported(getRowFactory().groupCache[0]);
        });

        function assertOperationsAreSupported(group?: Group) {
            test('no operation', async function () {
                const aggregation = new Aggregation('num');
                const aggregationResults = await aggregationProvider.calculateAggregationsAsync(
                    aggregation,
                    group
                );
                expect(aggregationResults.length).toBe(0);
            });

            test('supported operations', async function () {
                const aggregation = new Aggregation('num');
                aggregation.addOperation(AggregateOperation.Total);
                let aggregationResults = await aggregationProvider.calculateAggregationsAsync(
                    aggregation,
                    group
                );
                expect(aggregationResults).toEqual([
                    {
                        field: 'num',
                        operation: AggregateOperation.Total,
                        group,
                        result: 1007,
                    },
                ]);

                aggregation.addOperation(AggregateOperation.Average);
                aggregationResults = await aggregationProvider.calculateAggregationsAsync(
                    aggregation,
                    group
                );
                expect(aggregationResults).toEqual([
                    {
                        field: 'num',
                        operation: AggregateOperation.Total,
                        group,
                        result: 1007,
                    },
                    {
                        field: 'num',
                        operation: AggregateOperation.Average,
                        group,
                        result: 251.75,
                    },
                ]);
            });

            test('Average operation when Total is not reused', async function () {
                const aggregation = new Aggregation('num');
                aggregation.addOperation(AggregateOperation.Average);
                let aggregationResults = await aggregationProvider.calculateAggregationsAsync(
                    aggregation,
                    group
                );
                expect(aggregationResults).toEqual([
                    {
                        field: 'num',
                        operation: AggregateOperation.Average,
                        group,
                        result: 251.75,
                    },
                ]);
            });
        }
    });

    test('should handle invalid values', async () => {
        const aggregationProvider = getAggregationProvider(() => [
            { num: 8 },
            { num: null },
            { num: undefined },
            { num: 992 },
            { num: true },
            { num: 'string' },
            { num: {} },
            { num: [] },
        ]);

        const aggregation = new Aggregation('num');
        aggregation.addOperation(AggregateOperation.Total);
        let aggregationResults = await aggregationProvider.calculateAggregationsAsync(aggregation);
        expect(aggregationResults).toEqual([
            { field: 'num', operation: AggregateOperation.Total, group: undefined, result: 1000 },
        ]);

        aggregation.addOperation(AggregateOperation.Average);
        aggregationResults = await aggregationProvider.calculateAggregationsAsync(aggregation);
        expect(aggregationResults).toEqual([
            { field: 'num', operation: AggregateOperation.Total, group: undefined, result: 1000 },
            { field: 'num', operation: AggregateOperation.Average, group: undefined, result: 125 },
        ]);
    });

    test('should handle complex path', async () => {
        const aggregationProvider = getAggregationProvider(() => [
            { num: { num1: { num2: 8 } } },
            { num: { num1: { num2: 992 } } },
        ]);

        const aggregation = new Aggregation('num.num1.num2');
        aggregation.addOperation(AggregateOperation.Total);
        let aggregationResults = await aggregationProvider.calculateAggregationsAsync(aggregation);
        expect(aggregationResults).toEqual([
            {
                field: 'num.num1.num2',
                operation: AggregateOperation.Total,
                group: undefined,
                result: 1000,
            },
        ]);

        aggregation.addOperation(AggregateOperation.Average);
        aggregationResults = await aggregationProvider.calculateAggregationsAsync(aggregation);
        expect(aggregationResults).toEqual([
            {
                field: 'num.num1.num2',
                operation: AggregateOperation.Total,
                group: undefined,
                result: 1000,
            },
            {
                field: 'num.num1.num2',
                operation: AggregateOperation.Average,
                group: undefined,
                result: 500,
            },
        ]);
    });

    test('should handle complex path with null intermediate value', async () => {
        const aggregationProvider = getAggregationProvider(() => [
            { num: { num1: { num2: 4 } } },
            { num: { num1: { num2: 5 } } },
            { num: { num1: null } },
        ]);

        const aggregation = new Aggregation('num.num1.num2');
        aggregation.addOperation(AggregateOperation.Total);
        aggregation.addOperation(AggregateOperation.Average);

        const aggregationResults = await aggregationProvider.calculateAggregationsAsync(
            aggregation
        );
        expect(aggregationResults).toEqual([
            {
                field: 'num.num1.num2',
                operation: AggregateOperation.Total,
                group: undefined,
                result: 9,
            },
            {
                field: 'num.num1.num2',
                operation: AggregateOperation.Average,
                group: undefined,
                result: 3,
            },
        ]);
    });

    function getAggregationProvider(getAllEntities: () => Entity[]) {
        return new DefaultAggregationProvider(
            getAllEntities,
            (entity: Entity, path: string): Promise<Maybe<Value>> =>
                Promise.resolve(utils.evalProperty(entity, path))
        );
    }
});

describe('aggregation', function () {
    test('add new operation', function () {
        const aggregation = new Aggregation('prop.path');
        expect(aggregation.field).toBe('prop.path');
        expect(aggregation.operations).toEqual([]);

        aggregation.addOperation(AggregateOperation.Total);
        expect(aggregation.operations.length).toBe(1);
        expect(aggregation.operations[0]).toEqual(AggregateOperation.Total);
    });

    test('add existing operation', function () {
        const aggregation = new Aggregation('prop.path');
        aggregation.addOperation(AggregateOperation.Total);
        expect(aggregation.operations.length).toBe(1);
        expect(aggregation.operations[0]).toEqual(AggregateOperation.Total);

        aggregation.addOperation(AggregateOperation.Total);
        expect(aggregation.operations.length).toBe(1);
        expect(aggregation.operations[0]).toEqual(AggregateOperation.Total);
    });

    test('remove operation', function () {
        const aggregation = new Aggregation('prop.path');
        aggregation.addOperation(AggregateOperation.Total);
        expect(aggregation.operations.length).toBe(1);
        expect(aggregation.operations[0]).toEqual(AggregateOperation.Total);

        aggregation.removeOperation(AggregateOperation.Total);
        expect(aggregation.operations.length).toBe(0);

        aggregation.removeOperation(AggregateOperation.Total);
        expect(aggregation.operations.length).toBe(0);
    });
});

function getRowFactory() {
    const groupEntity1: GroupEntity = {
        id: '1',
        depth: 0,
        label: 'label',
        groupIndex: 0,
        groupChildren: [],
        children: [],
        column: Mock.of<Column>(),
        isHidden: false,
    };
    const groupEntity2: GroupEntity = {
        id: '2',
        depth: 1,
        label: 'label',
        groupIndex: 1,
        groupChildren: [],
        children: [],
        column: Mock.of<Column>(),
        isHidden: false,
    };
    const groupEntity3: GroupEntity = {
        id: '3',
        depth: 1,
        label: 'label',
        groupIndex: 2,
        groupChildren: [],
        children: [],
        column: Mock.of<Column>(),
        isHidden: false,
    };
    const groupEntity4: GroupEntity = {
        id: '4',
        depth: 2,
        label: 'label',
        groupIndex: 3,
        groupChildren: [],
        children: [],
        column: Mock.of<Column>(),
        isHidden: false,
    };
    const groupEntity5: GroupEntity = {
        id: '5',
        groupLabelFilter: 'filter',
        depth: 2,
        label: 'label',
        groupIndex: 4,
        groupChildren: [],
        children: [],
        column: Mock.of<Column>(),
        isHidden: false,
    };

    const entity1: Entity = { num: 12 };
    const entity2: Entity = { num: 2 };
    const entity3: Entity = { num: 1 };
    const entity4: Entity = { num: 992 };
    groupEntity4.children.push(entity1);
    groupEntity4.children.push(entity2);
    groupEntity4.children.push(entity3);
    groupEntity5.children.push(entity4);

    const rowFactory = Mock.of<RowFactory>({
        rowCache: [{ entity: groupEntity1 }],
        renderedChange: jest.fn(),
        setHidden: function (entity, isHidden) {
            entity.isHidden = isHidden;
        },
    });

    const grid = Mock.of<Grid>();

    const group1 = new Group(groupEntity1, grid);
    groupEntity2.parent = group1;
    const group2 = new Group(groupEntity2, grid);
    groupEntity3.parent = group1;
    const group3 = new Group(groupEntity3, grid);
    groupEntity4.parent = group3;
    const group4 = new Group(groupEntity4, grid);
    groupEntity5.parent = group3;
    const group5 = new Group(groupEntity5, grid);

    groupEntity1.groupChildren.push(group2);
    groupEntity1.groupChildren.push(group3);
    groupEntity3.groupChildren.push(group4);
    groupEntity3.groupChildren.push(group5);

    rowFactory.groupCache = [group1, group2, group3, group4, group5];
    return rowFactory;
}
