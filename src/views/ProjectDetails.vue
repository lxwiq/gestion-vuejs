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
  priority: 'medium',
  assignedTo: '',
  projectId: Number(route.params.id),
  estimatedHours: 0,
  type: 'feature',
  status: 'pending',
  dependencies: [],
  tags: [],
  subtasks: []
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
  try {
    // D'abord, récupérer le projet
   // const projects = await projectStore.fetchProjects();
    //console.log(projectStore.projects.find(p => p.id === route.params.id));
    project.value = projectStore.projects.find(p => p.id === route.params.id);

    if (!project.value) {
      throw new Error('Projet non trouvé');
    }

    // Ensuite, récupérer les tâches du projet
    await projectStore.fetchProjectTasks(route.params.id);
  } catch (error) {
    console.error('Erreur lors du chargement du projet:', error);
  }
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
    if (!newTask.value.assignedTo) {
      throw new Error('Veuillez assigner la tâche à un développeur');
    }

    // Vérifier que tous les champs requis sont présents
    if (!newTask.value.title || !newTask.value.description || !newTask.value.deadline) {
      throw new Error('Veuillez remplir tous les champs obligatoires');
    }

    // Créer une copie de la tâche avec le projectId converti en nombre
    const taskToCreate = {
      ...newTask.value,
      taskId: crypto.randomUUID(),
      projectId: Number(route.params.id) // Conversion explicite en nombre
    };

    console.log('Données de la nouvelle tâche:', taskToCreate);

    // Utiliser le store pour créer la tâche
    await projectStore.createTask(taskToCreate);

    // Réinitialiser le formulaire
    newTask.value = {
      title: '',
      taskId: '',
      description: '',
      deadline: '',
      priority: 'medium',
      assignedTo: '',
      projectId: route.params.id,
      estimatedHours: 0,
      type: 'feature',
      status: 'pending',
      dependencies: [],
      tags: [],
      subtasks: []
    };

    showNewTaskForm.value = false;
    await loadProjectData(); // Recharger les données du projet
  } catch (error) {
    console.error('Erreur lors de la création de la tâche:', error);
    alert(error.message || 'Erreur lors de la création de la tâche');
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

  console.log('Project value:', project.value);
  console.log('Project developers:', project.value?.developers);

  // Récupérer d'abord tous les développeurs
  const allUsers = await db.users.toArray();

  console.log('All users:', allUsers);

  // Filtrer les développeurs du projet
  /*developers.value = allUsers.filter(user =>
    user.roles.includes('developer') &&
    (project.value?.developer || []).includes(user.id)
  );*/
  developers.value = allUsers.filter(user =>
    user.roles.includes('developer')
  );

  console.log('Filtered developers:', developers.value);
}

