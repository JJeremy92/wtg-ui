import Grid from './Grid';
import { GridOptions } from './grid-config';
export default class EventProvider {
    private constructor();
    private readonly grid;
    private colToMove?;
    private groupPlaceholder?;
    private groupToMove?;
    private rowToMove?;
    static init(grid: Grid, options: GridOptions): EventProvider;
    private assignGridEventHandlers;
    private assignEvents;
    private enableRowReordering;
    private onGroupDragStart;
    private onGroupDragEnter;
    private onGroupDragOver;
    private onGroupDragLeave;
    private onGroupDrop;
    private onHeaderDragStart;
    private onHeaderDragOver;
    private onHeaderDrop;
    private onTopPanelDragEnd;
    private activateJqueryUIRowDragging;
    private onRowMouseDown;
    private onRowDragOverNative;
    private onRowDragOverJQueryUI;
    private onRowDragOutJQueryUI;
    private onRowDropNative;
    private onRowDropJQueryUI;
    private onRowDropCore;
}
