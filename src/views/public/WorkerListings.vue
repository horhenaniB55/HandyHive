<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useWorkerStore } from '../../stores/workers'
import { useServiceStore } from '../../stores/services'
import MainLayout from '../../components/layout/MainLayout.vue'

const router = useRouter()
const workerStore = useWorkerStore()
const serviceStore = useServiceStore()

const workers = ref([])
const categories = ref([])
const loading = ref(true)
const error = ref('')

// Filter states
const searchQuery = ref('')
const selectedCategory = ref('')
const minRating = ref(0)
const sortBy = ref('rating') // 'rating', 'experience', 'name'

onMounted(async () => {
  try {
    // Load data
    await Promise.all([
      workerStore.fetchWorkers(),
      serviceStore.fetchCategories()
    ])
    
    workers.value = workerStore.workers
    categories.value = serviceStore.categories
    
    // Extract category from query params if present
    const categoryParam = router.currentRoute.value.query.category
    if (categoryParam) {
      selectedCategory.value = categoryParam
    }
  } catch (err) {
    error.value = 'Failed to load worker listings'
    console.error(err)
  } finally {
    loading.value = false
  }
})

const filteredWorkers = computed(() => {
  return workers.value
    .filter(worker => {
      // Filter by search query
      const matchesSearch = !searchQuery.value || 
        worker.displayName.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        worker.bio?.toLowerCase().includes(searchQuery.value.toLowerCase())
      
      // Filter by category
      const matchesCategory = !selectedCategory.value || 
        worker.serviceCategories.includes(selectedCategory.value)
      
      // Filter by minimum rating
      const matchesRating = worker.rating >= minRating.value
      
      return matchesSearch && matchesCategory && matchesRating
    })
    .sort((a, b) => {
      // Sort by selected criteria
      if (sortBy.value === 'rating') {
        return b.rating - a.rating
      } else if (sortBy.value === 'experience') {
        return b.yearsOfExperience - a.yearsOfExperience
      } else {
        return a.displayName.localeCompare(b.displayName)
      }
    })
})

const viewWorkerProfile = (workerId) => {
  router.push(`/workers/${workerId}`)
}

const clearFilters = () => {
  searchQuery.value = ''
  selectedCategory.value = ''
  minRating.value = 0
  sortBy.value = 'rating'
}

const getRatingStars = (rating) => {
  const stars = []
  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 >= 0.5
  
  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push('full')
    } else if (i === fullStars && hasHalfStar) {
      stars.push('half')
    } else {
      stars.push('empty')
    }
  }
  
  return stars
}

const getCategoryColor = (category) => {
  const colors = {
    'Cleaning': 'bg-blue-500 text-blue-100',
    'Plumbing': 'bg-green-500 text-green-100',
    'Electrical': 'bg-yellow-500 text-yellow-100',
    'Carpentry': 'bg-red-500 text-red-100',
    'Gardening': 'bg-emerald-500 text-emerald-100',
    'Painting': 'bg-purple-500 text-purple-100',
    'Moving': 'bg-orange-500 text-orange-100',
    'Appliance Repair': 'bg-indigo-500 text-indigo-100'
  }
  
  return colors[category] || 'bg-gray-500 text-gray-100'
}
</script>

