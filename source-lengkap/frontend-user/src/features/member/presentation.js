import {
  IconView,
  BadgeView,
  NavLinkView,
  DemoStripView,
  Field2View,
  FieldView,
  SelectField2View,
  SelectFieldView,
  Review2View,
  ReviewView,
  HeadingView,
  StatView,
  ActivityView,
  Tabs2View,
  TabsView,
} from './views/presentation.svelte';
import {
  iconView,
  badgeView,
  reviewView,
  headingView,
} from '../../../../shared/lib/view-helpers.js';
import { displayText, formatMoney } from '../../../../shared/lib/formatters.js';
import { iconPaths } from '../../../../shared/lib/icons.js';
import { view, snippetView } from '../../../../shared/runtime/view.js';

/**
 * Elemen presentasi anggota dan format nilai; tidak mengambil data server.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */
import { statusColor } from '../../../../shared/lib/status-colors.js';
export function createMemberPresentation({ app }) {
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

  const navLink = (route, label, ico, extra = '') =>
    snippetView(NavLinkView, {
      route: route,
      extra: extra,
      icoContent: ico ? icon(ico) : '',
      label: label,
    });

  const demoStrip = () => snippetView(DemoStripView, { icon: icon('info') });

  function field(label, name, value = '', options = {}) {
    const {
      type = 'text',
      required = true,
      placeholder = '',
      readonly = false,
      min,
      max,
      pattern,
      maxlength,
    } = options;
    return snippetView(FieldView, {
      label: label,
      requiredContent: required ? snippetView(Field2View) : '',
      fieldName: name,
      type: type,
      fieldValue: esc(value),
      requiredContent2: required ? { required: true } : {},
      readonlyContent: readonly ? { readonly: true } : {},
      placeholderContent: placeholder ? `placeholder="${esc(placeholder)}"` : '',
      minContent: min !== undefined ? { min: min } : {},
      maxContent: max !== undefined ? { max: max } : {},
      patternContent: pattern ? { pattern: pattern } : {},
      maxlengthContent: maxlength ? { maxlength: maxlength } : {},
    });
  }

  function selectField(label, name, items, value, required = true) {
    return snippetView(SelectFieldView, {
      label: label,
      requiredContent: required ? ' *' : '',
      fieldName: name,
      requiredContent2: required ? { required: true } : {},
      itemsRows: items.map((x) =>
        snippetView(SelectField2View, {
          x: esc(x),
          xContent: x === value ? { selected: true } : {},
          x2: esc(x || 'Pilih salah satu'),
        }),
      ),
    });
  }

  const review = reviewView;

  const heading = headingView;

  function stat(label, value, ico, note, route) {
    return snippetView(StatView, {
      label: label,
      icon: icon(ico),
      fieldValue: value,
      note: note,
      route: route,
    });
  }

  function activity(title, date, value, status, ico) {
    return snippetView(ActivityView, {
      icon: icon(ico),
      title: title,
      date: date,
      fieldValue: value,
      status: status,
    });
  }

  function tabs(items, current, name) {
    return snippetView(TabsView, {
      fieldName: name,
      itemsRows: items.map((item) =>
        snippetView(Tabs2View, {
          current: current === item,
          fieldName: name,
          item: item,
          itemValue: item,
        }),
      ),
    });
  }
  return {
    esc,
    rupiah,
    paths,
    icon,
    logo,
    badge,
    navLink,
    demoStrip,
    field,
    selectField,
    review,
    heading,
    stat,
    activity,
    tabs,
  };
}
