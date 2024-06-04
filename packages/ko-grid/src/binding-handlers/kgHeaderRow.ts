import $ from 'jquery';
import ko from 'knockout';
import Grid from '../classes/Grid';

ko.bindingHandlers.kgHeaderRow = {
    init: function (
        element: HTMLElement,
        valueAccessor,
        allBindings,
        viewModel: Grid,
        bindingContext
    ): ko.BindingHandlerControlsDescendant {
        const headerRow = $(viewModel.headerRowTemplate).appendTo(element);
        ko.applyBindings(bindingContext, headerRow[0]);

        return { controlsDescendantBindings: true };
    },
};
