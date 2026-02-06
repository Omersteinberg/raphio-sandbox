// App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Creator from "./pages/Creator";
import LandingPage from "./pages/LandingPage";
import VideoDetailPage from "./pages/VideoDetailPage";
import TimelineTest from "./pages/TimelineTest";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ProtectedRoute from "./components/ProtectedRoute";
import { ToastContainer } from "react-toastify";
import { AuthProvider } from "./hooks/useAuth.jsx";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route 
            path="/create" 
            element={
              <ProtectedRoute>
                <Creator />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/video/:id" 
            element={
              <ProtectedRoute>
                <VideoDetailPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/timeline-test" 
            element={
              <ProtectedRoute>
                <TimelineTest />
              </ProtectedRoute>
            } 
          />
        </Routes>
        <ToastContainer theme="dark" />
      </Router>
    </AuthProvider>
  );
}

export default App;
