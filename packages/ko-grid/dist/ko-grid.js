(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('knockout'), require('bowser'), require('jquery')) :
    typeof define === 'function' && define.amd ? define(['knockout', 'bowser', 'jquery'], factory) :
    (global = global || self, global.kg = factory(global.ko, global.bowser, global.$));
}(this, (function (ko, bowser, $) { 'use strict';

    ko = ko && Object.prototype.hasOwnProperty.call(ko, 'default') ? ko['default'] : ko;
    bowser = bowser && Object.prototype.hasOwnProperty.call(bowser, 'default') ? bowser['default'] : bowser;
    $ = $ && Object.prototype.hasOwnProperty.call($, 'default') ? $['default'] : $;

    // the # of rows we want to add to the top and bottom of the rendered grid rows
    var EXCESS_ROWS = 8;
    var SCROLL_THRESHOLD = 6;
    var AggregateOperation = /*#__PURE__*/function (AggregateOperation) {
      AggregateOperation["Total"] = "SUM";
      AggregateOperation["Average"] = "AVG";
      return AggregateOperation;
    }({});
    var GridEventType = /*#__PURE__*/function (GridEventType) {
      GridEventType["ColumnWidthsChanged"] = "columnWidthsChanged";
      GridEventType["GroupInfosChanged"] = "groupInfosChanged";
      GridEventType["GroupToggleStarted"] = "groupToggleStarted";
      GridEventType["RowBound"] = "rowBound";
      GridEventType["SettingsChangedByUser"] = "settingsChangedByUser";
      GridEventType["SortInfosChanged"] = "sortInfosChanged";
      return GridEventType;
    }({});
    var ResizeTarget = /*#__PURE__*/function (ResizeTarget) {
      ResizeTarget["Root"] = "root";
      ResizeTarget["Window"] = "window";
      return ResizeTarget;
    }({});
    var RowReorderingMode = /*#__PURE__*/function (RowReorderingMode) {
      RowReorderingMode["Native"] = "native";
      RowReorderingMode["jQueryUI"] = "jquery-ui";
      return RowReorderingMode;
    }({});
    var SortDirection = /*#__PURE__*/function (SortDirection) {
      SortDirection["Unspecified"] = "";
      SortDirection["Ascending"] = "asc";
      SortDirection["Descending"] = "desc";
      return SortDirection;
    }({});

    //set event binding on the grid so we can select using the up/down keys
    function moveSelectionHandler(grid, evt) {
      var charCode = evt.which;
      // detect which direction for arrow keys to navigate the grid
      var offset = charCode === 38 ? -1 : charCode === 40 ? 1 : 0;
      var lastClickedRow = grid.selectionService.lastClickedRow;
      if (!offset || !lastClickedRow) {
        return true;
      }
      var items = grid.renderedRows();
      var index = items.indexOf(lastClickedRow) + offset;
      if (index < 0 || index >= items.length) {
        return true;
      }
      grid.selectionService.changeSelection(items[index], evt);
      if (index > items.length - EXCESS_ROWS) {
        grid.$viewport.scrollTop((grid.$viewport.scrollTop() || 0) + grid.rowHeight * EXCESS_ROWS);
      } else if (index < EXCESS_ROWS) {
        grid.$viewport.scrollTop((grid.$viewport.scrollTop() || 0) - grid.rowHeight * EXCESS_ROWS);
      }
      return false;
    }

    var canvas;
    var utils = {
      visualLength: function visualLength(node) {
        var text = node.text().trim();
        if (!text) {
          return 0;
        }
        canvas = canvas || document.createElement('canvas');
        var context = canvas.getContext('2d');
        if (!context) {
          return 0;
        }
        context.font = node.css('font');
        var metrics = context.measureText(text);
        return metrics.width;
      },
      evalProperty: function evalProperty(entity, path) {
        var propPath = path.split('.');
        var i = 0;
        var tempProp = ko.unwrap(entity[propPath[i]]);
        var links = propPath.length;
        i++;
        while (tempProp && i < links) {
          tempProp = ko.unwrap(tempProp[propPath[i]]);
          i++;
        }
        return tempProp;
      },
      hasValue: function hasValue(value) {
        return value != null && value !== '';
      },
      isPointerOverElement: function isPointerOverElement(event, node) {
        var x = event.originalEvent.pageX;
        var y = event.originalEvent.pageY;
        var bounds = node.getBoundingClientRect();
        return x >= bounds.left && x < bounds.right && y >= bounds.top && y < bounds.bottom;
      },
      newId: function () {
        var seedId = new Date().getTime();
        return function newId() {
          return ++seedId;
        };
      }()
    };

    var _defaultGridTemplate = "<div class=\"koGridContainer\"\r\n    data-bind=\"css: { 'ui-widget': jqueryUITheme, 'kgNoSelect' : disableTextSelection, 'koGrid--legacy': legacyMode, 'koGrid--modern': !legacyMode, 'koGrid--unfixed': fixedViewportDimWidth() === 0 }\">\r\n    <div class=\"kgTopPanel\"\r\n        data-bind=\"css: { 'ui-widget-header':jqueryUITheme, 'ui-corner-top': jqueryUITheme }, style: topPanelStyle\">\r\n        <div class=\"kgGroupPanel\" data-bind=\"visible: enableGrouping, style: groupPanelStyle\">\r\n            <div class=\"kgGroupPanelDescription\" data-bind=\"text: groupPanelText\"></div>\r\n            <ul data-bind=\"foreach: configGroups\" class=\"kgGroupList\">\r\n                <li class=\"kgGroupItem\">\r\n                    <div class=\"kgGroupElement\">\r\n                        <div class=\"kgGroupName\" draggable=\"true\">\r\n                            <span data-bind=\"text: displayName\"></span>\r\n                            <span\r\n                                data-bind=\"attr: { class: 'kgRemoveGroup ' + $css.removeGroupClass }, click: function(data) { $grid.removeGroup($index()) }\">\r\n                                <span class=\"kgRemoveGroupText\">x</span>\r\n                            </span>\r\n                        </div>\r\n                        <span\r\n                            data-bind=\"attr: { class: ' kgGroupArrow ' + $css.groupArrowClass }, visible: $index() < ($grid.configGroups().length - 1)\"></span>\r\n                    </div>\r\n                </li>\r\n            </ul>\r\n        </div>\r\n        <div class=\"kgHeaderContainer kgFixedHeaderContainer\" data-bind=\"style: fixedHeaderStyle\">\r\n            <div class=\"kgHeaderScroller kgFixedHeaderScroller\"\r\n                data-bind=\"style: headerScrollerStyle, kgFixedHeaderRow\"></div>\r\n        </div>\r\n        <div class=\"kgHeaderContainer kgNonFixedHeaderContainer\" data-bind=\"style: headerStyle\">\r\n            <div class=\"kgHeaderScroller kgNonFixedHeaderScroller\"\r\n                data-bind=\"style: headerScrollerStyle, kgHeaderRow: $data\"></div>\r\n        </div>\r\n        <div class=\"kgHeaderButton\" data-bind=\"visible: (showColumnMenu || showFilter), click: toggleShowMenu\">\r\n            <div class=\"kgHeaderButtonArrow\"></div>\r\n        </div>\r\n        <div data-bind=\"visible: showMenu\" class=\"kgColMenu\">\r\n            <div data-bind=\"visible: showFilter\">\r\n                <input type=\"text\"\r\n                    data-bind=\"attr: { placeholder: $resStrings.columnMenuFilter() }, value: filterText, valueUpdate: 'afterkeydown'\" />\r\n            </div>\r\n            <div data-bind=\"visible: showColumnMenu\">\r\n                <span class=\"kgMenuText\" data-bind=\"text: $resStrings.columnMenuText()\"></span>\r\n                <ul class=\"kgColList\" data-bind=\"foreach: nonGroupColumns\">\r\n                    <li class=\"kgColListItem\">\r\n                        <label style=\"position: relative;\">\r\n                            <input type=\"checkbox\" class=\"kgColListCheckbox\" data-bind=\"checked: visible\" />\r\n                            <span data-bind=\"text: displayName, click: toggleVisible\"></span>\r\n                            <a data-bind=\"attr: { 'title': $resStrings.columnMenuGroupBy(), 'class': groupedByClass }, visible: (field != '\\u2714'), click: $parent.toggleGroup.bind($parent)\"></a>\r\n                            <span class=\"kgGroupingNumber\"\r\n                                data-bind=\"visible: isGroupedBy, text: groupIndex() + 1\"></span>\r\n                        </label>\r\n                    </li>\r\n                </ul>\r\n            </div>\r\n        </div>\r\n    </div>\r\n    <div class=\"kgMiddlePanel\" data-bind=\"style: viewportPanelStyle\">\r\n        <div class=\"kgViewport kgFixedViewport\"\r\n            data-bind=\"css: { 'ui-widget-content': jqueryUITheme }, style: fixedViewportStyle\">\r\n            <div class=\"kgCanvas kgFixedCanvas\" data-bind=\"style: canvasStyle\">\r\n                <div data-bind=\"kgGridForEach: renderedRows\" style=\"position: absolute;\">\r\n                    <div data-bind=\"style: { 'top': offsetTop }, click: toggleSelected, css: { 'kgRow--selected': isSelected, 'kgRow--even': isEven, 'kgRow--odd': isOdd, 'ui-state-default': $parent.jqueryUITheme && isOdd, 'ui-state-active': $parent.jqueryUITheme && isEven, 'kgRow--hovered': $grid.isHoveredEntity(entity) }, kgFixedRow\"\r\n                        class=\"kgRow kgFixedRow\"></div>\r\n                </div>\r\n            </div>\r\n        </div>\r\n        <div class=\"kgViewport kgNonFixedViewport\"\r\n            data-bind=\"css: {'ui-widget-content': jqueryUITheme}, style: viewportStyle\">\r\n            <div class=\"kgCanvas kgNonFixedCanvas\" data-bind=\"style: canvasStyle\">\r\n                <div data-bind=\"kgGridForEach: renderedRows\" style=\"position: absolute;\">\r\n                    <div data-bind=\"style: { 'top': offsetTop }, click: toggleSelected, css: { 'kgRow--selected': isSelected, 'kgRow--even': isEven , 'kgRow--odd': isOdd, 'ui-state-default': $parent.jqueryUITheme && isOdd, 'ui-state-active':$parent.jqueryUITheme && isEven, 'kgRow--hovered': $grid.isHoveredEntity(entity) }, kgRow\"\r\n                        class=\"kgRow kgNonFixedRow\"></div>\r\n                </div>\r\n            </div>\r\n        </div>\r\n    </div>\r\n    <div class=\"kgFooterPanel\"\r\n        data-bind=\"css: { 'ui-widget-content': jqueryUITheme, 'ui-corner-bottom': jqueryUITheme }, style: footerStyle\">\r\n        <div class=\"kgTotalSelectContainer\" data-bind=\"visible: footerVisible\">\r\n            <div class=\"kgFooterTotalItems\" data-bind=\"css: { 'kgFooterTotalItems--no-multi-select': !multiSelect }\">\r\n                <span class=\"kgLabel\" data-bind=\"text: $resStrings.footerTotalItems() + ' ' + maxRows()\"></span>\r\n                <span class=\"kgLabel\" data-bind=\"text: '(' + $resStrings.footerShownItems() + ' ' + totalFilteredItemsLength() + ')', visible: filterText().length > 0\"></span>\r\n            </div>\r\n            <div class=\"kgFooterSelectedItems\" data-bind=\"visible: multiSelect\">\r\n                <span class=\"kgLabel\" data-bind=\"text: $resStrings.footerSelectedItems() + ' ' + selectedItemCount()\"></span>\r\n            </div>\r\n        </div>\r\n        <div class=\"kgPagerContainer\" style=\"float: right; margin-top: 10px;\"\r\n            data-bind=\"visible: footerVisible && enablePaging\">\r\n            <div style=\"float: left; margin-right: 10px;\" class=\"kgRowCountPicker\">\r\n                <span style=\"float: left; margin-top: 3px;\" class=\"kgLabel\" data-bind=\"text: $resStrings.footerPageSize()\"></span>\r\n                <select style=\"float: left; height: 27px; width: 100px\"\r\n                    data-bind=\"value: pagingOptions.pageSize, options: pagingOptions.pageSizes\"></select>\r\n            </div>\r\n            <div style=\"float:left; margin-right: 10px; line-height:25px; min-width: 135px;\" class=\"kgPagerControl\">\r\n                <button class=\"kgPagerButton\" data-bind=\"attr: { title: $resStrings.footerFirstPage() }, click: pageToFirst, disable: cantPageBackward()\">\r\n                    <div class=\"kgPagerFirstTriangle\">\r\n                        <div class=\"kgPagerFirstBar\"></div>\r\n                    </div>\r\n                </button>\r\n                <button class=\"kgPagerButton\" data-bind=\"attr: { title: $resStrings.footerPreviousPage() }, click: pageBackward, disable: cantPageBackward()\">\r\n                    <div class=\"kgPagerFirstTriangle kgPagerPrevTriangle\"></div>\r\n                </button>\r\n                <input class=\"kgPagerCurrent\" type=\"number\"\r\n                    style=\"width: 50px; height: 24px; margin-top: 1px; padding: 0px 4px;\"\r\n                    data-bind=\"value: pagingOptions.currentPage, valueUpdate: 'afterkeydown'\" />\r\n                <button class=\"kgPagerButton\" data-bind=\"attr: { title: $resStrings.footerNextPage() }, click: pageForward, disable: cantPageForward()\">\r\n                    <div class=\"kgPagerLastTriangle kgPagerNextTriangle\"></div>\r\n                </button>\r\n                <button class=\"kgPagerButton\" data-bind=\"attr: { title: $resStrings.footerLastPage() }, click: pageToLast, disable: cantPageForward()\">\r\n                    <div class=\"kgPagerLastTriangle\">\r\n                        <div class=\"kgPagerLastBar\"></div>\r\n                    </div>\r\n                </button>\r\n            </div>\r\n        </div>\r\n    </div>\r\n</div>";

    var _defaultRowTemplate = "<div class=\"kgRowInner\" data-bind=\"style: { cursor : canSelectRows ? 'pointer' : 'default' }, foreach: $grid.visibleNonFixedColumns, css: { 'ui-widget-content': $grid.jqueryUITheme }\">\r\n    <div data-bind=\"kgCell, kgCellClass\"></div>\r\n</div>";

    var _defaultFixedRowTemplate = "<div data-bind=\"style: { cursor : canSelectRows ? 'pointer' : 'default' }, foreach: $grid.visibleFixedColumns, css: { 'ui-widget-content': $grid.jqueryUITheme }\">\r\n\t<div data-bind=\"kgCell, kgCellClass\"></div>\r\n</div>\r\n";

    var _defaultFixedHeaderRowTemplate = "<div data-bind=\"foreach: visibleFixedColumns\">\r\n    <div data-bind=\"kgHeaderCell: $data, attr: { 'class': headerClass + ' kgHeaderCell col' + $index() }\"></div>\r\n</div>";

    var defaultGroupTemplate = "<div class=\"kgGroupContainer\">\r\n    <div data-bind=\"style: { 'width': offsetLeft }, visible: depth\" class=\"kgGroupSpacer\"></div>\r\n    <div data-bind=\"style: { 'left': offsetLeft }\" class=\"kgGroup\">\r\n        <div data-bind=\"attr: { class: groupClass }, click: toggleExpand, clickBubble: false\"></div>\r\n        <span class=\"kgGroupText\" data-bind=\"text: $data.label\"></span>\r\n        <div class=\"kgGroupAggregateContainer\" data-bind=\"foreach: $data.aggregateResults\">\r\n            <div class=\"kgGroupAggregateResult\">\r\n                <span data-bind=\"text: field\"></span>\r\n                <span data-bind=\"text: operation\"></span>\r\n                <span data-bind=\"text: result\"></span>\r\n            </div>\r\n        </div>\r\n    </div>\r\n</div>\r\n";

    var _defaultFixedGroupTemplate = "<div class=\"kgFixedGroup\"></div>";

    var _defaultHeaderRowTemplate = "<div class=\"kgRowInner\" data-bind=\"foreach: visibleNonFixedColumns\">\r\n    <div data-bind=\"kgHeaderCell: $data, attr: { 'class': headerClass + ' kgHeaderCell col' + $index() }\"></div>\r\n</div>";

    var _defaultHeaderCellTemplate = "<div class=\"kgHeaderSortColumn\" data-bind=\"style: { cursor : sortable ? 'pointer' : 'default' }, click: sort, css: { 'kgSorted': !noSortVisible }\" draggable=\"true\">\r\n    <div class=\"kgHeaderText\" data-bind=\"text: displayName\"></div>\r\n    <div class=\"kgSortButtonDown\" data-bind=\"visible: showSortButtonDown\"></div>\r\n    <div class=\"kgSortButtonUp\" data-bind=\"visible: showSortButtonUp\"></div>\r\n    <div data-bind=\"visible: resizable, click: gripClick, mouseEvents: { mouseDown: gripOnMouseDown.bind($data) }\" class=\"kgHeaderGrip\"></div>\r\n</div>";

    var templates = {
      defaultGridTemplate: function defaultGridTemplate() {
        return _defaultGridTemplate;
      },
      defaultRowTemplate: function defaultRowTemplate() {
        return _defaultRowTemplate;
      },
      defaultFixedRowTemplate: function defaultFixedRowTemplate() {
        return _defaultFixedRowTemplate;
      },
      defaultGroupRowTemplate: function defaultGroupRowTemplate() {
        return defaultGroupTemplate;
      },
      defaultFixedGroupTemplate: function defaultFixedGroupTemplate() {
        return _defaultFixedGroupTemplate;
      },
      defaultHeaderRowTemplate: function defaultHeaderRowTemplate() {
        return _defaultHeaderRowTemplate;
      },
      defaultHeaderCellTemplate: function defaultHeaderCellTemplate() {
        return _defaultHeaderCellTemplate;
      },
      defaultFixedHeaderRowTemplate: function defaultFixedHeaderRowTemplate() {
        return _defaultFixedHeaderRowTemplate;
      }
    };

    function _toPrimitive(t, r) {
      if ("object" != typeof t || !t) return t;
      var e = t[Symbol.toPrimitive];
      if (void 0 !== e) {
        var i = e.call(t, r || "default");
        if ("object" != typeof i) return i;
        throw new TypeError("@@toPrimitive must return a primitive value.");
      }
      return ("string" === r ? String : Number)(t);
    }
    function _toPropertyKey(t) {
      var i = _toPrimitive(t, "string");
      return "symbol" == typeof i ? i : String(i);
    }
    function _typeof(o) {
      "@babel/helpers - typeof";

      return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) {
        return typeof o;
      } : function (o) {
        return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o;
      }, _typeof(o);
    }
    function _classCallCheck(instance, Constructor) {
      if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
      }
    }
    function _defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor);
      }
    }
    function _createClass(Constructor, protoProps, staticProps) {
      if (protoProps) _defineProperties(Constructor.prototype, protoProps);
      if (staticProps) _defineProperties(Constructor, staticProps);
      Object.defineProperty(Constructor, "prototype", {
        writable: false
      });
      return Constructor;
    }
    function _defineProperty(obj, key, value) {
      key = _toPropertyKey(key);
      if (key in obj) {
        Object.defineProperty(obj, key, {
          value: value,
          enumerable: true,
          configurable: true,
          writable: true
        });
      } else {
        obj[key] = value;
      }
      return obj;
    }

    var Dimension = /*#__PURE__*/_createClass(function Dimension(width, height) {
      _classCallCheck(this, Dimension);
      this.outerWidth = ko.observable(width);
      this.outerHeight = ko.observable(height);
    });

    var resourceStringsProvider = {
      columnMenuFilter: function columnMenuFilter() {
        return 'Search Field:Value';
      },
      columnMenuGroupBy: function columnMenuGroupBy() {
        return 'Group By';
      },
      columnMenuText: function columnMenuText() {
        return 'Choose Columns:';
      },
      footerFirstPage: function footerFirstPage() {
        return 'First Page';
      },
      footerLastPage: function footerLastPage() {
        return 'Last Page';
      },
      footerNextPage: function footerNextPage() {
        return 'Next Page';
      },
      footerPageSize: function footerPageSize() {
        return 'Page Size:';
      },
      footerPreviousPage: function footerPreviousPage() {
        return 'Previous Page';
      },
      footerSelectedItems: function footerSelectedItems() {
        return 'Selected Items:';
      },
      footerShownItems: function footerShownItems() {
        return 'Showing:';
      },
      footerTotalItems: function footerTotalItems() {
        return 'Total Items:';
      },
      groupHeaderNoGroups: function groupHeaderNoGroups() {
        return 'Drag column here to group rows';
      },
      groupHeaderWithGroups: function groupHeaderWithGroups() {
        return 'Grouping By:';
      }
    };

    var configuration = {
      css: {
        groupCollapsedClass: '',
        groupExpandedClass: '',
        groupArrowClass: '',
        removeGroupClass: ''
      },
      evalProperty: utils.evalProperty,
      legacyMode: undefined,
      resourceStringsProvider: resourceStringsProvider
    };
    function configure(options) {
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
        configuration.resourceStringsProvider = Object.assign({}, resourceStringsProvider, options.resourceStringsProvider);
      }
    }

    var domUtilityService = {
      getGridContainers: function getGridContainers(rootEl) {
        var $topPanel = rootEl.find('.kgTopPanel');
        var $headerContainer = $topPanel.find('.kgNonFixedHeaderContainer');
        var $fixedHeaderContainer = $topPanel.find('.kgFixedHeaderContainer');
        var $viewport = rootEl.find('.kgNonFixedViewport');
        var $fixedViewport = rootEl.find('.kgFixedViewport');
        return {
          $root: rootEl,
          $topPanel: $topPanel,
          $groupPanel: $topPanel.find('.kgGroupPanel'),
          $headerContainer: $headerContainer,
          $headerScroller: $headerContainer.find('.kgHeaderScroller'),
          $viewport: $viewport,
          $canvas: $viewport.find('.kgCanvas'),
          $fixedHeaderContainer: $fixedHeaderContainer,
          $fixedHeaderScroller: $fixedHeaderContainer.find('.kgHeaderScroller'),
          $fixedViewport: $fixedViewport,
          $fixedCanvas: $fixedViewport.find('.kgCanvas')
        };
      },
      updateGridLayout: function updateGridLayout(grid) {
        //catch this so we can return the viewer to their original scroll after the resize!
        var scrollTop = grid.$viewport.scrollTop() || 0;
        //check to see if anything has changed
        grid.refreshDomSizes({
          width: grid.$root.width() || 0,
          height: grid.$root.height() || 0
        });
        grid.adjustScrollTop(scrollTop, true); //ensure that the user stays scrolled where they were
      },
      buildStyles: function buildStyles(grid) {
        var rowHeight = grid.rowHeight;
        var gridId = grid.gridId;
        var style = grid.styleSheet;
        if (!style) {
          style = document.createElement('style');
          style.id = gridId;
          style.type = 'text/css';
          document.body.appendChild(style);
          grid.styleSheet = style;
        }
        var totalNonFixedRowWidth = grid.totalNonFixedRowWidth();
        var kgHeaderScrollerWidth = totalNonFixedRowWidth + domUtilityService.scrollH;
        var css = [".".concat(gridId, " .kgNonFixedCanvas { width: ").concat(totalNonFixedRowWidth, "px; }"), ".".concat(gridId, " .kgNonFixedRow { width: ").concat(totalNonFixedRowWidth, "px; height: ").concat(rowHeight, "px; }"), ".".concat(gridId, " .kgHeaderCell { height: ").concat(grid.config.headerRowHeight - 1, "px; }"), ".".concat(gridId, " .kgCell { height: ").concat(rowHeight - 1, "px; }"), ".".concat(gridId, " .kgNonFixedHeaderScroller { width: ").concat(kgHeaderScrollerWidth, "px; }")].concat(getColumnStyles(grid, grid.visibleNonFixedColumns()));
        if (grid.legacyMode) {
          css = css.concat([".".concat(gridId, " .kgFixedRow { width: ").concat(grid.totalFixedRowWidth(), "px; height: ").concat(rowHeight, "px; }")], getColumnStyles(grid, grid.visibleFixedColumns()));
        }
        style.textContent = css.join('');
      },
      scrollH: 17,
      // default in IE, Chrome, & most browsers
      scrollW: 17 // default in IE, Chrome, & most browsers
    };
    function getColumnStyles(grid, columns) {
      var gridId = grid.gridId,
        css = [];
      var sumWidth = 0;
      columns.forEach(function (col, i) {
        css.push(".".concat(gridId, " .").concat(col.fixedClass, ".col").concat(i, " { width: ").concat(col.width, "px; left: ").concat(sumWidth, "px; }"));
        sumWidth += col.width;
      });
      return css;
    }
    (function measureScrollbars() {
      var $testContainer = $('<div>').height(100).width(100).css('position', 'absolute').css('overflow', 'scroll').append('<div style="height: 400px; width: 400px;">');
      $testContainer.appendTo(document.body);
      domUtilityService.scrollH = $testContainer.height() || 0 - $testContainer[0].clientHeight;
      domUtilityService.scrollW = $testContainer.width() || 0 - $testContainer[0].clientWidth;
      $testContainer.remove();
    })();

    var groupPanelDragOverClass = 'kgGroupPanel--drag-over';
    var EventProvider = /*#__PURE__*/function () {
      function EventProvider(grid) {
        _classCallCheck(this, EventProvider);
        this.grid = grid;
        this.colToMove = undefined;
        this.groupToMove = undefined;
        this.rowToMove = undefined;
        this.groupPlaceholder = undefined;
      }
      _createClass(EventProvider, [{
        key: "assignGridEventHandlers",
        value: function assignGridEventHandlers(options) {
          var grid = this.grid;
          grid.$viewport.on('scroll', function (e) {
            var scrollLeft = e.target.scrollLeft;
            var scrollTop = e.target.scrollTop;
            grid.adjustScrollLeft(scrollLeft);
            grid.adjustScrollTop(scrollTop);
            grid.adjustFixedViewportScrollTop();
          }).on('keydown', function (e) {
            return moveSelectionHandler(grid, e);
          });

          //Chrome and firefox both need a tab index so the grid can receive focus.
          //need to give the grid a tabindex if it doesn't already have one so
          //we'll just give it a tab index of the corresponding gridcache index
          //that way we'll get the same result every time it is run.
          //configurable within the options.
          var tabIndex = grid.config.tabIndex;
          if (tabIndex === -1) {
            tabIndex = document.querySelectorAll('.koGrid').length - 1;
          }
          grid.$viewport.attr('tabIndex', tabIndex);
          assignResizeEventHandler(grid, options);
        }
      }, {
        key: "assignEvents",
        value: function assignEvents() {
          var grid = this.grid;
          grid.$groupPanel.on('dragstart', '.kgGroupItem', this.onGroupDragStart.bind(this)).on('dragenter', this.onGroupDragEnter.bind(this)).on('dragover', this.onGroupDragOver.bind(this)).on('dragleave', this.onGroupDragLeave.bind(this)).on('drop', this.onGroupDrop.bind(this));
          grid.$topPanel.on('dragstart', '.kgHeaderSortColumn', this.onHeaderDragStart.bind(this)).on('dragenter dragover', '.kgHeaderCell', this.onHeaderDragOver.bind(this)).on('drop', '.kgHeaderSortColumn', this.onHeaderDrop.bind(this)).on('dragend', this.onTopPanelDragEnd.bind(this));
          this.enableRowReordering();
          if (grid.legacyMode) {
            var onRowHoverInBound = onRowHoverIn.bind(null, grid);
            var onRowHoverOutBound = onRowHoverOut.bind(null, grid);
            grid.$viewport.on('mouseenter', '.kgRow', onRowHoverInBound).on('mouseleave', '.kgRow', onRowHoverOutBound);
            grid.$fixedViewport.on('mouseenter', '.kgRow', onRowHoverInBound).on('mouseleave', '.kgRow', onRowHoverOutBound);
          }
        }
      }, {
        key: "enableRowReordering",
        value: function enableRowReordering() {
          var _this = this;
          var grid = this.grid;
          if (grid.config.rowReorderingMode === RowReorderingMode.jQueryUI) {
            var renderedRows = this.grid.$viewport.find('.kgRow');
            if (renderedRows.length) {
              this.grid.renderedRows().forEach(function (row, index) {
                _this.activateJqueryUIRowDragging(row, renderedRows.get(index), grid);
              });
            }
            grid.on(GridEventType.RowBound, function (_ref) {
              var data = _ref.data;
              _this.activateJqueryUIRowDragging(data.row, data.rowElement, grid);
            });
          } else if (grid.config.rowReorderingMode === RowReorderingMode.Native) {
            grid.$viewport.on('mousedown', '.kgRow', this.onRowMouseDown.bind(this)).on('dragover', this.onRowDragOverNative.bind(this)).on('drop', '.kgRow', this.onRowDropNative.bind(this));
          }
        }
      }, {
        key: "onGroupDragStart",
        value: function onGroupDragStart(event) {
          var groupItem = $(event.currentTarget);
          var groupItemScope = ko.dataFor(groupItem[0]);
          this.groupToMove = groupItemScope && {
            col: groupItemScope,
            index: groupItemScope.groupIndex()
          };
          if (groupItemScope) {
            allowDragging(event);
            this.groupPlaceholder = createGroupPlaceholder(this.grid, groupItem.find('span:first').text());
            // Needed so that the browser has enough time to register the element to be dragged
            // since when it is hidden the drag never starts. Once started, we can hide it.
            setTimeout(function () {
              groupItem.hide();
            });
          }
        }
      }, {
        key: "onGroupDragEnter",
        value: function onGroupDragEnter(event) {
          if (this.groupPlaceholder) {
            event.preventDefault();
            this.grid.$groupPanel.addClass(groupPanelDragOverClass);
          }
        }
      }, {
        key: "onGroupDragOver",
        value: function onGroupDragOver(event) {
          var placeholder = this.groupPlaceholder;
          if (placeholder) {
            event.preventDefault();
            moveGroupPlaceholderToPointer(placeholder, event);
            placeholder.show();
            this.grid.isDraggingOverGroups(true);
          }
        }
      }, {
        key: "onGroupDragLeave",
        value: function onGroupDragLeave(event) {
          if (this.groupPlaceholder && !utils.isPointerOverElement(event, this.grid.$groupPanel[0])) {
            this.groupPlaceholder.hide();
            this.grid.$groupPanel.removeClass(groupPanelDragOverClass);
            this.grid.isDraggingOverGroups(false);
          }
        }
      }, {
        key: "onGroupDrop",
        value: function onGroupDrop(event) {
          event.preventDefault();
          var placeholder = this.groupPlaceholder;
          if (!placeholder) {
            return;
          }
          var grid = this.grid;
          var configGroups = grid.configGroups();
          var dropTarget = placeholder.next('.kgGroupItem');
          var groupScope = dropTarget.length === 0 ? undefined : ko.dataFor(dropTarget[0]);
          var targetIndex = groupScope ? groupScope.groupIndex() : configGroups.length;
          if (this.groupToMove) {
            if (!groupScope || this.groupToMove.index !== targetIndex) {
              if (targetIndex > this.groupToMove.index) {
                targetIndex--;
              }
              configGroups.splice(this.groupToMove.index, 1);
              configGroups.splice(targetIndex, 0, this.groupToMove.col);
              grid.configGroups.valueHasMutated();
              grid.fixGroupIndexes();
            }
          } else if (this.colToMove && !configGroups.includes(this.colToMove)) {
            grid.groupBy(this.colToMove, targetIndex);
          }
        }
      }, {
        key: "onHeaderDragStart",
        value: function onHeaderDragStart(event) {
          var sortColumn = event.currentTarget;
          this.colToMove = ko.dataFor(sortColumn);
          if (this.colToMove) {
            allowDragging(event);
            if (!this.grid.configGroups().includes(this.colToMove)) {
              this.groupPlaceholder = createGroupPlaceholder(this.grid, sortColumn.textContent);
            }
          }
        }
      }, {
        key: "onHeaderDragOver",
        value: function onHeaderDragOver(event) {
          if (this.colToMove) {
            var targetClass = this.colToMove.fixed ? 'kgFixedColumn' : 'kgNonFixedColumn';
            if (event.currentTarget.classList.contains(targetClass)) {
              event.preventDefault();
            }
          }
        }
      }, {
        key: "onHeaderDrop",
        value: function onHeaderDrop(event) {
          event.preventDefault();
          if (!this.colToMove) {
            return;
          }
          var headerScope = ko.dataFor(event.currentTarget);
          if (headerScope && this.colToMove !== headerScope) {
            var grid = this.grid;
            var cols = grid.columns.peek();
            cols.splice(this.colToMove.index, 1);
            cols.splice(headerScope.index, 0, this.colToMove);
            grid.fixColumnIndexes();
            grid.columns.valueHasMutated();
            domUtilityService.buildStyles(grid);
            grid.trigger(GridEventType.SettingsChangedByUser, {
              columnDefs: grid.settings().columnDefs
            });
          }
        }
      }, {
        key: "onTopPanelDragEnd",
        value: function onTopPanelDragEnd() {
          this.grid.$groupPanel.removeClass(groupPanelDragOverClass).find('.kgGroupItem').show();
          this.colToMove = undefined;
          this.groupToMove = undefined;
          if (this.groupPlaceholder) {
            this.groupPlaceholder.remove();
            this.groupPlaceholder = undefined;
            this.grid.isDraggingOverGroups(false);
          }
        }

        // Row functions
      }, {
        key: "activateJqueryUIRowDragging",
        value: function activateJqueryUIRowDragging(row, rowElement, grid) {
          if (!row.isGroupRow) {
            var $row = $(rowElement);
            $row.draggable({
              scope: grid.gridId,
              helper: 'clone',
              handle: grid.config.rowReorderingHandle || undefined,
              appendTo: $row.parent(),
              stack: '.kgRow',
              containment: grid.$viewport,
              start: this.onRowMouseDown.bind(this),
              revert: true,
              revertDuration: 100,
              zIndex: 1000
            }).droppable({
              scope: grid.gridId,
              over: this.onRowDragOverJQueryUI.bind(this),
              out: this.onRowDragOutJQueryUI,
              drop: this.onRowDropJQueryUI.bind(this)
            });
          }
        }
      }, {
        key: "onRowMouseDown",
        value: function onRowMouseDown(event) {
          var targetRow = event.currentTarget;

          // Get the scope from the row element
          // Save the row for later.
          this.rowToMove = ko.dataFor(targetRow);
          if (this.rowToMove) {
            // set draggable events
            targetRow.setAttribute('draggable', 'true');
          }
          this.grid.hoveredEntity(undefined);
        }
      }, {
        key: "onRowDragOverNative",
        value: function onRowDragOverNative(event) {
          event.preventDefault();
        }
      }, {
        key: "onRowDragOverJQueryUI",
        value: function onRowDragOverJQueryUI(event) {
          var targetRow = event.target;
          var targetRowScope = ko.dataFor(targetRow);
          if (typeof targetRowScope.rowIndex !== 'function') {
            return;
          }
          var rowToMove = this.rowToMove;
          var rowToMoveIndex = rowToMove.rowIndex();
          var targetRowIndex = targetRowScope.rowIndex();
          if (rowToMoveIndex > targetRowIndex) {
            targetRow.classList.add('kgRow--drag-over-top');
          } else {
            targetRow.classList.add('kgRow--drag-over-bottom');
          }
        }
      }, {
        key: "onRowDragOutJQueryUI",
        value: function onRowDragOutJQueryUI(event) {
          var row = event.target;
          row.classList.remove('kgRow--drag-over-top');
          row.classList.remove('kgRow--drag-over-bottom');
        }
      }, {
        key: "onRowDropNative",
        value: function onRowDropNative(event) {
          var dropTarget = event.currentTarget;
          this.onRowDropCore(dropTarget);
        }
      }, {
        key: "onRowDropJQueryUI",
        value: function onRowDropJQueryUI(event) {
          //We need to used target instead of currentTarget because jQueryUI sets currentTarget to window.document for some reason
          var dropTarget = event.target;
          this.onRowDropCore(dropTarget);
        }
      }, {
        key: "onRowDropCore",
        value: function onRowDropCore(dropTarget) {
          var prevRow = this.rowToMove;
          if (!prevRow) {
            return;
          }
          // Get the scope from the row element.
          var rowScope = ko.dataFor(dropTarget);
          // If we have the same Row, do nothing.
          if (rowScope && prevRow !== rowScope) {
            // Splice the Rows via the actual datasource
            var grid = this.grid;
            var sd = grid.sortedData();
            var i = sd.indexOf(prevRow.entity);
            var j = sd.indexOf(rowScope.entity);
            sd.splice(i, 1);
            sd.splice(j, 0, prevRow.entity);
            grid.sortedData.valueHasMutated();
            grid.searchProvider.evalFilter();
          }
          // clear out the rowToMove object
          this.rowToMove = undefined;
        }
      }], [{
        key: "init",
        value: function init(grid, options) {
          var provider = new EventProvider(grid);
          provider.assignGridEventHandlers(options);
          provider.assignEvents();
          return provider;
        }
      }]);
      return EventProvider;
    }();
    function allowDragging(event) {
      // Needed to activate drag and drop in FireFox but requires preventDefault to be called
      // in subsequent drag events to avoid strange behaviours like URL redirecting.
      var dataTransfer = event.originalEvent.dataTransfer;
      dataTransfer && dataTransfer.setData('text', '');
    }
    function assignResizeEventHandler(grid, options) {
      var handler = function handler() {
        domUtilityService.updateGridLayout(grid);
        if (grid.shouldMaintainColumnRatios()) {
          grid.configureColumnWidths();
        }
      };
      if (options.resizeTarget === ResizeTarget.Root) {
        grid.$root.on('resize', handler);
      } else {
        $(window).on('resize', handler);
        ko.utils.domNodeDisposal.addDisposeCallback(grid.$root[0], function () {
          $(window).off('resize', handler);
        });
      }
    }
    function createGroupPlaceholder(grid, text) {
      var placeholder = grid.$groupPanel.find('.kgGroupPlaceholder');
      if (placeholder.length === 0) {
        placeholder = $("\n<div class=\"kgGroupPlaceholder\">\n    <div class=\"kgGroupElement\">\n        <div class=\"kgGroupName\">\n            <span></span>\n            <span class=\"kgRemoveGroup ".concat(configuration.css.removeGroupClass, "\">\n                <span class=\"kgRemoveGroupText\">x</span>\n            </span>\n        </div>\n    </div>\n</div>"));
        grid.$groupPanel.find('.kgGroupList').append(placeholder);
      }
      placeholder.hide().find('span:first').text(text.trim());
      return placeholder;
    }
    function moveGroupPlaceholderToPointer(placeholder, event) {
      var groupItem = $(event.target).closest('.kgGroupItem');
      if (groupItem.length > 0) {
        var centerPoint = groupItem.offset().left + (groupItem.width() || 0) / 2;
        event.originalEvent.pageX <= centerPoint ? placeholder.insertBefore(groupItem) : placeholder.insertAfter(groupItem);
      }
    }
    function onRowHoverIn(grid, e) {
      var row = ko.dataFor(e.currentTarget);
      if (row) {
        grid.hoveredEntity(row.entity);
      }
    }
    function onRowHoverOut(grid) {
      grid.hoveredEntity(undefined);
    }

    var colSortFnCache = new WeakMap(); // cache of sorting functions. Once we create them, we don't want to keep re-doing it
    var dateRE = /^(\d\d?)[/.-](\d\d?)[/.-]((\d\d)?\d\d)$/; // nasty regex for date parsing

    function guessSortFn(item) {
      var sortFn; // sorting function that is guessed
      if (item == null || item === '') {
        return undefined;
      }
      var itemType = _typeof(item);
      //check for numbers and booleans
      switch (itemType) {
        case 'number':
          sortFn = sortNumber;
          break;
        case 'boolean':
          sortFn = sortBool;
          break;
        default:
          sortFn = undefined;
          break;
      }
      //if we found one, return it
      if (sortFn) {
        return sortFn;
      }
      //check if the item is a valid Date
      if (Object.prototype.toString.call(item) === '[object Date]') {
        return sortDate;
      }
      // if we aren't left with a string, return a basic sorting function...
      if (itemType !== 'string') {
        return basicSort;
      }
      // now lets string check..
      //check if the item data is a valid number
      if (item.match(/^-?[£$¤]?[\d,.]+%?$/)) {
        return sortNumberStr;
      }
      // check for a date: dd/mm/yyyy or dd/mm/yy
      // can have / or . or - as separator
      // can be mm/dd as well
      var dateParts = item.match(dateRE);
      if (dateParts) {
        // looks like a date
        var month = parseInt(dateParts[1], 10);
        var day = parseInt(dateParts[2], 10);
        if (month > 12) {
          // definitely dd/mm
          return sortDDMMStr;
        } else if (day > 12) {
          return sortMMDDStr;
        } else {
          // looks like a date, but we can't tell which, so assume that it's DD/MM
          return sortDDMMStr;
        }
      }
      //finally just sort the normal string...
      return sortAlpha;
    }
    function basicSort(a, b) {
      if (a === b) {
        return 0;
      }
      if (a < b) {
        return -1;
      }
      return 1;
    }
    function sortNumber(a, b) {
      return a - b;
    }
    function sortNumberStr(a, b) {
      var badA = false;
      var badB = false;
      var numA = parseFloat(a.replace(/[^0-9.-]/g, ''));
      if (isNaN(numA)) {
        badA = true;
      }
      var numB = parseFloat(b.replace(/[^0-9.-]/g, ''));
      if (isNaN(numB)) {
        badB = true;
      }
      // we want bad ones to get pushed to the bottom... which effectively is "greater than"
      if (badA && badB) {
        return 0;
      }
      if (badA) {
        return 1;
      }
      if (badB) {
        return -1;
      }
      return numA - numB;
    }
    function sortAlpha(a, b) {
      var strA = a.toLowerCase();
      var strB = b.toLowerCase();
      return strA === strB ? 0 : strA < strB ? -1 : 1;
    }
    function sortBool(a, b) {
      if (a && b) {
        return 0;
      }
      if (!a && !b) {
        return 0;
      } else {
        return a ? 1 : -1;
      }
    }
    function sortDate(a, b) {
      var timeA = a.getTime();
      var timeB = b.getTime();
      return timeA === timeB ? 0 : timeA < timeB ? -1 : 1;
    }
    function sortMMDDStr(a, b) {
      return sortDateStr(a, b, false);
    }
    function sortDDMMStr(a, b) {
      return sortDateStr(a, b, true);
    }
    function sortDateStr(a, b, isDDMM) {
      var dateA = getStrDate(a, isDDMM);
      var dateB = getStrDate(b, isDDMM);
      return dateA === dateB ? 0 : dateA < dateB ? -1 : 1;
    }
    function getStrDate(dateStr, isDDMM) {
      var m;
      var d;
      var y;
      var date = '';
      var mtch = dateStr.match(dateRE);
      if (mtch) {
        y = mtch[3];
        d = isDDMM ? mtch[1] : mtch[2];
        m = isDDMM ? mtch[2] : mtch[1];
        if (m.length === 1) {
          m = '0' + m;
        }
        if (d.length === 1) {
          d = '0' + d;
        }
        date = y + m + d;
      }
      return date;
    }
    function sortData(unwrappedData, sortInfo) {
      // grab the metadata for the rest of the logic
      var col = sortInfo.column;
      //see if we already figured out what to use to sort the column
      var sortFn = colSortFnCache.get(col);
      if (!sortFn) {
        if (col.sortingAlgorithm !== undefined) {
          sortFn = col.sortingAlgorithm;
          colSortFnCache.set(col, col.sortingAlgorithm);
        } else {
          // try and guess what sort function to use
          var item = unwrappedData[0];
          if (!item) {
            return;
          }
          sortFn = guessSortFn(item[col.field]);
          //cache it
          if (sortFn) {
            colSortFnCache.set(col, sortFn);
          } else {
            // we assign the alpha sort because anything that is null/undefined will never get passed to
            // the actual sorting function. It will get caught in our null check and returned to be sorted
            // down to the bottom
            sortFn = sortAlpha;
          }
        }
      }
      //now actually sort the data
      unwrappedData.sort(function (itemA, itemB) {
        var propA = configuration.evalProperty(itemA, col.field);
        var propB = configuration.evalProperty(itemB, col.field);
        // Empty values will be displayed at the top
        var propAIsEmpty = !utils.hasValue(propA);
        var propBIsEmpty = !utils.hasValue(propB);
        if (propBIsEmpty) {
          return propAIsEmpty ? 0 : 1;
        } else if (propAIsEmpty) {
          return -1;
        }
        //made it this far, we don't have to worry about null & undefined
        var val = sortFn(propA, propB);
        if (sortInfo.direction === SortDirection.Ascending) {
          return val;
        } else {
          return 0 - val;
        }
      });
    }
    var sortService = {
      sort: function sort(data, sortInfo) {
        var unwrappedData = ko.unwrap(data);
        // first make sure we are even supposed to do work
        if (!unwrappedData || !sortInfo) {
          return;
        }
        if (Array.isArray(sortInfo)) {
          for (var i = sortInfo.length - 1; i >= 0; i--) {
            sortData(unwrappedData, sortInfo[i]);
          }
        } else {
          sortData(unwrappedData, sortInfo);
        }
        data(unwrappedData);
      },
      sortNumber: sortNumber
    };

    function styleProvider(grid) {
      return {
        canvasStyle: ko.pureComputed(function () {
          return {
            height: grid.maxCanvasHt().toString() + 'px'
          };
        }),
        headerScrollerStyle: ko.pureComputed(function () {
          return {
            height: grid.config.headerRowHeight + 'px'
          };
        }),
        topPanelStyle: ko.pureComputed(function () {
          return {
            width: grid.rootDim.outerWidth() + 'px',
            height: grid.topPanelHeight + 'px'
          };
        }),
        headerStyle: ko.pureComputed(function () {
          return {
            width: grid.viewportDimWidth() + 'px',
            height: grid.config.headerRowHeight + 'px'
          };
        }),
        fixedHeaderStyle: ko.pureComputed(function () {
          return {
            width: grid.fixedViewportDimWidth() + 'px',
            height: grid.config.headerRowHeight + 'px'
          };
        }),
        groupPanelStyle: ko.pureComputed(function () {
          return {
            width: grid.rootDim.outerWidth() + 'px',
            height: grid.config.headerRowHeight + 'px'
          };
        }),
        viewportPanelStyle: ko.pureComputed(function () {
          return {
            width: grid.rootDim.outerWidth() + 'px',
            height: grid.viewportDimHeight() + 'px'
          };
        }),
        viewportStyle: ko.pureComputed(function () {
          return {
            width: grid.viewportDimWidth() + 'px',
            height: grid.viewportDimHeight() + 'px'
          };
        }),
        fixedViewportStyle: ko.pureComputed(function () {
          return {
            width: grid.fixedViewportDimWidth() + 'px',
            height: grid.viewportDimHeight() + 'px'
          };
        }),
        footerStyle: ko.pureComputed(function () {
          return {
            width: grid.rootDim.outerWidth() + 'px',
            height: grid.config.footerRowHeight + 'px'
          };
        })
      };
    }

    var DefaultAggregationProvider = /*#__PURE__*/function () {
      function DefaultAggregationProvider(getAllEntities, getDataForAggregatesAsync) {
        _classCallCheck(this, DefaultAggregationProvider);
        this.getAllEntities = getAllEntities;
        this.getDataForAggregatesAsync = getDataForAggregatesAsync;
      }
      _createClass(DefaultAggregationProvider, [{
        key: "calculateAggregationsAsync",
        value: function calculateAggregationsAsync(aggregation, group) {
          return new Promise(function ($return, $error) {
            var entities, data, results, total;
            entities = !group ? this.getAllEntities() : group.flattenChildren();
            return Promise.resolve(this.getValuesAsync(entities, aggregation)).then(function ($await_1) {
              try {
                data = $await_1;
                results = [];
                if (aggregation.operations.includes(AggregateOperation.Total)) {
                  total = calculateTotal(data);
                  results.push({
                    field: aggregation.field,
                    group: group,
                    operation: AggregateOperation.Total,
                    result: total
                  });
                }
                if (aggregation.operations.includes(AggregateOperation.Average)) {
                  results.push({
                    field: aggregation.field,
                    group: group,
                    operation: AggregateOperation.Average,
                    result: calculateAverage(data, total)
                  });
                }
                return $return(results);
              } catch ($boundEx) {
                return $error($boundEx);
              }
            }, $error);
          }.bind(this));
        }
      }, {
        key: "getValuesAsync",
        value: function getValuesAsync(entities, aggregation) {
          var _this = this;
          var getDataPromises = entities.map(function (entity) {
            return new Promise(function ($return, $error) {
              var value;
              return Promise.resolve(_this.getDataForAggregatesAsync(entity, aggregation.field)).then(function ($await_2) {
                try {
                  value = $await_2;
                  return $return(typeof value === 'number' ? value : 0);
                } catch ($boundEx) {
                  return $error($boundEx);
                }
              }, $error);
            });
          });
          return Promise.all(getDataPromises);
        }
      }]);
      return DefaultAggregationProvider;
    }();
    function calculateAverage(data, total) {
      if (total === undefined) {
        total = calculateTotal(data);
      }
      return total / data.length;
    }
    function calculateTotal(data) {
      var result = 0;
      data.forEach(function (value) {
        result += value;
      });
      return result;
    }
    var Aggregation = /*#__PURE__*/function () {
      function Aggregation(field) {
        _classCallCheck(this, Aggregation);
        this.field = field;
        this.operations = [];
      }
      _createClass(Aggregation, [{
        key: "addOperation",
        value: function addOperation(operation) {
          if (this.operations.indexOf(operation) === -1) {
            this.operations.push(operation);
          }
        }
      }, {
        key: "removeOperation",
        value: function removeOperation(operation) {
          var operationIndex = this.operations.indexOf(operation);
          if (operationIndex !== -1) {
            this.operations.splice(operationIndex, 1);
          }
        }
      }]);
      return Aggregation;
    }();

    var AggregationService = /*#__PURE__*/function () {
      function AggregationService(grid, aggregationProvider) {
        _classCallCheck(this, AggregationService);
        this.grid = grid;
        this.aggregationPromises = new Map();
        this.aggregationGroupPromises = new Map();
        this.aggregationProvider = aggregationProvider;
        this.aggregateConfig = [];
        this.aggregatingFields = ko.observableArray();
      }
      _createClass(AggregationService, [{
        key: "isAggregating",
        value: function isAggregating(field, operation) {
          var key = getAggregatePromiseKey(field, operation);
          return this.aggregatingFields().includes(key);
        }
      }, {
        key: "addAggregateColumnAsync",
        value: function addAggregateColumnAsync(field, operation) {
          return new Promise(function ($return, $error) {
            var aggregation, key;
            aggregation = this.getOrCreateAggregation(field);
            aggregation.addOperation(operation);
            key = getAggregatePromiseKey(field, operation);
            if (this.aggregatingFields.indexOf(key) === -1) {
              this.aggregatingFields.push(key);
            }
            this.onAggregationConfigChanged(field);
            return Promise.resolve(Promise.all([this.calculateGridAggregationsAsync(aggregation), this.calculateGroupAggregationsAsync(aggregation)])).then(function ($await_2) {
              try {
                return $return();
              } catch ($boundEx) {
                return $error($boundEx);
              }
            }, $error);
          }.bind(this));
        }
      }, {
        key: "refreshGridAggregatesAsync",
        value: function refreshGridAggregatesAsync() {
          return new Promise(function ($return, $error) {
            var _this, calculateGridAggregationsPromises;
            _this = this;
            this.clearGridAggregationResults();
            calculateGridAggregationsPromises = this.aggregateConfig.map(function (aggregation) {
              return _this.calculateGridAggregationsAsync(aggregation);
            });
            return Promise.resolve(Promise.all(calculateGridAggregationsPromises)).then(function ($await_3) {
              try {
                return $return();
              } catch ($boundEx) {
                return $error($boundEx);
              }
            }, $error);
          }.bind(this));
        }
      }, {
        key: "refreshGroupAggregatesAsync",
        value: function refreshGroupAggregatesAsync() {
          return new Promise(function ($return, $error) {
            var _this2, calculateGroupAggregationsPromises;
            _this2 = this;
            this.clearGroupAggregationResults();
            calculateGroupAggregationsPromises = this.aggregateConfig.map(function (aggregation) {
              return _this2.calculateGroupAggregationsAsync(aggregation);
            });
            return Promise.resolve(Promise.all(calculateGroupAggregationsPromises)).then(function ($await_4) {
              try {
                return $return();
              } catch ($boundEx) {
                return $error($boundEx);
              }
            }, $error);
          }.bind(this));
        }
      }, {
        key: "calculateGridAggregationsAsync",
        value: function calculateGridAggregationsAsync(aggregation) {
          return new Promise(function ($return, $error) {
            var _this3, aggregationPromise, field, newResults, currentAggregation, validAggregationResults;
            _this3 = this;
            aggregationPromise = this.aggregationProvider.calculateAggregationsAsync(aggregation);
            field = aggregation.field;
            aggregation.operations.forEach(function (operation) {
              _this3.aggregationPromises.set(getAggregatePromiseKey(field, operation), aggregationPromise);
            });
            return Promise.resolve(aggregationPromise).then(function ($await_5) {
              try {
                newResults = $await_5;
                currentAggregation = this.aggregateConfig.find(function (aggregation) {
                  return aggregation.field === field;
                });
                if (currentAggregation) {
                  validAggregationResults = [];
                  newResults.forEach(function (aggregationResult) {
                    var key = getAggregatePromiseKey(aggregationResult.field, aggregationResult.operation);
                    var currentPromise = _this3.aggregationPromises.get(key);
                    if (currentPromise === aggregationPromise) {
                      _this3.aggregationPromises.delete(key);
                      validAggregationResults.push(aggregationResult);
                    }
                  });
                  if (validAggregationResults.length) {
                    this.grid.aggregateResults(this.grid.aggregateResults().concat(validAggregationResults));
                  }
                }
                return $return();
              } catch ($boundEx) {
                return $error($boundEx);
              }
            }.bind(this), $error);
          }.bind(this));
        }
      }, {
        key: "removeAggregateColumn",
        value: function removeAggregateColumn(field, operation) {
          var key = getAggregatePromiseKey(field, operation);
          this.aggregationPromises.delete(key);
          this.aggregationGroupPromises.delete(key);
          this.aggregatingFields.remove(key);
          var aggregationIndex = this.aggregateConfig.findIndex(function (a) {
            return a.field === field;
          });
          if (aggregationIndex !== -1) {
            var aggregation = this.aggregateConfig[aggregationIndex];
            aggregation.removeOperation(operation);
            if (aggregation.operations.length === 0) {
              this.aggregateConfig.splice(aggregationIndex, 1);
            }
            this.onAggregationConfigChanged(field, operation);
          }
        }
      }, {
        key: "toggleAggregateAsync",
        value: function toggleAggregateAsync(field, operation) {
          return new Promise(function ($return, $error) {
            var aggregation;
            aggregation = this.aggregateConfig.find(function (a) {
              return a.field === field && a.operations.includes(operation);
            });
            if (aggregation) {
              this.removeAggregateColumn(field, operation);
              return $If_1.call(this);
            } else {
              return Promise.resolve(this.addAggregateColumnAsync(field, operation)).then(function ($await_6) {
                try {
                  return $If_1.call(this);
                } catch ($boundEx) {
                  return $error($boundEx);
                }
              }.bind(this), $error);
            }
            function $If_1() {
              this.grid.trigger(GridEventType.SettingsChangedByUser, {
                aggregateInfos: this.aggregateConfig
              });
              return $return();
            }
          }.bind(this));
        }
      }, {
        key: "getOrCreateAggregation",
        value: function getOrCreateAggregation(field) {
          var aggregation = this.aggregateConfig.find(function (a) {
            return a.field === field;
          });
          if (aggregation) {
            return aggregation;
          }
          var result = new Aggregation(field);
          this.aggregateConfig.push(result);
          return result;
        }
      }, {
        key: "onAggregationConfigChanged",
        value: function onAggregationConfigChanged(field, operation) {
          var removeFunc = function removeFunc(r) {
            return r.field === field && (operation === undefined || operation === r.operation);
          };
          this.grid.aggregateResults.remove(removeFunc);
          this.grid.rowFactory.groupCache.forEach(function (group) {
            group.aggregateResults.remove(removeFunc);
          });
        }
      }, {
        key: "overrideAggregateInfosAsync",
        value: function overrideAggregateInfosAsync(aggregateInfos) {
          return new Promise(function ($return, $error) {
            var _this4, promises;
            _this4 = this;
            this.aggregateConfig.length = 0;
            this.clearGridAggregationResults();
            this.clearGroupAggregationResults();
            this.aggregatingFields.removeAll();
            promises = [];
            aggregateInfos.forEach(function (aggregateInfo) {
              aggregateInfo.operations.forEach(function (operation) {
                promises.push(_this4.addAggregateColumnAsync(aggregateInfo.field, operation));
              });
            });
            return Promise.resolve(Promise.all(promises)).then(function ($await_7) {
              try {
                return $return();
              } catch ($boundEx) {
                return $error($boundEx);
              }
            }, $error);
          }.bind(this));
        }
      }, {
        key: "clearGridAggregationResults",
        value: function clearGridAggregationResults() {
          this.grid.aggregateResults.removeAll();
          this.aggregationPromises.clear();
        }
      }, {
        key: "clearGroupAggregationResults",
        value: function clearGroupAggregationResults() {
          this.grid.rowFactory.groupCache.forEach(function (group) {
            group.aggregateResults.removeAll();
          });
          this.aggregationGroupPromises.clear();
        }
      }, {
        key: "calculateGroupAggregationsAsync",
        value: function calculateGroupAggregationsAsync(aggregation) {
          return new Promise(function ($return, $error) {
            var _this5, groupAggregationsPromises, allResults, currentAggregation, successfulAggregations;
            _this5 = this;
            groupAggregationsPromises = [];
            this.grid.rowFactory.groupCache.forEach(function (group) {
              var promise = _this5.aggregationProvider.calculateAggregationsAsync(aggregation, group);
              groupAggregationsPromises.push(promise);
            });
            aggregation.operations.forEach(function (operation) {
              _this5.aggregationGroupPromises.set(getAggregatePromiseKey(aggregation.field, operation), groupAggregationsPromises);
            });
            return Promise.resolve(Promise.all(groupAggregationsPromises)).then(function ($await_8) {
              try {
                allResults = $await_8;
                currentAggregation = this.aggregateConfig.find(function (aggregation) {
                  return aggregation.field === aggregation.field;
                });
                if (currentAggregation) {
                  successfulAggregations = new Set();
                  allResults.forEach(function (results) {
                    results.forEach(function (aggregationResult) {
                      var key = getAggregatePromiseKey(aggregationResult.field, aggregationResult.operation);
                      var currentPromises = _this5.aggregationGroupPromises.get(key);
                      if (currentPromises === groupAggregationsPromises) {
                        successfulAggregations.add(key);
                        var group = aggregationResult.group;
                        group.aggregateResults.push(aggregationResult);
                      }
                    });
                  });
                  successfulAggregations.forEach(function (key) {
                    _this5.aggregationGroupPromises.delete(key);
                  });
                }
                return $return();
              } catch ($boundEx) {
                return $error($boundEx);
              }
            }.bind(this), $error);
          }.bind(this));
        }
      }]);
      return AggregationService;
    }();
    function getAggregatePromiseKey(field, operation) {
      return field + operation;
    }

    var doubleClickDelay = 500;
    var Column = /*#__PURE__*/function () {
      function Column(config, grid) {
        _classCallCheck(this, Column);
        var colDef = config.colDef;
        this.grid = grid;
        this.clicks = 0;
        this.startMousePosition = 0;
        this.timer = undefined;
        this.eventTarget = undefined;
        this.colDef = colDef;
        this.field = colDef.field;
        this.fixed = colDef.fixed || false;
        this.fixedClass = getFixedClass(this.fixed);
        this.index = config.index;
        this.isGroupCol = !!config.isGroupCol;
        this.displayName = ko.observable(colDef.displayName || colDef.field);
        this.width = typeof colDef.width === 'number' ? colDef.width : 0;
        this.origWidth = this.width;
        this.minWidth = colDef.minWidth || 50;
        this.maxWidth = colDef.maxWidth || 9000;
        this.cellClass = getCellClass(colDef.cellClass, this.fixedClass);
        this.cellFilter = colDef.cellFilter;
        this.cellTemplate = colDef.cellTemplate;
        this.headerClass = getCellClass(colDef.headerClass, this.fixedClass);
        this.headerCellTemplate = colDef.headerCellTemplate || templates.defaultHeaderCellTemplate();
        this.groupIndex = ko.observable(-1);
        this.isGroupedBy = ko.pureComputed(this.readIsGroupedBy, this);
        this.groupedByClass = ko.pureComputed(this.readGroupedByClass, this);
        this._visible = ko.observable(colDef.visible !== false);
        this.visible = ko.pureComputed({
          read: this.readVisible,
          write: this.writeVisible,
          owner: this
        });
        this.sortable = !!config.enableSort && colDef.sortable !== false;
        this.sortDirection = ko.observable(SortDirection.Unspecified);
        this.sortingAlgorithm = colDef.sortFn;
        this.sortCallback = config.sortCallback;
        this.showSortButtonUp = ko.pureComputed(this.readShowSortButtonUp, this);
        this.showSortButtonDown = ko.pureComputed(this.readShowSortButtonDown, this);
        this.noSortVisible = ko.pureComputed(this.readNoSortVisible, this);
        this.resizable = !!config.enableResize && colDef.resizable !== false && (!grid.legacyMode || !this.fixed);
        this.resizeOnDataCallback = config.resizeOnDataCallback;
      }
      _createClass(Column, [{
        key: "getProperty",
        value: function getProperty(row) {
          var ret = row.getProperty(this.field);
          if (this.cellFilter) {
            ret = this.cellFilter(ret);
          }
          return ret;
        }
      }, {
        key: "toggleVisible",
        value: function toggleVisible(val) {
          var v = val == null ? !this._visible() : val;
          this._visible(v);
          domUtilityService.buildStyles(this.grid);
        }
      }, {
        key: "sort",
        value: function sort(data, event) {
          if (!this.sortable) {
            return true; // column sorting is disabled, do nothing
          }
          var dir = this.sortDirection() === SortDirection.Ascending ? SortDirection.Descending : SortDirection.Ascending;
          this.sortDirection(dir);
          if (this.sortCallback) {
            this.sortCallback(this, dir, !!(event && event.shiftKey));
          }
          return false;
        }
      }, {
        key: "gripClick",
        value: function gripClick(data, event) {
          var _this = this;
          event.stopPropagation();
          this.clicks++; //count clicks
          if (this.clicks === 1) {
            this.timer = window.setTimeout(function () {
              //Here you can add a single click action.
              _this.clicks = 0; //after action performed, reset counter
            }, doubleClickDelay);
          } else {
            clearTimeout(this.timer); //prevent single-click action
            if (this.resizeOnDataCallback) {
              this.resizeOnDataCallback(this); //perform double-click action
            }
            this.clicks = 0; //after action performed, reset counter
          }
        }
      }, {
        key: "gripOnMouseDown",
        value: function gripOnMouseDown(event) {
          event.stopPropagation();
          if (event.target.parentElement) {
            this.eventTarget = event.target.parentElement;
            if (this.eventTarget) {
              this.eventTarget.style.cursor = 'col-resize';
            }
            this.startMousePosition = event.clientX;
            this.origWidth = this.width;
            $(document).on('mousemove.kgColumn', this.onMouseMove.bind(this)).on('mouseup.kgColumn', this.gripOnMouseUp.bind(this));
          }
          return false;
        }
      }, {
        key: "onMouseMove",
        value: function onMouseMove(event) {
          event.stopPropagation();
          var diff = event.clientX - this.startMousePosition;
          var newWidth = diff + this.origWidth;
          this.width = newWidth < this.minWidth ? this.minWidth : newWidth > this.maxWidth ? this.maxWidth : newWidth;
          domUtilityService.buildStyles(this.grid);
          return false;
        }
      }, {
        key: "gripOnMouseUp",
        value: function gripOnMouseUp(event) {
          event.stopPropagation();
          $(document).off('mousemove.kgColumn mouseup.kgColumn');
          var htmlTarget = this.eventTarget;
          if (htmlTarget) {
            htmlTarget.style.cursor = this.sortable ? 'pointer' : 'default';
            this.eventTarget = undefined;
            this.grid.trigger(GridEventType.ColumnWidthsChanged, [this]);
            this.grid.trigger(GridEventType.SettingsChangedByUser, {
              columnDefs: this.grid.settings().columnDefs
            });
          }
          return false;
        }
      }, {
        key: "readIsGroupedBy",
        value: function readIsGroupedBy() {
          return this.groupIndex() !== -1;
        }
      }, {
        key: "readGroupedByClass",
        value: function readGroupedByClass() {
          return this.isGroupedBy() ? 'kgGroupedByIcon' : 'kgGroupIcon';
        }
      }, {
        key: "readNoSortVisible",
        value: function readNoSortVisible() {
          return !this.sortDirection();
        }
      }, {
        key: "readShowSortButtonDown",
        value: function readShowSortButtonDown() {
          return this.sortable && this.sortDirection() === SortDirection.Descending;
        }
      }, {
        key: "readShowSortButtonUp",
        value: function readShowSortButtonUp() {
          return this.sortable && this.sortDirection() === SortDirection.Ascending;
        }
      }, {
        key: "readVisible",
        value: function readVisible() {
          return this._visible();
        }
      }, {
        key: "writeVisible",
        value: function writeVisible(val) {
          this.toggleVisible(val);
        }
      }]);
      return Column;
    }();
    function getCellClass(cellClass, fixedClass) {
      return cellClass ? cellClass + ' ' + fixedClass : fixedClass;
    }
    function getFixedClass(fixed) {
      return fixed ? 'kgFixedColumn' : 'kgNonFixedColumn';
    }

    var defaults = {
      canSelectRows: returnTrue,
      enableColumnResize: returnTrue,
      enableSorting: returnTrue,
      evalPropertyForGroup: returnUndefined,
      footerRowHeight: function footerRowHeight() {
        return 55;
      },
      headerRowHeight: function headerRowHeight() {
        return 30;
      },
      rowReorderingHandle: returnUndefined,
      rowReorderingMode: returnUndefined,
      tabIndex: function tabIndex() {
        return -1;
      },
      useExternalSorting: returnFalse
    };
    var filterOptionsDefaults = {
      filterThrottle: returnUndefined,
      useExternalFilter: returnFalse
    };
    var pagingOptionsDefaults = {
      currentPage: function currentPage() {
        return ko.observable(1);
      },
      pageSize: function pageSize() {
        return ko.observable(250);
      },
      pageSizes: function pageSizes() {
        return ko.observableArray([250, 500, 1000]);
      },
      totalServerItems: function totalServerItems() {
        return ko.observable(0);
      }
    };
    function mergeWithDefaults(options, defaults) {
      var result = {};
      Object.keys(defaults).forEach(function (key) {
        var value = options && options[key];
        result[key] = value != null ? value : defaults[key]();
      });
      return result;
    }
    function returnFalse() {
      return false;
    }
    function returnUndefined() {
      return undefined;
    }
    function returnTrue() {
      return true;
    }
    function getGridConfig(options) {
      var result = mergeWithDefaults(options, defaults);
      result.filterOptions = mergeWithDefaults(options.filterOptions, filterOptionsDefaults);
      result.footerRowHeight = options.footerVisible !== false ? result.footerRowHeight : 0;
      return result;
    }
    function getPagingOptions(options) {
      return mergeWithDefaults(options.pagingOptions, pagingOptionsDefaults);
    }

    var namespaceDelimiter = '.';
    var MessageBus = /*#__PURE__*/function () {
      function MessageBus() {
        _classCallCheck(this, MessageBus);
        this.subscriptions = new Map();
      }
      _createClass(MessageBus, [{
        key: "publish",
        value: function publish(messageType, data) {
          var namespace = getMessageTypeNamespace(messageType);
          if (namespace) {
            var _messageHandlers$get;
            var messageTypePrefix = getMessageTypeWithoutNamespace(messageType);
            var messageHandlers = this.subscriptions.get(messageTypePrefix);
            messageHandlers === null || messageHandlers === void 0 ? void 0 : (_messageHandlers$get = messageHandlers.get(namespace)) === null || _messageHandlers$get === void 0 ? void 0 : _messageHandlers$get.forEach(function (handler) {
              return handler(data);
            });
          } else {
            var _messageHandlers = this.subscriptions.get(messageType);
            _messageHandlers === null || _messageHandlers === void 0 ? void 0 : _messageHandlers.forEach(function (h) {
              return h.forEach(function (handler) {
                return handler(data);
              });
            });
          }
        }
      }, {
        key: "subscribe",
        value: function subscribe(messageType, messageHandler) {
          var messageTypePrefix = getMessageTypeWithoutNamespace(messageType);
          var messageHandlers = this.subscriptions.get(messageTypePrefix);
          if (!messageHandlers) {
            messageHandlers = new Map();
            this.subscriptions.set(messageTypePrefix, messageHandlers);
          }
          var namespace = getMessageTypeNamespace(messageType);
          var messageHandlersOfNamespace = messageHandlers.get(namespace);
          if (!messageHandlersOfNamespace) {
            messageHandlersOfNamespace = [];
            messageHandlers.set(namespace, messageHandlersOfNamespace);
          }
          messageHandlersOfNamespace.push(messageHandler);
        }
      }, {
        key: "unsubscribe",
        value: function unsubscribe(messageType, messageHandler) {
          var namespace = getMessageTypeNamespace(messageType);
          if (namespace) {
            var messageTypePrefix = getMessageTypeWithoutNamespace(messageType);
            var messageHandlers = this.subscriptions.get(messageTypePrefix);
            var messageHandlersOfNamespace = messageHandlers === null || messageHandlers === void 0 ? void 0 : messageHandlers.get(namespace);
            if (messageHandlersOfNamespace) {
              if (messageHandler) {
                removeAllMessageHandlers(messageHandlersOfNamespace, messageHandler);
              } else {
                messageHandlers === null || messageHandlers === void 0 ? void 0 : messageHandlers.delete(namespace);
              }
            }
          } else {
            var _messageHandlers2 = this.subscriptions.get(messageType);
            if (messageHandler) {
              _messageHandlers2 === null || _messageHandlers2 === void 0 ? void 0 : _messageHandlers2.forEach(function (messageHandlersOfNamespace) {
                removeAllMessageHandlers(messageHandlersOfNamespace, messageHandler);
              });
            } else {
              this.subscriptions.delete(messageType);
            }
          }
        }
      }]);
      return MessageBus;
    }();
    function removeAllMessageHandlers(messageHandlers, messageHandler) {
      var index = -1;
      do {
        index = messageHandlers.indexOf(messageHandler);
        if (index >= 0) {
          messageHandlers.splice(index, 1);
        }
      } while (index !== -1);
    }
    function getMessageTypeNamespace(messageType) {
      var indexNamespaceDelimiter = messageType.indexOf(namespaceDelimiter);
      return indexNamespaceDelimiter !== -1 ? messageType.substring(indexNamespaceDelimiter) : '';
    }
    function getMessageTypeWithoutNamespace(messageType) {
      var indexNamespaceDelimiter = messageType.indexOf(namespaceDelimiter);
      return indexNamespaceDelimiter !== -1 ? messageType.substring(0, indexNamespaceDelimiter) : messageType;
    }

    var Range = /*#__PURE__*/_createClass(function Range(top, bottom) {
      _classCallCheck(this, Range);
      this.topRow = top;
      this.bottomRow = bottom;
    });

    var Group = /*#__PURE__*/function () {
      function Group(groupEntity, grid) {
        _classCallCheck(this, Group);
        this.entity = groupEntity;
        this.grid = grid;
        this.aggregateResults = ko.observableArray();
        this.groupChildren = groupEntity.groupChildren;
        this.groupClass = ko.pureComputed(this.readGroupClass, this);
        this.children = groupEntity.children;
        this.collapsed = ko.observable(true);
        this.column = groupEntity.column;
        this.depth = groupEntity.depth;
        this.isGroupRow = true;
        this.isEven = ko.observable(false);
        this.isOdd = ko.observable(false);
        this.label = groupEntity.label;
        this.offsetLeft = (groupEntity.depth * 25).toString() + 'px';
        this.offsetTop = ko.observable('0px');
        this.parent = groupEntity.parent;
        this.isSelected = ko.pureComputed(this.readIsSelected, this);
        this.isFullySelected = ko.pureComputed(this.readIsFullySelected, this);
        this.firstChild = ko.pureComputed(this.readFirstChild, this);
        this.selectedChildren = ko.pureComputed(this.readSelectedChildren, this);
        this.totalChildren = ko.pureComputed(this.readTotalChildren, this);
      }
      _createClass(Group, [{
        key: "toggleExpand",
        value: function toggleExpand() {
          this.grid.trigger(GridEventType.GroupToggleStarted, this);
          this.setExpand(!this.collapsed());
        }
      }, {
        key: "toggleSelected",
        value: function toggleSelected(data, event) {
          if (this.grid.selectionService.canSelectRows) {
            this.grid.selectionService.changeSelection(this, event);
          }
          return true;
        }
      }, {
        key: "flattenChildren",
        value: function flattenChildren() {
          return _flattenChildren(this);
        }
      }, {
        key: "notifyChildren",
        value: function notifyChildren() {
          var collapsed = this.collapsed();
          var rowFactory = this.grid.rowFactory;
          this.groupChildren.forEach(function (child) {
            rowFactory.setHidden(child.entity, collapsed);
            if (collapsed) {
              child.setExpand(collapsed);
            }
          });
          this.children.forEach(function (child) {
            rowFactory.setHidden(child, collapsed);
          });
          rowFactory.rowCache = [];
          rowFactory.renderedChange();
        }
      }, {
        key: "readGroupClass",
        value: function readGroupClass() {
          return this.collapsed() ? 'kgGroupArrowCollapsed ' + configuration.css.groupCollapsedClass : 'kgGroupArrowExpanded ' + configuration.css.groupExpandedClass;
        }
      }, {
        key: "readFirstChild",
        value: function readFirstChild() {
          if (this.children.length > 0) {
            return this.children[0];
          }
          for (var i = 0; i < this.groupChildren.length; i++) {
            var result = this.groupChildren[i].firstChild();
            if (result) {
              return result;
            }
          }
          return undefined;
        }
      }, {
        key: "readIsFullySelected",
        value: function readIsFullySelected() {
          return this.selectedChildren() === this.totalChildren();
        }
      }, {
        key: "readIsSelected",
        value: function readIsSelected() {
          return this.selectedChildren() > 0;
        }
      }, {
        key: "readSelectedChildren",
        value: function readSelectedChildren() {
          var result = 0;
          this.groupChildren.forEach(function (groupChild) {
            result += groupChild.selectedChildren();
          });
          var selectionService = this.grid.selectionService;
          this.children.forEach(function (child) {
            if (selectionService.isSelected(child)) {
              result++;
            }
          });
          return result;
        }
      }, {
        key: "readTotalChildren",
        value: function readTotalChildren() {
          return totalChildren(this);
        }
      }, {
        key: "setExpand",
        value: function setExpand(state) {
          this.collapsed(state);
          this.notifyChildren();
        }
      }], [{
        key: "isGroupRow",
        value: function isGroupRow(row) {
          return row.isGroupRow;
        }
      }]);
      return Group;
    }();
    function _flattenChildren(group) {
      var result = group.children;
      group.groupChildren.forEach(function (groupChild) {
        result = result.concat(_flattenChildren(groupChild));
      });
      return result;
    }
    function totalChildren(group) {
      var result = group.children.length;
      group.groupChildren.forEach(function (groupChild) {
        result += totalChildren(groupChild);
      });
      return result;
    }

    var Row = /*#__PURE__*/function () {
      function Row(entity, selectionService) {
        _classCallCheck(this, Row);
        this.canSelectRows = selectionService.canSelectRows;
        this.entity = entity;
        this.selectionService = selectionService;
        this.isSelected = ko.pureComputed(this.readIsSelected, this);
        this.rowIndex = ko.observable(0);
        this.offsetTop = ko.observable('0px');
        this.isGroupRow = false;
        this.isEven = ko.pureComputed(this.readIsEven, this);
        this.isOdd = ko.pureComputed(this.readIsOdd, this);
        this.propertyCache = {};
      }
      _createClass(Row, [{
        key: "getProperty",
        value: function getProperty(path) {
          return this.propertyCache[path] || (this.propertyCache[path] = configuration.evalProperty(this.entity, path));
        }
      }, {
        key: "toggleSelected",
        value: function toggleSelected(data, event) {
          if (this.canSelectRows) {
            this.selectionService.changeSelection(this, event);
          }
          return true;
        }
      }, {
        key: "readIsEven",
        value: function readIsEven() {
          return this.rowIndex() % 2 === 0;
        }
      }, {
        key: "readIsOdd",
        value: function readIsOdd() {
          return this.rowIndex() % 2 !== 0;
        }
      }, {
        key: "readIsSelected",
        value: function readIsSelected() {
          return this.selectionService.isSelected(this.entity);
        }
      }]);
      return Row;
    }();

    var _isGroupEntity = Symbol('isGroupEntity');
    var RowFactory = /*#__PURE__*/function () {
      function RowFactory(grid) {
        _classCallCheck(this, RowFactory);
        this.grid = grid;
        this.groupCache = [];
        this.groupedData = undefined;
        this.numberOfGroups = 0;
        this.parsedData = [];
        this._renderedRange = new Range(0, grid.minRowsToRender() + EXCESS_ROWS);
        // we cache rows when they are built, and then blow the cache away when sorting
        this.rowCache = [];
        this.hiddenEntities = new WeakSet();
      }
      _createClass(RowFactory, [{
        key: "renderedRange",
        get: function get() {
          return this._renderedRange;
        }
      }, {
        key: "filteredDataChanged",
        value: function filteredDataChanged() {
          var grid = this.grid;
          var filteredData = grid.filteredData();
          this.rowCache = rebuildRowCache(this.rowCache, filteredData, this._renderedRange);
          var groups = grid.configGroups();
          if (groups.length > 0) {
            this.getGrouping(groups);
          } else if (this.groupedData) {
            this.clearGrouping();
          }
          this.updateViewableRange(this._renderedRange);
        }
      }, {
        key: "isGroupEntity",
        value: function isGroupEntity(entity) {
          return !!entity[_isGroupEntity];
        }
      }, {
        key: "renderedChange",
        value: function renderedChange() {
          var _this = this;
          if (!this.groupedData) {
            this.renderedChangeNoGroups();
            this.grid.refreshDomSizes();
            return;
          }
          var dataArray = this.parsedData.filter(function (e) {
            return !_this.hiddenEntities.has(e);
          }).slice(this._renderedRange.topRow, this._renderedRange.bottomRow);
          var rowArr = dataArray.map(function (item, indx) {
            var row;
            if (_this.isGroupEntity(item)) {
              row = _this.buildGroupRow(item, _this._renderedRange.topRow + indx);
            } else {
              row = _this.buildEntityRow(item, _this._renderedRange.topRow + indx);
            }
            return row;
          });
          this.grid.renderedRows(rowArr);
          this.grid.refreshDomSizes();
        }
      }, {
        key: "rowEntities",
        value: function rowEntities() {
          return this.groupedData ? this.parsedData : this.grid.filteredData();
        }
      }, {
        key: "setHidden",
        value: function setHidden(entity, isHidden) {
          if (isHidden) {
            this.hiddenEntities.add(entity);
          } else {
            this.hiddenEntities.delete(entity);
          }
        }
      }, {
        key: "updateViewableRange",
        value: function updateViewableRange(newRange) {
          this._renderedRange = newRange;
          this.renderedChange();
        }
      }, {
        key: "visibleRowCount",
        value: function visibleRowCount() {
          var _this2 = this;
          return this.groupedData ? this.parsedData.filter(function (e) {
            return !_this2.hiddenEntities.has(e);
          }).length : this.grid.filteredData().length;
        }
      }, {
        key: "buildGroupRow",
        value: function buildGroupRow(groupEntity, rowIndex) {
          var grid = this.grid;
          var group = this.groupCache[groupEntity.groupIndex]; // first check to see if we've already built it
          if (!group) {
            // build the row
            group = new Group(groupEntity, grid);
            this.groupCache[groupEntity.groupIndex] = group;
          }
          group.offsetTop((grid.rowHeight * rowIndex).toString() + 'px');
          return group;
        }

        // Builds rows for each data item in the 'filteredData'
        // @entity - the data item
        // @rowIndex - the index of the row
      }, {
        key: "buildEntityRow",
        value: function buildEntityRow(entity, rowIndex) {
          var grid = this.grid;
          var row = this.rowCache[rowIndex]; // first check to see if we've already built it
          if (!row) {
            // build the row
            row = new Row(entity, grid.selectionService);
            row.rowIndex(rowIndex + 1); //not a zero-based rowIndex
            row.offsetTop((grid.rowHeight * rowIndex).toString() + 'px');
            // finally cache it for the next round
            this.rowCache[rowIndex] = row;
          }
          return row;
        }
      }, {
        key: "clearGrouping",
        value: function clearGrouping() {
          this.groupCache = [];
          this.groupedData = undefined;
          this.hiddenEntities = new WeakSet();
          this.parsedData.length = 0;
          this.numberOfGroups = 0;
        }

        //Shuffle the data into their respective groupings.
      }, {
        key: "getGrouping",
        value: function getGrouping(groups) {
          var grid = this.grid;
          this.groupCache = [];
          this.rowCache = [];
          this.numberOfGroups = 0;
          createGroupColumns(grid, groups);
          this.groupedData = splitDataIntoGroups(grid, groups, this.hiddenEntities);
          this.parsedData.length = 0;
          this.parseGroupData(this.groupedData, []);
          grid.aggregationService.refreshGroupAggregatesAsync();
        }

        //recurse through the groupData tree and create the appropriate row nodes. Row for leaf and Group for branches
      }, {
        key: "parseGroupData",
        value: function parseGroupData(group, parentCache) {
          var _this3 = this;
          if (group.entities) {
            group.entities.forEach(function (item) {
              // get the last parent in the array because that's where our children want to be
              parentCache[parentCache.length - 1].children.push(item);
              //add the row to our return array
              _this3.parsedData.push(item);
            });
          } else {
            group.valueGroups.forEach(function (value, key) {
              //build the Group row
              var groupEntity = _defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty({}, _isGroupEntity, true), "column", group.column), "label", utils.hasValue(key) ? key.toString() : 'null'), "depth", group.depth), "children", []), "groupChildren", []), "groupIndex", _this3.numberOfGroups);
              var groupRow = _this3.buildGroupRow(groupEntity, 0);
              _this3.numberOfGroups++;
              //set the Group parent to the parent in the array that is one less deep.
              groupRow.parent = parentCache[groupRow.depth - 1];
              // if we have a parent, set the parent to not be collapsed and append the current group to its children
              if (groupRow.parent) {
                groupRow.parent.collapsed(false);
                groupRow.parent.groupChildren.push(groupRow);
              }
              // add the Group row to the parsed data.
              _this3.parsedData.push(groupRow.entity);
              // the current Group now the parent of the current depth
              parentCache[groupRow.depth] = groupRow;
              // dig deeper for more Groups or children.
              _this3.parseGroupData(value, parentCache);
            });
          }
        }
      }, {
        key: "renderedChangeNoGroups",
        value: function renderedChangeNoGroups() {
          var _this4 = this;
          var rowArr = [];
          var dataArr = this.grid.filteredData.slice(this._renderedRange.topRow, this._renderedRange.bottomRow);
          dataArr.forEach(function (item, i) {
            var row = _this4.buildEntityRow(item, _this4._renderedRange.topRow + i);
            //add the row to our return array
            rowArr.push(row);
          });
          this.grid.renderedRows(rowArr);
        }
      }]);
      return RowFactory;
    }(); // Limiting to the rendered range is sufficient for preventing repaint of the current viewport
    function rebuildRowCache(rowCache, filteredData, renderedRange) {
      var result = [];
      if (rowCache.length && filteredData.length) {
        var length = Math.min(rowCache.length, renderedRange.bottomRow);
        length = Math.min(length, filteredData.length);
        for (var i = renderedRange.topRow; i < length; i++) {
          var row = rowCache[i];
          if (row) {
            if (row.entity === filteredData[i]) {
              result[i] = row;
            } else {
              break;
            }
          }
        }
      }
      return result;
    }
    function createGroupColumns(grid, groups) {
      var cols = grid.columns();
      var maxDepth = groups.length;
      var groupColOffset = grid.groupColOffset();
      var hasAddedGroup = false;
      groups.forEach(function (group, depth) {
        if (!cols[depth + groupColOffset].isGroupCol && depth <= maxDepth) {
          var cellClass = depth > 1 ? 'kgGroupColumn--tail' : 'kgGroupColumn--head';
          var columnConfig = {
            colDef: {
              field: '',
              width: 25,
              sortable: false,
              resizable: false,
              headerCellTemplate: '<div class="kgGroupHeader"></div>',
              visible: depth > 0,
              cellClass: cellClass,
              headerClass: cellClass
            },
            isGroupCol: true,
            index: 0
          };
          cols.splice(groupColOffset, 0, new Column(columnConfig, grid));
          hasAddedGroup = true;
        }
      });
      grid.fixColumnIndexes();
      if (hasAddedGroup) {
        grid.columns.valueHasMutated();
      }
      domUtilityService.buildStyles(grid);
    }
    function splitDataIntoGroups(grid, groups, hiddenEntities) {
      var data = grid.filteredData();
      var cols = grid.columns();
      var evalPropertyForGroup = grid.config.evalPropertyForGroup;
      var groupedData = {
        depth: 0,
        valueGroups: new Map()
      };
      data.forEach(function (item) {
        hiddenEntities.add(item);
        var currentGroup = groupedData;
        groups.forEach(function (group, depth) {
          var field = group.field;
          var col = cols.find(function (c) {
            return c.field === field;
          });
          var val = evalPropertyForGroup ? evalPropertyForGroup(item, col.colDef) : configuration.evalProperty(item, field);
          if (col.cellFilter) {
            val = col.cellFilter(val);
          }
          val = utils.hasValue(val) ? val : undefined;
          var childGroup = currentGroup.valueGroups.get(val);
          if (!childGroup) {
            childGroup = {
              depth: 0,
              valueGroups: new Map()
            };
            currentGroup.valueGroups.set(val, childGroup);
          }
          if (!currentGroup.field) {
            currentGroup.field = field;
          }
          if (!currentGroup.depth) {
            currentGroup.depth = depth;
          }
          if (!currentGroup.column) {
            currentGroup.column = col;
          }
          currentGroup = childGroup;
        });
        if (!currentGroup.entities) {
          currentGroup.entities = [];
        }
        currentGroup.entities.push(item);
      });
      return groupedData;
    }

    var SearchProvider = /*#__PURE__*/function () {
      function SearchProvider(grid) {
        _classCallCheck(this, SearchProvider);
        this.grid = grid;
        this.fieldMap = new Map();
        this.searchConditions = [];
        this.lastSearchStr = '';
        var filterOptions = this.grid.config.filterOptions;
        this.filterTextComputed = ko.computed(this.processFilterText, this);
        if (filterOptions.filterThrottle != null) {
          this.filterTextComputed.extend({
            throttle: filterOptions.filterThrottle
          });
        }
        if (!filterOptions.useExternalFilter) {
          this.grid.columns.subscribe(this.gridColumnsSubscription, this);
        }
      }
      _createClass(SearchProvider, [{
        key: "evalFilter",
        value: function evalFilter() {
          var _this = this;
          if (this.searchConditions.length === 0) {
            this.grid.filteredData(this.grid.sortedData.peek().filter(function (item) {
              return item && !item._destroy;
            }));
          } else {
            this.grid.filteredData(this.grid.sortedData.peek().filter(function (item) {
              if (!item || item._destroy) {
                return false;
              }
              for (var i = 0, len = _this.searchConditions.length; i < len; i++) {
                var condition = _this.searchConditions[i];
                //Search entire row
                if (!condition.column) {
                  for (var prop in item) {
                    if (item.hasOwnProperty(prop)) {
                      var pVal = ko.unwrap(item[prop]);
                      if (pVal && condition.regex.test(pVal.toString())) {
                        return true;
                      }
                    }
                  }
                  return false;
                }
                //Search by column.
                var field = ko.unwrap(item[condition.column]);
                if (!field && condition.columnDisplay) {
                  var column = _this.fieldMap.get(condition.columnDisplay);
                  field = column && ko.unwrap(item[column]);
                }
                if (!field || !condition.regex.test(field.toString())) {
                  return false;
                }
              }
              return true;
            }));
          }
          this.grid.rowFactory.filteredDataChanged();
        }
      }, {
        key: "processFilterText",
        value: function processFilterText() {
          if (!this.grid.config.filterOptions.useExternalFilter) {
            var filterText = this.grid.filterText().trim();
            if (filterText !== this.lastSearchStr) {
              //To prevent circular dependency when throttle is enabled.
              this.lastSearchStr = filterText;
              this.buildSearchConditions(filterText);
              this.evalFilter();
            }
          }
        }
      }, {
        key: "buildSearchConditions",
        value: function buildSearchConditions(filterText) {
          var _this2 = this;
          //reset.
          this.searchConditions = [];
          if (!filterText) {
            return;
          }
          var columnFilters = filterText.split(';');
          columnFilters.forEach(function (filter) {
            var args = filter.split(':');
            if (args.length > 1) {
              var columnName = args[0].trim();
              var columnValue = args[1].trim();
              if (columnName && columnValue) {
                _this2.searchConditions.push({
                  column: columnName,
                  columnDisplay: columnName.replace(/\s+/g, '').toLowerCase(),
                  regex: getRegExp(columnValue, 'i')
                });
              }
            } else {
              var val = args[0].trim();
              if (val) {
                _this2.searchConditions.push({
                  regex: getRegExp(val, 'i')
                });
              }
            }
          }, this);
        }
      }, {
        key: "gridColumnsSubscription",
        value: function gridColumnsSubscription(columns) {
          var _this3 = this;
          columns.forEach(function (col) {
            _this3.fieldMap.set(col.displayName().toLowerCase().replace(/\s+/g, ''), col.field);
          });
        }
      }]);
      return SearchProvider;
    }();
    function getRegExp(str, modifiers) {
      try {
        return new RegExp(str, modifiers);
      } catch (_unused) {
        //Escape all RegExp metacharacters.
        return new RegExp(str.replace(/(\^|\$|\(|\)|<|>|\[|\]|\{|\}|\\|\||\.|\*|\+|\?)/g, '\\$1'));
      }
    }

    var SelectionService = /*#__PURE__*/function () {
      function SelectionService(grid) {
        _classCallCheck(this, SelectionService);
        this.grid = grid;
        this._lastClickedRow = undefined;
        this.selectedItemSet = ko.pureComputed(this.readSelectedItemSet, this);
      }
      _createClass(SelectionService, [{
        key: "canSelectRows",
        get: function get() {
          return this.grid.config.canSelectRows;
        }
      }, {
        key: "lastClickedRow",
        get: function get() {
          return this._lastClickedRow;
        }

        // function to manage the selection action of a data item (entity)
      }, {
        key: "changeSelection",
        value: function changeSelection(row, evt) {
          if (this.grid.multiSelect) {
            this.changeSelectionMulti(row, evt);
          } else {
            this.changeSelectionSingle(row, evt);
          }
          this._lastClickedRow = row;
        }
      }, {
        key: "isSelected",
        value: function isSelected(entity) {
          return this.selectedItemSet().has(entity);
        }
      }, {
        key: "selectRange",
        value: function selectRange(startRow, endRow, keepLastSelected) {
          var grid = this.grid;
          var rowFactory = grid.rowFactory;
          var rowEntities = rowFactory.rowEntities();
          var startIndex = rowEntities.indexOf(startRow.entity);
          var endIndex = rowEntities.indexOf(endRow.entity);
          if (endIndex !== -1) {
            this._lastClickedRow = endRow;
          }
          if (startIndex === -1 || endIndex === -1) {
            return false;
          }
          if (endIndex < startIndex) {
            var tempIndex = startIndex;
            var tempRow = startRow;
            startIndex = endIndex;
            startRow = endRow;
            endIndex = tempIndex;
            endRow = tempRow;
          }
          if (Group.isGroupRow(endRow)) {
            endIndex += rowCount(endRow);
          }
          var selectedItems = keepLastSelected ? grid.selectedItems() : [];
          var selectedItemSet = keepLastSelected ? this.selectedItemSet() : undefined;
          for (; startIndex <= endIndex; startIndex++) {
            var entity = rowEntities[startIndex];
            if (!rowFactory.isGroupEntity(entity) && (!selectedItemSet || !selectedItemSet.has(entity))) {
              selectedItems.push(entity);
            }
          }
          grid.selectedItems(selectedItems);
          return true;
        }
      }, {
        key: "changeSelectionMulti",
        value: function changeSelectionMulti(row, evt) {
          if (evt.shiftKey) {
            var startRow = this._lastClickedRow;
            if ((!startRow || !this.selectRange(startRow, row, true)) && !isFullySelected(row)) {
              this.select(row, true);
            }
          } else if (evt.ctrlKey && !isArrowKeyUpDown(evt)) {
            this.select(row, !row.isSelected());
          } else {
            this.selectOnly(row);
          }
        }
      }, {
        key: "changeSelectionSingle",
        value: function changeSelectionSingle(row, evt) {
          if (evt.ctrlKey && !isArrowKeyUpDown(evt) && row.isSelected()) {
            this.select(row, false);
          } else if (!row.isGroupRow) {
            this.selectOnly(row);
          }
        }
      }, {
        key: "select",
        value: function select(row, isSelected) {
          var entities = flattenEntities(row);
          var selectedItemSet = this.selectedItemSet();
          var selectedItems = this.grid.selectedItems();
          if (isSelected) {
            entities.forEach(function (entity) {
              if (!selectedItemSet.has(entity)) {
                selectedItems.push(entity);
              }
            });
          } else if (entities.length === 1) {
            var index = selectedItems.indexOf(entities[0]);
            selectedItems.splice(index, 1);
          } else {
            var entitySet = new Set(entities);
            selectedItems = selectedItems.filter(function (x) {
              return !entitySet.has(x);
            });
          }
          this.grid.selectedItems(selectedItems);
        }
      }, {
        key: "selectOnly",
        value: function selectOnly(row) {
          var selectedItems = this.grid.selectedItems;
          if (!isFullySelected(row) || selectedItems().length !== (Group.isGroupRow(row) ? row.selectedChildren() : 1)) {
            selectedItems(flattenEntities(row));
          }
        }
      }, {
        key: "readSelectedItemSet",
        value: function readSelectedItemSet() {
          return new Set(this.grid.selectedItems());
        }
      }]);
      return SelectionService;
    }();
    function flattenEntities(row) {
      if (Group.isGroupRow(row)) {
        var entities = [];
        addGroupEntities(row, entities);
        return entities;
      } else {
        return [row.entity];
      }
    }
    function addGroupEntities(group, entities) {
      group.groupChildren.forEach(function (groupChild) {
        addGroupEntities(groupChild, entities);
      });
      group.children.forEach(function (entity) {
        entities.push(entity);
      });
    }
    function isArrowKeyUpDown(evt) {
      return evt.keyCode === 38 || evt.keyCode === 40;
    }
    function isFullySelected(row) {
      return Group.isGroupRow(row) ? row.isFullySelected() : row.isSelected();
    }
    function rowCount(group) {
      var result = group.groupChildren.length + group.children.length;
      group.groupChildren.forEach(function (groupChild) {
        result += rowCount(groupChild);
      });
      return result;
    }

    var Grid = /*#__PURE__*/function () {
      function Grid(options) {
        var _this = this;
        _classCallCheck(this, Grid);
        var config = getGridConfig(options);
        this.config = config;
        this.gridId = 'ng' + utils.newId();
        this.$userViewModel = options.userViewModel;
        var gridContainers = options.gridContainers;
        this.$root = gridContainers.$root; //this is the root element that is passed in with the binding handler
        this.$topPanel = gridContainers.$topPanel;
        this.$groupPanel = gridContainers.$groupPanel;
        this.$headerContainer = gridContainers.$headerContainer;
        this.$headerScroller = gridContainers.$headerScroller;
        this.$fixedHeaderContainer = gridContainers.$fixedHeaderContainer;
        this.$fixedHeaderScroller = gridContainers.$fixedHeaderScroller;
        this.$viewport = gridContainers.$viewport;
        this.$canvas = gridContainers.$canvas;
        this.$fixedViewport = gridContainers.$fixedViewport;
        this.$fixedCanvas = gridContainers.$fixedCanvas;
        this.legacyMode = options.legacyMode;
        this.prevScrollTop = 0;
        this.prevScrollIndex = 0;
        this.rootDim = options.gridDim;
        this.jqueryUITheme = !!options.jqueryUITheme;
        this.footerVisible = options.footerVisible !== false;
        this.viewportDimHeight = ko.pureComputed(this.readViewportDimHeight, this);
        this.viewportDimWidth = ko.pureComputed(this.readViewportDimWidth, this);
        this.fixedViewportDimWidth = ko.pureComputed(this.totalFixedRowWidth, this);
        this.maxCanvasHt = ko.observable(0);
        this.sortInfos = ko.observable(options.sortInfos || []);
        this.sortedData = options.data;
        this.showFilter = options.showFilter !== false;
        this.filteredData = ko.observableArray();
        this.filterText = options.filterOptions && options.filterOptions.filterText || ko.observable('');
        this.totalFilteredItemsLength = ko.pureComputed(this.readTotalFilteredItemsLength, this);
        this.columns = ko.observableArray();
        this.visibleNonFixedColumns = ko.pureComputed(this.readVisibleNonFixedColumns, this);
        this.visibleFixedColumns = ko.pureComputed(this.readVisibleFixedColumns, this);
        this.nonGroupColumns = ko.pureComputed(this.readNonGroupColumns, this);
        this.maintainColumnRatios = options.maintainColumnRatios !== false;
        this.hasRatioColumn = false;
        this.rowHeight = options.rowHeight || 30;
        this.rowTemplate = options.rowTemplate || templates.defaultRowTemplate();
        this.groupRowTemplate = options.groupRowTemplate || templates.defaultGroupRowTemplate();
        this.fixedRowTemplate = options.fixedRowTemplate || templates.defaultFixedRowTemplate();
        this.headerRowTemplate = options.headerRowTemplate || templates.defaultHeaderRowTemplate();
        this.fixedHeaderRowTemplate = options.fixedHeaderRowTemplate || templates.defaultFixedHeaderRowTemplate();
        this.renderedRows = ko.observableArray();
        this.disableTextSelection = options.disableTextSelection !== false;
        this.multiSelect = config.canSelectRows && options.multiSelect !== false;
        this.selectedItems = options.selectedItems || ko.observableArray();
        this.selectedItemCount = ko.pureComputed(this.readSelectedItemCount, this);
        this.showMenu = ko.observable(false);
        this.showColumnMenu = options.showColumnMenu !== false;
        this.enableGrouping = !!options.enableGrouping;
        this.topPanelHeight = this.enableGrouping ? config.headerRowHeight * 2 : config.headerRowHeight;
        this.configGroups = ko.observableArray();
        this.ensureCanGroupData = options.ensureCanGroupData || function () {
          return _this.enableGrouping;
        };
        this.groupPanelText = ko.pureComputed(this.readGroupPanelText, this);
        this.isDraggingOverGroups = ko.observable(false);
        this.aggregateResults = ko.observableArray();
        this.enablePaging = !!options.enablePaging;
        this.pagingOptions = getPagingOptions(options);
        this.maxRows = ko.pureComputed(this.readMaxRows, this);
        this.maxPages = ko.pureComputed(this.readMaxPages, this);
        this.cantPageForward = ko.pureComputed(this.readCantPageForward, this);
        this.cantPageBackward = ko.pureComputed(this.readCantPageBackward, this);
        var styles = styleProvider(this);
        this.canvasStyle = styles.canvasStyle;
        this.footerStyle = styles.footerStyle;
        this.headerScrollerStyle = styles.headerScrollerStyle;
        this.headerStyle = styles.headerStyle;
        this.fixedHeaderStyle = styles.fixedHeaderStyle;
        this.topPanelStyle = styles.topPanelStyle;
        this.viewportPanelStyle = styles.viewportPanelStyle;
        this.viewportStyle = styles.viewportStyle;
        this.fixedViewportStyle = styles.fixedViewportStyle;
        this.groupPanelStyle = styles.groupPanelStyle;
        this.messageBus = new MessageBus();
        this.selectionService = new SelectionService(this);
        this.rowFactory = new RowFactory(this);
        this.searchProvider = new SearchProvider(this);
        this.aggregationService = new AggregationService(this, options.aggregationProvider || new DefaultAggregationProvider(function () {
          return _this.sortedData();
        }, function (entity, path) {
          return Promise.resolve(utils.evalProperty(entity, path));
        }));
        this.hoveredEntity = ko.observable();
      }
      _createClass(Grid, [{
        key: "adjustScrollLeft",
        value: function adjustScrollLeft(scrollLeft) {
          this.$headerScroller.css('margin-left', -scrollLeft);
        }
      }, {
        key: "adjustScrollTop",
        value: function adjustScrollTop(scrollTop, force) {
          if (!force && this.prevScrollTop === scrollTop) {
            return;
          }
          var rowIndex = Math.floor(scrollTop / this.rowHeight);
          // Have we hit the threshold going down?
          if (!force && this.prevScrollTop < scrollTop && rowIndex < this.prevScrollIndex + SCROLL_THRESHOLD) {
            return;
          }
          //Have we hit the threshold going up?
          if (!force && this.prevScrollTop > scrollTop && rowIndex > this.prevScrollIndex - SCROLL_THRESHOLD) {
            return;
          }
          this.prevScrollTop = scrollTop;
          var oldRange = this.rowFactory.renderedRange;
          var newRange = new Range(Math.max(0, rowIndex - EXCESS_ROWS), rowIndex + this.minRowsToRender() + EXCESS_ROWS);
          if (newRange.topRow < oldRange.topRow || newRange.bottomRow > oldRange.bottomRow) {
            this.rowFactory.updateViewableRange(newRange);
          }
          this.prevScrollIndex = rowIndex;
        }
      }, {
        key: "adjustFixedViewportScrollTop",
        value: function adjustFixedViewportScrollTop() {
          if (!this.legacyMode) {
            return;
          }
          var viewportScrollTop = this.$viewport.scrollTop() || 0;
          var viewportHeight = this.$viewport.height() || 0;
          var scrollDiff = viewportScrollTop - (this.$fixedViewport.scrollTop() || 0);
          this.$fixedCanvas.css('margin-bottom', viewportHeight + scrollDiff);
          this.$fixedViewport.scrollTop(viewportScrollTop);
        }
      }, {
        key: "groupColOffset",
        value: function groupColOffset() {
          return this.columns().findIndex(function (x) {
            return !x.fixed;
          });
        }
      }, {
        key: "buildColumns",
        value: function buildColumns(columnDefs, groupInfos, sortInfos) {
          var _this2 = this;
          var columns = [];
          var configGroups = [];
          if (columnDefs && columnDefs.length > 0) {
            var sortInfoMap = getSortInfoMap(sortInfos !== null && sortInfos !== void 0 ? sortInfos : this.sortInfos());
            var sortCallback = this.sortData.bind(this);
            var resizeOnDataCallback = this.resizeOnData.bind(this);
            var columnMap = groupInfos && groupInfos.length && this.ensureCanGroupData() ? new Map() : undefined;
            columnDefs.sort(function (a, b) {
              return (a.fixed ? 0 : 1) - (b.fixed ? 0 : 1);
            }).forEach(function (colDef, i) {
              var column = new Column({
                colDef: colDef,
                index: i,
                sortCallback: sortCallback,
                resizeOnDataCallback: resizeOnDataCallback,
                enableResize: _this2.config.enableColumnResize,
                enableSort: _this2.config.enableSorting
              }, _this2);
              columns.push(column);
              if (columnMap) {
                columnMap.set(colDef.field, column);
              }
              var sortDirection = sortInfoMap.get(colDef.field);
              if (sortDirection) {
                column.sortDirection(sortDirection);
              }
            });
            if (columnMap) {
              groupInfos.forEach(function (info) {
                var column = columnMap.get(info.field);
                if (column) {
                  column.groupIndex(configGroups.length);
                  configGroups.push(column);
                }
              });
            }
          }
          this.columns(columns);
          if (configGroups.length || this.configGroups().length) {
            this.configGroups(configGroups);
          }
        }
      }, {
        key: "configureColumnWidths",
        value: function configureColumnWidths() {
          var asterisks = [];
          var percents = [];
          var columns = this.columns();
          var asteriskNum = 0;
          var totalWidth = 0;
          columns.forEach(function (col, i) {
            var width = col.colDef.width;
            if (width == null) {
              col.colDef.width = width = '*';
            }

            // check if it is a number
            if (typeof width === 'string') {
              // figure out if the width is defined or if we need to calculate it
              if (width[0] === '*') {
                asteriskNum += width.length;
                asterisks.push({
                  index: i,
                  value: width.length
                });
              } else if (width.endsWith('%')) {
                // If the width is a percentage, save it until the very last.
                percents.push({
                  index: i,
                  value: parseInt(width.slice(0, -1), 10) / 100
                });
              } else {
                // we can't parse the width so lets throw an error.
                throw new Error('unable to parse column width, use percentage ("10%","20%", etc...) or "*" to use remaining width of grid');
              }
            } else {
              totalWidth += col.width = width;
            }
          });

          // check if we saved any asterisk columns for calculating later
          if (asterisks.length > 0) {
            // get the remaining width
            var remainingWidth = this.rootDim.outerWidth() - totalWidth;
            // calculate the weight of each asterisk rounded down
            var asteriskVal = Math.floor(remainingWidth / asteriskNum);
            // set the width of each column based on the number of stars
            var isOverflowing = this.maxCanvasHt() > this.viewportDimHeight();
            asterisks.forEach(function (asterisk) {
              var col = columns[asterisk.index];
              col.width = asteriskVal * asterisk.value;
              //check if we are on the last column
              if (asterisk.index + 1 === columns.length) {
                var offset = 2; //We're going to remove 2 px so we won't overflow the viewport by default
                if (isOverflowing) {
                  //compensate for scrollbar
                  offset += domUtilityService.scrollW;
                }
                col.width -= offset;
              }
              totalWidth += col.width;
            });
          }

          // Now we check if we saved any percentage columns for calculating last
          if (percents.length > 0) {
            // do the math
            var outerWidth = this.rootDim.outerWidth();
            percents.forEach(function (col) {
              columns[col.index].width = Math.floor(outerWidth * col.value);
            });
          }
          this.columns(columns);
          this.hasRatioColumn = asterisks.length > 0;
          domUtilityService.buildStyles(this);
        }
      }, {
        key: "fixColumnIndexes",
        value: function fixColumnIndexes() {
          this.columns.peek().forEach(function (col, i) {
            col.index = i;
          });
        }
      }, {
        key: "fixGroupIndexes",
        value: function fixGroupIndexes() {
          this.configGroups().forEach(function (item, i) {
            item.groupIndex(i);
          });
        }
      }, {
        key: "groupBy",
        value: function groupBy(col, groupIndex) {
          if (this.ensureCanGroupData()) {
            var configGroups = this.configGroups();
            var targetIndex = groupIndex !== undefined ? groupIndex : configGroups.length;
            this.configGroups.splice(targetIndex, 0, col);
            if (targetIndex < configGroups.length - 1) {
              this.fixGroupIndexes();
            } else {
              col.groupIndex(targetIndex);
            }
            this.trigger(GridEventType.SettingsChangedByUser, {
              groupInfos: configGroups
            });
          }
        }
      }, {
        key: "isHoveredEntity",
        value: function isHoveredEntity(entity) {
          return this.legacyMode && entity === this.hoveredEntity();
        }
      }, {
        key: "minRowsToRender",
        value: function minRowsToRender() {
          var viewportH = this.viewportDimHeight() || 1;
          return Math.floor(viewportH / this.rowHeight);
        }
      }, {
        key: "off",
        value: function off(gridEventType, handler) {
          this.messageBus.unsubscribe(gridEventType, handler);
        }
      }, {
        key: "on",
        value: function on(gridEventType, handler) {
          this.messageBus.subscribe(gridEventType, handler);
        }
      }, {
        key: "overrideSettings",
        value: function overrideSettings(gridSettings, shouldTriggerEvent) {
          if (gridSettings.columnDefs) {
            this.overrideColumnDefs(gridSettings.columnDefs, gridSettings.groupInfos, gridSettings.sortInfos);
          } else if (gridSettings.groupInfos) {
            this.overrideGroupInfos(gridSettings.groupInfos);
          }
          if (gridSettings.aggregateInfos) {
            this.aggregationService.overrideAggregateInfosAsync(gridSettings.aggregateInfos);
          }
          if (gridSettings.sortInfos) {
            this.overrideSortInfos(gridSettings.sortInfos);
          }
          if (shouldTriggerEvent) {
            this.trigger(GridEventType.SettingsChangedByUser, gridSettings);
          }
        }
      }, {
        key: "pageBackward",
        value: function pageBackward() {
          var page = this.pagingOptions.currentPage();
          this.pagingOptions.currentPage(Math.max(page - 1, 1));
        }
      }, {
        key: "pageForward",
        value: function pageForward() {
          var page = this.pagingOptions.currentPage();
          this.pagingOptions.currentPage(Math.min(page + 1, this.maxPages()));
        }
      }, {
        key: "pageToFirst",
        value: function pageToFirst() {
          this.pagingOptions.currentPage(1);
        }
      }, {
        key: "pageToLast",
        value: function pageToLast() {
          var maxPages = this.maxPages();
          this.pagingOptions.currentPage(maxPages);
        }
      }, {
        key: "refreshDomSizes",
        value: function refreshDomSizes(rootDim) {
          if (rootDim) {
            this.rootDim.outerWidth(rootDim.width);
            this.rootDim.outerHeight(rootDim.height);
          }
          this.maxCanvasHt(this.calcMaxCanvasHeight());
        }
      }, {
        key: "removeGroup",
        value: function removeGroup(index) {
          var columns = this.columns();
          var column = columns.find(function (x) {
            return x.groupIndex() === index;
          });
          if (!column) {
            return;
          }
          column.groupIndex(-1);
          this.columns.splice(this.groupColOffset(), 1);
          this.configGroups.splice(index, 1);
          this.fixGroupIndexes();
          this.trigger(GridEventType.SettingsChangedByUser, {
            groupInfos: this.configGroups()
          });
          if (this.configGroups().length === 0) {
            this.fixColumnIndexes();
          }
          domUtilityService.buildStyles(this);
        }
      }, {
        key: "settings",
        value: function settings() {
          return {
            columnDefs: this.columns().filter(function (x) {
              return !x.isGroupCol;
            }).map(function (x) {
              return x.colDef;
            }),
            groupInfos: this.configGroups(),
            sortInfos: this.sortInfos(),
            aggregateInfos: this.aggregationService.aggregateConfig
          };
        }
      }, {
        key: "shouldMaintainColumnRatios",
        value: function shouldMaintainColumnRatios() {
          return this.hasRatioColumn && this.maintainColumnRatios;
        }
      }, {
        key: "toggleGroup",
        value: function toggleGroup(col) {
          var colIndex = this.configGroups().indexOf(col);
          if (colIndex === -1) {
            this.groupBy(col);
          } else {
            this.removeGroup(colIndex);
          }
        }
      }, {
        key: "toggleShowMenu",
        value: function toggleShowMenu() {
          this.showMenu(!this.showMenu());
        }
      }, {
        key: "trigger",
        value: function trigger(gridEventType, data) {
          this.messageBus.publish(gridEventType, {
            type: gridEventType,
            data: data
          });
        }
      }, {
        key: "calcMaxCanvasHeight",
        value: function calcMaxCanvasHeight() {
          var dataLength = this.rowFactory.visibleRowCount();
          return dataLength * this.rowHeight;
        }
      }, {
        key: "executeSorting",
        value: function executeSorting(sortInfos) {
          this.sortInfos(sortInfos);
          if (!this.config.useExternalSorting) {
            sortService.sort(this.sortedData, sortInfos);
          }
        }
      }, {
        key: "onConfigGroupsChanged",
        value: function onConfigGroupsChanged(configGroups) {
          this.trigger(GridEventType.GroupInfosChanged, configGroups);
          this.rowFactory.filteredDataChanged();
        }
      }, {
        key: "onFilteredDataChanged",
        value: function onFilteredDataChanged() {
          this.maxCanvasHt(this.calcMaxCanvasHeight());
          this.aggregationService.refreshGridAggregatesAsync();
        }
      }, {
        key: "onSortInfosChanged",
        value: function onSortInfosChanged(sortInfos) {
          this.trigger(GridEventType.SortInfosChanged, sortInfos);
        }
      }, {
        key: "overrideColumnDefs",
        value: function overrideColumnDefs(columnDefs, groupInfos, sortInfos) {
          this.buildColumns(columnDefs, groupInfos || this.configGroups(), sortInfos);
          this.configureColumnWidths();
          this.trigger(GridEventType.ColumnWidthsChanged, this.columns());
        }
      }, {
        key: "overrideGroupInfos",
        value: function overrideGroupInfos(groupInfos) {
          var groupColOffset = this.groupColOffset();
          var oldConfigGroups = this.configGroups();
          oldConfigGroups.forEach(function (col) {
            return col.groupIndex(-1);
          });
          if (groupInfos.length && this.ensureCanGroupData()) {
            var columnMap = new Map();
            this.columns().forEach(function (col) {
              return columnMap.set(col.field, col);
            });
            var newConfigGroups = [];
            groupInfos.forEach(function (info) {
              var col = columnMap.get(info.field);
              if (col) {
                col.groupIndex(newConfigGroups.length);
                newConfigGroups.push(col);
              }
            });
            if (newConfigGroups.length) {
              var subtraction = oldConfigGroups.length - newConfigGroups.length;
              var hasChanges = subtraction !== 0 || newConfigGroups.some(function (col, i) {
                return col !== oldConfigGroups[i];
              });
              if (hasChanges) {
                if (subtraction > 0) {
                  this.columns.splice(groupColOffset, subtraction);
                }
                this.configGroups(newConfigGroups);
              }
              return;
            }
          }
          if (oldConfigGroups.length) {
            this.columns.splice(groupColOffset, oldConfigGroups.length);
            this.configGroups.removeAll();
            this.fixColumnIndexes();
            domUtilityService.buildStyles(this);
          }
        }
      }, {
        key: "overrideSortInfos",
        value: function overrideSortInfos(sortInfos) {
          this.executeSorting(sortInfos);
        }
      }, {
        key: "readCantPageBackward",
        value: function readCantPageBackward() {
          var curPage = this.pagingOptions.currentPage();
          return !(curPage > 1);
        }
      }, {
        key: "readCantPageForward",
        value: function readCantPageForward() {
          var curPage = this.pagingOptions.currentPage();
          var maxPages = this.maxPages();
          return !(curPage < maxPages);
        }
      }, {
        key: "readGroupPanelText",
        value: function readGroupPanelText() {
          return this.configGroups().length > 0 || this.isDraggingOverGroups() ? configuration.resourceStringsProvider.groupHeaderWithGroups() : configuration.resourceStringsProvider.groupHeaderNoGroups();
        }
      }, {
        key: "readMaxPages",
        value: function readMaxPages() {
          return Math.ceil(this.maxRows() / this.pagingOptions.pageSize());
        }
      }, {
        key: "readMaxRows",
        value: function readMaxRows() {
          return Math.max(this.pagingOptions.totalServerItems() || this.totalFilteredItemsLength());
        }
      }, {
        key: "readNonGroupColumns",
        value: function readNonGroupColumns() {
          return this.columns().filter(function (col) {
            return !col.isGroupCol;
          });
        }
      }, {
        key: "readSelectedItemCount",
        value: function readSelectedItemCount() {
          return this.selectedItems().length;
        }
      }, {
        key: "readTotalFilteredItemsLength",
        value: function readTotalFilteredItemsLength() {
          return this.filteredData().length;
        }
      }, {
        key: "readViewportDimHeight",
        value: function readViewportDimHeight() {
          return Math.max(0, this.rootDim.outerHeight() - this.topPanelHeight - this.config.footerRowHeight);
        }
      }, {
        key: "readViewportDimWidth",
        value: function readViewportDimWidth() {
          var fixedRowsWidth = this.totalFixedRowWidth();
          return Math.max(0, this.rootDim.outerWidth() - (fixedRowsWidth > 0 ? fixedRowsWidth : 0));
        }
      }, {
        key: "readVisibleFixedColumns",
        value: function readVisibleFixedColumns() {
          var _this3 = this;
          return this.columns().filter(function (column) {
            return column.visible() && _this3.legacyMode && column.fixed;
          });
        }
      }, {
        key: "readVisibleNonFixedColumns",
        value: function readVisibleNonFixedColumns() {
          var _this4 = this;
          return this.columns().filter(function (column) {
            return column.visible() && (!_this4.legacyMode || !column.fixed);
          });
        }
      }, {
        key: "totalFixedRowWidth",
        value: function totalFixedRowWidth() {
          var totalWidth = 0;
          this.visibleFixedColumns().forEach(function (col) {
            totalWidth += col.width;
          });
          return totalWidth;
        }
      }, {
        key: "totalNonFixedRowWidth",
        value: function totalNonFixedRowWidth() {
          var totalWidth = 0;
          this.visibleNonFixedColumns().forEach(function (col) {
            totalWidth += col.width;
          });
          return totalWidth;
        }
      }, {
        key: "resizeOnData",
        value: function resizeOnData(col) {
          // we calculate the longest data.
          var useFixedContainer = this.legacyMode && col.fixed;
          var headerScroller = useFixedContainer ? this.$fixedHeaderScroller : this.$headerScroller;
          var viewport = useFixedContainer ? this.$fixedViewport : this.$viewport;
          var index = useFixedContainer ? col.index : col.index - this.visibleFixedColumns().length;
          var longest = col.minWidth - 7;
          var elems = headerScroller.find(".col".concat(index, " .kgHeaderText")).add(viewport.find(".col".concat(index, ".kgCellText"))).add(viewport.find(".col".concat(index, " .kgCellText")));
          elems.each(function (i, elem) {
            var visualLength = utils.visualLength($(elem)) + 10; // +10 some margin
            if (visualLength > longest) {
              longest = visualLength;
            }
          });
          col.width = Math.min(col.maxWidth, longest + 7); // + 7 px to make it look decent.
          domUtilityService.buildStyles(this);
        }
      }, {
        key: "sortData",
        value: function sortData(column, direction, isMulti) {
          var sortInfo = {
            column: column,
            direction: direction
          };
          var sortInfos = this.sortInfos();
          if (isMulti) {
            sortInfos = sortInfos.filter(function (x) {
              return x.column.field !== column.field;
            });
            sortInfos.push(sortInfo);
          } else {
            var columnFieldSet = new Set();
            sortInfos.forEach(function (otherInfo) {
              if (otherInfo.column.field !== column.field) {
                columnFieldSet.add(otherInfo.column.field);
              }
            });
            this.columns().forEach(function (x) {
              if (columnFieldSet.has(x.field)) {
                x.sortDirection(SortDirection.Unspecified);
              }
            });
            sortInfos = [sortInfo];
          }
          this.executeSorting(sortInfos);
          this.trigger(GridEventType.SettingsChangedByUser, {
            sortInfos: sortInfos
          });
        }
      }], [{
        key: "init",
        value: function init(options) {
          var grid = new Grid(options);
          grid.buildColumns(options.columnDefs, options.groupInfos, options.sortInfos);
          grid.configGroups.subscribe(grid.onConfigGroupsChanged, grid);
          grid.sortInfos.subscribe(grid.onSortInfosChanged, grid);
          grid.filteredData.subscribe(grid.onFilteredDataChanged, grid);
          grid.searchProvider.evalFilter();
          grid.aggregationService.overrideAggregateInfosAsync(options.aggregateInfos || []);
          return grid;
        }
      }]);
      return Grid;
    }();
    function getSortInfoMap(sortInfo) {
      var result = new Map();
      sortInfo.forEach(function (info) {
        result.set(info.column.field, info.direction);
      });
      return result;
    }

    var defaultBatchSizeForAdd = 3;
    var Status = /*#__PURE__*/function (Status) {
      Status["Added"] = "added";
      Status["Deleted"] = "deleted";
      Status["Retained"] = "retained";
      return Status;
    }(Status || {});
    var ProcessInfo = /*#__PURE__*/function () {
      function ProcessInfo() {
        _classCallCheck(this, ProcessInfo);
        this.deletedIndexes = [];
        this.insertedCount = 0;
        this.movedIndexes = new Map();
        this.pendingAdds = [];
        this.usedDataItems = new Set();
      }
      _createClass(ProcessInfo, [{
        key: "addNode",
        value: function addNode(changeItem, node, isPlaceholder) {
          this.pendingAdds.push({
            changeItem: changeItem,
            node: node,
            isPlaceholder: isPlaceholder
          });
        }
      }, {
        key: "markDataItemAsUsed",
        value: function markDataItemAsUsed(dataItem) {
          this.usedDataItems.add(dataItem);
        }
      }]);
      return ProcessInfo;
    }();
    var GridForEachHandler = /*#__PURE__*/function () {
      function GridForEachHandler(containerNode, bindingContext, options) {
        _classCallCheck(this, GridForEachHandler);
        this.containerNode = containerNode;
        this.bindingContext = bindingContext;
        this.data = options.data;
        this.batchSizeForAdd = options.batchSizeForAdd != null && options.batchSizeForAdd >= 0 ? options.batchSizeForAdd : defaultBatchSizeForAdd; // 0 = unrestricted
        this.isDebugMode = !!options.isDebugMode;
        this.afterQueueFlush = options.afterQueueFlush && options.afterQueueFlush.bind(null, this.getDataItemsMapper());
        this.templateNode = makeTemplateNode(containerNode);
        this.changeQueue = [];
        this.isRenderingQueued = false;
        this.virtualNodes = [];
      }
      _createClass(GridForEachHandler, [{
        key: "start",
        value: function start() {
          this.onDataChange(ko.unwrap(this.data));
          this.changeSubscription = this.watchForChanges(this.data);
        }
      }, {
        key: "dispose",
        value: function dispose() {
          if (this.changeSubscription) {
            this.changeSubscription.dispose();
          }
        }
      }, {
        key: "getDataItemsMapper",
        value: function getDataItemsMapper() {
          var _this = this;
          return function () {
            return _this.virtualNodes.map(getDataItem);
          };
        }
      }, {
        key: "watchForChanges",
        value: function watchForChanges(data) {
          return ko.isObservable(data) ? data.subscribe(this.onDataChange, this) : undefined;
        }
      }, {
        key: "onDataChange",
        value: function onDataChange(newData) {
          var oldData = this.virtualNodes.map(getDataItemDiscriminator);
          var changeQueue = ko.utils.compareArrays(oldData, newData, {
            dontLimitMoves: true
          });
          changeQueue = normalizeChangeQueue(changeQueue);
          var hasChanges = changeQueue.length && changeQueue[changeQueue.length - 1].status !== Status.Retained;
          if (hasChanges) {
            this.changeQueue = changeQueue;
            this.changeQueue.hasRunFirstCycle = false;
            if (!this.isRenderingQueued) {
              this.isRenderingQueued = true;
              this.enqueueRendering();
            }
          } else {
            this.changeQueue = [];
          }
        }
      }, {
        key: "enqueueRendering",
        value: function enqueueRendering() {
          _enqueueRendering(this.processQueue.bind(this));
        }
      }, {
        key: "processQueue",
        value: function processQueue() {
          var isFirstCycle = !this.changeQueue.hasRunFirstCycle;
          var processInfo = new ProcessInfo();
          if (isFirstCycle) {
            if (this.bindingContext.$data.beforeRenderStarted) {
              this.bindingContext.$data.beforeRenderStarted(this);
            }
            this.processFirstCycle(processInfo);
            this.changeQueue.hasRunFirstCycle = true;
          }
          this.processCycle(processInfo);
          if (isFirstCycle) {
            processInfo.deletedIndexes.sort(sortService.sortNumber);
            processInfo.pendingAdds.sort(sortPendingAdd);
          }
          this.flushPendingDeletes(processInfo);
          this.flushPendingAdds(processInfo);
          if (this.isDebugMode) {
            this.ensureConsistentState();
          }
          if (this.changeQueue.length) {
            this.enqueueRendering();
          } else {
            this.isRenderingQueued = false;
            if (this.afterQueueFlush) {
              this.afterQueueFlush();
            }
            if (this.bindingContext.$data.afterRenderFinished) {
              this.bindingContext.$data.afterRenderFinished(this);
            }
          }
        }
      }, {
        key: "processFirstCycle",
        value: function processFirstCycle(processInfo) {
          var lastAddedIndex = -2;
          var changeQueue = this.changeQueue;
          for (var i = 0; i < changeQueue.length; i++) {
            var changeItem = changeQueue[i];
            if (changeItem.status === Status.Retained) {
              processInfo.markDataItemAsUsed(changeItem.value);
              changeQueue.splice(i--, 1);
            } else if (changeItem.status === Status.Added) {
              var moveFromIndex = changeItem.moved;
              if (moveFromIndex !== undefined) {
                processInfo.markDataItemAsUsed(changeItem.value);
                processInfo.movedIndexes.set(moveFromIndex, true);
                processInfo.addNode(changeItem, this.virtualNodes[moveFromIndex].node, false);
                changeQueue.splice(i--, 1);
                lastAddedIndex = changeItem.index;
              }
            } else if (changeItem.index === lastAddedIndex) {
              processInfo.deletedIndexes.push(changeItem.index);
              changeQueue.splice(i--, 1);
            }
          }
        }
      }, {
        key: "processCycle",
        value: function processCycle(processInfo) {
          var changeQueue = this.changeQueue;
          for (var i = 0; i < changeQueue.length; i++) {
            var changeItem = changeQueue[i];
            if (changeItem.status === Status.Added) {
              if (this.batchSizeForAdd && processInfo.insertedCount === this.batchSizeForAdd) {
                var nextQueueIndex = i + 1;
                var isDeletingThisIndex = changeQueue.length > nextQueueIndex && changeQueue[nextQueueIndex].index === changeItem.index;
                if (isDeletingThisIndex) {
                  var isDataItemUsedByAnotherIndex = this.virtualNodes.length > changeItem.index && processInfo.usedDataItems.has(this.virtualNodes[changeItem.index].dataItem);
                  if (isDataItemUsedByAnotherIndex) {
                    processInfo.addNode(changeItem, undefined, true);
                  } else {
                    // Keep the existing node. It'll be removed and replaced in subsequent cycles. This helps prevent flickering.
                    processInfo.movedIndexes.set(changeItem.index, true);
                    processInfo.addNode(changeItem, this.virtualNodes[changeItem.index].node, true);
                  }
                  processInfo.deletedIndexes.push(changeItem.index);
                } else {
                  processInfo.addNode(changeItem, undefined, true);
                  changeQueue.splice(i + 1, 0, {
                    status: Status.Deleted,
                    value: changeItem.value,
                    index: changeItem.index
                  }); // Enqueue a deletion to remove the placeholder node.
                }
                i++; // Keep the enqueued deletion and skip to the next index.
              } else {
                processInfo.addNode(changeItem, this.templateNode.cloneNode(true), false);
                processInfo.insertedCount++;
                changeQueue.splice(i--, 1);
              }
            } else {
              processInfo.deletedIndexes.push(changeItem.index);
              changeQueue.splice(i--, 1);
            }
          }
        }
      }, {
        key: "flushPendingDeletes",
        value: function flushPendingDeletes(processInfo) {
          for (var i = processInfo.deletedIndexes.length - 1; i >= 0; i--) {
            var index = processInfo.deletedIndexes[i];
            if (!processInfo.movedIndexes.get(index)) {
              var node = this.virtualNodes[index].node;
              if (node) {
                ko.removeNode(node);
              }
            }
            this.virtualNodes.splice(index, 1);
          }
        }
      }, {
        key: "flushPendingAdds",
        value: function flushPendingAdds(processInfo) {
          var _this2 = this;
          var lastAddedIndex = -2;
          var contiguousGroups = [];
          processInfo.pendingAdds.forEach(function (pendingAdd) {
            var changeItem = pendingAdd.changeItem;
            _this2.virtualNodes.splice(changeItem.index, 0, {
              dataItem: changeItem.value,
              node: pendingAdd.node,
              isPlaceholder: pendingAdd.isPlaceholder
            });
            if (pendingAdd.node) {
              var group;
              if (changeItem.index !== lastAddedIndex + 1) {
                group = [];
                group.changeItemIndex = changeItem.index;
                contiguousGroups.push(group);
              } else {
                group = contiguousGroups[contiguousGroups.length - 1];
              }
              group.push(pendingAdd.node);
              lastAddedIndex = changeItem.index;
            }
          });
          var containerNode = this.containerNode;
          contiguousGroups.forEach(function (group) {
            var previousNode = _this2.getNodeBeforeIndex(group.changeItemIndex);
            insertAllAfter(containerNode, group, previousNode);
          });
          processInfo.pendingAdds.forEach(function (pendingAdd) {
            var changeItem = pendingAdd.changeItem;
            if (changeItem.moved === undefined && !pendingAdd.isPlaceholder) {
              var childContext = _this2.bindingContext.createChildContext(changeItem.value);
              ko.applyBindings(childContext, pendingAdd.node);
            }
          });
        }
      }, {
        key: "ensureConsistentState",
        value: function ensureConsistentState() {
          var data = ko.unwrap(this.data);
          var expectedLength = data.length;
          var actualLength = this.virtualNodes.length;
          /* istanbul ignore next */
          if (this.virtualNodes.length !== expectedLength) {
            throw new Error("Internal state is invalid. Expected ".concat(expectedLength, " node(s) but there are ").concat(actualLength, "."));
          }
        }
      }, {
        key: "getNodeBeforeIndex",
        value: function getNodeBeforeIndex(changeItemIndex) {
          if (changeItemIndex === 0) {
            return undefined;
          }
          var virtualNode;
          var index = changeItemIndex - 1;
          while (!(virtualNode = this.virtualNodes[index]).node && index > 0) {
            index--;
          }
          return virtualNode.node;
        }
      }]);
      return GridForEachHandler;
    }();
    function makeTemplateNode(containerNode) {
      var result;
      for (var i = containerNode.childNodes.length - 1; i >= 0; i--) {
        var node = containerNode.childNodes[i];
        containerNode.removeChild(node);
        if (node.nodeType === Node.TEXT_NODE && (!node.textContent || node.textContent.trim().length === 0)) {
          continue;
        }
        if (result) {
          throw new Error('Templates with more than one element are not supported.');
        }
        result = node;
      }
      if (!result) {
        throw new Error('Template does not contain any content.');
      }
      return result;
    }
    function getDataItem(virtualNode) {
      return virtualNode.dataItem;
    }
    function getDataItemDiscriminator(virtualNode) {
      return !virtualNode.isPlaceholder ? virtualNode.dataItem : virtualNode;
    }
    function normalizeChangeQueue(changeQueue) {
      return changeQueue.sort(compareChangeItem);
    }
    function compareChangeItem(a, b) {
      var bIsRetained = b.status === Status.Retained;
      if (a.status === Status.Retained) {
        return bIsRetained ? 0 : -1;
      }
      if (bIsRetained) {
        return 1;
      }
      if (a.index !== b.index) {
        return a.index - b.index;
      }
      // We have a pair of added and deleted, in any order.
      return a.status === Status.Deleted ? 1 : -1;
    }
    function sortPendingAdd(a, b) {
      return a.changeItem.index - b.changeItem.index;
    }
    function insertAllAfter(containerNode, nodesToInsert, nodeToInsertAfter) {
      var nodeToInsert;
      if (nodesToInsert.length === 1) {
        nodeToInsert = nodesToInsert[0];
      } else {
        nodeToInsert = document.createDocumentFragment();
        nodesToInsert.forEach(function (node) {
          nodeToInsert.appendChild(node);
        });
      }
      try {
        // insertAfter actually supports having undefined nodeToInsertAfter but the type definition is wrong.
        ko.virtualElements.insertAfter(containerNode, nodeToInsert, nodeToInsertAfter);
      } catch (error) {
        // IE can randomly fail with an "Unspecified error". Simply retrying will succeed.
        ko.virtualElements.insertAfter(containerNode, nodeToInsert, nodeToInsertAfter);
      }
    }
    var kgGridForEach = {
      animateFrame: getAnimateFrame(),
      init: function init(element, valueAccessor, allBindings, viewModel, bindingContext) {
        var options = valueAccessor();
        if (Object.getPrototypeOf(options) !== Object.prototype) {
          options = {
            data: options
          };
        }
        var handler = new GridForEachHandler(element, bindingContext, options);
        handler.start();
        ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
          handler.dispose();
        });
        return {
          controlsDescendantBindings: true
        };
      }
    };
    function getAnimateFrame() {
      return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.msRequestAnimationFrame || function (callback) {
        return window.setTimeout(callback, 1000 / 60);
      };
    }
    function _enqueueRendering(callback) {
      kgGridForEach.animateFrame.call(window, callback);
    }
    ko.bindingHandlers.kgGridForEach = kgGridForEach;

    ko.bindingHandlers.koGrid = {
      init: function init(element, valueAccessor, allBindings, viewModel, bindingContext) {
        var options = Object.assign({}, valueAccessor());
        if (!options.data) {
          throw new Error('data must be specified.');
        }
        var elem = $(element).addClass('koGrid');
        var userViewModel = bindingContext.$data;
        var gridElem = $(options.gridTemplate || templates.defaultGridTemplate()).appendTo(element);
        var gridContainers = domUtilityService.getGridContainers(elem);
        options.gridContainers = gridContainers;
        options.gridDim = new Dimension(elem.width() || 0, elem.height() || 0);
        options.userViewModel = userViewModel;
        initViewportBindingString(gridContainers.$viewport, options);
        initRowBindingString(gridContainers.$viewport, options);
        options.legacyMode = configuration.legacyMode != null ? configuration.legacyMode : bowser.test(['msie', 'msedge']);
        if (!options.legacyMode) {
          gridContainers.$fixedHeaderContainer.remove();
          gridContainers.$fixedHeaderContainer = $();
          gridContainers.$fixedHeaderScroller = $();
          gridContainers.$fixedViewport.remove();
          gridContainers.$fixedViewport = $();
          gridContainers.$fixedCanvas = $();
        }
        var grid = Grid.init(options);
        elem.addClass(grid.gridId.toString());
        options.data.subscribe(onDataChanged.bind(null, grid));
        var childBindingContext = bindingContext.createChildContext(grid);
        childBindingContext.$css = configuration.css;
        childBindingContext.$grid = grid;
        childBindingContext.$resStrings = configuration.resourceStringsProvider;
        childBindingContext.$userViewModel = userViewModel;
        ko.applyBindings(childBindingContext, gridElem[0]);
        domUtilityService.updateGridLayout(grid);
        grid.configureColumnWidths();
        grid.refreshDomSizes();

        //now use the manager to assign the event handlers
        grid.eventProvider = EventProvider.init(grid, options);

        //initialize plugins.
        if (options.plugins) {
          options.plugins.forEach(function (p) {
            p.onGridInit(grid);
          });
        }
        domUtilityService.buildStyles(grid);
        initEventHandlers(grid, options.events);
        ko.utils.domNodeDisposal.addDisposeCallback(element, dispose.bind(null, grid));
        return {
          controlsDescendantBindings: true
        };
      }
    };
    function initViewportBindingString(viewport, options) {
      if (options.viewportBindingString) {
        var bindingString = viewport.attr('data-bind') + ', ' + options.viewportBindingString;
        viewport.attr('data-bind', bindingString);
      }
    }
    function initRowBindingString(viewport, options) {
      if (options.rowBindingString) {
        var row = viewport.find('.kgRow');
        var bindingString = row.attr('data-bind') + ', ' + options.rowBindingString;
        row.attr('data-bind', bindingString);
      }
    }
    function initEventHandlers(grid, events) {
      if (!events) {
        return;
      }
      if (events.groupInfosChanged) {
        grid.on(GridEventType.GroupInfosChanged, events.groupInfosChanged);
      }
      if (events.sortInfosChanged) {
        grid.on(GridEventType.SortInfosChanged, events.sortInfosChanged);
      }
    }
    function dispose(grid) {
      if (grid.styleSheet) {
        $(grid.styleSheet).remove();
      }
    }

    // TODO: WI00244945 - optimize the handlers below as some functions are called multiple times.

    function onDataChanged(grid) {
      grid.searchProvider.evalFilter();
      grid.refreshDomSizes();
    }

    ko.bindingHandlers.kgRow = {
      init: function init(element, valueAccessor, allBindings, viewModel, bindingContext) {
        var grid = bindingContext.$parent;
        var source = viewModel.isGroupRow ? grid.groupRowTemplate : grid.rowTemplate;
        var rowElem = $(source).appendTo(element);
        bindingContext.$row = viewModel;
        ko.applyBindings(bindingContext, rowElem[0]);
        grid.trigger(GridEventType.RowBound, {
          row: viewModel,
          rowElement: element
        });
        return {
          controlsDescendantBindings: true
        };
      }
    };

    ko.bindingHandlers.kgFixedRow = {
      init: function init(element, valueAccessor, allBindings, viewModel, bindingContext) {
        var grid = bindingContext.$parent;
        var source = viewModel.isGroupRow ? templates.defaultFixedGroupTemplate() : grid.fixedRowTemplate;
        var rowElem = $(source).appendTo(element);
        bindingContext.$row = viewModel;
        ko.applyBindings(bindingContext, rowElem[0]);
        return {
          controlsDescendantBindings: true
        };
      }
    };

    ko.bindingHandlers.kgFixedHeaderRow = {
      init: function init(element, valueAccessor, allBindings, viewModel, bindingContext) {
        var headerRow = $(viewModel.fixedHeaderRowTemplate).appendTo(element);
        ko.applyBindings(bindingContext, headerRow[0]);
        return {
          controlsDescendantBindings: true
        };
      }
    };

    ko.bindingHandlers.kgCell = {
      init: function init(element, valueAccessor, allBindings, viewModel, bindingContext) {
        if (viewModel.cellTemplate) {
          var cell = $(viewModel.cellTemplate).appendTo(element);
          ko.applyBindings(bindingContext, cell[0]);
        }
        return {
          controlsDescendantBindings: true
        };
      },
      update: function update(element, valueAccessor, allBindings, viewModel, bindingContext) {
        if (!viewModel.cellTemplate && !viewModel.isGroupCol) {
          var value = viewModel.getProperty(bindingContext.$parent);
          element.textContent = value != null ? value.toString() : '';
        }
      }
    };

    ko.bindingHandlers.kgCellClass = {
      update: function update(element, valueAccessor, allBindings, viewModel, bindingContext) {
        var index = bindingContext.$index && bindingContext.$index();
        var className = viewModel.cellClass + ' kgCell col' + index;
        if (!viewModel.cellTemplate) {
          className += ' kgCellText';
        }
        element.className = className;
      }
    };

    ko.bindingHandlers.kgHeaderRow = {
      init: function init(element, valueAccessor, allBindings, viewModel, bindingContext) {
        var headerRow = $(viewModel.headerRowTemplate).appendTo(element);
        ko.applyBindings(bindingContext, headerRow[0]);
        return {
          controlsDescendantBindings: true
        };
      }
    };

    ko.bindingHandlers.kgHeaderCell = {
      init: function init(element, valueAccessor, allBindings, viewModel, bindingContext) {
        var headerCell = $(viewModel.headerCellTemplate).appendTo(element);
        ko.applyBindings(bindingContext, headerCell[0]);
        return {
          controlsDescendantBindings: true
        };
      }
    };

    ko.bindingHandlers.mouseEvents = {
      init: function init(element, valueAccessor) {
        var eFuncs = valueAccessor();
        if (eFuncs.mouseDown) {
          $(element).on('mousedown', eFuncs.mouseDown);
        }
      }
    };

    var index = {
      AggregateOperation: AggregateOperation,
      Column: Column,
      config: configure,
      DefaultAggregationProvider: DefaultAggregationProvider,
      defaultGroupRowTemplate: templates.defaultGroupRowTemplate,
      defaultHeaderCellTemplate: templates.defaultHeaderCellTemplate,
      defaultHeaderRowTemplate: templates.defaultHeaderRowTemplate,
      defaultRowTemplate: templates.defaultRowTemplate,
      Dimension: Dimension,
      domUtilityService: domUtilityService,
      EventProvider: EventProvider,
      Grid: Grid,
      Group: Group,
      moveSelectionHandler: moveSelectionHandler,
      Range: Range,
      Row: Row,
      RowFactory: RowFactory,
      SearchProvider: SearchProvider,
      SelectionService: SelectionService,
      sortService: sortService,
      styleProvider: styleProvider,
      utils: utils
    };

    return index;

})));
//# sourceMappingURL=ko-grid.js.map
