<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useBookingStore } from '../../stores/bookings'
import MainLayout from '../../components/layout/MainLayout.vue'
import { auth } from '../../firebase/config'

const router = useRouter()
const authStore = useAuthStore()
const bookingStore = useBookingStore()

const jobs = ref([])
const loading = ref(true)
const actionLoading = ref(false)
const error = ref('')
const statusFilter = ref('all')
const searchQuery = ref('')
const sortBy = ref('date-asc')

// Status options for filtering
const statusOptions = [
  { value: 'all', label: 'All Jobs' },
  { value: 'requested', label: 'Requested' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' }
]

onMounted(async () => {
  loading.value = true
  
  try {
    // Get the user role from localStorage to immediately check permissions
    const savedRole = localStorage.getItem('userRole');
    const isWorkerPage = window.location.pathname.startsWith('/worker');
    
    // Check if user is authenticated
    if (!authStore.user) {
      // Wait for auth state to resolve with a timeout
      let authResolved = false;
      
      await Promise.race([
        new Promise(resolve => {
          const unsubscribe = auth.onAuthStateChanged(user => {
            unsubscribe();
            authResolved = true;
            resolve(user);
          });
        }),
        new Promise(resolve => setTimeout(() => {
          if (!authResolved) resolve(null);
        }, 2000)) // 2 second timeout
      ]);
      
      // If still not authenticated after waiting, redirect
      if (!authStore.user && !isWorkerPage) {
        router.push('/login');
        return;
      }
    }
    
    // Only perform role check if we have definitive role information
    if (authStore.userRole !== 'worker' && savedRole !== 'worker' && !isWorkerPage) {
      router.push('/');
      return;
    }
    
    await bookingStore.fetchWorkerBookings();
    jobs.value = bookingStore.workerBookings;
  } catch (err) {
    error.value = 'Failed to load jobs';
    console.error(err);
  } finally {
    loading.value = false;
  }
})

// Computed property for filtered and sorted jobs
const filteredJobs = computed(() => {
  let result = [...jobs.value]
  
  // Filter by status
  if (statusFilter.value !== 'all') {
    result = result.filter(job => job.status === statusFilter.value)
  }
  
  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(job => 
      (job.serviceName && job.serviceName.toLowerCase().includes(query)) || 
      (job.customerName && job.customerName.toLowerCase().includes(query))
    )
  }
  
  // Sort results
  switch (sortBy.value) {
    case 'date-asc':
      result.sort((a, b) => {
        const dateA = a.scheduledTime ? a.scheduledTime.toDate() : new Date(0)
        const dateB = b.scheduledTime ? b.scheduledTime.toDate() : new Date(0)
        return dateA - dateB
      })
      break
    case 'date-desc':
      result.sort((a, b) => {
        const dateA = a.scheduledTime ? a.scheduledTime.toDate() : new Date(0)
        const dateB = b.scheduledTime ? b.scheduledTime.toDate() : new Date(0)
        return dateB - dateA
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

const viewJobDetails = (jobId) => {
  router.push(`/worker/jobs/${jobId}`)
}

const acceptJob = async (job) => {
  try {
    actionLoading.value = true
    error.value = ''
    
    await bookingStore.updateBookingStatus(job.id, 'accepted')
    
    // Update local job status
    const index = jobs.value.findIndex(j => j.id === job.id)
    if (index !== -1) {
      jobs.value[index].status = 'accepted'
    }
  } catch (err) {
    error.value = 'Failed to accept job'
    console.error(err)
  } finally {
    actionLoading.value = false
  }
}

const startJob = async (job) => {
  try {
    actionLoading.value = true
    error.value = ''
    
    await bookingStore.updateBookingStatus(job.id, 'in-progress')
    
    // Update local job status
    const index = jobs.value.findIndex(j => j.id === job.id)
    if (index !== -1) {
      jobs.value[index].status = 'in-progress'
    }
  } catch (err) {
    error.value = 'Failed to start job'
    console.error(err)
  } finally {
    actionLoading.value = false
  }
}

const completeJob = async (job) => {
  try {
    actionLoading.value = true
    error.value = ''
    
    await bookingStore.updateBookingStatus(job.id, 'completed')
    
    // Update local job status
    const index = jobs.value.findIndex(j => j.id === job.id)
    if (index !== -1) {
      jobs.value[index].status = 'completed'
    }
  } catch (err) {
    error.value = 'Failed to complete job'
    console.error(err)
  } finally {
    actionLoading.value = false
  }
}

const cancelJob = async (job) => {
  if (!confirm('Are you sure you want to cancel this job?')) {
    return
  }
  
  try {
    actionLoading.value = true
    error.value = ''
    
    await bookingStore.updateBookingStatus(job.id, 'cancelled')
    
    // Update local job status
    const index = jobs.value.findIndex(j => j.id === job.id)
    if (index !== -1) {
      jobs.value[index].status = 'cancelled'
    }
  } catch (err) {
    error.value = 'Failed to cancel job'
    console.error(err)
  } finally {
    actionLoading.value = false
  }
}

const isJobToday = (scheduledTime) => {
  if (!scheduledTime) return false
  
  const today = new Date()
  const jobDate = scheduledTime instanceof Date ? scheduledTime : scheduledTime.toDate()
  
  return (
    jobDate.getDate() === today.getDate() &&
    jobDate.getMonth() === today.getMonth() &&
    jobDate.getFullYear() === today.getFullYear()
  )
}

const isJobUpcoming = (scheduledTime) => {
  if (!scheduledTime) return false
  
  const today = new Date()
  const jobDate = scheduledTime instanceof Date ? scheduledTime : scheduledTime.toDate()
  
  // Reset time to compare just the dates
  today.setHours(0, 0, 0, 0)
  const jobDateOnly = new Date(jobDate)
  jobDateOnly.setHours(0, 0, 0, 0)
  
  return jobDateOnly > today
}
</script>

<template>
  <MainLayout>
    <div class="container mx-auto px-4 py-8">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 class="text-3xl font-bold text-white mb-2">My Jobs</h1>
          <p class="text-gray-300">View and manage your assigned jobs</p>
        </div>
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
                  placeholder="Search by service or customer..." 
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
                <option value="date-asc">Date: Soonest First</option>
                <option value="date-desc">Date: Latest First</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="price-asc">Price: Low to High</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Loading State -->
      <div v-if="loading || actionLoading" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
      
      <!-- Error State -->
      <div v-else-if="error" class="bg-red-900 text-red-200 p-4 rounded mb-4">
        {{ error }}
      </div>
      
      <!-- No Jobs -->
      <div v-else-if="jobs.length === 0" class="card p-8 text-center">
        <p class="text-gray-300 text-lg mb-4">You don't have any jobs yet.</p>
        <p class="text-gray-400">Make sure your profile is complete and your status is set to "Available".</p>
      </div>
      
      <!-- No Results -->
      <div v-else-if="filteredJobs.length === 0" class="card p-8 text-center">
        <p class="text-gray-300 text-lg mb-4">No jobs found matching your filters.</p>
        <button @click="statusFilter = 'all'; searchQuery = ''" class="btn-primary">Clear Filters</button>
      </div>
      
      <!-- Today's Jobs Section -->
      <div v-else>
        <div class="mb-8">
          <h2 class="text-xl font-bold text-white mb-4">Today's Jobs</h2>
          
          <div v-if="filteredJobs.filter(job => isJobToday(job.scheduledTime)).length === 0" class="card p-6 text-center">
            <p class="text-gray-400">No jobs scheduled for today.</p>
          </div>
          
          <div v-else class="space-y-6">
            <div 
              v-for="job in filteredJobs.filter(job => isJobToday(job.scheduledTime))" 
              :key="job.id" 
              class="card hover:shadow-lg transition-all border-l-4"
              :class="{
                'border-yellow-500': job.status === 'requested',
                'border-indigo-500': job.status === 'accepted',
                'border-blue-500': job.status === 'in-progress',
                'border-green-500': job.status === 'completed',
                'border-red-500': job.status === 'cancelled'
              }"
            >
              <div class="p-6">
                <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                  <div>
                    <h3 class="text-xl font-semibold text-white">{{ job.serviceName || 'Service' }}</h3>
                    <p class="text-gray-400">Job ID: {{ job.id.substring(0, 8) }}...</p>
                  </div>
                  
                  <div class="mt-2 md:mt-0">
                    <span :class="`px-3 py-1 rounded text-sm font-medium ${getStatusClass(job.status)}`">
                      {{ job.status }}
                    </span>
                  </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p class="text-sm text-gray-400">Scheduled For</p>
                    <p class="text-white">{{ formatDate(job.scheduledTime) }}</p>
                  </div>
                  
                  <div>
                    <p class="text-sm text-gray-400">Customer</p>
                    <p class="text-white">{{ job.customerName || 'Customer' }}</p>
                  </div>
                  
                  <div>
                    <p class="text-sm text-gray-400">Price</p>
                    <p class="text-white">${{ job.price || '0.00' }}</p>
                  </div>
                </div>
                
                <div v-if="job.notes" class="mb-4">
                  <p class="text-sm text-gray-400">Notes</p>
                  <p class="text-white">{{ job.notes }}</p>
                </div>
                
                <div class="flex flex-wrap gap-2">
                  <button 
                    @click="viewJobDetails(job.id)" 
                    class="btn-secondary py-1 px-3 text-sm"
                  >
                    View Details
                  </button>
                  
                  <button 
                    v-if="job.status === 'requested'"
                    @click="acceptJob(job)" 
                    class="btn-primary py-1 px-3 text-sm"
                  >
                    Accept Job
                  </button>
                  
                  <button 
                    v-if="job.status === 'accepted'"
                    @click="startJob(job)" 
                    class="btn-primary py-1 px-3 text-sm"
                  >
                    Start Job
                  </button>
                  
                  <button 
                    v-if="job.status === 'in-progress'"
                    @click="completeJob(job)" 
                    class="btn-success py-1 px-3 text-sm"
                  >
                    Complete Job
                  </button>
                  
                  <button 
                    v-if="['requested', 'accepted'].includes(job.status)"
                    @click="cancelJob(job)" 
                    class="btn-danger py-1 px-3 text-sm"
                  >
                    Cancel Job
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Upcoming Jobs Section -->
        <div class="mb-8">
          <h2 class="text-xl font-bold text-white mb-4">Upcoming Jobs</h2>
          
          <div v-if="filteredJobs.filter(job => isJobUpcoming(job.scheduledTime) && !isJobToday(job.scheduledTime)).length === 0" class="card p-6 text-center">
            <p class="text-gray-400">No upcoming jobs scheduled.</p>
          </div>
          
          <div v-else class="space-y-6">
            <div 
              v-for="job in filteredJobs.filter(job => isJobUpcoming(job.scheduledTime) && !isJobToday(job.scheduledTime))" 
              :key="job.id" 
              class="card hover:shadow-lg transition-all"
            >
              <div class="p-6">
                <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                  <div>
                    <h3 class="text-xl font-semibold text-white">{{ job.serviceName || 'Service' }}</h3>
                    <p class="text-gray-400">Job ID: {{ job.id.substring(0, 8) }}...</p>
                  </div>
                  
                  <div class="mt-2 md:mt-0">
                    <span :class="`px-3 py-1 rounded text-sm font-medium ${getStatusClass(job.status)}`">
                      {{ job.status }}
                    </span>
                  </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p class="text-sm text-gray-400">Scheduled For</p>
                    <p class="text-white">{{ formatDate(job.scheduledTime) }}</p>
                  </div>
                  
                  <div>
                    <p class="text-sm text-gray-400">Customer</p>
                    <p class="text-white">{{ job.customerName || 'Customer' }}</p>
                  </div>
                  
                  <div>
                    <p class="text-sm text-gray-400">Price</p>
                    <p class="text-white">${{ job.price || '0.00' }}</p>
                  </div>
                </div>
                
                <div class="flex flex-wrap gap-2">
                  <button 
                    @click="viewJobDetails(job.id)" 
                    class="btn-secondary py-1 px-3 text-sm"
                  >
                    View Details
                  </button>
                  
                  <button 
                    v-if="job.status === 'requested'"
                    @click="acceptJob(job)" 
                    class="btn-primary py-1 px-3 text-sm"
                  >
                    Accept Job
                  </button>
                  
                  <button 
                    v-if="['requested', 'accepted'].includes(job.status)"
                    @click="cancelJob(job)" 
                    class="btn-danger py-1 px-3 text-sm"
                  >
                    Cancel Job
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Past Jobs Section -->
        <div>
          <h2 class="text-xl font-bold text-white mb-4">Past Jobs</h2>
          
          <div v-if="filteredJobs.filter(job => !isJobUpcoming(job.scheduledTime) && !isJobToday(job.scheduledTime)).length === 0" class="card p-6 text-center">
            <p class="text-gray-400">No past jobs found.</p>
          </div>
          
          <div v-else class="space-y-6">
            <div 
              v-for="job in filteredJobs.filter(job => !isJobUpcoming(job.scheduledTime) && !isJobToday(job.scheduledTime))" 
              :key="job.id" 
              class="card hover:shadow-lg transition-all opacity-80"
            >
              <div class="p-6">
                <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                  <div>
                    <h3 class="text-xl font-semibold text-white">{{ job.serviceName || 'Service' }}</h3>
                    <p class="text-gray-400">Job ID: {{ job.id.substring(0, 8) }}...</p>
                  </div>
                  
                  <div class="mt-2 md:mt-0">
                    <span :class="`px-3 py-1 rounded text-sm font-medium ${getStatusClass(job.status)}`">
                      {{ job.status }}
                    </span>
                  </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p class="text-sm text-gray-400">Scheduled For</p>
                    <p class="text-white">{{ formatDate(job.scheduledTime) }}</p>
                  </div>
                  
                  <div>
                    <p class="text-sm text-gray-400">Customer</p>
                    <p class="text-white">{{ job.customerName || 'Customer' }}</p>
                  </div>
                  
                  <div>
                    <p class="text-sm text-gray-400">Price</p>
                    <p class="text-white">${{ job.price || '0.00' }}</p>
                  </div>
                </div>
                
                <div class="flex flex-wrap gap-2">
                  <button 
                    @click="viewJobDetails(job.id)" 
                    class="btn-secondary py-1 px-3 text-sm"
                  >
                    View Details
                  </button>
                  
                  <button 
                    v-if="job.status === 'in-progress'"
                    @click="completeJob(job)" 
                    class="btn-success py-1 px-3 text-sm"
                  >
                    Complete Job
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </MainLayout>
</template> 