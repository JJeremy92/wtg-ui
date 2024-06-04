import ko from 'knockout';
import { Entity, Maybe, PropertyBag, Value } from './types';

let canvas: HTMLCanvasElement | undefined;

export default {
    visualLength(node: JQuery): number {
        const text = node.text().trim();
        if (!text) {
            return 0;
        }

        canvas = canvas || document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) {
            return 0;
        }

        context.font = node.css('font');
        const metrics = context.measureText(text);
        return metrics.width;
    },
    evalProperty(entity: Entity, path: string): Maybe<Value> {
        const propPath = path.split('.');
        let i = 0;
        let tempProp = ko.unwrap(entity[propPath[i]]);
        const links = propPath.length;
        i++;
        while (tempProp && i < links) {
            tempProp = ko.unwrap((tempProp as PropertyBag)[propPath[i]]);
            i++;
        }
        return tempProp;
    },
    hasValue(value: Maybe<Value>): value is Value {
        return value != null && value !== '';
    },
    isPointerOverElement(event: JQuery.TriggeredEvent, node: Element): boolean {
        const x = (event.originalEvent as MouseEvent).pageX;
        const y = (event.originalEvent as MouseEvent).pageY;
        const bounds = node.getBoundingClientRect();
        return x >= bounds.left && x < bounds.right && y >= bounds.top && y < bounds.bottom;
    },
    newId: (function (): () => number {
        let seedId = new Date().getTime();
        return function newId(): number {
            return ++seedId;
        };
    })(),
};
