import $ from 'jquery';
import ko from 'knockout';
import configuration from '../configuration';
import { EXCESS_ROWS, GridEventType, SCROLL_THRESHOLD, SortDirection } from '../constants';
import domUtilityService from '../domUtilityService';
import sortService, { SortInfo } from '../sortService';
import styleProvider, { SizeStyle } from '../styleProvider';
import templates from '../templates/templates';
import { Entity, GridRow, Maybe, PropertyBag, Value } from '../types';
import utils from '../utils';
import { AggregationService } from './AggregationService';
import Column, { ColumnDefinition } from './Column';
import { AggregationResult, DefaultAggregationProvider } from './DefaultAggregationProvider';
import Dimension from './Dimension';
import EventProvider from './EventProvider';
import {
    getGridConfig,
    getPagingOptions,
    GridConfig,
    GridEventHandler,
    GridEventMap,
    GridOptions,
    GridSettings,
    GroupInfo,
    PagingOptions
} from './grid-config';
import MessageBus from './MessageBus';
import Range from './Range';
import RowFactory from './RowFactory';
import SearchProvider from './SearchProvider';
import SelectionService from './SelectionService';

export default class Grid {
    private constructor(options: GridOptions) {
        const config = getGridConfig(options);
        this.config = config;
        this.gridId = 'ng' + utils.newId();
        this.$userViewModel = options.userViewModel;

        const gridContainers = options.gridContainers;
        this.$root = gridContainers.$root; //this is the root element that is passed in with the binding handler
        this.$topPanel = gridContainers.$topPanel;
        this.$groupPanel = gridContainers.$groupPanel;
        this.$headerContainer = gridContainers.$headerContainer;
        this.$headerScroller = gridContainers.$headerScroller;
        this.$fixedHeaderContainer = gridContainers.$fixedHeaderContainer;
        this.$fixedHeaderScroller = gridContainers.$fixedHeaderScroller;
        this.$viewport = gridContainers.$viewport;
        this.$canvas = gridContainers.$canvas;
        this.$fixedViewport = gridContainers.$fixedViewport;
        this.$fixedCanvas = gridContainers.$fixedCanvas;

        this.legacyMode = options.legacyMode;

        this.prevScrollTop = 0;
        this.prevScrollIndex = 0;
        this.rootDim = options.gridDim;
        this.jqueryUITheme = !!options.jqueryUITheme;
        this.footerVisible = options.footerVisible !== false;
        this.viewportDimHeight = ko.pureComputed(this.readViewportDimHeight, this);
        this.viewportDimWidth = ko.pureComputed(this.readViewportDimWidth, this);
        this.fixedViewportDimWidth = ko.pureComputed(this.totalFixedRowWidth, this);

        this.maxCanvasHt = ko.observable(0);

        this.sortInfos = ko.observable(options.sortInfos || []);
        this.sortedData = options.data;

        this.showFilter = options.showFilter !== false;
        this.filteredData = ko.observableArray();
        this.filterText =
            (options.filterOptions && options.filterOptions.filterText) || ko.observable('');
        this.totalFilteredItemsLength = ko.pureComputed(this.readTotalFilteredItemsLength, this);

        this.columns = ko.observableArray();
        this.visibleNonFixedColumns = ko.pureComputed(this.readVisibleNonFixedColumns, this);
        this.visibleFixedColumns = ko.pureComputed(this.readVisibleFixedColumns, this);
        this.nonGroupColumns = ko.pureComputed(this.readNonGroupColumns, this);
        this.maintainColumnRatios = options.maintainColumnRatios !== false;
        this.hasRatioColumn = false;

        this.rowHeight = options.rowHeight || 30;
        this.rowTemplate = options.rowTemplate || templates.defaultRowTemplate();
        this.groupRowTemplate = options.groupRowTemplate || templates.defaultGroupRowTemplate();
        this.fixedRowTemplate = options.fixedRowTemplate || templates.defaultFixedRowTemplate();
        this.headerRowTemplate = options.headerRowTemplate || templates.defaultHeaderRowTemplate();
        this.fixedHeaderRowTemplate =
            options.fixedHeaderRowTemplate || templates.defaultFixedHeaderRowTemplate();
        this.renderedRows = ko.observableArray();

        this.disableTextSelection = options.disableTextSelection !== false;
        this.multiSelect = config.canSelectRows && options.multiSelect !== false;
        this.selectedItems = options.selectedItems || ko.observableArray();
        this.selectedItemCount = ko.pureComputed(this.readSelectedItemCount, this);

        this.showMenu = ko.observable<boolean>(false);
        this.showColumnMenu = options.showColumnMenu !== false;
        this.enableGrouping = !!options.enableGrouping;
        this.topPanelHeight = this.enableGrouping
            ? config.headerRowHeight * 2
            : config.headerRowHeight;
        this.configGroups = ko.observableArray();
        this.ensureCanGroupData =
            options.ensureCanGroupData || ((): boolean => this.enableGrouping);
        this.groupPanelText = ko.pureComputed(this.readGroupPanelText, this);
        this.isDraggingOverGroups = ko.observable<boolean>(false);

        this.aggregateResults = ko.observableArray();
        this.enablePaging = !!options.enablePaging;
        this.pagingOptions = getPagingOptions(options);
        this.maxRows = ko.pureComputed(this.readMaxRows, this);
        this.maxPages = ko.pureComputed(this.readMaxPages, this);
        this.cantPageForward = ko.pureComputed(this.readCantPageForward, this);
        this.cantPageBackward = ko.pureComputed(this.readCantPageBackward, this);

        const styles = styleProvider(this);
        this.canvasStyle = styles.canvasStyle;
        this.footerStyle = styles.footerStyle;
        this.headerScrollerStyle = styles.headerScrollerStyle;
        this.headerStyle = styles.headerStyle;
        this.fixedHeaderStyle = styles.fixedHeaderStyle;
        this.topPanelStyle = styles.topPanelStyle;
        this.viewportPanelStyle = styles.viewportPanelStyle;
        this.viewportStyle = styles.viewportStyle;
        this.fixedViewportStyle = styles.fixedViewportStyle;
        this.groupPanelStyle = styles.groupPanelStyle;

        this.messageBus = new MessageBus();
        this.selectionService = new SelectionService(this);
        this.rowFactory = new RowFactory(this);
        this.searchProvider = new SearchProvider(this);
        this.aggregationService = new AggregationService(
            this,
            options.aggregationProvider ||
                new DefaultAggregationProvider(
                    (): Entity[] => this.sortedData(),
                    (entity: Entity, path: string): Promise<Maybe<Value>> =>
                        Promise.resolve(utils.evalProperty(entity, path))
                )
        );

        this.hoveredEntity = ko.observable();
    }

