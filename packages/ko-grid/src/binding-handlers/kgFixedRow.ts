import $ from 'jquery';
import ko from 'knockout';
import Grid from '../classes/Grid';
import templates from '../templates/templates';
import { GridRow } from '../types';

ko.bindingHandlers.kgFixedRow = {
    init: function (
        element: HTMLElement,
        valueAccessor,
        allBindings,
        viewModel: GridRow,
        bindingContext
    ): ko.BindingHandlerControlsDescendant {
        const grid: Grid = bindingContext.$parent;
        const source = viewModel.isGroupRow
            ? templates.defaultFixedGroupTemplate()
            : grid.fixedRowTemplate;
        const rowElem = $(source).appendTo(element);
        bindingContext.$row = viewModel;
        ko.applyBindings(bindingContext, rowElem[0]);

        return { controlsDescendantBindings: true };
    },
};
