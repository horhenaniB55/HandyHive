import { defineStore } from 'pinia'
import { db } from '../firebase/config'
import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  addDoc, 
  updateDoc,
  deleteDoc,
  query, 
  where,
  orderBy,
  limit
} from 'firebase/firestore'

export const useServiceStore = defineStore('services', {
  state: () => ({
    services: [],
    categories: [],
    currentService: null,
    loading: false,
    error: null
  }),
  
  getters: {
    getServiceById: (state) => (id) => {
      return state.services.find(service => service.id === id)
    },
    
    getServicesByCategory: (state) => (category) => {
      return state.services.filter(service => service.category === category)
    }
  },
  
  actions: {
    async fetchServices() {
      this.loading = true
      
      try {
        const servicesRef = collection(db, 'services')
        const snapshot = await getDocs(servicesRef)
        
        const services = []
        snapshot.forEach(doc => {
          services.push({
            id: doc.id,
            ...doc.data()
          })
        })
        
        this.services = services
        
        // Extract unique categories
        const categoriesSet = new Set(services.map(service => service.category))
        this.categories = Array.from(categoriesSet)
        
        return services
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    async fetchServiceById(serviceId) {
      this.loading = true
      
      try {
        const serviceRef = doc(db, 'services', serviceId)
        const serviceDoc = await getDoc(serviceRef)
        
        if (serviceDoc.exists()) {
          const serviceData = {
            id: serviceDoc.id,
            ...serviceDoc.data()
          }
          
          this.currentService = serviceData
          return serviceData
        } else {
          throw new Error('Service not found')
        }
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    async fetchServicesByCategory(category) {
      this.loading = true
      
      try {
        const q = query(
          collection(db, 'services'),
          where('category', '==', category)
        )
        
        const snapshot = await getDocs(q)
        
        const services = []
        snapshot.forEach(doc => {
          services.push({
            id: doc.id,
            ...doc.data()
          })
        })
        
        return services
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    async fetchServicesByCategories(categories) {
      this.loading = true
      
      try {
        if (!categories || !Array.isArray(categories) || categories.length === 0) {
          return []
        }
        
        // Clear current services
        this.services = []
        
        // Fetch services for each category
        for (const category of categories) {
          const categoryServices = await this.fetchServicesByCategory(category)
          // Merge services without duplicates
          categoryServices.forEach(service => {
            if (!this.services.some(s => s.id === service.id)) {
              this.services.push(service)
            }
          })
        }
        
        return this.services
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    async fetchCategories() {
      this.loading = true
      
      try {
        if (this.categories.length > 0) {
          return this.categories
        }
        
        // If services already loaded, extract categories
        if (this.services.length > 0) {
          const categoriesSet = new Set(this.services.map(service => service.category))
          this.categories = Array.from(categoriesSet)
          return this.categories
        }
        
        // Otherwise load services and extract categories
        await this.fetchServices()
        return this.categories
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    async addService(serviceData) {
      this.loading = true
      
      try {
        const servicesRef = collection(db, 'services')
        const docRef = await addDoc(servicesRef, {
          ...serviceData,
          createdAt: new Date()
        })
        
        // Add to local state
        const newService = {
          id: docRef.id,
          ...serviceData,
          createdAt: new Date()
        }
        
        this.services.push(newService)
        
        // Update categories if needed
        if (!this.categories.includes(serviceData.category)) {
          this.categories.push(serviceData.category)
        }
        
        return newService
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    async updateService(serviceId, serviceData) {
      this.loading = true
      
      try {
        const serviceRef = doc(db, 'services', serviceId)
        await updateDoc(serviceRef, serviceData)
        
        // Update in local state
        const index = this.services.findIndex(s => s.id === serviceId)
        if (index !== -1) {
          this.services[index] = {
            ...this.services[index],
            ...serviceData
          }
        }
        
        // If category changed, refresh categories
        if (serviceData.category) {
          const categoriesSet = new Set(this.services.map(service => service.category))
          this.categories = Array.from(categoriesSet)
        }
        
        return {
          id: serviceId,
          ...serviceData
        }
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    async deleteService(serviceId) {
      this.loading = true
      
      try {
        // First verify the service exists
        const serviceRef = doc(db, 'services', serviceId)
        const serviceDoc = await getDoc(serviceRef)
        
        if (!serviceDoc.exists()) {
          throw new Error('Service not found')
        }
        
        // Delete the service from Firestore
        await deleteDoc(serviceRef)
        
        // Remove from local state
        this.services = this.services.filter(service => service.id !== serviceId)
        
        // If this was the last service in its category, refresh categories
        const categoriesSet = new Set(this.services.map(service => service.category))
        this.categories = Array.from(categoriesSet)
        
        return { success: true }
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    }
  }
}) 