<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useServiceStore } from '../../stores/services'
import MainLayout from '../../components/layout/MainLayout.vue'

const router = useRouter()
const route = useRoute()
const serviceStore = useServiceStore()

const loading = ref(true)
const error = ref('')
const searchQuery = ref('')
const selectedCategory = ref('')
const priceRange = ref([0, 1000])
const sortBy = ref('price-asc')

// Get category from URL query if present
onMounted(async () => {
  try {
    if (route.query.category) {
      selectedCategory.value = route.query.category
    }
    
    if (route.query.search) {
      searchQuery.value = route.query.search
    }
    
    await serviceStore.fetchServices()
    await serviceStore.fetchCategories()
  } catch (err) {
    error.value = 'Failed to load services'
    console.error(err)
  } finally {
    loading.value = false
  }
})

// Computed property for filtered services
const filteredServices = computed(() => {
  let result = [...serviceStore.services]
  
  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(service => 
      service.name.toLowerCase().includes(query) || 
      service.description.toLowerCase().includes(query)
    )
  }
  
  // Filter by category
  if (selectedCategory.value) {
    result = result.filter(service => service.category === selectedCategory.value)
  }
  
  // Filter by price range
  result = result.filter(service => 
    service.price >= priceRange.value[0] && 
    service.price <= priceRange.value[1]
  )
  
  // Sort results
  switch (sortBy.value) {
    case 'price-asc':
      result.sort((a, b) => a.price - b.price)
      break
    case 'price-desc':
      result.sort((a, b) => b.price - a.price)
      break
    case 'rating-desc':
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0))
      break
    case 'name-asc':
      result.sort((a, b) => a.name.localeCompare(b.name))
      break
  }
  
  return result
})

const updateFilters = () => {
  // Update URL with filters
  router.push({
    query: {
      ...(searchQuery.value ? { search: searchQuery.value } : {}),
      ...(selectedCategory.value ? { category: selectedCategory.value } : {})
    }
  })
}

const clearFilters = () => {
  searchQuery.value = ''
  selectedCategory.value = ''
  priceRange.value = [0, 1000]
  sortBy.value = 'price-asc'
  router.push({ query: {} })
}

const viewServiceDetails = (serviceId) => {
  router.push(`/services/${serviceId}`)
}

const getCategoryColor = (category) => {
  const colors = {
    'Cleaning': 'bg-blue-900 text-blue-300',
    'Plumbing': 'bg-green-900 text-green-300',
    'Electrical': 'bg-yellow-900 text-yellow-300',
    'Carpentry': 'bg-red-900 text-red-300',
    'Gardening': 'bg-emerald-900 text-emerald-300',
    'Painting': 'bg-purple-900 text-purple-300',
    'Moving': 'bg-orange-900 text-orange-300',
    'Appliance Repair': 'bg-indigo-900 text-indigo-300'
  }
  
  return colors[category] || 'bg-gray-900 text-gray-300'
}
</script>

<template>
  <MainLayout>
    <div class="container mx-auto px-4 py-8">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-white mb-2">Services</h1>
        <p class="text-gray-300">Find the perfect service for your home needs</p>
      </div>
      
      <!-- Search and Filters -->
      <div class="card mb-8">
        <div class="p-6">
          <div class="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-4 md:space-y-0">
            <!-- Search -->
            <div class="flex-grow">
              <div class="relative">
                <input 
                  v-model="searchQuery"
                  type="text" 
                  placeholder="Search services..." 
                  class="w-full bg-gray-800 text-white border border-gray-700 rounded-lg py-2 px-4 pl-10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  @input="updateFilters"
                >
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
            
            <!-- Category Filter -->
            <div class="w-full md:w-64">
              <select 
                v-model="selectedCategory"
                class="w-full bg-gray-800 text-white border border-gray-700 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                @change="updateFilters"
              >
                <option value="">All Categories</option>
                <option v-for="category in serviceStore.categories" :key="category" :value="category">
                  {{ category }}
                </option>
              </select>
            </div>
            
            <!-- Sort By -->
            <div class="w-full md:w-64">
              <select 
                v-model="sortBy"
                class="w-full bg-gray-800 text-white border border-gray-700 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="rating-desc">Highest Rated</option>
                <option value="name-asc">Name: A to Z</option>
              </select>
            </div>
            
            <!-- Clear Filters -->
            <div>
              <button 
                @click="clearFilters"
                class="w-full md:w-auto bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Clear Filters
              </button>
            </div>
          </div>
          
          <!-- Price Range Filter -->
          <div class="mt-4">
            <div class="flex justify-between mb-2">
              <span class="text-sm text-gray-400">Price Range:</span>
              <span class="text-sm text-white">${{ priceRange[0] }} - ${{ priceRange[1] }}</span>
            </div>
            <div class="flex space-x-4">
              <input 
                v-model.number="priceRange[0]"
                type="range" 
                min="0" 
                max="1000" 
                step="10"
                class="w-1/2 accent-indigo-500"
              >
              <input 
                v-model.number="priceRange[1]"
                type="range" 
                min="0" 
                max="1000" 
                step="10"
                class="w-1/2 accent-indigo-500"
              >
            </div>
          </div>
        </div>
      </div>
      
      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
      
      <!-- Error State -->
      <div v-else-if="error" class="bg-red-900 text-red-200 p-4 rounded mb-4">
        {{ error }}
      </div>
      
      <!-- No Results -->
      <div v-else-if="filteredServices.length === 0" class="card p-8 text-center">
        <p class="text-gray-300 text-lg mb-4">No services found matching your criteria.</p>
        <button @click="clearFilters" class="btn-primary">Clear Filters</button>
      </div>
      
      <!-- Services Grid -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div 
          v-for="service in filteredServices" 
          :key="service.id" 
          class="card hover:shadow-lg transition-all cursor-pointer"
          @click="viewServiceDetails(service.id)"
        >
          <div class="h-48 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-t-lg relative overflow-hidden">
            <img 
              v-if="service.imageUrl" 
              :src="service.imageUrl" 
              :alt="service.name"
              class="w-full h-full object-cover"
            >
          </div>
          
          <div class="p-6">
            <div class="flex justify-between items-start mb-2">
              <h3 class="text-xl font-semibold text-white">{{ service.name }}</h3>
              <span :class="`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(service.category)}`">
                {{ service.category }}
              </span>
            </div>
            
            <p class="text-gray-400 mb-4 line-clamp-2">{{ service.description }}</p>
            
            <div class="flex justify-between items-center">
              <div>
                <p class="text-2xl font-bold text-indigo-400">${{ service.price }}</p>
                <p class="text-sm text-gray-500">per hour</p>
              </div>
              
              <div class="flex items-center">
                <div class="flex text-yellow-400 mr-1">
                  <span v-for="i in 5" :key="i" class="text-sm">
                    {{ i <= Math.round(service.rating || 0) ? '★' : '☆' }}
                  </span>
                </div>
                <span class="text-sm text-gray-400">({{ service.reviewCount || 0 }})</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </MainLayout>
</template> 