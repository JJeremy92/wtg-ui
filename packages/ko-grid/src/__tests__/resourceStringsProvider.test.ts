import provider from '../ResourceStringsProvider';

describe('constructor', function () {
    test('should initialize methods correctly', function () {
        expect(provider.columnMenuFilter()).toBe('Search Field:Value');
        expect(provider.columnMenuGroupBy()).toBe('Group By');
        expect(provider.columnMenuText()).toBe('Choose Columns:');
        expect(provider.footerFirstPage()).toBe('First Page');
        expect(provider.footerLastPage()).toBe('Last Page');
        expect(provider.footerNextPage()).toBe('Next Page');
        expect(provider.footerPageSize()).toBe('Page Size:');
        expect(provider.footerPreviousPage()).toBe('Previous Page');
        expect(provider.footerSelectedItems()).toBe('Selected Items:');
        expect(provider.footerShownItems()).toBe('Showing:');
        expect(provider.footerTotalItems()).toBe('Total Items:');
        expect(provider.groupHeaderNoGroups()).toBe('Drag column here to group rows');
        expect(provider.groupHeaderWithGroups()).toBe('Grouping By:');
    });
});
