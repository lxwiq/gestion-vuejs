<script setup>
import { ref, onMounted, computed } from 'vue';
import { useProjectStore } from '../stores/projects';
import { useAuthStore } from '../stores/auth';

const projectStore = useProjectStore();
const authStore = useAuthStore();

const showNewProjectForm = ref(false);
const newProject = ref({
  name: '',
  description: '',
  startDate: '',
  endDate: '',
  status: 'active',
  priority: 'medium'
});

onMounted(async () => {
  await projectStore.fetchProjects();
});

const isManager = computed(() => {
  return authStore.currentUser?.roles.includes('manager');
});

async function handleCreateProject() {
  try {
    if (new Date(newProject.value.endDate) < new Date(newProject.value.startDate)) {
      throw new Error('La date de fin doit être postérieure à la date de début');
    }

    await projectStore.createProject(newProject.value);
    showNewProjectForm.value = false;
    newProject.value = {
      name: '',
      description: '',
      startDate: '',
      endDate: '',
      status: 'active',
      priority: 'medium'
    };
  } catch (error) {
    alert(error.message);
  }
}

async function handleToggleManager(projectId) {
  await projectStore.toggleProjectManager(projectId, authStore.currentUser.id);
}
</script>

<template>
  <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
    <div class="px-4 py-6 sm:px-0">
      <!-- En-tête avec bouton de création -->
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold">Tableau de bord Manager</h2>
        <button
          v-if="isManager"
          @click="showNewProjectForm = true"
          class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          Nouveau Projet
        </button>
      </div>

      <!-- Formulaire de création de projet -->
      <div v-if="showNewProjectForm" class="mb-6 bg-white p-6 rounded-lg shadow">
        <h3 class="text-lg font-medium mb-4">Créer un nouveau projet</h3>
        <form @submit.prevent="handleCreateProject" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Nom du projet</label>
            <input
              v-model="newProject.name"
              type="text"
              required
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              v-model="newProject.description"
              rows="3"
              required
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            ></textarea>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Date de début</label>
              <input
                v-model="newProject.startDate"
                type="date"
                required
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700">Date de fin prévue</label>
              <input
                v-model="newProject.endDate"
                type="date"
                required
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Statut</label>
              <select
                v-model="newProject.status"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="active">Actif</option>
                <option value="planning">En planification</option>
                <option value="on_hold">En pause</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700">Priorité</label>
              <select
                v-model="newProject.priority"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="low">Basse</option>
                <option value="medium">Moyenne</option>
                <option value="high">Haute</option>
              </select>
            </div>
          </div>

          <div class="flex justify-end space-x-3">
            <button
              type="button"
              @click="showNewProjectForm = false"
              class="bg-gray-200 px-4 py-2 rounded-md hover:bg-gray-300"
            >
              Annuler
            </button>
            <button
              type="submit"
              class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              Créer
            </button>
          </div>
        </form>
      </div>

      <!-- Liste des projets -->
      <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="project in projectStore.projects"
          :key="project.id"
          class="bg-white overflow-hidden shadow rounded-lg"
        >
          <div class="px-4 py-5 sm:p-6">
            <div class="flex justify-between items-start">
              <h3 class="text-lg font-medium text-gray-900">
                {{ project.name }}
              </h3>
              <div class="flex space-x-2">
                <button
                  @click="handleToggleManager(project.id)"
                  :class="[
                    'px-2 py-1 rounded text-sm',
                    project.managedBy?.includes(authStore.currentUser.id)
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  ]"
                >
                  {{ project.managedBy?.includes(authStore.currentUser.id) ? 'Géré' : 'Gérer' }}
                </button>
              </div>
            </div>
            <p class="mt-1 text-sm text-gray-500">
              {{ project.description }}
            </p>
            <div class="mt-4">
              <div class="flex justify-between text-sm">
                <span>Progression</span>
                <span>{{ projectStore.getProjectStats(project.id).progress }}%</span>
              </div>
              <div class="mt-1 relative">
                <div class="h-2 bg-gray-200 rounded">
                  <div
                    class="h-2 bg-indigo-600 rounded"
                    :style="{ width: `${projectStore.getProjectStats(project.id).progress}%` }"
                  ></div>
                </div>
              </div>
              <div class="mt-2 flex justify-between text-sm">
                <span>Tâches: {{ projectStore.getProjectStats(project.id).completed }}/{{ projectStore.getProjectStats(project.id).total }}</span>
                <span
                  v-if="projectStore.getProjectStats(project.id).atRisk"
                  class="text-red-600"
                >
                  {{ projectStore.getProjectStats(project.id).overdue }} en retard
                </span>
              </div>
            </div>
          </div>
          <div class="bg-gray-50 px-4 py-4 sm:px-6">
            <router-link
              :to="`/projects/${project.id}`"
              class="text-indigo-600 hover:text-indigo-900"
            >
              Voir les détails
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
