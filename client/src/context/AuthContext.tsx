import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { login as loginApi, register as registerApi, getCurrentUser } from '../services/auth.service';
import { setAuthToken, removeAuthToken } from '../utils/auth';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextProps {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      
      if (storedToken) {
        setToken(storedToken);
        setAuthToken(storedToken);
        
        try {
          const response = await getCurrentUser();
          
          if (response.success && response.data) {
            setUser(response.data.user);
          } else {
            // Token is invalid or expired
            removeAuthToken();
            localStorage.removeItem('token');
            setToken(null);
          }
        } catch (error) {
          console.error('Error initializing auth:', error);
          removeAuthToken();
          localStorage.removeItem('token');
          setToken(null);
        }
      }
      
      setIsLoading(false);
    };
    
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await loginApi(email, password);
      
      if (response.success && response.data) {
        setUser(response.data.user);
        setToken(response.data.token);
        setAuthToken(response.data.token);
        localStorage.setItem('token', response.data.token);
      }
      
      return {
        success: response.success,
        message: response.message || ''
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'An unexpected error occurred'
      };
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const response = await registerApi(name, email, password);
      
      if (response.success && response.data) {
        setUser(response.data.user);
        setToken(response.data.token);
        setAuthToken(response.data.token);
        localStorage.setItem('token', response.data.token);
      }
      
      return {
        success: response.success,
        message: response.message || ''
      };
    } catch (error) {
      console.error('Register error:', error);
      return {
        success: false,
        message: 'An unexpected error occurred'
      };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    removeAuthToken();
    localStorage.removeItem('token');
  };

  const value = {
    user,
    token,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 