<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useBookingStore } from '../../stores/bookings'
import MainLayout from '../../components/layout/MainLayout.vue'

const router = useRouter()
const authStore = useAuthStore()
const bookingStore = useBookingStore()

const bookings = ref([])
const loading = ref(true)
const error = ref('')
const statusFilter = ref('all')
const searchQuery = ref('')
const sortBy = ref('date-desc')

// Status options for filtering
const statusOptions = [
  { value: 'all', label: 'All Bookings' },
  { value: 'requested', label: 'Requested' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' }
]

onMounted(async () => {
  if (!authStore.isAuthenticated || !authStore.isCustomer) {
    router.push('/login')
    return
  }
  
  try {
    await bookingStore.fetchCustomerBookings()
    bookings.value = bookingStore.customerBookings
  } catch (err) {
    error.value = 'Failed to load bookings'
    console.error(err)
  } finally {
    loading.value = false
  }
})

// Computed property for filtered and sorted bookings
const filteredBookings = computed(() => {
  let result = [...bookings.value]
  
  // Filter by status
  if (statusFilter.value !== 'all') {
    result = result.filter(booking => booking.status === statusFilter.value)
  }
  
  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(booking => 
      (booking.serviceName && booking.serviceName.toLowerCase().includes(query)) || 
      (booking.workerName && booking.workerName.toLowerCase().includes(query))
    )
  }
  
  // Sort results
  switch (sortBy.value) {
    case 'date-desc':
      result.sort((a, b) => {
        const dateA = a.scheduledTime ? a.scheduledTime.toDate() : new Date(0)
        const dateB = b.scheduledTime ? b.scheduledTime.toDate() : new Date(0)
        return dateB - dateA
      })
      break
    case 'date-asc':
      result.sort((a, b) => {
        const dateA = a.scheduledTime ? a.scheduledTime.toDate() : new Date(0)
        const dateB = b.scheduledTime ? b.scheduledTime.toDate() : new Date(0)
        return dateA - dateB
      })
      break
    case 'price-desc':
      result.sort((a, b) => (b.price || 0) - (a.price || 0))
      break
    case 'price-asc':
      result.sort((a, b) => (a.price || 0) - (b.price || 0))
      break
  }
  
  return result
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

const viewBookingDetails = (bookingId) => {
  router.push(`/customer/bookings/${bookingId}`)
}

const cancelBooking = async (booking) => {
  if (!confirm('Are you sure you want to cancel this booking?')) {
    return
  }
  
  try {
    loading.value = true
    await bookingStore.updateBookingStatus(booking.id, 'cancelled')
    
    // Update local booking status
    const index = bookings.value.findIndex(b => b.id === booking.id)
    if (index !== -1) {
      bookings.value[index].status = 'cancelled'
    }
  } catch (err) {
    error.value = 'Failed to cancel booking'
    console.error(err)
  } finally {
    loading.value = false
  }
}

const bookNewService = () => {
  router.push('/services')
}
</script>

<template>
  <MainLayout>
    <div class="container mx-auto px-4 py-8">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 class="text-3xl font-bold text-white mb-2">My Bookings</h1>
          <p class="text-gray-300">View and manage your service bookings</p>
        </div>
        
        <button @click="bookNewService" class="btn-primary mt-4 md:mt-0">
          Book New Service
        </button>
      </div>
      
      <!-- Filters -->
      <div class="card mb-8">
        <div class="p-6">
          <div class="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-4 md:space-y-0">
            <!-- Search -->
            <div class="flex-grow">
              <div class="relative">
                <input 
                  v-model="searchQuery"
                  type="text" 
                  placeholder="Search by service or worker..." 
                  class="w-full bg-gray-800 text-white border border-gray-700 rounded-lg py-2 px-4 pl-10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
            
            <!-- Status Filter -->
            <div class="w-full md:w-64">
              <select 
                v-model="statusFilter"
                class="w-full bg-gray-800 text-white border border-gray-700 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option v-for="option in statusOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </div>
            
            <!-- Sort By -->
            <div class="w-full md:w-64">
              <select 
                v-model="sortBy"
                class="w-full bg-gray-800 text-white border border-gray-700 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="date-desc">Date: Newest First</option>
                <option value="date-asc">Date: Oldest First</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="price-asc">Price: Low to High</option>
              </select>
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
      
      <!-- No Bookings -->
      <div v-else-if="bookings.length === 0" class="card p-8 text-center">
        <p class="text-gray-300 text-lg mb-4">You don't have any bookings yet.</p>
        <button @click="bookNewService" class="btn-primary">Book a Service Now</button>
      </div>
      
      <!-- No Results -->
      <div v-else-if="filteredBookings.length === 0" class="card p-8 text-center">
        <p class="text-gray-300 text-lg mb-4">No bookings found matching your filters.</p>
        <button @click="statusFilter = 'all'; searchQuery = ''" class="btn-primary">Clear Filters</button>
      </div>
      
      <!-- Bookings List -->
      <div v-else class="space-y-6">
        <div 
          v-for="booking in filteredBookings" 
          :key="booking.id" 
          class="card hover:shadow-lg transition-all"
        >
          <div class="p-6">
            <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
              <div>
                <h3 class="text-xl font-semibold text-white">{{ booking.serviceName || 'Service' }}</h3>
                <p class="text-gray-400">Booking ID: {{ booking.id.substring(0, 8) }}...</p>
              </div>
              
              <div class="mt-2 md:mt-0">
                <span :class="`px-3 py-1 rounded text-sm font-medium ${getStatusClass(booking.status)}`">
                  {{ booking.status }}
                </span>
              </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <p class="text-sm text-gray-400">Scheduled For</p>
                <p class="text-white">{{ formatDate(booking.scheduledTime) }}</p>
              </div>
              
              <div>
                <p class="text-sm text-gray-400">Worker</p>
                <p class="text-white">{{ booking.workerName || 'Assigned Worker' }}</p>
              </div>
              
              <div>
                <p class="text-sm text-gray-400">Price</p>
                <p class="text-white">${{ booking.price || '0.00' }}</p>
              </div>
            </div>
            
            <div v-if="booking.notes" class="mb-4">
              <p class="text-sm text-gray-400">Notes</p>
              <p class="text-white">{{ booking.notes }}</p>
            </div>
            
            <div class="flex flex-col sm:flex-row sm:justify-end space-y-2 sm:space-y-0 sm:space-x-2">
              <button 
                @click="viewBookingDetails(booking.id)" 
                class="btn-secondary"
              >
                View Details
              </button>
              
              <button 
                v-if="booking.status === 'requested' || booking.status === 'accepted'"
                @click="cancelBooking(booking)" 
                class="btn-danger"
              >
                Cancel Booking
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </MainLayout>
</template> 