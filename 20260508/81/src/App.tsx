import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import Sensitivity from "@/pages/Sensitivity";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/sensitivity" element={<Sensitivity />} />
      </Routes>
    </Router>
  );
}
