import { mount } from 'svelte';
import '@fontsource-variable/inter';

import './reset.css';
import './theme.css';

import App from './App.svelte';

mount(App, { target: document.body });
