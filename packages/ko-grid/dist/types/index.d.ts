/// <reference types="jquery" />
/// <reference types="jqueryui" />
import { AggregateOperation } from './constants';
import moveSelectionHandler from './moveSelectionHandler';
import './binding-handlers/koGrid';
import './binding-handlers/kgRow';
import './binding-handlers/kgFixedRow';
import './binding-handlers/kgFixedHeaderRow';
import './binding-handlers/kgCell';
import './binding-handlers/kgCellClass';
import './binding-handlers/kgHeaderRow';
import './binding-handlers/kgHeaderCell';
import './binding-handlers/kgGridForEach';
import './binding-handlers/mouseEvents';
import Column from './classes/Column';
import { DefaultAggregationProvider } from './classes/DefaultAggregationProvider';
import Dimension from './classes/Dimension';
import EventProvider from './classes/EventProvider';
import RowFactory from './classes/RowFactory';
import Grid from './classes/Grid';
import Group from './classes/Group';
import Range from './classes/Range';
import Row from './classes/Row';
import SearchProvider from './classes/SearchProvider';
import SelectionService from './classes/SelectionService';
import styleProvider from './styleProvider';
import { configure } from './configuration';
declare const _default: {
    AggregateOperation: typeof AggregateOperation;
    Column: typeof Column;
    config: typeof configure;
    DefaultAggregationProvider: typeof DefaultAggregationProvider;
    defaultGroupRowTemplate: () => string;
    defaultHeaderCellTemplate: () => string;
    defaultHeaderRowTemplate: () => string;
    defaultRowTemplate: () => string;
    Dimension: typeof Dimension;
    domUtilityService: {
        getGridContainers(rootEl: JQuery<HTMLElement>): import("./domUtilityService").GridContainers;
        updateGridLayout(grid: Grid): void;
        buildStyles(grid: Grid): void;
        scrollH: number;
        scrollW: number;
    };
    EventProvider: typeof EventProvider;
    Grid: typeof Grid;
    Group: typeof Group;
    moveSelectionHandler: typeof moveSelectionHandler;
    Range: typeof Range;
    Row: typeof Row;
    RowFactory: typeof RowFactory;
    SearchProvider: typeof SearchProvider;
    SelectionService: typeof SelectionService;
    sortService: {
        sort<T extends import("./types").Entity>(data: import("knockout").ObservableArray<T>, sortInfo?: import("./sortService").SortInfo | import("./sortService").SortInfo[] | undefined): void;
        sortNumber: (a: number, b: number) => number;
    };
    styleProvider: typeof styleProvider;
    utils: {
        visualLength(node: JQuery<HTMLElement>): number;
        evalProperty(entity: import("./types").Entity, path: string): import("./types").Maybe<import("./types").Value>;
        hasValue(value: import("./types").Maybe<import("./types").Value>): value is import("./types").Value;
        isPointerOverElement(event: JQuery.TriggeredEvent<any, any, any, any>, node: Element): boolean;
        newId: () => number;
    };
};
export default _default;
