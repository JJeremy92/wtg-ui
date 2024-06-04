import $ from 'jquery';
import ko from 'knockout';
import { Mock } from 'ts-mockery';
import Grid from '../../classes/Grid';
import { GridEventType } from '../../constants';
import { GridRow } from '../../types';
import '../kgRow';

describe('kgRow binding', function () {
    let element: JQuery;
    let grid: Grid;

    beforeAll(function () {
        element = $(
            '<div data-bind="foreach: renderedRows"><div class="kgRow" data-bind="kgRow" /></div>'
        );
        grid = Mock.of<Grid>({
            gridId: 'foo',
            renderedRows: ko.observableArray([
                Mock.of<GridRow>({ entity: { text: 'a' }, isGroupRow: false }),
                Mock.of<GridRow>({ entity: { text: 'b' }, isGroupRow: true }),
            ]),
            groupRowTemplate: '<span class="group" data-bind="text: entity.text"></span>',
            rowTemplate: '<span class="row" data-bind="text: entity.text"></span>',
            trigger: jest.fn(),
        });
        ko.applyBindings(grid, element[0]);
    });

    afterAll(function () {
        ko.removeNode(element[0]);
    });

    test('sets $row property on binding context', function () {
        expect(ko.contextFor(element.find('.kgRow')[0]).$row).toBe(grid.renderedRows()[0]);
        expect(ko.contextFor(element.find('.kgRow')[1]).$row).toBe(grid.renderedRows()[1]);
    });

    test('appends row template for non-group row', function () {
        expect(element.find('span:eq(0)').attr('class')).toBe('row');
    });

    test('appends group template for group row', function () {
        expect(element.find('span:eq(1)').attr('class')).toBe('group');
    });

    test('applies binding to content', function () {
        expect(element.find('span:eq(0)').text()).toBe('a');
        expect(element.find('span:eq(1)').text()).toBe('b');
    });

    test('should trigger RowBound event', function () {
        expect(grid.trigger).toBeCalledTimes(2);
        const rowElement = element.find('.row')[0];
        expect(grid.trigger).toBeCalledWith(GridEventType.RowBound, {
            row: ko.dataFor(rowElement),
            rowElement: rowElement.parentElement,
        });
        const groupElement = element.find('.group')[0];
        expect(grid.trigger).toBeCalledWith(GridEventType.RowBound, {
            row: ko.dataFor(groupElement),
            rowElement: groupElement.parentElement,
        });
    });
});
