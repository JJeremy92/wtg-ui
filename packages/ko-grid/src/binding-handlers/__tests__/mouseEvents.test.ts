import $ from 'jquery';
import ko from 'knockout';
import '../mouseEvents';

describe('mouseEvents binding', function () {
    describe('without any event handlers', function () {
        let element: JQuery;

        beforeEach(function () {
            element = $('<div data-bind="mouseEvents: options">');
        });

        afterEach(function () {
            ko.removeNode(element[0]);
        });

        test('does not blow up', function () {
            const action = () => ko.applyBindings({ options: {} }, element[0]);
            expect(action).not.toThrow();
        });
    });

    describe('with mouse down event handler', function () {
        let element: JQuery;
        let mouseDown: (event: JQueryMouseEventObject) => any;

        beforeEach(function () {
            element = $('<div data-bind="mouseEvents: options">');
            mouseDown = jest.fn();
            ko.applyBindings({ options: { mouseDown } }, element[0]);
        });

        afterEach(function () {
            ko.removeNode(element[0]);
        });

        test('hooks up event handler', function () {
            const event = $.Event('mousedown');
            element.trigger(event);
            expect(mouseDown).toHaveBeenCalledWith(event);
        });
    });
});
