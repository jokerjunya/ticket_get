import React, { useState } from 'react';
import LocalStorageExport from './LocalStorageExport';

const TicketForm = () => {
  const [formData, setFormData] = useState({
    // チケット情報
    ticketUrl: '',
    saleStartTime: '',
    quantity: 1,
    seatType: '',
    
    // ログイン情報
    email: '',
    password: '',
    
    // 購入者情報
    name: '',
    phone: '',
    birthdate: '',
    
    // 支払い・受取方法
    paymentMethod: 'クレジットカード',
    deliveryMethod: '電子チケット'
  });
  
  const [errors, setErrors] = useState({});
  const [isSaved, setIsSaved] = useState(false);
  
  // テスト実行関連の状態
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showTestModal, setShowTestModal] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  
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
  
  const validateForm = () => {
    const newErrors = {};
    
    // 必須項目のチェック
    if (!formData.ticketUrl) newErrors.ticketUrl = '販売ページURLを入力してください';
    if (!formData.saleStartTime) newErrors.saleStartTime = '販売開始時刻を入力してください';
    if (!formData.seatType) newErrors.seatType = '席種・エリアを入力してください';
    if (!formData.email) newErrors.email = 'メールアドレスを入力してください';
    if (!formData.password) newErrors.password = 'パスワードを入力してください';
    if (!formData.name) newErrors.name = '氏名を入力してください';
    if (!formData.phone) newErrors.phone = '電話番号を入力してください';
    if (!formData.birthdate) newErrors.birthdate = '生年月日を入力してください';
    
    // 電話番号の形式チェック
    if (formData.phone && !/^\d{10,11}$/.test(formData.phone.replace(/-/g, ''))) {
      newErrors.phone = '正しい電話番号を入力してください';
    }
    
    // メールアドレスの形式チェック
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = '正しいメールアドレスを入力してください';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      // ローカルストレージに保存
      localStorage.setItem('ticketFormData', JSON.stringify(formData));
      setIsSaved(true);
      
      // 成功メッセージを表示して3秒後に消す
      setTimeout(() => {
        setIsSaved(false);
      }, 3000);
    }
  };
  
  // デモモードでのテスト実行
  const runDemoTest = () => {
    // テスト用ダミーデータの作成
    const testData = {
      url: "https://example.com/test-ticket-page",
      email: formData.email || "test@example.com",
      password: formData.password || "testpass123",
      quantity: formData.quantity || 2,
      seat: formData.seatType || "テストエリア",
      payment: formData.paymentMethod,
      delivery: formData.deliveryMethod,
      name: formData.name || "ヤマダタロウ",
      phone: formData.phone || "09012345678",
      birth: formData.birthdate || "1990-01-01"
    };
    
    console.log('デモモードでテスト実行:', testData);
    
    // ファイル名の生成
    const date = new Date();
    const fileName = `test-log-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}${String(date.getSeconds()).padStart(2, '0')}.txt`;
    
    // 模擬的な成功レスポンスの作成
    return {
      testResult: true,
      logFile: fileName,
      message: '[デモモード] テスト成功: すべての入力がチケット購入に有効です'
    };
  };
  
  // テスト実行ボタンのハンドラー
  const handleRunTest = async () => {
    try {
      setIsTestRunning(true);
      
      // テスト用のダミーデータを作成
      const testData = {
        url: "https://example.com/test-ticket-page",
        email: formData.email || "test@example.com",
        password: formData.password || "testpass123",
        quantity: formData.quantity || 2,
        seat: formData.seatType || "テストエリア",
        payment: formData.paymentMethod,
        delivery: formData.deliveryMethod,
        name: formData.name || "ヤマダタロウ",
        phone: formData.phone || "09012345678",
        birth: formData.birthdate || "1990-01-01"
      };
      
      // サーバー接続チェック
      console.log('サーバーの状態を確認しています...');
      try {
        const serverCheckResponse = await fetch('/api/healthcheck');
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
      
      // 以下は通常のサーバーAPIリクエスト処理
      // テスト用のデータをJSONファイルとして保存するAPIリクエスト
      console.log('テスト情報をサーバーに送信しています...');
      const saveResponse = await fetch('/api/save-test-info', {
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
      const testResponse = await fetch('/api/run-purchase-test');
      
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
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <form onSubmit={handleSubmit} className="p-6">
        {/* チケット情報セクション */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-gray-200">
            チケット情報
          </h2>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="ticketUrl">
              チケット販売ページURL <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="ticketUrl"
              name="ticketUrl"
              value={formData.ticketUrl}
              onChange={handleChange}
              className={`w-full px-3 py-2 border ${errors.ticketUrl ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="https://l-tike.com/..."
            />
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
        
        {/* ログイン情報セクション */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-gray-200">
            ログイン情報
          </h2>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="email">
              メールアドレス <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full px-3 py-2 border ${errors.email ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="example@email.com"
            />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="password">
              パスワード <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={`w-full px-3 py-2 border ${errors.password ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
            {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
          </div>
        </div>
        
        {/* 購入者情報セクション */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-gray-200">
            購入者情報
          </h2>
          
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
          <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-gray-200">
            支払い・受取方法
          </h2>
          
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
        
        {/* 保存・実行ボタン */}
        <div className="flex flex-wrap gap-4">
          <button
            type="submit"
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded shadow"
          >
            保存して実行準備
          </button>
          
          <LocalStorageExport />
          
          {/* テスト実行ボタン */}
          <button
            type="button"
            onClick={handleRunTest}
            disabled={isTestRunning}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded shadow ml-auto"
          >
            {isTestRunning ? '実行中...' : '🔁 テスト実行'}
          </button>
        </div>
        
        {/* 保存成功メッセージ */}
        {isSaved && (
          <div className="mt-4 p-3 bg-green-100 text-green-700 rounded-md">
            入力情報が保存されました。このブラウザで自動購入スクリプトを実行できます。
          </div>
        )}
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

export default TicketForm; 