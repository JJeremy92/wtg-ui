import $ from 'jquery';
import ko from 'knockout';
import Grid from '../classes/Grid';
import { GridEventType } from '../constants';
import { GridRow } from '../types';

ko.bindingHandlers.kgRow = {
    init: function (
        element: HTMLElement,
        valueAccessor,
        allBindings,
        viewModel: GridRow,
        bindingContext
    ): ko.BindingHandlerControlsDescendant {
        const grid: Grid = bindingContext.$parent;
        const source = viewModel.isGroupRow ? grid.groupRowTemplate : grid.rowTemplate;
        const rowElem = $(source).appendTo(element);
        bindingContext.$row = viewModel;
        ko.applyBindings(bindingContext, rowElem[0]);
        grid.trigger(GridEventType.RowBound, { row: viewModel, rowElement: element });

        return { controlsDescendantBindings: true };
    },
};
