<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useBookingStore } from '../../stores/bookings'
import { useWorkerStore } from '../../stores/workers'
import MainLayout from '../../components/layout/MainLayout.vue'
import { auth } from '../../firebase/config'

const router = useRouter()
const authStore = useAuthStore()
const bookingStore = useBookingStore()
const workerStore = useWorkerStore()

const user = ref(null)
const workerProfile = ref(null)
const upcomingBookings = ref([])
const loading = ref(true)
const error = ref('')
const currentStatus = ref('offline')

// Status options for the worker
const statusOptions = [
  { value: 'available', label: 'Available', color: 'bg-green-600' },
  { value: 'busy', label: 'Busy', color: 'bg-yellow-600' },
  { value: 'offline', label: 'Offline', color: 'bg-gray-600' }
]

// Computed property for earnings
const earnings = computed(() => {
  return {
    today: 0, // In a real app, calculate from transactions
    thisWeek: 0,
    thisMonth: 0,
    total: workerProfile.value?.wallet?.balance || 0
  }
})

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
    
    // Get user data if available
    user.value = authStore.user || { uid: localStorage.getItem('userId') };
    
    // Only perform role check if we have definitive role information
    if (authStore.userRole !== 'worker' && savedRole !== 'worker' && !isWorkerPage) {
      router.push('/');
      return;
    }
    
    // Load worker profile
    const workerData = await workerStore.fetchWorkerById(user.value.uid);
    if (workerData) {
      workerProfile.value = workerData;
      
      // Set current status from profile
      if (workerData.availability && workerData.availability.currentStatus) {
        currentStatus.value = workerData.availability.currentStatus;
      }
    }
    
    // Load bookings
    await bookingStore.fetchWorkerBookings();
    
    // Filter for upcoming bookings (not completed or cancelled)
    upcomingBookings.value = bookingStore.workerBookings
      .filter(booking => !['completed', 'cancelled'].includes(booking.status))
      .slice(0, 3);
  } catch (err) {
    error.value = 'Failed to load worker data';
    console.error(err);
  } finally {
    loading.value = false;
  }
})

const updateStatus = async (status) => {
  if (status === currentStatus.value) return
  
  try {
    loading.value = true
    await workerStore.updateCurrentStatus(status)
    currentStatus.value = status
  } catch (err) {
    error.value = 'Failed to update status'
    console.error(err)
  } finally {
    loading.value = false
  }
}

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

const viewAllJobs = () => {
  router.push('/worker/jobs')
}

const viewWallet = () => {
  router.push('/worker/wallet')
}

const manageServices = () => {
  router.push('/worker/services')
}
</script>

