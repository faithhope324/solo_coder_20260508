import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import SimulationPage from "@/pages/SimulationPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<SimulationPage />} />
      </Routes>
    </Router>
  );
}
