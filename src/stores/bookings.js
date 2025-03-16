import { defineStore } from 'pinia'
import { db } from '../firebase/config'
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs,
  addDoc, 
  updateDoc, 
  query, 
  where,
  orderBy,
  arrayUnion
} from 'firebase/firestore'
import { useAuthStore } from './auth'

export const useBookingStore = defineStore('bookings', {
  state: () => ({
    bookings: [],
    currentBooking: null,
    loading: false,
    error: null
  }),
  
  getters: {
    customerBookings: (state) => {
      const authStore = useAuthStore()
      return state.bookings.filter(booking => booking.customerId === authStore.user?.uid)
    },
    
    workerBookings: (state) => {
      const authStore = useAuthStore()
      return state.bookings.filter(booking => booking.workerId === authStore.user?.uid)
    },
    
    getBookingsByStatus: (state) => (status) => {
      return state.bookings.filter(booking => booking.status === status)
    }
  },
  
  actions: {
    async fetchCustomerBookings() {
      this.loading = true
      const authStore = useAuthStore()
      
      if (!authStore.user) {
        this.error = 'User not authenticated'
        this.loading = false
        return []
      }
      
      try {
        const q = query(
          collection(db, 'bookings'),
          where('customerId', '==', authStore.user.uid)
        )
        
        const snapshot = await getDocs(q)
        
        const bookings = []
        snapshot.forEach(doc => {
          bookings.push({
            id: doc.id,
            ...doc.data()
          })
        })
        
        this.bookings = bookings.sort((a, b) => {
          const dateA = a.scheduledTime?.toDate?.() || new Date(a.scheduledTime);
          const dateB = b.scheduledTime?.toDate?.() || new Date(b.scheduledTime);
          return dateB - dateA;
        });
        
        return this.bookings;
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    async fetchWorkerBookings() {
      this.loading = true
      const authStore = useAuthStore()
      
      if (!authStore.user) {
        this.error = 'User not authenticated'
        this.loading = false
        return []
      }
      
      try {
        const q = query(
          collection(db, 'bookings'),
          where('workerId', '==', authStore.user.uid)
        )
        
        const snapshot = await getDocs(q)
        
        const bookings = []
        snapshot.forEach(doc => {
          bookings.push({
            id: doc.id,
            ...doc.data()
          })
        })
        
        this.bookings = bookings.sort((a, b) => {
          const dateA = a.scheduledTime?.toDate?.() || new Date(a.scheduledTime);
          const dateB = b.scheduledTime?.toDate?.() || new Date(b.scheduledTime);
          return dateB - dateA;
        });
        
        return this.bookings;
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    async fetchBookingById(bookingId) {
      this.loading = true
      
      try {
        const bookingRef = doc(db, 'bookings', bookingId)
        const bookingDoc = await getDoc(bookingRef)
        
        if (bookingDoc.exists()) {
          const bookingData = {
            id: bookingDoc.id,
            ...bookingDoc.data()
          }
          
          this.currentBooking = bookingData
          return bookingData
        } else {
          throw new Error('Booking not found')
        }
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    async createBooking(bookingData) {
      this.loading = true
      const authStore = useAuthStore()
      
      if (!authStore.user) {
        this.error = 'User not authenticated'
        this.loading = false
        throw new Error('User not authenticated')
      }
      
      try {
        // Add the booking document
        const bookingsRef = collection(db, 'bookings')
        const newBooking = {
          ...bookingData,
          customerId: authStore.user.uid,
          status: 'requested',
          paymentStatus: 'pending',
          paymentMethod: 'cash',
          createdAt: new Date(),
          updatedAt: new Date()
        }
        
        const docRef = await addDoc(bookingsRef, newBooking)
        
        // Update customer's booking history
        const customerRef = doc(db, 'customers', authStore.user.uid)
        await updateDoc(customerRef, {
          bookingHistory: arrayUnion(docRef.id)
        })
        
        // Add to local state
        const bookingWithId = {
          id: docRef.id,
          ...newBooking
        }
        
        this.bookings.push(bookingWithId)
        this.currentBooking = bookingWithId
        
        return bookingWithId
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    async updateBookingStatus(bookingId, status, notes = '') {
      this.loading = true
      
      try {
        const bookingRef = doc(db, 'bookings', bookingId)
        
        // Get current booking to ensure we're authorized to update
        const bookingDoc = await getDoc(bookingRef)
        
        if (!bookingDoc.exists()) {
          throw new Error('Booking not found')
        }
        
        const updates = {
          status,
          updatedAt: new Date()
        }
        
        // Add notes based on user role
        const authStore = useAuthStore()
        if (authStore.isWorker && notes) {
          updates.workerNotes = notes
        } else if (authStore.isCustomer && notes) {
          updates.customerNotes = notes
        }
        
        await updateDoc(bookingRef, updates)
        
        // Update in local state
        const index = this.bookings.findIndex(b => b.id === bookingId)
        if (index !== -1) {
          this.bookings[index] = {
            ...this.bookings[index],
            ...updates
          }
          
          if (this.currentBooking && this.currentBooking.id === bookingId) {
            this.currentBooking = {
              ...this.currentBooking,
              ...updates
            }
          }
        }
        
        return {
          id: bookingId,
          ...updates
        }
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    async completeBooking(bookingId, rating = 0, review = '') {
      this.loading = true
      
      try {
        const bookingRef = doc(db, 'bookings', bookingId)
        
        // Get current booking to ensure we're authorized to update
        const bookingDoc = await getDoc(bookingRef)
        
        if (!bookingDoc.exists()) {
          throw new Error('Booking not found')
        }
        
        const bookingData = bookingDoc.data()
        
        // Only the customer can complete a booking
        const authStore = useAuthStore()
        if (authStore.user.uid !== bookingData.customerId) {
          throw new Error('Unauthorized')
        }
        
        const updates = {
          status: 'completed',
          updatedAt: new Date(),
          paymentStatus: 'completed'
        }
        
        if (rating) {
          updates.rating = rating
        }
        
        if (review) {
          updates.review = review
        }
        
        await updateDoc(bookingRef, updates)
        
        // Update worker's stats (rating, completed jobs)
        if (rating && bookingData.workerId) {
          const workerRef = doc(db, 'workers', bookingData.workerId)
          const workerDoc = await getDoc(workerRef)
          
          if (workerDoc.exists()) {
            const workerData = workerDoc.data()
            const currentTotalRating = workerData.rating * workerData.reviewCount
            const newReviewCount = workerData.reviewCount + 1
            const newRating = (currentTotalRating + rating) / newReviewCount
            
            await updateDoc(workerRef, {
              rating: newRating,
              reviewCount: newReviewCount,
              completedJobs: workerData.completedJobs + 1
            })
          }
        }
        
        // Update in local state
        const index = this.bookings.findIndex(b => b.id === bookingId)
        if (index !== -1) {
          this.bookings[index] = {
            ...this.bookings[index],
            ...updates
          }
          
          if (this.currentBooking && this.currentBooking.id === bookingId) {
            this.currentBooking = {
              ...this.currentBooking,
              ...updates
            }
          }
        }
        
        return {
          id: bookingId,
          ...updates
        }
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    }
  }
}) 