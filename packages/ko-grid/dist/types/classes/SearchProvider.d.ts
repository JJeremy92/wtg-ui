import Grid from './Grid';
export default class SearchProvider {
    constructor(grid: Grid);
    private readonly fieldMap;
    private readonly filterTextComputed;
    private readonly grid;
    private lastSearchStr;
    private searchConditions;
    evalFilter(): void;
    private processFilterText;
    private buildSearchConditions;
    private gridColumnsSubscription;
}
