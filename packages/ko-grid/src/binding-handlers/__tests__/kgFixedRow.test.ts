import $ from 'jquery';
import ko from 'knockout';
import { Mock } from 'ts-mockery';
import Grid from '../../classes/Grid';
import templates from '../../templates/templates';
import { GridRow } from '../../types';
import '../kgFixedRow';

describe('kgFixedRow binding', function () {
    let element: JQuery;

    beforeAll(function () {
        jest.spyOn(templates, 'defaultFixedGroupTemplate').mockReturnValue(
            '<span class="fixedGroup" data-bind="text: entity.text"></span>'
        );
        element = $('<div data-bind="foreach: renderedRows"><div data-bind="kgFixedRow" /></div>');
        ko.applyBindings(
            Mock.of<Grid>({
                gridId: 'kgFixRowGrid',
                renderedRows: ko.observableArray([
                    Mock.of<GridRow>({ entity: { text: 'a' }, isGroupRow: false }),
                    Mock.of<GridRow>({ entity: { text: 'b' }, isGroupRow: true }),
                ]),
                fixedRowTemplate: '<span class="fixedRow" data-bind="text: entity.text"></span>',
            }),
            element[0]
        );
    });

    afterAll(function () {
        ko.removeNode(element[0]);
    });

    test('sets $row property on binding context', function () {
        const row1 = element.children()[0];
        const row2 = element.children()[1];
        expect(ko.contextFor(row1).$row).toBe(ko.dataFor(row1));
        expect(ko.contextFor(row2).$row).toBe(ko.dataFor(row2));
    });

    test('appends row template for non-group row', function () {
        expect(element.find('span:eq(0)').attr('class')).toBe('fixedRow');
    });

    test('appends group template for group row', function () {
        expect(element.find('span:eq(1)').attr('class')).toBe('fixedGroup');
    });

    test('applies binding to content', function () {
        expect(element.find('span:eq(0)').text()).toBe('a');
        expect(element.find('span:eq(1)').text()).toBe('b');
    });
});
