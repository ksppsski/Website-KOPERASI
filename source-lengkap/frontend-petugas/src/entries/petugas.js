import Portal from '../Portal.svelte';
import { createPortal } from '../../../shared/create-portal.js';
import { initializeStaffPortal } from '../features/staff/controller.js';
import { initializeStaffAccess } from '../features/staff-access/controller.js';
import { initializeActivity } from '../features/activity/controller.js';
import { initializeFinance } from '../features/finance/controller.js';
import '../styles/petugas.css';

const app = createPortal(Portal);
initializeStaffAccess(app);
initializeActivity(app);
initializeFinance(app);
initializeStaffPortal(app);

if (import.meta.hot) import.meta.hot.dispose(() => app.dispose());
