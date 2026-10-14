import Portal from '../Portal.svelte';
import { createPortal } from '../../../shared/create-portal.js';
import { initializeMemberPortal } from '../features/member/controller.js';

const app = createPortal(Portal);
initializeMemberPortal(app);
if (import.meta.hot) import.meta.hot.dispose(() => app.dispose());
