// App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Creator from "./pages/Creator";
import LandingPage from "./pages/LandingPage";
import VideoDetailPage from "./pages/VideoDetailPage";
import TimelineTest from "./pages/TimelineTest";
import { ToastContainer } from "react-toastify";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/create" element={<Creator />} />
        <Route path="/video/:id" element={<VideoDetailPage />} />
        <Route path="/timeline-test" element={<TimelineTest />} />
      </Routes>
      <ToastContainer theme="dark" />
    </Router>
  );
}

export default App;
