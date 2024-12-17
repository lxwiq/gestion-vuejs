<script setup>
import { ref, onMounted, computed } from 'vue';
import { useProjectStore } from '../stores/projects';
import { useAuthStore } from '../stores/auth';

const projectStore = useProjectStore();
const authStore = useAuthStore();

// Charger les projets et tâches au montage
onMounted(async () => {
  if (authStore.currentUser) {
    await projectStore.fetchDeveloperTasks(authStore.currentUser.id);
  }
});

// Filtrer les projets avec des tâches assignées
const myProjects = computed(() => {
  return projectStore.projects.filter(project => {
    return projectStore.tasks.some(task =>
      task.projectId === project.id &&
      task.assignedTo === authStore.currentUser.id
    );
  });
});

// Obtenir les tâches d'un projet spécifique
function getProjectTasks(projectId) {
  return projectStore.tasks.filter(task =>
    task.projectId === projectId &&
    task.assignedTo === authStore.currentUser.id
  );
}

// Calculer le statut global des tâches assignées
const taskStats = computed(() => {
  const myTasks = projectStore.tasks.filter(task =>
    task.assignedTo === authStore.currentUser.id
  );

  const total = myTasks.length;
  const completed = myTasks.filter(t => t.status === 'validated' || t.status === 'completed').length;
  const pending = myTasks.filter(t => t.status === 'pending').length;
  const inProgress = myTasks.filter(t => t.status === 'in_progress').length;
  const overdue = myTasks.filter(t =>
    new Date(t.deadline) < new Date() &&
    t.status !== 'validated' &&
    t.status !== 'completed'
  ).length;

  return {
    total,
    completed,
    pending,
    inProgress,
    overdue,
    progress: total ? Math.round((completed / total) * 100) : 0
  };
});

// Ajouter une fonction pour marquer une tâche comme complétée
async function handleCompleteTask(taskId) {
  try {
    await projectStore.completeTask(taskId);
    await projectStore.fetchDeveloperTasks(authStore.currentUser.id);
  } catch (error) {
    alert(error.message);
  }
}

// Ajouter un filtre pour les tâches
const taskFilter = ref('all');
const filterLabels = {
  'all': 'Toutes',
  'pending': 'En attente',
  'in_progress': 'En cours',
  'completed': 'Terminées',
  'validated': 'Validées',
  'overdue': 'En retard'
};

// Filtrer les tâches selon le statut
const filteredTasks = computed(() => {
  const myTasks = projectStore.tasks.filter(task =>
    task.assignedTo === authStore.currentUser.id
  );

  switch (taskFilter.value) {
    case 'pending':
      return myTasks.filter(t => t.status === 'pending');
    case 'in_progress':
      return myTasks.filter(t => t.status === 'in_progress');
    case 'completed':
      return myTasks.filter(t => t.status === 'completed');
    case 'validated':
      return myTasks.filter(t => t.status === 'validated');
    case 'overdue':
      return myTasks.filter(t =>
        new Date(t.deadline) < new Date() &&
        t.status !== 'validated' &&
        t.status !== 'completed'
      );
    default:
      return myTasks;
  }
});

// Fonction pour obtenir le projet d'une tâche
function getProjectName(projectId) {
  const project = projectStore.projects.find(p => p.id === projectId);
  return project ? project.name : 'Projet inconnu';
}
</script>

