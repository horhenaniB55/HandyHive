<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useRouter, useRoute } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

// Check if the current route is a dashboard page
const isDashboardPage = computed(() => {
  return route.path.startsWith('/worker') || route.path.startsWith('/customer') || route.path.startsWith('/admin')
})

// Check if the current page should have a back button
const showBackButton = computed(() => {
  // Match specific pages that need a back button
  return (
    route.path.includes('/jobs') || 
    route.path.includes('/wallet') || 
    route.path.includes('/services') ||
    route.path.includes('/customer/bookings') ||
    route.path.includes('/customer/profile')
  )
})

// Determine where to navigate back to
const goBack = () => {
  if (userRole.value === 'worker') {
    router.push('/worker')
  } else if (userRole.value === 'customer') {
    router.push('/customer')
  } else if (userRole.value === 'admin') {
    router.push('/admin')
  } else {
    router.go(-1) // Fallback to browser history
  }
}

// Get the current page title
const pageTitle = computed(() => {
  if (route.path.includes('/jobs')) return 'My Jobs'
  if (route.path.includes('/wallet')) return 'Wallet'
  if (route.path.includes('/services')) return 'Services'
  if (route.path.includes('/customer/bookings')) return 'My Bookings'
  if (route.path.includes('/customer/profile')) return 'My Profile'
  return ''
})

const isAuthenticated = computed(() => authStore.isAuthenticated)
const userRole = computed(() => authStore.userRole)
const userDisplayName = computed(() => authStore.user?.displayName || 'User')
const userInitial = computed(() => {
  const name = authStore.user?.displayName || ''
  return name ? name.charAt(0).toUpperCase() : 'U'
})
const userPhotoURL = computed(() => authStore.user?.photoURL || null)

// Dropdown state
const showProfileDropdown = ref(false)
// Mobile menu state
const isMobileMenuOpen = ref(false)

const toggleProfileDropdown = () => {
  showProfileDropdown.value = !showProfileDropdown.value
}

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
  // Close profile dropdown when toggling mobile menu
  if (isMobileMenuOpen.value) {
    showProfileDropdown.value = false
  }
}

// Close dropdowns when clicking outside
const closeDropdowns = (e) => {
  if (!e.target.closest('#profile-dropdown-container')) {
    showProfileDropdown.value = false
  }
  
  if (!e.target.closest('#mobile-menu-container') && !e.target.closest('#mobile-menu-button')) {
    isMobileMenuOpen.value = false
  }
}

// Register the click event when component is mounted
onMounted(() => {
  document.addEventListener('click', closeDropdowns)
})

// Remove the event listener when component is unmounted
onUnmounted(() => {
  document.removeEventListener('click', closeDropdowns)
})

const navigateToProfile = () => {
  if (userRole.value === 'customer') {
    router.push('/customer/profile')
  } else if (userRole.value === 'worker') {
    router.push('/worker/profile')
  } else if (userRole.value === 'admin') {
    router.push('/admin/profile')
  }
  showProfileDropdown.value = false
  isMobileMenuOpen.value = false
}

const logout = async () => {
  try {
    await authStore.logout()
    router.push('/')
  } catch (error) {
    console.error('Logout error:', error)
  }
}

const navigateToDashboard = () => {
  if (userRole.value === 'customer') {
    router.push('/customer')
  } else if (userRole.value === 'worker') {
    router.push('/worker')
  } else if (userRole.value === 'admin') {
    router.push('/admin')
  }
  isMobileMenuOpen.value = false
}
</script>

