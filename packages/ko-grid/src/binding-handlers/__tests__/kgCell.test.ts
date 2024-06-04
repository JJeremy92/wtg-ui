import $ from 'jquery';
import ko, { ObservableArray } from 'knockout';
import { Mock } from 'ts-mockery';
import '../kgCell';
import Column from '../../classes/Column';
import Row from '../../classes/Row';

describe('kgCell binding', function () {
    describe('when cell template is provided', function () {
        let element: JQuery;

        beforeAll(function () {
            element = $('<div data-bind="kgCell">');
            const cellTemplate = '<span data-bind="text: cellClass"></span>';
            ko.applyBindings(
                Mock.of<Column>({ cellClass: 'foo', cellTemplate }),
                element[0]
            );
        });

        afterAll(function () {
            ko.removeNode(element[0]);
        });

        test('appends cell template', function () {
            expect(element.find('span').length).toBe(1);
        });

        test('applies binding to content', function () {
            expect(element.find('span').text()).toBe('foo');
        });
    });

    describe('when cell template is not provided', function () {
        let parentElement: JQuery;
        let element: JQuery;
        let row: Row;
        let columns: ObservableArray<Column>;

        beforeAll(() => {
            columns = ko.observableArray([
                getColumn({ field: 'Col1' }),
                getColumn({ field: 'Col2' }),
                getColumn({ field: 'Col3' }),
                getColumn({ field: 'Col4' }),
                getColumn({ field: 'Col5' }),
                getColumn({ field: '', isGroupCol: true }),
            ]);
            parentElement = $(`
<div data-bind="foreach: $grid.columns">
    <div data-bind="kgCell">
</div>`);
            row = Mock.of<Row>({
                entity: {
                    Col1: 'my column value',
                    Col2: null,
                    Col3: undefined,
                    Col4: 0,
                    Col5: '<span>pacho</span>',
                },
            });

            ko.applyBindings(row, parentElement[0], (bindingContext) => {
                bindingContext.$grid = { columns };
            });

            element = getColumnElements();
        });

        afterAll(() => {
            ko.removeNode(parentElement[0]);
        });

        test('appends text directly in element', () => {
            expect($(element[0]).html()).toBe('my column value');
            expect($(element[1]).html()).toBe('');
            expect($(element[2]).html()).toBe('');
            expect($(element[3]).html()).toBe('0');
            expect($(element[4]).html()).toBe('&lt;span&gt;pacho&lt;/span&gt;');
        });

        test('uses column getProperty method with proper row', () => {
            expect(columns()[0].getProperty).toHaveBeenCalledWith(row);
            expect(columns()[1].getProperty).toHaveBeenCalledWith(row);
            expect(columns()[2].getProperty).toHaveBeenCalledWith(row);
            expect(columns()[3].getProperty).toHaveBeenCalledWith(row);
            expect(columns()[4].getProperty).toHaveBeenCalledWith(row);
        });

        test('does not use column getProperty method for group column', () => {
            expect(columns()[5].getProperty).not.toHaveBeenCalled();
        });

        function getColumn(props: Partial<Column>) {
            return Mock.of<Column>({
                ...props,
                getProperty: jest.fn(function (this: Column, row: Row) {
                    return row.entity[this.field];
                }),
            });
        }

        function getColumnElements(): JQuery {
            return parentElement.children('div');
        }
    });
});
