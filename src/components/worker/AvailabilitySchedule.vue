<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useWorkerStore } from '../../stores/workers'

const props = defineProps({
  initialSchedule: {
    type: Object,
    default: () => ({
      monday: { isAvailable: false, hours: { start: '09:00', end: '17:00' } },
      tuesday: { isAvailable: false, hours: { start: '09:00', end: '17:00' } },
      wednesday: { isAvailable: false, hours: { start: '09:00', end: '17:00' } },
      thursday: { isAvailable: false, hours: { start: '09:00', end: '17:00' } },
      friday: { isAvailable: false, hours: { start: '09:00', end: '17:00' } },
      saturday: { isAvailable: false, hours: { start: '09:00', end: '17:00' } },
      sunday: { isAvailable: false, hours: { start: '09:00', end: '17:00' } }
    })
  }
})

const emit = defineEmits(['update:schedule', 'save'])

const workerStore = useWorkerStore()
const loading = ref(false)
const error = ref('')
const saveSuccess = ref(false)

// Deep clone the initial schedule to avoid direct mutations
const schedule = ref(JSON.parse(JSON.stringify(props.initialSchedule)))

// Watch for changes from parent
watch(() => props.initialSchedule, (newValue) => {
  schedule.value = JSON.parse(JSON.stringify(newValue))
}, { deep: true })

// Days of the week for display
const daysOfWeek = [
  { id: 'monday', label: 'Monday' },
  { id: 'tuesday', label: 'Tuesday' },
  { id: 'wednesday', label: 'Wednesday' },
  { id: 'thursday', label: 'Thursday' },
  { id: 'friday', label: 'Friday' },
  { id: 'saturday', label: 'Saturday' },
  { id: 'sunday', label: 'Sunday' }
]

// Time slots for dropdown
const timeSlots = computed(() => {
  const slots = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const hourStr = hour.toString().padStart(2, '0')
      const minuteStr = minute.toString().padStart(2, '0')
      slots.push(`${hourStr}:${minuteStr}`)
    }
  }
  return slots
})

// Toggle availability for a day
const toggleAvailability = (day) => {
  schedule.value[day].isAvailable = !schedule.value[day].isAvailable
  emitUpdate()
}

// Update time for a day
const updateTime = (day, type, time) => {
  schedule.value[day].hours[type] = time
  
  // Ensure end time is after start time
  const startTime = schedule.value[day].hours.start
  const endTime = schedule.value[day].hours.end
  
  if (type === 'start' && startTime >= endTime) {
    // Find next available time slot
    const startIndex = timeSlots.value.indexOf(startTime)
    if (startIndex < timeSlots.value.length - 1) {
      schedule.value[day].hours.end = timeSlots.value[startIndex + 1]
    }
  } else if (type === 'end' && endTime <= startTime) {
    // Find previous available time slot
    const endIndex = timeSlots.value.indexOf(endTime)
    if (endIndex > 0) {
      schedule.value[day].hours.start = timeSlots.value[endIndex - 1]
    }
  }
  
  emitUpdate()
}

// Copy schedule from one day to all following days in the week
const copyToFollowing = (fromDay) => {
  const fromDayIndex = daysOfWeek.findIndex(day => day.id === fromDay)
  
  if (fromDayIndex === -1 || fromDayIndex === daysOfWeek.length - 1) {
    return // Invalid day or last day (nothing to copy to)
  }
  
  for (let i = fromDayIndex + 1; i < daysOfWeek.length; i++) {
    const toDay = daysOfWeek[i].id
    schedule.value[toDay] = JSON.parse(JSON.stringify(schedule.value[fromDay]))
  }
  
  emitUpdate()
}

// Copy this day to all weekdays
const copyToWeekdays = (fromDay) => {
  const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
  
  for (const day of weekdays) {
    if (day !== fromDay) {
      schedule.value[day] = JSON.parse(JSON.stringify(schedule.value[fromDay]))
    }
  }
  
  emitUpdate()
}

// Copy this day to weekend
const copyToWeekend = (fromDay) => {
  const weekend = ['saturday', 'sunday']
  
  for (const day of weekend) {
    if (day !== fromDay) {
      schedule.value[day] = JSON.parse(JSON.stringify(schedule.value[fromDay]))
    }
  }
  
  emitUpdate()
}

