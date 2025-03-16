<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useServiceStore } from '../../stores/services'
import { useWorkerStore } from '../../stores/workers'
import MainLayout from '../../components/layout/MainLayout.vue'
import AvailabilitySchedule from '../../components/worker/AvailabilitySchedule.vue'
import ServiceAreas from '../../components/worker/ServiceAreas.vue'
import Certificates from '../../components/worker/Certificates.vue'
import { auth } from '../../firebase/config'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../../firebase/config'

const router = useRouter()
const authStore = useAuthStore()
const serviceStore = useServiceStore()
const workerStore = useWorkerStore()

const user = ref(null)
const workerProfile = ref(null)
const loading = ref(true)
const error = ref('')
const success = ref('')
const categories = ref([])
const activeTab = ref('profile')

// Form fields
const profileForm = reactive({
  displayName: '',
  email: '',
  phone: '',
  bio: '',
  location: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  yearsOfExperience: 0,
  hourlyRate: 0,
  workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  workHours: {
    start: '09:00',
    end: '17:00'
  },
  serviceCategories: []
})

// Profile photo
const profilePhoto = ref(null)
const photoFile = ref(null)
const photoLoading = ref(false)
const photoError = ref('')
const photoPreview = ref(null)

// Initial data for new components
const availabilitySchedule = ref(null)
const serviceAreas = ref([])
const certificates = ref([])

// Password change form
const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// Loading states
const profileLoading = ref(false)
const passwordLoading = ref(false)
const deleteLoading = ref(false)
const showDeleteConfirm = ref(false)

// List of days for selection
const daysOfWeek = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
]

// Tabs for profile sections
const tabs = [
  { id: 'profile', label: 'Basic Info' },
  { id: 'availability', label: 'Availability' },
  { id: 'areas', label: 'Service Areas' },
  { id: 'certificates', label: 'Certificates' },
  { id: 'security', label: 'Security' }
]

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
    
    // Only try to fetch worker data if we have a user ID
    if (user.value?.uid) {
      // Fetch worker profile data
      const workerData = await workerStore.fetchWorkerById(user.value.uid);
      if (workerData) {
        workerProfile.value = workerData;
        
        // Set profile photo if available
        profilePhoto.value = workerData.photoURL || user.value.photoURL
        
        // Fetch service categories
        await serviceStore.fetchCategories()
        categories.value = serviceStore.categories
        
        // Populate form fields with current values
        profileForm.displayName = user.value.displayName || ''
        profileForm.email = user.value.email || ''
        profileForm.phone = user.value.phoneNumber || ''
        profileForm.bio = workerProfile.value?.bio || ''
        profileForm.location = workerProfile.value?.location || ''
        profileForm.address = workerProfile.value?.address || ''
        profileForm.city = workerProfile.value?.city || ''
        profileForm.state = workerProfile.value?.state || ''
        profileForm.zip = workerProfile.value?.zip || ''
        profileForm.yearsOfExperience = workerProfile.value?.experience || 0
        profileForm.hourlyRate = workerProfile.value?.hourlyRate || 0
        profileForm.serviceCategories = workerProfile.value?.services || []
        
        // Set availability schedule if available
        if (workerProfile.value?.availability?.schedule) {
          availabilitySchedule.value = workerProfile.value.availability.schedule
        }
        
        // Set service areas if available
        if (workerProfile.value?.serviceAreas && workerProfile.value.serviceAreas.length > 0) {
          serviceAreas.value = workerProfile.value.serviceAreas
        }
        
        // Set certificates if available
        if (workerProfile.value?.certificates && workerProfile.value.certificates.length > 0) {
          certificates.value = workerProfile.value.certificates
        }
      }
    }
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
    if (!profileForm.displayName.trim()) {
      error.value = 'Display name is required'
      return
    }
    
    if (profileForm.serviceCategories.length === 0) {
      error.value = 'Please select at least one service category'
      return
    }
    
    // Format location from address components if provided
    let formattedLocation = profileForm.location
    if (profileForm.address && profileForm.city) {
      formattedLocation = `${profileForm.address}, ${profileForm.city}${profileForm.state ? ', ' + profileForm.state : ''}${profileForm.zip ? ' ' + profileForm.zip : ''}`
    }
    
    // Update profile in the store
    await workerStore.updateWorkerProfile({
      displayName: profileForm.displayName,
      phoneNumber: profileForm.phone,
      bio: profileForm.bio,
      location: formattedLocation,
      address: profileForm.address,
      city: profileForm.city,
      state: profileForm.state,
      zip: profileForm.zip,
      experience: profileForm.yearsOfExperience,
      hourlyRate: profileForm.hourlyRate,
      services: profileForm.serviceCategories
    })
    
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
    if (!passwordForm.oldPassword) {
      error.value = 'Current password is required'
      return
    }
    
    if (!passwordForm.newPassword || passwordForm.newPassword.length < 8) {
      error.value = 'New password must be at least 8 characters'
      return
    }
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      error.value = 'New passwords do not match'
      return
    }
    
    // Update password in the store
    await authStore.changePassword(passwordForm.oldPassword, passwordForm.newPassword)
    
    // Clear password fields
    passwordForm.oldPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
    
    success.value = 'Password changed successfully'
  } catch (err) {
    console.error('Error changing password:', err)
    error.value = 'Failed to change password: ' + (err.message || 'Invalid current password')
  } finally {
    passwordLoading.value = false
  }
}

