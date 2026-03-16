// App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Creator from "./pages/Creator";
import LandingPage from "./pages/LandingPage";
import VideoDetailPage from "./pages/VideoDetailPage";
import TimelineTest from "./pages/TimelineTest";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import BuyCreditsPage from "./pages/BuyCreditsPage";
import AppLayout from "./components/AppLayout";
import { ToastContainer } from "react-toastify";
import { AuthProvider } from "./hooks/useAuth.jsx";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes (no header) */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected routes with persistent header */}
          <Route element={<AppLayout />}>
            <Route path="/create" element={<Creator />} />
            <Route path="/buy-credits" element={<BuyCreditsPage />} />
            <Route path="/video/:id" element={<VideoDetailPage />} />
            <Route path="/timeline-test" element={<TimelineTest />} />
          </Route>
        </Routes>
        <ToastContainer theme="dark" />
      </Router>
    </AuthProvider>
  );
}

export default App;
