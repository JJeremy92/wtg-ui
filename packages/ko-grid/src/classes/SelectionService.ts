import ko from 'knockout';
import { Entity, GridRow } from '../types';
import Grid from './Grid';
import Group from './Group';

export default class SelectionService {
    public constructor(grid: Grid) {
        this.grid = grid;
        this._lastClickedRow = undefined;
        this.selectedItemSet = ko.pureComputed(this.readSelectedItemSet, this);
    }

    private readonly grid: Grid;
    private readonly selectedItemSet: ko.PureComputed<Set<Entity>>;
    private _lastClickedRow?: GridRow;

    public get canSelectRows(): boolean {
        return this.grid.config.canSelectRows;
    }

    public get lastClickedRow(): GridRow | undefined {
        return this._lastClickedRow;
    }

    // function to manage the selection action of a data item (entity)
    public changeSelection(row: GridRow, evt: JQuery.Event): void {
        if (this.grid.multiSelect) {
            this.changeSelectionMulti(row, evt);
        } else {
            this.changeSelectionSingle(row, evt);
        }
        this._lastClickedRow = row;
    }

    public isSelected(entity: Entity): boolean {
        return this.selectedItemSet().has(entity);
    }

    public selectRange(startRow: GridRow, endRow: GridRow, keepLastSelected?: boolean): boolean {
        const grid = this.grid;
        const rowFactory = grid.rowFactory;
        const rowEntities = rowFactory.rowEntities();
        let startIndex = rowEntities.indexOf(startRow.entity);
        let endIndex = rowEntities.indexOf(endRow.entity);
        if (endIndex !== -1) {
            this._lastClickedRow = endRow;
        }
        if (startIndex === -1 || endIndex === -1) {
            return false;
        }

        if (endIndex < startIndex) {
            const tempIndex = startIndex;
            const tempRow = startRow;
            startIndex = endIndex;
            startRow = endRow;
            endIndex = tempIndex;
            endRow = tempRow;
        }

        if (Group.isGroupRow(endRow)) {
            endIndex += rowCount(endRow);
        }

        const selectedItems = keepLastSelected ? grid.selectedItems() : [];
        const selectedItemSet = keepLastSelected ? this.selectedItemSet() : undefined;
        for (; startIndex <= endIndex; startIndex++) {
            const entity = rowEntities[startIndex];
            if (
                !rowFactory.isGroupEntity(entity) &&
                (!selectedItemSet || !selectedItemSet.has(entity))
            ) {
                selectedItems.push(entity);
            }
        }

        grid.selectedItems(selectedItems);
        return true;
    }

    private changeSelectionMulti(row: GridRow, evt: JQuery.Event): void {
        if (evt.shiftKey) {
            const startRow = this._lastClickedRow;
            if ((!startRow || !this.selectRange(startRow, row, true)) && !isFullySelected(row)) {
                this.select(row, true);
            }
        } else if (evt.ctrlKey && !isArrowKeyUpDown(evt)) {
            this.select(row, !row.isSelected());
        } else {
            this.selectOnly(row);
        }
    }

    private changeSelectionSingle(row: GridRow, evt: JQuery.Event): void {
        if (evt.ctrlKey && !isArrowKeyUpDown(evt) && row.isSelected()) {
            this.select(row, false);
        } else if (!row.isGroupRow) {
            this.selectOnly(row);
        }
    }

    private select(row: GridRow, isSelected: boolean): void {
        const entities = flattenEntities(row);
        const selectedItemSet = this.selectedItemSet();
        let selectedItems = this.grid.selectedItems();

        if (isSelected) {
            entities.forEach(function (entity): void {
                if (!selectedItemSet.has(entity)) {
                    selectedItems.push(entity);
                }
            });
        } else if (entities.length === 1) {
            const index = selectedItems.indexOf(entities[0]);
            selectedItems.splice(index, 1);
        } else {
            const entitySet = new Set(entities);
            selectedItems = selectedItems.filter((x): boolean => !entitySet.has(x));
        }

        this.grid.selectedItems(selectedItems);
    }

    private selectOnly(row: GridRow): void {
        const selectedItems = this.grid.selectedItems;
        if (
            !isFullySelected(row) ||
            selectedItems().length !== (Group.isGroupRow(row) ? row.selectedChildren() : 1)
        ) {
            selectedItems(flattenEntities(row));
        }
    }

    private readSelectedItemSet(): Set<Entity> {
        return new Set(this.grid.selectedItems());
    }
}

function flattenEntities(row: GridRow): Entity[] {
    if (Group.isGroupRow(row)) {
        const entities: Entity[] = [];
        addGroupEntities(row, entities);
        return entities;
    } else {
        return [row.entity];
    }
}

function addGroupEntities(group: Group, entities: Entity[]): void {
    group.groupChildren.forEach(function (groupChild): void {
        addGroupEntities(groupChild, entities);
    });
    group.children.forEach(function (entity): void {
        entities.push(entity);
    });
}

function isArrowKeyUpDown(evt: JQuery.Event): boolean {
    return evt.keyCode === 38 || evt.keyCode === 40;
}

function isFullySelected(row: GridRow): boolean {
    return Group.isGroupRow(row) ? row.isFullySelected() : row.isSelected();
}

function rowCount(group: Group): number {
    let result = group.groupChildren.length + group.children.length;
    group.groupChildren.forEach(function (groupChild): void {
        result += rowCount(groupChild);
    });

    return result;
}
