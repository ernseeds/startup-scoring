import { createRouter, createWebHistory } from 'vue-router';
import Form from '@/components/Form.vue';
import Results from '@/components/Results.vue';

const routes = [
  { path: '/', name: 'Home', component: Form },
  { path: '/results', name: 'ResultPage', component: Results }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
