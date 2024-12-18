import { defineStore } from 'pinia';
import { db } from '../db/db';
import { ref, computed } from 'vue';
import { useAuthStore } from './auth';

export const useProjectStore = defineStore('projects', () => {
  const authStore = useAuthStore();
  const projects = ref([]);
  const tasks = ref([]);

  // Projets gérés par le manager connecté
  const managedProjects = computed(() => {
    return projects.value.filter(project =>
      project.managedBy.includes(authStore.currentUser?.id)
    );
  });

  // Récupérer tous les projets
  async function fetchProjects() {
    projects.value = await db.projects.toArray();
  }

  // Créer un nouveau projet
  async function createProject(projectData) {
    try {
      const newProject = {
        id: crypto.randomUUID(),
        name: projectData.name,
        description: projectData.description,
        startDate: new Date(projectData.startDate).toISOString(),
        endDate: new Date(projectData.endDate).toISOString(),
        status: projectData.status || 'active',
        priority: projectData.priority || 'medium',
        assignedDevelopers: Array.from(projectData.assignedDevelopers || []),
        managedBy: [],
        createdAt: new Date().toISOString()
      };

      const projectToStore = JSON.parse(JSON.stringify(newProject));

      await db.projects.add(projectToStore);
      await fetchProjects();
      return newProject.id;
    } catch (error) {
      console.error('Erreur lors de la création du projet:', error);
      throw error;
    }
  }

  // Modifier un projet
  async function updateProject(projectId, updates) {
    await db.projects.update(projectId, updates);
    await fetchProjects();
  }

  // Supprimer un projet
  async function deleteProject(projectId) {
    // Supprimer d'abord toutes les tâches associées
    await db.tasks.where('projectId').equals(projectId).delete();
    await db.projects.delete(projectId);
    await fetchProjects();
  }

  // Ajouter/Retirer un manager au projet
  async function toggleProjectManager(projectId, managerId) {
    const project = await db.projects.get(projectId);
    const managers = project.managedBy || [];

    if (managers.includes(managerId)) {
      managers.splice(managers.indexOf(managerId), 1);
    } else {
      managers.push(managerId);
    }

    await db.projects.update(projectId, { managedBy: managers });
    await fetchProjects();
  }

  // Récupérer les tâches d'un projet
  async function fetchProjectTasks(projectId) {
    try {
      if (!projectId) {
        console.error('ID du projet manquant');
        return [];
      }

      const projectTasks = await db.tasks
        .where('projectId')
        .equals(projectId)
        .toArray();

      tasks.value = projectTasks;
      return projectTasks;
    } catch (error) {
      console.error('Erreur lors du chargement des tâches:', error);
      tasks.value = [];
      return [];
    }
  }

  // Créer une tâche
  async function createTask(taskData) {
    const newTask = {
      projectId: taskData.projectId,
      title: taskData.title,
      description: taskData.description,
      status: taskData.assignedTo ? 'in_progress' : 'pending',
      assignedTo: taskData.assignedTo || null,
      createdAt: new Date().toISOString(),
      deadline: taskData.deadline,
      priority: taskData.priority || 'medium'
    };

    const id = await db.tasks.add(newTask);
    await fetchProjectTasks(taskData.projectId);
    return id;
  }

  // Modifier une tâche
  async function updateTask(taskId, updates) {
    const task = await db.tasks.get(taskId);
    await db.tasks.update(taskId, updates);
    await fetchProjectTasks(task.projectId);
  }

  // Supprimer une tâche
  async function deleteTask(taskId) {
    const task = await db.tasks.get(taskId);
    await db.tasks.delete(taskId);
    await fetchProjectTasks(task.projectId);
  }

  // Affecter/Désaffecter un développeur à une tâche
  async function assignTask(taskId, developerId) {
    const updates = {
      assignedTo: developerId || null,
      // S'assurer que le statut est correctement mis à jour
      status: developerId ? 'in_progress' : 'pending'
    };

    const task = await db.tasks.get(taskId);
    // Ne pas changer le statut si la tâche est déjà validée
    if (task.status !== 'validated') {
      await db.tasks.update(taskId, updates);
      await fetchProjectTasks(task.projectId);
    }
  }

  // Valider une tâche
  async function validateTask(taskId) {
    const task = await db.tasks.get(taskId);
    if (!task.assignedTo) {
      throw new Error('Impossible de valider une tâche non assignée');
    }
    await updateTask(taskId, { status: 'validated' });
  }

  // Obtenir les statistiques d'un projet
  const getProjectStats = computed(() => (projectId) => {
    const projectTasks = tasks.value.filter(task => task.projectId === projectId);
    const total = projectTasks.length;
    const completed = projectTasks.filter(task => task.status === 'validated').length;
    const overdue = projectTasks.filter(task => {
      return new Date(task.deadline) < new Date() && task.status !== 'validated';
    }).length;

    return {
      total,
      completed,
      overdue,
      progress: total ? Math.round((completed / total) * 100) : 0,
      atRisk: overdue > 0
    };
  });

  // Ajouter une nouvelle fonction pour charger toutes les tâches d'un développeur
  async function fetchDeveloperTasks(developerId) {
    try {
      console.log('Chargement des tâches pour le développeur:', developerId);

      // Récupérer tous les projets
      const allProjects = await db.projects.toArray();

      // Filtrer les projets après les avoir récupérés
      const developerProjects = allProjects.filter(project =>
        project.assignedDevelopers &&
        Array.isArray(project.assignedDevelopers) &&
        project.assignedDevelopers.includes(developerId)
      );

      console.log('Projets trouvés:', developerProjects);
      projects.value = developerProjects;

      // Récupérer toutes les tâches assignées au développeur
      const developerTasks = await db.tasks
        .where('assignedTo')
        .equals(developerId)
        .toArray();

      console.log('Tâches trouvées:', developerTasks);
      tasks.value = developerTasks;

      return {
        projects: developerProjects,
        tasks: developerTasks
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des données:', error);
      projects.value = [];
      tasks.value = [];
      throw error;
    }
  }

  // Ajouter un commentaire à une tâche
  async function addComment(taskId, content) {
    const comment = {
      taskId,
      userId: authStore.currentUser.id,
      content,
      createdAt: new Date().toISOString()
    };

    await db.comments.add(comment);
    return comment;
  }

  // Récupérer les commentaires d'une tâche
  async function fetchTaskComments(taskId) {
    return await db.comments
      .where('taskId')
      .equals(taskId)
      .reverse()
      .sortBy('createdAt');
  }

  // Marquer une tâche comme complétée (pour les développeurs)
  async function completeTask(taskId) {
    const task = await db.tasks.get(taskId);
    if (task.assignedTo !== authStore.currentUser.id) {
      throw new Error('Vous ne pouvez pas marquer cette tâche comme complétée');
    }
    await updateTask(taskId, { status: 'completed' });
  }

  return {
    projects,
    tasks,
    managedProjects,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    toggleProjectManager,
    fetchProjectTasks,
    createTask,
    updateTask,
    deleteTask,
    assignTask,
    validateTask,
    getProjectStats,
    fetchDeveloperTasks,
    addComment,
    fetchTaskComments,
    completeTask
  };
});