const toggleDay = (day) => {
  const index = profileForm.workingDays.indexOf(day)
  if (index === -1) {
    profileForm.workingDays.push(day)
  } else {
    profileForm.workingDays.splice(index, 1)
  }
}

const isDaySelected = (day) => {
  return profileForm.workingDays.includes(day)
}

const toggleCategory = (category) => {
  const index = profileForm.serviceCategories.indexOf(category)
  if (index === -1) {
    profileForm.serviceCategories.push(category)
  } else {
    profileForm.serviceCategories.splice(index, 1)
  }
}

const isCategorySelected = (category) => {
  return profileForm.serviceCategories.includes(category)
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

const getCategoryColor = (category) => {
  const colors = {
    'Cleaning': 'bg-blue-500 text-blue-100',
    'Plumbing': 'bg-green-500 text-green-100',
    'Electrical': 'bg-yellow-500 text-yellow-100',
    'Carpentry': 'bg-red-500 text-red-100',
    'Gardening': 'bg-emerald-500 text-emerald-100',
    'Painting': 'bg-purple-500 text-purple-100',
    'Moving': 'bg-orange-500 text-orange-100',
    'Appliance Repair': 'bg-indigo-500 text-indigo-100'
  }
  
  return colors[category] || 'bg-gray-500 text-gray-100'
}

// Function to switch active tab
const setActiveTab = (tab) => {
  activeTab.value = tab
}

// Handle profile photo upload
const handlePhotoChange = (event) => {
  const file = event.target.files[0]
  if (!file) return
  
  // Check file size - limit to 5MB
  if (file.size > 5 * 1024 * 1024) {
    photoError.value = 'Photo must be less than 5MB'
    return
  }
  
  // Check file type
  if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
    photoError.value = 'Photo must be JPEG, PNG, or GIF'
    return
  }
  
  photoFile.value = file
  photoError.value = ''
  
  // Create a preview
  const reader = new FileReader()
  reader.onload = (e) => {
    photoPreview.value = e.target.result
  }
  reader.readAsDataURL(file)
}

const uploadProfilePhoto = async () => {
  if (!photoFile.value) return
  
  try {
    photoLoading.value = true
    photoError.value = ''
    
    const userId = authStore.user.uid
    const fileRef = storageRef(storage, `profilePhotos/${userId}`)
    
    // Upload the file
    await uploadBytes(fileRef, photoFile.value)
    
    // Get the download URL
    const photoURL = await getDownloadURL(fileRef)
    
    // Update the user profile with the new photo URL
    await workerStore.updateWorkerProfile({
      photoURL: photoURL
    })
    
    // Update local state
    profilePhoto.value = photoURL
    
    success.value = 'Profile photo updated successfully'
  } catch (err) {
    console.error('Error uploading profile photo:', err)
    photoError.value = 'Failed to upload photo: ' + (err.message || 'Unknown error')
  } finally {
    photoLoading.value = false
  }
}
</script>

