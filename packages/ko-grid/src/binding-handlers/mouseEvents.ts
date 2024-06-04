import $ from 'jquery';
import ko from 'knockout';

interface Options {
    mouseDown?: (event: JQueryMouseEventObject) => any;
}

ko.bindingHandlers.mouseEvents = {
    init: function (element, valueAccessor): void {
        const eFuncs: Options = valueAccessor();
        if (eFuncs.mouseDown) {
            $(element).on('mousedown', eFuncs.mouseDown);
        }
    },
};
