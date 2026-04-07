import { createApp } from 'vue';
import './index.css';
import App from './App.vue';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');
createApp(App).mount(root);
