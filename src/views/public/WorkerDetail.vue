<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useWorkerStore } from '../../stores/workers'
import { useServiceStore } from '../../stores/services'
import { useAuthStore } from '../../stores/auth'
import MainLayout from '../../components/layout/MainLayout.vue'

const router = useRouter()
const route = useRoute()
const workerStore = useWorkerStore()
const serviceStore = useServiceStore()
const authStore = useAuthStore()

const workerId = route.params.id
const worker = ref(null)
const services = ref([])
const reviews = ref([])
const loading = ref(true)
const error = ref('')

// For displaying availability calendar
const availabilityCalendar = ref([
  { day: 'Monday', hours: '9:00 AM - 5:00 PM' },
  { day: 'Tuesday', hours: '9:00 AM - 5:00 PM' },
  { day: 'Wednesday', hours: '9:00 AM - 5:00 PM' },
  { day: 'Thursday', hours: '9:00 AM - 5:00 PM' },
  { day: 'Friday', hours: '9:00 AM - 5:00 PM' },
  { day: 'Saturday', hours: '10:00 AM - 2:00 PM' },
  { day: 'Sunday', hours: 'Closed' }
])

onMounted(async () => {
  try {
    loading.value = true
    // Fetch worker details, their services, and reviews
    await workerStore.fetchWorkerById(workerId)
    
    // Use the currentWorker from the store directly instead of looking it up
    worker.value = workerStore.currentWorker
    
    if (!worker.value) {
      console.error('Worker not found for ID:', workerId)
      error.value = 'Worker not found'
      return
    }
    
    console.log('Worker found:', worker.value)
    
    // Fetch services offered by this worker if serviceCategories exists
    if (worker.value.serviceCategories && Array.isArray(worker.value.serviceCategories)) {
      await serviceStore.fetchServicesByCategories(worker.value.serviceCategories)
      services.value = serviceStore.services
    } else {
      console.log('No service categories found for worker')
      services.value = []
    }
    
    // Fetch reviews for this worker
    try {
      if (typeof workerStore.fetchWorkerReviews === 'function') {
        await workerStore.fetchWorkerReviews(workerId)
        reviews.value = workerStore.workerReviews
      } else {
        console.log('Worker review functionality not available')
        reviews.value = []
      }
    } catch (error) {
      console.error('Error fetching worker reviews:', error)
      reviews.value = []
    }
    
    // Default data for development if needed
    if (!reviews.value || reviews.value.length === 0) {
      reviews.value = [
        {
          id: '1',
          userId: 'user1',
          userName: 'John D.',
          rating: 5,
          comment: 'Excellent service. Very professional and timely.',
          date: new Date('2023-10-15').toISOString()
        },
        {
          id: '2',
          userId: 'user2',
          userName: 'Sarah M.',
          rating: 4,
          comment: 'Good service, but arrived a bit late.',
          date: new Date('2023-09-22').toISOString()
        },
        {
          id: '3',
          userId: 'user3',
          userName: 'Robert K.',
          rating: 5,
          comment: 'Fantastic work! Will definitely hire again.',
          date: new Date('2023-08-05').toISOString()
        }
      ]
    }
  } catch (err) {
    console.error('Error fetching worker details:', err)
    error.value = 'Failed to load worker details'
  } finally {
    loading.value = false
  }
})

const bookService = (serviceId) => {
  if (!authStore.user) {
    router.push('/login')
    return
  }
  
  router.push({
    path: `/services/${serviceId}`,
    query: { workerId: workerId }
  })
}

const contactWorker = () => {
  if (!authStore.user) {
    router.push('/login')
    return
  }
  
  // In a real app, this would open a chat/messaging interface
  alert('Contact functionality would be implemented here')
}

// Helper functions
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

