/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Home from './pages/Home';
import Admin from './pages/Admin';
import Login from './pages/Login';
import TrackOrder from './pages/TrackOrder';
import DeliveryDashboard from './pages/DeliveryDashboard';
import Header from './components/Header';
import Footer from './components/Footer';
import Cart from './components/Cart';

const ProtectedRoute = ({ children, role }: { children: React.ReactNode, role?: 'admin' | 'delivery' }) => {
  const { isAuthenticated, isAdmin, isDelivery } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  if (role === 'admin' && !isAdmin) {
    return <Navigate to="/" />;
  }

  if (role === 'delivery' && !isDelivery && !isAdmin) {
    return <Navigate to="/" />;
  }
  
  return <>{children}</>;
};

export default function App() {
  const [isCartOpen, setIsCartOpen] = useState(false);

  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <div className="min-h-screen bg-white font-sans text-gray-900">
            <Header onCartClick={() => setIsCartOpen(true)} />
            <main>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/track-order" element={<TrackOrder />} />
                <Route 
                  path="/admin/*" 
                  element={
                    <ProtectedRoute role="admin">
                      <Admin />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/delivery" 
                  element={
                    <ProtectedRoute role="delivery">
                      <DeliveryDashboard />
                    </ProtectedRoute>
                  } 
                />
              </Routes>
            </main>
            <Footer />
            <Cart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
          </div>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