// Modifier la fonction onMounted pour s'assurer que le projet est chargé avant les développeurs
onMounted(async () => {
  try {

    const projectId = route.params.id;

    //console.log('oki' + db.projects.get(projectId));

    project.value = await db.projects.get(projectId);
    console.log('Loaded project:', project.value);

    await projectStore.fetchProjectTasks(projectId);
    await fetchDevelopers();
  } catch (error) {
    console.error('Error loading project data:', error);
  }
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

// Vérifier si l'utilisateur est développeur
const isDeveloper = computed(() => {
  return authStore.currentUser?.roles.includes('developer');
});

// Vérifier si l'utilisateur peut créer des tâches
const canCreateTask = computed(() => {
  return isProjectManager.value || isDeveloper.value;
});

// Vérifier si l'utilisateur peut voir toutes les tâches du projet
const canViewAllTasks = computed(() => {
  return isProjectManager.value || isDeveloper.value;
});

// État pour les commentaires
const showCommentForm = ref(false);
const selectedTaskForComment = ref(null);
const newComment = ref('');
const taskComments = ref([]);

// Charger les commentaires d'une tâche
async function loadTaskComments(taskId) {
  taskComments.value = await projectStore.fetchTaskComments(taskId);
}

// Gérer l'ajout d'un commentaire
async function handleAddComment() {
  if (!newComment.value.trim()) return;

  await projectStore.addComment(selectedTaskForComment.value.id, newComment.value);
  await loadTaskComments(selectedTaskForComment.value.id);
  newComment.value = '';
}

// Ouvrir le formulaire de commentaire
function openCommentForm(task) {
  selectedTaskForComment.value = task;
  showCommentForm.value = true;
  loadTaskComments(task.id);
}

// Marquer une tâche comme complétée
async function handleCompleteTask(taskId) {
  try {
    await projectStore.completeTask(taskId);
    await projectStore.fetchProjectTasks(project.value.id);
  } catch (error) {
    alert(error.message);
  }
}

// Ajout de nouveaux états pour la gestion des tâches
const selectedTask = ref(null);
const showTaskDetails = ref(false);

// Fonction pour ouvrir les détails d'une tâche
function openTaskDetails(task) {
  selectedTask.value = { ...task };
  showTaskDetails.value = true;
  loadTaskComments(task.id);
}

// Fonction pour obtenir le statut formaté
function getStatusLabel(status) {
  const statusLabels = {
    'pending': 'En attente',
    'in_progress': 'En cours',
    'completed': 'Terminée',
    'validated': 'Validée'
  };
  return statusLabels[status] || status;
}

// Fonction pour obtenir la classe de couleur selon le statut
function getStatusClass(status) {
  const statusClasses = {
    'pending': 'bg-gray-100 text-gray-800',
    'in_progress': 'bg-yellow-100 text-yellow-800',
    'completed': 'bg-blue-100 text-blue-800',
    'validated': 'bg-green-100 text-green-800'
  };
  return statusClasses[status] || 'bg-gray-100 text-gray-800';
}

// Fonction pour vérifier si l'utilisateur peut modifier une tâche
const canEditTask = computed(() => {
  return isProjectManager.value || isDeveloper.value;
});

// Fonction pour vérifier si l'utilisateur peut valider une tâche
const canValidateTask = computed(() => {
  return isProjectManager.value;
});

// Fonction pour formater la date
function formatDate(date) {
  return new Date(date).toLocaleDateString();
}

// Ajout de données de référence pour les types de tâches et tags
const taskTypes = [
  { value: 'feature', label: 'Fonctionnalité' },
  { value: 'bug', label: 'Bug' },
  { value: 'improvement', label: 'Amélioration' },
  { value: 'documentation', label: 'Documentation' },
  { value: 'test', label: 'Test' }
];

const availableTags = [
  'Frontend',
  'Backend',
  'UI/UX',
  'Database',
  'API',
  'Security',
  'Performance'
];

// Fonction pour ajouter une sous-tâche
function addSubtask() {
  newTask.value.subtasks.push({
    title: '',
    completed: false
  });
}

// Fonction pour supprimer une sous-tâche
function removeSubtask(index) {
  newTask.value.subtasks.splice(index, 1);
}

// Fonction pour ouvrir le formulaire de nouvelle tâche
async function openNewTaskForm() {
  try {
    await fetchDevelopers();

    // Réinitialiser le formulaire avec projectId en nombre
    newTask.value = {
      title: '',
      description: '',
      deadline: '',
      priority: 'medium',
      assignedTo: '',
      projectId: Number(route.params.id), // Conversion en nombre
      estimatedHours: 0,
      type: 'feature',
      status: 'pending',
      dependencies: [],
      tags: [],
      subtasks: []
    };

    showNewTaskForm.value = true;
  } catch (error) {
    console.error('Error opening new task form:', error);
    alert('Erreur lors de l\'ouverture du formulaire');
  }
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

      <!-- Section des tâches -->
      <div class="bg-white shadow-sm rounded-lg">
        <div class="px-6 py-4">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-medium text-gray-900">Tâches du projet</h3>
            <button
              v-if="canCreateTask"
              @click="openNewTaskForm"
              class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              Nouvelle tâche
            </button>
          </div>

          <!-- Filtres des tâches -->
          <div class="flex space-x-2 mb-4">
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
              class="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
              @click="openTaskDetails(task)"
            >
              <div class="flex justify-between items-start">
                <div>
                  <h4 class="font-medium text-gray-900">{{ task.title }}</h4>
                  <p class="mt-1 text-sm text-gray-500">{{ task.description }}</p>
                  <div class="mt-2 flex items-center space-x-4">
                    <span
                      :class="getStatusClass(task.status)"
                      class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    >
                      {{ getStatusLabel(task.status) }}
                    </span>
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
                <div class="flex items-center space-x-2">
                  <span class="text-sm text-gray-500">
                    Assignée à: {{ getDeveloperEmail(task.assignedTo) }}
                  </span>
                  <div v-if="canEditTask" class="flex space-x-2">
                    <button
                      v-if="isProjectManager"
                      @click.stop="startEditTask(task)"
                      class="text-indigo-600 hover:text-indigo-900"
                    >
                      <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      v-if="isProjectManager"
                      @click.stop="handleDeleteTask(task.id)"
                      class="text-red-600 hover:text-red-900"
                    >
                      <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Message si aucune tâche -->
          <div v-if="filteredTasks.length === 0" class="text-center py-12">
            <p class="text-gray-500">Aucune tâche ne correspond aux critères sélectionnés.</p>
          </div>
        </div>
      </div>

      <!-- Modal des détails de tâche -->
      <div v-if="showTaskDetails" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
        <div class="bg-white rounded-lg max-w-2xl w-full mx-4">
          <div class="px-6 py-4">
            <div class="flex justify-between items-start">
              <h3 class="text-lg font-medium text-gray-900">{{ selectedTask.title }}</h3>
              <button @click="showTaskDetails = false" class="text-gray-400 hover:text-gray-500">
                <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div class="mt-4 space-y-4">
              <p class="text-gray-500">{{ selectedTask.description }}</p>
              <div class="flex items-center space-x-4">
                <span :class="getStatusClass(selectedTask.status)" class="px-2.5 py-0.5 rounded-full text-xs font-medium">
                  {{ getStatusLabel(selectedTask.status) }}
                </span>
                <span class="text-sm text-gray-500">
                  Échéance: {{ new Date(selectedTask.deadline).toLocaleDateString() }}
                </span>
              </div>

              <!-- Commentaires -->
              <div class="mt-6">
                <h4 class="font-medium text-gray-900 mb-4">Commentaires</h4>
                <div class="space-y-4">
                  <div v-for="comment in taskComments" :key="comment.id" class="bg-gray-50 p-4 rounded-lg">
                    <div class="flex justify-between">
                      <span class="text-sm font-medium text-gray-900">
                        {{ getDeveloperEmail(comment.userId) }}
                      </span>
                      <span class="text-sm text-gray-500">
                        {{ new Date(comment.createdAt).toLocaleString() }}
                      </span>
                    </div>
                    <p class="mt-1 text-sm text-gray-500">{{ comment.content }}</p>
                  </div>
                </div>

                <!-- Formulaire de nouveau commentaire -->
                <div class="mt-4">
                  <textarea
                    v-model="newComment"
                    rows="3"
                    class="shadow-sm block w-full focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border-gray-300 rounded-md"
                    placeholder="Ajouter un commentaire..."
                  ></textarea>
                  <div class="mt-2 flex justify-end">
                    <button
                      @click="handleAddComment"
                      class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      Commenter
                    </button>
                  </div>
                </div>
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
        <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div class="px-6 py-4 border-b border-gray-200">
            <h3 class="text-lg font-medium text-gray-900">Créer une nouvelle tâche</h3>
          </div>

          <form @submit.prevent="handleCreateTask" class="p-6 space-y-4">
            <!-- Informations de base -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Titre -->
              <div>
                <label class="block text-sm font-medium text-gray-700">Titre</label>
                <input
                  v-model="newTask.title"
                  type="text"
                  required
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <!-- Type de tâche -->
              <div>
                <label class="block text-sm font-medium text-gray-700">Type</label>
                <select
                  v-model="newTask.type"
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option v-for="type in taskTypes" :key="type.value" :value="type.value">
                    {{ type.label }}
                  </option>
                </select>
              </div>
            </div>

            <!-- Description -->
            <div>
              <label class="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                v-model="newTask.description"
                rows="3"
                required
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              ></textarea>
            </div>

            <!-- Dates et estimation -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700">Date limite</label>
                <input
                  v-model="newTask.deadline"
                  type="date"
                  required
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700">Estimation (heures)</label>
                <input
                  v-model.number="newTask.estimatedHours"
                  type="number"
                  required
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700">Assigner à</label>
                <select
                  v-model="newTask.assignedTo"
                  required
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">Sélectionner un développeur</option>
                  <option v-for="dev in developers" :key="dev.id" :value="dev.id">
                    {{ dev.email }}
                  </option>
                </select>
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

      <!-- Modal des commentaires -->
      <div
        v-if="showCommentForm && selectedTaskForComment"
        class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center"
      >
        <div class="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
          <div class="px-6 py-4 border-b border-gray-200">
            <div class="flex justify-between items-center">
              <h3 class="text-lg font-medium text-gray-900">
                Commentaires - {{ selectedTaskForComment.title }}
              </h3>
              <button
                @click="showCommentForm = false"
                class="text-gray-400 hover:text-gray-500"
              >
                <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div class="px-6 py-4 max-h-96 overflow-y-auto">
            <div class="space-y-4">
              <div
                v-for="comment in taskComments"
                :key="comment.id"
                class="bg-gray-50 rounded-lg p-4"
              >
                <div class="flex justify-between items-start">
                  <div class="text-sm text-gray-500">
                    {{ users.find(u => u.id === comment.userId)?.email }}
                  </div>
                  <div class="text-xs text-gray-400">
                    {{ new Date(comment.createdAt).toLocaleString() }}
                  </div>
                </div>
                <div class="mt-2 text-gray-900">
                  {{ comment.content }}
                </div>
              </div>
            </div>
          </div>

          <div class="px-6 py-4 border-t border-gray-200">
            <form @submit.prevent="handleAddComment" class="flex space-x-4">
              <input
                v-model="newComment"
                type="text"
                placeholder="Votre commentaire..."
                class="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
              <button
                type="submit"
                class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Envoyer
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
