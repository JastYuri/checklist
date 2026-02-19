import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useContext } from "react";
import { AuthProvider, AuthContext } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Checklist from "./pages/Checklist";
import ReportPage from "./pages/ReportPage";   // ✅ Now acts as Job List
import Category from "./pages/Category";
import Manual from "./pages/Manual"; // ✅ Import the new Manual component
import ProtectedRoute from "./components/ProtectedRoute";
import Toast from "./components/Toast";   // ✅ Import global toast

function AppRoutes() {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-base-200 px-4"> {/* ✅ Added responsive padding */}
        <div className="loading loading-spinner text-primary"></div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={user ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route
        path="/register"
        element={user ? <Navigate to="/dashboard" replace /> : <Register />}
      />

      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/checklist"
        element={
          <ProtectedRoute>
            <Checklist />
          </ProtectedRoute>
        }
      />
      <Route
        path="/category"
        element={
          <ProtectedRoute>
            <Category />
          </ProtectedRoute>
        }
      />
      {/* ✅ New Manual route */}
      <Route
        path="/manual"
        element={
          <ProtectedRoute>
            <Manual />
          </ProtectedRoute>
        }
      />

      {/* ✅ Report routes */}
      <Route
        path="/report"
        element={
          <ProtectedRoute>
            <ReportPage />   {/* Job List view */}
          </ProtectedRoute>
        }
      />
      <Route
        path="/report/:id"
        element={
          <ProtectedRoute>
            <ReportPage />   {/* Single job detail view */}
          </ProtectedRoute>
        }
      />

      {/* Other routes */}
      <Route path="/category/:id/form" element={<Checklist />} />
      <Route path="/job/:id/checklist" element={<Checklist />} />

      {/* Default redirect */}
      <Route
        path="*"
        element={<Navigate to={user ? "/dashboard" : "/login"} replace />}
      />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-base-100"> {/* ✅ Added container for full-height and background */}
          {/* ✅ Only show Navbar if user is logged in */}
          <AuthContext.Consumer>
            {({ user }) => user && <Navbar />}
          </AuthContext.Consumer>

          <main className="container mx-auto px-4 py-6"> {/* ✅ Added responsive container for page content */}
            <AppRoutes />
          </main>
          <Toast />   {/* ✅ Mount global toast here */}
        </div>
      </Router>
    </AuthProvider>
  );
}