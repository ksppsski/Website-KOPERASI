import { view } from '../runtime/view.js';
import Badge from '../components/Badge.svelte';
import Icon from '../components/Icon.svelte';
import PageHeading from '../components/PageHeading.svelte';
import ReviewList from '../components/ReviewList.svelte';
import DataTable from '../components/DataTable.svelte';

export const badgeView = (text, variant = '') => view(Badge, { text, variant });
export const iconView = (name) => view(Icon, { name });
export const headingView = (title, description, action = null) =>
  view(PageHeading, { title, description, action });
export const reviewView = (rows) => view(ReviewList, { rows });
export const tableView = (headers, rows, empty) => view(DataTable, { headers, rows, empty });
