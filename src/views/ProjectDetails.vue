<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useProjectStore } from '../stores/projects';
import { useAuthStore } from '../stores/auth';
import { db } from '../db/db';

const route = useRoute();
const router = useRouter();
const projectStore = useProjectStore();
const authStore = useAuthStore();

const project = ref(null);
const users = ref([]);
const showEditForm = ref(false);
const showNewTaskForm = ref(false);
const showEditTaskForm = ref(false);
const editingTask = ref(null);

// Formulaire d'édition du projet
const editForm = ref({
  name: '',
  description: ''
});

// Formulaire de nouvelle tâche
const newTask = ref({
  title: '',
  description: '',
  deadline: '',
  priority: 'medium'
});

// Récupérer les développeurs pour l'assignation
async function fetchUsers() {
  users.value = await db.users.toArray();
}

// Vérifier si l'utilisateur actuel est manager de ce projet
const isProjectManager = computed(() => {
  return project.value?.managedBy?.includes(authStore.currentUser?.id);
});

// Charger les données du projet et ses tâches
async function loadProjectData() {
  const projectId = Number(route.params.id);
  project.value = await db.projects.get(projectId);
  await projectStore.fetchProjectTasks(projectId);
  await fetchUsers();
}

onMounted(loadProjectData);

// Gestion du projet
async function handleEditProject() {
  try {
    await projectStore.updateProject(project.value.id, editForm.value);
    showEditForm.value = false;
    await loadProjectData();
  } catch (error) {
    alert(error.message);
  }
}

async function handleDeleteProject() {
  if (confirm('Êtes-vous sûr de vouloir supprimer ce projet ?')) {
    await projectStore.deleteProject(project.value.id);
    router.push('/manager-dashboard');
  }
}

// Gestion des tâches
async function handleCreateTask() {
  try {
    await projectStore.createTask({
      ...newTask.value,
      projectId: project.value.id
    });
    showNewTaskForm.value = false;
    newTask.value = { title: '', description: '', deadline: '', priority: 'medium' };
  } catch (error) {
    alert(error.message);
  }
}

async function handleDeleteTask(taskId) {
  if (confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) {
    await projectStore.deleteTask(taskId);
  }
}

// Fonction pour gérer l'assignation d'une tâche
async function handleAssignTask(taskId, developerId) {
  try {
    await projectStore.assignTask(taskId, developerId || null);
    // Recharger les données pour mettre à jour l'interface
    await projectStore.fetchProjectTasks(project.value.id);
  } catch (error) {
    alert('Erreur lors de l\'assignation de la tâche');
  }
}

async function handleValidateTask(taskId) {
  await projectStore.validateTask(taskId);
}

// Statistiques et filtres
const tasksByStatus = computed(() => {
  const tasks = projectStore.tasks;
  return {
    pending: tasks.filter(t => t.status === 'pending'),
    inProgress: tasks.filter(t => t.status === 'in_progress'),
    completed: tasks.filter(t => t.status === 'validated'),
    overdue: tasks.filter(t => new Date(t.deadline) < new Date() && t.status !== 'validated')
  };
});

const projectStats = computed(() => {
  return projectStore.getProjectStats(project.value?.id);
});

// Fonction pour éditer une tâche
function startEditTask(task) {
  editingTask.value = { ...task };
  showEditTaskForm.value = true;
}

async function handleEditTask() {
  try {
    await projectStore.updateTask(editingTask.value.id, editingTask.value);
    showEditTaskForm.value = false;
    editingTask.value = null;
  } catch (error) {
    alert(error.message);
  }
}

// Ajouter un objet pour la traduction des filtres
const filterLabels = {
  'all': 'Toutes',
  'pending': 'En attente',
  'in_progress': 'En cours',
  'validated': 'Validées',
  'overdue': 'En retard'
};

const taskFilter = ref('all');

const filteredTasks = computed(() => {
  let tasks = projectStore.tasks;

  switch (taskFilter.value) {
    case 'pending':
      return tasks.filter(t => t.status === 'pending');
    case 'in_progress':
      return tasks.filter(t => t.status === 'in_progress');
    case 'validated':
      return tasks.filter(t => t.status === 'validated');
    case 'overdue':
      return tasks.filter(t => new Date(t.deadline) < new Date() && t.status !== 'validated');
    default:
      return tasks;
  }
});

