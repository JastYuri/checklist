import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useContext(AuthContext);

  // ✅ Show spinner while checking localStorage
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-base-200">
        <div className="loading loading-spinner text-primary"></div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return children;
}