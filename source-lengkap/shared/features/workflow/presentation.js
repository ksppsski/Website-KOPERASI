import {
  StatusView,
  AuthView,
  FrameView,
  EmptyView,
  LinksView,
  Links2View,
  Links3View,
  Checks2View,
  ChecksView,
  InputView,
} from './views/presentation.svelte';
import { displayText, formatMoney, formatDate } from '../../lib/formatters.js';
import { view, snippetView } from '../../runtime/view.js';

import WorkflowAction from '../../components/workflow/WorkflowAction.svelte';

/**
 * Format label, elemen dialog, dan status pengajuan.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */
import { statusColor } from '../../lib/status-colors.js';
export const esc = displayText;

export const money = formatMoney;

export const date = formatDate;

export const shortId = (item) =>
  (item.kind === 'capital' ? 'PM-' : item.kind === 'savings' ? 'SW-' : 'PD-') +
  item.id.slice(0, 8).toUpperCase();

export const workStage = (item) =>
  item.status === 'ready'
    ? 'generate'
    : ['generated', 'signed'].includes(item.status)
      ? 'archive'
      : item.kind;

export const needsCorrection = (item) =>
  item?.status === 'correction' ||
  (['pending', 'reviewing'].includes(item?.status) && item?.finance?.status === 'correction');

export const status = (item) =>
  snippetView(StatusView, {
    statusColor: statusColor(needsCorrection(item) ? 'correction' : item.statusLabel),
    statusLabel: esc(item.statusLabel),
  });

export const action = (name, id, label, primary = false) =>
  view(WorkflowAction, { name, id: id || '', label, primary });

export const auth = () => snippetView(AuthView);

export function frame(key, title) {
  return snippetView(FrameView, {
    title: title,
    action: action('refresh', '', 'Perbarui'),
    key: key,
  });
}

export function empty(text) {
  return snippetView(EmptyView, { text: text });
}

export function links(item, staff = false) {
  return [
    item.proofUrl ? snippetView(LinksView, { proofUrl: item.proofUrl }) : '',
    item.signedUrl
      ? snippetView(Links2View, { signedUrl: item.signedUrl })
      : item.contractUrl && staff
        ? snippetView(Links3View, { contractUrl: item.contractUrl })
        : '',
  ];
}

export function checks(items) {
  return snippetView(ChecksView, {
    itemsRows: items.map(([name, label]) =>
      snippetView(Checks2View, { fieldName: name, label: label }),
    ),
  });
}

export function input(label, name, value = '', type = 'text', extra = '') {
  return snippetView(InputView, {
    label: label,
    fieldName: name,
    type: type,
    fieldValue: esc(value),
    extra: extra,
  });
}

export function createWorkflowPresentation({ app, staff }) {
  return {
    esc,
    money,
    date,
    shortId,
    workStage,
    needsCorrection,
    status,
    action,
    auth,
    frame,
    empty,
    checks,
    input,
    workPanel: (id, stage) => (staff ? app.services.activity?.panel(id, stage) || null : null),
    links: (item) => links(item, staff),
  };
}
