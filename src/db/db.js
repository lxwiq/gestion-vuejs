import Dexie from 'dexie';

export const db = new Dexie('projectManagementDB');

db.version(4).stores({
  users: '++id, email, password, roles',
  projects: 'id, name, description, createdAt, status, managedBy, developers',
  tasks: 'id, projectId, title, description, status, assignedTo, createdAt, updatedAt, deadline, priority, type, estimatedHours, dependencies, tags, subtasks',
  comments: '++id, taskId, userId, content, createdAt'
});

// Définir les valeurs par défaut lors de la création d'un projet
db.projects.hook('creating', function (primKey, obj) {
  if (!obj.status) obj.status = 'active';
  if (!obj.managedBy) obj.managedBy = [];
  if (!obj.developers) obj.developers = [];
  obj.createdAt = new Date().toISOString();
  return obj;
});

// Définir les valeurs par défaut lors de la création d'une tâche
db.tasks.hook('creating', function (primKey, obj) {
  if (!obj.id) throw new Error('L\'ID de la tâche est requis');
  obj.status = obj.status || 'pending';
  obj.priority = obj.priority || 'medium';
  obj.type = obj.type || 'feature';
  obj.estimatedHours = obj.estimatedHours || 0;
  obj.dependencies = obj.dependencies || [];
  obj.tags = obj.tags || [];
  obj.subtasks = obj.subtasks || [];
  obj.createdAt = obj.createdAt || new Date().toISOString();
  obj.updatedAt = obj.updatedAt || new Date().toISOString();
  return obj;
});
