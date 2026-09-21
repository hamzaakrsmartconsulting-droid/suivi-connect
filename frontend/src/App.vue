<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useIdleLogout } from '@/composables/useIdleLogout'

const auth = useAuthStore()

onMounted(() => {
  auth.initFromStorage()
})

useIdleLogout()
</script>

<template>
  <router-view />
</template>
