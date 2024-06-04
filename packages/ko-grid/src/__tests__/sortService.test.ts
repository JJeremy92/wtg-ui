import ko, { ObservableArray } from 'knockout';
import { Mock } from 'ts-mockery';
import { SortDirection } from '../constants';
import sortService from '../sortService';
import Column from '../classes/Column';

describe('Sorting Tests', function () {
    test('should not sort data when SortInfo is undefined', function () {
        const testData = getSortingTestData();
        const sortedData = ko.observableArray(testData.slice(0));
        sortService.sort(sortedData);
        expect(sortedData()).toEqual(testData);
    });

    test('should use column sortingAlgorithm', function () {
        const testData = getSortingTestData();
        const sortedData = ko.observableArray(testData.slice(0));
        const column = Mock.of<Column>({ field: 'string', sortingAlgorithm: jest.fn() });
        sortService.sort(sortedData, {
            column: column,
            direction: SortDirection.Ascending,
        });
        expect(column.sortingAlgorithm).toHaveBeenCalled();
    });

    test('should return empty array when no data to sort', function () {
        const sortedData = ko.observableArray();
        sortService.sort(sortedData, {
            column: Mock.of<Column>({ field: 'string' }),
            direction: SortDirection.Ascending,
        });
        expect(sortedData()).toEqual([]);
    });

    test('should return testData when cannot find column', function () {
        const testData = [{ id: 0 }, { id: 1 }];
        const sortedData = ko.observableArray(testData.slice(0));
        sortService.sort(sortedData, {
            column: Mock.of<Column>({ field: 'string' }),
            direction: SortDirection.Ascending,
        });
        expect(sortedData()).toEqual(testData);
    });

    test('should cache sorting function', function () {
        const testData = [{ id: 0 }, { id: 1 }];
        const sortedData = ko.observableArray(testData.slice(0));

        const sortingAlgorithmSpy = jest.fn();
        const column = Mock.of<Column>({
            field: 'id',
            sortingAlgorithm: sortingAlgorithmSpy,
        });
        sortService.sort(sortedData, {
            column: column,
            direction: SortDirection.Ascending,
        });

        const sortingAlgorithmSpy1 = jest.fn();
        Mock.extend(column).with({ sortingAlgorithm: sortingAlgorithmSpy1 });
        sortService.sort(sortedData, {
            column: column,
            direction: SortDirection.Ascending,
        });

        expect(sortingAlgorithmSpy).toHaveBeenCalledTimes(2);
        expect(sortingAlgorithmSpy1).not.toHaveBeenCalled();
    });

    test('should not trigger another sort when we are already sorting', function () {
        const testData = [{ id: 0 }, { id: 1 }];
        const sortedData = ko.observableArray(testData.slice(0));
        const spy = jest.setTimeout(1000).fn();
        const column = Mock.of<Column>({ field: 'id', sortingAlgorithm: spy });
        const action = function () {
            sortService.sort(sortedData, {
                column: column,
                direction: SortDirection.Ascending,
            });
        };
        setTimeout(action, 10);
        action();
        expect(column.sortingAlgorithm).toHaveBeenCalledTimes(1);
    });

    test.each<[string, SortDirection, number[]]>([
        ['string', SortDirection.Ascending, [4, 6, 1, 2, 3, 5]],
        ['string', SortDirection.Descending, [3, 5, 2, 1, 6, 4]],
        ['number', SortDirection.Ascending, [4, 1, 2, 3, 6, 5]],
        ['number', SortDirection.Descending, [5, 6, 3, 2, 1, 4]],
        ['observable', SortDirection.Ascending, [6, 4, 3, 5, 1, 2]],
        ['observable', SortDirection.Descending, [6, 2, 1, 5, 3, 4]],
        ['numberString', SortDirection.Ascending, [5, 6, 1, 3, 2, 4]],
        ['numberString', SortDirection.Descending, [5, 6, 2, 4, 3, 1]],
        ['date', SortDirection.Ascending, [3, 5, 1, 4, 6, 2]],
        ['date', SortDirection.Descending, [2, 6, 4, 1, 3, 5]],
        ['dateString', SortDirection.Ascending, [6, 4, 1, 2, 5, 3]],
        ['dateString', SortDirection.Descending, [6, 3, 5, 2, 1, 4]],
        ['dateStringMMDD', SortDirection.Ascending, [6, 4, 1, 2, 3, 5]],
        ['dateStringMMDD', SortDirection.Descending, [6, 5, 2, 3, 1, 4]],
        ['dateStringDDMM', SortDirection.Ascending, [6, 4, 1, 2, 3, 5]],
        ['dateStringDDMM', SortDirection.Descending, [6, 5, 2, 3, 1, 4]],
        ['boolean', SortDirection.Ascending, [6, 2, 3, 4, 1, 5]],
        ['boolean', SortDirection.Descending, [6, 1, 5, 2, 3, 4]],
        ['array', SortDirection.Ascending, [2, 3, 1, 4, 5, 6]],
        ['array', SortDirection.Descending, [6, 5, 4, 1, 2, 3]],
    ])('%s sorting %s test', (field, sortDirection, expected) => {
        const testData = getSortingTestData();
        const sortedData = ko.observableArray(testData.slice(0));
        sort(sortedData, field, sortDirection);
        expect(sortedData().map((x) => x.sortIndex)).toEqual(expected);
    });

    function sort(sortedData: ObservableArray, field: string, direction: SortDirection) {
        sortService.sort(sortedData, {
            column: Mock.of<Column>({ field: field }),
            direction: direction,
        });
    }

    test('can sort by multiple columns', function () {
        const data = [
            { text: 'foo', number: 1 },
            { text: 'bar', number: 2 },
            { text: 'foo', number: 3 },
        ];

        const sortedData = ko.observableArray(data.slice());
        const sortInfo = [
            {
                column: Mock.of<Column>({ field: 'text' }),
                direction: SortDirection.Ascending,
            },
            {
                column: Mock.of<Column>({ field: 'number' }),
                direction: SortDirection.Descending,
            },
        ];

        sortService.sort(sortedData, sortInfo.slice());
        expect(sortedData()).toEqual([data[1], data[2], data[0]]);
        expect(sortInfo).toEqual(sortInfo);
    });

    test('empty values retain their original relative positions after sorting', function () {
        const sortedData = ko.observableArray([
            { val: null },
            { val: 'x' },
            { val: undefined },
            { val: '' },
            { val: 'y' },
        ]);
        sort(sortedData, 'val', SortDirection.Descending);
        expect(sortedData().map((x) => x.val)).toEqual([null, undefined, '', 'y', 'x']);
    });

    function getSortingTestData() {
        return [
            {
                sortIndex: 1,
                observable: ko.observable('abcde'),
                string: 'NEWB',
                number: 5,
                numberString: '110',
                date: new Date('12/4/1993'),
                dateString: '12/4/1977',
                dateStringMMDD: '5/24/1977',
                dateStringDDMM: '24/5/1977',
                boolean: true,
                array: ['a', 'b', 'c'],
            },
            {
                sortIndex: 2,
                observable: ko.observable('cdefg'),
                string: 'NIKE',
                number: 8,
                numberString: 'IAmNotANumber',
                date: new Date('12/4/1997'),
                dateString: '1/1/1985',
                dateStringMMDD: '01/1/1985',
                dateStringDDMM: '1/01/1985',
                boolean: false,
                array: 'InvalidArray',
            },
            {
                sortIndex: 3,
                observable: ko.observable('CDFGH'),
                string: 'REEB',
                number: 12,
                numberString: '1293',
                date: new Date('5/4/1993'),
                dateString: '05/3/2011',
                dateStringMMDD: '1/1/1985',
                dateStringDDMM: '1/1/1985',
                boolean: false,
                array: 'InvalidArray',
            },
            {
                sortIndex: 4,
                observable: ko.observable('ACDEF'),
                string: 'ADNumber',
                number: 2,
                numberString: 'IAmNotANumber',
                date: new Date('12/2/1997'),
                dateString: 'IAmNotADate',
                dateStringMMDD: 'IAmNotADate',
                dateStringDDMM: 'IAmNotADate',
                boolean: false,
                array: ['a4', 'b4', 'c4'],
            },
            {
                sortIndex: 5,
                observable: ko.observable('GJHLH'),
                string: 'REEB',
                number: 49,
                numberString: null,
                date: new Date('5/4/1993'),
                dateString: '05/2/2011',
                dateStringMMDD: '05/22/2011',
                dateStringDDMM: '22/22/2011',
                boolean: true,
                array: ['a5', 'b5', 'c5'],
            },
            {
                sortIndex: 6,
                observable: ko.observable(),
                string: 'BROOK',
                number: 17,
                numberString: '',
                date: new Date('12/3/1997'),
                dateString: undefined,
                dateStringMMDD: undefined,
                dateStringDDMM: undefined,
                boolean: null,
                array: ['a6', 'b6', 'c6'],
            },
        ];
    }
});
