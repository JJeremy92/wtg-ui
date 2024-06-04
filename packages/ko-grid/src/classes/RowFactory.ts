import configuration from '../configuration';
import { EXCESS_ROWS } from '../constants';
import domUtilityService from '../domUtilityService';
import { Entity, GridRow, Maybe, Value } from '../types';
import utils from '../utils';
import Column, { ColumnConfig } from './Column';
import Grid from './Grid';
import Group, { GroupEntity } from './Group';
import Range from './Range';
import Row from './Row';

const isGroupEntity = Symbol('isGroupEntity');

interface EntityGroup {
    column?: Column;
    depth: number;
    entities?: Entity[];
    field?: string;
    valueGroups: Map<Maybe<Value>, EntityGroup>;
}

export default class RowFactory {
    public constructor(grid: Grid) {
        this.grid = grid;
        this.groupCache = [];
        this.groupedData = undefined;
        this.numberOfGroups = 0;
        this.parsedData = [];
        this._renderedRange = new Range(0, grid.minRowsToRender() + EXCESS_ROWS);
        // we cache rows when they are built, and then blow the cache away when sorting
        this.rowCache = [];
        this.hiddenEntities = new WeakSet();
    }

    public groupCache: Group[];
    public rowCache: Row[];

    private _renderedRange: Range;
    private numberOfGroups: number;
    private readonly grid: Grid;
    private hiddenEntities: WeakSet<Entity>;
    private groupedData?: EntityGroup;
    private readonly parsedData: Entity[];

    public get renderedRange(): Range {
        return this._renderedRange;
    }

    public filteredDataChanged(): void {
        const grid = this.grid;
        const filteredData = grid.filteredData();
        this.rowCache = rebuildRowCache(this.rowCache, filteredData, this._renderedRange);
        const groups = grid.configGroups();
        if (groups.length > 0) {
            this.getGrouping(groups);
        } else if (this.groupedData) {
            this.clearGrouping();
        }
        this.updateViewableRange(this._renderedRange);
    }

    public isGroupEntity(entity: Entity): entity is GroupEntity {
        return !!(entity as any)[isGroupEntity];
    }

    public renderedChange(): void {
        if (!this.groupedData) {
            this.renderedChangeNoGroups();
            this.grid.refreshDomSizes();
            return;
        }
        const dataArray = this.parsedData
            .filter((e): boolean => !this.hiddenEntities.has(e))
            .slice(this._renderedRange.topRow, this._renderedRange.bottomRow);
        const rowArr = dataArray.map(
            (item, indx): GridRow => {
                let row: GridRow;
                if (this.isGroupEntity(item)) {
                    row = this.buildGroupRow(item, this._renderedRange.topRow + indx);
                } else {
                    row = this.buildEntityRow(item, this._renderedRange.topRow + indx);
                }
                return row;
            }
        );
        this.grid.renderedRows(rowArr);
        this.grid.refreshDomSizes();
    }

    public rowEntities(): Readonly<Entity[]> {
        return this.groupedData ? this.parsedData : this.grid.filteredData();
    }

    public setHidden(entity: Entity, isHidden: boolean): void {
        if (isHidden) {
            this.hiddenEntities.add(entity);
        } else {
            this.hiddenEntities.delete(entity);
        }
    }

    public updateViewableRange(newRange: Range): void {
        this._renderedRange = newRange;
        this.renderedChange();
    }

    public visibleRowCount(): number {
        return this.groupedData
            ? this.parsedData.filter((e): boolean => !this.hiddenEntities.has(e)).length
            : this.grid.filteredData().length;
    }

    private buildGroupRow(groupEntity: GroupEntity, rowIndex: number): Group {
        const grid = this.grid;
        let group = this.groupCache[groupEntity.groupIndex]; // first check to see if we've already built it
        if (!group) {
            // build the row
            group = new Group(groupEntity, grid);
            this.groupCache[groupEntity.groupIndex] = group;
        }
        group.offsetTop((grid.rowHeight * rowIndex).toString() + 'px');
        return group;
    }

    // Builds rows for each data item in the 'filteredData'
    // @entity - the data item
    // @rowIndex - the index of the row
    private buildEntityRow(entity: Entity, rowIndex: number): Row {
        const grid = this.grid;
        let row = this.rowCache[rowIndex]; // first check to see if we've already built it
        if (!row) {
            // build the row
            row = new Row(entity, grid.selectionService);
            row.rowIndex(rowIndex + 1); //not a zero-based rowIndex
            row.offsetTop((grid.rowHeight * rowIndex).toString() + 'px');
            // finally cache it for the next round
            this.rowCache[rowIndex] = row;
        }
        return row;
    }

    private clearGrouping(): void {
        this.groupCache = [];
        this.groupedData = undefined;
        this.hiddenEntities = new WeakSet();
        this.parsedData.length = 0;
        this.numberOfGroups = 0;
    }

    //Shuffle the data into their respective groupings.
    private getGrouping(groups: Column[]): void {
        const grid = this.grid;
        this.groupCache = [];
        this.rowCache = [];
        this.numberOfGroups = 0;
        createGroupColumns(grid, groups);
        this.groupedData = splitDataIntoGroups(grid, groups, this.hiddenEntities);
        this.parsedData.length = 0;
        this.parseGroupData(this.groupedData, []);
        grid.aggregationService.refreshGroupAggregatesAsync();
    }

