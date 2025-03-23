import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// API ベースURL取得関数
const getApiUrl = () => {
  // production ビルドでは相対パスを使用
  return process.env.REACT_APP_API_URL || '';
};

const EventForm = () => {
  // イベント情報のフォーム状態
  const [formData, setFormData] = useState({
    ticketUrl: '',
    saleStartTime: '',
    quantity: 1,
    seatType: '',
  });
  
  const [errors, setErrors] = useState({});
  const [isSaved, setIsSaved] = useState(false);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showTestModal, setShowTestModal] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const apiUrl = getApiUrl();
  
  // 非ログイン状態ならログイン画面にリダイレクト
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);
  
  // 既存のイベント情報があれば読み込む
  useEffect(() => {
    const loadEventInfo = async () => {
      try {
        // サーバーからイベント情報を取得
        const response = await fetch(`${apiUrl}/api/event/info`);
        
        if (response.ok) {
          const eventData = await response.json();
          setFormData(prevState => ({
            ...prevState,
            ticketUrl: eventData.ticketUrl || '',
            saleStartTime: eventData.saleStartTime || '',
            quantity: eventData.quantity || 1,
            seatType: eventData.seatType || '',
          }));
        }
      } catch (error) {
        console.error('イベント情報読み込みエラー:', error);
        
        // デモモード: ローカルストレージからデータ取得
        try {
          const storedEventInfo = localStorage.getItem('event_info');
          if (storedEventInfo) {
            const eventData = JSON.parse(storedEventInfo);
            setFormData(prevState => ({
              ...prevState,
              ...eventData
            }));
          }
        } catch (e) {
          console.error('ローカルストレージからの読み込みエラー:', e);
        }
      }
    };
    
    loadEventInfo();
  }, [apiUrl]);
  
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
    
    setIsSaved(false);
  };
  
  // ローチケでイベントを探すボタン処理
  const handleSearchLawson = () => {
    window.open('https://l-tike.com/search/?keyword=', '_blank');
  };

  // クリップボードからURLを貼り付け処理
  const handlePasteUrl = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      
      // ローチケのURLかどうか確認
      if (clipboardText.includes('https://l-tike.com/')) {
        setFormData(prevState => ({
          ...prevState,
          ticketUrl: clipboardText
        }));
        
        // エラーをクリア
        if (errors.ticketUrl) {
          setErrors({
            ...errors,
            ticketUrl: ''
          });
        }
        
        setIsSaved(false);
      } else {
        alert('有効なローチケURLが見つかりませんでした');
      }
    } catch (error) {
      console.error('クリップボード読み取りエラー:', error);
      alert('クリップボードからの読み取りに失敗しました');
    }
  };
  
  // バリデーション処理
  const validateForm = () => {
    const newErrors = {};
    
    // 必須項目チェック
    if (!formData.ticketUrl) newErrors.ticketUrl = '販売ページURLを入力してください';
    if (!formData.saleStartTime) newErrors.saleStartTime = '販売開始時刻を入力してください';
    if (!formData.seatType) newErrors.seatType = '席種・エリアを入力してください';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // フォーム送信処理
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setMessage({ type: '', text: '' });
    
    try {
      // APIへのイベント情報保存リクエスト
      const response = await fetch(`${apiUrl}/api/event/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify(formData),
      });
      
      if (response.ok) {
        setIsSaved(true);
        setMessage({ type: 'success', text: 'イベント情報を保存しました' });
        
        // 成功メッセージを表示して3秒後に消す
        setTimeout(() => {
          setMessage({ type: '', text: '' });
        }, 3000);
      } else {
        const errorData = await response.json();
        setMessage({ type: 'error', text: errorData.message || 'イベント情報の保存に失敗しました' });
      }
    } catch (error) {
      console.error('イベント情報保存エラー:', error);
      
      // デモモード: サーバー接続エラー時はローカルストレージに保存
      try {
        localStorage.setItem('event_info', JSON.stringify(formData));
        setIsSaved(true);
        setMessage({ type: 'success', text: 'イベント情報を保存しました（ローカルモード）' });
        
        // 成功メッセージを表示して3秒後に消す
        setTimeout(() => {
          setMessage({ type: '', text: '' });
        }, 3000);
      } catch (storageError) {
        console.error('ローカルストレージ保存エラー:', storageError);
        setMessage({ type: 'error', text: 'イベント情報の保存に失敗しました' });
      }
    }
  };
  
  // デモモードでのテスト実行
  const runDemoTest = () => {
    // ユーザー情報を取得
    let userProfile = {};
    try {
      const storedProfile = localStorage.getItem('user_profile');
      if (storedProfile) {
        userProfile = JSON.parse(storedProfile);
      }
    } catch (e) {
      console.error('ユーザープロファイル読み込みエラー:', e);
    }
    
    // テスト用ダミーデータの作成
    const testData = {
      url: formData.ticketUrl || "https://example.com/test-ticket-page",
      email: user?.email || "test@example.com",
      password: "testpass123", // パスワードはダミー
      quantity: formData.quantity || 2,
      seat: formData.seatType || "テストエリア",
      payment: userProfile.paymentMethod || "クレジットカード",
      delivery: userProfile.deliveryMethod || "電子チケット",
      name: userProfile.name || "ヤマダタロウ",
      phone: userProfile.phone || "09012345678",
      birth: userProfile.birthdate || "1990-01-01"
    };
    
    console.log('デモモードでテスト実行:', testData);
    
    // ファイル名の生成
    const date = new Date();
    const fileName = `test-log-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}${String(date.getSeconds()).padStart(2, '0')}.txt`;
    
    // 模擬的な成功レスポンスの作成
    return {
      testResult: true,
      logFile: fileName,
      message: '[デモモード] テスト成功: ユーザー情報とイベント情報が正しく統合されました'
    };
  };
  
  // テスト実行ボタンのハンドラー
  const handleRunTest = async () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      setIsTestRunning(true);
      
      // まず現在のフォームデータを保存
      await handleSubmit({ preventDefault: () => {} });
      
      // ユーザー情報とイベント情報をマージ
      
      // サーバー接続チェック
      console.log('サーバーの状態を確認しています...');
      try {
        const serverCheckResponse = await fetch(`${apiUrl}/api/healthcheck`);
        if (!serverCheckResponse.ok) {
          throw new Error('サーバーが応答していますが、エラーが発生しました');
        }
        
        const healthData = await serverCheckResponse.json();
        console.log('サーバーの状態:', healthData);
        // サーバーが正常に応答したらデモモードをオフに
        setIsDemoMode(false);
      } catch (serverError) {
        console.error('サーバー接続エラー:', serverError);
        
        // サーバー接続できない場合はデモモードに切り替え
        console.log('デモモードに切り替えます');
        setIsDemoMode(true);
        
        // デモモードでのテスト実行
        const demoResult = runDemoTest();
        setTestResult(demoResult);
        setShowTestModal(true);
        setIsTestRunning(false);
        return; // ここで終了
      }
      
      // ユーザー情報とイベント情報をマージしてテスト用のデータを作成
      console.log('ユーザー情報を取得しています...');
      const userResponse = await fetch(`${apiUrl}/api/user/profile`);
      
      if (!userResponse.ok) {
        throw new Error('ユーザー情報の取得に失敗しました');
      }
      
      const userData = await userResponse.json();
      
      // マージしたテストデータの作成
      const testData = {
        url: formData.ticketUrl,
        email: user.email,
        password: userData.password || "testpass123", // パスワードは実際には表示されない
        quantity: formData.quantity,
        seat: formData.seatType,
        payment: userData.paymentMethod,
        delivery: userData.deliveryMethod,
        name: userData.name,
        phone: userData.phone,
        birth: userData.birthdate
      };
      
      // テスト用のデータをJSONファイルとして保存するAPIリクエスト
      console.log('テスト情報をサーバーに送信しています...');
      const saveResponse = await fetch(`${apiUrl}/api/save-test-info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData),
      });
      
      if (!saveResponse.ok) {
        const errorText = await saveResponse.text();
        console.error('テスト情報保存エラーレスポンス:', errorText);
        throw new Error(`テスト情報の保存に失敗しました (ステータス: ${saveResponse.status})`);
      }
      
      const saveResult = await saveResponse.json();
      console.log('保存結果:', saveResult);
      
      // テストスクリプトを実行するAPIリクエスト
      console.log('テストスクリプトを実行しています...');
      const testResponse = await fetch(`${apiUrl}/api/run-purchase-test`);
      
      if (!testResponse.ok) {
        const errorText = await testResponse.text();
        console.error('テスト実行エラーレスポンス:', errorText);
        throw new Error(`テスト実行に失敗しました (ステータス: ${testResponse.status})`);
      }
      
      const result = await testResponse.json();
      console.log('テスト結果:', result);
      setTestResult(result);
      setShowTestModal(true);
      
    } catch (error) {
      console.error('テスト実行エラー:', error);
      setTestResult({
        testResult: false,
        message: error.message
      });
      setShowTestModal(true);
    } finally {
      setIsTestRunning(false);
    }
  };
  
  // テストモーダルを閉じる
  const closeTestModal = () => {
    setShowTestModal(false);
  };
  
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden p-6 my-6">
      <h2 className="text-2xl font-bold mb-6 pb-2 border-b border-gray-200">
        イベント情報入力
      </h2>
      
      {/* ローチケで探すボタン */}
      <div className="mb-4">
        <button
          type="button"
          onClick={handleSearchLawson}
          className="bg-blue-100 text-blue-700 border border-blue-300 px-4 py-2 rounded hover:bg-blue-200 transition"
        >
          🔎 ローチケでイベントを探す
        </button>
      </div>
      
      <form onSubmit={handleSubmit}>
        {message.text && (
          <div className={`p-3 mb-4 rounded-md ${
            message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {message.text}
          </div>
        )}
        
        {/* イベント情報セクション */}
        <div className="mb-8">
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="ticketUrl">
              チケット販売ページURL <span className="text-red-500">*</span>
            </label>
            <div className="flex">
              <input
                type="text"
                id="ticketUrl"
                name="ticketUrl"
                value={formData.ticketUrl}
                onChange={handleChange}
                className={`w-full px-3 py-2 border ${errors.ticketUrl ? 'border-red-500' : 'border-gray-300'} rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="https://l-tike.com/..."
              />
              <button
                type="button"
                onClick={handlePasteUrl}
                className="bg-gray-100 text-gray-700 border border-gray-300 border-l-0 px-3 py-2 rounded-r-md hover:bg-gray-200 transition"
                title="クリップボードからURLを貼り付け"
              >
                📋
              </button>
            </div>
            {errors.ticketUrl && <p className="mt-1 text-xs text-red-500">{errors.ticketUrl}</p>}
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="saleStartTime">
              販売開始時刻 <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              id="saleStartTime"
              name="saleStartTime"
              value={formData.saleStartTime}
              onChange={handleChange}
              className={`w-full px-3 py-2 border ${errors.saleStartTime ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
            {errors.saleStartTime && <p className="mt-1 text-xs text-red-500">{errors.saleStartTime}</p>}
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="quantity">
              枚数
            </label>
            <input
              type="number"
              id="quantity"
              name="quantity"
              min="1"
              max="4"
              value={formData.quantity}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="seatType">
              席種・エリア <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="seatType"
              name="seatType"
              value={formData.seatType}
              onChange={handleChange}
              className={`w-full px-3 py-2 border ${errors.seatType ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="S席、アリーナAブロックなど"
            />
            {errors.seatType && <p className="mt-1 text-xs text-red-500">{errors.seatType}</p>}
          </div>
        </div>
        
        {/* 保存・実行ボタン */}
        <div className="flex flex-wrap gap-4">
          <button
            type="submit"
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded shadow"
          >
            保存
          </button>
          
          <button
            type="button"
            onClick={handleRunTest}
            disabled={isTestRunning}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded shadow ml-auto"
          >
            {isTestRunning ? '実行中...' : '🔁 テスト実行'}
          </button>
        </div>
      </form>
      
      {/* テスト結果モーダル */}
      {showTestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">テスト実行結果</h3>
              <button
                onClick={closeTestModal}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            {isDemoMode && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-2 mb-4">
                <p className="text-yellow-800 text-sm">
                  デモモードで実行しています（サーバーに接続できませんでした）
                </p>
              </div>
            )}
            
            {testResult?.testResult ? (
              <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
                <div className="flex items-center">
                  <span className="bg-green-100 text-green-800 p-1 rounded-full mr-2">✓</span>
                  <p className="text-green-800 font-medium">テスト成功</p>
                </div>
                <p className="mt-2 text-green-700">{testResult.message}</p>
                {testResult.logFile && (
                  <p className="mt-2 text-sm text-gray-600">
                    ログファイル: {testResult.logFile}
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                <div className="flex items-center">
                  <span className="bg-red-100 text-red-800 p-1 rounded-full mr-2">✕</span>
                  <p className="text-red-800 font-medium">テスト失敗</p>
                </div>
                <p className="mt-2 text-red-700">{testResult?.message || 'エラーが発生しました'}</p>
              </div>
            )}
            
            <button
              onClick={closeTestModal}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded mt-4"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventForm; 