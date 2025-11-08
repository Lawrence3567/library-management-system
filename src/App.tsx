import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import Login from './components/auth/Login'
import ResetPassword from './components/auth/ResetPassword'
import Profile from './components/profile/Profile'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Home from './components/home/Home'
import Report from './components/report/Report'
import { ManageBooks } from './components/books/ManageBooks'
import { ManageRequests } from './components/books/ManageRequests'
import { BrowseBooks } from './components/books/BrowseBooks'
import { BorrowingHistory } from './components/books/BorrowingHistory'
import RootLayout from './components/layout/RootLayout'
import FineRules from './components/fines/FineRules'
import './App.css'

// Create a client
const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
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
                <Route
                  path="/report"
                  element={
                    <ProtectedRoute>
                      <Report />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/manage-books"
                  element={
                    <ProtectedRoute allowedRoles={['Librarian']}>
                      <ManageBooks />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/manage-requests"
                  element={
                    <ProtectedRoute allowedRoles={['Librarian']}>
                      <ManageRequests />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/browse-books"
                  element={
                    <ProtectedRoute>
                      <BrowseBooks />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/borrowing-history"
                  element={
                    <ProtectedRoute>
                      <BorrowingHistory />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/fine-rules"
                  element={
                    <ProtectedRoute allowedRoles={['Librarian']}>
                      <FineRules />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </RootLayout>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
