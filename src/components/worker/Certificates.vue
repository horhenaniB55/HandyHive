<script setup>
import { ref, watch, onMounted } from 'vue'
import { useWorkerStore } from '../../stores/workers'
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { useAuthStore } from '../../stores/auth'

const props = defineProps({
  initialCertificates: {
    type: Array,
    default: () => ([])
  }
})

const emit = defineEmits(['update:certificates', 'save'])

const workerStore = useWorkerStore()
const authStore = useAuthStore()
const storage = getStorage()

const certificates = ref([...props.initialCertificates])
const loading = ref(false)
const uploadLoading = ref(false)
const error = ref('')
const saveSuccess = ref(false)

// New certificate form data
const newCertificate = ref({
  name: '',
  file: null,
  fileURL: ''
})

// Watch for changes from parent
watch(() => props.initialCertificates, (newValue) => {
  certificates.value = [...newValue]
}, { deep: true })

// Handle file upload
const handleFileUpload = (event) => {
  const file = event.target.files[0]
  if (!file) return
  
  // Store the file for upload later
  newCertificate.value.file = file
  
  // Create an object URL for preview
  const objectUrl = URL.createObjectURL(file)
  newCertificate.value.fileURL = objectUrl
}

// Upload certificate to Firebase Storage
const uploadCertificate = async () => {
  if (!newCertificate.value.name || !newCertificate.value.file) {
    error.value = 'Please provide a name and file'
    return
  }
  
  uploadLoading.value = true
  error.value = ''
  
  try {
    const userId = authStore.user.uid
    const fileName = `certificates/${userId}/${Date.now()}_${newCertificate.value.file.name}`
    const certificateRef = storageRef(storage, fileName)
    
    // Upload file
    await uploadBytes(certificateRef, newCertificate.value.file)
    
    // Get download URL
    const downloadURL = await getDownloadURL(certificateRef)
    
    // Add to certificates array
    certificates.value.push({
      name: newCertificate.value.name,
      fileURL: downloadURL,
      isVerified: false,
      verifiedAt: null,
      uploadedAt: new Date()
    })
    
    // Reset form
    newCertificate.value = {
      name: '',
      file: null,
      fileURL: ''
    }
    
    // Emit update
    emitUpdate()
  } catch (err) {
    console.error('Error uploading certificate:', err)
    error.value = 'Failed to upload certificate'
  } finally {
    uploadLoading.value = false
  }
}

// Remove certificate
const removeCertificate = (index) => {
  certificates.value.splice(index, 1)
  emitUpdate()
}

// Emit updated certificates to parent
const emitUpdate = () => {
  emit('update:certificates', [...certificates.value])
}

// Save certificates to the database
const saveCertificates = async () => {
  loading.value = true
  error.value = ''
  saveSuccess.value = false
  
  try {
    await workerStore.updateWorkerProfile({
      certificates: certificates.value
    })
    
    saveSuccess.value = true
    setTimeout(() => {
      saveSuccess.value = false
    }, 3000)
  } catch (err) {
    console.error('Failed to save certificates:', err)
    error.value = 'Failed to save certificates'
  } finally {
    loading.value = false
  }
  
  emit('save', [...certificates.value])
}
</script>

<template>
  <div class="bg-gray-800 rounded-xl shadow-lg overflow-hidden">
    <div class="p-6 border-b border-gray-700">
      <h3 class="text-xl font-semibold text-white">Professional Certificates</h3>
      <p class="text-gray-400 mt-1">Upload your qualifications and certifications</p>
    </div>
    
    <div class="p-6">
      <div v-if="error" class="bg-red-900 text-red-200 p-4 rounded mb-4">
        {{ error }}
      </div>
      
      <div v-if="saveSuccess" class="bg-green-900 text-green-200 p-4 rounded mb-4">
        Your certificates have been updated successfully!
      </div>
      
      <!-- Upload New Certificate -->
      <div class="card p-4 mb-6">
        <h4 class="text-white font-medium mb-4">Upload New Certificate</h4>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block mb-2 text-sm font-medium text-gray-300">Certificate Name</label>
            <input 
              type="text" 
              v-model="newCertificate.name"
              class="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
              placeholder="e.g. Plumbing License, Electrician Certification"
            >
          </div>
          
          <div>
            <label class="block mb-2 text-sm font-medium text-gray-300">Certificate File</label>
            <input 
              type="file" 
              @change="handleFileUpload"
              accept=".pdf,.jpg,.jpeg,.png"
              class="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
            >
            <p class="mt-1 text-xs text-gray-400">Accepted formats: PDF, JPG, PNG</p>
          </div>
        </div>
        
        <!-- File Preview -->
        <div v-if="newCertificate.fileURL" class="mt-4 p-4 bg-gray-700 rounded-lg">
          <div class="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-indigo-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span class="text-white">{{ newCertificate.file?.name }}</span>
          </div>
        </div>
        
        <div class="mt-4">
          <button 
            @click="uploadCertificate"
            class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded transition-colors"
            :disabled="uploadLoading || !newCertificate.name || !newCertificate.file"
          >
            <span v-if="uploadLoading">
              <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Uploading...
            </span>
            <span v-else>Upload Certificate</span>
          </button>
        </div>
      </div>
      
      <!-- Certificates List -->
      <h4 class="text-white font-medium mb-4">Your Certificates</h4>
      
      <div v-if="certificates.length === 0" class="text-center p-6 bg-gray-700 rounded-lg">
        <p class="text-gray-400">You haven't uploaded any certificates yet.</p>
      </div>
      
      <div v-else class="space-y-4">
        <div v-for="(cert, index) in certificates" :key="index" class="card p-4">
          <div class="flex justify-between items-center">
            <div class="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-indigo-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <div>
                <h5 class="text-white font-medium">{{ cert.name }}</h5>
                <div class="flex mt-1">
                  <span 
                    :class="[
                      'text-xs px-2 py-1 rounded-full', 
                      cert.isVerified ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'
                    ]"
                  >
                    {{ cert.isVerified ? 'Verified' : 'Pending Verification' }}
                  </span>
                </div>
              </div>
            </div>
            
            <div class="flex items-center space-x-2">
              <a 
                :href="cert.fileURL" 
                target="_blank"
                class="text-indigo-400 hover:text-indigo-300 transition-colors p-1 rounded"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </a>
              
              <button 
                @click="removeCertificate(index)"
                class="text-red-400 hover:text-red-300 transition-colors p-1 rounded"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Save Button -->
      <div class="mt-6 flex justify-end">
        <button 
          @click="saveCertificates"
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
          <span v-else>Save Certificates</span>
        </button>
      </div>
    </div>
  </div>
</template> 