import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AccountSettings = () => {
  // フォームの状態管理
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    birthdate: '',
    paymentMethod: 'クレジットカード',
    deliveryMethod: '電子チケット'
  });
  
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const { user, isAuthenticated, updateUserProfile } = useAuth();
  const navigate = useNavigate();
  
  // 非ログイン状態ならログイン画面にリダイレクト
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);
  
  // ユーザー情報を読み込む
  useEffect(() => {
    const loadUserInfo = async () => {
      if (!user) return;
      
      try {
        // APIからユーザー情報を取得
        const response = await fetch('/api/user/profile', {
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        });
        
        if (response.ok) {
          const userData = await response.json();
          // フォームにデータをセット
          setFormData({
            name: userData.name || '',
            phone: userData.phone || '',
            birthdate: userData.birthdate || '',
            paymentMethod: userData.paymentMethod || 'クレジットカード',
            deliveryMethod: userData.deliveryMethod || '電子チケット'
          });
        } else {
          console.error('プロファイル取得エラー:', await response.text());
        }
      } catch (error) {
        console.error('ユーザー情報読み込みエラー:', error);
        
        // デモモード: ローカルストレージからプロファイル取得
        try {
          const storedProfile = localStorage.getItem('user_profile');
          if (storedProfile) {
            const profileData = JSON.parse(storedProfile);
            setFormData(prevData => ({
              ...prevData,
              ...profileData
            }));
          }
        } catch (e) {
          console.error('ローカルストレージからの読み込みエラー:', e);
        }
      }
    };
    
    loadUserInfo();
  }, [user]);
  
  // 入力値の変更を処理
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
    
    // エラーをクリア
    if (errors[name]) {
      setErrors(prevErrors => ({
        ...prevErrors,
        [name]: ''
      }));
    }
    
    setIsSaved(false);
  };
  
  // フォームのバリデーション
  const validateForm = () => {
    const newErrors = {};
    
    // 必須項目チェック
    if (!formData.name) newErrors.name = '氏名を入力してください';
    if (!formData.phone) newErrors.phone = '電話番号を入力してください';
    if (!formData.birthdate) newErrors.birthdate = '生年月日を入力してください';
    
    // 電話番号の形式チェック
    if (formData.phone && !/^\d{10,11}$/.test(formData.phone.replace(/-/g, ''))) {
      newErrors.phone = '正しい電話番号を入力してください';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // フォーム送信処理
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setMessage({ type: '', text: '' });
    
    try {
      // APIへのプロファイル更新リクエスト
      const response = await fetch('/api/user/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        // 成功時の処理
        setIsSaved(true);
        setMessage({ type: 'success', text: 'アカウント情報を保存しました' });
        
        // ユーザープロファイル情報を更新
        updateUserProfile(formData);
        
        // 成功メッセージを表示して3秒後に消す
        setTimeout(() => {
          setMessage({ type: '', text: '' });
        }, 3000);
      } else {
        const errorData = await response.json();
        setMessage({ type: 'error', text: errorData.message || 'プロファイル更新に失敗しました' });
      }
    } catch (error) {
      console.error('プロファイル更新エラー:', error);
      
      // デモモード: サーバー接続エラー時はローカルストレージに保存
      try {
        localStorage.setItem('user_profile', JSON.stringify(formData));
        
        // ユーザープロファイル情報を更新（コンテキスト）
        updateUserProfile(formData);
        
        // user-info.json にもデータを保存（ファイル保存機能）
        try {
          const saveResponse = await fetch('/api/user/save-profile', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData),
          });
          
          if (saveResponse.ok) {
            console.log('ユーザー情報をファイルに保存しました');
          }
        } catch (fileError) {
          console.error('ファイル保存エラー:', fileError);
        }
        
        setIsSaved(true);
        setMessage({ type: 'success', text: 'アカウント情報を保存しました（ローカルモード）' });
        
        // 成功メッセージを表示して3秒後に消す
        setTimeout(() => {
          setMessage({ type: '', text: '' });
        }, 3000);
      } catch (storageError) {
        console.error('ローカルストレージ保存エラー:', storageError);
        setMessage({ type: 'error', text: 'プロファイル情報の保存に失敗しました' });
      }
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden p-6 my-6">
      <h2 className="text-2xl font-bold mb-6 pb-2 border-b border-gray-200">
        アカウント設定
      </h2>
      
      <form onSubmit={handleSubmit}>
        {message.text && (
          <div className={`p-3 mb-4 rounded-md ${
            message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {message.text}
          </div>
        )}
        
        {/* 購入者情報セクション */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4 pb-2 border-b border-gray-200">
            購入者情報
          </h3>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="name">
              氏名（カナ） <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`w-full px-3 py-2 border ${errors.name ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="ヤマダ タロウ"
            />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="phone">
              電話番号 <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className={`w-full px-3 py-2 border ${errors.phone ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="090-1234-5678"
            />
            {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="birthdate">
              生年月日 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="birthdate"
              name="birthdate"
              value={formData.birthdate}
              onChange={handleChange}
              className={`w-full px-3 py-2 border ${errors.birthdate ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
            {errors.birthdate && <p className="mt-1 text-xs text-red-500">{errors.birthdate}</p>}
          </div>
        </div>
        
        {/* 支払い・受取方法セクション */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4 pb-2 border-b border-gray-200">
            支払い・受取方法
          </h3>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="paymentMethod">
              支払い方法
            </label>
            <select
              id="paymentMethod"
              name="paymentMethod"
              value={formData.paymentMethod}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="クレジットカード">クレジットカード</option>
              <option value="コンビニ支払い">コンビニ支払い</option>
              <option value="ペイジー">ペイジー</option>
            </select>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="deliveryMethod">
              受取方法
            </label>
            <select
              id="deliveryMethod"
              name="deliveryMethod"
              value={formData.deliveryMethod}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="電子チケット">電子チケット</option>
              <option value="郵送">郵送</option>
              <option value="Loppi店頭受取">Loppi店頭受取</option>
            </select>
          </div>
        </div>
        
        {/* 保存ボタン */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded shadow disabled:bg-blue-300"
          >
            {loading ? '保存中...' : '設定を保存'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AccountSettings; 