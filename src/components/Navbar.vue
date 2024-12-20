<script setup>
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

async function handleLogout() {
  await authStore.logout()
  router.push('/')
}

function navigateToHome() {
  if (authStore.currentUser?.roles.includes('manager')) {
    router.push('/manager-dashboard')
  } else {
    router.push('/developer-dashboard')
  }
}
</script>

<template>
  <nav class="bg-white shadow-lg">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16">
        <!-- Logo et Navigation principale -->
        <div class="flex">
          <div class="flex-shrink-0 flex items-center cursor-pointer" @click="navigateToHome">
            <svg
              class="h-8 w-8 text-indigo-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
            <span class="ml-2 text-xl font-bold text-gray-900">Gestion Projets</span>
          </div>

          <div class="hidden sm:ml-6 sm:flex sm:space-x-8">
            <router-link
              v-if="authStore.currentUser?.roles.includes('manager')"
              to="/manager-dashboard"
              class="inline-flex items-center px-1 pt-1 text-sm font-medium"
              :class="[
                $route.path === '/manager-dashboard'
                  ? 'border-b-2 border-indigo-500 text-gray-900'
                  : 'text-gray-500 hover:border-b-2 hover:border-gray-300',
              ]"
            >
              Tableau de bord Manager
            </router-link>
            <router-link
              v-if="authStore.currentUser?.roles.includes('developer')"
              to="/developer-dashboard"
              class="inline-flex items-center px-1 pt-1 text-sm font-medium"
              :class="[
                $route.path === '/developer-dashboard'
                  ? 'border-b-2 border-indigo-500 text-gray-900'
                  : 'text-gray-500 hover:border-b-2 hover:border-gray-300',
              ]"
            >
              Mes Projets
            </router-link>
          </div>
        </div>

        <!-- Menu utilisateur -->
        <div class="flex items-center">
          <div class="hidden sm:flex sm:items-center sm:ml-6">
            <div class="relative ml-3">
              <div class="flex items-center space-x-4">
                <div class="text-sm font-medium text-gray-700">
                  {{ authStore.currentUser?.email }}
                  <span
                    v-if="authStore.currentUser?.roles.includes('manager')"
                    class="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                  >
                    Manager
                  </span>
                  <span
                    v-if="authStore.currentUser?.roles.includes('developer')"
                    class="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                  >
                    Developer
                  </span>
                </div>
                <button
                  @click="handleLogout"
                  class="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <svg class="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  Déconnexion
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </nav>
</template>
