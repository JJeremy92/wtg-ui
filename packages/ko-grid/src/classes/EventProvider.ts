import $ from 'jquery';
import ko from 'knockout';
import configuration from '../configuration';
import { GridEventType, ResizeTarget, RowReorderingMode } from '../constants';
import domUtilityService from '../domUtilityService';
import moveSelectionHandler from '../moveSelectionHandler';
import { GridRow, PropertyBag } from '../types';
import utils from '../utils';
import Column from './Column';
import Grid from './Grid';
import { GridOptions } from './grid-config';
import Row from './Row';

interface Group {
    col: Column;
    index: number;
}

const groupPanelDragOverClass = 'kgGroupPanel--drag-over';

export default class EventProvider {
    private constructor(grid: Grid) {
        this.grid = grid;
        this.colToMove = undefined;
        this.groupToMove = undefined;
        this.rowToMove = undefined;
        this.groupPlaceholder = undefined;
    }

    private readonly grid: Grid;

    private colToMove?: Column;
    private groupPlaceholder?: JQuery;
    private groupToMove?: Group;
    private rowToMove?: Row;

    public static init(grid: Grid, options: GridOptions): EventProvider {
        const provider = new EventProvider(grid);
        provider.assignGridEventHandlers(options);
        provider.assignEvents();

        return provider;
    }

    private assignGridEventHandlers(options: GridOptions): void {
        const grid = this.grid;
        grid.$viewport
            .on('scroll', function (e): void {
                const scrollLeft = e.target.scrollLeft;
                const scrollTop = e.target.scrollTop;
                grid.adjustScrollLeft(scrollLeft);
                grid.adjustScrollTop(scrollTop);
                grid.adjustFixedViewportScrollTop();
            })
            .on('keydown', function (e): boolean {
                return moveSelectionHandler(grid, e);
            });

        //Chrome and firefox both need a tab index so the grid can receive focus.
        //need to give the grid a tabindex if it doesn't already have one so
        //we'll just give it a tab index of the corresponding gridcache index
        //that way we'll get the same result every time it is run.
        //configurable within the options.
        let tabIndex = grid.config.tabIndex;
        if (tabIndex === -1) {
            tabIndex = document.querySelectorAll('.koGrid').length - 1;
        }
        grid.$viewport.attr('tabIndex', tabIndex);
        assignResizeEventHandler(grid, options);
    }

    private assignEvents(): void {
        const grid = this.grid;
        grid.$groupPanel
            .on('dragstart', '.kgGroupItem', this.onGroupDragStart.bind(this))
            .on('dragenter', this.onGroupDragEnter.bind(this))
            .on('dragover', this.onGroupDragOver.bind(this))
            .on('dragleave', this.onGroupDragLeave.bind(this))
            .on('drop', this.onGroupDrop.bind(this));

        grid.$topPanel
            .on('dragstart', '.kgHeaderSortColumn', this.onHeaderDragStart.bind(this))
            .on('dragenter dragover', '.kgHeaderCell', this.onHeaderDragOver.bind(this))
            .on('drop', '.kgHeaderSortColumn', this.onHeaderDrop.bind(this))
            .on('dragend', this.onTopPanelDragEnd.bind(this));

        this.enableRowReordering();

        if (grid.legacyMode) {
            const onRowHoverInBound = onRowHoverIn.bind(null, grid);
            const onRowHoverOutBound = onRowHoverOut.bind(null, grid);
            grid.$viewport
                .on('mouseenter', '.kgRow', onRowHoverInBound)
                .on('mouseleave', '.kgRow', onRowHoverOutBound);
            grid.$fixedViewport
                .on('mouseenter', '.kgRow', onRowHoverInBound)
                .on('mouseleave', '.kgRow', onRowHoverOutBound);
        }
    }

    private enableRowReordering(): void {
        const grid = this.grid;
        if (grid.config.rowReorderingMode === RowReorderingMode.jQueryUI) {
            const renderedRows = this.grid.$viewport.find('.kgRow');
            if (renderedRows.length) {
                this.grid.renderedRows().forEach((row, index): void => {
                    this.activateJqueryUIRowDragging(row, renderedRows.get(index), grid);
                });
            }

            grid.on(GridEventType.RowBound, ({ data }): void => {
                this.activateJqueryUIRowDragging(data.row, data.rowElement, grid);
            });
        } else if (grid.config.rowReorderingMode === RowReorderingMode.Native) {
            grid.$viewport
                .on('mousedown', '.kgRow', this.onRowMouseDown.bind(this))
                .on('dragover', this.onRowDragOverNative.bind(this))
                .on('drop', '.kgRow', this.onRowDropNative.bind(this));
        }
    }

    private onGroupDragStart(event: JQuery.TriggeredEvent): void {
        const groupItem = $(event.currentTarget);
        const groupItemScope = ko.dataFor<Column | undefined>(groupItem[0]);
        this.groupToMove = groupItemScope && {
            col: groupItemScope,
            index: groupItemScope.groupIndex(),
        };

        if (groupItemScope) {
            allowDragging(event);
            this.groupPlaceholder = createGroupPlaceholder(
                this.grid,
                groupItem.find('span:first').text()
            );
            // Needed so that the browser has enough time to register the element to be dragged
            // since when it is hidden the drag never starts. Once started, we can hide it.
            setTimeout(function (): void {
                groupItem.hide();
            });
        }
    }

