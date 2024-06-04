/// <reference types="jquery" />
/// <reference types="jqueryui" />
import Grid from './classes/Grid';
export interface GridContainers {
    $canvas: JQuery;
    $fixedCanvas: JQuery;
    $fixedHeaderContainer: JQuery;
    $fixedHeaderScroller: JQuery;
    $fixedViewport: JQuery;
    $groupPanel: JQuery;
    $headerContainer: JQuery;
    $headerScroller: JQuery;
    $root: JQuery;
    $topPanel: JQuery;
    $viewport: JQuery;
}
declare const domUtilityService: {
    getGridContainers(rootEl: JQuery): GridContainers;
    updateGridLayout(grid: Grid): void;
    buildStyles(grid: Grid): void;
    scrollH: number;
    scrollW: number;
};
export default domUtilityService;
