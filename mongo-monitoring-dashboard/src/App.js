import React from "react";
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from "react-router-dom";
import RealTime from "./Components/RealTime";
import HistoryPage from "./Components/HistoryPage";

function App() {
  return (
    <Router>
      <div style={{ padding: 20, fontFamily: "Arial, sans-serif" }}>
        <nav style={{ marginBottom: 20 }}>
          <Link to="/realtime" style={{ marginRight: 15 }}>Anlık Veriler</Link>
          <Link to="/history">Geçmiş Veriler</Link>
        </nav>

        <Routes>
          <Route path="/realtime" element={<RealTime/>} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="*" element={<Navigate to="/realtime" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
