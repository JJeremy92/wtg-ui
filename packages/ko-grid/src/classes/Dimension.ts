import ko, { Observable } from 'knockout';

export default class Dimension {
    public constructor(width: number, height: number) {
        this.outerWidth = ko.observable(width);
        this.outerHeight = ko.observable(height);
    }

    public readonly outerHeight: Observable<number>;
    public readonly outerWidth: Observable<number>;
}
