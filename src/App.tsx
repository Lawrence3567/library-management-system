import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Login from './components/auth/Login'
import ResetPassword from './components/auth/ResetPassword'
import Profile from './components/profile/Profile'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Home from './components/home/Home'
import RootLayout from './components/layout/RootLayout'
import './App.css'

// Create a client
const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <RootLayout>
          <div className="app-container">
            <Routes>
              <Route path="/auth/login" element={<Login />} />
              <Route path="/auth/reset-password" element={<ResetPassword />} />
              <Route path="/login" element={<Navigate to="/auth/login" replace />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Home />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </RootLayout>
      </Router>
    </QueryClientProvider>
  )
}

export default App
