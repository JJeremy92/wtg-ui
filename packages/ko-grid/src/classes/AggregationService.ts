import ko from 'knockout';
import Aggregation, {
    AggregationResult,
    AggregationProvider,
    AggregateInfo,
} from './DefaultAggregationProvider';
import { AggregateOperation, GridEventType } from '../constants';
import Grid from './Grid';
import Group from './Group';

export class AggregationService {
    public constructor(grid: Grid, aggregationProvider: AggregationProvider) {
        this.grid = grid;

        this.aggregationPromises = new Map();
        this.aggregationGroupPromises = new Map();
        this.aggregationProvider = aggregationProvider;
        this.aggregateConfig = [];
        this.aggregatingFields = ko.observableArray();
    }

    public readonly aggregateConfig: Aggregation[];

    private readonly grid: Grid;
    private readonly aggregationPromises: Map<string, Promise<AggregationResult[]>>;
    private readonly aggregationGroupPromises: Map<string, Promise<AggregationResult[]>[]>;
    private readonly aggregationProvider: AggregationProvider;
    private readonly aggregatingFields: ko.ObservableArray<string>;

    public isAggregating(field: string, operation: AggregateOperation): boolean {
        const key = getAggregatePromiseKey(field, operation);
        return this.aggregatingFields().includes(key);
    }

    public async addAggregateColumnAsync(
        field: string,
        operation: AggregateOperation
    ): Promise<void> {
        const aggregation = this.getOrCreateAggregation(field);
        aggregation.addOperation(operation);

        const key = getAggregatePromiseKey(field, operation);
        if (this.aggregatingFields.indexOf(key) === -1) {
            this.aggregatingFields.push(key);
        }

        this.onAggregationConfigChanged(field);

        await Promise.all([
            this.calculateGridAggregationsAsync(aggregation),
            this.calculateGroupAggregationsAsync(aggregation),
        ]);
    }

    public async refreshGridAggregatesAsync(): Promise<void> {
        this.clearGridAggregationResults();
        const calculateGridAggregationsPromises = this.aggregateConfig.map(
            (aggregation): Promise<void> => this.calculateGridAggregationsAsync(aggregation)
        );
        await Promise.all(calculateGridAggregationsPromises);
    }

    public async refreshGroupAggregatesAsync(): Promise<void> {
        this.clearGroupAggregationResults();
        const calculateGroupAggregationsPromises = this.aggregateConfig.map(
            (aggregation): Promise<void> => this.calculateGroupAggregationsAsync(aggregation)
        );
        await Promise.all(calculateGroupAggregationsPromises);
    }

    private async calculateGridAggregationsAsync(aggregation: Aggregation): Promise<void> {
        const aggregationPromise = this.aggregationProvider.calculateAggregationsAsync(aggregation);
        const field = aggregation.field;

        aggregation.operations.forEach((operation): void => {
            this.aggregationPromises.set(
                getAggregatePromiseKey(field, operation),
                aggregationPromise
            );
        });

        const newResults = await aggregationPromise;
        const currentAggregation = this.aggregateConfig.find(
            (aggregation): boolean => aggregation.field === field
        );

        if (currentAggregation) {
            const validAggregationResults: AggregationResult[] = [];

            newResults.forEach((aggregationResult): void => {
                const key = getAggregatePromiseKey(
                    aggregationResult.field,
                    aggregationResult.operation
                );
                const currentPromise = this.aggregationPromises.get(key);
                if (currentPromise === aggregationPromise) {
                    this.aggregationPromises.delete(key);
                    validAggregationResults.push(aggregationResult);
                }
            });
            if (validAggregationResults.length) {
                this.grid.aggregateResults(
                    this.grid.aggregateResults().concat(validAggregationResults)
                );
            }
        }
    }

