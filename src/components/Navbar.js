import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-blue-600 text-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-3">
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold">
              チケット自動購入
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <Link to="/event" className="hover:text-blue-200">
                  イベント入力
                </Link>
                <Link to="/account" className="hover:text-blue-200">
                  アカウント設定
                </Link>
                <div className="flex items-center ml-4">
                  <span className="mr-2">{user.email}</span>
                  <button
                    onClick={handleLogout}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                  >
                    ログアウト
                  </button>
                </div>
              </>
            ) : (
              <Link
                to="/login"
                className="bg-white text-blue-600 hover:bg-blue-100 px-4 py-2 rounded"
              >
                ログイン
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 