    public readonly $canvas: JQuery;
    public readonly $fixedCanvas: JQuery;
    public readonly $fixedHeaderContainer: JQuery;
    public readonly $fixedHeaderScroller: JQuery;
    public readonly $fixedViewport: JQuery;
    public readonly $groupPanel: JQuery;
    public readonly $headerContainer: JQuery;
    public readonly $headerScroller: JQuery;
    public readonly $root: JQuery;
    public readonly $topPanel: JQuery;
    public readonly $viewport: JQuery;
    public readonly $userViewModel: PropertyBag;
    public readonly cantPageBackward: ko.PureComputed<boolean>;
    public readonly cantPageForward: ko.PureComputed<boolean>;
    public readonly canvasStyle: ko.PureComputed<SizeStyle>;
    public readonly columns: ko.ObservableArray<Column>;
    public readonly config: GridConfig;
    public readonly configGroups: ko.ObservableArray<Column>;
    public readonly aggregateResults: ko.ObservableArray<AggregationResult>;
    public readonly aggregationService: AggregationService;
    public readonly disableTextSelection: boolean;
    public readonly enableGrouping: boolean;
    public readonly enablePaging: boolean;
    public readonly filteredData: ko.ObservableArray<Entity>;
    public readonly filterText: ko.Observable<string>;
    public readonly fixedHeaderRowTemplate: string;
    public readonly fixedHeaderStyle: ko.PureComputed<SizeStyle>;
    public readonly fixedRowTemplate: string;
    public readonly fixedViewportDimWidth: ko.PureComputed<number>;
    public readonly fixedViewportStyle: ko.PureComputed<SizeStyle>;
    public readonly footerStyle: ko.PureComputed<SizeStyle>;
    public readonly footerVisible: boolean;
    public readonly gridId: string;
    public readonly groupPanelStyle: ko.PureComputed<SizeStyle>;
    public readonly groupPanelText: ko.PureComputed<string>;
    public readonly groupRowTemplate: string;
    public readonly headerRowTemplate: string;
    public readonly headerScrollerStyle: ko.PureComputed<SizeStyle>;
    public readonly headerStyle: ko.PureComputed<SizeStyle>;
    public readonly hoveredEntity: ko.Observable<Entity | undefined>;
    public readonly isDraggingOverGroups: ko.Observable<boolean>;
    public readonly jqueryUITheme: boolean;
    public readonly legacyMode: boolean;
    public readonly maxCanvasHt: ko.Observable<number>;
    public readonly maxRows: ko.PureComputed<number>;
    public readonly multiSelect: boolean;
    public readonly nonGroupColumns: ko.PureComputed<Readonly<Column[]>>;
    public readonly pagingOptions: PagingOptions;
    public readonly renderedRows: ko.ObservableArray<Readonly<GridRow>>;
    public readonly rootDim: Dimension;
    public readonly rowFactory: RowFactory;
    public readonly rowHeight: number;
    public readonly rowTemplate: string;
    public readonly searchProvider: SearchProvider;
    public readonly selectedItemCount: ko.PureComputed<number>;
    public readonly selectedItems: ko.ObservableArray<Entity>;
    public readonly selectionService: SelectionService;
    public readonly showColumnMenu: boolean;
    public readonly showFilter: boolean;
    public readonly showMenu: ko.Observable<boolean>;
    public readonly sortedData: ko.ObservableArray<Entity>;
    public readonly topPanelHeight: number;
    public readonly topPanelStyle: ko.PureComputed<SizeStyle>;
    public readonly totalFilteredItemsLength: ko.PureComputed<number>;
    public readonly viewportDimHeight: ko.PureComputed<number>;
    public readonly viewportDimWidth: ko.PureComputed<number>;
    public readonly viewportPanelStyle: ko.PureComputed<SizeStyle>;
    public readonly viewportStyle: ko.PureComputed<SizeStyle>;
    public readonly visibleFixedColumns: ko.PureComputed<Readonly<Column[]>>;
    public readonly visibleNonFixedColumns: ko.PureComputed<Readonly<Column[]>>;

