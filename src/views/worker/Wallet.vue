<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import MainLayout from '../../components/layout/MainLayout.vue'
import { auth } from '../../firebase/config'

const router = useRouter()
const authStore = useAuthStore()

const user = ref(null)
const loading = ref(true)
const error = ref('')
const activeTab = ref('earnings')
const payoutRequesting = ref(false)
const payoutSuccess = ref(false)

// Wallet data
const walletBalance = ref(0)
const pendingBalance = ref(0)
const totalEarnings = ref(0)
const transactionHistory = ref([])
const payoutHistory = ref([])

// Payout form
const payoutAmount = ref(0)
const payoutMethod = ref('bank')
const payoutMethods = ref([
  { id: 'bank', name: 'Bank Transfer' },
  { id: 'paypal', name: 'PayPal' },
  { id: 'venmo', name: 'Venmo' }
])

const canRequestPayout = computed(() => {
  return walletBalance.value >= 50 && payoutAmount.value >= 50 && payoutAmount.value <= walletBalance.value
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
    
    // Only perform role check if we have definitive role information
    if (authStore.userRole !== 'worker' && savedRole !== 'worker' && !isWorkerPage) {
      router.push('/');
      return;
    }
    
    // Load user profile data
    user.value = authStore.user || { uid: localStorage.getItem('userId') };
    
    // Load wallet data
    // In a real application, these would be fetched from the backend
    walletBalance.value = 865.50
    pendingBalance.value = 250.00
    totalEarnings.value = 3750.25
    
    // Set initial payout amount to wallet balance
    payoutAmount.value = walletBalance.value
    
    // Mock transaction history
    transactionHistory.value = [
      { 
        id: 'txn-1001', 
        date: new Date('2023-10-15').toISOString(), 
        type: 'payment', 
        description: 'Payment for Job #1234', 
        amount: 120.00,
        status: 'completed'
      },
      { 
        id: 'txn-1002', 
        date: new Date('2023-10-10').toISOString(), 
        type: 'payment', 
        description: 'Payment for Job #1233', 
        amount: 85.50,
        status: 'completed'
      },
      { 
        id: 'txn-1003', 
        date: new Date('2023-10-05').toISOString(), 
        type: 'payment', 
        description: 'Payment for Job #1232', 
        amount: 200.00,
        status: 'completed'
      },
      { 
        id: 'txn-1004', 
        date: new Date('2023-09-28').toISOString(), 
        type: 'payment', 
        description: 'Payment for Job #1231', 
        amount: 150.00,
        status: 'completed'
      },
      { 
        id: 'txn-1005', 
        date: new Date('2023-09-20').toISOString(), 
        type: 'payout', 
        description: 'Payout to Bank Account', 
        amount: -350.00,
        status: 'completed'
      }
    ]
    
    // Mock payout history
    payoutHistory.value = [
      {
        id: 'payout-501',
        date: new Date('2023-09-20').toISOString(),
        amount: 350.00,
        method: 'Bank Transfer',
        status: 'completed'
      },
      {
        id: 'payout-500',
        date: new Date('2023-08-15').toISOString(),
        amount: 500.00,
        method: 'PayPal',
        status: 'completed'
      },
      {
        id: 'payout-499',
        date: new Date('2023-07-10').toISOString(),
        amount: 275.00,
        method: 'Bank Transfer',
        status: 'completed'
      }
    ]
  } catch (err) {
    console.error('Error loading wallet data:', err)
    error.value = 'Failed to load wallet information'
  } finally {
    loading.value = false
  }
})

const setActiveTab = (tab) => {
  activeTab.value = tab
}

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount)
}

