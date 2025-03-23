import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import AccountSettings from './pages/AccountSettings';
import EventForm from './pages/EventForm';
import ParseEventPage from './pages/ParseEventPage';

// 本番環境でのベースパス設定
const getBasename = () => {
  // 環境変数からベースパスを取得、ない場合は '/'
  return process.env.REACT_APP_BASE_PATH || '/';
};

function App() {
  return (
    <AuthProvider>
      <Router basename={getBasename()}>
        <div className="min-h-screen bg-gray-100">
          <Navbar />
          <div className="container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/account" element={<AccountSettings />} />
              <Route path="/event" element={<EventForm />} />
              <Route path="/parse-event" element={<ParseEventPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App; 