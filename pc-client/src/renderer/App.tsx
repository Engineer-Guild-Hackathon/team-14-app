import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { LoadingScreen } from './components/LoadingScreen';
import { TitleBar } from './components/TitleBar';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { Settings } from './pages/Settings';
import { QuestDetails } from './pages/QuestDetails';
/// <reference types="../types/electron" />

function App() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    console.log('App - Auth state changed:', { user, isLoading, isAuthenticated });
  }, [user, isLoading, isAuthenticated]);

  useEffect(() => {
    const initialize = async () => {
      try {
        // Initialize app
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate initialization
      } catch (error) {
        console.error('App initialization error:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    initialize();
  }, []);

  useEffect(() => {
    // Handle socket events
    const handleSocketConnected = () => {
      console.log('Socket connected');
    };

    const handleSocketDisconnected = () => {
      console.log('Socket disconnected');
    };

    const handleAuthExpired = () => {
      console.log('Authentication expired');
    };

    window.electronAPI.on('socket:connected', handleSocketConnected);
    window.electronAPI.on('socket:disconnected', handleSocketDisconnected);
    window.electronAPI.on('auth:expired', handleAuthExpired);

    return () => {
      window.electronAPI.off('socket:connected');
      window.electronAPI.off('socket:disconnected');
      window.electronAPI.off('auth:expired');
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.electronAPI.cleanup();
    };
  }, []);

  if (isInitializing || isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <TitleBar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Routes>
          <Route 
            path="/" 
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />
          
          <Route 
            path="/login" 
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Login />
              )
            } 
          />
          
          <Route 
            path="/dashboard" 
            element={
              isAuthenticated ? (
                <Dashboard />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />
          
          <Route 
            path="/settings" 
            element={
              isAuthenticated ? (
                <Settings />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />
          
          <Route 
            path="/quest/:questId" 
            element={
              isAuthenticated ? (
                <QuestDetails />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />
          
          {/* Catch all route */}
          <Route 
            path="*" 
            element={<Navigate to="/" replace />} 
          />
        </Routes>
      </div>
    </div>
  );
}

export default App;