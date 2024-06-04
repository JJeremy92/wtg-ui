import defaultGridTemplate from './gridTemplate.html';
import defaultRowTemplate from './rowTemplate.html';
import defaultFixedRowTemplate from './fixedRowTemplate.html';
import defaultFixedHeaderRowTemplate from './fixedHeaderRowTemplate.html';
import defaultGroupTemplate from './groupTemplate.html';
import defaultFixedGroupTemplate from './fixedGroupTemplate.html';
import defaultHeaderRowTemplate from './headerRowTemplate.html';
import defaultHeaderCellTemplate from './headerCellTemplate.html';

export default {
    defaultGridTemplate(): string {
        return defaultGridTemplate;
    },
    defaultRowTemplate(): string {
        return defaultRowTemplate;
    },
    defaultFixedRowTemplate(): string {
        return defaultFixedRowTemplate;
    },
    defaultGroupRowTemplate(): string {
        return defaultGroupTemplate;
    },
    defaultFixedGroupTemplate(): string {
        return defaultFixedGroupTemplate;
    },
    defaultHeaderRowTemplate(): string {
        return defaultHeaderRowTemplate;
    },
    defaultHeaderCellTemplate(): string {
        return defaultHeaderCellTemplate;
    },
    defaultFixedHeaderRowTemplate(): string {
        return defaultFixedHeaderRowTemplate;
    },
};