// Emit updated schedule to parent
const emitUpdate = () => {
  emit('update:schedule', JSON.parse(JSON.stringify(schedule.value)))
}

// Save schedule to the database
const saveSchedule = async () => {
  loading.value = true
  error.value = ''
  saveSuccess.value = false
  
  try {
    await workerStore.updateWorkerProfile({
      availability: { 
        schedule: schedule.value,
        // Preserve current status if it exists
        currentStatus: workerStore.currentWorker?.availability?.currentStatus || 'offline'
      }
    })
    
    saveSuccess.value = true
    setTimeout(() => {
      saveSuccess.value = false
    }, 3000)
  } catch (err) {
    console.error('Failed to save schedule:', err)
    error.value = 'Failed to save availability schedule'
  } finally {
    loading.value = false
  }
  
  emit('save', schedule.value)
}
</script>

<template>
  <div class="bg-gray-800 rounded-xl shadow-lg overflow-hidden">
    <div class="p-6 border-b border-gray-700">
      <h3 class="text-xl font-semibold text-white">Weekly Availability</h3>
      <p class="text-gray-400 mt-1">Set your working hours for each day of the week</p>
    </div>
    
    <!-- Schedule Controls -->
    <div class="p-6">
      <div v-if="error" class="bg-red-900 text-red-200 p-4 rounded mb-4">
        {{ error }}
      </div>
      
      <div v-if="saveSuccess" class="bg-green-900 text-green-200 p-4 rounded mb-4">
        Your availability has been updated successfully!
      </div>
      
      <div class="space-y-4">
        <div v-for="day in daysOfWeek" :key="day.id" class="card p-4">
          <div class="flex flex-col md:flex-row md:items-center md:justify-between">
            <div class="flex items-center mb-4 md:mb-0">
              <label class="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  :checked="schedule[day.id].isAvailable"
                  @change="toggleAvailability(day.id)"
                  class="sr-only peer" 
                >
                <div class="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-gray-500 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                <span class="ms-3 text-white font-medium">{{ day.label }}</span>
              </label>
            </div>
            
            <div class="flex items-center space-x-3">
              <div v-if="schedule[day.id].isAvailable" class="flex items-center space-x-2">
                <!-- Time selectors -->
                <div class="flex items-center space-x-2">
                  <select 
                    v-model="schedule[day.id].hours.start"
                    @change="updateTime(day.id, 'start', $event.target.value)"
                    class="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2"
                  >
                    <option v-for="time in timeSlots" :key="time" :value="time">{{ time }}</option>
                  </select>
                  
                  <span class="text-gray-400">to</span>
                  
                  <select 
                    v-model="schedule[day.id].hours.end"
                    @change="updateTime(day.id, 'end', $event.target.value)"
                    class="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2"
                  >
                    <option v-for="time in timeSlots" :key="time" :value="time">{{ time }}</option>
                  </select>
                </div>
                
                <!-- Copy options -->
                <div class="relative group">
                  <button class="text-indigo-400 hover:text-indigo-300 transition-colors p-1 rounded">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                  
                  <div class="absolute right-0 mt-1 hidden group-hover:block z-10 bg-gray-900 rounded shadow-lg p-2 w-48">
                    <button 
                      @click="copyToFollowing(day.id)"
                      class="text-white hover:bg-gray-700 p-2 rounded w-full text-left text-sm"
                    >
                      Copy to following days
                    </button>
                    <button 
                      @click="copyToWeekdays(day.id)"
                      class="text-white hover:bg-gray-700 p-2 rounded w-full text-left text-sm"
                    >
                      Copy to all weekdays
                    </button>
                    <button 
                      @click="copyToWeekend(day.id)"
                      class="text-white hover:bg-gray-700 p-2 rounded w-full text-left text-sm"
                    >
                      Copy to weekend
                    </button>
                  </div>
                </div>
              </div>
              
              <div v-else class="text-gray-500 italic">Unavailable</div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="mt-6 flex justify-end">
        <button 
          @click="saveSchedule"
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
          <span v-else>Save Schedule</span>
        </button>
      </div>
    </div>
  </div>
</template> 