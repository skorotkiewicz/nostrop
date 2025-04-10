import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Mikroblog from "./pages/Mikroblog";
import Profile from "./pages/Profile";
import AdminPanel from "./pages/AdminPanel";
// import Settings from './pages/Settings';
import "./styles/main.scss";

function App() {
  return (
    <Router>
      <div>
        <Header />
        <main className="main container">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/mikroblog" element={<Mikroblog />} />
            <Route path="/profile/:pubkey" element={<Profile />} />
            <Route path="/admin" element={<AdminPanel />} />
            {/* <Route path="/settings" element={<Settings />} /> */}
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
