import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './assets/styles/main.css'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import { auth } from './firebase/config'

// Fix for history.state warning in Vue Router
// This patches the history.replaceState method to preserve Vue Router state
const originalReplaceState = history.replaceState;
history.replaceState = function(state, title, url) {
  // Ensure state is properly merged with existing history state
  const newState = state ? {...history.state, ...state} : history.state;
  return originalReplaceState.call(this, newState, title, url);
};

// Create the Pinia store
const pinia = createPinia()

// Create the app
const app = createApp(App)
app.use(pinia)

// Initialize the auth store
const authStore = useAuthStore(pinia)

// Wait for Firebase auth to initialize before mounting the app
const initializeApp = () => {
  let appMounted = false;
  
  // Set up auth state observer
  auth.onAuthStateChanged(user => {
    // Initialize auth store with the user
    authStore.init(user)
    
    // Only mount the app once
    if (!appMounted) {
      app.use(router)
      app.mount('#app')
      appMounted = true;
    }
  })
  
  // Set a timeout to mount the app anyway if auth takes too long
  setTimeout(() => {
    if (!appMounted) {
      console.warn('Auth initialization timeout, mounting app anyway');
      app.use(router)
      app.mount('#app')
      appMounted = true;
    }
  }, 1500); // 1.5 second timeout
}

initializeApp()
