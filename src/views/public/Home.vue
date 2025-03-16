<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import MainLayout from '../../components/layout/MainLayout.vue'
import { useServiceStore } from '../../stores/services'

const router = useRouter()
const serviceStore = useServiceStore()

const featuredServices = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    // In a real app, you'd have a way to fetch featured services
    // Here we're just getting all services and taking the first few
    await serviceStore.fetchServices()
    featuredServices.value = serviceStore.services.slice(0, 4)
  } catch (error) {
    console.error('Error fetching services:', error)
    // Add some fallback data for the UI to show
    featuredServices.value = [
      { id: 'cleaning', name: 'Home Cleaning', category: 'Cleaning', description: 'Professional home cleaning services' },
      { id: 'plumbing', name: 'Plumbing', category: 'Plumbing', description: 'Fix leaks, install fixtures, and solve plumbing issues' },
      { id: 'electrical', name: 'Electrical', category: 'Electrical', description: 'Electrical repairs and installations' },
      { id: 'carpentry', name: 'Carpentry', category: 'Carpentry', description: 'Furniture assembly and repairs' }
    ]
  } finally {
    loading.value = false
  }
})

const goToServices = () => {
  router.push('/services')
}

const goToRegister = () => {
  router.push('/register')
}
</script>

<template>
  <MainLayout>
    <!-- Hero Section -->
    <section class="py-12 md:py-20 bg-gray-800 rounded-xl overflow-hidden shadow-xl mb-12 relative">      
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-[5]">
        <div class="flex flex-col md:flex-row md:items-center">
          <div class="flex-1 mb-8 md:mb-0 md:pr-10">
            <h1 class="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
              Find Skilled Home Service Workers in Your Area
            </h1>
            <p class="text-lg text-gray-300 mb-8">
              HandyHive connects you with verified professionals for all your home service needs. Get help with cleaning, plumbing, electrical work, and more!
            </p>
            <div class="flex flex-col sm:flex-row gap-4">
              <button @click="goToServices" class="btn-primary py-3 px-6 text-lg">
                Explore Services
              </button>
              <button @click="goToRegister" class="btn-secondary py-3 px-6 text-lg">
                Become a Worker
              </button>
            </div>
          </div>
          <div class="flex-1">
            <div class="relative h-72 md:h-96 rounded-lg overflow-hidden shadow-lg">
              <!-- Gradient background maintained as requested -->
              <div class="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-lg"></div>
              <!-- Added homeservice.png image with improved styling -->
              <img 
                src="/homeservice.png" 
                alt="Home Service Workers" 
                class="absolute inset-0 w-full h-full object-contain p-6 z-[3] filter brightness-105"
              />
              <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-indigo-900/90 to-transparent p-4 pt-12 z-[4]">
                <span class="text-lg text-white opacity-50 font-bold drop-shadow-sm">HandyHive</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- How It Works -->
    <section class="py-12">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 class="text-3xl font-bold text-center text-white mb-12">How HandyHive Works</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div class="bg-gray-800 p-6 rounded-lg shadow-lg">
            <div class="flex items-center justify-center h-16 w-16 rounded-full bg-indigo-600 text-white text-xl font-bold mb-4 mx-auto">1</div>
            <h3 class="text-xl font-semibold text-white text-center mb-2">Choose a Service</h3>
            <p class="text-gray-300 text-center">Browse through our wide range of home services and select what you need.</p>
          </div>
          <div class="bg-gray-800 p-6 rounded-lg shadow-lg">
            <div class="flex items-center justify-center h-16 w-16 rounded-full bg-indigo-600 text-white text-xl font-bold mb-4 mx-auto">2</div>
            <h3 class="text-xl font-semibold text-white text-center mb-2">Pick a Worker</h3>
            <p class="text-gray-300 text-center">View profiles of available workers, compare ratings, and choose the best match.</p>
          </div>
          <div class="bg-gray-800 p-6 rounded-lg shadow-lg">
            <div class="flex items-center justify-center h-16 w-16 rounded-full bg-indigo-600 text-white text-xl font-bold mb-4 mx-auto">3</div>
            <h3 class="text-xl font-semibold text-white text-center mb-2">Book & Pay</h3>
            <p class="text-gray-300 text-center">Schedule your service appointment and pay after the job is complete.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Featured Services -->
    <section class="py-12 bg-gray-900 rounded-xl">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center mb-8">
          <h2 class="text-3xl font-bold text-white">Featured Services</h2>
          <button @click="goToServices" class="text-indigo-400 hover:text-indigo-300 font-medium">
            View All <span aria-hidden="true">→</span>
          </button>
        </div>
        
        <div v-if="loading" class="flex justify-center py-12">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        </div>
        
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div 
            v-for="service in featuredServices" 
            :key="service.id" 
            class="card hover:shadow-2xl transition-all cursor-pointer"
            @click="router.push(`/services?category=${service.category}`)"
          >
            <div class="h-48 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-t-lg"></div>
            <div class="p-5">
              <h3 class="text-xl font-semibold text-white mb-2">{{ service.name }}</h3>
              <p class="text-gray-400 mb-4">{{ service.description }}</p>
              <span class="inline-block bg-indigo-900 text-indigo-300 text-xs px-2 py-1 rounded">{{ service.category }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Testimonials -->
    <section class="py-12">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 class="text-3xl font-bold text-center text-white mb-12">What Our Users Say</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div class="bg-gray-800 p-6 rounded-lg shadow-lg">
            <div class="flex items-center mb-4">
              <div class="h-12 w-12 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">JD</div>
              <div class="ml-4">
                <h4 class="text-lg font-semibold text-white">John Doe</h4>
                <div class="flex text-yellow-400">
                  <span>★★★★★</span>
                </div>
              </div>
            </div>
            <p class="text-gray-300">"I found an amazing plumber through HandyHive. He arrived on time and fixed the issue quickly. Great service!"</p>
          </div>
          
          <div class="bg-gray-800 p-6 rounded-lg shadow-lg">
            <div class="flex items-center mb-4">
              <div class="h-12 w-12 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">SS</div>
              <div class="ml-4">
                <h4 class="text-lg font-semibold text-white">Sarah Smith</h4>
                <div class="flex text-yellow-400">
                  <span>★★★★★</span>
                </div>
              </div>
            </div>
            <p class="text-gray-300">"As a cleaner, I'm able to find regular clients through HandyHive. The platform is easy to use and helps me manage my schedule."</p>
          </div>
          
          <div class="bg-gray-800 p-6 rounded-lg shadow-lg">
            <div class="flex items-center mb-4">
              <div class="h-12 w-12 rounded-full bg-green-600 flex items-center justify-center text-white font-bold">MJ</div>
              <div class="ml-4">
                <h4 class="text-lg font-semibold text-white">Mike Johnson</h4>
                <div class="flex text-yellow-400">
                  <span>★★★★☆</span>
                </div>
              </div>
            </div>
            <p class="text-gray-300">"HandyHive helped me find reliable electricians when I needed urgent help with wiring issues. Would definitely use again!"</p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="py-12 mt-8">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-2xl overflow-hidden">
          <div class="px-6 py-12 sm:px-12 sm:py-16 text-center">
            <h2 class="text-3xl font-extrabold text-white sm:text-4xl mb-6">
              Ready to get started?
            </h2>
            <p class="text-lg text-indigo-100 mb-8 max-w-2xl mx-auto">
              Join thousands of customers and workers on HandyHive today. Sign up for free and start booking or offering services in minutes.
            </p>
            <div class="flex flex-col sm:flex-row sm:justify-center gap-4">
              <button @click="goToRegister" class="btn-primary py-3 px-8 text-lg bg-white text-indigo-600 hover:bg-gray-100">
                Sign Up Now
              </button>
              <button @click="goToServices" class="btn-secondary py-3 px-8 text-lg">
                Explore Services
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  </MainLayout>
</template>

<style scoped>
/* All hexagon styles removed */
</style> 