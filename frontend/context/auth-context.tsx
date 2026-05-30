"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
export interface User {
  id: string | number;
  username: string;
  first_name?: string;
  last_name?: string;
  role: "ADMIN" | "CASHIER";
  status?: "ACTIVE" | "INACTIVE";
}
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (userData: User, token: string) => void;
  logout: () => void;
  isInitialized: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const router = useRouter();

  // On mount, load from localStorage and verify the user still exists in DB
  useEffect(() => {
    const storedUser = localStorage.getItem("fc_user");
    const storedToken = localStorage.getItem("fc_token");

    if (storedUser && storedToken) {
      try {
        const parsed = JSON.parse(storedUser);
        // Verify the user still exists in the database (guards against DB reset)
        const isElectron = typeof window !== "undefined" && (window as any).electron;
        if (isElectron) {
          (window as any).electron.invoke("users:getById", parsed.id)
            .then((result: any) => {
              // IPC returns { success: boolean, data?: user }
              if (result?.success && result?.data?.id) {
                setUser(parsed);
                setToken(storedToken);
              } else {
                // User no longer exists in DB (e.g. after DB reset)
                localStorage.removeItem("fc_user");
                localStorage.removeItem("fc_token");
                document.cookie = "fc_authenticated=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
              }
            })
            .catch(() => {
              // Any error = user invalid, force re-login
              localStorage.removeItem("fc_user");
              localStorage.removeItem("fc_token");
              document.cookie = "fc_authenticated=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
            })
            .finally(() => {
              setLoading(false);
              setIsInitialized(true);
            });
          return; // async path handles setLoading below
        } else {
          setUser(parsed);
          setToken(storedToken);
        }
      } catch (error) {
        localStorage.removeItem("fc_user");
        localStorage.removeItem("fc_token");
      }
    }
    setLoading(false);
    setIsInitialized(true);
  }, []);

  const login = (userData: User, newToken: string) => {
    setUser(userData);
    setToken(newToken);
    localStorage.setItem("fc_user", JSON.stringify(userData));
    localStorage.setItem("fc_token", newToken);
    
    // Set a cookie for middleware (accessible on server)
    document.cookie = "fc_authenticated=true; path=/; max-age=86400; SameSite=Lax";
    
    setTimeout(() => {
        router.push("/dashboard");
    }, 100);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("fc_user");
    localStorage.removeItem("fc_token");
    
    // Clear cookie
    document.cookie = "fc_authenticated=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    
    router.replace("/sign-in");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        isInitialized,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