<template>
  <MainLayout>
    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
    </div>
    
    <div v-else>
      <!-- Welcome Section with Status Toggle -->
      <div class="bg-gray-800 rounded-xl p-6 mb-8 shadow-lg">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 class="text-2xl font-bold text-white mb-2">Welcome back, {{ user?.displayName || 'Worker' }}!</h1>
            <p class="text-gray-300">Manage your jobs and update your availability.</p>
          </div>
          
          <div class="mt-4 md:mt-0">
            <div class="flex items-center space-x-2">
              <span class="text-gray-300 mr-2">Status:</span>
              <div class="flex space-x-2">
                <button 
                  v-for="option in statusOptions" 
                  :key="option.value"
                  @click="updateStatus(option.value)"
                  :class="[
                    'px-3 py-1 rounded-full text-white text-sm font-medium',
                    currentStatus === option.value ? option.color : 'bg-gray-700 hover:bg-gray-600'
                  ]"
                >
                  {{ option.label }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Stats Overview -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div class="card">
          <div class="p-6">
            <h3 class="text-lg font-semibold text-white mb-2">Today's Earnings</h3>
            <p class="text-3xl font-bold text-indigo-400">${{ earnings.today.toFixed(2) }}</p>
          </div>
        </div>
        
        <div class="card">
          <div class="p-6">
            <h3 class="text-lg font-semibold text-white mb-2">This Week</h3>
            <p class="text-3xl font-bold text-indigo-400">${{ earnings.thisWeek.toFixed(2) }}</p>
          </div>
        </div>
        
        <div class="card">
          <div class="p-6">
            <h3 class="text-lg font-semibold text-white mb-2">This Month</h3>
            <p class="text-3xl font-bold text-indigo-400">${{ earnings.thisMonth.toFixed(2) }}</p>
          </div>
        </div>
        
        <div class="card cursor-pointer" @click="viewWallet">
          <div class="p-6">
            <h3 class="text-lg font-semibold text-white mb-2">Wallet Balance</h3>
            <p class="text-3xl font-bold text-indigo-400">${{ earnings.total.toFixed(2) }}</p>
          </div>
        </div>
      </div>
      
      <!-- Quick Actions -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="card hover:shadow-lg transition-all cursor-pointer" @click="viewAllJobs">
          <div class="p-6 flex items-center">
            <div class="h-12 w-12 rounded-full bg-indigo-600 flex items-center justify-center text-white">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div class="ml-4">
              <h3 class="text-lg font-semibold text-white">My Jobs</h3>
              <p class="text-gray-400">View and manage your jobs</p>
            </div>
          </div>
        </div>
        
        <div class="card hover:shadow-lg transition-all cursor-pointer" @click="viewWallet">
          <div class="p-6 flex items-center">
            <div class="h-12 w-12 rounded-full bg-purple-600 flex items-center justify-center text-white">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div class="ml-4">
              <h3 class="text-lg font-semibold text-white">Wallet</h3>
              <p class="text-gray-400">Manage your earnings</p>
            </div>
          </div>
        </div>
        
        <div class="card hover:shadow-lg transition-all cursor-pointer" @click="manageServices">
          <div class="p-6 flex items-center">
            <div class="h-12 w-12 rounded-full bg-green-600 flex items-center justify-center text-white">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v6m3-3H9" />
              </svg>
            </div>
            <div class="ml-4">
              <h3 class="text-lg font-semibold text-white">Services</h3>
              <p class="text-gray-400">Manage your service offerings</p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Upcoming Jobs -->
      <div class="mb-8">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold text-white">Upcoming Jobs</h2>
          <button @click="viewAllJobs" class="text-indigo-400 hover:text-indigo-300 font-medium">
            View All <span aria-hidden="true">→</span>
          </button>
        </div>
        
        <div v-if="error" class="bg-red-900 text-red-200 p-4 rounded mb-4">
          {{ error }}
        </div>
        
        <div v-else-if="upcomingBookings.length === 0" class="card p-6 text-center">
          <p class="text-gray-400">You don't have any upcoming jobs.</p>
          <p class="text-gray-400 mt-2">Make sure your profile is complete and your status is set to "Available".</p>
        </div>
        
        <div v-else class="space-y-4">
          <div v-for="booking in upcomingBookings" :key="booking.id" class="card hover:shadow-lg transition-all">
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
                    <p class="text-sm text-gray-400">Customer:</p>
                    <p class="text-white">{{ booking.customerName || 'Customer' }}</p>
                  </div>
                  <div>
                    <p class="text-sm text-gray-400">Price:</p>
                    <p class="text-white">${{ booking.price || '0.00' }}</p>
                  </div>
                  <div>
                    <button 
                      @click="router.push(`/worker/jobs/${booking.id}`)" 
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
      
      <!-- Worker Stats -->
      <div>
        <h2 class="text-xl font-bold text-white mb-4">Your Stats</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="card">
            <div class="p-6 text-center">
              <div class="text-4xl font-bold text-indigo-400 mb-2">{{ workerProfile?.rating || 0 }}/5</div>
              <div class="flex justify-center text-yellow-400 mb-2">
                <span v-for="i in 5" :key="i" class="text-xl">
                  {{ i <= Math.round(workerProfile?.rating || 0) ? '★' : '☆' }}
                </span>
              </div>
              <p class="text-gray-300">Average Rating</p>
              <p class="text-gray-400 text-sm mt-1">From {{ workerProfile?.reviewCount || 0 }} reviews</p>
            </div>
          </div>
          
          <div class="card">
            <div class="p-6 text-center">
              <div class="text-4xl font-bold text-indigo-400 mb-2">{{ workerProfile?.completedJobs || 0 }}</div>
              <p class="text-gray-300">Completed Jobs</p>
            </div>
          </div>
          
          <div class="card">
            <div class="p-6 text-center">
              <div class="text-4xl font-bold text-indigo-400 mb-2">
                {{ workerProfile?.services?.length || 0 }}
              </div>
              <p class="text-gray-300">Services Offered</p>
              <button 
                @click="router.push('/worker/profile')" 
                class="text-indigo-400 hover:text-indigo-300 text-sm mt-2"
              >
                Manage Services
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </MainLayout>
</template> 