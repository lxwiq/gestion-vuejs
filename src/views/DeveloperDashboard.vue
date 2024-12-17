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

// Filtrer les projets actifs
const myProjects = computed(() => {
  return projectStore.projects.filter(project => {
    const projectTasks = projectStore.tasks.filter(task =>
      task.projectId === project.id &&
      task.assignedTo === authStore.currentUser.id
    );
    return projectTasks.length > 0;
  });
});

// Obtenir les tâches d'un projet spécifique
function getProjectTasks(projectId) {
  return projectStore.tasks.filter(task =>
    task.projectId === projectId &&
    task.assignedTo === authStore.currentUser.id
  );
}

// Calculer le statut global des tâches
const taskStats = computed(() => {
  const total = projectStore.tasks.length;
  const completed = projectStore.tasks.filter(t => t.status === 'validated').length;
  const pending = projectStore.tasks.filter(t => t.status === 'pending').length;
  const inProgress = projectStore.tasks.filter(t => t.status === 'in_progress').length;
  const overdue = projectStore.tasks.filter(t =>
    new Date(t.deadline) < new Date() &&
    t.status !== 'validated'
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

      <!-- Liste des projets -->
      <div v-if="myProjects.length === 0" class="text-center py-12">
        <p class="text-gray-500">Aucune tâche ne vous est assignée pour le moment.</p>
      </div>

      <div v-else class="space-y-6">
        <div
          v-for="project in myProjects"
          :key="project.id"
          class="bg-white shadow rounded-lg overflow-hidden"
        >
          <div class="px-4 py-5 sm:p-6">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-medium text-gray-900">{{ project.name }}</h3>
              <router-link
                :to="`/projects/${project.id}`"
                class="text-indigo-600 hover:text-indigo-900 text-sm"
              >
                Voir les détails
              </router-link>
            </div>

            <!-- Tâches du projet -->
            <div class="space-y-3">
              <div
                v-for="task in getProjectTasks(project.id)"
                :key="task.id"
                class="border rounded-lg p-3"
                :class="{
                  'border-yellow-200 bg-yellow-50': task.status === 'in_progress',
                  'border-green-200 bg-green-50': task.status === 'validated',
                  'border-red-200 bg-red-50': new Date(task.deadline) < new Date() && task.status !== 'validated'
                }"
              >
                <div class="flex justify-between items-start">
                  <div>
                    <h4 class="font-medium">{{ task.title }}</h4>
                    <p class="text-sm text-gray-500">{{ task.description }}</p>
                  </div>
                  <span
                    :class="{
                      'bg-yellow-100 text-yellow-800': task.priority === 'medium',
                      'bg-red-100 text-red-800': task.priority === 'high',
                      'bg-green-100 text-green-800': task.priority === 'low'
                    }"
                    class="px-2 py-1 text-xs font-medium rounded-full"
                  >
                    {{ task.priority }}
                  </span>
                </div>
                <div class="mt-2 text-sm text-gray-500">
                  Échéance: {{ new Date(task.deadline).toLocaleDateString() }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
