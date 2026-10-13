import { mount } from 'svelte';
import Portal from '../Portal.svelte';
import '../../../shared/styles/portal.css';
import '../../../shared/styles/avalist.css';
import '../styles/avalist.css';

mount(Portal, { target: document.getElementById('root') });