    private onGroupDragEnter(event: JQuery.TriggeredEvent): void {
        if (this.groupPlaceholder) {
            event.preventDefault();
            this.grid.$groupPanel.addClass(groupPanelDragOverClass);
        }
    }

    private onGroupDragOver(event: JQuery.TriggeredEvent): void {
        const placeholder = this.groupPlaceholder;
        if (placeholder) {
            event.preventDefault();
            moveGroupPlaceholderToPointer(placeholder, event);
            placeholder.show();
            this.grid.isDraggingOverGroups(true);
        }
    }

    private onGroupDragLeave(event: JQuery.TriggeredEvent): void {
        if (this.groupPlaceholder && !utils.isPointerOverElement(event, this.grid.$groupPanel[0])) {
            this.groupPlaceholder.hide();
            this.grid.$groupPanel.removeClass(groupPanelDragOverClass);
            this.grid.isDraggingOverGroups(false);
        }
    }

    private onGroupDrop(event: JQuery.Event): void {
        event.preventDefault();
        const placeholder = this.groupPlaceholder;
        if (!placeholder) {
            return;
        }

        const grid = this.grid;
        const configGroups = grid.configGroups();
        const dropTarget = placeholder.next('.kgGroupItem');
        const groupScope =
            dropTarget.length === 0 ? undefined : ko.dataFor<Column | undefined>(dropTarget[0]);
        let targetIndex = groupScope ? groupScope.groupIndex() : configGroups.length;

        if (this.groupToMove) {
            if (!groupScope || this.groupToMove.index !== targetIndex) {
                if (targetIndex > this.groupToMove.index) {
                    targetIndex--;
                }
                configGroups.splice(this.groupToMove.index, 1);
                configGroups.splice(targetIndex, 0, this.groupToMove.col);
                grid.configGroups.valueHasMutated();
                grid.fixGroupIndexes();
            }
        } else if (this.colToMove && !configGroups.includes(this.colToMove)) {
            grid.groupBy(this.colToMove, targetIndex);
        }
    }

    private onHeaderDragStart(event: JQuery.TriggeredEvent): void {
        const sortColumn = event.currentTarget;
        this.colToMove = ko.dataFor<Column | undefined>(sortColumn);
        if (this.colToMove) {
            allowDragging(event);
            if (!this.grid.configGroups().includes(this.colToMove)) {
                this.groupPlaceholder = createGroupPlaceholder(
                    this.grid,
                    sortColumn.textContent as string
                );
            }
        }
    }

    private onHeaderDragOver(event: JQuery.TriggeredEvent): void {
        if (this.colToMove) {
            const targetClass = this.colToMove.fixed ? 'kgFixedColumn' : 'kgNonFixedColumn';
            if (event.currentTarget.classList.contains(targetClass)) {
                event.preventDefault();
            }
        }
    }

    private onHeaderDrop(event: JQuery.TriggeredEvent): void {
        event.preventDefault();
        if (!this.colToMove) {
            return;
        }
        const headerScope = ko.dataFor<Column | undefined>(event.currentTarget);
        if (headerScope && this.colToMove !== headerScope) {
            const grid = this.grid;
            const cols = grid.columns.peek();
            cols.splice(this.colToMove.index, 1);
            cols.splice(headerScope.index, 0, this.colToMove);
            grid.fixColumnIndexes();
            grid.columns.valueHasMutated();
            domUtilityService.buildStyles(grid);
            grid.trigger(GridEventType.SettingsChangedByUser, {
                columnDefs: grid.settings().columnDefs,
            });
        }
    }

    private onTopPanelDragEnd(): void {
        this.grid.$groupPanel.removeClass(groupPanelDragOverClass).find('.kgGroupItem').show();
        this.colToMove = undefined;
        this.groupToMove = undefined;
        if (this.groupPlaceholder) {
            this.groupPlaceholder.remove();
            this.groupPlaceholder = undefined;
            this.grid.isDraggingOverGroups(false);
        }
    }

    // Row functions
    private activateJqueryUIRowDragging(row: GridRow, rowElement: HTMLElement, grid: Grid): void {
        if (!row.isGroupRow) {
            const $row = $(rowElement);
            $row.draggable({
                scope: grid.gridId,
                helper: 'clone',
                handle: grid.config.rowReorderingHandle || undefined,
                appendTo: $row.parent(),
                stack: '.kgRow',
                containment: grid.$viewport,
                start: this.onRowMouseDown.bind(this),
                revert: true,
                revertDuration: 100,
                zIndex: 1000,
            }).droppable({
                scope: grid.gridId,
                over: this.onRowDragOverJQueryUI.bind(this),
                out: this.onRowDragOutJQueryUI,
                drop: this.onRowDropJQueryUI.bind(this),
            });
        }
    }

