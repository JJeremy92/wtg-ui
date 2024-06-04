import $ from 'jquery';
import ko from 'knockout';
import { Mock } from 'ts-mockery';
import '../kgHeaderRow';
import Grid from '../../classes/Grid';

describe('kgHeaderRow binding', function () {
    let element: JQuery;

    beforeAll(function () {
        const headerRowTemplate = '<span data-bind="text: gridId"></span>';
        element = $('<div data-bind="kgHeaderRow">');
        ko.applyBindings(
            Mock.of<Grid>({ gridId: 'foo', headerRowTemplate }),
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
