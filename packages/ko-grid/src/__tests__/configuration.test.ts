import configuration, { configure } from '../configuration';
import { Maybe, Value } from '../types';
import utils from '../utils';

describe('configuration', function () {
    describe('default values', function () {
        test('evalProperty is utils.evalProperty', function () {
            expect(configuration.evalProperty).toBe(utils.evalProperty);
        });

        test('css values', function () {
            expect(configuration.css.groupCollapsedClass).toBe('');
            expect(configuration.css.groupExpandedClass).toBe('');
            expect(configuration.css.groupArrowClass).toBe('');
            expect(configuration.css.removeGroupClass).toBe('');
        });

        test('legacy mode is undefined', function () {
            expect(configuration.legacyMode).toBeUndefined();
        });

        test('resourceStringsProvider is set to default', function () {
            expect(configuration.resourceStringsProvider.groupHeaderWithGroups()).toBe(
                'Grouping By:'
            );
            expect(configuration.resourceStringsProvider.groupHeaderNoGroups()).toBe(
                'Drag column here to group rows'
            );
        });
    });

    describe('configure values', function () {
        test('set evalProperty', function () {
            configure({ evalProperty: (): Maybe<Value> => 'constant string' });
            const value = configuration.evalProperty({ foo: 'bar' }, 'foo');
            expect(value).toBe('constant string');
        });

        test('set css', function () {
            configure({
                groupCollapsedClass: 'groupCollapsedClass',
                groupExpandedClass: 'groupExpandedClass',
                groupArrowClass: 'groupArrowClass',
                removeGroupClass: 'removeGroupClass',
            });

            expect(configuration.css.groupCollapsedClass).toBe('groupCollapsedClass');
            expect(configuration.css.groupExpandedClass).toBe('groupExpandedClass');
            expect(configuration.css.groupArrowClass).toBe('groupArrowClass');
            expect(configuration.css.removeGroupClass).toBe('removeGroupClass');
        });

        test('set legacy mode', function () {
            configure({ legacyMode: true });
            expect(configuration.legacyMode).toBe(true);
        });

        test('set resourceStringsProvider', function () {
            configure({
                resourceStringsProvider: {
                    groupHeaderWithGroups: () => 'string1',
                    groupHeaderNoGroups: () => 'string2',
                },
            });
            expect(configuration.resourceStringsProvider.groupHeaderWithGroups()).toBe('string1');
            expect(configuration.resourceStringsProvider.groupHeaderNoGroups()).toBe('string2');
            expect(configuration.resourceStringsProvider.columnMenuFilter()).toBe(
                'Search Field:Value'
            );
        });
    });
});
