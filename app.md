# Home Services Web App Blueprint
## HandyHive
*'The buzz of home services'*

## Overview

A platform connecting customers with home service workers. The app facilitates service bookings, worker discovery, and payment processing.

### Key Features
- Worker profiles with verification and ratings
- Service booking system
- Location-based service matching
- In-app wallet for workers
- Payment processing (cash-only initially)
- User authentication and profile management

## Technology Implementation

### Frontend
- **Vue js**
- **Pinia**: State management
- **javascript (not Typescript)**
- **Tailwind CSS**: Responsive and consistent UI design

### Backend (Firebase)
- **Authentication**: Email and Google sign-in methods
- **Firestore**: NoSQL database for user and service data
- **Storage**: File hosting for profile pictures and certificates
- **Cloud Functions**: Backend processing for bookings and payments


## Architecture

```
├── Frontend (Vue js + JavaScript)
│   ├── Public Pages
│   │   ├── Landing Page
│   │   ├── Service Categories
│   │   ├── Worker Listings
│   │   └── Registration/Login
│   ├── Customer Dashboard
│   │   ├── Service Booking
│   │   ├── Booking History
│   │   ├── Worker Reviews
│   │   └── Profile Management
│   ├── Worker Dashboard
│   │   ├── Profile Management
│   │   ├── Job Requests
│   │   ├── Booking Calendar
│   │   ├── Wallet & Earnings
│   │   └── Certificate Upload
│   └── Admin Dashboard
│       ├── User Management
│       ├── Service Management
│       ├── Worker Verification
│       └── Transaction History
│
├── Backend (Firebase)
│   ├── Authentication
│   │   ├── Email/Password
│   │   └── Google OAuth
│   ├── Cloud Firestore
│   │   ├── Users Collection
│   │   ├── Workers Collection
│   │   ├── Services Collection
│   │   ├── Bookings Collection
│   │   └── Transactions Collection
│   ├── Cloud Storage
│   │   ├── Profile Pictures
│   │   ├── Certificates
│   │   └── Service Images
│   └── Cloud Functions
│       ├── Booking Management
│       ├── Wallet Operations
│       ├── Notification System
│       └── Payment Processing
```

## Data Models

### User (Base)
```
{
  uid: string,
  email: string,
  displayName: string,
  phoneNumber: string,
  photoURL: string,
  createdAt: timestamp,
  lastLogin: timestamp,
  role: 'customer' | 'worker' | 'admin'
}
```

### Customer (extends User)
```
{
  ...User,
  address: string,
  savedLocations: [
    {
      label: string,
      latitude: number,
      longitude: number,
      address: string
    }
  ],
  bookingHistory: [BookingId],
  favoriteWorkers: [WorkerId]
}
```

### Worker (extends User)
```
{
  ...User,
  services: [ServiceId],
  bio: string,
  experience: string,
  certificates: [
    {
      name: string,
      fileURL: string,
      isVerified: boolean,
      verifiedAt: timestamp
    }
  ],
  availability: {
    schedule: {
      monday: { isAvailable: boolean, hours: { start: string, end: string } },
      // ... other days
    },
    currentStatus: 'available' | 'busy' | 'offline'
  },
  rating: number,
  reviewCount: number,
  completedJobs: number,
  wallet: {
    balance: number,
    transactions: [TransactionId]
  },
  isVerified: boolean,
  serviceAreas: [
    {
      radius: number,
      center: {
        latitude: number,
        longitude: number
      }
    }
  ]
}
```

### Service
```
{
  id: string,
  name: string,
  category: string,
  description: string,
  imageURL: string,
  basePrice: number,
  pricingType: 'fixed' | 'hourly' | 'custom',
  estimatedDuration: number,
  createdAt: timestamp
}
```

