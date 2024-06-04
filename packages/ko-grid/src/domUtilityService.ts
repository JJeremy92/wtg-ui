import $ from 'jquery';
import Column from './classes/Column';
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

const domUtilityService = {
    getGridContainers(rootEl: JQuery): GridContainers {
        const $topPanel = rootEl.find('.kgTopPanel');
        const $headerContainer = $topPanel.find('.kgNonFixedHeaderContainer');
        const $fixedHeaderContainer = $topPanel.find('.kgFixedHeaderContainer');
        const $viewport = rootEl.find('.kgNonFixedViewport');
        const $fixedViewport = rootEl.find('.kgFixedViewport');

        return {
            $root: rootEl,
            $topPanel,
            $groupPanel: $topPanel.find('.kgGroupPanel'),
            $headerContainer,
            $headerScroller: $headerContainer.find('.kgHeaderScroller'),
            $viewport,
            $canvas: $viewport.find('.kgCanvas'),
            $fixedHeaderContainer,
            $fixedHeaderScroller: $fixedHeaderContainer.find('.kgHeaderScroller'),
            $fixedViewport,
            $fixedCanvas: $fixedViewport.find('.kgCanvas'),
        };
    },
    updateGridLayout(grid: Grid): void {
        //catch this so we can return the viewer to their original scroll after the resize!
        const scrollTop = grid.$viewport.scrollTop() || 0;
        //check to see if anything has changed
        grid.refreshDomSizes({ width: grid.$root.width() || 0, height: grid.$root.height() || 0 });
        grid.adjustScrollTop(scrollTop, true); //ensure that the user stays scrolled where they were
    },
    buildStyles(grid: Grid): void {
        const rowHeight = grid.rowHeight;
        const gridId = grid.gridId;

        let style = grid.styleSheet;

        if (!style) {
            style = document.createElement('style');
            style.id = gridId;
            style.type = 'text/css';
            document.body.appendChild(style);
            grid.styleSheet = style;
        }

        const totalNonFixedRowWidth = grid.totalNonFixedRowWidth();
        const kgHeaderScrollerWidth = totalNonFixedRowWidth + domUtilityService.scrollH;
        let css = [
            `.${gridId} .kgNonFixedCanvas { width: ${totalNonFixedRowWidth}px; }`,
            `.${gridId} .kgNonFixedRow { width: ${totalNonFixedRowWidth}px; height: ${rowHeight}px; }`,
            `.${gridId} .kgHeaderCell { height: ${grid.config.headerRowHeight - 1}px; }`,
            `.${gridId} .kgCell { height: ${rowHeight - 1}px; }`,
            `.${gridId} .kgNonFixedHeaderScroller { width: ${kgHeaderScrollerWidth}px; }`,
        ].concat(getColumnStyles(grid, grid.visibleNonFixedColumns()));

        if (grid.legacyMode) {
            css = css.concat(
                [
                    `.${gridId} .kgFixedRow { width: ${grid.totalFixedRowWidth()}px; height: ${rowHeight}px; }`,
                ],
                getColumnStyles(grid, grid.visibleFixedColumns())
            );
        }

        style.textContent = css.join('');
    },
    scrollH: 17, // default in IE, Chrome, & most browsers
    scrollW: 17, // default in IE, Chrome, & most browsers
};

function getColumnStyles(grid: Grid, columns: Readonly<Column[]>): string[] {
    const gridId = grid.gridId,
        css: string[] = [];
    let sumWidth = 0;

    columns.forEach((col, i): void => {
        css.push(
            `.${gridId} .${col.fixedClass}.col${i} { width: ${col.width}px; left: ${sumWidth}px; }`
        );
        sumWidth += col.width;
    });

    return css;
}

(function measureScrollbars(): void {
    const $testContainer = $('<div>')
        .height(100)
        .width(100)
        .css('position', 'absolute')
        .css('overflow', 'scroll')
        .append('<div style="height: 400px; width: 400px;">');
    $testContainer.appendTo(document.body);
    domUtilityService.scrollH = $testContainer.height() || 0 - $testContainer[0].clientHeight;
    domUtilityService.scrollW = $testContainer.width() || 0 - $testContainer[0].clientWidth;
    $testContainer.remove();
})();

export default domUtilityService;
