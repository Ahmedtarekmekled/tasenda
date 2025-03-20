import axios from 'axios';
import { API_URL } from '../config';

interface LoginData {
  email: string;
  password: string;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
}

interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    token: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  };
}

export const login = async (email: string, password: string): Promise<AuthResponse> => {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, { email, password });
    
    return {
      success: true,
      message: 'Login successful',
      data: response.data
    };
  } catch (error: any) {
    console.error('Login error:', error.response?.data || error);
    
    return {
      success: false,
      message: error.response?.data?.message || 'Invalid email or password'
    };
  }
};

export const register = async (name: string, email: string, password: string): Promise<AuthResponse> => {
  try {
    const response = await axios.post(`${API_URL}/auth/register`, { name, email, password });
    
    return {
      success: true,
      message: 'Registration successful',
      data: response.data
    };
  } catch (error: any) {
    console.error('Registration error:', error.response?.data || error);
    
    return {
      success: false,
      message: error.response?.data?.message || 'Registration failed'
    };
  }
};

export const getCurrentUser = async (): Promise<AuthResponse> => {
  try {
    const response = await axios.get(`${API_URL}/auth/me`);
    
    return {
      success: true,
      message: 'User data retrieved successfully',
      data: response.data
    };
  } catch (error: any) {
    console.error('Get current user error:', error.response?.data || error);
    
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to get user data'
    };
  }
}; 