    private onRowMouseDown(event: Event): void {
        const targetRow = event.currentTarget as Element;

        // Get the scope from the row element
        // Save the row for later.
        this.rowToMove = ko.dataFor<Row | undefined>(targetRow);
        if (this.rowToMove) {
            // set draggable events
            targetRow.setAttribute('draggable', 'true');
        }
        this.grid.hoveredEntity(undefined);
    }

    private onRowDragOverNative(event: JQuery.Event): void {
        event.preventDefault();
    }

    private onRowDragOverJQueryUI(event: Event): void {
        const targetRow = event.target as Element;
        const targetRowScope = ko.dataFor<PropertyBag>(targetRow);

        if (typeof targetRowScope.rowIndex !== 'function') {
            return;
        }

        const rowToMove = this.rowToMove as Row;
        const rowToMoveIndex = rowToMove.rowIndex();
        const targetRowIndex = targetRowScope.rowIndex() as number;

        if (rowToMoveIndex > targetRowIndex) {
            targetRow.classList.add('kgRow--drag-over-top');
        } else {
            targetRow.classList.add('kgRow--drag-over-bottom');
        }
    }

    private onRowDragOutJQueryUI(event: Event): void {
        const row = event.target as Element;
        row.classList.remove('kgRow--drag-over-top');
        row.classList.remove('kgRow--drag-over-bottom');
    }

    private onRowDropNative(event: JQuery.TriggeredEvent): void {
        const dropTarget = event.currentTarget;
        this.onRowDropCore(dropTarget);
    }

    private onRowDropJQueryUI(event: Event): void {
        //We need to used target instead of currentTarget because jQueryUI sets currentTarget to window.document for some reason
        const dropTarget = event.target as Element;
        this.onRowDropCore(dropTarget);
    }

    private onRowDropCore(dropTarget: Element): void {
        const prevRow = this.rowToMove;
        if (!prevRow) {
            return;
        }
        // Get the scope from the row element.
        const rowScope = ko.dataFor<Row | undefined>(dropTarget);
        // If we have the same Row, do nothing.
        if (rowScope && prevRow !== rowScope) {
            // Splice the Rows via the actual datasource
            const grid = this.grid;
            const sd = grid.sortedData();
            const i = sd.indexOf(prevRow.entity);
            const j = sd.indexOf(rowScope.entity);
            sd.splice(i, 1);
            sd.splice(j, 0, prevRow.entity);
            grid.sortedData.valueHasMutated();
            grid.searchProvider.evalFilter();
        }
        // clear out the rowToMove object
        this.rowToMove = undefined;
    }
}

function allowDragging(event: JQuery.TriggeredEvent): void {
    // Needed to activate drag and drop in FireFox but requires preventDefault to be called
    // in subsequent drag events to avoid strange behaviours like URL redirecting.
    const dataTransfer = (event.originalEvent as DragEvent).dataTransfer;
    dataTransfer && dataTransfer.setData('text', '');
}

function assignResizeEventHandler(grid: Grid, options: GridOptions): void {
    const handler = function (): void {
        domUtilityService.updateGridLayout(grid);
        if (grid.shouldMaintainColumnRatios()) {
            grid.configureColumnWidths();
        }
    };
    if (options.resizeTarget === ResizeTarget.Root) {
        grid.$root.on('resize', handler);
    } else {
        $(window).on('resize', handler);
        ko.utils.domNodeDisposal.addDisposeCallback(grid.$root[0], function (): void {
            $(window).off('resize', handler);
        });
    }
}

function createGroupPlaceholder(grid: Grid, text: string): JQuery {
    let placeholder = grid.$groupPanel.find('.kgGroupPlaceholder');
    if (placeholder.length === 0) {
        placeholder = $(`
<div class="kgGroupPlaceholder">
    <div class="kgGroupElement">
        <div class="kgGroupName">
            <span></span>
            <span class="kgRemoveGroup ${configuration.css.removeGroupClass}">
                <span class="kgRemoveGroupText">x</span>
            </span>
        </div>
    </div>
</div>`);
        grid.$groupPanel.find('.kgGroupList').append(placeholder);
    }

    placeholder.hide().find('span:first').text(text.trim());

    return placeholder;
}

function moveGroupPlaceholderToPointer(placeholder: JQuery, event: JQuery.TriggeredEvent): void {
    const groupItem = $(event.target).closest('.kgGroupItem');
    if (groupItem.length > 0) {
        const centerPoint =
            (groupItem.offset() as JQueryCoordinates).left + (groupItem.width() || 0) / 2;
        (event.originalEvent as MouseEvent).pageX <= centerPoint
            ? placeholder.insertBefore(groupItem)
            : placeholder.insertAfter(groupItem);
    }
}

function onRowHoverIn(grid: Grid, e: JQuery.TriggeredEvent): void {
    const row = ko.dataFor<Row | undefined>(e.currentTarget);
    if (row) {
        grid.hoveredEntity(row.entity);
    }
}

function onRowHoverOut(grid: Grid): void {
    grid.hoveredEntity(undefined);
}