const formatDate = (isoDate) => {
  const date = new Date(isoDate)
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

const requestPayout = async () => {
  try {
    if (!canRequestPayout.value) {
      return
    }
    
    payoutRequesting.value = true
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Add to payout history
    const newPayout = {
      id: `payout-${Math.floor(Math.random() * 1000)}`,
      date: new Date().toISOString(),
      amount: payoutAmount.value,
      method: payoutMethods.value.find(m => m.id === payoutMethod.value).name,
      status: 'pending'
    }
    
    payoutHistory.value.unshift(newPayout)
    
    // Add to transaction history
    transactionHistory.value.unshift({
      id: `txn-${Math.floor(Math.random() * 10000)}`,
      date: new Date().toISOString(),
      type: 'payout',
      description: `Payout to ${newPayout.method}`,
      amount: -payoutAmount.value,
      status: 'pending'
    })
    
    // Update balances
    walletBalance.value -= payoutAmount.value
    
    // Show success message
    payoutSuccess.value = true
    
    // Reset form
    setTimeout(() => {
      payoutSuccess.value = false
      payoutAmount.value = walletBalance.value
    }, 5000)
  } catch (err) {
    console.error('Error requesting payout:', err)
    error.value = 'Failed to process payout request'
  } finally {
    payoutRequesting.value = false
  }
}

const getTransactionStatusClass = (status) => {
  switch (status) {
    case 'completed': return 'bg-green-900 text-green-300'
    case 'pending': return 'bg-yellow-900 text-yellow-300'
    case 'failed': return 'bg-red-900 text-red-300'
    default: return 'bg-gray-700 text-gray-300'
  }
}

const getPayoutStatusClass = (status) => {
  switch (status) {
    case 'completed': return 'bg-green-900 text-green-300'
    case 'pending': return 'bg-yellow-900 text-yellow-300'
    case 'failed': return 'bg-red-900 text-red-300'
    default: return 'bg-gray-700 text-gray-300'
  }
}
</script>

<template>
  <MainLayout>
    <div class="container mx-auto px-4 py-8">
      <h1 class="text-3xl font-bold text-white mb-8">My Wallet</h1>
      
      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
      
      <!-- Error State -->
      <div v-else-if="error" class="bg-red-900 text-red-200 p-4 rounded mb-4">
        {{ error }}
      </div>
      
      <!-- Wallet Content -->
      <div v-else>
        <!-- Balance Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div class="card bg-gradient-to-r from-indigo-700 to-indigo-800">
            <div class="p-6">
              <h2 class="text-lg font-medium text-indigo-200 mb-1">Available Balance</h2>
              <p class="text-3xl font-bold text-white mb-1">{{ formatCurrency(walletBalance) }}</p>
              <p class="text-indigo-200 text-sm">Available for payout</p>
            </div>
          </div>
          
          <div class="card bg-gradient-to-r from-gray-700 to-gray-800">
            <div class="p-6">
              <h2 class="text-lg font-medium text-gray-300 mb-1">Pending Balance</h2>
              <p class="text-3xl font-bold text-white mb-1">{{ formatCurrency(pendingBalance) }}</p>
              <p class="text-gray-300 text-sm">Will be available after job completion</p>
            </div>
          </div>
          
          <div class="card bg-gradient-to-r from-green-700 to-green-800">
            <div class="p-6">
              <h2 class="text-lg font-medium text-green-200 mb-1">Total Earnings</h2>
              <p class="text-3xl font-bold text-white mb-1">{{ formatCurrency(totalEarnings) }}</p>
              <p class="text-green-200 text-sm">Lifetime earnings</p>
            </div>
          </div>
        </div>
        
        <!-- Tabs -->
        <div class="card mb-8">
          <div class="border-b border-gray-700">
            <nav class="flex">
              <button 
                @click="setActiveTab('earnings')" 
                :class="`px-6 py-4 font-medium ${activeTab === 'earnings' ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400 hover:text-gray-300'}`"
              >
                Transaction History
              </button>
              <button 
                @click="setActiveTab('payouts')" 
                :class="`px-6 py-4 font-medium ${activeTab === 'payouts' ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400 hover:text-gray-300'}`"
              >
                Payout History
              </button>
              <button 
                @click="setActiveTab('request')" 
                :class="`px-6 py-4 font-medium ${activeTab === 'request' ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400 hover:text-gray-300'}`"
              >
                Request Payout
              </button>
            </nav>
          </div>
          
          <div class="p-6">
            <!-- Transaction History Tab -->
            <div v-if="activeTab === 'earnings'">
              <h3 class="text-xl font-semibold text-white mb-4">Transaction History</h3>
              
              <div v-if="transactionHistory.length === 0" class="text-gray-400 text-center py-8">
                No transactions to display.
              </div>
              
              <div v-else class="overflow-x-auto">
                <table class="w-full">
                  <thead>
                    <tr class="text-left text-gray-400 border-b border-gray-700">
                      <th class="pb-3 font-medium">Date</th>
                      <th class="pb-3 font-medium">Transaction ID</th>
                      <th class="pb-3 font-medium">Description</th>
                      <th class="pb-3 font-medium text-right">Amount</th>
                      <th class="pb-3 font-medium text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr 
                      v-for="transaction in transactionHistory" 
                      :key="transaction.id"
                      class="border-b border-gray-800 text-gray-300"
                    >
                      <td class="py-4">{{ formatDate(transaction.date) }}</td>
                      <td class="py-4">{{ transaction.id }}</td>
                      <td class="py-4">{{ transaction.description }}</td>
                      <td class="py-4 text-right" :class="transaction.amount > 0 ? 'text-green-400' : 'text-red-400'">
                        {{ formatCurrency(transaction.amount) }}
                      </td>
                      <td class="py-4 text-center">
                        <span :class="`text-xs px-2 py-1 rounded-full ${getTransactionStatusClass(transaction.status)}`">
                          {{ transaction.status }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            
            <!-- Payouts History Tab -->
            <div v-if="activeTab === 'payouts'">
              <h3 class="text-xl font-semibold text-white mb-4">Payout History</h3>
              
              <div v-if="payoutHistory.length === 0" class="text-gray-400 text-center py-8">
                No payouts to display.
              </div>
              
              <div v-else class="overflow-x-auto">
                <table class="w-full">
                  <thead>
                    <tr class="text-left text-gray-400 border-b border-gray-700">
                      <th class="pb-3 font-medium">Date</th>
                      <th class="pb-3 font-medium">Payout ID</th>
                      <th class="pb-3 font-medium">Method</th>
                      <th class="pb-3 font-medium text-right">Amount</th>
                      <th class="pb-3 font-medium text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr 
                      v-for="payout in payoutHistory" 
                      :key="payout.id"
                      class="border-b border-gray-800 text-gray-300"
                    >
                      <td class="py-4">{{ formatDate(payout.date) }}</td>
                      <td class="py-4">{{ payout.id }}</td>
                      <td class="py-4">{{ payout.method }}</td>
                      <td class="py-4 text-right text-green-400">
                        {{ formatCurrency(payout.amount) }}
                      </td>
                      <td class="py-4 text-center">
                        <span :class="`text-xs px-2 py-1 rounded-full ${getPayoutStatusClass(payout.status)}`">
                          {{ payout.status }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            
            <!-- Request Payout Tab -->
            <div v-if="activeTab === 'request'">
              <h3 class="text-xl font-semibold text-white mb-4">Request Payout</h3>
              
              <div v-if="payoutSuccess" class="bg-green-900 text-green-200 p-4 rounded mb-6">
                Your payout request has been submitted successfully! You will receive your funds within 1-3 business days.
              </div>
              
              <div class="bg-gray-800 p-6 rounded mb-6">
                <h4 class="text-lg font-medium text-white mb-4">Payout Requirements</h4>
                <ul class="list-disc list-inside text-gray-300 space-y-2 mb-4">
                  <li>Minimum payout amount is $50.00</li>
                  <li>Payouts are processed within 1-3 business days</li>
                  <li>A service fee of 1% applies to all payouts (minimum $1.00)</li>
                </ul>
                
                <div class="bg-indigo-900 bg-opacity-50 p-4 rounded flex items-center">
                  <svg class="w-6 h-6 text-indigo-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <p class="text-indigo-200">Your available balance for payout: <span class="font-bold">{{ formatCurrency(walletBalance) }}</span></p>
                </div>
              </div>
              
              <form @submit.prevent="requestPayout" class="space-y-6">
                <!-- Payout Amount -->
                <div>
                  <label for="payoutAmount" class="block text-gray-300 text-sm mb-1">Payout Amount</label>
                  <div class="relative">
                    <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">$</span>
                    <input
                      id="payoutAmount"
                      v-model.number="payoutAmount"
                      type="number"
                      min="50"
                      :max="walletBalance"
                      step="0.01"
                      class="w-full pl-8 px-4 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Enter amount"
                    />
                  </div>
                  <p v-if="payoutAmount > walletBalance" class="text-red-400 text-sm mt-1">
                    Amount exceeds available balance
                  </p>
                  <p v-else-if="payoutAmount < 50" class="text-red-400 text-sm mt-1">
                    Minimum payout amount is $50.00
                  </p>
                </div>
                
                <!-- Payout Method -->
                <div>
                  <label for="payoutMethod" class="block text-gray-300 text-sm mb-1">Payout Method</label>
                  <select
                    id="payoutMethod"
                    v-model="payoutMethod"
                    class="w-full px-4 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option 
                      v-for="method in payoutMethods" 
                      :key="method.id" 
                      :value="method.id"
                    >
                      {{ method.name }}
                    </option>
                  </select>
                </div>
                
                <!-- Submit Button -->
                <div>
                  <button
                    type="submit"
                    class="px-6 py-3 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition flex items-center"
                    :disabled="!canRequestPayout || payoutRequesting"
                    :class="{'opacity-50 cursor-not-allowed': !canRequestPayout || payoutRequesting}"
                  >
                    <svg v-if="payoutRequesting" class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Request Payout
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  </MainLayout>
</template> 
 