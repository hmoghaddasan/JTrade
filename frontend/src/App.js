// frontend/src/App.js

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import SubscriptionRenewal from './components/auth/SubscriptionRenewal';

// Auth Components
import LoginStep1 from './components/auth/LoginStep1';
import VerifyCode from './components/auth/VerifyCode';
import Register from './components/auth/Register';

// Main Components
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';

// Trading Components
import TradeForm from './components/TradeForm';
import TradeEditForm from './components/TradeEditForm';
import TradeList from './components/TradeList';
import TradeDetail from './components/TradeDetail';

// Reports Components
import ReportDashboard from './components/reports/ReportDashboard';

// Styles
import './App.css';
import MessageList from './components/messaging/MessageList';
import MessageForm from './components/messaging/MessageForm';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Auth Routes - بدون نیاز به احراز هویت */}
            <Route path="/login" element={<LoginStep1 />} />
            <Route path="/verify" element={<VerifyCode />} />
            <Route path="/register" element={<Register />} />

            {/* Protected Routes - نیاز به احراز هویت */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subscription/renew"
              element={
                <ProtectedRoute>
                  <SubscriptionRenewal />
                </ProtectedRoute>
              }
            />
            {/* Trading Routes */}
            <Route
              path="/trades"
              element={
                <ProtectedRoute>
                  <TradeList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/trades/new"
              element={
                <ProtectedRoute>
                  <TradeForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/trades/edit"
              element={
                <ProtectedRoute>
                  <TradeEditForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/trades/:id"
              element={
                <ProtectedRoute>
                  <TradeDetail />
                </ProtectedRoute>
              }
            />

            {/* Reports Routes */}
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <ReportDashboard />
                </ProtectedRoute>
              }
            />

            {/* Profile Routes */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/messages"
              element={
                <ProtectedRoute>
                  <MessageList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/messages/new"
              element={
                <ProtectedRoute>
                  <MessageForm />
                </ProtectedRoute>
              }
            />
            {/* 404 - مسیر پیش‌فرض */}
            <Route
              path="*"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;