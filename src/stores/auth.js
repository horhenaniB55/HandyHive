import { defineStore } from 'pinia'
import { auth, db } from '../firebase/config'
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile
} from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    userRole: null,
    loading: false,
    error: null
  }),
  
  getters: {
    isAuthenticated: (state) => !!state.user,
    isCustomer: (state) => state.userRole === 'customer',
    isWorker: (state) => state.userRole === 'worker',
    isAdmin: (state) => state.userRole === 'admin',
  },
  
  actions: {
    async registerUser(email, password, displayName, role = 'customer') {
      this.loading = true
      this.error = null
      
      try {
        // Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password)
        
        // Update profile with displayName
        await updateProfile(userCredential.user, { displayName })
        
        // Add user document in Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          email,
          displayName,
          role,
          phoneNumber: '',
          createdAt: new Date(),
          lastLogin: new Date()
        })
        
        // If worker, create additional worker document
        if (role === 'worker') {
          await setDoc(doc(db, 'workers', userCredential.user.uid), {
            services: [],
            bio: '',
            experience: '',
            certificates: [],
            availability: {
              schedule: {
                monday: { isAvailable: true, hours: { start: '09:00', end: '17:00' } },
                tuesday: { isAvailable: true, hours: { start: '09:00', end: '17:00' } },
                wednesday: { isAvailable: true, hours: { start: '09:00', end: '17:00' } },
                thursday: { isAvailable: true, hours: { start: '09:00', end: '17:00' } },
                friday: { isAvailable: true, hours: { start: '09:00', end: '17:00' } },
                saturday: { isAvailable: false, hours: { start: '09:00', end: '17:00' } },
                sunday: { isAvailable: false, hours: { start: '09:00', end: '17:00' } }
              },
              currentStatus: 'offline'
            },
            rating: 0,
            reviewCount: 0,
            completedJobs: 0,
            wallet: {
              balance: 0,
              transactions: []
            },
            isVerified: false,
            serviceAreas: []
          })
        }
        
        // If customer, create additional customer document
        if (role === 'customer') {
          await setDoc(doc(db, 'customers', userCredential.user.uid), {
            address: '',
            savedLocations: [],
            bookingHistory: [],
            favoriteWorkers: []
          })
        }
        
        // Set user and role in state
        this.user = userCredential.user
        this.userRole = role
        
        // Store role in localStorage for router guards
        localStorage.setItem('userRole', role)
        
        return userCredential.user
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    async login(email, password) {
      this.loading = true
      this.error = null
      
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password)
        
        // Get user role from Firestore
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid))
        
        if (userDoc.exists()) {
          const userData = userDoc.data()
          this.userRole = userData.role
          
          // Update lastLogin
          await setDoc(doc(db, 'users', userCredential.user.uid), 
            { lastLogin: new Date() }, 
            { merge: true }
          )
          
          // Store role in localStorage for router guards
          localStorage.setItem('userRole', userData.role)
        } else {
          this.error = 'User document not found'
          throw new Error('User document not found')
        }
        
        // Set user in state
        this.user = userCredential.user
        
        return userCredential.user
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    async loginWithGoogle() {
      this.loading = true
      this.error = null
      
      try {
        const provider = new GoogleAuthProvider()
        const userCredential = await signInWithPopup(auth, provider)
        
        // Check if user document exists in Firestore
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid))
        
        // If user doesn't exist, create new user document
        if (!userDoc.exists()) {
          // Default to customer role for new Google sign-ins
          const role = 'customer'
          
          await setDoc(doc(db, 'users', userCredential.user.uid), {
            email: userCredential.user.email,
            displayName: userCredential.user.displayName,
            role: role,
            phoneNumber: userCredential.user.phoneNumber || '',
            createdAt: new Date(),
            lastLogin: new Date()
          })
          
          // Create customer document
          await setDoc(doc(db, 'customers', userCredential.user.uid), {
            address: '',
            savedLocations: [],
            bookingHistory: [],
            favoriteWorkers: []
          })
          
          this.userRole = role
          localStorage.setItem('userRole', role)
        } else {
          // User exists, update lastLogin and get role
          const userData = userDoc.data()
          
          await setDoc(doc(db, 'users', userCredential.user.uid), 
            { lastLogin: new Date() }, 
            { merge: true }
          )
          
          this.userRole = userData.role
          localStorage.setItem('userRole', userData.role)
        }
        
        // Set user in state
        this.user = userCredential.user
        
        return userCredential.user
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    async logout() {
      try {
        await signOut(auth)
        this.user = null;
        this.userRole = null;
        localStorage.removeItem('userRole');
        localStorage.removeItem('userId');
      } catch (error) {
        this.error = error.message
        throw error
      }
    },
    
    // Initialize auth - called when the app starts
    init(user = null) {
      // If user is passed directly, initialize immediately
      if (user) {
        this.user = user;
        
        // Store user ID in localStorage for persistence
        localStorage.setItem('userId', user.uid);
        
        // Get user role from localStorage first (for immediate UI updates)
        const savedRole = localStorage.getItem('userRole');
        if (savedRole) {
          this.userRole = savedRole;
        }
        
        // Then fetch the latest role from Firestore (to ensure it's up to date)
        this.fetchUserRole(user.uid);
        return;
      }
      
      // Otherwise set up auth state listener
      auth.onAuthStateChanged(async (user) => {
        if (user) {
          this.user = user;
          
          // Store user ID in localStorage for persistence
          localStorage.setItem('userId', user.uid);
          
          // Get user role from localStorage first (for immediate UI updates)
          const savedRole = localStorage.getItem('userRole');
          if (savedRole) {
            this.userRole = savedRole;
          }
          
          // Then fetch the latest role from Firestore
          await this.fetchUserRole(user.uid);
        } else {
          this.user = null;
          this.userRole = null;
          localStorage.removeItem('userRole');
          localStorage.removeItem('userId');
        }
      });
    },
    
    // Separate method to fetch user role
    async fetchUserRole(userId) {
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          this.userRole = userData.role;
          localStorage.setItem('userRole', userData.role);
          return userData.role;
        }
        return null;
      } catch (error) {
        console.error('Error getting user role:', error);
        return null;
      }
    }
  }
}) 