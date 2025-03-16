import { defineStore } from 'pinia'
import { db } from '../firebase/config'
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs,
  query, 
  where,
  orderBy,
  limit,
  updateDoc
} from 'firebase/firestore'
import { useAuthStore } from './auth'

export const useWorkerStore = defineStore('workers', {
  state: () => ({
    workers: [],
    currentWorker: null,
    workerReviews: [],
    loading: false,
    error: null
  }),
  
  getters: {
    getWorkerById: (state) => (id) => {
      return state.workers.find(worker => worker.id === id)
    },
    
    getVerifiedWorkers: (state) => {
      return state.workers.filter(worker => worker.isVerified)
    },
    
    getWorkersByService: (state) => (serviceId) => {
      return state.workers.filter(worker => 
        worker.services && worker.services.includes(serviceId)
      )
    }
  },
  
  actions: {
    // Fetch all workers
    async fetchWorkers() {
      this.loading = true
      
      try {
        const workersRef = collection(db, 'workers')
        const snapshot = await getDocs(workersRef)
        
        const workerPromises = []
        
        snapshot.forEach(workerDoc => {
          const workerId = workerDoc.id
          
          // Get the basic user data
          const userPromise = getDoc(doc(db, 'users', workerId))
            .then(userDoc => {
              if (userDoc.exists()) {
                const userData = userDoc.data()
                return {
                  id: workerId,
                  ...workerDoc.data(),
                  displayName: userData.displayName,
                  email: userData.email,
                  phoneNumber: userData.phoneNumber,
                  photoURL: userData.photoURL
                }
              }
              return {
                id: workerId,
                ...workerDoc.data()
              }
            })
          
          workerPromises.push(userPromise)
        })
        
        const workers = await Promise.all(workerPromises)
        this.workers = workers
        return workers
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // Fetch worker by ID
    async fetchWorkerById(workerId) {
      this.loading = true
      
      try {
        const workerRef = doc(db, 'workers', workerId)
        const workerDoc = await getDoc(workerRef)
        
        if (!workerDoc.exists()) {
          console.error('Worker document not found for ID:', workerId)
          this.error = 'Worker not found'
          throw new Error('Worker not found')
        }
        
        // Get the basic user data
        const userDoc = await getDoc(doc(db, 'users', workerId))
        
        let workerData
        
        if (userDoc.exists()) {
          const userData = userDoc.data()
          workerData = {
            id: workerId,
            ...workerDoc.data(),
            displayName: userData.displayName,
            email: userData.email,
            phoneNumber: userData.phoneNumber,
            photoURL: userData.photoURL
          }
        } else {
          console.warn('User document not found for worker ID:', workerId)
          workerData = {
            id: workerId,
            ...workerDoc.data()
          }
        }
        
        // Set as current worker
        this.currentWorker = workerData
        
        // Also add to workers array if not already there
        const existingIndex = this.workers.findIndex(w => w.id === workerId)
        if (existingIndex >= 0) {
          this.workers[existingIndex] = workerData
        } else {
          this.workers.push(workerData)
        }
        
        console.log('Worker data successfully loaded:', workerData)
        return workerData
      } catch (error) {
        console.error('Error in fetchWorkerById:', error)
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // Fetch workers by service
    async fetchWorkersByService(serviceId) {
      this.loading = true
      
      try {
        const q = query(
          collection(db, 'workers'),
          where('services', 'array-contains', serviceId),
          where('isVerified', '==', true),
          orderBy('rating', 'desc')
        )
        
        const snapshot = await getDocs(q)
        
        const workerPromises = []
        
        snapshot.forEach(workerDoc => {
          const workerId = workerDoc.id
          
          // Get the basic user data
          const userPromise = getDoc(doc(db, 'users', workerId))
            .then(userDoc => {
              if (userDoc.exists()) {
                const userData = userDoc.data()
                return {
                  id: workerId,
                  ...workerDoc.data(),
                  displayName: userData.displayName,
                  email: userData.email,
                  phoneNumber: userData.phoneNumber,
                  photoURL: userData.photoURL
                }
              }
              return {
                id: workerId,
                ...workerDoc.data()
              }
            })
          
          workerPromises.push(userPromise)
        })
        
        const workers = await Promise.all(workerPromises)
        return workers
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // Update worker profile
    async updateWorkerProfile(profileData) {
      this.loading = true
      const authStore = useAuthStore()
      
      if (!authStore.user || authStore.userRole !== 'worker') {
        this.error = 'Unauthorized'
        this.loading = false
        throw new Error('Unauthorized')
      }
      
      try {
        const workerId = authStore.user.uid
        const workerRef = doc(db, 'workers', workerId)
        
        // Only update allowed fields
        const allowedUpdates = {
          bio: profileData.bio,
          experience: profileData.experience,
          availability: profileData.availability,
          serviceAreas: profileData.serviceAreas
        }
        
        // Filter out undefined values
        const updates = Object.entries(allowedUpdates)
          .filter(([_, value]) => value !== undefined)
          .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {})
        
        await updateDoc(workerRef, updates)
        
        // Also update user profile if needed
        if (profileData.displayName || profileData.phoneNumber) {
          const userRef = doc(db, 'users', workerId)
          const userUpdates = {}
          
          if (profileData.displayName) {
            userUpdates.displayName = profileData.displayName
          }
          
          if (profileData.phoneNumber) {
            userUpdates.phoneNumber = profileData.phoneNumber
          }
          
          await updateDoc(userRef, userUpdates)
        }
        
        // Update in local state if this worker is loaded
        if (this.currentWorker && this.currentWorker.id === workerId) {
          this.currentWorker = {
            ...this.currentWorker,
            ...updates
          }
          
          if (profileData.displayName) {
            this.currentWorker.displayName = profileData.displayName
          }
          
          if (profileData.phoneNumber) {
            this.currentWorker.phoneNumber = profileData.phoneNumber
          }
        }
        
        const index = this.workers.findIndex(w => w.id === workerId)
        if (index !== -1) {
          this.workers[index] = {
            ...this.workers[index],
            ...updates
          }
          
          if (profileData.displayName) {
            this.workers[index].displayName = profileData.displayName
          }
          
          if (profileData.phoneNumber) {
            this.workers[index].phoneNumber = profileData.phoneNumber
          }
        }
        
        return {
          id: workerId,
          ...updates
        }
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // Update worker services
    async updateWorkerServices(services) {
      this.loading = true
      const authStore = useAuthStore()
      
      if (!authStore.user || authStore.userRole !== 'worker') {
        this.error = 'Unauthorized'
        this.loading = false
        throw new Error('Unauthorized')
      }
      
      try {
        const workerId = authStore.user.uid
        const workerRef = doc(db, 'workers', workerId)
        
        await updateDoc(workerRef, {
          services
        })
        
        // Update in local state if this worker is loaded
        if (this.currentWorker && this.currentWorker.id === workerId) {
          this.currentWorker.services = services
        }
        
        const index = this.workers.findIndex(w => w.id === workerId)
        if (index !== -1) {
          this.workers[index].services = services
        }
        
        return {
          id: workerId,
          services
        }
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // Update worker availability
    async updateAvailability(availability) {
      this.loading = true
      const authStore = useAuthStore()
      
      if (!authStore.user || authStore.userRole !== 'worker') {
        this.error = 'Unauthorized'
        this.loading = false
        throw new Error('Unauthorized')
      }
      
      try {
        const workerId = authStore.user.uid
        const workerRef = doc(db, 'workers', workerId)
        
        await updateDoc(workerRef, {
          availability
        })
        
        // Update in local state if this worker is loaded
        if (this.currentWorker && this.currentWorker.id === workerId) {
          this.currentWorker.availability = availability
        }
        
        const index = this.workers.findIndex(w => w.id === workerId)
        if (index !== -1) {
          this.workers[index].availability = availability
        }
        
        return {
          id: workerId,
          availability
        }
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // Update worker's current status
    async updateCurrentStatus(status) {
      this.loading = true
      const authStore = useAuthStore()
      
      if (!authStore.user || authStore.userRole !== 'worker') {
        this.error = 'Unauthorized'
        this.loading = false
        throw new Error('Unauthorized')
      }
      
      try {
        const workerId = authStore.user.uid
        const workerRef = doc(db, 'workers', workerId)
        
        // First get current availability to only update the status
        const workerDoc = await getDoc(workerRef)
        
        if (!workerDoc.exists()) {
          throw new Error('Worker profile not found')
        }
        
        const workerData = workerDoc.data()
        const currentAvailability = workerData.availability || {}
        
        const updatedAvailability = {
          ...currentAvailability,
          currentStatus: status
        }
        
        await updateDoc(workerRef, {
          availability: updatedAvailability
        })
        
        // Update in local state if this worker is loaded
        if (this.currentWorker && this.currentWorker.id === workerId) {
          this.currentWorker.availability = updatedAvailability
        }
        
        const index = this.workers.findIndex(w => w.id === workerId)
        if (index !== -1) {
          this.workers[index].availability = updatedAvailability
        }
        
        return {
          id: workerId,
          availability: updatedAvailability
        }
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // Fetch reviews for a worker
    async fetchWorkerReviews(workerId) {
      this.loading = true
      
      try {
        // Using a simpler query that doesn't require a composite index
        const q = query(
          collection(db, 'reviews'),
          where('workerId', '==', workerId)
          // Removed orderBy to avoid the need for a composite index
        )
        
        const snapshot = await getDocs(q)
        
        const reviews = []
        snapshot.forEach(doc => {
          reviews.push({
            id: doc.id,
            ...doc.data()
          })
        })
        
        // Sort the reviews client-side instead
        reviews.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt.seconds * 1000) : new Date(a.date || 0);
          const dateB = b.createdAt ? new Date(b.createdAt.seconds * 1000) : new Date(b.date || 0);
          return dateB - dateA; // Descending (newest first)
        });
        
        this.workerReviews = reviews
        return reviews
      } catch (error) {
        console.error('Error fetching worker reviews:', error)
        this.error = error.message
        
        // Return empty array on error, so the UI can still work
        this.workerReviews = []
        return []
      } finally {
        this.loading = false
      }
    }
  }
}) 