    public eventProvider?: EventProvider;
    public styleSheet: HTMLStyleElement | undefined;

    private readonly ensureCanGroupData: () => boolean;
    private readonly maintainColumnRatios: boolean;
    private readonly maxPages: ko.PureComputed<number>;
    private readonly messageBus: MessageBus;
    private readonly sortInfos: ko.Observable<SortInfo[]>;

    private hasRatioColumn: boolean;
    private prevScrollIndex: number;
    private prevScrollTop: number;

    public static init(options: GridOptions): Grid {
        const grid = new Grid(options);
        grid.buildColumns(options.columnDefs, options.groupInfos, options.sortInfos);
        grid.configGroups.subscribe(grid.onConfigGroupsChanged, grid);
        grid.sortInfos.subscribe(grid.onSortInfosChanged, grid);
        grid.filteredData.subscribe(grid.onFilteredDataChanged, grid);
        grid.searchProvider.evalFilter();
        grid.aggregationService.overrideAggregateInfosAsync(options.aggregateInfos || []);

        return grid;
    }

    public adjustScrollLeft(scrollLeft: number): void {
        this.$headerScroller.css('margin-left', -scrollLeft);
    }

    public adjustScrollTop(scrollTop: number, force?: boolean): void {
        if (!force && this.prevScrollTop === scrollTop) {
            return;
        }
        const rowIndex = Math.floor(scrollTop / this.rowHeight);
        // Have we hit the threshold going down?
        if (
            !force &&
            this.prevScrollTop < scrollTop &&
            rowIndex < this.prevScrollIndex + SCROLL_THRESHOLD
        ) {
            return;
        }
        //Have we hit the threshold going up?
        if (
            !force &&
            this.prevScrollTop > scrollTop &&
            rowIndex > this.prevScrollIndex - SCROLL_THRESHOLD
        ) {
            return;
        }
        this.prevScrollTop = scrollTop;
        const oldRange = this.rowFactory.renderedRange;
        const newRange = new Range(
            Math.max(0, rowIndex - EXCESS_ROWS),
            rowIndex + this.minRowsToRender() + EXCESS_ROWS
        );
        if (newRange.topRow < oldRange.topRow || newRange.bottomRow > oldRange.bottomRow) {
            this.rowFactory.updateViewableRange(newRange);
        }
        this.prevScrollIndex = rowIndex;
    }