// Ajouter une ref pour stocker la liste des développeurs
const developers = ref([]);

// Charger la liste des développeurs
async function fetchDevelopers() {
  developers.value = await db.users
    .filter(user => user.roles.includes('developer'))
    .toArray();
}

// Modifier la fonction onMounted pour charger les développeurs
onMounted(async () => {
  const projectId = Number(route.params.id);
  project.value = await db.projects.get(projectId);
  await projectStore.fetchProjectTasks(projectId);
  await fetchDevelopers();
});

// Fonction pour obtenir le nom du développeur assigné
function getDeveloperEmail(developerId) {
  const developer = developers.value.find(dev => dev.id === developerId);
  return developer ? developer.email : 'Non assigné';
}

// Ajouter une fonction pour vérifier le statut d'une tâche
function getTaskStatus(task) {
  if (task.status === 'validated') return 'validated';
  if (task.assignedTo) return 'in_progress';
  return 'pending';
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div v-if="project" class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <!-- En-tête du projet avec navigation -->
      <div class="bg-white shadow-sm rounded-lg mb-6">
        <div class="px-6 py-4">
          <div class="flex justify-between items-center">
            <div>
              <h2 class="text-3xl font-bold text-gray-900">{{ project.name }}</h2>
              <p class="mt-1 text-gray-500">{{ project.description }}</p>
            </div>
            <div class="flex items-center space-x-3">
              <button
                v-if="isProjectManager"
                @click="showEditForm = true"
                class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Modifier
              </button>
              <button
                v-if="isProjectManager"
                @click="handleDeleteProject"
                class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Supprimer
              </button>
            </div>
          </div>
          <div class="mt-4 flex items-center space-x-2">
            <span class="text-sm text-gray-500">Managers :</span>
            <div class="flex space-x-2">
              <span
                v-for="managerId in project.managedBy"
                :key="managerId"
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
              >
                {{ users.find(u => u.id === managerId)?.email }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Statistiques du projet -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div class="bg-white overflow-hidden shadow-sm rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0 bg-indigo-500 rounded-md p-3">
                <svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Progression</dt>
                  <dd class="flex items-baseline">
                    <div class="text-2xl font-semibold text-gray-900">{{ projectStats.progress }}%</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div class="bg-gray-50 px-5 py-3">
            <div class="text-sm">
              <div class="relative pt-1">
                <div class="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                  <div
                    :style="{ width: `${projectStats.progress}%` }"
                    class="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-500"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white overflow-hidden shadow-sm rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0 bg-green-500 rounded-md p-3">
                <svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Tâches complétées</dt>
                  <dd class="text-2xl font-semibold text-gray-900">{{ projectStats.completed }}/{{ projectStats.total }}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white overflow-hidden shadow-sm rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                <svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">En cours</dt>
                  <dd class="text-2xl font-semibold text-gray-900">{{ tasksByStatus.inProgress.length }}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white overflow-hidden shadow-sm rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0 bg-red-500 rounded-md p-3">
                <svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">En retard</dt>
                  <dd class="text-2xl font-semibold text-red-600">{{ projectStats.overdue }}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Gestion des tâches -->
      <div class="bg-white shadow-sm rounded-lg">
        <div class="border-b border-gray-200">
          <div class="px-6 py-4 flex justify-between items-center">
            <h3 class="text-lg font-medium text-gray-900">Tâches</h3>
            <button
              v-if="isProjectManager"
              @click="showNewTaskForm = true"
              class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              Nouvelle tâche
            </button>
          </div>
        </div>

        <!-- Filtres des tâches -->
        <div class="mb-4 flex space-x-2">
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

        <div class="divide-y divide-gray-200">
          <div
            v-for="task in filteredTasks"
            :key="task.id"
            :class="[
              'px-6 py-4 hover:bg-gray-50',
              new Date(task.deadline) < new Date() && task.status !== 'validated' ? 'bg-red-50' : ''
            ]"
          >
            <div class="flex items-center justify-between">
              <div class="min-w-0 flex-1">
                <div class="flex items-center space-x-3">
                  <div
                    :class="{
                      'bg-gray-100': task.status === 'pending',
                      'bg-yellow-100': task.status === 'in_progress',
                      'bg-green-100': task.status === 'validated'
                    }"
                    class="flex-shrink-0 w-2.5 h-2.5 rounded-full"
                  ></div>
                  <h4 class="text-sm font-medium text-gray-900">{{ task.title }}</h4>
                </div>
                <div class="mt-2">
                  <p class="text-sm text-gray-500">{{ task.description }}</p>
                  <div class="mt-2 flex items-center space-x-4 text-sm text-gray-500">
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
                    <span>Échéance: {{ new Date(task.deadline).toLocaleDateString() }}</span>
                  </div>
                </div>
              </div>
              <div v-if="isProjectManager" class="ml-4 flex items-center space-x-4">
                <select
                  v-model="task.assignedTo"
                  @change="handleAssignTask(task.id, $event.target.value)"
                  class="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                  <option value="">Non assigné</option>
                  <option
                    v-for="user in users.filter(u => u.roles.includes('developer'))"
                    :key="user.id"
                    :value="user.id"
                  >
                    {{ user.email }}
                  </option>
                </select>
                <button
                  v-if="task.status !== 'validated'"
                  @click="handleValidateTask(task.id)"
                  class="inline-flex items-center p-1 border border-transparent rounded-full shadow-sm text-white bg-green-600 hover:bg-green-700"
                >
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <button
                  @click="handleDeleteTask(task.id)"
                  class="inline-flex items-center p-1 border border-transparent rounded-full shadow-sm text-white bg-red-600 hover:bg-red-700"
                >
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <button
                  v-if="isProjectManager"
                  @click="startEditTask(task)"
                  class="inline-flex items-center p-1 border border-transparent rounded-full shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal d'édition du projet -->
      <div
        v-if="showEditForm"
        class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center"
      >
        <div class="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
          <div class="px-6 py-4 border-b border-gray-200">
            <h3 class="text-lg font-medium text-gray-900">Modifier le projet</h3>
          </div>
          <form @submit.prevent="handleEditProject" class="p-6">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700">Nom du projet</label>
                <input
                  v-model="editForm.name"
                  type="text"
                  required
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  v-model="editForm.description"
                  rows="3"
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                ></textarea>
              </div>
            </div>
            <div class="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                @click="showEditForm = false"
                class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal de nouvelle tâche -->
      <div
        v-if="showNewTaskForm"
        class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center"
      >
        <div class="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
          <div class="px-6 py-4 border-b border-gray-200">
            <h3 class="text-lg font-medium text-gray-900">Nouvelle tâche</h3>
          </div>
          <form @submit.prevent="handleCreateTask" class="p-6">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700">Titre</label>
                <input
                  v-model="newTask.title"
                  type="text"
                  required
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  v-model="newTask.description"
                  rows="3"
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                ></textarea>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700">Date limite</label>
                  <input
                    v-model="newTask.deadline"
                    type="date"
                    required
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700">Priorité</label>
                  <select
                    v-model="newTask.priority"
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="low">Basse</option>
                    <option value="medium">Moyenne</option>
                    <option value="high">Haute</option>
                  </select>
                </div>
              </div>
            </div>
            <div class="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                @click="showNewTaskForm = false"
                class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Créer
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal d'édition de tâche -->
      <div
        v-if="showEditTaskForm && editingTask"
        class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center"
      >
        <div class="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
          <div class="px-6 py-4 border-b border-gray-200">
            <h3 class="text-lg font-medium text-gray-900">Modifier la tâche</h3>
          </div>
          <form @submit.prevent="handleEditTask" class="p-6">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700">Titre</label>
                <input
                  v-model="editingTask.title"
                  type="text"
                  required
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  v-model="editingTask.description"
                  rows="3"
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                ></textarea>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700">Date limite</label>
                  <input
                    v-model="editingTask.deadline"
                    type="date"
                    required
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700">Priorité</label>
                  <select
                    v-model="editingTask.priority"
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="low">Basse</option>
                    <option value="medium">Moyenne</option>
                    <option value="high">Haute</option>
                  </select>
                </div>
              </div>
            </div>
            <div class="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                @click="showEditTaskForm = false"
                class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
