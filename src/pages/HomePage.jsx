import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const HomePage = () => {
  const { isAuthenticated } = useAuth();
  
  return (
    <div className="py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-blue-600 mb-4">
            チケット自動購入システム
          </h1>
          <p className="text-xl text-gray-600">
            チケット発売日に自動でチケットを購入するシステムです
          </p>
        </div>
        
        <div className="bg-white shadow-md rounded-lg overflow-hidden mb-8">
          <div className="px-6 py-8">
            <h2 className="text-2xl font-bold mb-4">システムの使い方</h2>
            
            <div className="space-y-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                    1
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium">アカウント設定</h3>
                  <p className="mt-1 text-gray-600">
                    氏名や連絡先などの購入者情報を一度だけ設定して保存します。
                  </p>
                </div>
              </div>
              
              <div className="flex">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                    2
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium">イベント情報入力</h3>
                  <p className="mt-1 text-gray-600">
                    購入したいチケットの情報（URL、発売時間、席種など）を入力します。
                  </p>
                </div>
              </div>
              
              <div className="flex">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                    3
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium">テスト実行</h3>
                  <p className="mt-1 text-gray-600">
                    実際に購入する前にテスト実行して、正しく動作するか確認します。
                  </p>
                </div>
              </div>
              
              <div className="flex">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                    4
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium">自動購入の実行</h3>
                  <p className="mt-1 text-gray-600">
                    発売時間になると自動的にチケット購入処理が実行されます。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-center">
          {isAuthenticated ? (
            <div className="space-y-4">
              <Link
                to="/event"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg mr-4"
              >
                イベント情報入力へ
              </Link>
              <Link
                to="/account"
                className="inline-block bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg"
              >
                アカウント設定へ
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <Link
                to="/login"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg"
              >
                ログインして始める
              </Link>
              <p className="text-gray-600 mt-2">
                ※ デモアカウント: demo@example.com / demo123
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage; 