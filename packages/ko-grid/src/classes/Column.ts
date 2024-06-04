import $ from 'jquery';
import ko, { Observable, PureComputed } from 'knockout';
import { GridEventType, SortDirection } from '../constants';
import domUtilityService from '../domUtilityService';
import { SortColumn } from '../sortService';
import templates from '../templates/templates';
import { Maybe, SortFunc, Value } from '../types';
import Grid from './Grid';
import Row from './Row';

export interface ColumnConfig {
    readonly colDef: ColumnDefinition;
    readonly enableResize?: boolean;
    readonly enableSort?: boolean;
    readonly index: number;
    readonly isGroupCol?: boolean;
    readonly resizeOnDataCallback?: (col: Column) => void;
    readonly sortCallback?: (col: Column, direction: SortDirection, isMulti: boolean) => void;
}

export interface ColumnDefinition {
    readonly canAggregate?: boolean;
    readonly cellClass?: string;
    readonly cellFilter?: (prop: any) => Maybe<Value>;
    readonly cellTemplate?: string;
    readonly displayName?: string;
    readonly field: string;
    readonly fixed?: boolean;
    readonly headerCellTemplate?: string;
    readonly headerClass?: string;
    readonly maxWidth?: number;
    readonly minWidth?: number;
    readonly resizable?: boolean;
    readonly sortable?: boolean;
    readonly sortFn?: SortFunc;
    readonly visible?: boolean;
    width?: string | number; // \d+ | '\d+%' | '\*+'
}

const doubleClickDelay = 500;

export default class Column implements SortColumn {
    public constructor(config: ColumnConfig, grid: Grid) {
        const colDef = config.colDef;

        this.grid = grid;
        this.clicks = 0;
        this.startMousePosition = 0;
        this.timer = undefined;
        this.eventTarget = undefined;

        this.colDef = colDef;
        this.field = colDef.field;
        this.fixed = colDef.fixed || false;
        this.fixedClass = getFixedClass(this.fixed);
        this.index = config.index;
        this.isGroupCol = !!config.isGroupCol;
        this.displayName = ko.observable(colDef.displayName || colDef.field);

        this.width = typeof colDef.width === 'number' ? colDef.width : 0;
        this.origWidth = this.width;
        this.minWidth = colDef.minWidth || 50;
        this.maxWidth = colDef.maxWidth || 9000;

        this.cellClass = getCellClass(colDef.cellClass, this.fixedClass);
        this.cellFilter = colDef.cellFilter;
        this.cellTemplate = colDef.cellTemplate;

        this.headerClass = getCellClass(colDef.headerClass, this.fixedClass);
        this.headerCellTemplate =
            colDef.headerCellTemplate || templates.defaultHeaderCellTemplate();

        this.groupIndex = ko.observable(-1);
        this.isGroupedBy = ko.pureComputed(this.readIsGroupedBy, this);
        this.groupedByClass = ko.pureComputed(this.readGroupedByClass, this);

        this._visible = ko.observable(colDef.visible !== false);
        this.visible = ko.pureComputed({
            read: this.readVisible,
            write: this.writeVisible,
            owner: this,
        });

        this.sortable = !!config.enableSort && colDef.sortable !== false;
        this.sortDirection = ko.observable<SortDirection>(SortDirection.Unspecified);
        this.sortingAlgorithm = colDef.sortFn;
        this.sortCallback = config.sortCallback;
        this.showSortButtonUp = ko.pureComputed(this.readShowSortButtonUp, this);
        this.showSortButtonDown = ko.pureComputed(this.readShowSortButtonDown, this);
        this.noSortVisible = ko.pureComputed(this.readNoSortVisible, this);

        this.resizable =
            !!config.enableResize &&
            colDef.resizable !== false &&
            (!grid.legacyMode || !this.fixed);
        this.resizeOnDataCallback = config.resizeOnDataCallback;
    }

    public readonly cellClass: string;
    public readonly cellFilter?: (prop: any) => Maybe<Value>;
    public readonly cellTemplate?: string;
    public readonly colDef: ColumnDefinition;
    public readonly displayName: Observable<string>;
    public readonly field: string;
    public readonly fixed: boolean;
    public readonly fixedClass: string;
    public readonly groupedByClass: PureComputed<string>;
    public readonly groupIndex: Observable<number>;
    public readonly headerCellTemplate: string;
    public readonly headerClass: string;
    public readonly isGroupCol: boolean;
    public readonly isGroupedBy: PureComputed<boolean>;
    public readonly maxWidth: number;
    public readonly minWidth: number;
    public readonly noSortVisible: PureComputed<boolean>;
    public readonly resizable: boolean;
    public readonly showSortButtonDown: PureComputed<boolean>;
    public readonly showSortButtonUp: PureComputed<boolean>;
    public readonly sortable: boolean;
    public readonly sortDirection: Observable<SortDirection>;
    public readonly sortingAlgorithm?: SortFunc;
    public readonly visible: PureComputed<boolean>;

