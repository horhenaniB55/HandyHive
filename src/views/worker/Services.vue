<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useServiceStore } from '../../stores/services'
import { useWorkerStore } from '../../stores/workers'
import MainLayout from '../../components/layout/MainLayout.vue'
import { auth } from '../../firebase/config'

const router = useRouter()
const authStore = useAuthStore()
const serviceStore = useServiceStore()
const workerStore = useWorkerStore()

const loading = ref(true)
const submitting = ref(false)
const error = ref('')
const success = ref('')
const categories = ref([])
const workerServices = ref([])
const showAddForm = ref(false)
const isEditing = ref(false)
const editServiceId = ref(null)

// Form for adding/editing a service
const serviceForm = reactive({
  name: '',
  category: '',
  description: '',
  price: 0,
  duration: 60,
  workerId: ''
})

// Reset form fields
const resetForm = () => {
  serviceForm.name = ''
  serviceForm.category = ''
  serviceForm.description = ''
  serviceForm.price = 0
  serviceForm.duration = 60
  isEditing.value = false
  editServiceId.value = null
}

onMounted(async () => {
  loading.value = true
  
  try {
    // Get the user role from localStorage to immediately check permissions
    const savedRole = localStorage.getItem('userRole')
    const isWorkerPage = window.location.pathname.startsWith('/worker')
    
    // Check if user is authenticated
    if (!authStore.user) {
      // Wait for auth state to resolve with a timeout
      let authResolved = false
      
      await Promise.race([
        new Promise(resolve => {
          const unsubscribe = auth.onAuthStateChanged(user => {
            unsubscribe()
            authResolved = true
            resolve(user)
          })
        }),
        new Promise(resolve => setTimeout(() => {
          if (!authResolved) resolve(null)
        }, 2000)) // 2 second timeout
      ])
      
      // If still not authenticated after waiting, redirect
      if (!authStore.user && !isWorkerPage) {
        router.push('/login')
        return
      }
    }
    
    // Only perform role check if we have definitive role information
    if (authStore.userRole !== 'worker' && savedRole !== 'worker' && !isWorkerPage) {
      router.push('/')
      return
    }
    
    // Set worker ID for the form
    serviceForm.workerId = authStore.user.uid || localStorage.getItem('userId')
    
    // Fetch service categories
    await serviceStore.fetchCategories()
    categories.value = serviceStore.categories
    
    // Fetch services offered by this worker
    await fetchWorkerServices()
  } catch (err) {
    console.error('Error loading services:', err)
    error.value = 'Failed to load service information'
  } finally {
    loading.value = false
  }
})

// Fetch services for the current worker
const fetchWorkerServices = async () => {
  try {
    const workerId = authStore.user.uid || localStorage.getItem('userId')
    
    // Fetch worker profile to get service IDs
    const workerData = await workerStore.fetchWorkerById(workerId)
    
    // Fetch all services
    await serviceStore.fetchServices()
    
    // Filter to get only this worker's services
    workerServices.value = serviceStore.services.filter(service => 
      service.workerId === workerId
    )
  } catch (err) {
    console.error('Error fetching worker services:', err)
    error.value = 'Failed to load your services'
  }
}

// Create a new service
const createService = async () => {
  try {
    submitting.value = true
    error.value = ''
    success.value = ''
    
    // Validate inputs
    if (!serviceForm.name.trim()) {
      error.value = 'Service name is required'
      return
    }
    
    if (!serviceForm.category) {
      error.value = 'Please select a service category'
      return
    }
    
    if (serviceForm.price <= 0) {
      error.value = 'Price must be greater than 0'
      return
    }
    
    if (serviceForm.duration <= 0) {
      error.value = 'Duration must be greater than 0'
      return
    }
    
    // Format price to 2 decimal places
    serviceForm.price = parseFloat(serviceForm.price).toFixed(2)
    
    // Add service to database
    const newService = await serviceStore.addService({
      name: serviceForm.name,
      category: serviceForm.category,
      description: serviceForm.description,
      price: parseFloat(serviceForm.price),
      duration: parseInt(serviceForm.duration),
      workerId: serviceForm.workerId
    })
    
    // Reset form
    resetForm()
    showAddForm.value = false
    
    // Refresh services list
    await fetchWorkerServices()
    
    success.value = 'Service added successfully'
  } catch (err) {
    console.error('Error creating service:', err)
    error.value = 'Failed to create service: ' + (err.message || 'Unknown error')
  } finally {
    submitting.value = false
  }
}

