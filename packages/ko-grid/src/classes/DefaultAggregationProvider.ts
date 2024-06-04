import { AggregateOperation } from '../constants';
import { Entity, Maybe, Value } from '../types';
import Group from './Group';

export interface AggregationProvider {
    calculateAggregationsAsync: (
        aggregation: Aggregation,
        group?: Group
    ) => Promise<AggregationResult[]>;
}

export interface AggregationResult {
    readonly field: string;
    readonly group?: Group;
    readonly operation: AggregateOperation;
    readonly result: number;
}

export interface AggregateInfo {
    readonly field: string;
    readonly operations: AggregateOperation[];
}

export class DefaultAggregationProvider implements AggregationProvider {
    public constructor(
        getAllEntities: () => Entity[],
        getDataForAggregatesAsync: (entity: Entity, path: string) => Promise<Maybe<Value>>
    ) {
        this.getAllEntities = getAllEntities;
        this.getDataForAggregatesAsync = getDataForAggregatesAsync;
    }

    public async calculateAggregationsAsync(
        aggregation: Aggregation,
        group?: Group
    ): Promise<AggregationResult[]> {
        const entities = !group ? this.getAllEntities() : group.flattenChildren();
        const data = await this.getValuesAsync(entities, aggregation);
        const results: AggregationResult[] = [];
        let total: number | undefined;
        if (aggregation.operations.includes(AggregateOperation.Total)) {
            total = calculateTotal(data);
            results.push({
                field: aggregation.field,
                group,
                operation: AggregateOperation.Total,
                result: total,
            });
        }
        if (aggregation.operations.includes(AggregateOperation.Average)) {
            results.push({
                field: aggregation.field,
                group,
                operation: AggregateOperation.Average,
                result: calculateAverage(data, total),
            });
        }

        return results;
    }

    private readonly getAllEntities: () => Entity[];
    private readonly getDataForAggregatesAsync: (
        entity: Entity,
        path: string
    ) => Promise<Maybe<Value>>;

    private getValuesAsync(entities: Entity[], aggregation: Aggregation): Promise<number[]> {
        const getDataPromises = entities.map(
            async (entity): Promise<number> => {
                let value = await this.getDataForAggregatesAsync(entity, aggregation.field);
                return typeof value === 'number' ? value : 0;
            }
        );
        return Promise.all(getDataPromises);
    }
}

function calculateAverage(data: number[], total?: number): number {
    if (total === undefined) {
        total = calculateTotal(data);
    }
    return total / data.length;
}

function calculateTotal(data: number[]): number {
    let result = 0;
    data.forEach((value): void => {
        result += value;
    });
    return result;
}

export default class Aggregation {
    public constructor(field: string) {
        this.field = field;
        this.operations = [];
    }

    public addOperation(operation: AggregateOperation): void {
        if (this.operations.indexOf(operation) === -1) {
            this.operations.push(operation);
        }
    }

    public removeOperation(operation: AggregateOperation): void {
        const operationIndex = this.operations.indexOf(operation);
        if (operationIndex !== -1) {
            this.operations.splice(operationIndex, 1);
        }
    }

    public readonly field: string;
    public readonly operations: AggregateOperation[];
}
