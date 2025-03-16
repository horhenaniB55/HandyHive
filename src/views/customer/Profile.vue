<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import MainLayout from '../../components/layout/MainLayout.vue'

const router = useRouter()
const authStore = useAuthStore()
const user = ref(null)
const loading = ref(true)
const error = ref('')
const success = ref('')

// Form fields
const displayName = ref('')
const email = ref('')
const phone = ref('')
const address = ref('')
const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

// Loading states
const profileLoading = ref(false)
const passwordLoading = ref(false)
const deleteLoading = ref(false)
const showDeleteConfirm = ref(false)

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
    
    // Load user profile data
    user.value = authStore.user
    
    // Populate form fields with current values
    displayName.value = user.value.displayName || ''
    email.value = user.value.email || ''
    phone.value = user.value.phone || ''
    address.value = user.value.address || ''
  } catch (err) {
    console.error('Error loading profile:', err)
    error.value = 'Failed to load profile information'
  } finally {
    loading.value = false
  }
})

const updateProfile = async () => {
  try {
    profileLoading.value = true
    error.value = ''
    success.value = ''
    
    // Validate inputs
    if (!displayName.value.trim()) {
      error.value = 'Display name is required'
      return
    }
    
    const profileData = {
      displayName: displayName.value,
      phone: phone.value,
      address: address.value
    }
    
    // Update profile in the store
    await authStore.updateProfile(profileData)
    
    success.value = 'Profile updated successfully'
  } catch (err) {
    console.error('Error updating profile:', err)
    error.value = 'Failed to update profile: ' + (err.message || 'Unknown error')
  } finally {
    profileLoading.value = false
  }
}

const changePassword = async () => {
  try {
    passwordLoading.value = true
    error.value = ''
    success.value = ''
    
    // Validate inputs
    if (!oldPassword.value) {
      error.value = 'Current password is required'
      return
    }
    
    if (!newPassword.value || newPassword.value.length < 8) {
      error.value = 'New password must be at least 8 characters'
      return
    }
    
    if (newPassword.value !== confirmPassword.value) {
      error.value = 'New passwords do not match'
      return
    }
    
    // Update password in the store
    await authStore.changePassword(oldPassword.value, newPassword.value)
    
    // Clear password fields
    oldPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    
    success.value = 'Password changed successfully'
  } catch (err) {
    console.error('Error changing password:', err)
    error.value = 'Failed to change password: ' + (err.message || 'Invalid current password')
  } finally {
    passwordLoading.value = false
  }
}

const confirmDeleteAccount = () => {
  showDeleteConfirm.value = true
}

const cancelDeleteAccount = () => {
  showDeleteConfirm.value = false
}

const deleteAccount = async () => {
  try {
    deleteLoading.value = true
    error.value = ''
    
    // Delete account in the store
    await authStore.deleteAccount()
    
    // Redirect to home page after account deletion
    router.push('/')
  } catch (err) {
    console.error('Error deleting account:', err)
    error.value = 'Failed to delete account: ' + (err.message || 'Unknown error')
    showDeleteConfirm.value = false
  } finally {
    deleteLoading.value = false
  }
}
</script>

