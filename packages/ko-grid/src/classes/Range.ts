export default class Range {
    public constructor(top: number, bottom: number) {
        this.topRow = top;
        this.bottomRow = bottom;
    }

    public readonly topRow: number;
    public readonly bottomRow: number;
}
