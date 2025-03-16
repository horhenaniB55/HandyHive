import { createRouter, createWebHistory } from 'vue-router'
import { auth } from '../firebase/config'

// Lazy load components
const Home = () => import('../views/public/Home.vue')
const Login = () => import('../views/public/Login.vue')
const Register = () => import('../views/public/Register.vue')
const ServiceCategories = () => import('../views/public/ServiceCategories.vue')
const Services = () => import('../views/public/Services.vue')
const ServiceDetail = () => import('../views/public/ServiceDetail.vue')
const WorkerListings = () => import('../views/public/WorkerListings.vue')
const WorkerDetail = () => import('../views/public/WorkerDetail.vue')

const CustomerDashboard = () => import('../views/customer/Dashboard.vue')
const CustomerProfile = () => import('../views/customer/Profile.vue')
const CustomerBookings = () => import('../views/customer/Bookings.vue')

const WorkerDashboard = () => import('../views/worker/Dashboard.vue')
const WorkerProfile = () => import('../views/worker/Profile.vue')
const WorkerJobs = () => import('../views/worker/Jobs.vue')
const WorkerWallet = () => import('../views/worker/Wallet.vue')
const WorkerServices = () => import('../views/worker/Services.vue')

const AdminDashboard = () => import('../views/admin/Dashboard.vue')

// Routes configuration
const routes = [
  // Public routes
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/register',
    name: 'Register',
    component: Register
  },
  {
    path: '/service-categories',
    name: 'ServiceCategories',
    component: ServiceCategories
  },
  {
    path: '/services',
    name: 'Services',
    component: Services
  },
  {
    path: '/services/:id',
    name: 'ServiceDetail',
    component: ServiceDetail
  },
  {
    path: '/workers',
    name: 'WorkerListings',
    component: WorkerListings
  },
  {
    path: '/workers/:id',
    name: 'WorkerDetail',
    component: WorkerDetail
  },
  
  // Customer routes
  {
    path: '/customer',
    name: 'CustomerDashboard',
    component: CustomerDashboard,
    meta: { requiresAuth: true, role: 'customer' }
  },
  {
    path: '/customer/profile',
    name: 'CustomerProfile',
    component: CustomerProfile,
    meta: { requiresAuth: true, role: 'customer' }
  },
  {
    path: '/customer/bookings',
    name: 'CustomerBookings',
    component: CustomerBookings,
    meta: { requiresAuth: true, role: 'customer' }
  },
  
  // Worker routes
  {
    path: '/worker',
    name: 'WorkerDashboard',
    component: WorkerDashboard,
    meta: { requiresAuth: true, role: 'worker' }
  },
  {
    path: '/worker/profile',
    name: 'WorkerProfile',
    component: WorkerProfile,
    meta: { requiresAuth: true, role: 'worker' }
  },
  {
    path: '/worker/jobs',
    name: 'WorkerJobs',
    component: WorkerJobs,
    meta: { requiresAuth: true, role: 'worker' }
  },
  {
    path: '/worker/wallet',
    name: 'WorkerWallet',
    component: WorkerWallet,
    meta: { requiresAuth: true, role: 'worker' }
  },
  {
    path: '/worker/services',
    name: 'WorkerServices',
    component: WorkerServices,
    meta: { requiresAuth: true, role: 'worker' }
  },
  
  // Admin routes
  {
    path: '/admin',
    name: 'AdminDashboard',
    component: AdminDashboard,
    meta: { requiresAuth: true, role: 'admin' }
  }
]

// Create router
const router = createRouter({
  history: createWebHistory(),
  routes
})

// Global variable to store the auth state
let currentUser = null
let authReady = false

// Set up auth state listener outside of navigation guard
auth.onAuthStateChanged(user => {
  currentUser = user
  authReady = true
})

// Navigation guard for auth and role checking
router.beforeEach(async (to, from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  
  if (!requiresAuth) {
    return next()
  }
  
  // Wait for Firebase auth to be ready before proceeding
  if (!authReady) {
    try {
      await new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged(user => {
          currentUser = user
          authReady = true
          unsubscribe()
          resolve()
        })
      })
    } catch (error) {
      console.error('Error checking auth state:', error)
    }
  }
  
  // If not authenticated after waiting, redirect to login
  if (!currentUser) {
    return next('/login')
  }
  
  // Check if the route requires a specific role
  const requiredRole = to.meta.role
  
  if (requiredRole) {
    // Get user role from localStorage
    const userRole = localStorage.getItem('userRole')
    
    // If the role doesn't match, redirect to home
    if (userRole !== requiredRole) {
      return next('/')
    }
  }
  
  // User is authenticated and has the correct role
  next()
})

export default router 