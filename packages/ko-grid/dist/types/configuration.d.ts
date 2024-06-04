import { ResourceStringsProvider } from './resourceStringsProvider';
import { Entity, Maybe, Value } from './types';
declare const configuration: {
    css: {
        groupCollapsedClass: string;
        groupExpandedClass: string;
        groupArrowClass: string;
        removeGroupClass: string;
    };
    evalProperty: (entity: Entity, path: string) => Maybe<Value>;
    legacyMode: boolean | undefined;
    resourceStringsProvider: {
        columnMenuFilter: () => string;
        columnMenuGroupBy: () => string;
        columnMenuText: () => string;
        footerFirstPage: () => string;
        footerLastPage: () => string;
        footerNextPage: () => string;
        footerPageSize: () => string;
        footerPreviousPage: () => string;
        footerSelectedItems: () => string;
        footerShownItems: () => string;
        footerTotalItems: () => string;
        groupHeaderNoGroups: () => string;
        groupHeaderWithGroups: () => string;
    };
};
export interface GlobalOptions {
    readonly evalProperty?: (entity: Entity, path: string) => Maybe<Value>;
    readonly groupCollapsedClass?: string;
    readonly groupExpandedClass?: string;
    readonly groupArrowClass?: string;
    readonly removeGroupClass?: string;
    readonly legacyMode?: boolean;
    readonly resourceStringsProvider?: Partial<ResourceStringsProvider>;
}
export declare function configure(options: GlobalOptions): void;
export default configuration;