    //recurse through the groupData tree and create the appropriate row nodes. Row for leaf and Group for branches
    private parseGroupData(group: EntityGroup, parentCache: Group[]): void {
        if (group.entities) {
            group.entities.forEach((item: Entity): void => {
                // get the last parent in the array because that's where our children want to be
                parentCache[parentCache.length - 1].children.push(item);
                //add the row to our return array
                this.parsedData.push(item);
            });
        } else {
            group.valueGroups.forEach((value, key): void => {
                //build the Group row
                const groupEntity: GroupEntity = {
                    [isGroupEntity]: true,
                    column: group.column as Column,
                    label: utils.hasValue(key) ? key.toString() : 'null',
                    depth: group.depth,
                    children: [],
                    groupChildren: [],
                    groupIndex: this.numberOfGroups,
                };
                let groupRow = this.buildGroupRow(groupEntity, 0);
                this.numberOfGroups++;
                //set the Group parent to the parent in the array that is one less deep.
                groupRow.parent = parentCache[groupRow.depth - 1];
                // if we have a parent, set the parent to not be collapsed and append the current group to its children
                if (groupRow.parent) {
                    groupRow.parent.collapsed(false);
                    groupRow.parent.groupChildren.push(groupRow);
                }
                // add the Group row to the parsed data.
                this.parsedData.push(groupRow.entity);
                // the current Group now the parent of the current depth
                parentCache[groupRow.depth] = groupRow;
                // dig deeper for more Groups or children.
                this.parseGroupData(value, parentCache);
            });
        }
    }

    private renderedChangeNoGroups(): void {
        const rowArr: GridRow[] = [];
        const dataArr = this.grid.filteredData.slice(
            this._renderedRange.topRow,
            this._renderedRange.bottomRow
        );
        dataArr.forEach((item, i): void => {
            let row = this.buildEntityRow(item, this._renderedRange.topRow + i);
            //add the row to our return array
            rowArr.push(row);
        });
        this.grid.renderedRows(rowArr);
    }
}

// Limiting to the rendered range is sufficient for preventing repaint of the current viewport
// and also enforces an upper bound on the time complexity.
function rebuildRowCache(rowCache: Row[], filteredData: Entity[], renderedRange: Range): Row[] {
    const result: Row[] = [];

    if (rowCache.length && filteredData.length) {
        let length = Math.min(rowCache.length, renderedRange.bottomRow);
        length = Math.min(length, filteredData.length);

        for (let i = renderedRange.topRow; i < length; i++) {
            const row = rowCache[i];
            if (row) {
                if (row.entity === filteredData[i]) {
                    result[i] = row;
                } else {
                    break;
                }
            }
        }
    }

    return result;
}

function createGroupColumns(grid: Grid, groups: Column[]): void {
    const cols = grid.columns();
    const maxDepth = groups.length;
    const groupColOffset = grid.groupColOffset();
    let hasAddedGroup = false;

    groups.forEach(function (group, depth): void {
        if (!cols[depth + groupColOffset].isGroupCol && depth <= maxDepth) {
            const cellClass = depth > 1 ? 'kgGroupColumn--tail' : 'kgGroupColumn--head';
            const columnConfig: ColumnConfig = {
                colDef: {
                    field: '',
                    width: 25,
                    sortable: false,
                    resizable: false,
                    headerCellTemplate: '<div class="kgGroupHeader"></div>',
                    visible: depth > 0,
                    cellClass,
                    headerClass: cellClass,
                },
                isGroupCol: true,
                index: 0,
            };
            cols.splice(groupColOffset, 0, new Column(columnConfig, grid));
            hasAddedGroup = true;
        }
    });

    grid.fixColumnIndexes();
    if (hasAddedGroup) {
        grid.columns.valueHasMutated();
    }
    domUtilityService.buildStyles(grid);
}

function splitDataIntoGroups(
    grid: Grid,
    groups: Column[],
    hiddenEntities: WeakSet<Entity>
): EntityGroup {
    const data = grid.filteredData();
    const cols = grid.columns();
    const evalPropertyForGroup = grid.config.evalPropertyForGroup;
    const groupedData: EntityGroup = { depth: 0, valueGroups: new Map<string, EntityGroup>() };

    data.forEach(function (item): void {
        hiddenEntities.add(item);
        let currentGroup = groupedData;
        groups.forEach(function (group, depth): void {
            const field = group.field;
            const col = cols.find((c): boolean => c.field === field) as Column;

            let val = evalPropertyForGroup
                ? evalPropertyForGroup(item, col.colDef)
                : configuration.evalProperty(item, field);
            if (col.cellFilter) {
                val = col.cellFilter(val);
            }
            val = utils.hasValue(val) ? val : undefined;

            let childGroup = currentGroup.valueGroups.get(val);
            if (!childGroup) {
                childGroup = { depth: 0, valueGroups: new Map<string, EntityGroup>() };
                currentGroup.valueGroups.set(val, childGroup);
            }
            if (!currentGroup.field) {
                currentGroup.field = field;
            }
            if (!currentGroup.depth) {
                currentGroup.depth = depth;
            }
            if (!currentGroup.column) {
                currentGroup.column = col;
            }

            currentGroup = childGroup;
        });
        if (!currentGroup.entities) {
            currentGroup.entities = [];
        }
        currentGroup.entities.push(item);
    });

    return groupedData;
}
