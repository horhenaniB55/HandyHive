<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useBookingStore } from '../../stores/bookings'
import { useWorkerStore } from '../../stores/workers'
import { useServiceStore } from '../../stores/services'
import MainLayout from '../../components/layout/MainLayout.vue'

const router = useRouter()
const authStore = useAuthStore()
const bookingStore = useBookingStore()
const workerStore = useWorkerStore()
const serviceStore = useServiceStore()

const user = ref(null)
const loading = ref(true)
const error = ref('')

// Statistics
const stats = reactive({
  users: 0,
  workers: 0,
  customers: 0,
  bookings: 0,
  services: 0,
  revenue: 0,
  pendingVerifications: 0
})

// Recent bookings
const recentBookings = ref([])

// Monthly data for charts
const monthlyData = reactive({
  bookings: [12, 19, 15, 22, 27, 24, 32, 38, 42, 45, 50, 59],
  revenue: [1200, 1900, 1500, 2200, 2700, 2400, 3200, 3800, 4200, 4500, 5000, 5900],
  users: [5, 8, 10, 12, 15, 18, 22, 25, 28, 32, 35, 40]
})

onMounted(async () => {
  try {
    // Check if user is authenticated
    if (!authStore.user) {
      await authStore.checkAuth()
    }
    
    if (!authStore.user) {
      router.push('/login')
      return
    }
    
    // Check if user is an admin
    if (authStore.userRole !== 'admin') {
      router.push('/')
      return
    }
    
    // Load user profile data
    user.value = authStore.user
    
    // In a real application, we would fetch all these statistics from backend APIs
    // For now, we're using mock data
    
    // Load platform statistics
    stats.users = 243
    stats.workers = 87
    stats.customers = 156
    stats.bookings = 428
    stats.services = 32
    stats.revenue = 28750.50
    stats.pendingVerifications = 5
    
    // Load recent bookings
    // In a real app, these would come from the bookingStore
    recentBookings.value = [
      {
        id: 'bkg-1234',
        serviceId: 'svc-001',
        serviceName: 'House Cleaning',
        customerId: 'cust-567',
        customerName: 'John Smith',
        workerId: 'wrk-789',
        workerName: 'Maria Rodriguez',
        scheduledAt: new Date('2023-10-25T14:00:00').toISOString(),
        status: 'pending',
        price: 120.00
      },
      {
        id: 'bkg-1235',
        serviceId: 'svc-002',
        serviceName: 'Plumbing Repair',
        customerId: 'cust-568',
        customerName: 'Emily Johnson',
        workerId: 'wrk-790',
        workerName: 'Robert Chen',
        scheduledAt: new Date('2023-10-24T10:30:00').toISOString(),
        status: 'completed',
        price: 95.50
      },
      {
        id: 'bkg-1236',
        serviceId: 'svc-003',
        serviceName: 'Electrical Maintenance',
        customerId: 'cust-569',
        customerName: 'Michael Williams',
        workerId: 'wrk-791',
        workerName: 'James Wilson',
        scheduledAt: new Date('2023-10-26T16:15:00').toISOString(),
        status: 'cancelled',
        price: 150.00
      },
      {
        id: 'bkg-1237',
        serviceId: 'svc-004',
        serviceName: 'Lawn Mowing',
        customerId: 'cust-570',
        customerName: 'Sarah Davis',
        workerId: 'wrk-792',
        workerName: 'Jessica Garcia',
        scheduledAt: new Date('2023-10-23T09:00:00').toISOString(),
        status: 'in_progress',
        price: 85.00
      },
      {
        id: 'bkg-1238',
        serviceId: 'svc-005',
        serviceName: 'House Painting',
        customerId: 'cust-571',
        customerName: 'Daniel Brown',
        workerId: 'wrk-793',
        workerName: 'Thomas Martinez',
        scheduledAt: new Date('2023-10-27T11:45:00').toISOString(),
        status: 'confirmed',
        price: 350.00
      }
    ]
  } catch (err) {
    console.error('Error loading admin dashboard:', err)
    error.value = 'Failed to load dashboard information'
  } finally {
    loading.value = false
  }
})

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount)
}

const formatDate = (isoDate) => {
  const date = new Date(isoDate)
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getStatusClass = (status) => {
  switch (status) {
    case 'pending': return 'bg-yellow-900 text-yellow-300'
    case 'confirmed': return 'bg-blue-900 text-blue-300'
    case 'in_progress': return 'bg-purple-900 text-purple-300'
    case 'completed': return 'bg-green-900 text-green-300'
    case 'cancelled': return 'bg-red-900 text-red-300'
    default: return 'bg-gray-700 text-gray-300'
  }
}

const navigateToPage = (path) => {
  router.push(path)
}

// Chart data preparation
const bookingsChartData = computed(() => {
  return {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      {
        label: 'Bookings',
        data: monthlyData.bookings,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        borderWidth: 2,
        tension: 0.4
      }
    ]
  }
})