    public adjustFixedViewportScrollTop(): void {
        if (!this.legacyMode) {
            return;
        }
        const viewportScrollTop = this.$viewport.scrollTop() || 0;
        const viewportHeight = this.$viewport.height() || 0;
        const scrollDiff = viewportScrollTop - (this.$fixedViewport.scrollTop() || 0);
        this.$fixedCanvas.css('margin-bottom', viewportHeight + scrollDiff);
        this.$fixedViewport.scrollTop(viewportScrollTop);
    }

    public groupColOffset(): number {
        return this.columns().findIndex((x): boolean => !x.fixed);
    }

    private buildColumns(
        columnDefs: ColumnDefinition[] | undefined,
        groupInfos: GroupInfo[] | undefined,
        sortInfos: SortInfo[] | undefined
    ): void {
        const columns: Column[] = [];
        const configGroups: Column[] = [];

        if (columnDefs && columnDefs.length > 0) {
            const sortInfoMap = getSortInfoMap(sortInfos ?? this.sortInfos());
            const sortCallback = this.sortData.bind(this);
            const resizeOnDataCallback = this.resizeOnData.bind(this);
            const columnMap =
                groupInfos && groupInfos.length && this.ensureCanGroupData()
                    ? new Map<string, Column>()
                    : undefined;

            columnDefs
                .sort((a, b): number => (a.fixed ? 0 : 1) - (b.fixed ? 0 : 1))
                .forEach((colDef, i): void => {
                    const column = new Column(
                        {
                            colDef: colDef,
                            index: i,
                            sortCallback: sortCallback,
                            resizeOnDataCallback: resizeOnDataCallback,
                            enableResize: this.config.enableColumnResize,
                            enableSort: this.config.enableSorting,
                        },
                        this
                    );

                    columns.push(column);
                    if (columnMap) {
                        columnMap.set(colDef.field, column);
                    }

                    const sortDirection = sortInfoMap.get(colDef.field);
                    if (sortDirection) {
                        column.sortDirection(sortDirection);
                    }
                });

            if (columnMap) {
                (groupInfos as GroupInfo[]).forEach(function (info): void {
                    const column = columnMap.get(info.field);
                    if (column) {
                        column.groupIndex(configGroups.length);
                        configGroups.push(column);
                    }
                });
            }
        }

        this.columns(columns);
        if (configGroups.length || this.configGroups().length) {
            this.configGroups(configGroups);
        }
    }

    public configureColumnWidths(): void {
        const asterisks: { index: number; value: number }[] = [];
        const percents: { index: number; value: number }[] = [];
        const columns = this.columns();
        let asteriskNum = 0;
        let totalWidth = 0;

        columns.forEach(function (col, i): void {
            let width = col.colDef.width;
            if (width == null) {
                col.colDef.width = width = '*';
            }

            // check if it is a number
            if (typeof width === 'string') {
                // figure out if the width is defined or if we need to calculate it
                if (width[0] === '*') {
                    asteriskNum += width.length;
                    asterisks.push({ index: i, value: width.length });
                } else if (width.endsWith('%')) {
                    // If the width is a percentage, save it until the very last.
                    percents.push({ index: i, value: parseInt(width.slice(0, -1), 10) / 100 });
                } else {
                    // we can't parse the width so lets throw an error.
                    throw new Error(
                        'unable to parse column width, use percentage ("10%","20%", etc...) or "*" to use remaining width of grid'
                    );
                }
            } else {
                totalWidth += col.width = width;
            }
        });

        // check if we saved any asterisk columns for calculating later
        if (asterisks.length > 0) {
            // get the remaining width
            const remainingWidth = this.rootDim.outerWidth() - totalWidth;
            // calculate the weight of each asterisk rounded down
            const asteriskVal = Math.floor(remainingWidth / asteriskNum);
            // set the width of each column based on the number of stars
            const isOverflowing = this.maxCanvasHt() > this.viewportDimHeight();
            asterisks.forEach(function (asterisk): void {
                const col = columns[asterisk.index];
                col.width = asteriskVal * asterisk.value;
                //check if we are on the last column
                if (asterisk.index + 1 === columns.length) {
                    let offset = 2; //We're going to remove 2 px so we won't overflow the viewport by default
                    if (isOverflowing) {
                        //compensate for scrollbar
                        offset += domUtilityService.scrollW;
                    }
                    col.width -= offset;
                }
                totalWidth += col.width;
            });
        }

        // Now we check if we saved any percentage columns for calculating last
        if (percents.length > 0) {
            // do the math
            const outerWidth = this.rootDim.outerWidth();
            percents.forEach(function (col): void {
                columns[col.index].width = Math.floor(outerWidth * col.value);
            });
        }

        this.columns(columns);
        this.hasRatioColumn = asterisks.length > 0;
        domUtilityService.buildStyles(this);
    }

