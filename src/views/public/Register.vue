<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import MainLayout from '../../components/layout/MainLayout.vue'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const displayName = ref('')
const role = ref('customer') // Default role
const loading = ref(false)
const error = ref('')

const passwordsMatch = computed(() => {
  return password.value === confirmPassword.value
})

const register = async () => {
  if (!email.value || !password.value || !displayName.value) {
    error.value = 'Please fill in all required fields'
    return
  }
  
  if (!passwordsMatch.value) {
    error.value = 'Passwords do not match'
    return
  }
  
  loading.value = true
  error.value = ''
  
  try {
    await authStore.registerUser(email.value, password.value, displayName.value, role.value)
    
    // Redirect based on user role
    if (role.value === 'customer') {
      router.push('/customer')
    } else if (role.value === 'worker') {
      router.push('/worker')
    } else {
      router.push('/')
    }
  } catch (err) {
    error.value = err.message || 'Failed to register'
  } finally {
    loading.value = false
  }
}

const loginWithGoogle = async () => {
  loading.value = true
  error.value = ''
  
  try {
    await authStore.loginWithGoogle()
    
    // Redirect based on user role
    if (authStore.isCustomer) {
      router.push('/customer')
    } else if (authStore.isWorker) {
      router.push('/worker')
    } else {
      router.push('/')
    }
  } catch (err) {
    error.value = err.message || 'Failed to login with Google'
  } finally {
    loading.value = false
  }
}

const goToLogin = () => {
  router.push('/login')
}
</script>

<template>
  <MainLayout>
    <div class="max-w-md mx-auto">
      <div class="card">
        <h1 class="text-2xl font-bold text-white mb-6 text-center">Create an Account</h1>
        
        <div v-if="error" class="bg-red-900 text-red-200 p-3 rounded mb-4">
          {{ error }}
        </div>
        
        <form @submit.prevent="register" class="space-y-4">
          <div>
            <label for="displayName" class="block text-sm font-medium text-gray-300 mb-1">Full Name</label>
            <input 
              id="displayName" 
              v-model="displayName" 
              type="text" 
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="John Doe"
              required
            />
          </div>
          
          <div>
            <label for="email" class="block text-sm font-medium text-gray-300 mb-1">Email</label>
            <input 
              id="email" 
              v-model="email" 
              type="email" 
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="your@email.com"
              required
            />
          </div>
          
          <div>
            <label for="password" class="block text-sm font-medium text-gray-300 mb-1">Password</label>
            <input 
              id="password" 
              v-model="password" 
              type="password" 
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="••••••••"
              required
            />
          </div>
          
          <div>
            <label for="confirmPassword" class="block text-sm font-medium text-gray-300 mb-1">Confirm Password</label>
            <input 
              id="confirmPassword" 
              v-model="confirmPassword" 
              type="password" 
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="••••••••"
              required
            />
            <p v-if="confirmPassword && !passwordsMatch" class="mt-1 text-sm text-red-400">
              Passwords do not match
            </p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">I want to:</label>
            <div class="flex space-x-4">
              <div class="flex items-center">
                <input 
                  id="role-customer" 
                  v-model="role" 
                  type="radio" 
                  value="customer"
                  class="h-4 w-4 bg-gray-700 border-gray-600 text-indigo-600 focus:ring-indigo-500" 
                />
                <label for="role-customer" class="ml-2 block text-sm text-gray-300">Hire Workers</label>
              </div>
              <div class="flex items-center">
                <input 
                  id="role-worker" 
                  v-model="role" 
                  type="radio" 
                  value="worker"
                  class="h-4 w-4 bg-gray-700 border-gray-600 text-indigo-600 focus:ring-indigo-500" 
                />
                <label for="role-worker" class="ml-2 block text-sm text-gray-300">Offer Services</label>
              </div>
            </div>
          </div>
          
          <div class="flex items-center">
            <input 
              id="terms" 
              type="checkbox" 
              class="h-4 w-4 bg-gray-700 border-gray-600 rounded text-indigo-600 focus:ring-indigo-500" 
              required
            />
            <label for="terms" class="ml-2 block text-sm text-gray-300">
              I agree to the <a href="#" class="text-indigo-400 hover:text-indigo-300">Terms of Service</a> and <a href="#" class="text-indigo-400 hover:text-indigo-300">Privacy Policy</a>
            </label>
          </div>
          
          <div>
            <button 
              type="submit" 
              class="w-full btn-primary py-2"
              :disabled="loading"
            >
              <span v-if="loading">
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating account...
              </span>
              <span v-else>Create Account</span>
            </button>
          </div>
        </form>
        
        <div class="mt-6">
          <div class="relative">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-gray-600"></div>
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="px-2 bg-gray-800 text-gray-400">Or continue with</span>
            </div>
          </div>
          
          <div class="mt-6">
            <button 
              @click="loginWithGoogle" 
              class="w-full flex justify-center py-2 px-4 border border-gray-600 rounded-md shadow-sm bg-gray-700 text-sm font-medium text-white hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              :disabled="loading"
            >
              <svg class="h-5 w-5 mr-2" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                  <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                  <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                  <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                  <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
                </g>
              </svg>
              Sign up with Google
            </button>
          </div>
        </div>
        
        <div class="mt-6 text-center">
          <p class="text-sm text-gray-400">
            Already have an account?
            <button @click="goToLogin" class="text-indigo-400 hover:text-indigo-300 font-medium ml-1">
              Log in
            </button>
          </p>
        </div>
      </div>
    </div>
  </MainLayout>
</template> 