/**
 * Authentication Context
 */

import { createContext, useContext, useState, useEffect } from 'react';
import * as cognitoService from '../services/cognito';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if user is already logged in
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      if (cognitoService.isAuthenticated()) {
        const currentUser = await cognitoService.getCurrentUser();
        setUser(currentUser);
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email, password) => {
    try {
      setError(null);
      await cognitoService.signIn(email, password);
      await checkAuth();
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const signUp = async (email, password) => {
    try {
      setError(null);
      await cognitoService.signUp(email, password);
      // Auto sign in after signup (since we have auto-verify)
      await signIn(email, password);
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const signOut = () => {
    cognitoService.signOut();
    setUser(null);
  };

  const value = {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
