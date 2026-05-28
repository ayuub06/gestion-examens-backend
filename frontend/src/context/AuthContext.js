import React, { createContext, useState, useContext, useEffect } from "react";
import api from "../services/api";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      loadUser();
    } else {
      setLoading(false);
    }
  }, []);

  const loadUser = async () => {
    try {
      const res = await api.get("/auth/me");
      setUser(res.data.user);
    } catch (err) {
      console.error("Load user error:", err);
      localStorage.removeItem("token");
      delete api.defaults.headers.common["Authorization"];
    }
    setLoading(false);
  };

  const login = async (email, password) => {
    try {
      const res = await api.post("/auth/login", { email, password });
      const { token, user: userData } = res.data;

      localStorage.setItem("token", token);
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      setUser(userData);

      return { success: true };
    } catch (err) {
      console.error("Login error:", err);
      return {
        success: false,
        error: err.response?.data?.message || "Erreur de connexion",
      };
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    delete api.defaults.headers.common["Authorization"];
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.role === "admin",
        isProfessor: user?.role === "professeur",
        isStudent: user?.role === "etudiant",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
