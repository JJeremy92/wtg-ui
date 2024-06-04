import $ from 'jquery';
import ko from 'knockout';
import { Mock } from 'ts-mockery';
import '../kgHeaderCell';
import Column from '../../classes/Column';

describe('kgHeaderCell binding', function () {
    let element: JQuery;

    beforeAll(function () {
        const headerCellTemplate = '<span data-bind="text: cellClass"></span>';
        element = $('<div data-bind="kgHeaderCell">');
        ko.applyBindings(
            Mock.of<Column>({ cellClass: 'foo', headerCellTemplate }),
            element[0]
        );
    });

    afterAll(function () {
        ko.removeNode(element[0]);
    });

    test('appends header cell template', function () {
        expect(element.find('span').length).toBe(1);
    });

    test('applies binding to content', function () {
        expect(element.find('span').text()).toBe('foo');
    });
});
