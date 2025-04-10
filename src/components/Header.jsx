import React from "react";
import { Link } from "react-router-dom";
import {
  LogIn,
  LogOut,
  Home,
  MessageSquare,
  Settings,
  Shield,
} from "lucide-react";
import { useStore } from "../store/useStore";

function Header() {
  const { publicKey, profile, logout } = useStore();

  return (
    <header className="header">
      <div className="header__container">
        <div className="header__nav">
          <Link to="/" className="header__logo">
            <MessageSquare />
            Nostrop
          </Link>
          <Link to="/">
            <Home size={16} />
            Główna
          </Link>
          <Link to="/mikroblog">Mikroblog</Link>
        </div>

        <div className="header__nav">
          {publicKey ? (
            <>
              {(profile?.role === "admin" || profile?.role === "moderator") && (
                <Link to="/admin">
                  <Shield size={16} />
                  Panel
                </Link>
              )}
              <Link to="/settings">
                <Settings size={20} />
              </Link>
              <button type="button" onClick={logout} className="button">
                <LogOut size={20} />
              </button>
            </>
          ) : (
            <Link to="/login" className="button">
              <LogIn size={20} />
              Zaloguj
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
