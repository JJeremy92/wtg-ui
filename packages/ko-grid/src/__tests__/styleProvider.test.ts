import ko from 'knockout';
import { Mock } from 'ts-mockery';
import domUtilityService from '../domUtilityService';
import styleProvider from '../styleProvider';
import Dimension from '../classes/Dimension';
import Grid from '../classes/Grid';

describe('style provider', function () {
    beforeAll(function () {
        domUtilityService.scrollW = 50;
    });

    test('has canvas style', function () {
        const grid = Mock.of<Grid>({ maxCanvasHt: ko.observable(123) });
        const result = styleProvider(grid).canvasStyle();
        expect(result).toEqual({ height: '123px' });
    });

    test('has header scroller style', function () {
        const grid = Mock.of<Grid>({ config: { headerRowHeight: 124 } });
        const result = styleProvider(grid).headerScrollerStyle();
        expect(result).toEqual({ height: '124px' });
    });

    test('has top panel style', function () {
        const grid = Mock.of<Grid>({
            rootDim: new Dimension(10, 20),
            topPanelHeight: 30,
        });
        const result = styleProvider(grid).topPanelStyle();
        expect(result).toEqual({ width: '10px', height: '30px' });
    });

    test('has group panel style', function () {
        const grid = Mock.of<Grid>({
            rootDim: new Dimension(10, 20),
            config: { headerRowHeight: 35 },
        });
        const result = styleProvider(grid).groupPanelStyle();
        expect(result).toEqual({ width: '10px', height: '35px' });
    });

    test('has header style', function () {
        const grid = Mock.of<Grid>({
            config: { headerRowHeight: 35 },
            fixedViewportDimWidth: () => 150,
            viewportDimWidth: () => 60,
        });
        const result = styleProvider(grid).headerStyle();
        expect(result).toEqual({ width: '60px', height: '35px' });
    });

    test('has fixed header style', () => {
        const grid = Mock.of<Grid>({
            config: { headerRowHeight: 35 },
            fixedViewportDimWidth: () => 150,
        });
        const result = styleProvider(grid).fixedHeaderStyle();
        expect(result).toEqual({ width: '150px', height: '35px' });
    });

    test('header style width is not negative', function () {
        const grid = Mock.of<Grid>({
            config: { headerRowHeight: 35 },
            viewportDimHeight: () => 123,
            viewportDimWidth: () => 60,
        });
        const result = styleProvider(grid).headerStyle();
        expect(result).toEqual({ width: '60px', height: '35px' });
    });

    test('has viewport panel style', function () {
        const grid = Mock.of<Grid>({
            rootDim: new Dimension(100, 50),
            viewportDimHeight: () => 35,
        });
        const result = styleProvider(grid).viewportPanelStyle();
        expect(result).toEqual({ width: '100px', height: '35px' });
    });

    test('has viewport style', function () {
        const grid = Mock.of<Grid>({
            viewportDimHeight: () => 55,
            viewportDimWidth: () => 60,
        });
        const result = styleProvider(grid).viewportStyle();
        expect(result).toEqual({ width: '60px', height: '55px' });
    });

    test('has fixed viewport column style', () => {
        const grid = Mock.of<Grid>({
            viewportDimHeight: () => 123,
            fixedViewportDimWidth: () => 150,
        });
        const result = styleProvider(grid).fixedViewportStyle();
        expect(result).toEqual({ height: '123px', width: '150px' });
    });

    test('has footer style', function () {
        const grid = Mock.of<Grid>({
            config: { footerRowHeight: 15 },
            rootDim: new Dimension(75, 20),
        });
        const result = styleProvider(grid).footerStyle();
        expect(result).toEqual({ width: '75px', height: '15px' });
    });
});
