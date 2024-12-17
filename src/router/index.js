import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import LoginForm from '../components/LoginForm.vue';

const routes = [
  {
    path: '/',
    name: 'login',
    component: LoginForm,
    meta: { requiresAuth: false }
  },
  {
    path: '/manager-dashboard',
    name: 'manager-dashboard',
    component: () => import('../views/ManagerDashboard.vue'),
    meta: {
      requiresAuth: true,
      requiresManager: true
    }
  },
  {
    path: '/developer-dashboard',
    name: 'developer-dashboard',
    component: () => import('../views/DeveloperDashboard.vue'),
    meta: {
      requiresAuth: true,
      requiresDeveloper: true
    }
  },
  {
    path: '/projects/:id',
    name: 'project-details',
    component: () => import('../views/ProjectDetails.vue'),
    meta: {
      requiresAuth: true
    }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/');
  } else if (to.meta.requiresManager && !authStore.currentUser?.roles.includes('manager')) {
    next('/developer-dashboard');
  } else if (to.meta.requiresDeveloper && !authStore.currentUser?.roles.includes('developer')) {
    next('/manager-dashboard');
  } else if (to.path === '/' && authStore.isAuthenticated) {
    if (authStore.currentUser?.roles.includes('manager')) {
      next('/manager-dashboard');
    } else {
      next('/developer-dashboard');
    }
  } else {
    next();
  }
});

export default router;
