/// <reference types="jquery" />
import ko, { Observable, PureComputed } from 'knockout';
import { Entity, GridRow } from '../types';
import Column from './Column';
import { AggregationResult } from './DefaultAggregationProvider';
import Grid from './Grid';
export interface GroupEntity extends Entity {
    readonly groupChildren: Group[];
    readonly groupIndex: number;
    readonly children: Entity[];
    readonly column: Column;
    readonly depth: number;
    readonly label: string;
    parent?: Group;
}
export default class Group implements GridRow {
    constructor(groupEntity: GroupEntity, grid: Grid);
    readonly aggregateResults: ko.ObservableArray<AggregationResult>;
    readonly groupChildren: Group[];
    readonly groupClass: PureComputed<string>;
    readonly children: Entity[];
    readonly collapsed: Observable<boolean>;
    readonly column: Column;
    readonly depth: number;
    readonly entity: GroupEntity;
    readonly firstChild: PureComputed<Entity | undefined>;
    readonly isGroupRow: boolean;
    readonly isEven: Observable<boolean>;
    readonly isOdd: Observable<boolean>;
    readonly isFullySelected: PureComputed<boolean>;
    readonly isSelected: PureComputed<boolean>;
    readonly label: string;
    readonly offsetLeft: string;
    readonly offsetTop: Observable<string>;
    parent?: Group;
    readonly selectedChildren: PureComputed<number>;
    readonly totalChildren: PureComputed<number>;
    private readonly grid;
    static isGroupRow(row: GridRow): row is Group;
    toggleExpand(): void;
    toggleSelected(data: any, event: JQuery.Event): boolean;
    flattenChildren(): Entity[];
    private notifyChildren;
    private readGroupClass;
    private readFirstChild;
    private readIsFullySelected;
    private readIsSelected;
    private readSelectedChildren;
    private readTotalChildren;
    private setExpand;
}