    public fixColumnIndexes(): void {
        this.columns.peek().forEach(function (col, i): void {
            col.index = i;
        });
    }

    public fixGroupIndexes(): void {
        this.configGroups().forEach(function (item, i): void {
            item.groupIndex(i);
        });
    }

    public groupBy(col: Column, groupIndex?: number): void {
        if (this.ensureCanGroupData()) {
            const configGroups = this.configGroups();
            const targetIndex = groupIndex !== undefined ? groupIndex : configGroups.length;
            this.configGroups.splice(targetIndex, 0, col);
            if (targetIndex < configGroups.length - 1) {
                this.fixGroupIndexes();
            } else {
                col.groupIndex(targetIndex);
            }
            this.trigger(GridEventType.SettingsChangedByUser, { groupInfos: configGroups });
        }
    }

    public isHoveredEntity(entity: Entity): boolean {
        return this.legacyMode && entity === this.hoveredEntity();
    }

    public minRowsToRender(): number {
        const viewportH = this.viewportDimHeight() || 1;
        return Math.floor(viewportH / this.rowHeight);
    }

    public off(gridEventType: GridEventType, handler: GridEventHandler<any>): void {
        this.messageBus.unsubscribe(gridEventType, handler);
    }

    public on<T extends keyof GridEventMap>(
        gridEventType: T,
        handler: GridEventHandler<GridEventMap[T]>
    ): void {
        this.messageBus.subscribe(gridEventType, handler);
    }

    public overrideSettings(gridSettings: GridSettings, shouldTriggerEvent: boolean): void {
        if (gridSettings.columnDefs) {
            this.overrideColumnDefs(gridSettings.columnDefs, gridSettings.groupInfos, gridSettings.sortInfos);
        } else if (gridSettings.groupInfos) {
            this.overrideGroupInfos(gridSettings.groupInfos);
        }

        if (gridSettings.aggregateInfos) {
            this.aggregationService.overrideAggregateInfosAsync(gridSettings.aggregateInfos);
        }

        if (gridSettings.sortInfos) {
            this.overrideSortInfos(gridSettings.sortInfos);
        }

        if (shouldTriggerEvent) {
            this.trigger(GridEventType.SettingsChangedByUser, gridSettings);
        }
    }

    public pageBackward(): void {
        const page = this.pagingOptions.currentPage();
        this.pagingOptions.currentPage(Math.max(page - 1, 1));
    }

    public pageForward(): void {
        const page = this.pagingOptions.currentPage();
        this.pagingOptions.currentPage(Math.min(page + 1, this.maxPages()));
    }

    public pageToFirst(): void {
        this.pagingOptions.currentPage(1);
    }

    public pageToLast(): void {
        const maxPages = this.maxPages();
        this.pagingOptions.currentPage(maxPages);
    }

    public refreshDomSizes(rootDim?: { width: number; height: number }): void {
        if (rootDim) {
            this.rootDim.outerWidth(rootDim.width);
            this.rootDim.outerHeight(rootDim.height);
        }
        this.maxCanvasHt(this.calcMaxCanvasHeight());
    }

    public removeGroup(index: number): void {
        const columns = this.columns();
        const column = columns.find((x): boolean => x.groupIndex() === index);
        if (!column) {
            return;
        }

        column.groupIndex(-1);
        this.columns.splice(this.groupColOffset(), 1);
        this.configGroups.splice(index, 1);
        this.fixGroupIndexes();
        this.trigger(GridEventType.SettingsChangedByUser, { groupInfos: this.configGroups() });

        if (this.configGroups().length === 0) {
            this.fixColumnIndexes();
        }

        domUtilityService.buildStyles(this);
    }

