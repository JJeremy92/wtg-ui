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
export declare type GridEventHandler<T> = (gridEvent: GridEvent<T>) => void;
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
    filterOptions?: Partial<FilterOptions & {
        filterText: ko.Observable<string>;
    }>;
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
export declare function getGridConfig(options: GridOptions): GridConfig;
export declare function getPagingOptions(options: GridOptions): PagingOptions;
export {};
