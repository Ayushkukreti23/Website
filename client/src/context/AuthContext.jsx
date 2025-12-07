import { useEffect, useState } from "react";
import { me, logout, clearToken } from "../lib/api";
import { AuthContext } from "./auth";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function refreshUser() {
    try {
      const u = await me();
      setUser(u);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function logoutUser() {
    await logout();
    clearToken();
    setUser(null);
  }

  useEffect(() => {
    refreshUser();
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, setUser, loading, refreshUser, logoutUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}
