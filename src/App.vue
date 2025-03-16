<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from './stores/auth'
import { useRouter } from 'vue-router'

// Initialize the auth store
const authStore = useAuthStore()
const router = useRouter()

// Initialize auth state when app loads
onMounted(() => {
  authStore.init()
})
</script>

<template>
  <div class="app">
    <router-view></router-view>
  </div>
</template>

<style>
/* App-level styles are imported from main CSS file */
</style>
