import $ from 'jquery';
import ko from 'knockout';
import Column from '../classes/Column';

ko.bindingHandlers.kgCell = {
    init: function (
        element: HTMLElement,
        valueAccessor,
        allBindings,
        viewModel: Column,
        bindingContext
    ): ko.BindingHandlerControlsDescendant {
        if (viewModel.cellTemplate) {
            const cell = $(viewModel.cellTemplate).appendTo(element);
            ko.applyBindings(bindingContext, cell[0]);
        }
        return { controlsDescendantBindings: true };
    },
    update: function (
        element: HTMLElement,
        valueAccessor,
        allBindings,
        viewModel: Column,
        bindingContext
    ): void {
        if (!viewModel.cellTemplate && !viewModel.isGroupCol) {
            const value = viewModel.getProperty(bindingContext.$parent);
            element.textContent = value != null ? value.toString() : '';
        }
    },
};
