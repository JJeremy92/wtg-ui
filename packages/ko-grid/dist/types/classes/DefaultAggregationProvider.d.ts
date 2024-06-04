import { AggregateOperation } from '../constants';
import { Entity, Maybe, Value } from '../types';
import Group from './Group';
export interface AggregationProvider {
    calculateAggregationsAsync: (aggregation: Aggregation, group?: Group) => Promise<AggregationResult[]>;
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
export declare class DefaultAggregationProvider implements AggregationProvider {
    constructor(getAllEntities: () => Entity[], getDataForAggregatesAsync: (entity: Entity, path: string) => Promise<Maybe<Value>>);
    calculateAggregationsAsync(aggregation: Aggregation, group?: Group): Promise<AggregationResult[]>;
    private readonly getAllEntities;
    private readonly getDataForAggregatesAsync;
    private getValuesAsync;
}
export default class Aggregation {
    constructor(field: string);
    addOperation(operation: AggregateOperation): void;
    removeOperation(operation: AggregateOperation): void;
    readonly field: string;
    readonly operations: AggregateOperation[];
}