// Update an existing service
const updateService = async () => {
  try {
    submitting.value = true
    error.value = ''
    success.value = ''
    
    // Validate inputs
    if (!serviceForm.name.trim()) {
      error.value = 'Service name is required'
      return
    }
    
    if (!serviceForm.category) {
      error.value = 'Please select a service category'
      return
    }
    
    if (serviceForm.price <= 0) {
      error.value = 'Price must be greater than 0'
      return
    }
    
    if (serviceForm.duration <= 0) {
      error.value = 'Duration must be greater than 0'
      return
    }
    
    // Format price to 2 decimal places
    serviceForm.price = parseFloat(serviceForm.price).toFixed(2)
    
    // Update service in database
    await serviceStore.updateService(editServiceId.value, {
      name: serviceForm.name,
      category: serviceForm.category,
      description: serviceForm.description,
      price: parseFloat(serviceForm.price),
      duration: parseInt(serviceForm.duration)
    })
    
    // Reset form
    resetForm()
    showAddForm.value = false
    
    // Refresh services list
    await fetchWorkerServices()
    
    success.value = 'Service updated successfully'
  } catch (err) {
    console.error('Error updating service:', err)
    error.value = 'Failed to update service: ' + (err.message || 'Unknown error')
  } finally {
    submitting.value = false
  }
}

// Handle form submission
const submitServiceForm = () => {
  if (isEditing.value) {
    updateService()
  } else {
    createService()
  }
}

