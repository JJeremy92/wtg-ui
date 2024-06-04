/* eslint-disable @typescript-eslint/no-empty-interface */

import ko from 'knockout';

export type Maybe<T> = T | null | undefined;
export type Value = string | number | boolean | object;

export interface Entity extends PropertyBag {}

export interface GridRow {
    readonly entity: Entity;
    readonly isGroupRow: boolean;
    readonly isSelected: ko.PureComputed<boolean>;
}

export interface PropertyBag {
    [propName: string]: Maybe<Value>;
}

export interface SortFunc {
    (a: any, b: any): number;
}
