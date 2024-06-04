import ko, { Observable, PureComputed } from 'knockout';
import configuration from '../configuration';
import { Entity, GridRow, Maybe, Value } from '../types';
import SelectionService from './SelectionService';

export default class Row implements GridRow {
    public constructor(entity: Entity, selectionService: SelectionService) {
        this.canSelectRows = selectionService.canSelectRows;
        this.entity = entity;
        this.selectionService = selectionService;
        this.isSelected = ko.pureComputed(this.readIsSelected, this);
        this.rowIndex = ko.observable(0);
        this.offsetTop = ko.observable('0px');
        this.isGroupRow = false;
        this.isEven = ko.pureComputed(this.readIsEven, this);
        this.isOdd = ko.pureComputed(this.readIsOdd, this);
        this.propertyCache = {};
    }

    public readonly canSelectRows: boolean;
    public readonly entity: Entity;
    public readonly isGroupRow: boolean;
    public readonly isEven: PureComputed<boolean>;
    public readonly isOdd: PureComputed<boolean>;
    public readonly isSelected: PureComputed<boolean>;
    public readonly offsetTop: Observable<string>;
    public readonly rowIndex: Observable<number>;

    private readonly propertyCache: { [key: string]: Maybe<Value> };
    private readonly selectionService: SelectionService;

    public getProperty(path: string): Maybe<Value> {
        return (
            this.propertyCache[path] ||
            (this.propertyCache[path] = configuration.evalProperty(this.entity, path))
        );
    }

    public toggleSelected(data: any, event: JQuery.Event): boolean {
        if (this.canSelectRows) {
            this.selectionService.changeSelection(this, event);
        }

        return true;
    }

    private readIsEven(): boolean {
        return this.rowIndex() % 2 === 0;
    }

    private readIsOdd(): boolean {
        return this.rowIndex() % 2 !== 0;
    }

    private readIsSelected(): boolean {
        return this.selectionService.isSelected(this.entity);
    }
}
