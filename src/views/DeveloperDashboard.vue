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

// Obtenir les projets du développeur
const developerProjects = computed(() => {
  return projectStore.projects.filter(project =>
    project.assignedDevelopers?.includes(authStore.currentUser?.id)
  );
});

// Filtrer les tâches selon le statut
const taskFilter = ref('all');

const filterLabels = {
  'all': 'Toutes',
  'pending': 'En attente',
  'in_progress': 'En cours',
  'completed': 'Terminées',
  'validated': 'Validées',
  'overdue': 'En retard'
};

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

// Filtrer les tâches selon le statut sélectionné
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

// Fonction pour obtenir le nom du projet
function getProjectName(projectId) {
  const project = projectStore.projects.find(p => p.id === projectId);
  return project ? project.name : 'Projet inconnu';
}

// Fonction pour marquer une tâche comme terminée
async function handleCompleteTask(taskId) {
  try {
    await projectStore.completeTask(taskId);
    await projectStore.fetchDeveloperTasks(authStore.currentUser.id);
  } catch (error) {
    alert(error.message);
  }
}
</script>

<template>
  <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
    <div class="px-4 py-6 sm:px-0">
      <!-- Projets assignés -->
      <div class="mb-8">
        <h2 class="text-2xl font-bold mb-6">Mes Projets</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="project in developerProjects"
            :key="project.id"
            class="bg-white overflow-hidden shadow rounded-lg"
          >
            <div class="px-4 py-5 sm:p-6">
              <div class="flex justify-between items-start">
                <h3 class="text-lg font-medium text-gray-900">
                  {{ project.name }}
                </h3>
                <span
                  :class="{
                    'bg-green-100 text-green-800': project.status === 'active',
                    'bg-yellow-100 text-yellow-800': project.status === 'planning',
                    'bg-gray-100 text-gray-800': project.status === 'on_hold'
                  }"
                  class="px-2 py-1 text-xs font-medium rounded-full"
                >
                  {{ project.status }}
                </span>
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
                <div class="mt-2 flex justify-between text-sm text-gray-500">
                  <span>
                    Du {{ new Date(project.startDate).toLocaleDateString() }}
                    au {{ new Date(project.endDate).toLocaleDateString() }}
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

        <!-- Message si aucun projet -->
        <div v-if="developerProjects.length === 0" class="text-center py-12 bg-white rounded-lg shadow">
          <p class="text-gray-500">Vous n'êtes assigné à aucun projet pour le moment.</p>
        </div>
      </div>

      <!-- Section des tâches existante -->
      <div class="mb-8">
        <h2 class="text-2xl font-bold mb-6">Mes Tâches</h2>
        <!-- Statistiques -->
        <div class="mb-8">

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

        <!-- Filtres et Liste des tâches -->
        <div class="bg-white shadow rounded-lg overflow-hidden">
          <div class="px-4 py-5 sm:p-6">
            <!-- Filtres -->
            <div class="flex space-x-2 mb-6">
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
                    </div>
                  </div>
                  <button
                    v-if="task.status !== 'completed' && task.status !== 'validated'"
                    @click="handleCompleteTask(task.id)"
                    class="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                  >
                    Terminer
                  </button>
                </div>
              </div>
            </div>

            <!-- Message si aucune tâche -->
            <div v-if="filteredTasks.length === 0" class="text-center py-12">
              <p class="text-gray-500">Aucune tâche ne correspond aux critères sélectionnés.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
