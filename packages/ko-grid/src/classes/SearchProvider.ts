import ko from 'knockout';
import Column from './Column';
import Grid from './Grid';

interface SearchCondition {
    readonly column?: string;
    readonly columnDisplay?: string;
    readonly regex: RegExp;
}

export default class SearchProvider {
    public constructor(grid: Grid) {
        this.grid = grid;
        this.fieldMap = new Map();
        this.searchConditions = [];
        this.lastSearchStr = '';

        const filterOptions = this.grid.config.filterOptions;
        this.filterTextComputed = ko.computed(this.processFilterText, this);
        if (filterOptions.filterThrottle != null) {
            this.filterTextComputed.extend({ throttle: filterOptions.filterThrottle });
        }

        if (!filterOptions.useExternalFilter) {
            this.grid.columns.subscribe(this.gridColumnsSubscription, this);
        }
    }

    private readonly fieldMap: Map<string, string>;
    private readonly filterTextComputed: ko.Computed<void>;
    private readonly grid: Grid;

    private lastSearchStr: string;
    private searchConditions: SearchCondition[];

    public evalFilter(): void {
        if (this.searchConditions.length === 0) {
            this.grid.filteredData(
                this.grid.sortedData.peek().filter((item): boolean => {
                    return item && !item._destroy;
                })
            );
        } else {
            this.grid.filteredData(
                this.grid.sortedData.peek().filter((item): boolean => {
                    if (!item || item._destroy) {
                        return false;
                    }

                    for (let i = 0, len = this.searchConditions.length; i < len; i++) {
                        const condition = this.searchConditions[i];
                        //Search entire row
                        if (!condition.column) {
                            for (let prop in item) {
                                if (item.hasOwnProperty(prop)) {
                                    const pVal = ko.unwrap(item[prop]);
                                    if (pVal && condition.regex.test(pVal.toString())) {
                                        return true;
                                    }
                                }
                            }
                            return false;
                        }
                        //Search by column.
                        let field = ko.unwrap(item[condition.column]);
                        if (!field && condition.columnDisplay) {
                            const column = this.fieldMap.get(condition.columnDisplay);
                            field = column && ko.unwrap(item[column]);
                        }
                        if (!field || !condition.regex.test(field.toString())) {
                            return false;
                        }
                    }
                    return true;
                })
            );
        }
        this.grid.rowFactory.filteredDataChanged();
    }

    private processFilterText(): void {
        if (!this.grid.config.filterOptions.useExternalFilter) {
            const filterText = this.grid.filterText().trim();
            if (filterText !== this.lastSearchStr) {
                //To prevent circular dependency when throttle is enabled.
                this.lastSearchStr = filterText;
                this.buildSearchConditions(filterText);
                this.evalFilter();
            }
        }
    }

    private buildSearchConditions(filterText: string): void {
        //reset.
        this.searchConditions = [];
        if (!filterText) {
            return;
        }
        const columnFilters = filterText.split(';');
        columnFilters.forEach((filter): void => {
            const args = filter.split(':');
            if (args.length > 1) {
                const columnName = args[0].trim();
                const columnValue = args[1].trim();
                if (columnName && columnValue) {
                    this.searchConditions.push({
                        column: columnName,
                        columnDisplay: columnName.replace(/\s+/g, '').toLowerCase(),
                        regex: getRegExp(columnValue, 'i'),
                    });
                }
            } else {
                const val = args[0].trim();
                if (val) {
                    this.searchConditions.push({ regex: getRegExp(val, 'i') });
                }
            }
        }, this);
    }

    private gridColumnsSubscription(columns: Column[]): void {
        columns.forEach((col): void => {
            this.fieldMap.set(col.displayName().toLowerCase().replace(/\s+/g, ''), col.field);
        });
    }
}

function getRegExp(str: string, modifiers: string): RegExp {
    try {
        return new RegExp(str, modifiers);
    } catch {
        //Escape all RegExp metacharacters.
        return new RegExp(str.replace(/(\^|\$|\(|\)|<|>|\[|\]|\{|\}|\\|\||\.|\*|\+|\?)/g, '\\$1'));
    }
}
