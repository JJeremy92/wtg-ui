import { AggregateOperation } from './constants';
import moveSelectionHandler from './moveSelectionHandler';
import utils from './utils';
import templates from './templates/templates';
import './binding-handlers/koGrid';
import './binding-handlers/kgRow';
import './binding-handlers/kgFixedRow';
import './binding-handlers/kgFixedHeaderRow';
import './binding-handlers/kgCell';
import './binding-handlers/kgCellClass';
import './binding-handlers/kgHeaderRow';
import './binding-handlers/kgHeaderCell';
import './binding-handlers/kgGridForEach';
import './binding-handlers/mouseEvents';
import Column from './classes/Column';
import { DefaultAggregationProvider } from './classes/DefaultAggregationProvider';
import Dimension from './classes/Dimension';
import EventProvider from './classes/EventProvider';
import RowFactory from './classes/RowFactory';
import Grid from './classes/Grid';
import Group from './classes/Group';
import Range from './classes/Range';
import Row from './classes/Row';
import SearchProvider from './classes/SearchProvider';
import SelectionService from './classes/SelectionService';
import styleProvider from './styleProvider';
import sortService from './sortService';
import domUtilityService from './domUtilityService';
import { configure } from './configuration';

export default {
    AggregateOperation,
    Column,
    config: configure,
    DefaultAggregationProvider,
    defaultGroupRowTemplate: templates.defaultGroupRowTemplate,
    defaultHeaderCellTemplate: templates.defaultHeaderCellTemplate,
    defaultHeaderRowTemplate: templates.defaultHeaderRowTemplate,
    defaultRowTemplate: templates.defaultRowTemplate,
    Dimension,
    domUtilityService,
    EventProvider,
    Grid,
    Group,
    moveSelectionHandler,
    Range,
    Row,
    RowFactory,
    SearchProvider,
    SelectionService,
    sortService,
    styleProvider,
    utils,
};