<template>
  <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
    <div class="px-4 py-6 sm:px-0">
      <!-- En-tête avec statistiques -->
      <div class="mb-8">
        <h2 class="text-2xl font-bold mb-6">Tableau de bord Développeur</h2>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="bg-white p-4 rounded-lg shadow">
            <div class="text-sm text-gray-500">Tâches totales</div>
            <div class="text-2xl font-bold">{{ taskStats.total }}</div>
          </div>
          <div class="bg-white p-4 rounded-lg shadow">
            <div class="text-sm text-gray-500">En cours</div>
            <div class="text-2xl font-bold text-yellow-600">{{ taskStats.inProgress }}</div>
          </div>
          <div class="bg-white p-4 rounded-lg shadow">
            <div class="text-sm text-gray-500">Terminées</div>
            <div class="text-2xl font-bold text-green-600">{{ taskStats.completed }}</div>
          </div>
          <div class="bg-white p-4 rounded-lg shadow">
            <div class="text-sm text-gray-500">En retard</div>
            <div class="text-2xl font-bold text-red-600">{{ taskStats.overdue }}</div>
          </div>
        </div>
      </div>

      <!-- Filtres des tâches -->
      <div class="bg-white shadow rounded-lg overflow-hidden">
        <div class="px-4 py-5 sm:p-6">
          <div class="flex justify-between items-center mb-6">
            <h3 class="text-lg font-medium text-gray-900">Mes tâches</h3>
            <div class="flex space-x-2">
              <button
                v-for="(label, filter) in filterLabels"
                :key="filter"
                @click="taskFilter = filter"
                :class="[
                  'px-3 py-2 rounded-md text-sm font-medium',
                  taskFilter === filter
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-500 hover:bg-gray-100'
                ]"
              >
                {{ label }}
              </button>
            </div>
          </div>

          <!-- Liste des tâches -->
          <div class="space-y-4">
            <div
              v-for="task in filteredTasks"
              :key="task.id"
              class="border rounded-lg p-4"
              :class="{
                'border-yellow-200 bg-yellow-50': task.status === 'in_progress',
                'border-green-200 bg-green-50': task.status === 'validated',
                'border-blue-200 bg-blue-50': task.status === 'completed',
                'border-red-200 bg-red-50': new Date(task.deadline) < new Date() && task.status !== 'validated'
              }"
            >
              <div class="flex justify-between items-start">
                <div>
                  <div class="text-sm text-gray-500 mb-1">
                    {{ getProjectName(task.projectId) }}
                  </div>
                  <h4 class="font-medium text-gray-900">{{ task.title }}</h4>
                  <p class="mt-1 text-sm text-gray-500">{{ task.description }}</p>
                  <div class="mt-2 flex items-center space-x-4">
                    <span
                      :class="{
                        'bg-yellow-100 text-yellow-800': task.priority === 'medium',
                        'bg-red-100 text-red-800': task.priority === 'high',
                        'bg-green-100 text-green-800': task.priority === 'low'
                      }"
                      class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    >
                      {{ task.priority }}
                    </span>
                    <span class="text-sm text-gray-500">
                      Échéance: {{ new Date(task.deadline).toLocaleDateString() }}
                    </span>
                    <span
                      :class="{
                        'text-yellow-600': task.status === 'in_progress',
                        'text-green-600': task.status === 'validated',
                        'text-blue-600': task.status === 'completed',
                        'text-gray-600': task.status === 'pending'
                      }"
                      class="text-sm font-medium"
                    >
                      {{ filterLabels[task.status] }}
                    </span>
                  </div>
                </div>
                <div class="flex space-x-2">
                  <button
                    v-if="task.status !== 'completed' && task.status !== 'validated'"
                    @click="handleCompleteTask(task.id)"
                    class="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                  >
                    <svg class="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Terminer
                  </button>
                  <router-link
                    :to="`/projects/${task.projectId}`"
                    class="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Voir le projet
                  </router-link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Liste des projets -->
      <div class="mt-8">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Mes projets</h3>
        <div v-if="myProjects.length === 0" class="text-center py-12">
          <p class="text-gray-500">Aucune tâche ne vous est assignée pour le moment.</p>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="project in myProjects"
            :key="project.id"
            class="bg-white shadow rounded-lg overflow-hidden"
          >
            <div class="px-4 py-5 sm:p-6">
              <div class="flex justify-between items-center mb-4">
                <h4 class="text-lg font-medium text-gray-900">{{ project.name }}</h4>
                <router-link
                  :to="`/projects/${project.id}`"
                  class="text-indigo-600 hover:text-indigo-900 text-sm"
                >
                  Voir les détails
                </router-link>
              </div>
              <p class="text-sm text-gray-500 mb-4">{{ project.description }}</p>

              <!-- Tâches du projet -->
              <div class="space-y-3">
                <div
                  v-for="task in getProjectTasks(project.id)"
                  :key="task.id"
                  class="border rounded-lg p-3"
                  :class="{
                    'border-yellow-200 bg-yellow-50': task.status === 'in_progress',
                    'border-green-200 bg-green-50': task.status === 'validated',
                    'border-blue-200 bg-blue-50': task.status === 'completed',
                    'border-red-200 bg-red-50': new Date(task.deadline) < new Date() && task.status !== 'validated'
                  }"
                >
                  <div class="flex justify-between items-start">
                    <div>
                      <h5 class="font-medium text-gray-900">{{ task.title }}</h5>
                      <p class="mt-1 text-sm text-gray-500">{{ task.description }}</p>
                      <div class="mt-2 flex items-center space-x-2">
                        <span
                          :class="{
                            'bg-yellow-100 text-yellow-800': task.priority === 'medium',
                            'bg-red-100 text-red-800': task.priority === 'high',
                            'bg-green-100 text-green-800': task.priority === 'low'
                          }"
                          class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                        >
                          {{ task.priority }}
                        </span>
                        <span class="text-sm text-gray-500">
                          {{ new Date(task.deadline).toLocaleDateString() }}
                        </span>
                      </div>
                    </div>
                    <button
                      v-if="task.status !== 'completed' && task.status !== 'validated'"
                      @click="handleCompleteTask(task.id)"
                      class="inline-flex items-center p-1 border border-transparent rounded-full shadow-sm text-white bg-green-600 hover:bg-green-700"
                    >
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
