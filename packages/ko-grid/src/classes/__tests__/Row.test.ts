import ko from 'knockout';
import { Mock } from 'ts-mockery';
import { Entity } from '../../types';
import Row from '../Row';
import SelectionService from '../SelectionService';

describe('row', function () {
    [true, false].forEach(function (value) {
        test('has flag for can select rows', function () {
            const selectionService = Mock.of<SelectionService>({ canSelectRows: value });
            const row = getRow({ selectionService });
            expect(row.canSelectRows).toBe(value);
        });
    });

    test('has entity', function () {
        const entity = {};
        const row = getRow({ entity });
        expect(row.entity).toBe(entity);
    });

    test('row index is 0 initially', function () {
        const row = getRow();
        expect(row.rowIndex()).toBe(0);
    });

    test('offset top is 0 initially', function () {
        const row = getRow();
        expect(row.offsetTop()).toBe('0px');
    });

    test('is not a group row', function () {
        const row = getRow();
        expect(row.isGroupRow).toBe(false);
    });

    [
        [0, true],
        [1, false],
        [2, true],
        [3, false],
        [4, true],
    ].forEach(function (testCase) {
        const index = testCase[0] as number;
        const isEven = testCase[1] as boolean;

        test(`is even for ${index} = ${isEven}`, function () {
            const row = getRow();
            row.rowIndex(index);
            expect(row.isEven()).toBe(isEven);
        });

        test(`is odd for ${index} = ${!isEven}`, function () {
            const row = getRow();
            row.rowIndex(index);
            expect(row.isOdd()).toBe(!isEven);
        });
    });

    [true, false].forEach(function (value) {
        test('selected state is obtained from selection service - ' + value, function () {
            const selectionService = Mock.of<SelectionService>({ isSelected: jest.fn() });
            const row = getRow({ selectionService });
            (selectionService.isSelected as jest.Mock).mockReturnValue(value);
            expect(row.isSelected()).toBe(value);
            expect(selectionService.isSelected).toHaveBeenCalledWith(row.entity);
        });
    });

    describe('getting property', function () {
        test('supports simple path', function () {
            const entity = { foo: 'bar' };
            const result = getRow({ entity }).getProperty('foo');
            expect(result).toBe('bar');
        });

        test('supports complex path', function () {
            const entity = { foo: { bar: ko.observable('meh') } };
            const result = getRow({ entity }).getProperty('foo.bar');
            expect(result).toBe('meh');
        });

        test('caches truthy value', function () {
            const entity = { foo: 'bar' };
            const row = getRow({ entity });
            row.getProperty('foo');
            entity.foo = 'meh';
            expect(row.getProperty('foo')).toBe('bar');
        });

        test('does not cache falsy value', function () {
            const entity = { foo: '' };
            const row = getRow({ entity });
            row.getProperty('foo');
            entity.foo = 'meh';
            expect(row.getProperty('foo')).toBe('meh');
        });
    });

    describe('toggling selected', function () {
        describe('given can select rows', function () {
            let row: Row;
            let selectionService: SelectionService;

            beforeEach(function () {
                selectionService = Mock.of<SelectionService>({
                    canSelectRows: true,
                    changeSelection: jest.fn(),
                });
                row = getRow({ selectionService });
            });

            test('allows event to bubble up', function () {
                const result = row.toggleSelected(row, Mock.of<JQuery.Event>());
                expect(result).toBe(true);
            });

            test('changes selection', function () {
                const event = Mock.of<JQuery.Event>();
                row.toggleSelected(row, event);
                expect(selectionService.changeSelection).toHaveBeenCalledWith(row, event);
            });
        });

        describe('given cannot select rows', function () {
            let row: Row;
            let selectionService: SelectionService;

            beforeEach(function () {
                selectionService = Mock.of<SelectionService>({
                    canSelectRows: false,
                    changeSelection: jest.fn(),
                });
                row = getRow({ selectionService });
            });

            test('allows event to bubble up', function () {
                const result = row.toggleSelected(row, Mock.of<JQuery.Event>());
                expect(result).toBe(true);
            });

            test('does not change selection', function () {
                row.toggleSelected(row, Mock.of<JQuery.Event>());
                expect(selectionService.changeSelection).not.toHaveBeenCalled();
            });
        });
    });

    function getRow(args?: { entity?: Entity; selectionService?: SelectionService }): Row {
        args = args || {};
        return new Row(args.entity || {}, args.selectionService || Mock.of<SelectionService>());
    }
});
