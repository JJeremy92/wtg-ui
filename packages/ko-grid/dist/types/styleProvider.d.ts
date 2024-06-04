import { PureComputed } from 'knockout';
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
export default function styleProvider(grid: Grid): GridStyles;