<template>
  <MainLayout>
    <div class="container mx-auto px-4 py-8">
      <h1 class="text-3xl font-bold text-white mb-8">My Profile</h1>
      
      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
      
      <!-- Error State -->
      <div v-else-if="error && !success" class="bg-red-900 text-red-200 p-4 rounded mb-4">
        {{ error }}
      </div>
      
      <!-- Success Message -->
      <div v-if="success" class="bg-green-900 text-green-200 p-4 rounded mb-4">
        {{ success }}
      </div>
      
      <!-- Profile Content -->
      <div v-if="!loading" class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <!-- Profile Information Section -->
        <div class="md:col-span-2">
          <div class="card mb-8">
            <div class="p-6">
              <h2 class="text-xl font-semibold text-white mb-6">Profile Information</h2>
              
              <form @submit.prevent="updateProfile" class="space-y-4">
                <!-- Display Name -->
                <div>
                  <label for="displayName" class="block text-gray-300 text-sm mb-1">Display Name</label>
                  <input
                    id="displayName"
                    v-model="displayName"
                    type="text"
                    class="w-full px-4 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Your name"
                  />
                </div>
                
                <!-- Email (readonly) -->
                <div>
                  <label for="email" class="block text-gray-300 text-sm mb-1">Email Address</label>
                  <input
                    id="email"
                    v-model="email"
                    type="email"
                    class="w-full px-4 py-2 bg-gray-700 text-white rounded cursor-not-allowed opacity-70"
                    placeholder="Your email"
                    readonly
                  />
                  <p class="text-gray-400 text-xs mt-1">Email address cannot be changed</p>
                </div>
                
                <!-- Phone -->
                <div>
                  <label for="phone" class="block text-gray-300 text-sm mb-1">Phone Number</label>
                  <input
                    id="phone"
                    v-model="phone"
                    type="tel"
                    class="w-full px-4 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Your phone number"
                  />
                </div>
                
                <!-- Address -->
                <div>
                  <label for="address" class="block text-gray-300 text-sm mb-1">Address</label>
                  <textarea
                    id="address"
                    v-model="address"
                    class="w-full px-4 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 h-24"
                    placeholder="Your address"
                  ></textarea>
                </div>
                
                <!-- Submit Button -->
                <div>
                  <button
                    type="submit"
                    class="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition flex items-center"
                    :disabled="profileLoading"
                  >
                    <svg v-if="profileLoading" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Update Profile
                  </button>
                </div>
              </form>
            </div>
          </div>
          
          <!-- Password Change Section -->
          <div class="card mb-8">
            <div class="p-6">
              <h2 class="text-xl font-semibold text-white mb-6">Change Password</h2>
              
              <form @submit.prevent="changePassword" class="space-y-4">
                <!-- Current Password -->
                <div>
                  <label for="oldPassword" class="block text-gray-300 text-sm mb-1">Current Password</label>
                  <input
                    id="oldPassword"
                    v-model="oldPassword"
                    type="password"
                    class="w-full px-4 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Your current password"
                  />
                </div>
                
                <!-- New Password -->
                <div>
                  <label for="newPassword" class="block text-gray-300 text-sm mb-1">New Password</label>
                  <input
                    id="newPassword"
                    v-model="newPassword"
                    type="password"
                    class="w-full px-4 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="New password"
                  />
                  <p class="text-gray-400 text-xs mt-1">Password must be at least 8 characters</p>
                </div>
                
                <!-- Confirm New Password -->
                <div>
                  <label for="confirmPassword" class="block text-gray-300 text-sm mb-1">Confirm New Password</label>
                  <input
                    id="confirmPassword"
                    v-model="confirmPassword"
                    type="password"
                    class="w-full px-4 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Confirm new password"
                  />
                </div>
                
                <!-- Submit Button -->
                <div>
                  <button
                    type="submit"
                    class="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition flex items-center"
                    :disabled="passwordLoading"
                  >
                    <svg v-if="passwordLoading" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Change Password
                  </button>
                </div>
              </form>
            </div>
          </div>
          
          <!-- Delete Account Section -->
          <div class="card bg-gray-800 border border-red-800">
            <div class="p-6">
              <h2 class="text-xl font-semibold text-white mb-2">Delete Account</h2>
              <p class="text-gray-300 mb-4">Once you delete your account, there is no going back. This action is permanent.</p>
              
              <div v-if="!showDeleteConfirm">
                <button
                  @click="confirmDeleteAccount"
                  class="px-6 py-2 bg-red-700 text-white rounded hover:bg-red-800 transition"
                >
                  Delete Account
                </button>
              </div>
              
              <div v-else class="bg-red-900 p-4 rounded">
                <p class="text-white font-medium mb-4">Are you sure you want to delete your account? All of your data will be permanently removed.</p>
                <div class="flex space-x-4">
                  <button
                    @click="deleteAccount"
                    class="px-6 py-2 bg-red-700 text-white rounded hover:bg-red-800 transition flex items-center"
                    :disabled="deleteLoading"
                  >
                    <svg v-if="deleteLoading" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Yes, Delete My Account
                  </button>
                  <button
                    @click="cancelDeleteAccount"
                    class="px-6 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition"
                    :disabled="deleteLoading"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Account Summary Section -->
        <div class="md:col-span-1">
          <div class="card sticky top-4">
            <div class="p-6">
              <h2 class="text-xl font-semibold text-white mb-6">Account Summary</h2>
              
              <!-- Profile Picture -->
              <div class="flex flex-col items-center mb-6">
                <div class="bg-indigo-600 h-24 w-24 rounded-full flex items-center justify-center text-3xl font-bold text-white mb-2">
                  {{ displayName.charAt(0) }}
                </div>
                <p class="text-white font-medium">{{ displayName || 'User' }}</p>
                <p class="text-gray-400 text-sm">{{ email }}</p>
              </div>
              
              <!-- Account Status -->
              <div class="bg-gray-800 rounded p-4 mb-4">
                <h3 class="font-medium text-white mb-2">Account Status</h3>
                <div class="flex items-center">
                  <span class="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                  <span class="text-gray-300">Active</span>
                </div>
              </div>
              
              <!-- Account Type -->
              <div class="bg-gray-800 rounded p-4 mb-4">
                <h3 class="font-medium text-white mb-2">Account Type</h3>
                <span class="inline-block bg-indigo-900 text-indigo-300 px-3 py-1 rounded text-sm">
                  Customer
                </span>
              </div>
              
              <!-- Quick Links -->
              <div class="bg-gray-800 rounded p-4">
                <h3 class="font-medium text-white mb-2">Quick Links</h3>
                <ul class="space-y-2 text-gray-300">
                  <li>
                    <a href="/customer" class="hover:text-indigo-400 transition">Dashboard</a>
                  </li>
                  <li>
                    <a href="/customer/bookings" class="hover:text-indigo-400 transition">My Bookings</a>
                  </li>
                  <li>
                    <a href="/services" class="hover:text-indigo-400 transition">Book a Service</a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </MainLayout>
</template> 