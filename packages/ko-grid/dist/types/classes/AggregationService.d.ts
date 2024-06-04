import Aggregation, { AggregationProvider, AggregateInfo } from './DefaultAggregationProvider';
import { AggregateOperation } from '../constants';
import Grid from './Grid';
export declare class AggregationService {
    constructor(grid: Grid, aggregationProvider: AggregationProvider);
    readonly aggregateConfig: Aggregation[];
    private readonly grid;
    private readonly aggregationPromises;
    private readonly aggregationGroupPromises;
    private readonly aggregationProvider;
    private readonly aggregatingFields;
    isAggregating(field: string, operation: AggregateOperation): boolean;
    addAggregateColumnAsync(field: string, operation: AggregateOperation): Promise<void>;
    refreshGridAggregatesAsync(): Promise<void>;
    refreshGroupAggregatesAsync(): Promise<void>;
    private calculateGridAggregationsAsync;
    removeAggregateColumn(field: string, operation: AggregateOperation): void;
    toggleAggregateAsync(field: string, operation: AggregateOperation): Promise<void>;
    private getOrCreateAggregation;
    private onAggregationConfigChanged;
    overrideAggregateInfosAsync(aggregateInfos: AggregateInfo[]): Promise<void>;
    private clearGridAggregationResults;
    private clearGroupAggregationResults;
    private calculateGroupAggregationsAsync;
}
