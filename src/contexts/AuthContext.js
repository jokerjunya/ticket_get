import React, { createContext, useState, useContext, useEffect } from 'react';

// 認証コンテキストを作成
const AuthContext = createContext();

// AuthProviderコンポーネント - アプリのルートに配置して認証状態を提供
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 初期化時にローカルストレージからユーザー情報を読み込む
  useEffect(() => {
    const storedUser = localStorage.getItem('auth_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('認証情報の解析に失敗しました:', e);
        localStorage.removeItem('auth_user');
      }
    }
    setLoading(false);
  }, []);

  // ログイン処理
  const login = async (email, password) => {
    try {
      // サーバーの認証APIをチェック
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const userData = await response.json();
        // ユーザー情報をステートとローカルストレージに保存
        setUser(userData);
        localStorage.setItem('auth_user', JSON.stringify(userData));
        return { success: true };
      } else {
        // サーバーエラーの場合
        const errorData = await response.json();
        return { success: false, message: errorData.message || 'ログインに失敗しました' };
      }
    } catch (error) {
      console.error('サーバー接続エラー:', error);
      
      // デモモード: サーバーに接続できない場合のフォールバック
      // 注: 実際の認証ではこのような処理は行わないでください
      // これはデモンストレーション用の簡易実装です
      if (email === 'demo@example.com' && password === 'demo123') {
        const demoUser = { 
          email, 
          name: 'デモユーザー',
          userId: 'demo-user-1'
        };
        setUser(demoUser);
        localStorage.setItem('auth_user', JSON.stringify(demoUser));
        return { success: true };
      }
      
      return { 
        success: false, 
        message: 'サーバーに接続できませんでした。ネットワーク接続を確認してください。' 
      };
    }
  };

  // ログアウト処理
  const logout = () => {
    setUser(null);
    localStorage.removeItem('auth_user');
  };

  // ユーザー情報の更新処理
  const updateUserProfile = (updatedProfile) => {
    if (user) {
      const updatedUser = { ...user, ...updatedProfile };
      setUser(updatedUser);
      localStorage.setItem('auth_user', JSON.stringify(updatedUser));
    }
  };

  // コンテキストで提供する値
  const value = {
    user,
    loading,
    login,
    logout,
    updateUserProfile,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// カスタムフック - 認証コンテキストを使用するためのショートカット
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext; 