    public index: number;
    public width: number;

    private readonly _visible: Observable<boolean>;
    private readonly grid: Grid;
    private readonly resizeOnDataCallback?: (col: Column) => void;
    private readonly sortCallback?: (
        col: Column,
        direction: SortDirection,
        isMulti: boolean
    ) => void;

    private clicks: number;
    private eventTarget?: HTMLElement;
    private origWidth: number;
    private startMousePosition: number;
    private timer?: number;

    public getProperty(row: Row): Maybe<Value> {
        let ret = row.getProperty(this.field);
        if (this.cellFilter) {
            ret = this.cellFilter(ret);
        }
        return ret;
    }

    public toggleVisible(val?: boolean): void {
        const v = val == null ? !this._visible() : val;
        this._visible(v);
        domUtilityService.buildStyles(this.grid);
    }

    public sort(data?: any, event?: JQuery.Event): boolean {
        if (!this.sortable) {
            return true; // column sorting is disabled, do nothing
        }
        const dir =
            this.sortDirection() === SortDirection.Ascending
                ? SortDirection.Descending
                : SortDirection.Ascending;
        this.sortDirection(dir);
        if (this.sortCallback) {
            this.sortCallback(this, dir, !!(event && event.shiftKey));
        }
        return false;
    }

    public gripClick(data: any, event: JQuery.Event): void {
        event.stopPropagation();
        this.clicks++; //count clicks
        if (this.clicks === 1) {
            this.timer = window.setTimeout((): void => {
                //Here you can add a single click action.
                this.clicks = 0; //after action performed, reset counter
            }, doubleClickDelay);
        } else {
            clearTimeout(this.timer); //prevent single-click action
            if (this.resizeOnDataCallback) {
                this.resizeOnDataCallback(this); //perform double-click action
            }
            this.clicks = 0; //after action performed, reset counter
        }
    }

    public gripOnMouseDown(event: JQuery.MouseDownEvent): boolean {
        event.stopPropagation();
        if (event.target.parentElement) {
            this.eventTarget = event.target.parentElement;
            if (this.eventTarget) {
                this.eventTarget.style.cursor = 'col-resize';
            }
            this.startMousePosition = event.clientX;
            this.origWidth = this.width;
            $(document)
                .on('mousemove.kgColumn', this.onMouseMove.bind(this))
                .on('mouseup.kgColumn', this.gripOnMouseUp.bind(this));
        }

        return false;
    }

    private onMouseMove(event: JQuery.TriggeredEvent): boolean {
        event.stopPropagation();
        const diff = (event as JQuery.MouseMoveEvent).clientX - this.startMousePosition;
        const newWidth = diff + this.origWidth;
        this.width =
            newWidth < this.minWidth
                ? this.minWidth
                : newWidth > this.maxWidth
                ? this.maxWidth
                : newWidth;
        domUtilityService.buildStyles(this.grid);
        return false;
    }

    private gripOnMouseUp(event: JQuery.TriggeredEvent): boolean {
        event.stopPropagation();
        $(document).off('mousemove.kgColumn mouseup.kgColumn');
        const htmlTarget = this.eventTarget as HTMLElement;
        if (htmlTarget) {
            htmlTarget.style.cursor = this.sortable ? 'pointer' : 'default';
            this.eventTarget = undefined;
            this.grid.trigger(GridEventType.ColumnWidthsChanged, [this]);
            this.grid.trigger(GridEventType.SettingsChangedByUser, {
                columnDefs: this.grid.settings().columnDefs,
            });
        }

        return false;
    }

    private readIsGroupedBy(): boolean {
        return this.groupIndex() !== -1;
    }

    private readGroupedByClass(): string {
        return this.isGroupedBy() ? 'kgGroupedByIcon' : 'kgGroupIcon';
    }

    private readNoSortVisible(): boolean {
        return !this.sortDirection();
    }

    private readShowSortButtonDown(): boolean {
        return this.sortable && this.sortDirection() === SortDirection.Descending;
    }

    private readShowSortButtonUp(): boolean {
        return this.sortable && this.sortDirection() === SortDirection.Ascending;
    }

    private readVisible(): boolean {
        return this._visible();
    }

    private writeVisible(val: boolean): void {
        this.toggleVisible(val);
    }
}

function getCellClass(cellClass: string | undefined, fixedClass: string): string {
    return cellClass ? cellClass + ' ' + fixedClass : fixedClass;
}

function getFixedClass(fixed: boolean): string {
    return fixed ? 'kgFixedColumn' : 'kgNonFixedColumn';
}
