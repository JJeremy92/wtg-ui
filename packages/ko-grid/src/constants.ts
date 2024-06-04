// the # of rows we want to add to the top and bottom of the rendered grid rows
export const EXCESS_ROWS = 8;
export const SCROLL_THRESHOLD = 6;

export enum AggregateOperation {
    Total = 'SUM',
    Average = 'AVG',
}

export enum GridEventType {
    ColumnWidthsChanged = 'columnWidthsChanged',
    GroupInfosChanged = 'groupInfosChanged',
    GroupToggleStarted = 'groupToggleStarted',
    RowBound = 'rowBound',
    SettingsChangedByUser = 'settingsChangedByUser',
    SortInfosChanged = 'sortInfosChanged',
}

export enum ResizeTarget {
    Root = 'root',
    Window = 'window',
}

export enum RowReorderingMode {
    Native = 'native',
    jQueryUI = 'jquery-ui',
}

export enum SortDirection {
    Unspecified = '',
    Ascending = 'asc',
    Descending = 'desc',
}