<template>
  <MainLayout>
    <div class="container mx-auto px-4 py-8">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-white mb-2">Find Skilled Professionals</h1>
        <p class="text-gray-300">Browse our verified professionals ready to help with your project</p>
      </div>
      
      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
      
      <!-- Error State -->
      <div v-else-if="error" class="bg-red-900 text-red-200 p-4 rounded mb-4">
        {{ error }}
      </div>
      
      <!-- Filters -->
      <div v-else class="mb-8">
        <div class="bg-gray-800 rounded-lg p-4 mb-6">
          <div class="flex flex-wrap gap-4 items-end">
            <!-- Search -->
            <div class="flex-1 min-w-[200px]">
              <label class="block text-gray-300 text-sm mb-1">Search</label>
              <input 
                v-model="searchQuery" 
                type="text" 
                placeholder="Search by name or keywords..." 
                class="w-full px-4 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
            </div>
            
            <!-- Category Filter -->
            <div class="flex-1 min-w-[200px]">
              <label class="block text-gray-300 text-sm mb-1">Service Category</label>
              <select 
                v-model="selectedCategory" 
                class="w-full px-4 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Categories</option>
                <option v-for="category in categories" :key="category" :value="category">
                  {{ category }}
                </option>
              </select>
            </div>
            
            <!-- Minimum Rating -->
            <div class="flex-1 min-w-[200px]">
              <label class="block text-gray-300 text-sm mb-1">Min Rating ({{ minRating }})</label>
              <input 
                v-model="minRating" 
                type="range" 
                min="0" 
                max="5" 
                step="0.5" 
                class="w-full"
              >
            </div>
            
            <!-- Sort By -->
            <div class="flex-1 min-w-[200px]">
              <label class="block text-gray-300 text-sm mb-1">Sort By</label>
              <select 
                v-model="sortBy" 
                class="w-full px-4 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="rating">Highest Rated</option>
                <option value="experience">Most Experienced</option>
                <option value="name">Name (A-Z)</option>
              </select>
            </div>
            
            <!-- Clear Filters -->
            <button 
              @click="clearFilters" 
              class="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition"
            >
              Clear Filters
            </button>
          </div>
        </div>
        
        <!-- Results Count -->
        <div class="text-gray-300 mb-4">
          Showing {{ filteredWorkers.length }} professionals
          <span v-if="selectedCategory"> in {{ selectedCategory }}</span>
        </div>
        
        <!-- No Results -->
        <div v-if="filteredWorkers.length === 0" class="bg-gray-800 rounded p-8 text-center">
          <p class="text-gray-300 mb-4">No professionals match your search criteria.</p>
          <button 
            @click="clearFilters" 
            class="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
          >
            Clear Filters
          </button>
        </div>
        
        <!-- Worker Cards -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div 
            v-for="worker in filteredWorkers" 
            :key="worker.id" 
            class="card hover:shadow-lg transition-all cursor-pointer"
            @click="viewWorkerProfile(worker.id)"
          >
            <div class="p-6">
              <div class="flex items-center mb-4">
                <div class="bg-indigo-600 h-16 w-16 rounded-full flex items-center justify-center text-xl font-bold text-white mr-4">
                  {{ worker.displayName.charAt(0) }}
                </div>
                <div>
                  <h3 class="text-xl font-semibold text-white">{{ worker.displayName }}</h3>
                  <div class="flex items-center">
                    <div class="flex mr-2">
                      <template v-for="(star, i) in getRatingStars(worker.rating)" :key="i">
                        <svg v-if="star === 'full'" class="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                        </svg>
                        <svg v-else-if="star === 'half'" class="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" opacity="0.5"></path>
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0" fill="none"></path>
                        </svg>
                        <svg v-else class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                        </svg>
                      </template>
                    </div>
                    <span class="text-gray-300 text-sm">{{ worker.rating.toFixed(1) }} ({{ worker.reviewCount || 0 }} reviews)</span>
                  </div>
                </div>
              </div>
              
              <p class="text-gray-400 mb-4 line-clamp-2">{{ worker.bio || 'Professional service provider on HandyHive.' }}</p>
              
              <div class="flex flex-wrap gap-2 mb-4">
                <span 
                  v-for="category in worker.serviceCategories" 
                  :key="category" 
                  :class="`text-xs px-2 py-1 rounded ${getCategoryColor(category)}`"
                >
                  {{ category }}
                </span>
              </div>
              
              <div class="flex justify-between items-center text-sm">
                <span class="text-gray-300">{{ worker.yearsOfExperience }} years experience</span>
                <span class="text-indigo-400">View Profile →</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </MainLayout>
</template> 