import ko, { Observable, ObservableArray } from 'knockout';
import { SortDirection } from './constants';
import { Entity, SortFunc } from './types';
export interface SortColumn {
    readonly field: string;
    readonly sortDirection?: Observable<SortDirection>;
    readonly sortingAlgorithm?: SortFunc;
}
export interface SortInfo {
    readonly column: SortColumn;
    readonly direction: SortDirection;
}
declare function sortNumber(a: number, b: number): number;
declare const _default: {
    sort<T extends Entity>(data: ko.ObservableArray<T>, sortInfo?: SortInfo | SortInfo[] | undefined): void;
    sortNumber: typeof sortNumber;
};
export default _default;
