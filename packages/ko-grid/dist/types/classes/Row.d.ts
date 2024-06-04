/// <reference types="jquery" />
import { Observable, PureComputed } from 'knockout';
import { Entity, GridRow, Maybe, Value } from '../types';
import SelectionService from './SelectionService';
export default class Row implements GridRow {
    constructor(entity: Entity, selectionService: SelectionService);
    readonly canSelectRows: boolean;
    readonly entity: Entity;
    readonly isGroupRow: boolean;
    readonly isEven: PureComputed<boolean>;
    readonly isOdd: PureComputed<boolean>;
    readonly isSelected: PureComputed<boolean>;
    readonly offsetTop: Observable<string>;
    readonly rowIndex: Observable<number>;
    private readonly propertyCache;
    private readonly selectionService;
    getProperty(path: string): Maybe<Value>;
    toggleSelected(data: any, event: JQuery.Event): boolean;
    private readIsEven;
    private readIsOdd;
    private readIsSelected;
}
