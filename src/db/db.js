import Dexie from 'dexie';

export const db = new Dexie('projectManagementDB');

db.version(1).stores({
  users: '++id, email, password, roles', // roles sera un array ['developer', 'manager']
  projects: '++id, name, description, createdAt, managedBy',
  tasks: '++id, projectId, title, description, status, assignedTo, createdAt, deadline',
  comments: '++id, taskId, userId, content, createdAt'
});