const revenueChartData = computed(() => {
  return {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      {
        label: 'Revenue',
        data: monthlyData.revenue,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        borderWidth: 2,
        tension: 0.4
      }
    ]
  }
})

const usersChartData = computed(() => {
  return {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      {
        label: 'New Users',
        data: monthlyData.users,
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.2)',
        borderWidth: 2,
        tension: 0.4
      }
    ]
  }
})
</script>

<template>
  <MainLayout>
    <div class="container mx-auto px-4 py-8">
      <h1 class="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
      <p class="text-gray-400 mb-8">Welcome back, {{ user?.displayName || 'Admin' }}! Here's what's happening on your platform.</p>
      
      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
      
      <!-- Error State -->
      <div v-else-if="error" class="bg-red-900 text-red-200 p-4 rounded mb-4">
        {{ error }}
      </div>
      
      <!-- Dashboard Content -->
      <div v-else>
        <!-- Statistics Overview -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div class="card bg-gradient-to-r from-indigo-700 to-indigo-800">
            <div class="p-6">
              <div class="flex justify-between items-start">
                <div>
                  <p class="text-indigo-200 text-sm">Total Users</p>
                  <h3 class="text-3xl font-bold text-white">{{ stats.users }}</h3>
                </div>
                <div class="bg-indigo-600 p-3 rounded-lg">
                  <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                  </svg>
                </div>
              </div>
              <div class="flex items-center mt-4">
                <div class="flex-1">
                  <p class="text-indigo-200 text-xs">Workers: {{ stats.workers }}</p>
                  <div class="bg-indigo-900 h-1.5 rounded-full mt-1 overflow-hidden">
                    <div class="bg-indigo-300 h-full rounded-full" :style="`width: ${(stats.workers / stats.users) * 100}%`"></div>
                  </div>
                </div>
                <div class="flex-1 ml-4">
                  <p class="text-indigo-200 text-xs">Customers: {{ stats.customers }}</p>
                  <div class="bg-indigo-900 h-1.5 rounded-full mt-1 overflow-hidden">
                    <div class="bg-indigo-300 h-full rounded-full" :style="`width: ${(stats.customers / stats.users) * 100}%`"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="card bg-gradient-to-r from-green-700 to-green-800">
            <div class="p-6">
              <div class="flex justify-between items-start">
                <div>
                  <p class="text-green-200 text-sm">Total Revenue</p>
                  <h3 class="text-3xl font-bold text-white">{{ formatCurrency(stats.revenue) }}</h3>
                </div>
                <div class="bg-green-600 p-3 rounded-lg">
                  <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
              </div>
              <div class="mt-4">
                <p class="text-green-200 text-xs">Average per booking: {{ formatCurrency(stats.revenue / stats.bookings) }}</p>
                <p class="text-green-200 text-xs mt-1">Platform commission: {{ formatCurrency(stats.revenue * 0.15) }}</p>
              </div>
            </div>
          </div>
          
          <div class="card bg-gradient-to-r from-purple-700 to-purple-800">
            <div class="p-6">
              <div class="flex justify-between items-start">
                <div>
                  <p class="text-purple-200 text-sm">Total Bookings</p>
                  <h3 class="text-3xl font-bold text-white">{{ stats.bookings }}</h3>
                </div>
                <div class="bg-purple-600 p-3 rounded-lg">
                  <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                </div>
              </div>
              <div class="mt-4">
                <p class="text-purple-200 text-xs">Monthly average: {{ Math.round(stats.bookings / 12) }}</p>
                <p class="text-purple-200 text-xs mt-1">Completion rate: 92%</p>
              </div>
            </div>
          </div>
          
          <div class="card bg-gradient-to-r from-orange-700 to-orange-800">
            <div class="p-6">
              <div class="flex justify-between items-start">
                <div>
                  <p class="text-orange-200 text-sm">Pending Verifications</p>
                  <h3 class="text-3xl font-bold text-white">{{ stats.pendingVerifications }}</h3>
                </div>
                <div class="bg-orange-600 p-3 rounded-lg">
                  <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
              </div>
              <div class="mt-4">
                <button 
                  @click="navigateToPage('/admin/verifications')" 
                  class="bg-orange-600 text-white text-sm px-3 py-1 rounded hover:bg-orange-700 transition"
                >
                  View Verifications
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Quick Actions -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div class="card cursor-pointer hover:bg-gray-800 transition-colors" @click="navigateToPage('/admin/users')">
            <div class="p-6">
              <div class="flex items-center mb-4">
                <div class="bg-indigo-600 p-3 rounded-lg mr-4">
                  <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                  </svg>
                </div>
                <h3 class="text-xl font-semibold text-white">Manage Users</h3>
              </div>
              <p class="text-gray-400">View, edit, and manage platform users.</p>
            </div>
          </div>
          
          <div class="card cursor-pointer hover:bg-gray-800 transition-colors" @click="navigateToPage('/admin/services')">
            <div class="p-6">
              <div class="flex items-center mb-4">
                <div class="bg-green-600 p-3 rounded-lg mr-4">
                  <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                  </svg>
                </div>
                <h3 class="text-xl font-semibold text-white">Manage Services</h3>
              </div>
              <p class="text-gray-400">Add, edit, or remove service categories.</p>
            </div>
          </div>
          
          <div class="card cursor-pointer hover:bg-gray-800 transition-colors" @click="navigateToPage('/admin/verifications')">
            <div class="p-6">
              <div class="flex items-center mb-4">
                <div class="bg-orange-600 p-3 rounded-lg mr-4">
                  <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <h3 class="text-xl font-semibold text-white">Verifications</h3>
              </div>
              <p class="text-gray-400">
                <span class="bg-orange-900 text-orange-300 px-2 py-0.5 rounded text-xs">{{ stats.pendingVerifications }}</span>
                Pending worker verifications to review.
              </p>
            </div>
          </div>
          
          <div class="card cursor-pointer hover:bg-gray-800 transition-colors" @click="navigateToPage('/admin/settings')">
            <div class="p-6">
              <div class="flex items-center mb-4">
                <div class="bg-gray-600 p-3 rounded-lg mr-4">
                  <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  </svg>
                </div>
                <h3 class="text-xl font-semibold text-white">Settings</h3>
              </div>
              <p class="text-gray-400">Configure platform settings and preferences.</p>
            </div>
          </div>
        </div>
        
        <!-- Recent Bookings -->
        <div class="card mb-8">
          <div class="flex justify-between items-center p-6 border-b border-gray-700">
            <h2 class="text-xl font-semibold text-white">Recent Bookings</h2>
            <button 
              @click="navigateToPage('/admin/bookings')" 
              class="text-indigo-400 hover:text-indigo-300 transition"
            >
              View All
            </button>
          </div>
          
          <div class="overflow-x-auto p-6">
            <table class="w-full">
              <thead>
                <tr class="text-left text-gray-400 border-b border-gray-700">
                  <th class="pb-3 font-medium">ID</th>
                  <th class="pb-3 font-medium">Service</th>
                  <th class="pb-3 font-medium">Customer</th>
                  <th class="pb-3 font-medium">Worker</th>
                  <th class="pb-3 font-medium">Date & Time</th>
                  <th class="pb-3 font-medium text-right">Price</th>
                  <th class="pb-3 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr 
                  v-for="booking in recentBookings" 
                  :key="booking.id"
                  class="border-b border-gray-800 text-gray-300 hover:bg-gray-800 cursor-pointer"
                >
                  <td class="py-4">{{ booking.id }}</td>
                  <td class="py-4">{{ booking.serviceName }}</td>
                  <td class="py-4">{{ booking.customerName }}</td>
                  <td class="py-4">{{ booking.workerName }}</td>
                  <td class="py-4">{{ formatDate(booking.scheduledAt) }}</td>
                  <td class="py-4 text-right">{{ formatCurrency(booking.price) }}</td>
                  <td class="py-4 text-center">
                    <span :class="`text-xs px-2 py-1 rounded-full ${getStatusClass(booking.status)}`">
                      {{ booking.status.replace('_', ' ') }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        <!-- Platform Analytics -->
        <div class="card">
          <div class="p-6 border-b border-gray-700">
            <h2 class="text-xl font-semibold text-white">Platform Analytics</h2>
          </div>
          
          <div class="p-6">
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div class="bg-gray-800 rounded-lg p-4">
                <h3 class="text-lg font-medium text-white mb-4">Monthly Bookings</h3>
                <div class="bg-gray-900 p-2 rounded h-64 flex items-center justify-center">
                  <p class="text-gray-400">Chart would render here</p>
                </div>
              </div>
              
              <div class="bg-gray-800 rounded-lg p-4">
                <h3 class="text-lg font-medium text-white mb-4">Monthly Revenue</h3>
                <div class="bg-gray-900 p-2 rounded h-64 flex items-center justify-center">
                  <p class="text-gray-400">Chart would render here</p>
                </div>
              </div>
              
              <div class="bg-gray-800 rounded-lg p-4">
                <h3 class="text-lg font-medium text-white mb-4">User Growth</h3>
                <div class="bg-gray-900 p-2 rounded h-64 flex items-center justify-center">
                  <p class="text-gray-400">Chart would render here</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </MainLayout>
</template> 