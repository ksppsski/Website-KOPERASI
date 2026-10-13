import Portal from '../Portal.svelte';
import { createPortal } from '../../../shared/create-portal.js';
import { initializeMemberPortal } from '../features/member/controller.js';

initializeMemberPortal(createPortal(Portal));
