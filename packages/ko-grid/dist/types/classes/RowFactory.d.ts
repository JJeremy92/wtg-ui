import { Entity } from '../types';
import Grid from './Grid';
import Group, { GroupEntity } from './Group';
import Range from './Range';
import Row from './Row';
export default class RowFactory {
    constructor(grid: Grid);
    groupCache: Group[];
    rowCache: Row[];
    private _renderedRange;
    private numberOfGroups;
    private readonly grid;
    private hiddenEntities;
    private groupedData?;
    private readonly parsedData;
    get renderedRange(): Range;
    filteredDataChanged(): void;
    isGroupEntity(entity: Entity): entity is GroupEntity;
    renderedChange(): void;
    rowEntities(): Readonly<Entity[]>;
    setHidden(entity: Entity, isHidden: boolean): void;
    updateViewableRange(newRange: Range): void;
    visibleRowCount(): number;
    private buildGroupRow;
    private buildEntityRow;
    private clearGrouping;
    private getGrouping;
    private parseGroupData;
    private renderedChangeNoGroups;
}
