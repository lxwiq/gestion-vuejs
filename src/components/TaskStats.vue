<script setup>
defineProps({
  stats: {
    type: Object,
    required: true,
  },
})
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
    <div class="bg-white p-4 rounded-lg shadow">
      <div class="text-sm text-gray-500">Tâches totales</div>
      <div class="text-2xl font-bold">{{ stats.total }}</div>
    </div>
    <div class="bg-white p-4 rounded-lg shadow">
      <div class="text-sm text-gray-500">En cours</div>
      <div class="text-2xl font-bold text-yellow-600">{{ stats.inProgress }}</div>
    </div>
    <div class="bg-white p-4 rounded-lg shadow">
      <div class="text-sm text-gray-500">Terminées</div>
      <div class="text-2xl font-bold text-green-600">{{ stats.completed }}</div>
    </div>
    <div class="bg-white p-4 rounded-lg shadow">
      <div class="text-sm text-gray-500">En retard</div>
      <div class="text-2xl font-bold text-red-600">{{ stats.overdue }}</div>
    </div>
  </div>
</template>
