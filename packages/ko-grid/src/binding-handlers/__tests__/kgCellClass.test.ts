import $ from 'jquery';
import ko from 'knockout';
import { Mock } from 'ts-mockery';
import '../kgCellClass';
import Column from '../../classes/Column';

describe('kgCell binding', function () {
    let parentElement: JQuery;
    let columns: ko.ObservableArray<Column>;

    beforeEach(function () {
        parentElement = $(`
<div data-bind="foreach: columns">
    <div data-bind="kgCellClass">
</div>`);

        columns = ko.observableArray([
            Mock.of<Column>({ cellClass: 'foo', cellTemplate: '<div></div>' }),
            Mock.of<Column>({ cellClass: 'bar' }),
        ]);

        ko.applyBindings({ columns }, parentElement[0]);
    });

    test('applies column cell class', function () {
        expect(col1().hasClass('foo')).toBe(true);
        expect(col1().hasClass('bar')).toBe(false);
        expect(col2().hasClass('foo')).toBe(false);
        expect(col2().hasClass('bar')).toBe(true);
    });

    test('applies kgCell class', function () {
        expect(col1().hasClass('kgCell')).toBe(true);
        expect(col2().hasClass('kgCell')).toBe(true);
    });

    test('applies col class with index', function () {
        expect(col1().hasClass('col0')).toBe(true);
        expect(col1().hasClass('col1')).toBe(false);
        expect(col2().hasClass('col0')).toBe(false);
        expect(col2().hasClass('col1')).toBe(true);
    });

    test('given cell template then does not apply kgCellText class', function () {
        expect(col1().hasClass('kgCellText')).toBe(false);
    });

    test('given no cell template then applies kgCellText class', function () {
        expect(col2().hasClass('kgCellText')).toBe(true);
    });

    test('given no cell template then applies kgCellText class', function () {
        expect(col2().hasClass('kgCellText')).toBe(true);
    });

    test('when moving columns around then should keep the classes accordingly', function () {
        columns([columns()[1], columns()[0]]);

        expect(col1().hasClass('bar')).toBe(true);
        expect(col1().hasClass('col0')).toBe(true);
        expect(col1().hasClass('col1')).toBe(false);

        expect(col2().hasClass('foo')).toBe(true);
        expect(col2().hasClass('col0')).toBe(false);
        expect(col2().hasClass('col1')).toBe(true);
    });

    function col1() {
        return parentElement.children().eq(0);
    }

    function col2() {
        return parentElement.children().eq(1);
    }
});
