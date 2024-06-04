import $ from 'jquery';
import ko from 'knockout';
import { Mock } from 'ts-mockery';
import '../kgFixedHeaderRow';
import Grid from '../../classes/Grid';

describe('kgFixedHeaderRow binding', function () {
    let element: JQuery;

    beforeAll(function () {
        const fixedHeaderRowTemplate = '<span data-bind="text: gridId"></span>';
        element = $('<div data-bind="kgFixedHeaderRow">');
        ko.applyBindings(
            Mock.of<Grid>({ gridId: 'foo', fixedHeaderRowTemplate }),
            element[0]
        );
    });

    afterAll(function () {
        ko.removeNode(element[0]);
    });

    test('appends header row template', function () {
        expect(element.find('span').length).toBe(1);
    });

    test('applies binding to content', function () {
        expect(element.find('span').text()).toBe('foo');
    });
});
