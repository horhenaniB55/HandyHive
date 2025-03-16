<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useBookingStore } from '../../stores/bookings'
import MainLayout from '../../components/layout/MainLayout.vue'

const router = useRouter()
const authStore = useAuthStore()
const bookingStore = useBookingStore()

const user = ref(null)
const recentBookings = ref([])
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  if (!authStore.isAuthenticated || !authStore.isCustomer) {
    router.push('/login')
    return
  }
  
  user.value = authStore.user
  
  try {
    await bookingStore.fetchCustomerBookings()
    recentBookings.value = bookingStore.customerBookings.slice(0, 3)
  } catch (err) {
    error.value = 'Failed to load bookings'
    console.error(err)
  } finally {
    loading.value = false
  }
})

const getStatusClass = (status) => {
  switch (status) {
    case 'completed':
      return 'bg-green-900 text-green-300'
    case 'in-progress':
      return 'bg-blue-900 text-blue-300'
    case 'accepted':
      return 'bg-indigo-900 text-indigo-300'
    case 'requested':
      return 'bg-yellow-900 text-yellow-300'
    case 'cancelled':
      return 'bg-red-900 text-red-300'
    default:
      return 'bg-gray-900 text-gray-300'
  }
}

const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A'
  
  const date = timestamp instanceof Date ? timestamp : timestamp.toDate()
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const viewAllBookings = () => {
  router.push('/customer/bookings')
}

const bookService = () => {
  router.push('/services')
}
</script>

<template>
  <MainLayout>
    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
    </div>
    
    <div v-else>
      <!-- Welcome Section -->
      <div class="bg-gray-800 rounded-xl p-6 mb-8 shadow-lg">
        <h1 class="text-2xl font-bold text-white mb-2">Welcome back, {{ user?.displayName || 'Customer' }}!</h1>
        <p class="text-gray-300">Manage your service bookings and find skilled workers for your home needs.</p>
      </div>
      
      <!-- Quick Actions -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="card hover:shadow-lg transition-all cursor-pointer" @click="bookService">
          <div class="p-6 flex items-center">
            <div class="h-12 w-12 rounded-full bg-indigo-600 flex items-center justify-center text-white">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div class="ml-4">
              <h3 class="text-lg font-semibold text-white">Book a Service</h3>
              <p class="text-gray-400">Find workers for your home needs</p>
            </div>
          </div>
        </div>
        
        <div class="card hover:shadow-lg transition-all cursor-pointer" @click="viewAllBookings">
          <div class="p-6 flex items-center">
            <div class="h-12 w-12 rounded-full bg-purple-600 flex items-center justify-center text-white">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div class="ml-4">
              <h3 class="text-lg font-semibold text-white">My Bookings</h3>
              <p class="text-gray-400">View and manage your bookings</p>
            </div>
          </div>
        </div>
        
        <div class="card hover:shadow-lg transition-all cursor-pointer" @click="router.push('/customer/profile')">
          <div class="p-6 flex items-center">
            <div class="h-12 w-12 rounded-full bg-green-600 flex items-center justify-center text-white">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div class="ml-4">
              <h3 class="text-lg font-semibold text-white">My Profile</h3>
              <p class="text-gray-400">Update your personal information</p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Recent Bookings -->
      <div class="mb-8">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold text-white">Recent Bookings</h2>
          <button @click="viewAllBookings" class="text-indigo-400 hover:text-indigo-300 font-medium">
            View All <span aria-hidden="true">→</span>
          </button>
        </div>
        
        <div v-if="error" class="bg-red-900 text-red-200 p-4 rounded mb-4">
          {{ error }}
        </div>
        
        <div v-else-if="recentBookings.length === 0" class="card p-6 text-center">
          <p class="text-gray-400">You don't have any bookings yet.</p>
          <button @click="bookService" class="btn-primary mt-4">Book a Service Now</button>
        </div>
        
        <div v-else class="space-y-4">
          <div v-for="booking in recentBookings" :key="booking.id" class="card hover:shadow-lg transition-all">
            <div class="p-6">
              <div class="flex justify-between items-start mb-4">
                <div>
                  <h3 class="text-lg font-semibold text-white">{{ booking.serviceId || 'Service' }}</h3>
                  <p class="text-gray-400">Scheduled for: {{ formatDate(booking.scheduledTime) }}</p>
                </div>
                <span :class="`px-2 py-1 rounded text-xs font-medium ${getStatusClass(booking.status)}`">
                  {{ booking.status }}
                </span>
              </div>
              
              <div class="border-t border-gray-700 pt-4 mt-4">
                <div class="flex justify-between">
                  <div>
                    <p class="text-sm text-gray-400">Worker:</p>
                    <p class="text-white">{{ booking.workerName || 'Assigned Worker' }}</p>
                  </div>
                  <div>
                    <p class="text-sm text-gray-400">Price:</p>
                    <p class="text-white">${{ booking.price || '0.00' }}</p>
                  </div>
                  <div>
                    <button 
                      @click="router.push(`/customer/bookings/${booking.id}`)" 
                      class="btn-secondary py-1 px-3 text-sm"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Recommended Services -->
      <div>
        <h2 class="text-xl font-bold text-white mb-4">Recommended Services</h2>
        
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div class="card hover:shadow-lg transition-all cursor-pointer" @click="router.push('/services?category=Cleaning')">
            <div class="h-40 bg-gradient-to-r from-blue-500 to-blue-600 rounded-t-lg"></div>
            <div class="p-5">
              <h3 class="text-lg font-semibold text-white mb-2">Home Cleaning</h3>
              <p class="text-gray-400 mb-4">Professional cleaning services for your home</p>
              <span class="inline-block bg-blue-900 text-blue-300 text-xs px-2 py-1 rounded">Cleaning</span>
            </div>
          </div>
          
          <div class="card hover:shadow-lg transition-all cursor-pointer" @click="router.push('/services?category=Plumbing')">
            <div class="h-40 bg-gradient-to-r from-green-500 to-green-600 rounded-t-lg"></div>
            <div class="p-5">
              <h3 class="text-lg font-semibold text-white mb-2">Plumbing</h3>
              <p class="text-gray-400 mb-4">Fix leaks, install fixtures, and solve plumbing issues</p>
              <span class="inline-block bg-green-900 text-green-300 text-xs px-2 py-1 rounded">Plumbing</span>
            </div>
          </div>
          
          <div class="card hover:shadow-lg transition-all cursor-pointer" @click="router.push('/services?category=Electrical')">
            <div class="h-40 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-t-lg"></div>
            <div class="p-5">
              <h3 class="text-lg font-semibold text-white mb-2">Electrical</h3>
              <p class="text-gray-400 mb-4">Electrical repairs and installations</p>
              <span class="inline-block bg-yellow-900 text-yellow-300 text-xs px-2 py-1 rounded">Electrical</span>
            </div>
          </div>
          
          <div class="card hover:shadow-lg transition-all cursor-pointer" @click="router.push('/services?category=Carpentry')">
            <div class="h-40 bg-gradient-to-r from-red-500 to-red-600 rounded-t-lg"></div>
            <div class="p-5">
              <h3 class="text-lg font-semibold text-white mb-2">Carpentry</h3>
              <p class="text-gray-400 mb-4">Furniture assembly and repairs</p>
              <span class="inline-block bg-red-900 text-red-300 text-xs px-2 py-1 rounded">Carpentry</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </MainLayout>
</template> 