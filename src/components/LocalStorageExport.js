import React from 'react';

const LocalStorageExport = () => {
  const exportData = () => {
    try {
      // LocalStorageからデータを取得
      const ticketFormData = localStorage.getItem('ticketFormData');
      
      if (!ticketFormData) {
        alert('保存されたデータがありません。先に情報を保存してください。');
        return;
      }

      // JSONデータを作成
      const exportData = {
        ticketFormData: ticketFormData
      };
      
      // JSONに変換
      const jsonString = JSON.stringify(exportData, null, 2);
      
      // ダウンロード用のBlobを作成
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // ダウンロードリンクを作成して自動クリック
      const a = document.createElement('a');
      a.href = url;
      a.download = 'localStorage-export.json';
      document.body.appendChild(a);
      a.click();
      
      // クリーンアップ
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert('データをエクスポートしました。購入自動化スクリプトのフォルダに保存してください。');
    } catch (error) {
      console.error('エクスポート中にエラーが発生しました:', error);
      alert('エクスポートに失敗しました。' + error.message);
    }
  };
  
  return (
    <div className="mt-6">
      <button
        onClick={exportData}
        className="text-sm text-blue-600 hover:text-blue-800 hover:underline focus:outline-none"
      >
        保存データをエクスポート
      </button>
      <p className="mt-1 text-xs text-gray-500">
        ※ 自動購入スクリプト用にデータを出力します
      </p>
    </div>
  );
};

export default LocalStorageExport; 