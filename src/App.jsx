// App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Creator from "./pages/Creator";
import LandingPage from "./pages/LandingPage";
import VideoDetailPage from "./pages/VideoDetailPage";
import EditorPage from "./pages/EditorPage";
import TimelineTest from "./pages/TimelineTest";
import AuthPage from "./pages/AuthPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
// import LoginPage from "./pages/LoginPage";
// import RegisterPage from "./pages/RegisterPage";
import BuyCreditsPage from "./pages/BuyCreditsPage";
import MyVideosPage from "./pages/MyVideosPage";
import SettingsPage from "./pages/SettingsPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsPage from "./pages/TermsPage";
import AppLayout from "./components/AppLayout";
import { ToastContainer } from "react-toastify";
import { AuthProvider } from "./hooks/useAuth.jsx";
import { useIsMobile } from "./hooks/useMediaQuery";

function App() {
  // Desktop: toasts bottom-right. Mobile: keep them up top so they don't sit on
  // top of the bottom action bar / help FAB.
  const isMobile = useIsMobile();
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes (no header) */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/register" element={<AuthPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          {/* <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} /> */}


          {/* Protected routes with persistent header */}
          <Route element={<AppLayout />}>
            <Route path="/create" element={<Creator />} />
            <Route path="/buy-credits" element={<BuyCreditsPage />} />
            <Route path="/videos" element={<MyVideosPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/video/:id" element={<VideoDetailPage />} />
            <Route path="/video/:id/edit" element={<EditorPage />} />
            <Route path="/timeline-test" element={<TimelineTest />} />
          </Route>
        </Routes>
        <ToastContainer
          position={isMobile ? "top-left" : "bottom-right"}
          autoClose={3500}
          hideProgressBar
          newestOnTop
          closeButton={false}
          theme="colored"
        />
      </Router>
    </AuthProvider>
  );
}

export default App;
