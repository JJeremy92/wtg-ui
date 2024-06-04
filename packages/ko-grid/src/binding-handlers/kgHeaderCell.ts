import $ from 'jquery';
import ko from 'knockout';
import Column from '../classes/Column';

ko.bindingHandlers.kgHeaderCell = {
    init: function (
        element: HTMLElement,
        valueAccessor,
        allBindings,
        viewModel: Column,
        bindingContext
    ): ko.BindingHandlerControlsDescendant {
        const headerCell = $(viewModel.headerCellTemplate).appendTo(element);
        ko.applyBindings(bindingContext, headerCell[0]);

        return { controlsDescendantBindings: true };
    },
};
