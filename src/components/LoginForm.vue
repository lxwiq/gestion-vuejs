<template>
  <div class="flex items-center justify-center h-screen">
    <div class="w-[500px]">
      <h2 class="text-3xl font-bold text-center mb-8">
        {{ isRegisterMode ? "Inscription" : "Connexion" }}
      </h2>

      <form @submit.prevent="handleSubmit" class="space-y-6">
        <div>
          <input
            v-model="email"
            type="email"
            placeholder="Email"
            required
            class="w-full p-3 border rounded text-lg"
          />
        </div>

        <div>
          <input
            v-model="password"
            type="password"
            placeholder="Mot de passe"
            required
            class="w-full p-3 border rounded text-lg"
          />
        </div>

        <div v-if="isRegisterMode" class="space-y-3">
          <div class="flex items-center">
            <input
              id="developer"
              v-model="roles"
              type="checkbox"
              value="developer"
              class="w-5 h-5 mr-3"
            />
            <label for="developer" class="text-lg">Développeur</label>
          </div>
          <div class="flex items-center">
            <input
              id="manager"
              v-model="roles"
              type="checkbox"
              value="manager"
              class="w-5 h-5 mr-3"
            />
            <label for="manager" class="text-lg">Manager</label>
          </div>
        </div>

        <button
          type="submit"
          class="w-full p-3 bg-indigo-600 text-white rounded text-lg font-medium hover:bg-indigo-700"
        >
          {{ isRegisterMode ? "S'inscrire" : "Se connecter" }}
        </button>
      </form>

      <p class="mt-6 text-center text-lg">
        <a
          href="#"
          @click.prevent="isRegisterMode = !isRegisterMode"
          class="text-indigo-600 hover:text-indigo-500"
        >
          {{ isRegisterMode ? "Déjà inscrit ? Connectez-vous" : "Pas de compte ? Inscrivez-vous" }}
        </a>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useRouter } from 'vue-router';

const router = useRouter();
const authStore = useAuthStore();
const isRegisterMode = ref(false);

const email = ref('');
const password = ref('');
const roles = ref([]);

async function handleSubmit() {
  try {
    const formData = {
      email: email.value,
      password: password.value,
      roles: roles.value
    };

    if (isRegisterMode.value) {
      await authStore.register(formData);
    } else {
      await authStore.login({
        email: email.value,
        password: password.value
      });
    }
    if (authStore.currentUser?.roles.includes('manager')) {
      router.push('/manager-dashboard');
    } else {
      router.push('/projects');
    }
  } catch (error) {
    alert(error.message);
  }
}
</script>
