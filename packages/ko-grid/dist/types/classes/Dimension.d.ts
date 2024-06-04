import { Observable } from 'knockout';
export default class Dimension {
    constructor(width: number, height: number);
    readonly outerHeight: Observable<number>;
    readonly outerWidth: Observable<number>;
}
