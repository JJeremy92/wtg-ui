import ko, { PureComputed } from 'knockout';
import Grid from './classes/Grid';

export interface SizeStyle {
    readonly height: string;
    readonly width?: string;
}

export interface GridStyles {
    readonly canvasStyle: PureComputed<SizeStyle>;
    readonly fixedHeaderStyle: PureComputed<SizeStyle>;
    readonly fixedViewportStyle: PureComputed<SizeStyle>;
    readonly footerStyle: PureComputed<SizeStyle>;
    readonly groupPanelStyle: PureComputed<SizeStyle>;
    readonly headerScrollerStyle: PureComputed<SizeStyle>;
    readonly headerStyle: PureComputed<SizeStyle>;
    readonly topPanelStyle: PureComputed<SizeStyle>;
    readonly viewportPanelStyle: PureComputed<SizeStyle>;
    readonly viewportStyle: PureComputed<SizeStyle>;
}

export default function styleProvider(grid: Grid): GridStyles {
    return {
        canvasStyle: ko.pureComputed(function (): SizeStyle {
            return { height: grid.maxCanvasHt().toString() + 'px' };
        }),
        headerScrollerStyle: ko.pureComputed(function (): SizeStyle {
            return { height: grid.config.headerRowHeight + 'px' };
        }),
        topPanelStyle: ko.pureComputed(function (): SizeStyle {
            return {
                width: grid.rootDim.outerWidth() + 'px',
                height: grid.topPanelHeight + 'px',
            };
        }),
        headerStyle: ko.pureComputed(function (): SizeStyle {
            return {
                width: grid.viewportDimWidth() + 'px',
                height: grid.config.headerRowHeight + 'px',
            };
        }),
        fixedHeaderStyle: ko.pureComputed(function (): SizeStyle {
            return {
                width: grid.fixedViewportDimWidth() + 'px',
                height: grid.config.headerRowHeight + 'px',
            };
        }),
        groupPanelStyle: ko.pureComputed(function (): SizeStyle {
            return {
                width: grid.rootDim.outerWidth() + 'px',
                height: grid.config.headerRowHeight + 'px',
            };
        }),
        viewportPanelStyle: ko.pureComputed(function (): SizeStyle {
            return {
                width: grid.rootDim.outerWidth() + 'px',
                height: grid.viewportDimHeight() + 'px',
            };
        }),
        viewportStyle: ko.pureComputed(function (): SizeStyle {
            return {
                width: grid.viewportDimWidth() + 'px',
                height: grid.viewportDimHeight() + 'px',
            };
        }),
        fixedViewportStyle: ko.pureComputed(function (): SizeStyle {
            return {
                width: grid.fixedViewportDimWidth() + 'px',
                height: grid.viewportDimHeight() + 'px',
            };
        }),
        footerStyle: ko.pureComputed(function (): SizeStyle {
            return {
                width: grid.rootDim.outerWidth() + 'px',
                height: grid.config.footerRowHeight + 'px',
            };
        }),
    };
}
