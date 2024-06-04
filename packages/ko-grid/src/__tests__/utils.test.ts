import $ from 'jquery';
import ko from 'knockout';
import { Mock } from 'ts-mockery';
import { Maybe, Value } from '../types';
import utils from '../utils';

describe('utils', function () {
    let getContext: jest.Mock<CanvasRenderingContext2D | null, [string]>;

    beforeAll(function () {
        // getContext is not implemented in Node.js.
        getContext = jest.fn();
        HTMLCanvasElement.prototype.getContext = getContext as any;
    });

    describe('visual length', function () {
        test('is measured using 2d context of canvas', function () {
            const node = $('<span>x</span>');
            utils.visualLength(node);
            expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalledWith('2d');
        });

        test('is calculated from node font and text', function () {
            mockContext();
            expect(utils.visualLength($('<span>x</span>').css('font', '12pt'))).toBe(12);
            expect(utils.visualLength($('<span>xx</span>').css('font', '12pt'))).toBe(24);
            expect(utils.visualLength($('<span>xx</span>').css('font', '15pt'))).toBe(30);
        });

        test('is 0 if text is white space', function () {
            mockContext();
            expect(utils.visualLength($('<span>  </span>').css('font', '12pt'))).toBe(0);
        });

        test('is 0 if canvas has no context', function () {
            getContext.mockReturnValue(null);
            expect(utils.visualLength($('<span>x</span>').css('font', '12pt'))).toBe(0);
        });

        function mockContext() {
            getContext.mockReturnValue(
                Mock.of<CanvasRenderingContext2D>({
                    measureText: function (text) {
                        const fontSize = parseInt(
                            this.font!.substr(0, this.font!.indexOf('pt')),
                            10
                        );
                        return Mock.of<TextMetrics>({ width: text.length * fontSize });
                    },
                })
            );
        }
    });

    describe('evaluating entity property', function () {
        test('can evaluate non-observables', function () {
            const value = utils.evalProperty({ foo: 'bar' }, 'foo');
            expect(value).toBe('bar');
        });

        test('can evaluate observables', function () {
            const value = utils.evalProperty({ foo: ko.observable('bar') }, 'foo');
            expect(value).toBe('bar');
        });

        test('supports complex path', function () {
            const value = utils.evalProperty({ foo: { bar: { meh: 0 } } }, 'foo.bar.meh');
            expect(value).toBe(0);
        });

        test('breaks on undefined part of complex path', function () {
            const value = utils.evalProperty({ foo: { bar: undefined } }, 'foo.bar.meh');
            expect(value).toBeUndefined();
        });
    });

    describe('new id', function () {
        test('is strictly increasing', function () {
            const id1 = utils.newId();
            const id2 = utils.newId();
            const id3 = utils.newId();
            expect(id2).toBeGreaterThan(id1);
            expect(id3).toBeGreaterThan(id2);
        });
    });

    test.each<[Maybe<Value>, boolean]>([
        [null, false],
        [undefined, false],
        ['', false],
        ['x', true],
        [0, true],
    ])('hasValue(%s) === %s', function (value, hasValue) {
        expect(utils.hasValue(value)).toBe(hasValue);
    });

    test.each<[number, number, boolean]>([
        [100, 300, true],
        [199, 300, true],
        [100, 399, true],
        [199, 399, true],
        [99, 300, false],
        [200, 300, false],
        [100, 299, false],
        [100, 400, false],
    ])('isPointerOverElement(x: %s, y: %s) = %s', function (pageX, pageY, expected): void {
        const event = $.Event('mousemove', {
            originalEvent: { pageX, pageY },
        }) as JQuery.MouseMoveEvent;
        const node = document.createElement('div');
        jest.spyOn(node, 'getBoundingClientRect').mockReturnValue(
            Mock.of<DOMRect>({
                left: 100,
                right: 200,
                top: 300,
                bottom: 400,
            })
        );

        expect(utils.isPointerOverElement(event, node)).toBe(expected);
    });
});
