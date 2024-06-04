import { Mock } from 'ts-mockery';
import configuration from '../../configuration';
import { GridEventType } from '../../constants';
import { Entity, GridRow } from '../../types';
import Column from '../Column';
import Grid from '../Grid';
import Group, { GroupEntity } from '../Group';
import Row from '../Row';
import RowFactory from '../RowFactory';
import SelectionService from '../SelectionService';

describe('group', function () {
    let grid: Grid;
    let group: Group;
    let rowFactory: RowFactory;
    let selectionService: SelectionService;

    beforeAll(function () {
        configuration.css.groupCollapsedClass = 'collapse-me';
        configuration.css.groupExpandedClass = 'expand-me';
    });

    beforeEach(function () {
        rowFactory = Mock.of<RowFactory>({
            renderedChange: jest.fn(),
            setHidden: function (entity, isHidden) {
                entity.isHidden = isHidden;
            },
        });

        selectionService = Mock.of<SelectionService>({ isSelected: jest.fn() });

        grid = Mock.of<Grid>({
            rowFactory,
            selectionService,
            trigger: jest.fn(),
        });

        populateGroups(grid);
        group = rowFactory.groupCache[0];
    });

    test('is a group row', function () {
        expect(group.isGroupRow).toBe(true);
    });

    test('static group row check returns true for group row', function () {
        expect(Group.isGroupRow(group)).toBe(true);
    });

    test('static group row check returns false for non-group row', function () {
        expect(
            Group.isGroupRow(
                Mock.of<GridRow>({ isGroupRow: false })
            )
        ).toBe(false);
    });

    test('initially should be collapsed', function () {
        expect(group.collapsed()).toBe(true);
        expect(group.groupClass()).toBe('kgGroupArrowCollapsed collapse-me');
    });

    test('left offset should be formated as pixels', function () {
        expect(group.offsetLeft).toBe('0px');
        const group3 = rowFactory.groupCache[2];
        expect(group3.offsetLeft).toBe('25px');
        const group4 = rowFactory.groupCache[3];
        expect(group4.offsetLeft).toBe('50px');
    });

    test('can toggle expand state', function () {
        expect(group.collapsed()).toBe(true);
        group.toggleExpand();
        expect(group.collapsed()).toBe(false);
        group.toggleExpand();
        expect(group.collapsed()).toBe(true);
    });

    test('when toggling expand state then should trigger group toggle started event before updating state', function () {
        group.collapsed.subscribe(function () {
            expect(grid.trigger).toHaveBeenCalledWith(GridEventType.GroupToggleStarted, group);
        });
        group.toggleExpand();
        expect.hasAssertions();
    });

    test('when uncollapsed should update class', function () {
        setGroupExpand(group, false);
        expect(group.groupClass()).toBe('kgGroupArrowExpanded expand-me');
    });

    test('offset top is 0px initially', function () {
        expect(group.offsetTop()).toBe('0px');
    });

    test('has column from group entity', function () {
        expect(group.column).toBe(group.entity.column);
    });

    test('can get first child in hierarchy of groups', function () {
        const childIds = rowFactory.groupCache.map((x) =>
            x.firstChild() ? x.firstChild()!.id : undefined
        );
        expect(childIds).toEqual(['en1', undefined, 'en1', 'en1', 'en3']);
    });

    describe('toggling selected', function () {
        describe('given can select rows', function () {
            beforeEach(function () {
                Mock.extend(selectionService).with({
                    canSelectRows: true,
                    changeSelection: jest.fn(),
                });
            });

            test('allows event to bubble up', function () {
                const result = group.toggleSelected(group, Mock.of<JQuery.Event>());
                expect(result).toBe(true);
            });

            test('changes selection', function () {
                const event = Mock.of<JQuery.Event>();
                group.toggleSelected(group, event);
                expect(selectionService.changeSelection).toHaveBeenCalledWith(group, event);
            });
        });

        describe('given cannot select rows', function () {
            beforeEach(function () {
                Mock.extend(selectionService).with({
                    canSelectRows: false,
                    changeSelection: jest.fn(),
                });
            });

            test('allows event to bubble up', function () {
                const result = group.toggleSelected(group, Mock.of<JQuery.Event>());
                expect(result).toBe(true);
            });

            test('does not change selection', function () {
                group.toggleSelected(group, Mock.of<JQuery.Event>());
                expect(selectionService.changeSelection).not.toHaveBeenCalled();
            });
        });
    });

    describe('selection state', function () {
        describe('when no children are selected', function () {
            beforeEach(function () {
                (selectionService.isSelected as jest.Mock).mockReturnValue(false);
            });

            test('is not selected', function () {
                expect(group.isSelected()).toBe(false);
            });

            test('is not fully selected', function () {
                expect(group.isFullySelected()).toBe(false);
            });

            test('selected child count is correct', function () {
                expect(group.selectedChildren()).toBe(0);
            });
        });

        describe('when some children are selected', function () {
            beforeEach(function () {
                (selectionService.isSelected as jest.Mock).mockImplementation(function (entity) {
                    return rowFactory.groupCache[3].children.includes(entity);
                });
            });

            test('is selected', function () {
                expect(group.isSelected()).toBe(true);
            });

            test('is not fully selected', function () {
                expect(group.isFullySelected()).toBe(false);
            });

            test('selected child count is correct', function () {
                expect(group.selectedChildren()).toBe(2);
            });
        });

        describe('when all children are selected', function () {
            beforeEach(function () {
                (selectionService.isSelected as jest.Mock).mockImplementation(function (entity) {
                    return (
                        rowFactory.groupCache[3].children.includes(entity) ||
                        rowFactory.groupCache[4].children.includes(entity)
                    );
                });
            });

            test('is selected', function () {
                expect(group.isSelected()).toBe(true);
            });

            test('is fully selected', function () {
                expect(group.isFullySelected()).toBe(true);
            });

            test('selected child count is correct', function () {
                expect(group.selectedChildren()).toBe(3);
            });
        });
    });

    describe('get flatten children', function () {
        test('when has group children should recursively get children', function () {
            expect(group.flattenChildren().map((x) => x.id)).toEqual(['en1', 'en2', 'en3']);
        });

        test('when has no group children should get own children only', function () {
            const group4 = rowFactory.groupCache[3];
            expect(group4.flattenChildren().map((x) => x.id)).toEqual(['en1', 'en2']);
        });
    });

    describe('total children should be calculated', function () {
        test('when has group children should recursively get children', function () {
            expect(group.totalChildren()).toBe(3);
        });

        test('when has no group children should get own children only', function () {
            const group4 = rowFactory.groupCache[3];
            expect(group4.totalChildren()).toBe(2);
        });
    });

    describe('should notify group children', function () {
        test('and clear the row cache', function () {
            group.toggleExpand();
            expect(rowFactory.rowCache.length).toBe(0);
        });

        test('and render changes', function () {
            group.toggleExpand();
            expect(rowFactory.renderedChange).toHaveBeenCalled();
        });

        describe('when collapsing', function () {
            test('and mark their entities as hidden', function () {
                setGroupExpand(group, true);
                recurseGroupChildren(group, (group) => {
                    expect(group.entity.isHidden).toBe(group.entity.id !== '1');
                });
            });

            test('and collapse them', function () {
                recurseGroupChildren(group, (group) => {
                    setGroupExpand(group, false);
                });

                setGroupExpand(group, true);
                recurseGroupChildren(group, (group) => {
                    expect(group.collapsed()).toBe(true);
                });
            });

            test('and mark their entity children as hidden', function () {
                setGroupExpand(group, true);
                recurseGroupChildren(group, (group) => {
                    group.children.forEach((child) => {
                        expect(child.isHidden).toBe(true);
                    });
                });
            });
        });

        describe('when uncollapsing should notify group children', function () {
            test('and unmark their immediate entities as hidden', function () {
                setGroupExpand(group, true);
                setGroupExpand(group, false);

                recurseGroupChildren(group, (group) => {
                    if (
                        group.entity.id === '1' ||
                        group.entity.id === '2' ||
                        group.entity.id === '3'
                    ) {
                        expect(group.entity.isHidden).toBe(false);
                    } else {
                        expect(group.entity.isHidden).toBe(true);
                    }
                });
            });

            test('and not uncollapse them', function () {
                setGroupExpand(group, false);
                recurseGroupChildren(group, (group) => {
                    if (group.entity.id !== '1') {
                        expect(group.collapsed()).toBe(true);
                    }
                });
            });

            test('and mark only own entity children as hidden', function () {
                expect.assertions(3);
                setGroupExpand(rowFactory.groupCache[3], true);
                setGroupExpand(rowFactory.groupCache[4], true);
                setGroupExpand(rowFactory.groupCache[3], false);

                recurseGroupChildren(group, (group) => {
                    if (group.entity.id === '4') {
                        group.children.forEach((child) => {
                            expect(child.isHidden).toBe(false);
                        });
                    } else {
                        group.children.forEach((child) => {
                            expect(child.isHidden).toBe(true);
                        });
                    }
                });
            });
        });

        function recurseGroupChildren(cur: Group, callbackfn: (group: Group) => void): void {
            callbackfn(cur);
            cur.groupChildren.forEach((child): void => {
                recurseGroupChildren(child, callbackfn);
            });
        }
    });

    function populateGroups(grid: Grid) {
        const groupEntity1: GroupEntity = {
            id: '1',
            depth: 0,
            label: 'label',
            groupIndex: 0,
            groupChildren: [],
            children: [],
            column: Mock.of<Column>(),
            isHidden: false,
        };
        const groupEntity2: GroupEntity = {
            id: '2',
            depth: 1,
            label: 'label',
            groupIndex: 1,
            groupChildren: [],
            children: [],
            column: Mock.of<Column>(),
            isHidden: false,
        };
        const groupEntity3: GroupEntity = {
            id: '3',
            depth: 1,
            label: 'label',
            groupIndex: 2,
            groupChildren: [],
            children: [],
            column: Mock.of<Column>(),
            isHidden: false,
        };
        const groupEntity4: GroupEntity = {
            id: '4',
            depth: 2,
            label: 'label',
            groupIndex: 3,
            groupChildren: [],
            children: [],
            column: Mock.of<Column>(),
            isHidden: false,
        };
        const groupEntity5: GroupEntity = {
            id: '5',
            groupLabelFilter: 'filter',
            depth: 2,
            label: 'label',
            groupIndex: 4,
            groupChildren: [],
            children: [],
            column: Mock.of<Column>(),
            isHidden: false,
        };

        const entity1: Entity = { id: 'en1', isHidden: false };
        const entity2: Entity = { id: 'en2', isHidden: false };
        const entity3: Entity = { id: 'en3', isHidden: false };
        groupEntity4.children.push(entity1);
        groupEntity4.children.push(entity2);
        groupEntity5.children.push(entity3);

        const group1 = new Group(groupEntity1, grid);
        groupEntity2.parent = group1;
        const group2 = new Group(groupEntity2, grid);
        groupEntity3.parent = group1;
        const group3 = new Group(groupEntity3, grid);
        groupEntity4.parent = group3;
        const group4 = new Group(groupEntity4, grid);
        groupEntity5.parent = group3;
        const group5 = new Group(groupEntity5, grid);

        groupEntity1.groupChildren.push(group2);
        groupEntity1.groupChildren.push(group3);
        groupEntity3.groupChildren.push(group4);
        groupEntity3.groupChildren.push(group5);

        grid.rowFactory.rowCache = [Mock.from<Row>({ entity: groupEntity1 })];
        grid.rowFactory.groupCache = [group1, group2, group3, group4, group5];
    }

    function setGroupExpand(group: Group, value: boolean): void {
        if (value === group.collapsed()) {
            group.toggleExpand();
        }
        group.toggleExpand();
    }
});