    public removeAggregateColumn(field: string, operation: AggregateOperation): void {
        const key = getAggregatePromiseKey(field, operation);
        this.aggregationPromises.delete(key);
        this.aggregationGroupPromises.delete(key);
        this.aggregatingFields.remove(key);

        const aggregationIndex = this.aggregateConfig.findIndex((a): boolean => a.field === field);
        if (aggregationIndex !== -1) {
            const aggregation = this.aggregateConfig[aggregationIndex];
            aggregation.removeOperation(operation);
            if (aggregation.operations.length === 0) {
                this.aggregateConfig.splice(aggregationIndex, 1);
            }

            this.onAggregationConfigChanged(field, operation);
        }
    }

    public async toggleAggregateAsync(field: string, operation: AggregateOperation): Promise<void> {
        const aggregation = this.aggregateConfig.find(
            (a): boolean => a.field === field && a.operations.includes(operation)
        );
        if (aggregation) {
            this.removeAggregateColumn(field, operation);
        } else {
            await this.addAggregateColumnAsync(field, operation);
        }
        this.grid.trigger(GridEventType.SettingsChangedByUser, {
            aggregateInfos: this.aggregateConfig,
        });
    }

    private getOrCreateAggregation(field: string): Aggregation {
        const aggregation = this.aggregateConfig.find((a): boolean => a.field === field);
        if (aggregation) {
            return aggregation;
        }

        const result = new Aggregation(field);
        this.aggregateConfig.push(result);
        return result;
    }

    private onAggregationConfigChanged(field: string, operation?: AggregateOperation): void {
        const removeFunc = (r: AggregationResult): boolean =>
            r.field === field && (operation === undefined || operation === r.operation);

        this.grid.aggregateResults.remove(removeFunc);
        this.grid.rowFactory.groupCache.forEach((group): void => {
            group.aggregateResults.remove(removeFunc);
        });
    }

    public async overrideAggregateInfosAsync(aggregateInfos: AggregateInfo[]): Promise<void> {
        this.aggregateConfig.length = 0;
        this.clearGridAggregationResults();
        this.clearGroupAggregationResults();
        this.aggregatingFields.removeAll();
        const promises: Promise<void>[] = [];
        aggregateInfos.forEach((aggregateInfo): void => {
            aggregateInfo.operations.forEach((operation): void => {
                promises.push(this.addAggregateColumnAsync(aggregateInfo.field, operation));
            });
        });
        await Promise.all(promises);
    }

    private clearGridAggregationResults(): void {
        this.grid.aggregateResults.removeAll();
        this.aggregationPromises.clear();
    }

    private clearGroupAggregationResults(): void {
        this.grid.rowFactory.groupCache.forEach((group): void => {
            group.aggregateResults.removeAll();
        });
        this.aggregationGroupPromises.clear();
    }

    private async calculateGroupAggregationsAsync(aggregation: Aggregation): Promise<void> {
        const groupAggregationsPromises: Promise<AggregationResult[]>[] = [];

        this.grid.rowFactory.groupCache.forEach((group): void => {
            const promise = this.aggregationProvider.calculateAggregationsAsync(aggregation, group);
            groupAggregationsPromises.push(promise);
        });

        aggregation.operations.forEach((operation): void => {
            this.aggregationGroupPromises.set(
                getAggregatePromiseKey(aggregation.field, operation),
                groupAggregationsPromises
            );
        });

        const allResults = await Promise.all(groupAggregationsPromises);
        const currentAggregation = this.aggregateConfig.find(
            (aggregation): boolean => aggregation.field === aggregation.field
        );

        if (currentAggregation) {
            const successfulAggregations = new Set<string>();
            allResults.forEach((results): void => {
                results.forEach((aggregationResult): void => {
                    const key = getAggregatePromiseKey(
                        aggregationResult.field,
                        aggregationResult.operation
                    );
                    const currentPromises = this.aggregationGroupPromises.get(key);
                    if (currentPromises === groupAggregationsPromises) {
                        successfulAggregations.add(key);
                        const group = aggregationResult.group as Group;
                        group.aggregateResults.push(aggregationResult);
                    }
                });
            });
            successfulAggregations.forEach((key): void => {
                this.aggregationGroupPromises.delete(key);
            });
        }
    }
}

function getAggregatePromiseKey(field: string, operation: AggregateOperation): string {
    return field + operation;
}
