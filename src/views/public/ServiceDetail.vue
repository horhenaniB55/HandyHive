<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useServiceStore } from '../../stores/services'
import { useAuthStore } from '../../stores/auth'
import { useWorkerStore } from '../../stores/workers'
import { useBookingStore } from '../../stores/bookings'
import MainLayout from '../../components/layout/MainLayout.vue'

const router = useRouter()
const route = useRoute()
const serviceStore = useServiceStore()
const authStore = useAuthStore()
const workerStore = useWorkerStore()
const bookingStore = useBookingStore()

const service = ref(null)
const availableWorkers = ref([])
const selectedWorker = ref(null)
const scheduledDate = ref('')
const scheduledTime = ref('')
const notes = ref('')
const loading = ref(true)
const bookingLoading = ref(false)
const error = ref('')
const bookingSuccess = ref(false)

onMounted(async () => {
  try {
    const serviceId = route.params.id
    
    if (!serviceId) {
      router.push('/services')
      return
    }
    
    // Fetch service details
    await serviceStore.fetchServiceById(serviceId)
    service.value = serviceStore.currentService
    
    if (!service.value) {
      error.value = 'Service not found'
      return
    }
    
    // Fetch available workers for this service
    await workerStore.fetchWorkersByService(service.value.category)
    availableWorkers.value = workerStore.workers.filter(worker => 
      worker.services && worker.services.includes(service.value.id)
    )
    
    // Set default date to tomorrow
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    scheduledDate.value = tomorrow.toISOString().split('T')[0]
    
    // Set default time to 10:00 AM
    scheduledTime.value = '10:00'
  } catch (err) {
    error.value = 'Failed to load service details'
    console.error(err)
  } finally {
    loading.value = false
  }
})

const bookService = async () => {
  if (!authStore.isAuthenticated) {
    // Redirect to login with return URL
    router.push({
      path: '/login',
      query: { redirect: route.fullPath }
    })
    return
  }
  
  if (!authStore.isCustomer) {
    error.value = 'Only customers can book services'
    return
  }
  
  if (!selectedWorker.value) {
    error.value = 'Please select a worker'
    return
  }
  
  if (!scheduledDate.value || !scheduledTime.value) {
    error.value = 'Please select a date and time'
    return
  }
  
  try {
    bookingLoading.value = true
    error.value = ''
    
    // Combine date and time into a single timestamp
    const scheduledDateTime = new Date(`${scheduledDate.value}T${scheduledTime.value}`)
    
    // Create booking
    await bookingStore.createBooking({
      serviceId: service.value.id,
      serviceName: service.value.name,
      workerId: selectedWorker.value,
      scheduledTime: scheduledDateTime,
      price: service.value.price,
      notes: notes.value,
      status: 'requested'
    })
    
    bookingSuccess.value = true
  } catch (err) {
    error.value = 'Failed to book service'
    console.error(err)
  } finally {
    bookingLoading.value = false
  }
}

const getWorkerName = (workerId) => {
  const worker = availableWorkers.value.find(w => w.id === workerId)
  return worker ? worker.displayName : 'Unknown Worker'
}

const getWorkerRating = (workerId) => {
  const worker = availableWorkers.value.find(w => w.id === workerId)
  return worker ? worker.rating || 0 : 0
}

const viewAllServices = () => {
  router.push('/services')
}

