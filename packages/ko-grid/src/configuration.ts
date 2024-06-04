import resourceStringsProvider, { ResourceStringsProvider } from './resourceStringsProvider';
import { Entity, Maybe, Value } from './types';
import utils from './utils';

const configuration = {
    css: {
        groupCollapsedClass: '',
        groupExpandedClass: '',
        groupArrowClass: '',
        removeGroupClass: '',
    },
    evalProperty: utils.evalProperty,
    legacyMode: undefined as boolean | undefined,
    resourceStringsProvider,
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

export function configure(options: GlobalOptions): void {
    if (options.evalProperty) {
        configuration.evalProperty = options.evalProperty;
    }

    if (options.groupCollapsedClass != null) {
        configuration.css.groupCollapsedClass = options.groupCollapsedClass;
    }

    if (options.groupExpandedClass != null) {
        configuration.css.groupExpandedClass = options.groupExpandedClass;
    }

    if (options.groupArrowClass != null) {
        configuration.css.groupArrowClass = options.groupArrowClass;
    }

    if (options.removeGroupClass != null) {
        configuration.css.removeGroupClass = options.removeGroupClass;
    }

    if (options.legacyMode != null) {
        configuration.legacyMode = options.legacyMode;
    }

    if (options.resourceStringsProvider) {
        configuration.resourceStringsProvider = Object.assign(
            {},
            resourceStringsProvider,
            options.resourceStringsProvider
        );
    }
}

export default configuration;
