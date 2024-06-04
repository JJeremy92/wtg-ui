/// <reference types="jquery" />
/// <reference types="jqueryui" />
import { Entity, Maybe, Value } from './types';
declare const _default: {
    visualLength(node: JQuery): number;
    evalProperty(entity: Entity, path: string): Maybe<Value>;
    hasValue(value: Maybe<Value>): value is Value;
    isPointerOverElement(event: JQuery.TriggeredEvent, node: Element): boolean;
    newId: () => number;
};
export default _default;