const formatDate = (dateInput) => {
  if (!dateInput) return 'Unknown date'
  
  let date;
  
  // Handle Firestore timestamp
  if (dateInput && typeof dateInput === 'object' && dateInput.seconds) {
    // Convert Firebase Timestamp to JS Date
    date = new Date(dateInput.seconds * 1000)
  } 
  // Handle string dates (ISO format)
  else if (typeof dateInput === 'string') {
    date = new Date(dateInput)
  }
  // Handle Date objects
  else if (dateInput instanceof Date) {
    date = dateInput
  }
  // Default fallback
  else {
    return 'Invalid date'
  }
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    return 'Invalid date'
  }
  
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
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
      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
      
      <!-- Error State -->
      <div v-else-if="error" class="bg-red-900 text-red-200 p-4 rounded mb-4">
        {{ error }}
      </div>
      
      <!-- Worker Profile -->
      <div v-else>
        <!-- Profile Header -->
        <div class="card mb-8">
          <div class="p-6 md:p-8">
            <div class="flex flex-col md:flex-row items-start md:items-center">
              <!-- Profile Image/Avatar -->
              <div class="bg-indigo-600 h-24 w-24 rounded-full flex items-center justify-center text-2xl font-bold text-white mb-4 md:mb-0 md:mr-6">
                {{ worker.displayName.charAt(0) }}
              </div>
              
              <!-- Profile Info -->
              <div class="flex-1">
                <h1 class="text-3xl font-bold text-white mb-2">{{ worker.displayName }}</h1>
                
                <!-- Rating -->
                <div class="flex items-center mb-3">
                  <div class="flex mr-2">
                    <template v-for="(star, i) in getRatingStars(worker.rating)" :key="i">
                      <svg v-if="star === 'full'" class="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                      </svg>
                      <svg v-else-if="star === 'half'" class="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" opacity="0.5"></path>
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0" fill="none"></path>
                      </svg>
                      <svg v-else class="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                      </svg>
                    </template>
                  </div>
                  <span class="text-gray-300">{{ worker.rating.toFixed(1) }} ({{ reviews.length }} reviews)</span>
                </div>
                
                <!-- Service Categories -->
                <div class="flex flex-wrap gap-2 mb-4">
                  <span 
                    v-for="category in worker.serviceCategories" 
                    :key="category" 
                    :class="`text-xs px-2 py-1 rounded ${getCategoryColor(category)}`"
                  >
                    {{ category }}
                  </span>
                </div>
                
                <!-- Experience & Location -->
                <div class="flex flex-wrap gap-6 text-gray-300">
                  <div>
                    <span class="font-medium text-white">Experience:</span> {{ worker.yearsOfExperience }} years
                  </div>
                  <div>
                    <span class="font-medium text-white">Location:</span> {{ worker.location || 'Not specified' }}
                  </div>
                  <div>
                    <span class="font-medium text-white">Jobs Completed:</span> {{ worker.completedJobs || 0 }}
                  </div>
                </div>
              </div>
              
              <!-- Action Buttons -->
              <div class="w-full md:w-auto mt-4 md:mt-0 flex flex-col gap-3">
                <button 
                  @click="contactWorker" 
                  class="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center justify-center"
                >
                  <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                  </svg>
                  Contact
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Bio and Services -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <!-- Bio and Availability -->
          <div class="lg:col-span-1">
            <!-- Bio -->
            <div class="card mb-6">
              <div class="p-6">
                <h2 class="text-xl font-semibold text-white mb-4">About</h2>
                <p class="text-gray-300 whitespace-pre-line">{{ worker.bio || 'No bio provided.' }}</p>
              </div>
            </div>
            
            <!-- Availability -->
            <div class="card">
              <div class="p-6">
                <h2 class="text-xl font-semibold text-white mb-4">Availability</h2>
                <div class="space-y-2">
                  <div v-for="(day, index) in availabilityCalendar" :key="index" class="flex justify-between">
                    <span class="text-white font-medium">{{ day.day }}:</span>
                    <span class="text-gray-300">{{ day.hours }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Services Offered -->
          <div class="lg:col-span-2">
            <div class="card">
              <div class="p-6">
                <h2 class="text-xl font-semibold text-white mb-4">Services Offered</h2>
                
                <div v-if="services.length === 0" class="text-gray-300 italic">
                  No services currently available.
                </div>
                
                <div v-else class="space-y-4">
                  <div v-for="service in services" :key="service.id" class="bg-gray-800 rounded-lg p-4 flex flex-col md:flex-row gap-4 relative">
                    <!-- Service Content -->
                    <div class="flex-1">
                      <h3 class="text-lg font-medium text-white mb-1">{{ service.name }}</h3>
                      <p class="text-gray-400 mb-3 line-clamp-2">{{ service.description }}</p>
                      <div class="flex items-center justify-between">
                        <span class="text-green-400 font-semibold">${{ service.price.toFixed(2) }}</span>
                        <span class="text-gray-300 text-sm">{{ service.duration }} min</span>
                      </div>
                    </div>
                    
                    <!-- Book Button -->
                    <div class="w-full md:w-auto flex justify-end items-center">
                      <button 
                        @click="bookService(service.id)" 
                        class="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
                      >
                        Book Now
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Reviews -->
        <div class="card">
          <div class="p-6">
            <h2 class="text-xl font-semibold text-white mb-6">Customer Reviews</h2>
            
            <div v-if="reviews.length === 0" class="text-gray-300 italic">
              No reviews yet.
            </div>
            
            <div v-else class="space-y-6">
              <div v-for="review in reviews" :key="review.id" class="border-b border-gray-700 pb-6 last:border-0 last:pb-0">
                <div class="flex justify-between items-start mb-2">
                  <div>
                    <h4 class="text-lg font-medium text-white">{{ review.userName || review.displayName || 'Anonymous' }}</h4>
                    <div class="flex items-center">
                      <div class="flex mr-2">
                        <template v-for="(star, i) in getRatingStars(review.rating)" :key="i">
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
                    </div>
                  </div>
                  <div class="text-gray-400 text-sm">
                    {{ formatDate(review.date || review.createdAt) }}
                  </div>
                </div>
                <p class="text-gray-300">{{ review.comment || review.text || '' }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </MainLayout>
</template> 