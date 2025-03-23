import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

// API ベースURL取得関数
const getApiUrl = () => {
  return process.env.REACT_APP_API_URL || '';
};

const ParseEventPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [eventInfo, setEventInfo] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [countdown, setCountdown] = useState(3);
  
  const apiUrl = getApiUrl();
  
  // URLパラメータからチケットURLを取得
  const ticketUrl = searchParams.get('url');
  
  // イベント情報解析処理
  useEffect(() => {
    let timeoutId;
    
    const parseEventInfo = async () => {
      // URLがない場合はエラー
      if (!ticketUrl) {
        setStatus('error');
        setErrorMessage('URLが指定されていません');
        return;
      }
      
      try {
        setStatus('loading');
        
        // APIリクエスト
        const response = await fetch(`${apiUrl}/api/parse-event`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: ticketUrl }),
        });
        
        if (!response.ok) {
          throw new Error(`APIエラー: ${response.status}`);
        }
        
        // レスポンス処理
        const data = await response.json();
        
        // イベント情報を取得
        setEventInfo(data);
        
        // ローカルストレージに保存（EventFormで利用）
        localStorage.setItem('parsed_event_info', JSON.stringify(data));
        
        // 成功状態に変更
        setStatus('success');
        
        // 成功したら3秒カウントダウン後にイベント入力画面へ
        timeoutId = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              clearInterval(timeoutId);
              navigate('/event');
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        
      } catch (error) {
        console.error('イベント情報解析エラー:', error);
        setStatus('error');
        setErrorMessage('APIからの取得に失敗しました');
      }
    };
    
    parseEventInfo();
    
    // クリーンアップ関数
    return () => {
      if (timeoutId) clearInterval(timeoutId);
    };
  }, [ticketUrl, navigate, apiUrl]);
  
  // もう一度試すボタンの処理
  const handleRetry = () => {
    // ページをリロード
    window.location.reload();
  };
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <h1 className="text-2xl font-bold mb-8">
        {status === 'loading' && 'イベント情報を読み取っています...'}
        {status === 'success' && 'イベント情報の読み取りが完了しました'}
        {status === 'error' && 'イベント情報の読み取りに失敗しました'}
      </h1>
      
      {/* ローディング表示 */}
      {status === 'loading' && (
        <div className="mb-6">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent">
          </div>
          <p className="mt-4 text-gray-600 animate-pulse">
            ローソンチケットのページから情報を取得しています
          </p>
        </div>
      )}
      
      {/* 成功表示 */}
      {status === 'success' && (
        <div className="mb-6">
          <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4 max-w-lg">
            <div className="flex items-center mb-2">
              <span className="bg-green-100 text-green-800 p-1 rounded-full mr-2">✓</span>
              <p className="text-green-800 font-medium">取得成功</p>
            </div>
            
            {eventInfo && (
              <div className="text-left text-gray-700">
                <p className="mt-1"><span className="font-semibold">イベント:</span> {eventInfo.title || '不明'}</p>
                {eventInfo.venue && <p className="mt-1"><span className="font-semibold">会場:</span> {eventInfo.venue}</p>}
                {eventInfo.date && <p className="mt-1"><span className="font-semibold">開催日:</span> {eventInfo.date}</p>}
                {eventInfo.saleStartTime && <p className="mt-1"><span className="font-semibold">販売開始:</span> {eventInfo.saleStartTime}</p>}
              </div>
            )}
          </div>
          
          <p className="mt-4 text-gray-600">
            {countdown}秒後にイベント入力画面に戻ります
          </p>
        </div>
      )}
      
      {/* エラー表示 */}
      {status === 'error' && (
        <div className="mb-6">
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4 max-w-lg">
            <div className="flex items-center mb-2">
              <span className="bg-red-100 text-red-800 p-1 rounded-full mr-2">✕</span>
              <p className="text-red-800 font-medium">取得失敗</p>
            </div>
            <p className="mt-1 text-red-700">{errorMessage}</p>
            <p className="mt-3 text-gray-600 text-sm">
              URLが正しいローソンチケットの販売ページか確認してください
            </p>
          </div>
          
          <button
            onClick={handleRetry}
            className="mt-4 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-6 rounded-md shadow-sm"
          >
            もう一度試す
          </button>
        </div>
      )}
      
      {/* 戻るリンク */}
      <div className="mt-8">
        <button
          onClick={() => navigate('/event')}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          イベント入力画面に戻る
        </button>
      </div>
    </div>
  );
};

export default ParseEventPage; 