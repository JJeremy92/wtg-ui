import ko, { Observable, PureComputed } from 'knockout';
import configuration from '../configuration';
import { GridEventType } from '../constants';
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
    public constructor(groupEntity: GroupEntity, grid: Grid) {
        this.entity = groupEntity;
        this.grid = grid;

        this.aggregateResults = ko.observableArray();
        this.groupChildren = groupEntity.groupChildren;
        this.groupClass = ko.pureComputed(this.readGroupClass, this);
        this.children = groupEntity.children;
        this.collapsed = ko.observable<boolean>(true);
        this.column = groupEntity.column;
        this.depth = groupEntity.depth;
        this.isGroupRow = true;
        this.isEven = ko.observable<boolean>(false);
        this.isOdd = ko.observable<boolean>(false);
        this.label = groupEntity.label;
        this.offsetLeft = (groupEntity.depth * 25).toString() + 'px';
        this.offsetTop = ko.observable('0px');
        this.parent = groupEntity.parent;
        this.isSelected = ko.pureComputed(this.readIsSelected, this);
        this.isFullySelected = ko.pureComputed(this.readIsFullySelected, this);
        this.firstChild = ko.pureComputed(this.readFirstChild, this);
        this.selectedChildren = ko.pureComputed(this.readSelectedChildren, this);
        this.totalChildren = ko.pureComputed(this.readTotalChildren, this);
    }

    public readonly aggregateResults: ko.ObservableArray<AggregationResult>;
    public readonly groupChildren: Group[];
    public readonly groupClass: PureComputed<string>;
    public readonly children: Entity[];
    public readonly collapsed: Observable<boolean>;
    public readonly column: Column;
    public readonly depth: number;
    public readonly entity: GroupEntity;
    public readonly firstChild: PureComputed<Entity | undefined>;
    public readonly isGroupRow: boolean;
    public readonly isEven: Observable<boolean>;
    public readonly isOdd: Observable<boolean>;
    public readonly isFullySelected: PureComputed<boolean>;
    public readonly isSelected: PureComputed<boolean>;
    public readonly label: string;
    public readonly offsetLeft: string;
    public readonly offsetTop: Observable<string>;
    public parent?: Group;
    public readonly selectedChildren: PureComputed<number>;
    public readonly totalChildren: PureComputed<number>;

    private readonly grid: Grid;

    public static isGroupRow(row: GridRow): row is Group {
        return row.isGroupRow;
    }

    public toggleExpand(): void {
        this.grid.trigger(GridEventType.GroupToggleStarted, this);
        this.setExpand(!this.collapsed());
    }

    public toggleSelected(data: any, event: JQuery.Event): boolean {
        if (this.grid.selectionService.canSelectRows) {
            this.grid.selectionService.changeSelection(this, event);
        }

        return true;
    }

    public flattenChildren(): Entity[] {
        return flattenChildren(this);
    }

    private notifyChildren(): void {
        const collapsed = this.collapsed();
        const rowFactory = this.grid.rowFactory;
        this.groupChildren.forEach(function (child): void {
            rowFactory.setHidden(child.entity, collapsed);
            if (collapsed) {
                child.setExpand(collapsed);
            }
        });
        this.children.forEach(function (child: Entity): void {
            rowFactory.setHidden(child, collapsed);
        });
        rowFactory.rowCache = [];
        rowFactory.renderedChange();
    }

    private readGroupClass(): string {
        return this.collapsed()
            ? 'kgGroupArrowCollapsed ' + configuration.css.groupCollapsedClass
            : 'kgGroupArrowExpanded ' + configuration.css.groupExpandedClass;
    }

    private readFirstChild(): Entity | undefined {
        if (this.children.length > 0) {
            return this.children[0];
        }

        for (let i = 0; i < this.groupChildren.length; i++) {
            const result = this.groupChildren[i].firstChild();
            if (result) {
                return result;
            }
        }

        return undefined;
    }

    private readIsFullySelected(): boolean {
        return this.selectedChildren() === this.totalChildren();
    }

    private readIsSelected(): boolean {
        return this.selectedChildren() > 0;
    }

    private readSelectedChildren(): number {
        let result = 0;
        this.groupChildren.forEach(function (groupChild): void {
            result += groupChild.selectedChildren();
        });

        const selectionService = this.grid.selectionService;
        this.children.forEach(function (child): void {
            if (selectionService.isSelected(child)) {
                result++;
            }
        });

        return result;
    }

    private readTotalChildren(): number {
        return totalChildren(this);
    }

    private setExpand(state: boolean): void {
        this.collapsed(state);
        this.notifyChildren();
    }
}

function flattenChildren(group: Group): Entity[] {
    let result = group.children;
    group.groupChildren.forEach(function (groupChild): void {
        result = result.concat(flattenChildren(groupChild));
    });

    return result;
}

function totalChildren(group: Group): number {
    let result = group.children.length;
    group.groupChildren.forEach(function (groupChild): void {
        result += totalChildren(groupChild);
    });

    return result;
}
