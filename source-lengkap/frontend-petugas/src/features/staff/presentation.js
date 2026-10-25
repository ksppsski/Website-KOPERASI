import {
  IconView,
  BadgeView,
  HeadingView,
  Review2View,
  ReviewView,
  ButtonView,
  Toolbar2View,
  ToolbarView,
  Table2View,
  Table3View,
  TableView,
  Checks2View,
  ChecksView,
  StatusHeadView,
} from './views/presentation.svelte';
import {
  iconView,
  badgeView,
  headingView,
  reviewView,
  tableView,
} from '../../../../shared/lib/view-helpers.js';
import { displayText, formatMoney } from '../../../../shared/lib/formatters.js';
import { iconPaths } from '../../../../shared/lib/icons.js';
import { view, snippetView } from '../../../../shared/runtime/view.js';

/**
 * Elemen presentasi petugas, filter tabel, dan format nilai.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */
import { statusColor } from '../../../../shared/lib/status-colors.js';
export function createStaffPresentation({ app, runtime }) {
  const esc = displayText;

  const rupiah = formatMoney;

  const paths = iconPaths;

  const icon = iconView;

  const logo = (white = false) =>
    `<img
      class="brand-logo"
      src="assets/kspps-logo-${white ? 'white' : 'color'}-web.png"
      alt="KSPPS Syirkah Kebaikan Indonesia"
      width="720"
      height="${white ? 256 : 255}"
    />`;

  const badge = badgeView;

  const heading = headingView;

  const review = reviewView;

  function button(action, id, label = 'Periksa') {
    return snippetView(ButtonView, { action: action, id: id, label: label, icon: icon('chevron') });
  }

  function filtered(rows, extra = () => true) {
    return rows.filter(
      (x) => (!runtime.state.filter || x.status === runtime.state.filter) && extra(x),
    );
  }

  function toolbar(statuses) {
    return statuses.length
      ? snippetView(ToolbarView, {
          statusesRows: statuses.map((s) =>
            snippetView(Toolbar2View, {
              filterContent: runtime.state.filter === s ? { selected: true } : {},
              s: s,
            }),
          ),
        })
      : '';
  }

  const table = tableView;

  function checks(items) {
    return snippetView(ChecksView, {
      itemsRows: items.map(([name, text]) =>
        snippetView(Checks2View, { fieldName: name, text: text }),
      ),
    });
  }

  function statusHead(x) {
    return snippetView(StatusHeadView, { id: x.id, badge: badge(x.status) });
  }
  return {
    esc,
    rupiah,
    paths,
    icon,
    logo,
    badge,
    heading,
    review,
    button,
    filtered,
    toolbar,
    table,
    checks,
    statusHead,
  };
}
