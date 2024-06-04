import { EXCESS_ROWS } from './constants';
import Grid from './classes/Grid';

//set event binding on the grid so we can select using the up/down keys
export default function moveSelectionHandler(grid: Grid, evt: JQuery.Event): boolean {
    const charCode = evt.which;
    // detect which direction for arrow keys to navigate the grid
    const offset = charCode === 38 ? -1 : charCode === 40 ? 1 : 0;
    const lastClickedRow = grid.selectionService.lastClickedRow;
    if (!offset || !lastClickedRow) {
        return true;
    }
    const items = grid.renderedRows();
    const index = items.indexOf(lastClickedRow) + offset;
    if (index < 0 || index >= items.length) {
        return true;
    }
    grid.selectionService.changeSelection(items[index], evt);
    if (index > items.length - EXCESS_ROWS) {
        grid.$viewport.scrollTop((grid.$viewport.scrollTop() || 0) + grid.rowHeight * EXCESS_ROWS);
    } else if (index < EXCESS_ROWS) {
        grid.$viewport.scrollTop((grid.$viewport.scrollTop() || 0) - grid.rowHeight * EXCESS_ROWS);
    }
    return false;
}