<template>
  <MainLayout>
    <div class="container mx-auto px-4 py-8">
      <h1 class="text-3xl font-bold text-white mb-8">My Worker Profile</h1>
      
      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
      
      <!-- Error and Success Messages -->
      <div v-if="error && !success" class="bg-red-900 text-red-200 p-4 rounded mb-4">
        {{ error }}
      </div>
      
      <div v-if="success" class="bg-green-900 text-green-200 p-4 rounded mb-4">
        {{ success }}
      </div>
      
      <!-- Profile Content -->
      <div v-if="!loading">
        <!-- Tab Navigation -->
        <div class="flex flex-wrap border-b border-gray-700 mb-8">
          <button 
            v-for="tab in tabs" 
            :key="tab.id"
            @click="setActiveTab(tab.id)"
            :class="[
              'py-3 px-5 font-medium text-sm rounded-t-lg focus:outline-none transition-colors',
              activeTab === tab.id 
                ? 'bg-gray-800 text-white border-b-2 border-indigo-500' 
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            ]"
          >
            {{ tab.label }}
          </button>
        </div>
        
        <!-- Basic Profile Information -->
        <div v-if="activeTab === 'profile'" class="space-y-8">
          <!-- Profile Photo Section -->
          <div class="card p-6">
            <h2 class="text-xl font-semibold text-white mb-4">Profile Photo</h2>
            
            <div class="flex flex-col md:flex-row items-center gap-6">
              <!-- Current Photo / Preview -->
              <div class="flex-shrink-0">
                <div 
                  v-if="photoPreview || profilePhoto" 
                  class="h-32 w-32 rounded-full overflow-hidden bg-gray-600"
                >
                  <img 
                    :src="photoPreview || profilePhoto" 
                    alt="Profile" 
                    class="h-full w-full object-cover"
                  >
                </div>
                <div 
                  v-else 
                  class="h-32 w-32 rounded-full bg-indigo-600 flex items-center justify-center text-4xl font-bold text-white"
                >
                  {{ profileForm.displayName ? profileForm.displayName.charAt(0).toUpperCase() : '?' }}
                </div>
              </div>
              
              <!-- Upload Controls -->
              <div class="flex-1">
                <label class="block mb-2 text-sm font-medium text-gray-300">Upload a photo</label>
                <div class="flex flex-col space-y-3">
                  <input 
                    type="file" 
                    @change="handlePhotoChange" 
                    accept="image/jpeg, image/png, image/gif"
                    class="hidden" 
                    id="photo-upload"
                  >
                  <label 
                    for="photo-upload" 
                    class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded transition-colors inline-block cursor-pointer text-center w-full md:w-auto"
                  >
                    Choose Photo
                  </label>
                  
                  <button 
                    @click="uploadProfilePhoto" 
                    :disabled="!photoFile || photoLoading"
                    class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded transition-colors disabled:opacity-50 w-full md:w-auto"
                  >
                    <span v-if="photoLoading">
                      <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Uploading...
                    </span>
                    <span v-else>Upload Photo</span>
                  </button>
                </div>
                
                <p v-if="photoFile && !photoError" class="mt-2 text-sm text-green-400">
                  Ready to upload: {{ photoFile.name }}
                </p>
                
                <p v-if="photoError" class="mt-2 text-sm text-red-400">
                  {{ photoError }}
                </p>
                
                <p class="mt-2 text-xs text-gray-400">
                  Recommended: Square image, at least 300x300 pixels. Maximum size: 5MB.
                </p>
              </div>
            </div>
          </div>
          
          <!-- Personal Information -->
          <div class="card p-6 mb-8">
            <h2 class="text-xl font-semibold text-white mb-4">Personal Information</h2>
            
            <div class="space-y-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block mb-2 text-sm font-medium text-gray-300">Display Name</label>
                  <input 
                    type="text" 
                    v-model="profileForm.displayName"
                    class="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
                    placeholder="Your full name"
                  >
                </div>
                
                <div>
                  <label class="block mb-2 text-sm font-medium text-gray-300">Email Address</label>
                  <input 
                    type="email" 
                    v-model="profileForm.email"
                    class="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
                    placeholder="your.email@example.com"
                    disabled
                  >
                  <p class="mt-1 text-xs text-gray-400">Email cannot be changed</p>
                </div>
              </div>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block mb-2 text-sm font-medium text-gray-300">Phone Number</label>
                  <input 
                    type="tel" 
                    v-model="profileForm.phone"
                    class="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
                    placeholder="Your phone number"
                  >
                </div>
                
                <div>
                  <label class="block mb-2 text-sm font-medium text-gray-300">Years of Experience</label>
                  <input 
                    type="number" 
                    min="0"
                    max="50"
                    v-model="profileForm.yearsOfExperience"
                    class="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
                  >
                </div>
              </div>
              
              <!-- Address Information -->
              <div>
                <label class="block mb-2 text-sm font-medium text-gray-300">Street Address</label>
                <input 
                  type="text" 
                  v-model="profileForm.address"
                  class="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
                  placeholder="123 Main St"
                >
              </div>
              
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="col-span-2">
                  <label class="block mb-2 text-sm font-medium text-gray-300">City</label>
                  <input 
                    type="text" 
                    v-model="profileForm.city"
                    class="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
                    placeholder="City"
                  >
                </div>
                
                <div>
                  <label class="block mb-2 text-sm font-medium text-gray-300">State</label>
                  <input 
                    type="text" 
                    v-model="profileForm.state"
                    class="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
                    placeholder="State"
                  >
                </div>
                
                <div>
                  <label class="block mb-2 text-sm font-medium text-gray-300">ZIP Code</label>
                  <input 
                    type="text" 
                    v-model="profileForm.zip"
                    class="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
                    placeholder="ZIP"
                  >
                </div>
              </div>
              
              <div>
                <label class="block mb-2 text-sm font-medium text-gray-300">Hourly Rate ($)</label>
                <input 
                  type="number" 
                  min="0"
                  step="0.01"
                  v-model="profileForm.hourlyRate"
                  class="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
                  placeholder="Your hourly rate"
                >
                <p class="mt-1 text-xs text-gray-400">This is your base hourly rate. You can set different rates for specific services.</p>
              </div>
              
              <div>
                <label class="block mb-2 text-sm font-medium text-gray-300">Bio</label>
                <textarea 
                  v-model="profileForm.bio"
                  rows="4"
                  class="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
                  placeholder="Tell customers about yourself and your experience..."
                ></textarea>
              </div>
            </div>
          </div>
          
          <!-- Service Categories -->
          <div class="card p-6 mb-8">
            <h2 class="text-xl font-semibold text-white mb-4">Service Categories</h2>
            
            <p class="text-gray-300 mb-4">Select the categories of services you offer:</p>
            
            <div class="flex flex-wrap gap-2">
              <button 
                v-for="category in categories" 
                :key="category"
                @click="toggleCategory(category)"
                :class="[
                  'px-3 py-1 rounded-full text-sm font-medium transition-colors',
                  isCategorySelected(category) 
                    ? getCategoryColor(category)
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                ]"
              >
                {{ category }}
              </button>
            </div>
            
            <div class="mt-4 text-sm text-gray-400">
              <p>After selecting categories, go to the Services page to create specific service offerings.</p>
              <button 
                @click="router.push('/worker/services')"
                class="mt-2 text-indigo-400 hover:underline font-medium"
              >
                Manage Services →
              </button>
            </div>
          </div>
          
          <!-- Save Button -->
          <div class="card p-6">
            <button 
              @click="updateProfile"
              class="w-full md:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center"
              :disabled="profileLoading"
            >
              <span v-if="profileLoading">
                <svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving Profile...
              </span>
              <span v-else>Save Profile</span>
            </button>
          </div>
        </div>
        
        <!-- Availability Schedule Tab -->
        <div v-if="activeTab === 'availability'">
          <div class="card p-6 mb-8">
            <h2 class="text-xl font-semibold text-white mb-4">Work Availability</h2>
            <p class="text-gray-300 mb-4">Set your weekly working schedule. Customers will be able to book your services during these times.</p>
            
            <AvailabilitySchedule 
              :initial-schedule="availabilitySchedule"
              @update:schedule="schedule => availabilitySchedule = schedule"
            />
            
            <div class="mt-6">
              <button 
                @click="updateProfile"
                class="w-full md:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center"
                :disabled="profileLoading"
              >
                <span v-if="profileLoading">
                  <svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving Schedule...
                </span>
                <span v-else>Save Schedule</span>
              </button>
            </div>
          </div>
        </div>
        
        <!-- Service Areas Tab -->
        <div v-if="activeTab === 'areas'">
          <div class="card p-6 mb-8">
            <h2 class="text-xl font-semibold text-white mb-4">Service Areas</h2>
            <p class="text-gray-300 mb-4">Define the geographic areas where you offer your services. Be specific to help customers find you more easily.</p>
            
            <ServiceAreas 
              :initial-areas="serviceAreas"
              @update:areas="areas => serviceAreas = areas"
            />
            
            <div class="mt-6">
              <button 
                @click="updateProfile"
                class="w-full md:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center"
                :disabled="profileLoading"
              >
                <span v-if="profileLoading">
                  <svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving Areas...
                </span>
                <span v-else>Save Service Areas</span>
              </button>
            </div>
          </div>
        </div>
        
        <!-- Certificates Tab -->
        <div v-if="activeTab === 'certificates'">
          <div class="card p-6 mb-8">
            <h2 class="text-xl font-semibold text-white mb-4">Certificates & Qualifications</h2>
            <p class="text-gray-300 mb-4">Add your professional certificates and qualifications to build trust with potential customers.</p>
            
            <Certificates 
              :initial-certificates="certificates"
              @update:certificates="certs => certificates = certs"
            />
            
            <div class="mt-6">
              <button 
                @click="updateProfile"
                class="w-full md:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center"
                :disabled="profileLoading"
              >
                <span v-if="profileLoading">
                  <svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving Certificates...
                </span>
                <span v-else>Save Certificates</span>
              </button>
            </div>
          </div>
        </div>
        
        <!-- Security Settings Tab -->
        <div v-if="activeTab === 'security'" class="card p-6 mb-8">
          <h2 class="text-xl font-semibold text-white mb-4">Security Settings</h2>
          
          <!-- Password Change Form -->
          <div class="mb-8">
            <h3 class="text-lg font-medium text-white mb-4">Change Password</h3>
            <p class="text-gray-300 mb-4">Update your password to keep your account secure. We recommend using a strong, unique password.</p>
            
            <form class="space-y-4" @submit.prevent="changePassword">
              <div>
                <label for="currentPassword" class="block mb-2 text-sm font-medium text-gray-300">Current Password</label>
                <input 
                  type="password" 
                  id="currentPassword"
                  v-model="passwordForm.oldPassword"
                  class="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
                  placeholder="••••••••"
                  required
                >
              </div>
              
              <div>
                <label for="newPassword" class="block mb-2 text-sm font-medium text-gray-300">New Password</label>
                <input 
                  type="password" 
                  id="newPassword"
                  v-model="passwordForm.newPassword"
                  class="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
                  placeholder="••••••••"
                  required
                >
                <p class="mt-1 text-xs text-gray-400">Must be at least 8 characters with a mix of letters, numbers & symbols</p>
              </div>
              
              <div>
                <label for="confirmPassword" class="block mb-2 text-sm font-medium text-gray-300">Confirm New Password</label>
                <input 
                  type="password" 
                  id="confirmPassword"
                  v-model="passwordForm.confirmPassword"
                  class="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
                  placeholder="••••••••"
                  required
                >
                <p 
                  v-if="passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword" 
                  class="mt-1 text-sm text-red-400"
                >
                  Passwords do not match
                </p>
              </div>
              
              <div class="pt-2">
                <button 
                  type="submit" 
                  class="w-full md:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center"
                  :disabled="passwordLoading"
                >
                  <span v-if="passwordLoading">
                    <svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating Password...
                  </span>
                  <span v-else>Update Password</span>
                </button>
              </div>
            </form>
          </div>
          
          <!-- Account Deletion -->
          <div>
            <h3 class="text-lg font-medium text-white mb-4">Delete Account</h3>
            <p class="text-gray-300 mb-4">Permanently delete your account and all associated data. This action cannot be undone.</p>
            
            <button 
              v-if="!showDeleteConfirm"
              @click="confirmDeleteAccount"
              class="px-6 py-3 bg-red-700 hover:bg-red-800 text-white font-medium rounded-lg transition-colors"
            >
              Delete Account
            </button>
            
            <div v-else class="bg-gray-700 p-6 rounded-lg mt-4">
              <p class="text-white mb-4">Are you sure you want to delete your account? This action cannot be undone.</p>
              
              <div class="flex flex-col sm:flex-row gap-3">
                <button 
                  @click="deleteAccount"
                  class="px-6 py-3 bg-red-700 hover:bg-red-800 text-white font-medium rounded-lg transition-colors flex items-center justify-center"
                  :disabled="deleteLoading"
                >
                  <span v-if="deleteLoading">
                    <svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </span>
                  <span v-else>Yes, Delete My Account</span>
                </button>
                
                <button 
                  @click="cancelDeleteAccount"
                  class="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </MainLayout>
</template> 