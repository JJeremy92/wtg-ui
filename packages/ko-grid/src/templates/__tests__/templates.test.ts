import templates from '../templates';

describe('templates', function () {
    test('has grid template', function () {
        expect(templates.defaultGridTemplate()).toContain(
            '<div class="kgViewport kgNonFixedViewport"'
        );
    });

    test('has row template', function () {
        expect(templates.defaultRowTemplate()).toContain('foreach: $grid.visibleNonFixedColumns');
    });

    test('has fixed row template', function () {
        expect(templates.defaultFixedRowTemplate()).toContain('foreach: $grid.visibleFixedColumns');
    });

    test('has group template', function () {
        expect(templates.defaultGroupRowTemplate()).toContain('<span class="kgGroupText"');
    });

    test('has fixed group template', function () {
        expect(templates.defaultFixedGroupTemplate()).toContain('kgFixedGroup');
    });

    test('has header row template', function () {
        expect(templates.defaultHeaderRowTemplate()).toContain('<div data-bind="kgHeaderCell');
    });

    test('has header cell template', function () {
        expect(templates.defaultHeaderCellTemplate()).toContain('<div class="kgHeaderSortColumn"');
    });
});
