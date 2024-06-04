/// <reference types="jquery" />
import { Entity, GridRow } from '../types';
import Grid from './Grid';
export default class SelectionService {
    constructor(grid: Grid);
    private readonly grid;
    private readonly selectedItemSet;
    private _lastClickedRow?;
    get canSelectRows(): boolean;
    get lastClickedRow(): GridRow | undefined;
    changeSelection(row: GridRow, evt: JQuery.Event): void;
    isSelected(entity: Entity): boolean;
    selectRange(startRow: GridRow, endRow: GridRow, keepLastSelected?: boolean): boolean;
    private changeSelectionMulti;
    private changeSelectionSingle;
    private select;
    private selectOnly;
    private readSelectedItemSet;
}
