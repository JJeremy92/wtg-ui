export interface ResourceStringsProvider {
    columnMenuFilter: () => string;
    columnMenuGroupBy: () => string;
    columnMenuText: () => string;
    footerFirstPage: () => string;
    footerLastPage: () => string;
    footerNextPage: () => string;
    footerPageSize: () => string;
    footerPreviousPage: () => string;
    footerSelectedItems: () => string;
    footerShownItems: () => string;
    footerTotalItems: () => string;
    groupHeaderNoGroups: () => string;
    groupHeaderWithGroups: () => string;
}

export default {
    columnMenuFilter: (): string => 'Search Field:Value',
    columnMenuGroupBy: (): string => 'Group By',
    columnMenuText: (): string => 'Choose Columns:',
    footerFirstPage: (): string => 'First Page',
    footerLastPage: (): string => 'Last Page',
    footerNextPage: (): string => 'Next Page',
    footerPageSize: (): string => 'Page Size:',
    footerPreviousPage: (): string => 'Previous Page',
    footerSelectedItems: (): string => 'Selected Items:',
    footerShownItems: (): string => 'Showing:',
    footerTotalItems: (): string => 'Total Items:',
    groupHeaderNoGroups: (): string => 'Drag column here to group rows',
    groupHeaderWithGroups: (): string => 'Grouping By:',
};
