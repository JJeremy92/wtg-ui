export declare const EXCESS_ROWS = 8;
export declare const SCROLL_THRESHOLD = 6;
export declare enum AggregateOperation {
    Total = "SUM",
    Average = "AVG"
}
export declare enum GridEventType {
    ColumnWidthsChanged = "columnWidthsChanged",
    GroupInfosChanged = "groupInfosChanged",
    GroupToggleStarted = "groupToggleStarted",
    RowBound = "rowBound",
    SettingsChangedByUser = "settingsChangedByUser",
    SortInfosChanged = "sortInfosChanged"
}
export declare enum ResizeTarget {
    Root = "root",
    Window = "window"
}
export declare enum RowReorderingMode {
    Native = "native",
    jQueryUI = "jquery-ui"
}
export declare enum SortDirection {
    Unspecified = "",
    Ascending = "asc",
    Descending = "desc"
}
