import bowser from 'bowser';
import $ from 'jquery';
import ko from 'knockout';
import Dimension from '../classes/Dimension';
import EventProvider from '../classes/EventProvider';
import Grid from '../classes/Grid';
import { GridEventOptions, GridOptions } from '../classes/grid-config';
import configuration from '../configuration';
import { GridEventType } from '../constants';
import domUtilityService from '../domUtilityService';
import templates from '../templates/templates';
import { PropertyBag } from '../types';
import './kgGridForEach';

ko.bindingHandlers.koGrid = {
    init: function (
        element: HTMLElement,
        valueAccessor,
        allBindings,
        viewModel,
        bindingContext
    ): ko.BindingHandlerControlsDescendant {
        const options: Partial<GridOptions> = Object.assign({}, valueAccessor());
        if (!options.data) {
            throw new Error('data must be specified.');
        }

        const elem = $(element).addClass('koGrid');
        const userViewModel: PropertyBag = bindingContext.$data;
        const gridElem = $(options.gridTemplate || templates.defaultGridTemplate()).appendTo(
            element
        );
        const gridContainers = domUtilityService.getGridContainers(elem);
        options.gridContainers = gridContainers;
        options.gridDim = new Dimension(elem.width() || 0, elem.height() || 0);
        options.userViewModel = userViewModel;

        initViewportBindingString(gridContainers.$viewport, options);
        initRowBindingString(gridContainers.$viewport, options);

        options.legacyMode =
            configuration.legacyMode != null
                ? configuration.legacyMode
                : bowser.test(['msie', 'msedge']);

        if (!options.legacyMode) {
            gridContainers.$fixedHeaderContainer.remove();
            gridContainers.$fixedHeaderContainer = $();
            gridContainers.$fixedHeaderScroller = $();
            gridContainers.$fixedViewport.remove();
            gridContainers.$fixedViewport = $();
            gridContainers.$fixedCanvas = $();
        }

        const grid = Grid.init(options as GridOptions);
        elem.addClass(grid.gridId.toString());
        options.data.subscribe(onDataChanged.bind(null, grid));

        const childBindingContext = bindingContext.createChildContext(grid);
        childBindingContext.$css = configuration.css;
        childBindingContext.$grid = grid;
        childBindingContext.$resStrings = configuration.resourceStringsProvider;
        childBindingContext.$userViewModel = userViewModel;
        ko.applyBindings(childBindingContext, gridElem[0]);

        domUtilityService.updateGridLayout(grid);
        grid.configureColumnWidths();
        grid.refreshDomSizes();

        //now use the manager to assign the event handlers
        grid.eventProvider = EventProvider.init(grid, options as GridOptions);

        //initialize plugins.
        if (options.plugins) {
            options.plugins.forEach(function (p): void {
                p.onGridInit(grid);
            });
        }

        domUtilityService.buildStyles(grid);
        initEventHandlers(grid, options.events);
        ko.utils.domNodeDisposal.addDisposeCallback(element, dispose.bind(null, grid));

        return { controlsDescendantBindings: true };
    },
};

function initViewportBindingString(viewport: JQuery, options: Partial<GridOptions>): void {
    if (options.viewportBindingString) {
        const bindingString = viewport.attr('data-bind') + ', ' + options.viewportBindingString;
        viewport.attr('data-bind', bindingString);
    }
}

function initRowBindingString(viewport: JQuery, options: Partial<GridOptions>): void {
    if (options.rowBindingString) {
        const row = viewport.find('.kgRow');
        const bindingString = row.attr('data-bind') + ', ' + options.rowBindingString;
        row.attr('data-bind', bindingString);
    }
}

function initEventHandlers(grid: Grid, events: GridEventOptions | undefined): void {
    if (!events) {
        return;
    }

    if (events.groupInfosChanged) {
        grid.on(GridEventType.GroupInfosChanged, events.groupInfosChanged);
    }

    if (events.sortInfosChanged) {
        grid.on(GridEventType.SortInfosChanged, events.sortInfosChanged);
    }
}

function dispose(grid: Grid): void {
    if (grid.styleSheet) {
        $(grid.styleSheet).remove();
    }
}

// TODO: WI00244945 - optimize the handlers below as some functions are called multiple times.

function onDataChanged(grid: Grid): void {
    grid.searchProvider.evalFilter();
    grid.refreshDomSizes();
}
