import Dexie from 'dexie';

export const db = new Dexie('projectManagementDB');

db.version(1).stores({
  users: '++id, email, password, roles', // roles sera un array ['developer', 'manager']
  projects: '++id, name, description, createdAt, managedBy, status',
  tasks: '++id, projectId, title, description, status, assignedTo, createdAt, deadline, priority',
  comments: '++id, taskId, userId, content, createdAt'
});

// Définir les valeurs par défaut lors de la création d'un projet
db.projects.hook('creating', function (primKey, obj) {
  if (!obj.status) obj.status = 'active';
  return obj;
});

// Définir les valeurs par défaut lors de la création d'une tâche
db.tasks.hook('creating', function (primKey, obj) {
  if (!obj.status) obj.status = 'pending';
  if (!obj.priority) obj.priority = 'medium';
  return obj;
});
