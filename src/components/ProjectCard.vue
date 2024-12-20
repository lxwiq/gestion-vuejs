<script setup>
import { useProjectStore } from '../stores/projects'
import { defineProps } from 'vue'

const props = defineProps({
  project: {
    type: Object,
    required: true,
  },
  showManagerControls: {
    type: Boolean,
    default: false,
  },
  currentUserId: {
    type: String,
    required: true,
  },
})

const projectStore = useProjectStore()

const emit = defineEmits(['toggleManager'])

const handleToggleManager = () => {
  emit('toggleManager', props.project.id)
}
</script>

<template>
  <div class="bg-white overflow-hidden shadow rounded-lg">
    <div class="px-4 py-5 sm:p-6">
      <div class="flex justify-between items-start">
        <h3 class="text-lg font-medium text-gray-900">
          {{ project.name }}
        </h3>
        <div v-if="showManagerControls" class="flex space-x-2">
          <button
            @click="handleToggleManager"
            :class="[
              'flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors duration-200',
              project.managedBy?.includes(currentUserId)
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            ]"
          >
            <span class="mr-1">
              <i
                class="fas fa-user-shield"
                :class="{
                  'text-green-600': project.managedBy?.includes(currentUserId),
                  'text-gray-500': !project.managedBy?.includes(currentUserId),
                }"
              ></i>
            </span>
            {{
              project.managedBy?.includes(currentUserId) ? 'Je gère ce projet' : 'Prendre en charge'
            }}
          </button>
        </div>
        <span
          v-else
          :class="{
            'bg-green-100 text-green-800': project.status === 'active',
            'bg-yellow-100 text-yellow-800': project.status === 'planning',
            'bg-gray-100 text-gray-800': project.status === 'on_hold',
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
            Du {{ new Date(project.startDate).toLocaleDateString() }} au
            {{ new Date(project.endDate).toLocaleDateString() }}
          </span>
        </div>
      </div>
    </div>
    <div class="bg-gray-50 px-4 py-4 sm:px-6">
      <router-link :to="`/projects/${project.id}`" class="text-indigo-600 hover:text-indigo-900">
        Voir les détails
      </router-link>
    </div>
  </div>
</template>
