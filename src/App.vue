<script setup>
import { useAuthStore } from './stores/auth'
import Navbar from './components/Navbar.vue'

const authStore = useAuthStore()
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <Navbar v-if="authStore.isAuthenticated" />
    <main>
      <router-view></router-view>
    </main>
  </div>
</template>
