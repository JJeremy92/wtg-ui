import ko from 'knockout';
import Column from '../classes/Column';

ko.bindingHandlers.kgCellClass = {
    update: function (
        element: HTMLElement,
        valueAccessor,
        allBindings,
        viewModel: Column,
        bindingContext
    ): void {
        const index = bindingContext.$index && bindingContext.$index();
        let className = viewModel.cellClass + ' kgCell col' + index;
        if (!viewModel.cellTemplate) {
            className += ' kgCellText';
        }
        element.className = className;
    },
};
