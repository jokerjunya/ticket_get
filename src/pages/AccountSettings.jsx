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
  const [isSaved, setIsSaved] = useState(false); // 保存状態を管理（UI表示用）
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
          // データがロードされたら保存済み状態にする
          setIsSaved(true);
        }
      } catch (error) {
        console.error('ユーザー情報取得エラー:', error);
        
        // APIエラー時はローカルストレージを試す
        try {
          const storedUserInfo = localStorage.getItem('user_profile');
          if (storedUserInfo) {
            const userData = JSON.parse(storedUserInfo);
            setFormData(prevState => ({
              ...prevState,
              ...userData
            }));
            // ローカルストレージからデータが読み込まれたら保存済み状態にする
            setIsSaved(true);
          }
        } catch (storageError) {
          console.error('ローカルストレージからの読み込みエラー:', storageError);
        }
      }
    };
    
    loadUserInfo();
  }, [user]);
  
  // 入力変更の処理
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // エラーをクリア
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
    
    // 保存済み状態をリセット
    setIsSaved(false);
  };
  
  // バリデーション処理
  const validateForm = () => {
    const newErrors = {};
    
    // 必須項目チェック
    if (!formData.name) newErrors.name = '氏名を入力してください';
    if (!formData.phone) newErrors.phone = '電話番号を入力してください';
    else if (!/^[0-9]{10,11}$/.test(formData.phone.replace(/-/g, ''))) {
      newErrors.phone = '有効な電話番号を入力してください';
    }
    if (!formData.birthdate) newErrors.birthdate = '生年月日を入力してください';
    
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
      // APIにユーザー情報を送信
      const response = await fetch('/api/user/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify(formData),
      });
      
      if (response.ok) {
        // ユーザーコンテキストも更新
        updateUserProfile(formData);
        
        setIsSaved(true);
        setMessage({ type: 'success', text: '設定を保存しました' });
        
        // 成功メッセージを表示して3秒後に消す
        setTimeout(() => {
          setMessage({ type: '', text: '' });
        }, 3000);
      } else {
        const errorData = await response.json();
        setMessage({ type: 'error', text: errorData.message || '設定の保存に失敗しました' });
      }
    } catch (error) {
      console.error('設定保存エラー:', error);
      
      // オフラインモード: ローカルストレージに保存
      try {
        localStorage.setItem('user_profile', JSON.stringify(formData));
        
        // ユーザーコンテキストも更新
        updateUserProfile(formData);
        
        setIsSaved(true);
        setMessage({ type: 'success', text: '設定をローカルに保存しました（オフラインモード）' });
        
        // 成功メッセージを表示して3秒後に消す
        setTimeout(() => {
          setMessage({ type: '', text: '' });
        }, 3000);
      } catch (storageError) {
        console.error('ローカルストレージ保存エラー:', storageError);
        setMessage({ type: 'error', text: '設定の保存に失敗しました' });
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
        
        {/* 設定が保存済みの場合、メッセージを表示 */}
        {isSaved && !message.text && (
          <div className="p-3 mb-4 rounded-md bg-blue-50 text-blue-700">
            現在の設定が保存されています
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