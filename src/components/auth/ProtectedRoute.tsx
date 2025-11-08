import { type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute = ({
  children,
  allowedRoles,
}: ProtectedRouteProps) => {
  const { session, user, loading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          fontSize: "1.2rem",
        }}
      >
        Loading...
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!session) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // Check role-based access
  // First check user_metadata.role, then fallback to user table role
  const userRole = session.user.user_metadata?.role || user?.role || "Student";

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    // User doesn't have required role, redirect to home
    return <Navigate to="/" replace />;
  }

  // User is authenticated and authorized
  return <>{children}</>;
};

export default ProtectedRoute;