const viewBookings = () => {
  router.push('/customer/bookings')
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
      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
      
      <!-- Error State -->
      <div v-else-if="error" class="bg-red-900 text-red-200 p-4 rounded mb-4">
        {{ error }}
        <div class="mt-4">
          <button @click="viewAllServices" class="btn-primary">View All Services</button>
        </div>
      </div>
      
      <!-- Booking Success -->
      <div v-else-if="bookingSuccess" class="card p-8 text-center">
        <div class="mb-4 flex justify-center">
          <div class="h-16 w-16 rounded-full bg-green-600 flex items-center justify-center text-white">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <h2 class="text-2xl font-bold text-white mb-2">Booking Successful!</h2>
        <p class="text-gray-300 mb-6">Your service has been booked successfully. The worker will be notified of your request.</p>
        <div class="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
          <button @click="viewBookings" class="btn-primary">View My Bookings</button>
          <button @click="viewAllServices" class="btn-secondary">Book Another Service</button>
        </div>
      </div>
      
      <!-- Service Details -->
      <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Service Info -->
        <div class="lg:col-span-2">
          <div class="flex items-center mb-4">
            <button @click="viewAllServices" class="text-indigo-400 hover:text-indigo-300 mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span class="text-gray-400">Back to Services</span>
          </div>
          
          <div class="card overflow-hidden mb-8">
            <div class="h-64 bg-gradient-to-r from-indigo-500 to-purple-600 relative">
              <img 
                v-if="service.imageUrl" 
                :src="service.imageUrl" 
                :alt="service.name"
                class="w-full h-full object-cover"
              >
            </div>
            
            <div class="p-6">
              <div class="flex justify-between items-start mb-4">
                <h1 class="text-3xl font-bold text-white">{{ service.name }}</h1>
                <span :class="`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(service.category)}`">
                  {{ service.category }}
                </span>
              </div>
              
              <div class="flex items-center mb-6">
                <div class="flex text-yellow-400 mr-2">
                  <span v-for="i in 5" :key="i" class="text-sm">
                    {{ i <= Math.round(service.rating || 0) ? '★' : '☆' }}
                  </span>
                </div>
                <span class="text-gray-400">({{ service.reviewCount || 0 }} reviews)</span>
                <span class="mx-2 text-gray-600">|</span>
                <span class="text-2xl font-bold text-indigo-400">${{ service.price }}</span>
                <span class="text-gray-500 ml-1">per hour</span>
              </div>
              
              <div class="mb-6">
                <h2 class="text-xl font-semibold text-white mb-2">Description</h2>
                <p class="text-gray-300">{{ service.description }}</p>
              </div>
              
              <div>
                <h2 class="text-xl font-semibold text-white mb-2">What's Included</h2>
                <ul class="list-disc list-inside text-gray-300 space-y-1">
                  <li v-for="(item, index) in service.includes || ['Professional service', 'Quality materials', 'Satisfaction guarantee']" :key="index">
                    {{ item }}
                  </li>
                </ul>
              </div>
            </div>
          </div>
          
          <!-- Available Workers -->
          <div class="card p-6 mb-8">
            <h2 class="text-xl font-semibold text-white mb-4">Available Workers</h2>
            
            <div v-if="availableWorkers.length === 0" class="text-gray-400 text-center py-4">
              No workers available for this service at the moment.
            </div>
            
            <div v-else class="space-y-4">
              <div 
                v-for="worker in availableWorkers" 
                :key="worker.id" 
                :class="[
                  'p-4 rounded-lg border transition-all',
                  selectedWorker === worker.id 
                    ? 'border-indigo-500 bg-indigo-900 bg-opacity-20' 
                    : 'border-gray-700 hover:border-indigo-500'
                ]"
                @click="selectedWorker = worker.id"
              >
                <div class="flex items-center">
                  <div class="h-12 w-12 rounded-full bg-gray-700 overflow-hidden mr-4">
                    <img 
                      v-if="worker.photoURL" 
                      :src="worker.photoURL" 
                      :alt="worker.displayName"
                      class="h-full w-full object-cover"
                    >
                    <div v-else class="h-full w-full flex items-center justify-center text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  </div>
                  
                  <div class="flex-grow">
                    <div class="flex justify-between items-center">
                      <h3 class="text-lg font-semibold text-white">{{ worker.displayName }}</h3>
                      <div class="flex items-center">
                        <div class="flex text-yellow-400 mr-1">
                          <span v-for="i in 5" :key="i" class="text-sm">
                            {{ i <= Math.round(worker.rating || 0) ? '★' : '☆' }}
                          </span>
                        </div>
                        <span class="text-sm text-gray-400">({{ worker.reviewCount || 0 }})</span>
                      </div>
                    </div>
                    
                    <p class="text-gray-400 text-sm">{{ worker.completedJobs || 0 }} jobs completed</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Reviews -->
          <div class="card p-6">
            <h2 class="text-xl font-semibold text-white mb-4">Customer Reviews</h2>
            
            <div v-if="!service.reviews || service.reviews.length === 0" class="text-gray-400 text-center py-4">
              No reviews yet for this service.
            </div>
            
            <div v-else class="space-y-6">
              <div v-for="(review, index) in service.reviews" :key="index" class="border-b border-gray-700 pb-6 last:border-0 last:pb-0">
                <div class="flex justify-between items-start mb-2">
                  <div class="flex items-center">
                    <div class="h-10 w-10 rounded-full bg-gray-700 mr-3"></div>
                    <div>
                      <h3 class="text-white font-medium">{{ review.userName || 'Customer' }}</h3>
                      <p class="text-gray-500 text-sm">{{ new Date(review.date).toLocaleDateString() }}</p>
                    </div>
                  </div>
                  
                  <div class="flex text-yellow-400">
                    <span v-for="i in 5" :key="i" class="text-sm">
                      {{ i <= review.rating ? '★' : '☆' }}
                    </span>
                  </div>
                </div>
                
                <p class="text-gray-300">{{ review.comment }}</p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Booking Form -->
        <div class="lg:col-span-1">
          <div class="card p-6 sticky top-4">
            <h2 class="text-xl font-semibold text-white mb-4">Book This Service</h2>
            
            <div v-if="!authStore.isAuthenticated" class="mb-4">
              <p class="text-gray-300 mb-4">Please log in to book this service.</p>
              <button 
                @click="router.push({ path: '/login', query: { redirect: route.fullPath } })" 
                class="btn-primary w-full"
              >
                Log In to Continue
              </button>
            </div>
            
            <form v-else @submit.prevent="bookService" class="space-y-4">
              <!-- Worker Selection -->
              <div>
                <label class="block text-gray-300 mb-2">Select Worker</label>
                <select 
                  v-model="selectedWorker"
                  class="w-full bg-gray-800 text-white border border-gray-700 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="" disabled>Choose a worker</option>
                  <option 
                    v-for="worker in availableWorkers" 
                    :key="worker.id" 
                    :value="worker.id"
                  >
                    {{ worker.displayName }} ({{ worker.rating || 0 }}/5)
                  </option>
                </select>
              </div>
              
              <!-- Date Selection -->
              <div>
                <label class="block text-gray-300 mb-2">Select Date</label>
                <input 
                  v-model="scheduledDate"
                  type="date" 
                  class="w-full bg-gray-800 text-white border border-gray-700 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  :min="new Date().toISOString().split('T')[0]"
                  required
                >
              </div>
              
              <!-- Time Selection -->
              <div>
                <label class="block text-gray-300 mb-2">Select Time</label>
                <input 
                  v-model="scheduledTime"
                  type="time" 
                  class="w-full bg-gray-800 text-white border border-gray-700 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
              </div>
              
              <!-- Notes -->
              <div>
                <label class="block text-gray-300 mb-2">Additional Notes (Optional)</label>
                <textarea 
                  v-model="notes"
                  rows="3" 
                  class="w-full bg-gray-800 text-white border border-gray-700 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Any special requirements or instructions..."
                ></textarea>
              </div>
              
              <!-- Price Summary -->
              <div class="border-t border-gray-700 pt-4">
                <div class="flex justify-between mb-2">
                  <span class="text-gray-300">Service Price</span>
                  <span class="text-white">${{ service.price }} / hour</span>
                </div>
                <div class="flex justify-between mb-2">
                  <span class="text-gray-300">Estimated Duration</span>
                  <span class="text-white">1 hour</span>
                </div>
                <div class="flex justify-between font-bold">
                  <span class="text-gray-300">Total</span>
                  <span class="text-indigo-400">${{ service.price }}</span>
                </div>
              </div>
              
              <!-- Error Message -->
              <div v-if="error" class="bg-red-900 text-red-200 p-3 rounded">
                {{ error }}
              </div>
              
              <!-- Submit Button -->
              <button 
                type="submit" 
                class="btn-primary w-full"
                :disabled="bookingLoading"
              >
                <span v-if="bookingLoading">
                  <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
                <span v-else>Book Now</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  </MainLayout>
</template> 