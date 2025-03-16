<script setup>
import { ref, watch, onMounted } from 'vue'
import { useWorkerStore } from '../../stores/workers'

const props = defineProps({
  initialAreas: {
    type: Array,
    default: () => ([
      {
        radius: 10,
        center: {
          latitude: 0,
          longitude: 0,
          address: ''
        }
      }
    ])
  }
})

const emit = defineEmits(['update:areas', 'save'])

const workerStore = useWorkerStore()
const loading = ref(false)
const error = ref('')
const saveSuccess = ref(false)
const serviceAreas = ref([...props.initialAreas])
const currentLocation = ref(null)

// Watch for changes from parent
watch(() => props.initialAreas, (newValue) => {
  serviceAreas.value = [...newValue]
}, { deep: true })

onMounted(() => {
  // Try to get user's current location if no areas are set
  if (serviceAreas.value.length === 0 || 
      (serviceAreas.value.length === 1 && 
       serviceAreas.value[0].center.latitude === 0 && 
       serviceAreas.value[0].center.longitude === 0)) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        currentLocation.value = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }
        
        // Update the first service area with current location
        if (serviceAreas.value.length === 0) {
          addServiceArea()
        } else {
          serviceAreas.value[0].center.latitude = currentLocation.value.latitude
          serviceAreas.value[0].center.longitude = currentLocation.value.longitude
          // In a real app, you would reverse geocode to get the address
          serviceAreas.value[0].center.address = 'Current Location'
        }
        
        emitUpdate()
      },
      (error) => {
        console.error('Error getting location:', error)
      }
    )
  }
})

const addServiceArea = () => {
  serviceAreas.value.push({
    radius: 10,
    center: {
      latitude: currentLocation.value?.latitude || 0,
      longitude: currentLocation.value?.longitude || 0,
      address: currentLocation.value ? 'Current Location' : ''
    }
  })
  
  emitUpdate()
}

const removeServiceArea = (index) => {
  serviceAreas.value.splice(index, 1)
  emitUpdate()
}

const updateRadius = (index, radius) => {
  serviceAreas.value[index].radius = radius
  emitUpdate()
}

const updateAddress = (index, address) => {
  serviceAreas.value[index].center.address = address
  // In a real app, you would geocode this address to get latitude and longitude
  emitUpdate()
}

const emitUpdate = () => {
  emit('update:areas', [...serviceAreas.value])
}

const saveServiceAreas = async () => {
  loading.value = true
  error.value = ''
  saveSuccess.value = false
  
  try {
    await workerStore.updateWorkerProfile({
      serviceAreas: serviceAreas.value
    })
    
    saveSuccess.value = true
    setTimeout(() => {
      saveSuccess.value = false
    }, 3000)
  } catch (err) {
    console.error('Failed to save service areas:', err)
    error.value = 'Failed to save service areas'
  } finally {
    loading.value = false
  }
  
  emit('save', [...serviceAreas.value])
}
</script>

<template>
  <div class="bg-gray-800 rounded-xl shadow-lg overflow-hidden">
    <div class="p-6 border-b border-gray-700">
      <h3 class="text-xl font-semibold text-white">Service Areas</h3>
      <p class="text-gray-400 mt-1">Define the areas where you provide your services</p>
    </div>
    
    <div class="p-6">
      <div v-if="error" class="bg-red-900 text-red-200 p-4 rounded mb-4">
        {{ error }}
      </div>
      
      <div v-if="saveSuccess" class="bg-green-900 text-green-200 p-4 rounded mb-4">
        Your service areas have been updated successfully!
      </div>
      
      <!-- Service Areas List -->
      <div class="space-y-4">
        <div v-for="(area, index) in serviceAreas" :key="index" class="card p-4">
          <div class="flex flex-col space-y-4">
            <div class="flex justify-between items-center">
              <h4 class="text-white font-medium">Area {{ index + 1 }}</h4>
              <button 
                @click="removeServiceArea(index)"
                class="text-red-400 hover:text-red-300 transition-colors p-1 rounded"
                :disabled="serviceAreas.length === 1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block mb-2 text-sm font-medium text-gray-300">Location/Address</label>
                <input 
                  type="text" 
                  :value="area.center.address"
                  @input="updateAddress(index, $event.target.value)"
                  class="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
                  placeholder="Enter an address or location"
                >
                <p class="mt-1 text-xs text-gray-400">This is where you're based for this service area</p>
              </div>
              
              <div>
                <label class="block mb-2 text-sm font-medium text-gray-300">Service Radius (km)</label>
                <div class="flex items-center space-x-2">
                  <input 
                    type="range" 
                    min="1" 
                    max="50" 
                    step="1"
                    :value="area.radius"
                    @input="updateRadius(index, parseInt($event.target.value))"
                    class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  >
                  <span class="text-white font-medium">{{ area.radius }} km</span>
                </div>
                <p class="mt-1 text-xs text-gray-400">How far you're willing to travel for jobs</p>
              </div>
            </div>
            
            <div class="bg-gray-700 p-4 rounded-lg flex items-center justify-center text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Map integration would be shown here
            </div>
          </div>
        </div>
      </div>
      
      <!-- Add Area Button -->
      <button 
        @click="addServiceArea"
        class="mt-4 flex items-center text-indigo-400 hover:text-indigo-300 font-medium"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Add Another Service Area
      </button>
      
      <!-- Save Button -->
      <div class="mt-6 flex justify-end">
        <button 
          @click="saveServiceAreas"
          class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded transition-colors"
          :disabled="loading"
        >
          <span v-if="loading">
            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Saving...
          </span>
          <span v-else>Save Service Areas</span>
        </button>
      </div>
    </div>
  </div>
</template> 