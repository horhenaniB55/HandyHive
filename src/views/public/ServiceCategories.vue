<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useServiceStore } from '../../stores/services'
import MainLayout from '../../components/layout/MainLayout.vue'

const router = useRouter()
const serviceStore = useServiceStore()

const categories = ref([])
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    await serviceStore.fetchCategories()
    categories.value = serviceStore.categories

    // Add some default categories if none found
    if (categories.value.length === 0) {
      categories.value = [
        'Cleaning',
        'Plumbing',
        'Electrical',
        'Carpentry',
        'Gardening',
        'Painting',
        'Moving',
        'Appliance Repair'
      ]
    }
  } catch (err) {
    error.value = 'Failed to load service categories'
    console.error(err)
  } finally {
    loading.value = false
  }
})

const viewCategory = (category) => {
  router.push({
    path: '/services',
    query: { category }
  })
}

// Color mapping for categories
const getCategoryColor = (category) => {
  const colors = {
    'Cleaning': { bg: 'from-blue-500 to-blue-600', text: 'bg-blue-900 text-blue-300' },
    'Plumbing': { bg: 'from-green-500 to-green-600', text: 'bg-green-900 text-green-300' },
    'Electrical': { bg: 'from-yellow-500 to-yellow-600', text: 'bg-yellow-900 text-yellow-300' },
    'Carpentry': { bg: 'from-red-500 to-red-600', text: 'bg-red-900 text-red-300' },
    'Gardening': { bg: 'from-emerald-500 to-emerald-600', text: 'bg-emerald-900 text-emerald-300' },
    'Painting': { bg: 'from-purple-500 to-purple-600', text: 'bg-purple-900 text-purple-300' },
    'Moving': { bg: 'from-orange-500 to-orange-600', text: 'bg-orange-900 text-orange-300' },
    'Appliance Repair': { bg: 'from-indigo-500 to-indigo-600', text: 'bg-indigo-900 text-indigo-300' }
  }
  
  return colors[category] || { bg: 'from-gray-500 to-gray-600', text: 'bg-gray-900 text-gray-300' }
}
</script>

<template>
  <MainLayout>
    <div class="container mx-auto px-4 py-8">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-white mb-2">Service Categories</h1>
        <p class="text-gray-300">Browse our service categories and find the help you need</p>
      </div>
      
      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
      
      <!-- Error State -->
      <div v-else-if="error" class="bg-red-900 text-red-200 p-4 rounded mb-4">
        {{ error }}
      </div>
      
      <!-- Categories Grid -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div 
          v-for="category in categories" 
          :key="category" 
          class="card hover:shadow-lg transition-all cursor-pointer"
          @click="viewCategory(category)"
        >
          <div :class="`h-40 bg-gradient-to-r ${getCategoryColor(category).bg} rounded-t-lg`"></div>
          <div class="p-6">
            <h3 class="text-xl font-semibold text-white mb-4">{{ category }}</h3>
            <span :class="`inline-block ${getCategoryColor(category).text} text-xs px-2 py-1 rounded`">
              View Services
            </span>
          </div>
        </div>
      </div>
    </div>
  </MainLayout>
</template> 