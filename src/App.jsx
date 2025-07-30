// App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Creator from "./pages/Creator";
import { ToastContainer } from "react-toastify";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Creator />} />
      </Routes>
      <ToastContainer theme="dark" />
    </Router>
  );
}

export default App;
