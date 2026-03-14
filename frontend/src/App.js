import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Layout } from "./components/Layout";
import { Toaster } from "./components/ui/sonner";
import LotusIntro from "./components/LotusIntro";

// Pages
import HomePage from "./pages/HomePage";
import AuthPage from "./pages/AuthPage";
import SupportPage from "./pages/SupportPage";
import SpecialistsPage from "./pages/SpecialistsPage";
import LegalPage from "./pages/LegalPage";
import NewsPage from "./pages/NewsPage";
import MessagesPage from "./pages/MessagesPage";
import ProfilePage from "./pages/ProfilePage";
import AdminPage from "./pages/AdminPage";
import NearbyPage from "./pages/NearbyPage";
import SearchPage from "./pages/SearchPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import UserProfilePage from "./pages/UserProfilePage";
import StoriesPage from "./pages/StoriesPage";
import CommunityPage from "./pages/CommunityPage";
import JourneyPage from "./pages/JourneyPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import GoogleCallback from "./pages/GoogleCallback";
import FacebookCallback from "./pages/FacebookCallback";
import { AppSettingsProvider } from "./context/AppSettingsContext";

// Protected Route wrapper - ALL content requires authentication
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }
  
  return children;
};

// Public route - redirect to home if already logged in
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }
  
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

function AppRoutes() {
  return (
    <Layout>
      <Routes>
        <Route path="/auth" element={<PublicRoute><AuthPage /></PublicRoute>} />
        <Route path="/auth/google-callback" element={<GoogleCallback />} />
        <Route path="/auth/facebook-callback" element={<FacebookCallback />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/users/:userId" element={<ProtectedRoute><UserProfilePage /></ProtectedRoute>} />
        <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/support" element={<ProtectedRoute><SupportPage /></ProtectedRoute>} />
        <Route path="/specialists" element={<ProtectedRoute><SpecialistsPage /></ProtectedRoute>} />
        <Route path="/legal" element={<ProtectedRoute><LegalPage /></ProtectedRoute>} />
        <Route path="/news" element={<ProtectedRoute><NewsPage /></ProtectedRoute>} />
        <Route path="/news/:newsId" element={<ProtectedRoute><NewsPage /></ProtectedRoute>} />
        <Route path="/zkusenosti" element={<ProtectedRoute><StoriesPage /></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
        <Route path="/nearby" element={<ProtectedRoute><NearbyPage /></ProtectedRoute>} />
        <Route path="/search" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
        <Route path="/journey" element={<ProtectedRoute><JourneyPage /></ProtectedRoute>} />
        <Route path="/community" element={<CommunityPage />} />
        {/* Redirect old routes */}
        <Route path="/services" element={<Navigate to="/support" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppSettingsProvider>
        <LotusIntro />
        <AppRoutes />
        <Toaster position="top-right" richColors />
        </AppSettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
