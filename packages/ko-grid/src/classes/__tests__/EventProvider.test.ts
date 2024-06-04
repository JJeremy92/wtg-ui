import $ from 'jquery';
import 'jquery-ui';
import ko from 'knockout';
import { Mock } from 'ts-mockery';
import configuration from '../../configuration';
import { GridEventType, ResizeTarget, RowReorderingMode } from '../../constants';
import domUtilityService from '../../domUtilityService';
import moveSelectionHandler from '../../moveSelectionHandler';
import { Entity } from '../../types';
import utils from '../../utils';
import Column from '../Column';
import EventProvider from '../EventProvider';
import Grid from '../Grid';
import { GridConfig, GridEventHandler, GridOptions, RowBoundData } from '../grid-config';
import Row from '../Row';
import SearchProvider from '../SearchProvider';

jest.mock('../../moveSelectionHandler');

enum Alignment {
    Left,
    Right,
}

describe('event provider', function () {
    let sandbox: JQuery;

    beforeAll(function () {
        configuration.css.removeGroupClass = 'remove-me';
    });

    beforeEach(function () {
        sandbox = $('<div>').appendTo(document.body);
    });

    afterEach(function () {
        ko.removeNode(sandbox[0]);
    });

    test('when viewport is scrolled it adjusts grid scroll', function () {
        const grid = init();
        grid.$viewport.scrollLeft(100).scrollTop(40).trigger('scroll');

        expect(grid.adjustScrollLeft).toHaveBeenCalledWith(100);
        expect(grid.adjustScrollTop).toHaveBeenCalledWith(40);
        expect(grid.adjustFixedViewportScrollTop).toHaveBeenCalled();
    });

    test('when key is pressed on viewport then invokes move selection handler', function () {
        const grid = init();
        const event = $.Event('keydown');
        grid.$viewport.trigger(event);
        expect(moveSelectionHandler).toHaveBeenCalledWith(grid, event);
    });

    [true, false].forEach(function (value) {
        test(`returns ${value} from move selection handler`, function () {
            const grid = init();
            const event = $.Event('keydown');
            (moveSelectionHandler as jest.Mock).mockReturnValue(value);
            grid.$viewport.trigger(event);
            expect(event.isDefaultPrevented()).toBe(!value);
        });
    });

    test('sets tab index on viewport to configured value', function () {
        const grid = init({ tabIndex: 5 });
        expect(grid.$viewport.attr('tabIndex')).toBe('5');
    });

    test('tab index falls back to number of grids on page minus 1', function () {
        sandbox.append(
            '<div><div class="koGrid foo" /><div class="koGrid bar" /><div class="koGrid meh" /></div>'
        );
        const grid = init({ tabIndex: -1 });
        expect(grid.$viewport.attr('tabIndex')).toBe('2');
    });

    describe('default resize target', function () {
        test('when window is resized then updates grid layout', function () {
            const grid = init();
            jest.spyOn(domUtilityService, 'updateGridLayout').mockImplementation($.noop);
            $(window).trigger('resize');
            expect(domUtilityService.updateGridLayout).toHaveBeenCalledWith(grid);
        });

        test('when window is resized and should maintain column ratios then configures grid column widths', function () {
            const grid = init();
            (grid.shouldMaintainColumnRatios as jest.Mock).mockReturnValue(true);
            jest.spyOn(domUtilityService, 'updateGridLayout').mockImplementation($.noop);
            $(window).trigger('resize');
            expect(grid.configureColumnWidths).toHaveBeenCalled();
        });

        test('when window is resized and should not maintain column ratios then does not configure grid column widths', function () {
            const grid = init();
            (grid.shouldMaintainColumnRatios as jest.Mock).mockReturnValue(false);
            jest.spyOn(domUtilityService, 'updateGridLayout').mockImplementation($.noop);
            $(window).trigger('resize');
            expect(grid.configureColumnWidths).not.toHaveBeenCalled();
        });

        test('when grid is removed then should remove resize event handler', function () {
            const grid = init();
            ko.removeNode(grid.$root[0]);
            jest.spyOn(domUtilityService, 'updateGridLayout').mockImplementation($.noop);
            $(window).trigger('resize');
            expect(domUtilityService.updateGridLayout).not.toHaveBeenCalled();
        });
    });

    describe('root as resize target', function () {
        test('when root is resized then updates grid layout', function () {
            const grid = init({ resizeTarget: ResizeTarget.Root });
            jest.spyOn(domUtilityService, 'updateGridLayout').mockImplementation($.noop);
            grid.$root.triggerHandler('resize');
            expect(domUtilityService.updateGridLayout).toHaveBeenCalledWith(grid);
        });

        test('when root is resized and should maintain column ratios then configures grid column widths', function () {
            const grid = init({ resizeTarget: ResizeTarget.Root });
            (grid.shouldMaintainColumnRatios as jest.Mock).mockReturnValue(true);
            jest.spyOn(domUtilityService, 'updateGridLayout').mockImplementation($.noop);
            grid.$root.triggerHandler('resize');
            expect(grid.configureColumnWidths).toHaveBeenCalled();
        });

        test('when window is resized then does not update grid layout', function () {
            init({ resizeTarget: ResizeTarget.Root });
            jest.spyOn(domUtilityService, 'updateGridLayout').mockImplementation($.noop);
            $(window).trigger('resize');
            expect(domUtilityService.updateGridLayout).not.toHaveBeenCalled();
        });
    });

    describe('column drag/drop', function () {
        let grid: Grid;

        beforeEach(function () {
            grid = init();
            grid.columns([
                getColumn('x', 0, { fixed: true }),
                getColumn('y', 1, { fixed: true }),
                getColumn('a', 2),
                getColumn('b', 3),
                getColumn('c', 4),
                getColumn('d', 5),
            ]);
            ko.applyBindings(grid, grid.$root[0]);
            jest.spyOn(domUtilityService, 'buildStyles').mockImplementation($.noop);
        });

        test('when dragging starts then sets data transfer text', function () {
            const event = getDragStartEvent();
            grid.$headerScroller.find('.kgHeaderText:eq(0)').trigger(event);
            expect(event.originalEvent.dataTransfer.setData).toHaveBeenCalledWith('text', '');
        });

        test('when dragging starts on column that is not bound then does not set data transfer text', function () {
            const event = getDragStartEvent();
            const column = grid.$headerScroller.find('.kgHeaderSortColumn:eq(0)');
            ko.cleanNode(column[0]);
            column.trigger(event);
            expect(event.originalEvent.dataTransfer.setData).not.toHaveBeenCalled();
        });

        test('allows dragging non-fixed column into non-fixed header scroller panel', function () {
            grid.$headerScroller.find('.kgHeaderText:eq(0)').trigger(getDragStartEvent());
            const event = $.Event('dragenter');
            grid.$headerScroller.find('.kgHeaderCell:eq(1)').trigger(event);
            expect(event.isDefaultPrevented()).toBe(true);
        });

        test('allows dragging fixed column into fixed header scroller panel', function () {
            grid.$fixedHeaderScroller.find('.kgHeaderText:eq(0)').trigger(getDragStartEvent());
            const event = $.Event('dragenter');
            grid.$fixedHeaderScroller.find('.kgHeaderCell:eq(1)').trigger(event);
            expect(event.isDefaultPrevented()).toBe(true);
        });

        test('does not allow dragging non-fixed column into fixed header scroller panel', function () {
            grid.$headerScroller.find('.kgHeaderText:eq(0)').trigger(getDragStartEvent());
            const event = $.Event('dragenter');
            grid.$fixedHeaderScroller.find('.kgHeaderCell:eq(1)').trigger(event);
            expect(event.isDefaultPrevented()).toBe(false);
        });

        test('does not allow dragging fixed column into non-fixed header scroller panel', function () {
            grid.$fixedHeaderScroller.find('.kgHeaderText:eq(0)').trigger(getDragStartEvent());
            const event = $.Event('dragenter');
            grid.$headerScroller.find('.kgHeaderCell:eq(1)').trigger(event);
            expect(event.isDefaultPrevented()).toBe(false);
        });

        test('can drag column from head to tail', function () {
            grid.$headerScroller.find('.kgHeaderText:eq(0)').trigger(getDragStartEvent());
            grid.$headerScroller.find('.kgHeaderText:eq(3)').trigger('drop');
            expect(grid.columns().map((x) => x.field)).toEqual(['x', 'y', 'b', 'c', 'd', 'a']);
            expect(grid.columns().map((x) => x.index)).toEqual([0, 1, 2, 3, 4, 5]);
        });

        test('can drag column from tail to head', function () {
            grid.$headerScroller.find('.kgHeaderText:eq(3)').trigger(getDragStartEvent());
            grid.$headerScroller.find('.kgHeaderText:eq(0)').trigger('drop');
            expect(grid.columns().map((x) => x.field)).toEqual(['x', 'y', 'd', 'a', 'b', 'c']);
            expect(grid.columns().map((x) => x.index)).toEqual([0, 1, 2, 3, 4, 5]);
        });

        test('can drag column from head to middle', function () {
            grid.$headerScroller.find('.kgHeaderText:eq(0)').trigger(getDragStartEvent());
            grid.$headerScroller.find('.kgHeaderText:eq(2)').trigger('drop');
            expect(grid.columns().map((x) => x.field)).toEqual(['x', 'y', 'b', 'c', 'a', 'd']);
            expect(grid.columns().map((x) => x.index)).toEqual([0, 1, 2, 3, 4, 5]);
        });

        test('when column is dragged then prevents drop event default', function () {
            grid.$headerScroller.find('.kgHeaderText:eq(0)').trigger(getDragStartEvent());
            const event = $.Event('drop');
            grid.$headerScroller.find('.kgHeaderText:eq(2)').trigger(event);
            expect(event.isDefaultPrevented()).toBe(true);
        });

        test('when column is dragged then notifies columns changed once', function () {
            let columns: Column[][] = [];
            grid.columns.subscribe((value) => columns.push(value));
            grid.$headerScroller.find('.kgHeaderText:eq(0)').trigger(getDragStartEvent());
            grid.$headerScroller.find('.kgHeaderText:eq(3)').trigger('drop');
            expect(columns.length).toBe(1);
            expect(columns[0][5].field).toBe('a');
            expect(columns[0][5].index).toBe(5);
        });

        test('when column is dragged then builds grid styles', function () {
            grid.$headerScroller.find('.kgHeaderText:eq(0)').trigger(getDragStartEvent());
            grid.$headerScroller.find('.kgHeaderText:eq(3)').trigger('drop');
            expect(domUtilityService.buildStyles).toHaveBeenCalledWith(grid);
        });

        test('when column is dragged then triggers settings changed by user event', function () {
            const gridSettings = { columnDefs: [{ field: 'dummy' }] };
            grid.columns.subscribe(function () {
                (grid.settings as jest.Mock).mockReturnValue(gridSettings);
            });

            grid.$headerScroller.find('.kgHeaderText:eq(0)').trigger(getDragStartEvent());
            grid.$headerScroller.find('.kgHeaderText:eq(3)').trigger('drop');
            expect(grid.trigger).toHaveBeenCalledWith(
                GridEventType.SettingsChangedByUser,
                gridSettings
            );
        });

        test('when column is dragged to itself then column is not moved', function () {
            grid.$headerScroller
                .find('.kgHeaderText:eq(0)')
                .trigger(getDragStartEvent())
                .trigger('drop');
            expect(domUtilityService.buildStyles).not.toHaveBeenCalled();
        });

        test('when dragging ends then clears column to move', function () {
            grid.$headerScroller.find('.kgHeaderText:eq(0)').trigger(getDragStartEvent());
            grid.$headerScroller.trigger('dragend');
            grid.$headerScroller.find('.kgHeaderText:eq(2)').trigger('drop');
            expect(grid.columns().map((x) => x.field)).toEqual(['x', 'y', 'a', 'b', 'c', 'd']);
        });
    });

    describe('column to group drag/drop - no existing groups', function () {
        let grid: Grid;

        beforeEach(function () {
            grid = init();
            grid.columns([getColumn('a', 0), getColumn('b', 1)]);
            ko.applyBindings(grid, grid.$root[0]);
            jest.spyOn(domUtilityService, 'buildStyles').mockImplementation($.noop);
        });

        it('when dragging starts then adds hidden group placeholder', function () {
            grid.$headerScroller.find('.kgHeaderText:eq(0)').trigger(getDragStartEvent());
            const placeholder = grid.$groupPanel.find('.kgGroupList .kgGroupPlaceholder');
            expect(placeholder.length).toBe(1);
            expect(placeholder.find('span:first').text()).toBe('col>a');
            expect(placeholder.css('display')).toBe('none');
        });

        it('group placeholder has remove group element', function () {
            grid.$headerScroller.find('.kgHeaderText:eq(0)').trigger(getDragStartEvent());
            const placeholder = grid.$groupPanel.find('.kgGroupList .kgGroupPlaceholder');
            const removeGroupElem = placeholder.find(
                'div.kgGroupElement div.kgGroupName span.kgRemoveGroup'
            );
            expect(removeGroupElem.length).toBe(1);
            expect(removeGroupElem.hasClass('remove-me')).toBe(true);
            expect(removeGroupElem.find('.kgRemoveGroupText').text()).toBe('x');
        });

        test('allows dragging into group panel', function () {
            grid.$headerScroller.find('.kgHeaderText:eq(0)').trigger(getDragStartEvent());
            const event = $.Event('dragenter');
            grid.$groupPanel.trigger(event);
            expect(event.isDefaultPrevented()).toBe(true);
        });

        test('allows dragging over group panel', function () {
            grid.$headerScroller.find('.kgHeaderText:eq(0)').trigger(getDragStartEvent());
            const event = $.Event('dragover');
            grid.$groupPanel.trigger(event);
            expect(event.isDefaultPrevented()).toBe(true);
        });

        test('when dragging into group panel then adds group panel dragged on class', function () {
            grid.$headerScroller.find('.kgHeaderText:eq(0)').trigger(getDragStartEvent());
            grid.$groupPanel.trigger('dragenter');
            expect(grid.$groupPanel.hasClass('kgGroupPanel--drag-over')).toBe(true);
        });

        test('when dragging over group panel then shows group placeholder', function () {
            grid.$headerScroller.find('.kgHeaderText:eq(0)').trigger(getDragStartEvent());
            grid.$groupPanel.trigger('dragover');
            const placeholder = grid.$groupPanel.find('.kgGroupList .kgGroupPlaceholder');
            expect(placeholder.css('display')).toBe('block');
        });

        test('when dragging over group panel then marks grid as dragging over groups', function () {
            grid.$headerScroller.find('.kgHeaderText:eq(0)').trigger(getDragStartEvent());
            grid.$groupPanel.trigger('dragover');
            expect(grid.isDraggingOverGroups()).toBe(true);
        });

        test('can drag column to group panel', function () {
            grid.$headerScroller.find('.kgHeaderText:eq(0)').trigger(getDragStartEvent());
            grid.$groupPanel.trigger('drop');
            expect(grid.groupBy).toHaveBeenCalledWith(grid.columns()[0], 0);
        });

        test('when group for column being dragged is added prior to drop then should not group by that column again', function () {
            grid.$headerScroller.find('.kgHeaderText:eq(0)').trigger(getDragStartEvent());
            grid.configGroups.push(grid.columns()[0]);
            grid.$groupPanel.trigger('drop');
            expect(grid.groupBy).not.toHaveBeenCalled();
        });

        test('when dragging ends then clears column to move', function () {
            grid.$headerScroller.find('.kgHeaderText:eq(0)').trigger(getDragStartEvent());
            grid.$headerScroller.trigger('dragend');
            grid.$headerScroller.find('.kgHeaderText:eq(1)').trigger('drop');
            expect(domUtilityService.buildStyles).not.toHaveBeenCalled();
        });

        test('when dragging ends then removes group panel dragged on class', function () {
            grid.$headerScroller.find('.kgHeaderText:eq(0)').trigger(getDragStartEvent());
            grid.$groupPanel.trigger('dragenter');
            grid.$headerScroller.trigger('dragend');
            expect(grid.$groupPanel.hasClass('kgGroupPanel--drag-over')).toBe(false);
        });

        test('when dragging ends then removes group placeholder', function () {
            grid.$headerScroller.find('.kgHeaderText:eq(0)').trigger(getDragStartEvent());
            grid.$groupPanel.trigger('dragover');
            grid.$headerScroller.trigger('dragend');
            expect(grid.$groupPanel.find('.kgGroupPlaceholder').length).toBe(0);
        });

        test('when dragging ends then marks grid as not dragging over groups', function () {
            grid.$headerScroller.find('.kgHeaderText:eq(0)').trigger(getDragStartEvent());
            grid.$groupPanel.trigger('dragover');
            grid.$headerScroller.trigger('dragend');
            expect(grid.isDraggingOverGroups()).toBe(false);
        });

        test('when dragend event fires twice then does not encounter errors', function () {
            grid.$headerScroller.find('.kgHeaderText:eq(0)').trigger(getDragStartEvent());
            grid.$groupPanel.trigger('dragover');
            grid.$headerScroller.trigger('dragend');
            expect(() => grid.$headerScroller.trigger('dragend')).not.toThrow();
        });

        test('when dragging out of group panel then removes group panel dragged on class', function () {
            grid.$headerScroller.find('.kgHeaderText:eq(0)').trigger(getDragStartEvent());
            grid.$groupPanel.trigger('dragenter');
            leaveGroupPanel(grid);
            expect(grid.$groupPanel.hasClass('kgGroupPanel--drag-over')).toBe(false);
        });

        test('when dragging out of group panel then hides group placeholder', function () {
            grid.$headerScroller.find('.kgHeaderText:eq(0)').trigger(getDragStartEvent());
            grid.$groupPanel.trigger('dragover');
            leaveGroupPanel(grid);
            expect(grid.$groupPanel.find('.kgGroupPlaceholder').css('display')).toBe('none');
        });

        test('when dragging out of group panel then marks grid as not dragging over groups', function () {
            grid.$headerScroller.find('.kgHeaderText:eq(0)').trigger(getDragStartEvent());
            grid.$groupPanel.trigger('dragover');
            leaveGroupPanel(grid);
            expect(grid.isDraggingOverGroups()).toBe(false);
        });

        test('when dragleave event fires on group panel but mouse is still within it then does not remove group panel dragged on class', function () {
            grid.$headerScroller.find('.kgHeaderText:eq(0)').trigger(getDragStartEvent());
            grid.$groupPanel.trigger('dragenter');
            leaveGroupPanel(grid, true);
            expect(grid.$groupPanel.hasClass('kgGroupPanel--drag-over')).toBe(true);
        });

        test('when dragleave event fires on group panel but mouse is still within it then does not hide group placeholder', function () {
            grid.$headerScroller.find('.kgHeaderText:eq(0)').trigger(getDragStartEvent());
            grid.$groupPanel.trigger('dragover');
            leaveGroupPanel(grid, true);
            expect(grid.$groupPanel.find('.kgGroupPlaceholder').css('display')).toBe('block');
        });
    });

    describe('column to group drag/drop - has existing groups', function () {
        let grid: Grid;

        beforeEach(function () {
            grid = init();
            grid.columns([
                getColumn('a', 0, { groupIndex: 0 }),
                getColumn('b', 1),
                getColumn('c', 2, { groupIndex: 1 }),
            ]);
            grid.configGroups.push(grid.columns()[0]);
            grid.configGroups.push(grid.columns()[2]);
            ko.applyBindings(grid, grid.$root[0]);
        });

        test('allows dragging non-grouped column into group panel', function () {
            grid.$headerScroller.find('.kgHeaderText:eq(1)').trigger(getDragStartEvent());
            const event = $.Event('dragenter');
            grid.$groupPanel.trigger(event);
            expect(event.isDefaultPrevented()).toBe(true);
        });

        test('does not allow dragging grouped column into group panel', function () {
            grid.$headerScroller.find('.kgHeaderText:eq(0)').trigger(getDragStartEvent());
            const event = $.Event('dragenter');
            grid.$groupPanel.trigger(event);
            expect(event.isDefaultPrevented()).toBe(false);
        });

        test('allows dragging non-grouped column over group panel', function () {
            grid.$headerScroller.find('.kgHeaderText:eq(1)').trigger(getDragStartEvent());
            const event = $.Event('dragover');
            grid.$groupPanel.trigger(event);
            expect(event.isDefaultPrevented()).toBe(true);
        });

        test('does not allow dragging grouped column over group panel', function () {
            grid.$headerScroller.find('.kgHeaderText:eq(0)').trigger(getDragStartEvent());
            const event = $.Event('dragover');
            grid.$groupPanel.trigger(event);
            expect(event.isDefaultPrevented()).toBe(false);
        });

        it('when dragging starts on non-grouped column then adds hidden group placeholder', function () {
            grid.$headerScroller.find('.kgHeaderText:eq(1)').trigger(getDragStartEvent());
            const placeholder = grid.$groupPanel.find('.kgGroupList .kgGroupPlaceholder');
            expect(placeholder.length).toBe(1);
            expect(placeholder.find('span:first').text()).toBe('col>b');
            expect(placeholder.css('display')).toBe('none');
        });

        it('when dragging starts on grouped column then does not add group placeholder', function () {
            grid.$headerScroller.find('.kgHeaderText:eq(0)').trigger(getDragStartEvent());
            expect(grid.$groupPanel.find('.kgGroupPlaceholder').length).toBe(0);
        });

        test('when dragging non-grouped column into group panel then adds group panel dragged on class', function () {
            grid.$headerScroller.find('.kgHeaderText:eq(1)').trigger(getDragStartEvent());
            grid.$groupPanel.trigger('dragenter');
            expect(grid.$groupPanel.hasClass('kgGroupPanel--drag-over')).toBe(true);
        });

        test('when dragging grouped column into group panel then does not add group panel dragged on class', function () {
            grid.$headerScroller.find('.kgHeaderText:eq(0)').trigger(getDragStartEvent());
            grid.$groupPanel.trigger('dragenter');
            expect(grid.$groupPanel.hasClass('kgGroupPanel--drag-over')).toBe(false);
        });

        test('when dragging non-grouped column to left of first group item then shows placeholder before that', function () {
            grid.$headerScroller.find('.kgHeaderText:eq(1)').trigger(getDragStartEvent());
            dragOverGroupItem(grid, 0, Alignment.Left);
            const groupItems = grid.$groupPanel.find('.kgGroupList').children();
            expect(groupItems.length).toBe(3);
            expect(groupItems.eq(0).hasClass('kgGroupPlaceholder')).toBe(true);
            expect(groupItems.eq(0).css('display')).toBe('block');
        });

        test('when dragging non-grouped column to right of first group item then shows placeholder after that', function () {
            grid.$headerScroller.find('.kgHeaderText:eq(1)').trigger(getDragStartEvent());
            dragOverGroupItem(grid, 0, Alignment.Right);
            const groupItems = grid.$groupPanel.find('.kgGroupList').children();
            expect(groupItems.length).toBe(3);
            expect(groupItems.eq(1).hasClass('kgGroupPlaceholder')).toBe(true);
            expect(groupItems.eq(1).css('display')).toBe('block');
        });

        test('when dragging non-grouped column to left of 2nd group item then shows placeholder before that', function () {
            grid.$headerScroller.find('.kgHeaderText:eq(1)').trigger(getDragStartEvent());
            dragOverGroupItem(grid, 1, Alignment.Left);
            const groupItems = grid.$groupPanel.find('.kgGroupList').children();
            expect(groupItems.length).toBe(3);
            expect(groupItems.eq(1).hasClass('kgGroupPlaceholder')).toBe(true);
            expect(groupItems.eq(1).css('display')).toBe('block');
        });

        test('when dragging non-grouped column to right of 2nd group item then shows placeholder after that', function () {
            grid.$headerScroller.find('.kgHeaderText:eq(1)').trigger(getDragStartEvent());
            dragOverGroupItem(grid, 1, Alignment.Right);
            const groupItems = grid.$groupPanel.find('.kgGroupList').children();
            expect(groupItems.length).toBe(3);
            expect(groupItems.eq(2).hasClass('kgGroupPlaceholder')).toBe(true);
            expect(groupItems.eq(2).css('display')).toBe('block');
        });

        test('when dragging non-grouped column to end of group panel shows placeholder at the end', function () {
            grid.$headerScroller.find('.kgHeaderText:eq(1)').trigger(getDragStartEvent());
            grid.$groupPanel.trigger('dragover');
            const groupItems = grid.$groupPanel.find('.kgGroupList').children();
            expect(groupItems.length).toBe(3);
            expect(groupItems.eq(2).hasClass('kgGroupPlaceholder')).toBe(true);
            expect(groupItems.eq(2).css('display')).toBe('block');
        });

        test('when dragging grouped column into group panel then does not show group placeholder', function () {
            grid.$headerScroller.find('.kgHeaderText:eq(0)').trigger(getDragStartEvent());
            grid.$groupPanel.trigger('dragover');
            expect(grid.$groupPanel.find('.kgGroupPlaceholder').length).toBe(0);
        });

        test('can drag non-grouped column to end of group panel', function () {
            grid.$headerScroller.find('.kgHeaderText:eq(1)').trigger(getDragStartEvent());
            grid.$groupPanel.trigger('dragover').trigger('drop');
            expect(grid.groupBy).toHaveBeenCalledWith(grid.columns()[1], 2);
        });

        test('can drag non-grouped column in between group items', function () {
            grid.$headerScroller.find('.kgHeaderText:eq(1)').trigger(getDragStartEvent());
            dragOverGroupItem(grid, 0, Alignment.Right);
            grid.$groupPanel.trigger('drop');
            expect(grid.groupBy).toHaveBeenCalledWith(grid.columns()[1], 1);
        });

        test('when column is dragged to group panel then prevents drop event default', function () {
            grid.$headerScroller.find('.kgHeaderText:eq(1)').trigger(getDragStartEvent());
            const event = $.Event('drop');
            grid.$groupPanel.trigger('dragover').trigger(event);
            expect(event.isDefaultPrevented()).toBe(true);
        });

        test('when grouped column is dragged to group panel then does not group by that column', function () {
            grid.$headerScroller.find('.kgHeaderText:eq(0)').trigger(getDragStartEvent());
            grid.$groupPanel.trigger('dragover').trigger('drop');
            expect(grid.groupBy).not.toHaveBeenCalled();
        });
    });

    describe('group drag/drop', function () {
        let grid: Grid;

        beforeEach(function () {
            grid = init();
            grid.columns([
                getColumn('a', 0, { groupIndex: 0 }),
                getColumn('b', 1, { groupIndex: 1 }),
                getColumn('c', 2, { groupIndex: 2 }),
                getColumn('d', 3, { groupIndex: 3 }),
                getColumn('e', 4),
            ]);
            grid.configGroups(grid.columns.slice(0, 4));
            ko.applyBindings(grid, grid.$root[0]);
            jest.useFakeTimers();
        });

        afterEach(function () {
            jest.useRealTimers();
        });

        test('when dragging starts then sets data transfer text', function () {
            const event = getDragStartEvent();
            grid.$groupPanel.find('.kgGroupItem:eq(0)').trigger(event);
            expect(event.originalEvent.dataTransfer.setData).toHaveBeenCalledWith('text', '');
        });

        it('when dragging starts then adds hidden group placeholder', function () {
            grid.$groupPanel.find('.kgGroupItem:eq(2)').trigger(getDragStartEvent());
            const placeholder = grid.$groupPanel.find('.kgGroupList .kgGroupPlaceholder');
            expect(placeholder.length).toBe(1);
            expect(placeholder.find('span:first').text()).toBe('col>c');
            expect(placeholder.css('display')).toBe('none');
        });

        it('when dragging starts then hides group item asynchronously', function () {
            const groupItem = grid.$groupPanel.find('.kgGroupItem:eq(0)');
            groupItem.trigger(getDragStartEvent());
            expect(groupItem.css('display')).not.toBe('none');
            jest.advanceTimersByTime(1);
            expect(groupItem.css('display')).toBe('none');
        });

        test('when dragging starts on group that is not bound then does not set data transfer text', function () {
            const event = getDragStartEvent();
            const groupItem = grid.$groupPanel.find('.kgGroupItem:eq(0)');
            ko.cleanNode(groupItem[0]);
            groupItem.trigger(event);
            expect(event.originalEvent.dataTransfer.setData).not.toHaveBeenCalled();
        });

        it('when dragging starts and there there is an existing group placeholder then reuses that placeholder', function () {
            grid.$groupPanel.find('.kgGroupItem:eq(2)').trigger(getDragStartEvent());
            const placeholder1 = grid.$groupPanel.find('.kgGroupList .kgGroupPlaceholder');
            grid.$groupPanel.find('.kgGroupItem:eq(1)').trigger(getDragStartEvent());
            const placeholder2 = grid.$groupPanel.find('.kgGroupList .kgGroupPlaceholder');
            expect(placeholder2.length).toBe(1);
            expect(placeholder2[0]).toBe(placeholder1[0]);
            expect(placeholder2.find('span:first').text()).toBe('col>b');
        });

        test('allows dragging group within group panel', function () {
            grid.$groupPanel.find('.kgGroupItem:eq(0)').trigger(getDragStartEvent());
            const event = $.Event('dragenter');
            grid.$groupPanel.trigger(event);
            expect(event.isDefaultPrevented()).toBe(true);
        });

        test('does not allow dragging group over header scroller panel', function () {
            grid.$groupPanel.find('.kgGroupItem:eq(0)').trigger(getDragStartEvent());
            const event = $.Event('dragover');
            grid.$headerScroller.find('.kgHeaderCell:eq(1)').trigger(event);
            expect(event.isDefaultPrevented()).toBe(false);
        });

        test('adds group panel dragged on class', function () {
            grid.$groupPanel.find('.kgGroupItem:eq(0)').trigger(getDragStartEvent());
            grid.$groupPanel.trigger('dragenter');
            expect(grid.$groupPanel.hasClass('kgGroupPanel--drag-over')).toBe(true);
        });

        test('when dragging in between other groups then shows placeholder there', function () {
            grid.$groupPanel.find('.kgGroupItem:eq(0)').trigger(getDragStartEvent());
            dragOverGroupItem(grid, 3, Alignment.Left);
            const groupItems = grid.$groupPanel.find('.kgGroupList').children();
            expect(groupItems.length).toBe(5);
            expect(groupItems.eq(3).hasClass('kgGroupPlaceholder')).toBe(true);
            expect(groupItems.eq(3).css('display')).toBe('block');
        });

        test('when dragging group to panel then moves it to the end', function () {
            grid.$groupPanel.find('.kgGroupItem:eq(0)').trigger(getDragStartEvent());
            grid.$groupPanel.trigger('dragover').trigger('drop');
            expect(grid.configGroups().map((x) => x.field)).toEqual(['b', 'c', 'd', 'a']);
            expect(grid.configGroups().map((x) => x.groupIndex())).toEqual([0, 1, 2, 3]);
        });

        test('when dragging group to panel then notifies groups changed once', function () {
            let columns: Column[][] = [];
            grid.configGroups.subscribe((value) => columns.push(value));
            grid.$groupPanel.find('.kgGroupItem:eq(0)').trigger(getDragStartEvent());
            grid.$groupPanel.trigger('dragover').trigger('drop');
            expect(columns.length).toBe(1);
            expect(columns[0][3].field).toBe('a');
            expect(columns[0][3].groupIndex()).toBe(3);
        });

        test('can drag group from head to middle', function () {
            grid.$groupPanel.find('.kgGroupItem:eq(0)').trigger(getDragStartEvent());
            dragOverGroupItem(grid, 2, Alignment.Right);
            grid.$groupPanel.trigger('drop');
            expect(grid.configGroups().map((x) => x.field)).toEqual(['b', 'c', 'a', 'd']);
            expect(grid.configGroups().map((x) => x.groupIndex())).toEqual([0, 1, 2, 3]);
        });

        test('can drag group from tail to head', function () {
            grid.$groupPanel.find('.kgGroupItem:eq(3)').trigger(getDragStartEvent());
            dragOverGroupItem(grid, 0, Alignment.Left);
            grid.$groupPanel.trigger('drop');
            expect(grid.configGroups().map((x) => x.field)).toEqual(['d', 'a', 'b', 'c']);
            expect(grid.configGroups().map((x) => x.groupIndex())).toEqual([0, 1, 2, 3]);
        });

        test('when dragging between groups then notifies groups changed once', function () {
            let columns: Column[][] = [];
            grid.configGroups.subscribe((value) => columns.push(value));
            grid.$groupPanel.find('.kgGroupItem:eq(0)').trigger(getDragStartEvent());
            dragOverGroupItem(grid, 2, Alignment.Right);
            grid.$groupPanel.trigger('drop');
            expect(columns.length).toBe(1);
            expect(columns[0][2].field).toBe('a');
            expect(columns[0][2].groupIndex()).toBe(2);
        });

        test('when group is dragged to itself then does not notify groups changed', function () {
            let notifyCount = 0;
            grid.configGroups.subscribe(() => notifyCount++);
            grid.$groupPanel.find('.kgGroupItem:eq(0)').trigger(getDragStartEvent());
            dragOverGroupItem(grid, 0, Alignment.Left);
            grid.$groupPanel.trigger('drop');
            expect(notifyCount).toBe(0);
        });

        test('when dragging ends then clears column to move', function () {
            grid.$groupPanel.find('.kgGroupItem:eq(0)').trigger(getDragStartEvent());
            dragOverGroupItem(grid, 2, Alignment.Right);
            grid.$groupPanel.trigger('dragend').trigger('drop');
            expect(grid.configGroups().map((x) => x.field)).toEqual(['a', 'b', 'c', 'd']);
        });

        test('when dragging ends then removes group panel dragged on class', function () {
            grid.$groupPanel.find('.kgGroupItem:eq(0)').trigger(getDragStartEvent());
            grid.$groupPanel.trigger('dragenter').trigger('dragend');
            expect(grid.$groupPanel.hasClass('kgGroupPanel--drag-over')).toBe(false);
        });

        test('when dragging ends then removes group placeholder', function () {
            grid.$groupPanel.find('.kgGroupItem:eq(0)').trigger(getDragStartEvent());
            grid.$groupPanel.trigger('dragover').trigger('dragend');
            expect(grid.$groupPanel.find('.kgGroupPlaceholder').length).toBe(0);
        });

        test('when dragging ends then unhides group item', function () {
            const groupItem = grid.$groupPanel.find('.kgGroupItem:eq(0)');
            groupItem.trigger(getDragStartEvent());
            jest.advanceTimersByTime(1);
            grid.$groupPanel.trigger('dragend');
            expect(groupItem.css('display')).not.toBe('none');
        });
    });

    describe('row drag/drop reordering with native drag and drop', function () {
        let grid: Grid;

        beforeEach(function () {
            grid = init({ rowReorderingMode: RowReorderingMode.Native });
            grid.sortedData([{ text: 'a' }, { text: 'b' }, { text: 'c' }, { text: 'd' }]);
            grid.renderedRows(
                grid.sortedData().map((entity) => Mock.of<Row>({ entity }))
            );
            ko.applyBindings(grid, grid.$root[0]);
        });

        test('allows dragging over view port', function () {
            const event = $.Event('dragover');
            grid.$viewport.trigger(event);
            expect(event.isDefaultPrevented()).toBe(true);
        });

        test('when dragging row then sets draggable to true', function () {
            grid.$viewport.find('.kgRowContent:eq(0)').trigger('mousedown');
            expect(grid.$viewport.find('.kgRow:eq(0)').attr('draggable')).toBe('true');
        });

        test('when dragging row that is not bound then does notset draggable to true', function () {
            const element = grid.$viewport.find('.kgRow:eq(0)');
            ko.cleanNode(element[0]);
            grid.$viewport.find('.kgRowContent:eq(0)').trigger('mousedown');
            expect(element.attr('draggable')).toBeUndefined();
        });

        test('can drag row from head to tail', function () {
            grid.$viewport.find('.kgRowContent:eq(0)').trigger('mousedown');
            grid.$viewport.find('.kgRowContent:eq(3)').trigger('drop');
            expect(grid.sortedData().map((x) => x.text)).toEqual(['b', 'c', 'd', 'a']);
        });

        test('can drag row from head to middle', function () {
            grid.$viewport.find('.kgRowContent:eq(0)').trigger('mousedown');
            grid.$viewport.find('.kgRowContent:eq(2)').trigger('drop');
            expect(grid.sortedData().map((x) => x.text)).toEqual(['b', 'c', 'a', 'd']);
        });

        test('can drag row from tail to head', function () {
            grid.$viewport.find('.kgRowContent:eq(3)').trigger('mousedown');
            grid.$viewport.find('.kgRowContent:eq(0)').trigger('drop');
            expect(grid.sortedData().map((x) => x.text)).toEqual(['d', 'a', 'b', 'c']);
        });

        test('when row is dragged then notifies sorted data changed once', function () {
            let data: Entity[][] = [];
            grid.sortedData.subscribe((value) => data.push(value));
            grid.$viewport.find('.kgRowContent:eq(0)').trigger('mousedown');
            grid.$viewport.find('.kgRowContent:eq(2)').trigger('drop');
            expect(data.length).toBe(1);
            expect(data[0][2].text).toBe('a');
        });

        test('when row is dragged then evaluates filter', function () {
            grid.$viewport.find('.kgRowContent:eq(0)').trigger('mousedown');
            grid.$viewport.find('.kgRowContent:eq(2)').trigger('drop');
            expect(grid.searchProvider.evalFilter).toHaveBeenCalled();
        });

        test('when row is dragged to itself then does not evaluate filter', function () {
            grid.$viewport.find('.kgRowContent:eq(0)').trigger('mousedown').trigger('drop');
            expect(grid.searchProvider.evalFilter).not.toHaveBeenCalled();
        });

        test('when row is dragged then clears row to move', function () {
            grid.$viewport.find('.kgRowContent:eq(0)').trigger('mousedown');
            grid.$viewport.find('.kgRowContent:eq(2)').trigger('drop');
            grid.$viewport.find('.kgRowContent:eq(1)').trigger('drop');
            expect(grid.sortedData().map((x) => x.text)).toEqual(['b', 'c', 'a', 'd']);
        });
    });

    describe('row drag/drop reordering with jqueryUI drag and drop', function () {
        test('should listen for row bound event ', function () {
            const grid = initGridWithjQueryUIOrdering();
            expect(grid.on).toHaveBeenCalledTimes(1);
            expect(grid.on).toBeCalledWith(GridEventType.RowBound, expect.any(Function));
        });

        test('when no initially rendered rows it should not try to initialize draggable or droppable', function () {
            jest.spyOn($.fn, 'droppable');
            jest.spyOn($.fn, 'draggable');

            const options: Partial<GridOptions> = {
                rowReorderingMode: RowReorderingMode.jQueryUI,
                rowReorderingHandle: '.something',
            };
            const grid = initGrid(options);
            ko.applyBindings(grid, grid.$root[0]);
            EventProvider.init(grid, Mock.of<GridOptions>(options));

            expect($.fn.droppable).not.toBeCalled();
            expect($.fn.draggable).not.toBeCalled();
        });

        test('in already rendered rows at initialization should enable reordering for non-group rows', function () {
            const grid = initGridWithjQueryUIOrdering();
            const rows = grid.$viewport.find('.kgRow');
            expect(rows.eq(0).data('uiDraggable')).toBeDefined();
            expect(rows.eq(0).data('uiDroppable')).toBeDefined();
            expect(rows.eq(1).data('uiDraggable')).toBeUndefined();
            expect(rows.eq(1).data('uiDroppable')).toBeUndefined();
        });

        test('in already rendered rows at initialization should not enable reordering for fixed row', function () {
            const grid = initGridWithjQueryUIOrdering();
            grid.$fixedViewport.find('.kgRow').each((index, element) => {
                expect($(element).data('uiDraggable')).toBeUndefined();
                expect($(element).data('uiDroppable')).toBeUndefined();
            });
        });

        test('when new row is bound and its not fixed nor a group row it should get enabled for reordering', function () {
            const grid = initGridWithjQueryUIOrdering();
            const newRow = Mock.of<Row>();
            grid.renderedRows.push(newRow);
            const newRowElement = grid.$viewport.find('.kgRow').get(2);
            triggerGridBoundEvent(grid, {
                row: newRow,
                rowElement: newRowElement,
            });
            expect($(newRowElement).data('uiDraggable')).toBeDefined();
            expect($(newRowElement).data('uiDroppable')).toBeDefined();
        });

        test('when new row is bound and is a group row it should not get enabled for reordering', function () {
            const newRow = Mock.of<Row>({ isGroupRow: true });
            const grid = initGridWithjQueryUIOrdering();
            grid.renderedRows.push(newRow);
            const newRowElement = grid.$viewport.find('.kgRow').get(2);
            triggerGridBoundEvent(grid, {
                row: newRow,
                rowElement: newRowElement,
            });
            expect($(newRowElement).data('uiDraggable')).toBeUndefined();
            expect($(newRowElement).data('uiDroppable')).toBeUndefined();
        });

        describe('draggable options', function () {
            let grid: Grid;

            beforeEach(function () {
                grid = initGridWithjQueryUIOrdering();
                jest.spyOn($.fn, 'draggable');
            });

            it('should add re-ordering handle if provided', function () {
                addNewRow(grid);
                expectOptions((args) => expect(args.handle).toBe('.something'));
            });

            it('should not add re-ordering handle if not provided', function () {
                grid = initGridWithjQueryUIOrdering({
                    rowReorderingMode: RowReorderingMode.jQueryUI,
                });
                addNewRow(grid);
                expectOptions((args) => expect(args.handle).toBeUndefined());
            });

            it('should set helper as clone', function () {
                addNewRow(grid);
                expectOptions((args) => expect(args.helper).toBe('clone'));
            });

            it('should append draggable element to parent', function () {
                const row = addNewRow(grid);
                expectOptions((args) =>
                    expect(args.appendTo.is($(row.rowElement).parent())).toBe(true)
                );
            });

            it('should set .kgRows as stack', function () {
                addNewRow(grid);
                expectOptions((args) => expect(args.stack).toBe('.kgRow'));
            });

            it('should set start event', function () {
                addNewRow(grid);
                expectOptions((args) => expect(args.start).toEqual(expect.any(Function)));
            });

            it('should set revert event', function () {
                addNewRow(grid);
                expectOptions((args) => expect(args.revert).toBe(true));
            });

            it('should set revert duration', function () {
                addNewRow(grid);
                expectOptions((args) => expect(args.revertDuration).toBe(100));
            });

            it('should set z index', function () {
                addNewRow(grid);
                expectOptions((args) => expect(args.zIndex).toBe(1000));
            });

            it('should set scope', function () {
                addNewRow(grid);
                expectOptions((args) => expect(args.scope).toEqual('mock-grid-123456'));
            });

            function expectOptions(
                expectFunc: (callArguments: JQueryUI.DraggableOptions) => void
            ): void {
                expectFunc(getDraggableOptions());
            }
        });

        describe('droppable options', function () {
            let grid: Grid;

            beforeEach(function () {
                grid = initGridWithjQueryUIOrdering();
                jest.spyOn($.fn, 'droppable');
                addNewRow(grid);
            });

            it('should set over event', function () {
                expectOptions((args) => expect(args.over).toEqual(expect.any(Function)));
            });

            it('should set out event', function () {
                expectOptions((args) => expect(args.out).toEqual(expect.any(Function)));
            });

            it('should set drop event', function () {
                expectOptions((args) => expect(args.drop).toEqual(expect.any(Function)));
            });

            it('should set scope', function () {
                expectOptions((args) => expect(args.scope).toEqual('mock-grid-123456'));
            });

            function expectOptions(
                expectFunc: (callArguments: JQueryUI.DroppableOptions) => void
            ): void {
                expectFunc(getDroppableOptions());
            }
        });

        describe('events', function () {
            let row1: HTMLElement;
            let row2: HTMLElement;
            let grid: Grid;

            beforeEach(function () {
                grid = initGridWithjQueryUIOrdering();
                jest.spyOn($.fn, 'draggable');
                jest.spyOn($.fn, 'droppable');
                const boundRow1 = addNewRow(grid);
                (boundRow1.row as Row).rowIndex(1);
                row1 = boundRow1.rowElement;
                const boundRow2 = addNewRow(grid);
                (boundRow2.row as Row).rowIndex(2);
                row2 = boundRow2.rowElement;
            });

            it('on drag start should reset hovered entity', function () {
                grid.hoveredEntity({});
                dragStart(row1);
                expect(grid.hoveredEntity()).toBeUndefined();
            });

            it('on drag over a row below should highlight its bottom edge', function () {
                dragStart(row1);
                dragOver(row2);
                expect($(row2).hasClass('kgRow--drag-over-bottom')).toBe(true);
            });

            it('on drag over a row above should highlight its top edge', function () {
                dragStart(row2);
                dragOver(row1);
                expect($(row1).hasClass('kgRow--drag-over-top')).toBe(true);
            });

            it('on drag over dummy row below then should not highlight any edges', function () {
                const dummyRow = grid.$viewport.find('.kgRow--dummy');
                dragStart(row1);
                dragOver(dummyRow[0]);
                expect(dummyRow.hasClass('kgRow--drag-over-top')).toBe(false);
                expect(dummyRow.hasClass('kgRow--drag-over-bottom')).toBe(false);
            });

            it('on drag outside a row should remove top highlight', function () {
                row1.classList.add('kgRow--drag-over-top');
                dragOut(row1);
                expect(row1.classList.contains('kgRow--drag-over-top')).toBe(false);
            });

            it('on drag outside a row should remove bottom highlight', function () {
                row1.classList.add('kgRow--drag-over-bottom');
                dragOut(row1);
                expect(row1.classList.contains('kgRow--drag-over-bottom')).toBe(false);
            });

            it('on drop over another row should change positions of them', function () {
                let sortedEntities = grid.sortedData();
                const entityRow1 = sortedEntities[sortedEntities.length - 2];
                const entityRow2 = sortedEntities[sortedEntities.length - 1];
                dragStart(row2);
                dropOn(row1);
                sortedEntities = grid.sortedData();
                expect(sortedEntities[sortedEntities.length - 2]).toBe(entityRow2);
                expect(sortedEntities[sortedEntities.length - 1]).toBe(entityRow1);
            });

            function dragStart(row: HTMLElement): void {
                const event = ($.Event('start', {
                    currentTarget: row,
                }) as unknown) as JQueryEventObject;
                getDraggableOptions().start!(event, getFakeDraggableUIParams());
            }

            function dragOver(row: HTMLElement): void {
                const event = ($.Event('over', { target: row }) as unknown) as JQueryEventObject;
                getDroppableOptions().over!(event as any, getFakeDroppableUIParams());
            }

            function dragOut(row: HTMLElement): void {
                const event = ($.Event('out', { target: row }) as unknown) as JQueryEventObject;
                getDroppableOptions().out!(event as any, getFakeDroppableUIParams());
            }

            function dropOn(row: HTMLElement): void {
                const event = ($.Event('out', { target: row }) as unknown) as JQueryEventObject;
                getDroppableOptions().drop!(event as any, getFakeDroppableUIParams());
            }

            function getFakeDraggableUIParams(): JQueryUI.DraggableEventUIParams {
                return {
                    helper: $('<div>'),
                    offset: {
                        left: 0,
                        top: 0,
                    },
                    position: {
                        left: 0,
                        top: 0,
                    },
                };
            }

            function getFakeDroppableUIParams(): JQueryUI.DroppableEventUIParam {
                return {
                    draggable: $('<div>'),
                    helper: $('<div>'),
                    offset: {
                        left: 0,
                        top: 0,
                    },
                    position: {
                        left: 0,
                        top: 0,
                    },
                };
            }
        });

        function addNewRow(grid: Grid): RowBoundData {
            const newRow = Mock.of<Row>({ rowIndex: ko.observable(), entity: {} });
            grid.sortedData.push(newRow.entity);
            grid.renderedRows.push(newRow);
            const newRowElement = grid.$viewport.find('.kgRow:not(.kgRow--dummy)').last();
            const rowBound: RowBoundData = {
                row: newRow,
                rowElement: newRowElement[0],
            };
            triggerGridBoundEvent(grid, rowBound);
            return rowBound;
        }

        function getDroppableOptions(): JQueryUI.DroppableOptions {
            const mock = $.fn.droppable as jest.Mock;
            return mock.mock.calls[0][0];
        }

        function getDraggableOptions(): JQueryUI.DraggableOptions {
            const mock = $.fn.draggable as jest.Mock;
            return mock.mock.calls[0][0];
        }

        function initGridWithjQueryUIOrdering(options?: Partial<GridOptions>): Grid {
            const defaultOptions: Partial<GridOptions> = options || {
                rowReorderingMode: RowReorderingMode.jQueryUI,
                rowReorderingHandle: '.something',
            };
            const grid = initGrid(defaultOptions);
            grid.renderedRows([Mock.of<Row>(), Mock.of<Row>({ isGroupRow: true })]);
            ko.applyBindings(grid, grid.$root[0]);
            EventProvider.init(grid, Mock.of<GridOptions>(defaultOptions));
            return grid;
        }

        function triggerGridBoundEvent(grid: Grid, rowBound: RowBoundData): void {
            const mock = grid.on as jest.Mock;
            const callback: GridEventHandler<RowBoundData> = mock.mock.calls.find(
                (callArguments) => callArguments[0] === GridEventType.RowBound
            )[1];
            callback({ type: GridEventType.RowBound, data: rowBound });
        }
    });

    describe('row drag/drop disabled', function () {
        test('does not allow dragging over view port', function () {
            const grid = init();
            const event = $.Event('dragover');
            grid.$viewport.trigger(event);
            expect(event.isDefaultPrevented()).toBe(false);
        });
    });

    describe('row hover in/out', function () {
        describe('given legacy mode', function () {
            let grid: Grid;

            beforeEach(function () {
                grid = init({ legacyMode: true });
                grid.sortedData([{ text: 'a' }, { text: 'b' }]);
                grid.renderedRows(
                    grid.sortedData().map((entity) => Mock.of<Row>({ entity }))
                );
                ko.applyBindings(grid, grid.$root[0]);
            });

            test('when hovering over row 1 then should set hovered entity to entity 1', function () {
                grid.$viewport.find('.kgRow:eq(0)').trigger('mouseenter');
                expect(grid.hoveredEntity()).toBe(grid.sortedData()[0]);
            });

            test('when hovering over row 2 then should set hovered entity to entity 2', function () {
                grid.$viewport.find('.kgRow:eq(1)').trigger('mouseenter');
                expect(grid.hoveredEntity()).toBe(grid.sortedData()[1]);
            });

            test('when hovering out of row then should remove hovered entity', function () {
                grid.hoveredEntity(grid.sortedData()[0]);
                grid.$viewport.find('.kgRow:eq(0)').trigger('mouseleave');
                expect(grid.hoveredEntity()).toBeUndefined();
            });

            test('when hovering over a cloned row which has no bind entity, hoveredEntity should keep unchanged', function () {
                grid.hoveredEntity(grid.sortedData()[0]);
                const clonedRow = grid.$viewport.find('.kgRow:eq(0)').clone();
                clonedRow.appendTo(grid.$viewport);
                clonedRow.trigger('mouseenter');
                expect(grid.hoveredEntity()).toBe(grid.sortedData()[0]);
            });
        });

        describe('given non-legacy mode', function () {
            let grid: Grid;

            beforeEach(function () {
                grid = init({ legacyMode: false });
                grid.sortedData([{ text: 'a' }, { text: 'b' }]);
                grid.renderedRows(
                    grid.sortedData().map((entity) => Mock.of<Row>({ entity }))
                );
                ko.applyBindings(grid, grid.$root[0]);
            });

            test('when hovering over row then should not set hovered entity', function () {
                grid.$viewport.find('.kgRow:eq(0)').trigger('mouseenter');
                expect(grid.hoveredEntity()).toBeUndefined();
            });
        });
    });

    function init(options?: Partial<GridOptions>): Grid {
        const grid = initGrid(options);
        EventProvider.init(grid, Mock.of<GridOptions>(options));
        return grid;
    }

    function initGrid(options?: Partial<GridOptions> & { legacyMode?: boolean }): Grid {
        const $root = $('<div>').appendTo(sandbox);
        const $topPanel = $('<div class="kgTopPanel">').appendTo($root);

        const $groupPanel = $(`
<div class="kgGroupPanel">
    <ul class="kgGroupList" data-bind="foreach: configGroups">
        <li class="kgGroupItem" style="width: 50px;">
            <div class="kgGroupElement">
                <div class="kgGroupName">
                    <span data-bind="text: displayName"></span>
                    <span class="kgRemoveGroup remove-me">x</span>
                </div>
            </div>
        </li>
    </ul>
</div>`).appendTo($topPanel);

        const $headerScroller = $(`
        <div class="kgHeaderScroller kgNonFixedHeaderScroller">
        <div data-bind="foreach: visibleNonFixedColumns">
            <div class="kgHeaderCell kgNonFixedColumn">
                <div class="kgHeaderSortColumn">
                    <div class="kgHeaderText" data-bind="text: $data.displayName"></div>
                </div>
            </div>
        </div>
    </div>`).appendTo($topPanel);

        const $fixedHeaderScroller = $(`
    <div class="kgHeaderScroller kgFixedHeaderScroller">
        <div data-bind="foreach: visibleFixedColumns">
            <div class="kgHeaderCell kgFixedColumn">
                <div class="kgHeaderSortColumn">
                    <div class="kgHeaderText" data-bind="text: $data.displayName"></div>
                </div>
            </div>
        </div>
    </div>`).appendTo($topPanel);

        const $viewport = $(`
<div>
    <div data-bind="foreach: renderedRows">
        <div class="kgRow">
            <div class="kgRowContent"></div>
        </div>
    </div>
    <div class="kgRow kgRow--dummy"></div>
</div>
        `).appendTo($root);

        const $fixedViewport = $(`
<div>
    <div class="kgFixedCanvas">
        <div data-bind="foreach: renderedRows">
            <div class="kgFixedRow">
                <div class="kgRowContent"></div>
            </div>
        </div>
        <div class="kgFixedRow kgFixedRow--dummy"></div>
    </div>
</div>
        `).appendTo($root);

        const columns = ko.observableArray<Column>();
        const configGroups = ko.observableArray<Column>();
        const grid = Mock.of<Grid>({
            $fixedHeaderScroller,
            $groupPanel,
            $headerScroller,
            $root,
            $topPanel,
            $viewport,
            $fixedViewport,
            columns,
            config: Mock.of<GridConfig>(options),
            configGroups: configGroups,
            gridId: 'mock-grid-123456',
            adjustScrollLeft: jest.fn(),
            adjustScrollTop: jest.fn(),
            adjustFixedViewportScrollTop: jest.fn(),
            configureColumnWidths: jest.fn(),
            groupBy: jest.fn(),
            hoveredEntity: ko.observable(),
            isDraggingOverGroups: ko.observable(false),
            legacyMode: options && options.legacyMode,
            on: jest.fn(),
            visibleNonFixedColumns: ko.pureComputed(() => columns().filter((x) => !x.fixed)),
            renderedRows: ko.observableArray(),
            searchProvider: Mock.of<SearchProvider>({ evalFilter: jest.fn() }),
            settings: jest.fn().mockReturnValue({}),
            shouldMaintainColumnRatios: jest.fn(),
            sortedData: ko.observableArray(),
            trigger: jest.fn(),
            visibleFixedColumns: ko.pureComputed(() => columns().filter((x) => x.fixed)),
            fixColumnIndexes() {
                columns.peek().forEach(function (col, i) {
                    col.index = i;
                });
            },
            fixGroupIndexes() {
                configGroups.peek().forEach(function (col, i) {
                    col.groupIndex(i);
                });
            },
        });

        return grid;
    }

    function dragOverGroupItem(grid: Grid, index: number, alignment: Alignment): void {
        const event = $.Event('dragover', {
            originalEvent: {
                pageX: alignment === Alignment.Left ? 25 : 26,
                preventDefault: $.noop,
                stopPropagation: $.noop,
            },
        });
        grid.$groupPanel.find('.kgGroupItem').eq(index).trigger(event);
    }

    function getColumn(
        field: string,
        index: number,
        options?: { fixed?: boolean; groupIndex?: number }
    ) {
        return Mock.of<Column>({
            field,
            index,
            displayName: ko.observable('col>' + field),
            fixed: !!(options && options.fixed),
            groupIndex: ko.observable(
                options && options.groupIndex !== undefined ? options.groupIndex : -1
            ),
        });
    }

    function getDragStartEvent() {
        return $.Event('dragstart', {
            originalEvent: { dataTransfer: { setData: jest.fn() } },
        });
    }

    function leaveGroupPanel(grid: Grid, isWithinBounds?: boolean) {
        const event = $.Event('dragleave');
        jest.spyOn(utils, 'isPointerOverElement').mockImplementation(function (_event, node) {
            if (_event === event && node === grid.$groupPanel[0]) {
                return !!isWithinBounds;
            }
            return false;
        });

        grid.$groupPanel.trigger(event);
    }
});