<template>
  <div class="layout">
    <!-- Navbar -->
    <nav class="bg-gray-900 shadow-lg border-b border-gray-800">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <!-- Logo and desktop navigation -->
          <div class="flex items-center">
            <div class="flex-shrink-0 flex items-center">
              <router-link to="/" class="text-xl font-bold text-indigo-400">
                HandyHive
              </router-link>
            </div>
            <!-- Desktop navigation - hidden on mobile -->
            <div class="hidden md:ml-6 md:flex md:items-center md:space-x-4">
              <router-link to="/" class="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                Home
              </router-link>
              <router-link to="/services" class="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                Services
              </router-link>
              <router-link to="/workers" class="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                Find Workers
              </router-link>
            </div>
          </div>
          
          <!-- Mobile menu button and user actions -->
          <div class="flex items-center">
            <!-- Desktop actions - hidden on mobile -->
            <div class="hidden md:flex md:items-center">
              <div v-if="!isAuthenticated" class="flex items-center space-x-3">
                <router-link to="/login" class="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                  Login
                </router-link>
                <router-link to="/register" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                  Sign Up
                </router-link>
              </div>
              <div v-else class="flex items-center space-x-3">
                <button @click="navigateToDashboard" class="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                  Dashboard
                </button>
                
                <!-- Profile Avatar & Dropdown -->
                <div class="relative" id="profile-dropdown-container">
                  <button 
                    @click="toggleProfileDropdown" 
                    class="flex items-center focus:outline-none rounded-md hover:bg-gray-800 p-1.5 transition-colors"
                    aria-expanded="false"
                    aria-haspopup="true"
                  >
                    <!-- Show user photo if available, otherwise show avatar with initial -->
                    <div v-if="userPhotoURL" class="h-8 w-8 rounded-full overflow-hidden border-2 border-indigo-400">
                      <img :src="userPhotoURL" alt="Profile" class="h-full w-full object-cover" />
                    </div>
                    <div v-else class="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-medium">
                      {{ userInitial }}
                    </div>
                    
                    <!-- Dropdown indicator -->
                    <svg 
                      class="ml-1 h-5 w-5 text-gray-400" 
                      :class="{ 'transform rotate-180': showProfileDropdown }"
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox="0 0 20 20" 
                      fill="currentColor"
                    >
                      <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                    </svg>
                  </button>
                  
                  <!-- Dropdown Menu -->
                  <div 
                    v-if="showProfileDropdown" 
                    class="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-md shadow-lg py-1 z-50 transition-all duration-200 ease-in-out"
                  >
                    <div class="px-4 py-2 border-b border-gray-700">
                      <p class="text-sm font-medium text-white">{{ userDisplayName }}</p>
                      <p class="text-xs text-gray-400">{{ authStore.user?.email }}</p>
                    </div>
                    
                    <button 
                      @click="navigateToProfile" 
                      class="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center"
                    >
                      <svg class="mr-2 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Profile
                    </button>
                    
                    <button 
                      @click="logout" 
                      class="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center"
                    >
                      <svg class="mr-2 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Mobile menu button -->
            <div class="flex md:hidden">
              <button 
                id="mobile-menu-button"
                @click="toggleMobileMenu" 
                type="button" 
                class="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white" 
                aria-controls="mobile-menu" 
                :aria-expanded="isMobileMenuOpen"
              >
                <span class="sr-only">Open main menu</span>
                <!-- Hamburger icon when closed -->
                <svg 
                  :class="{'hidden': isMobileMenuOpen, 'block': !isMobileMenuOpen }" 
                  class="h-6 w-6" 
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor" 
                  aria-hidden="true"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <!-- X icon when open -->
                <svg 
                  :class="{'block': isMobileMenuOpen, 'hidden': !isMobileMenuOpen }" 
                  class="h-6 w-6" 
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor" 
                  aria-hidden="true"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Mobile menu, show/hide based on menu state -->
      <div 
        id="mobile-menu-container"
        :class="{ 'block': isMobileMenuOpen, 'hidden': !isMobileMenuOpen }" 
        class="md:hidden"
      >
        <div class="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          <router-link to="/" class="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium">
            Home
          </router-link>
          <router-link to="/services" class="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium">
            Services
          </router-link>
          <router-link to="/workers" class="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium">
            Find Workers
          </router-link>
        </div>
        
        <!-- Mobile auth/user section -->
        <div class="pt-4 pb-3 border-t border-gray-700">
          <div v-if="isAuthenticated" class="flex items-center px-5">
            <!-- User avatar -->
            <div v-if="userPhotoURL" class="h-10 w-10 rounded-full overflow-hidden border-2 border-indigo-400">
              <img :src="userPhotoURL" alt="Profile" class="h-full w-full object-cover" />
            </div>
            <div v-else class="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-medium">
              {{ userInitial }}
            </div>
            
            <!-- User info -->
            <div class="ml-3">
              <div class="text-base font-medium text-white">{{ userDisplayName }}</div>
              <div class="text-sm font-medium text-gray-400">{{ authStore.user?.email }}</div>
            </div>
          </div>
          
          <div class="mt-3 px-2 space-y-1">
            <div v-if="!isAuthenticated">
              <router-link to="/login" class="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-gray-700">
                Login
              </router-link>
              <router-link to="/register" class="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-gray-700">
                Sign Up
              </router-link>
            </div>
            <div v-else>
              <button @click="navigateToDashboard" class="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-gray-700">
                Dashboard
              </button>
              <button @click="navigateToProfile" class="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-gray-700">
                Profile
              </button>
              <button @click="logout" class="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-gray-700">
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>

    <!-- Back Button for specific pages -->
    <div v-if="showBackButton">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <button 
          @click="goBack" 
          class="flex items-center text-gray-300 hover:text-white"
        >
          <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span class="ml-1 text-sm font-medium">Back</span>
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <slot></slot>
    </main>

    <!-- Footer - Only show on non-dashboard pages -->
    <footer v-if="!isDashboardPage" class="bg-gray-900 border-t border-gray-800">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="flex flex-col md:flex-row justify-between">
          <div class="mb-6 md:mb-0">
            <h2 class="text-xl font-bold text-indigo-400">HandyHive</h2>
            <p class="text-gray-400 mt-2">The buzz of home services</p>
          </div>
          <div class="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <div>
              <h3 class="text-sm font-semibold text-gray-300 uppercase tracking-wider">Services</h3>
              <ul class="mt-4 space-y-2">
                <li><a href="#" class="text-gray-400 hover:text-white">Cleaning</a></li>
                <li><a href="#" class="text-gray-400 hover:text-white">Plumbing</a></li>
                <li><a href="#" class="text-gray-400 hover:text-white">Electrical</a></li>
                <li><a href="#" class="text-gray-400 hover:text-white">Carpentry</a></li>
              </ul>
            </div>
            <div>
              <h3 class="text-sm font-semibold text-gray-300 uppercase tracking-wider">Company</h3>
              <ul class="mt-4 space-y-2">
                <li><a href="#" class="text-gray-400 hover:text-white">About</a></li>
                <li><a href="#" class="text-gray-400 hover:text-white">Blog</a></li>
                <li><a href="#" class="text-gray-400 hover:text-white">Careers</a></li>
                <li><a href="#" class="text-gray-400 hover:text-white">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 class="text-sm font-semibold text-gray-300 uppercase tracking-wider">Legal</h3>
              <ul class="mt-4 space-y-2">
                <li><a href="#" class="text-gray-400 hover:text-white">Privacy Policy</a></li>
                <li><a href="#" class="text-gray-400 hover:text-white">Terms of Service</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div class="mt-8 border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p class="text-gray-400 mb-4 md:mb-0">&copy; 2023 HandyHive. All rights reserved.</p>
          <div class="flex space-x-6">
            <a href="#" class="text-gray-400 hover:text-white">
              <span class="sr-only">Facebook</span>
              <svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fill-rule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clip-rule="evenodd" />
              </svg>
            </a>
            <a href="#" class="text-gray-400 hover:text-white">
              <span class="sr-only">Twitter</span>
              <svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
              </svg>
            </a>
            <a href="#" class="text-gray-400 hover:text-white">
              <span class="sr-only">Instagram</span>
              <svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fill-rule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clip-rule="evenodd" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template> 