    public settings(): GridSettings {
        return {
            columnDefs: this.columns()
                .filter((x): boolean => !x.isGroupCol)
                .map((x): ColumnDefinition => x.colDef),
            groupInfos: this.configGroups(),
            sortInfos: this.sortInfos(),
            aggregateInfos: this.aggregationService.aggregateConfig,
        };
    }

    public shouldMaintainColumnRatios(): boolean {
        return this.hasRatioColumn && this.maintainColumnRatios;
    }

    public toggleGroup(col: Column): void {
        const colIndex = this.configGroups().indexOf(col);
        if (colIndex === -1) {
            this.groupBy(col);
        } else {
            this.removeGroup(colIndex);
        }
    }

    public toggleShowMenu(): void {
        this.showMenu(!this.showMenu());
    }

    public trigger<T extends keyof GridEventMap>(gridEventType: T, data: GridEventMap[T]): void {
        this.messageBus.publish(gridEventType, { type: gridEventType, data });
    }

    private calcMaxCanvasHeight(): number {
        const dataLength = this.rowFactory.visibleRowCount();
        return dataLength * this.rowHeight;
    }

    private executeSorting(sortInfos: SortInfo[]): void {
        this.sortInfos(sortInfos);
        if (!this.config.useExternalSorting) {
            sortService.sort(this.sortedData, sortInfos);
        }
    }

    private onConfigGroupsChanged(configGroups: Column[]): void {
        this.trigger(GridEventType.GroupInfosChanged, configGroups);
        this.rowFactory.filteredDataChanged();
    }

    private onFilteredDataChanged(): void {
        this.maxCanvasHt(this.calcMaxCanvasHeight());
        this.aggregationService.refreshGridAggregatesAsync();
    }

    private onSortInfosChanged(sortInfos: SortInfo[]): void {
        this.trigger(GridEventType.SortInfosChanged, sortInfos);
    }

    private overrideColumnDefs(
        columnDefs: ColumnDefinition[],
        groupInfos: GroupInfo[] | undefined,
        sortInfos: SortInfo[] | undefined
    ): void {
        this.buildColumns(columnDefs, groupInfos || this.configGroups(), sortInfos);
        this.configureColumnWidths();
        this.trigger(GridEventType.ColumnWidthsChanged, this.columns());
    }

    private overrideGroupInfos(groupInfos: GroupInfo[]): void {
        const groupColOffset = this.groupColOffset();
        const oldConfigGroups = this.configGroups();
        oldConfigGroups.forEach((col): void => col.groupIndex(-1));

        if (groupInfos.length && this.ensureCanGroupData()) {
            const columnMap = new Map<string, Column>();
            this.columns().forEach((col): any => columnMap.set(col.field, col));

            const newConfigGroups: Column[] = [];
            groupInfos.forEach((info): void => {
                const col = columnMap.get(info.field);
                if (col) {
                    col.groupIndex(newConfigGroups.length);
                    newConfigGroups.push(col);
                }
            });

            if (newConfigGroups.length) {
                const subtraction = oldConfigGroups.length - newConfigGroups.length;
                const hasChanges =
                    subtraction !== 0 ||
                    newConfigGroups.some((col, i): boolean => col !== oldConfigGroups[i]);
                if (hasChanges) {
                    if (subtraction > 0) {
                        this.columns.splice(groupColOffset, subtraction);
                    }
                    this.configGroups(newConfigGroups);
                }
                return;
            }
        }

        if (oldConfigGroups.length) {
            this.columns.splice(groupColOffset, oldConfigGroups.length);
            this.configGroups.removeAll();
            this.fixColumnIndexes();
            domUtilityService.buildStyles(this);
        }
    }

    private overrideSortInfos(sortInfos: SortInfo[]): void {
        this.executeSorting(sortInfos);
    }

    private readCantPageBackward(): boolean {
        const curPage = this.pagingOptions.currentPage();
        return !(curPage > 1);
    }

