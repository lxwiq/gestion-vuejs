import { defineStore } from 'pinia';
import { db } from '../db/db';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

export const useAuthStore = defineStore('auth', () => {
  const router = useRouter();
  const currentUser = ref(JSON.parse(localStorage.getItem('user')) || null);
  const isAuthenticated = ref(!!localStorage.getItem('user'));

  async function register(userData) {
    try {
      // Vérifier si l'email existe déjà
      const existingUser = await db.users.where('email').equals(userData.email).first();
      if (existingUser) {
        throw new Error('Cet email est déjà utilisé');
      }

      // Créer un objet simple pour le nouvel utilisateur
      const newUser = {
        email: userData.email,
        password: userData.password,
        roles: [...userData.roles],
        createdAt: new Date().toISOString()
      };

      // Ajouter l'utilisateur à la base de données
      const id = await db.users.add(newUser);

      // Récupérer l'utilisateur créé
      const user = await db.users.get(id);

      // Mettre à jour l'état avec un objet simple
      const userToStore = {
        id: user.id,
        email: user.email,
        roles: [...user.roles]
      };

      // Sauvegarder dans le localStorage
      localStorage.setItem('user', JSON.stringify(userToStore));

      currentUser.value = userToStore;
      isAuthenticated.value = true;
      return currentUser.value;
    } catch (error) {
      throw new Error(`Erreur lors de l'inscription: ${error.message}`);
    }
  }

  async function login(credentials) {
    try {
      const user = await db.users
        .where('email')
        .equals(credentials.email)
        .first();

      if (!user || user.password !== credentials.password) {
        throw new Error('Email ou mot de passe incorrect');
      }

      // Mettre à jour l'état avec un objet simple
      const userToStore = {
        id: user.id,
        email: user.email,
        roles: [...user.roles]
      };

      // Sauvegarder dans le localStorage
      localStorage.setItem('user', JSON.stringify(userToStore));

      currentUser.value = userToStore;
      isAuthenticated.value = true;
      return currentUser.value;
    } catch (error) {
      throw new Error(`Erreur lors de la connexion: ${error.message}`);
    }
  }

  function logout() {
    // Nettoyer le localStorage
    localStorage.removeItem('user');

    // Réinitialiser l'état
    currentUser.value = null;
    isAuthenticated.value = false;

    // Rediriger vers la page de connexion
    router.push('/');
  }

  async function fetchUsersByRole(role) {
    try {
      const users = await db.users
        .where('roles')
        .equals(role)
        .toArray();
      return users;
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs:', error);
      return [];
    }
  }

  return {
    currentUser,
    isAuthenticated,
    register,
    login,
    logout,
    fetchUsersByRole
  };
});
