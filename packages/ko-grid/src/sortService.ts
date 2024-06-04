import ko, { Observable, ObservableArray } from 'knockout';
import configuration from './configuration';
import { SortDirection } from './constants';
import { Entity, Maybe, SortFunc, Value } from './types';
import utils from './utils';

export interface SortColumn {
    readonly field: string;
    readonly sortDirection?: Observable<SortDirection>;
    readonly sortingAlgorithm?: SortFunc;
}

export interface SortInfo {
    readonly column: SortColumn;
    readonly direction: SortDirection;
}

const colSortFnCache = new WeakMap<SortColumn, SortFunc>(); // cache of sorting functions. Once we create them, we don't want to keep re-doing it
const dateRE = /^(\d\d?)[/.-](\d\d?)[/.-]((\d\d)?\d\d)$/; // nasty regex for date parsing

function guessSortFn(item: Maybe<Value>): SortFunc | undefined {
    let sortFn: SortFunc | undefined; // sorting function that is guessed
    if (item == null || item === '') {
        return undefined;
    }
    const itemType = typeof item;
    //check for numbers and booleans
    switch (itemType) {
        case 'number':
            sortFn = sortNumber;
            break;
        case 'boolean':
            sortFn = sortBool;
            break;
        default:
            sortFn = undefined;
            break;
    }
    //if we found one, return it
    if (sortFn) {
        return sortFn;
    }
    //check if the item is a valid Date
    if (Object.prototype.toString.call(item) === '[object Date]') {
        return sortDate;
    }
    // if we aren't left with a string, return a basic sorting function...
    if (itemType !== 'string') {
        return basicSort;
    }
    // now lets string check..
    //check if the item data is a valid number
    if ((item as string).match(/^-?[£$¤]?[\d,.]+%?$/)) {
        return sortNumberStr;
    }
    // check for a date: dd/mm/yyyy or dd/mm/yy
    // can have / or . or - as separator
    // can be mm/dd as well
    const dateParts = (item as string).match(dateRE);
    if (dateParts) {
        // looks like a date
        const month = parseInt(dateParts[1], 10);
        const day = parseInt(dateParts[2], 10);
        if (month > 12) {
            // definitely dd/mm
            return sortDDMMStr;
        } else if (day > 12) {
            return sortMMDDStr;
        } else {
            // looks like a date, but we can't tell which, so assume that it's DD/MM
            return sortDDMMStr;
        }
    }
    //finally just sort the normal string...
    return sortAlpha;
}

function basicSort(a: Value, b: Value): number {
    if (a === b) {
        return 0;
    }
    if (a < b) {
        return -1;
    }
    return 1;
}

function sortNumber(a: number, b: number): number {
    return a - b;
}

function sortNumberStr(a: string, b: string): number {
    let badA = false;
    let badB = false;
    const numA = parseFloat(a.replace(/[^0-9.-]/g, ''));
    if (isNaN(numA)) {
        badA = true;
    }
    const numB = parseFloat(b.replace(/[^0-9.-]/g, ''));
    if (isNaN(numB)) {
        badB = true;
    }
    // we want bad ones to get pushed to the bottom... which effectively is "greater than"
    if (badA && badB) {
        return 0;
    }
    if (badA) {
        return 1;
    }
    if (badB) {
        return -1;
    }
    return numA - numB;
}

function sortAlpha(a: string, b: string): number {
    const strA = a.toLowerCase();
    const strB = b.toLowerCase();
    return strA === strB ? 0 : strA < strB ? -1 : 1;
}

function sortBool(a: boolean, b: boolean): number {
    if (a && b) {
        return 0;
    }
    if (!a && !b) {
        return 0;
    } else {
        return a ? 1 : -1;
    }
}

function sortDate(a: Date, b: Date): number {
    const timeA = a.getTime();
    const timeB = b.getTime();
    return timeA === timeB ? 0 : timeA < timeB ? -1 : 1;
}

function sortMMDDStr(a: string, b: string): number {
    return sortDateStr(a, b, false);
}

function sortDDMMStr(a: string, b: string): number {
    return sortDateStr(a, b, true);
}

function sortDateStr(a: string, b: string, isDDMM: boolean): number {
    const dateA = getStrDate(a, isDDMM);
    const dateB = getStrDate(b, isDDMM);
    return dateA === dateB ? 0 : dateA < dateB ? -1 : 1;
}

function getStrDate(dateStr: string, isDDMM: boolean): string {
    let m: string;
    let d: string;
    let y: string;
    let date = '';
    const mtch = dateStr.match(dateRE);
    if (mtch) {
        y = mtch[3];
        d = isDDMM ? mtch[1] : mtch[2];
        m = isDDMM ? mtch[2] : mtch[1];
        if (m.length === 1) {
            m = '0' + m;
        }
        if (d.length === 1) {
            d = '0' + d;
        }
        date = y + m + d;
    }
    return date;
}

function sortData<T extends Entity>(unwrappedData: T[], sortInfo: SortInfo): void {
    // grab the metadata for the rest of the logic
    const col = sortInfo.column;
    //see if we already figured out what to use to sort the column
    let sortFn = colSortFnCache.get(col);
    if (!sortFn) {
        if (col.sortingAlgorithm !== undefined) {
            sortFn = col.sortingAlgorithm;
            colSortFnCache.set(col, col.sortingAlgorithm);
        } else {
            // try and guess what sort function to use
            const item = unwrappedData[0];
            if (!item) {
                return;
            }
            sortFn = guessSortFn(item[col.field]);
            //cache it
            if (sortFn) {
                colSortFnCache.set(col, sortFn);
            } else {
                // we assign the alpha sort because anything that is null/undefined will never get passed to
                // the actual sorting function. It will get caught in our null check and returned to be sorted
                // down to the bottom
                sortFn = sortAlpha;
            }
        }
    }
    //now actually sort the data
    unwrappedData.sort((itemA: Entity, itemB: Entity): number => {
        const propA = configuration.evalProperty(itemA, col.field);
        const propB = configuration.evalProperty(itemB, col.field);
        // Empty values will be displayed at the top
        const propAIsEmpty = !utils.hasValue(propA);
        const propBIsEmpty = !utils.hasValue(propB);
        if (propBIsEmpty) {
            return propAIsEmpty ? 0 : 1;
        } else if (propAIsEmpty) {
            return -1;
        }
        //made it this far, we don't have to worry about null & undefined
        const val = (sortFn as SortFunc)(propA, propB);
        if (sortInfo.direction === SortDirection.Ascending) {
            return val;
        } else {
            return 0 - val;
        }
    });
}

export default {
    sort<T extends Entity>(data: ObservableArray<T>, sortInfo?: SortInfo | SortInfo[]): void {
        const unwrappedData = ko.unwrap(data);
        // first make sure we are even supposed to do work
        if (!unwrappedData || !sortInfo) {
            return;
        }

        if (Array.isArray(sortInfo)) {
            for (let i = sortInfo.length - 1; i >= 0; i--) {
                sortData(unwrappedData, sortInfo[i]);
            }
        } else {
            sortData(unwrappedData, sortInfo);
        }

        data(unwrappedData);
    },
    sortNumber,
};