    private readCantPageForward(): boolean {
        const curPage = this.pagingOptions.currentPage();
        const maxPages = this.maxPages();
        return !(curPage < maxPages);
    }

    private readGroupPanelText(): string {
        return this.configGroups().length > 0 || this.isDraggingOverGroups()
            ? configuration.resourceStringsProvider.groupHeaderWithGroups()
            : configuration.resourceStringsProvider.groupHeaderNoGroups();
    }

    private readMaxPages(): number {
        return Math.ceil(this.maxRows() / this.pagingOptions.pageSize());
    }

    private readMaxRows(): number {
        return Math.max(this.pagingOptions.totalServerItems() || this.totalFilteredItemsLength());
    }

    private readNonGroupColumns(): Readonly<Column[]> {
        return this.columns().filter((col): boolean => !col.isGroupCol);
    }

    private readSelectedItemCount(): number {
        return this.selectedItems().length;
    }

    private readTotalFilteredItemsLength(): number {
        return this.filteredData().length;
    }

    private readViewportDimHeight(): number {
        return Math.max(
            0,
            this.rootDim.outerHeight() - this.topPanelHeight - this.config.footerRowHeight
        );
    }

    private readViewportDimWidth(): number {
        const fixedRowsWidth = this.totalFixedRowWidth();
        return Math.max(0, this.rootDim.outerWidth() - (fixedRowsWidth > 0 ? fixedRowsWidth : 0));
    }

    private readVisibleFixedColumns(): Readonly<Column[]> {
        return this.columns().filter(
            (column): boolean => column.visible() && this.legacyMode && column.fixed
        );
    }

    private readVisibleNonFixedColumns(): Readonly<Column[]> {
        return this.columns().filter(
            (column: Column): boolean => column.visible() && (!this.legacyMode || !column.fixed)
        );
    }

    public totalFixedRowWidth(): number {
        let totalWidth = 0;
        this.visibleFixedColumns().forEach((col): void => {
            totalWidth += col.width;
        });
        return totalWidth;
    }

    public totalNonFixedRowWidth(): number {
        let totalWidth = 0;
        this.visibleNonFixedColumns().forEach((col): void => {
            totalWidth += col.width;
        });
        return totalWidth;
    }

    private resizeOnData(col: Column): void {
        // we calculate the longest data.
        const useFixedContainer = this.legacyMode && col.fixed;
        const headerScroller = useFixedContainer ? this.$fixedHeaderScroller : this.$headerScroller;
        const viewport = useFixedContainer ? this.$fixedViewport : this.$viewport;
        const index = useFixedContainer ? col.index : col.index - this.visibleFixedColumns().length;
        let longest = col.minWidth - 7;
        let elems = headerScroller
            .find(`.col${index} .kgHeaderText`)
            .add(viewport.find(`.col${index}.kgCellText`))
            .add(viewport.find(`.col${index} .kgCellText`));
        elems.each(function (i, elem): void {
            const visualLength = utils.visualLength($(elem)) + 10; // +10 some margin
            if (visualLength > longest) {
                longest = visualLength;
            }
        });
        col.width = Math.min(col.maxWidth, longest + 7); // + 7 px to make it look decent.
        domUtilityService.buildStyles(this);
    }

    private sortData(column: Column, direction: SortDirection, isMulti: boolean): void {
        const sortInfo = { column, direction };
        let sortInfos = this.sortInfos();

        if (isMulti) {
            sortInfos = sortInfos.filter((x): boolean => x.column.field !== column.field);
            sortInfos.push(sortInfo);
        } else {
            const columnFieldSet = new Set();
            sortInfos.forEach((otherInfo): void => {
                if (otherInfo.column.field !== column.field) {
                    columnFieldSet.add(otherInfo.column.field);
                }
            });

            this.columns().forEach((x): void => {
                if (columnFieldSet.has(x.field)) {
                    x.sortDirection(SortDirection.Unspecified);
                }
            });

            sortInfos = [sortInfo];
        }

        this.executeSorting(sortInfos);
        this.trigger(GridEventType.SettingsChangedByUser, { sortInfos });
    }
}

function getSortInfoMap(sortInfo: SortInfo[]): Map<string, SortDirection> {
    const result = new Map<string, SortDirection>();
    sortInfo.forEach(function (info): void {
        result.set(info.column.field, info.direction);
    });

    return result;
}