### Booking
```
{
  id: string,
  customerId: string,
  workerId: string,
  serviceId: string,
  status: 'requested' | 'accepted' | 'in-progress' | 'completed' | 'cancelled',
  location: {
    address: string,
    latitude: number,
    longitude: number
  },
  scheduledTime: timestamp,
  price: number,
  customerNotes: string,
  workerNotes: string,
  rating: number,
  review: string,
  paymentMethod: 'cash',
  paymentStatus: 'pending' | 'completed',
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Transaction
```
{
  id: string,
  workerId: string,
  type: 'top-up' | 'withdrawal' | 'fee',
  amount: number,
  method: 'paypal' | 'card' | 'outlet' | 'e-wallet',
  status: 'pending' | 'completed' | 'failed',
  reference: string,
  createdAt: timestamp
}
```

## User Flows

### Customer Registration & Onboarding
1. User visits landing page
2. Clicks "Sign Up" and selects "Customer"
3. Creates account with email or Google
4. Completes profile with basic information
5. Adds home address (optional)
6. Views tutorial on how to book services
7. Redirected to service categories page

### Worker Registration & Onboarding
1. User visits landing page
2. Clicks "Sign Up" and selects "Worker"
3. Creates account with email or Google
4. Completes profile with detailed information
5. Uploads certificates and qualifications
6. Sets service areas and availability
7. Adds services and pricing
8. Account enters "Pending Verification" status
9. Worker tops up wallet to activate account

### Service Booking Flow
1. Customer logs in and searches for a service
2. Selects service category
3. Enters location or uses current location
4. Views list of available workers with ratings
5. Filters by rating, price, or availability
6. Selects a worker and views detailed profile
7. Chooses appointment date and time
8. Adds any special instructions
9. Confirms booking request
10. Receives notification when worker accepts

### Job Acceptance Flow (Worker)
1. Worker receives booking notification
2. Reviews job details, location, and customer rating
3. Accepts or declines the request
4. If accepted, job appears in worker's calendar
5. Worker can send a message to the customer
6. On job day, worker uses map for navigation
7. Updates status to "in-progress" upon arrival
8. Completes service and updates status to "completed"
9. Customer pays in cash
10. Worker confirms payment receipt
11. Platform deducts 12% from worker's wallet

### Payment & Top-up Flow
1. Worker logs into dashboard
2. Navigates to wallet section
3. Views current balance and transaction history
4. Selects "Top Up" and chooses method
5. Completes payment through selected gateway
6. Balance updates in real-time
7. Worker receives notification of successful top-up
8. For service fees, system automatically deducts from wallet
9. Worker receives notification of fee deduction

## User Interface Design

### Landing Page
- Hero section with value proposition
- Featured services categories
- How it works section
- Testimonials from workers and customers
- Call-to-action for sign-up

### Customer Dashboard
- Service booking shortcuts
- Upcoming and past bookings
- Favorite workers
- Notifications center
- Quick access to support

### Worker Dashboard
- Job requests and calendar view
- Earnings summary
- Wallet balance and top-up button
- Profile completion status
- Verification status indicator

### Service Booking Screens
- Category selection (visual grid)
- Location input with map integration
- Worker listings with card view
- Worker profile with services, ratings, reviews
- Booking form with date/time picker

### Worker Profile Management
- Personal information form
- Certificate upload area
- Service area selection with map
- Availability calendar
- Pricing management


### Features Implementation

#### Location Services
- Google Maps API for location selection and worker discovery
- Geohashing for efficient proximity searches
- Location sharing during service without continuous tracking

#### Authentication
- Firebase Authentication for secure user management
- Role-based access control for customers, workers, and admins
- session management

#### Payment System
- Worker wallet implementation in Firestore
- Transaction logging and history
- Integration with payment gateways for wallet top-up
- Automated fee calculation and deduction

## Deployment Strategy

### Development Stages
1. **MVP Release**:
   - Basic authentication
   - Worker profiles and verification
   - Service booking with cash payment
   - Worker wallet with manual top-up

2. **Phase 2**:
   - Rating and review system
   - Enhanced worker discovery
   - In-app messaging
   - Analytics dashboard

3. **Phase 3**:
   - Online payment processing
   - Mobile app versions
   - Advanced scheduling and recurring bookings
   - API for third-party integrations

### Hosting
- Firebase Functions for backend logic
- Firebase Storage for user uploads

## Performance Considerations

### Optimization Strategies
- Implement lazy loading for images and non-critical components
- Use Firestore indexes for common queries
- Optimize map rendering for mobile devices
- Implement caching for frequently accessed data
- Use Firebase Cloud Functions strategically to minimize costs

### Security Measures
- Implement proper Firebase security rules
- Validate all user inputs
- Secure API endpoints with authentication
- Encrypt sensitive data
- Regular security audits

## Future Enhancements
- In-app messaging system
- Real-time worker tracking during service
- Subscription model for premium workers
- Mobile applications
- Service bundles and discounts
- AI-powered worker recommendations
