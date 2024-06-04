import ko from 'knockout';
import { GridEventType, ResizeTarget, RowReorderingMode } from '../constants';
import { GridContainers } from '../domUtilityService';
import { SortInfo } from '../sortService';
import { Entity, GridRow, Maybe, PropertyBag, Value } from '../types';
import Column, { ColumnDefinition } from './Column';
import { AggregateInfo, AggregationProvider } from './DefaultAggregationProvider';
import Dimension from './Dimension';
import Grid from './Grid';
import Group from './Group';

interface Defaults {
    [key: string]: () => Maybe<Value>;
}

export interface FilterOptions {
    readonly filterThrottle?: number;
    readonly useExternalFilter: boolean;
}

export interface GridConfig extends Readonly<GridConfigBase> {
    readonly filterOptions: FilterOptions;
}

export interface GridConfigBase {
    canSelectRows: boolean;
    enableColumnResize: boolean;
    enableSorting: boolean;
    evalPropertyForGroup?: (entity: Entity, colDef: ColumnDefinition) => Maybe<Value>;
    footerRowHeight: number;
    headerRowHeight: number;
    rowReorderingHandle?: string;
    rowReorderingMode?: RowReorderingMode;
    tabIndex: number;
    useExternalSorting: boolean;
}

export interface GridEvent<T> {
    readonly data: T;
    readonly type: GridEventType;
}

export interface RowBoundData {
    readonly row: GridRow;
    readonly rowElement: HTMLElement;
}

export type GridEventHandler<T> = (gridEvent: GridEvent<T>) => void;

export interface GridEventMap {
    [GridEventType.ColumnWidthsChanged]: Column[];
    [GridEventType.GroupInfosChanged]: GroupInfo[];
    [GridEventType.GroupToggleStarted]: Group;
    [GridEventType.RowBound]: RowBoundData;
    [GridEventType.SettingsChangedByUser]: GridSettings;
    [GridEventType.SortInfosChanged]: SortInfo[];
}

export interface GridEventOptions {
    groupInfosChanged?: GridEventHandler<GroupInfo[]>;
    sortInfosChanged?: GridEventHandler<SortInfo[]>;
}

export interface GridOptions extends Partial<GridConfigBase> {
    aggregateInfos?: AggregateInfo[];
    aggregationProvider?: AggregationProvider;
    columnDefs?: ColumnDefinition[];
    data: ko.ObservableArray<Entity>;
    disableTextSelection?: boolean;
    enableGrouping?: boolean;
    enablePaging?: boolean;
    ensureCanGroupData?: () => boolean;
    events?: GridEventOptions;
    filterOptions?: Partial<FilterOptions & { filterText: ko.Observable<string> }>;
    fixedHeaderRowTemplate?: string;
    fixedRowTemplate?: string;
    footerVisible?: boolean;
    gridContainers: GridContainers;
    gridDim: Dimension;
    gridTemplate?: string;
    groupInfos?: GroupInfo[];
    groupRowTemplate?: string;
    headerRowTemplate?: string;
    jqueryUITheme?: boolean;
    legacyMode: boolean;
    maintainColumnRatios?: boolean;
    multiSelect?: boolean;
    pagingOptions?: Partial<PagingOptions>;
    plugins?: Plugin[];
    resizeTarget?: ResizeTarget;
    rowBindingString?: string;
    rowHeight?: number;
    rowTemplate?: string;
    selectedItems?: ko.ObservableArray<Entity>;
    showColumnMenu?: boolean;
    showFilter?: boolean;
    sortInfos?: SortInfo[] | undefined;
    userViewModel: PropertyBag;
    viewportBindingString?: string;
}

export interface GridSettings {
    readonly aggregateInfos?: AggregateInfo[];
    readonly columnDefs?: ColumnDefinition[];
    readonly groupInfos?: GroupInfo[];
    readonly sortInfos?: SortInfo[];
}

export interface GroupInfo {
    readonly field: string;
}

export interface PagingOptions {
    readonly currentPage: ko.Observable<number>;
    readonly pageSize: ko.Observable<number>;
    readonly pageSizes: ko.ObservableArray<number>;
    readonly totalServerItems: ko.Observable<number>;
}

interface Plugin {
    onGridInit: (grid: Grid) => void;
}

const defaults: Defaults = {
    canSelectRows: returnTrue,
    enableColumnResize: returnTrue,
    enableSorting: returnTrue,
    evalPropertyForGroup: returnUndefined,
    footerRowHeight: (): number => 55,
    headerRowHeight: (): number => 30,
    rowReorderingHandle: returnUndefined,
    rowReorderingMode: returnUndefined,
    tabIndex: (): number => -1,
    useExternalSorting: returnFalse,
};

const filterOptionsDefaults: Defaults = {
    filterThrottle: returnUndefined,
    useExternalFilter: returnFalse,
};

const pagingOptionsDefaults: Defaults = {
    currentPage: (): ko.Observable<number> => ko.observable(1),
    pageSize: (): ko.Observable<number> => ko.observable(250),
    pageSizes: (): ko.ObservableArray<number> => ko.observableArray([250, 500, 1000]),
    totalServerItems: (): ko.Observable<number> => ko.observable(0),
};

function mergeWithDefaults<T>(options: Partial<T> | undefined, defaults: Defaults): T {
    const result: PropertyBag = {};
    Object.keys(defaults).forEach(function (key): void {
        let value = options && (options as PropertyBag)[key];
        result[key] = value != null ? value : defaults[key]();
    });

    return result as any;
}

function returnFalse(): boolean {
    return false;
}

function returnUndefined(): undefined {
    return undefined;
}

function returnTrue(): boolean {
    return true;
}

export function getGridConfig(options: GridOptions): GridConfig {
    const result = mergeWithDefaults(options, defaults);
    result.filterOptions = mergeWithDefaults(options.filterOptions, filterOptionsDefaults);
    result.footerRowHeight = options.footerVisible !== false ? result.footerRowHeight : 0;

    return result as GridConfig;
}

export function getPagingOptions(options: GridOptions): PagingOptions {
    return mergeWithDefaults(options.pagingOptions, pagingOptionsDefaults);
}