// Edit an existing service
const editService = (service) => {
  // Populate form with service data
  serviceForm.name = service.name
  serviceForm.category = service.category
  serviceForm.description = service.description
  serviceForm.price = service.price
  serviceForm.duration = service.duration
  
  // Set editing mode
  isEditing.value = true
  editServiceId.value = service.id
  showAddForm.value = true
  
  // Scroll to form
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// Delete a service
const deleteService = async (serviceId) => {
  if (!confirm('Are you sure you want to delete this service?')) {
    return
  }
  
  try {
    loading.value = true
    error.value = ''
    
    // Use the service store's deleteService method
    await serviceStore.deleteService(serviceId)
    
    // Refresh services list
    await fetchWorkerServices()
    
    success.value = 'Service deleted successfully'
  } catch (err) {
    console.error('Error deleting service:', err)
    error.value = 'Failed to delete service: ' + (err.message || 'Unknown error')
  } finally {
    loading.value = false
  }
}

// Format price as currency
const formatPrice = (price) => {
  return '$' + parseFloat(price).toFixed(2)
}

// Format duration in minutes
const formatDuration = (minutes) => {
  if (minutes < 60) {
    return `${minutes} min`
  } else {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins ? `${hours} hr ${mins} min` : `${hours} hr`
  }
}
</script>

<template>
  <MainLayout>
    <div class="container mx-auto px-4 py-8">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-white mb-4">Manage Your Services</h1>
        <p class="text-gray-300">Create and manage the services you offer to customers.</p>
      </div>
      
      <!-- Loading Indicator -->
      <div v-if="loading" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
      
      <!-- Error Message -->
      <div v-if="error" class="bg-red-900 text-red-200 p-4 rounded mb-6">
        {{ error }}
      </div>
      
      <!-- Success Message -->
      <div v-if="success" class="bg-green-900 text-green-200 p-4 rounded mb-6">
        {{ success }}
      </div>
      
      <!-- Add/Edit Service Form -->
      <div class="card mb-8">
        <div class="p-6">
          <div class="flex justify-between items-center mb-4" v-if="!showAddForm">
            <h2 class="text-xl font-semibold text-white">Your Services</h2>
            <button 
              @click="showAddForm = true; resetForm()"
              class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
            >
              Add New Service
            </button>
          </div>
          
          <div v-if="showAddForm">
            <h2 class="text-xl font-semibold text-white mb-4">
              {{ isEditing ? 'Edit Service' : 'Add New Service' }}
            </h2>
            
            <form @submit.prevent="submitServiceForm" class="space-y-4">
              <div>
                <label class="block text-gray-300 mb-2" for="name">Service Name</label>
                <input 
                  id="name"
                  v-model="serviceForm.name"
                  type="text"
                  placeholder="e.g., Basic Plumbing Service"
                  class="w-full bg-gray-700 text-white border border-gray-600 rounded-lg p-2"
                />
              </div>
              
              <div>
                <label class="block text-gray-300 mb-2" for="category">Category</label>
                <select 
                  id="category"
                  v-model="serviceForm.category"
                  class="w-full bg-gray-700 text-white border border-gray-600 rounded-lg p-2"
                >
                  <option value="" disabled>Select a category</option>
                  <option v-for="category in categories" :key="category" :value="category">
                    {{ category }}
                  </option>
                </select>
              </div>
              
              <div>
                <label class="block text-gray-300 mb-2" for="description">Description</label>
                <textarea 
                  id="description"
                  v-model="serviceForm.description"
                  rows="4"
                  placeholder="Describe your service..."
                  class="w-full bg-gray-700 text-white border border-gray-600 rounded-lg p-2"
                ></textarea>
              </div>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-gray-300 mb-2" for="price">Price ($)</label>
                  <input 
                    id="price"
                    v-model="serviceForm.price"
                    type="number"
                    min="0.01"
                    step="0.01"
                    class="w-full bg-gray-700 text-white border border-gray-600 rounded-lg p-2"
                  />
                </div>
                
                <div>
                  <label class="block text-gray-300 mb-2" for="duration">Duration (minutes)</label>
                  <input 
                    id="duration"
                    v-model="serviceForm.duration"
                    type="number"
                    min="1"
                    class="w-full bg-gray-700 text-white border border-gray-600 rounded-lg p-2"
                  />
                </div>
              </div>
              
              <div class="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  @click="showAddForm = false; resetForm()"
                  class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  :disabled="submitting"
                  class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {{ isEditing ? 'Update Service' : 'Create Service' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      
      <!-- Services List -->
      <div class="card" v-if="!loading">
        <div class="p-6">
          <h2 v-if="!showAddForm" class="text-xl font-semibold text-white mb-6">
            Your Services
          </h2>
          
          <div v-if="workerServices.length === 0" class="text-gray-400 text-center py-8">
            <p>You haven't added any services yet.</p>
            <button 
              @click="showAddForm = true"
              class="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
            >
              Add Your First Service
            </button>
          </div>
          
          <div v-else class="space-y-6">
            <div 
              v-for="service in workerServices" 
              :key="service.id" 
              class="bg-gray-800 rounded-lg p-4 flex flex-col md:flex-row gap-4 relative"
            >
              <!-- Service Content -->
              <div class="flex-1">
                <h3 class="text-lg font-medium text-white mb-1">{{ service.name }}</h3>
                <div class="mb-2">
                  <span class="inline-block text-xs px-2 py-1 rounded bg-indigo-900 text-indigo-300">
                    {{ service.category }}
                  </span>
                </div>
                <p class="text-gray-400 mb-3">{{ service.description }}</p>
                <div class="flex flex-wrap gap-4 text-sm">
                  <div>
                    <span class="text-gray-400">Price:</span>
                    <span class="text-green-400 font-semibold ml-1">{{ formatPrice(service.price) }}</span>
                  </div>
                  <div>
                    <span class="text-gray-400">Duration:</span>
                    <span class="text-gray-300 ml-1">{{ formatDuration(service.duration) }}</span>
                  </div>
                </div>
              </div>
              
              <!-- Action Buttons -->
              <div class="flex md:flex-col gap-2 justify-start">
                <button 
                  @click="editService(service)"
                  class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                >
                  Edit
                </button>
                <button 
                  @click="deleteService(service.id)"
                  class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </MainLayout>
</template> 