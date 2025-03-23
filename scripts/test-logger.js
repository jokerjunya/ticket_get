/**
 * ログ機能のテスト用スクリプト
 */

const fs = require('fs');
const path = require('path');

// 現在日時からログファイル名を生成する関数
function generateLogFileName() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `purchase-log-${year}${month}${day}-${hours}${minutes}${seconds}.txt`;
}

// ロギング用関数
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
  
  console.log(logMessage);
  
  // 標準ログファイルにも出力
  fs.appendFileSync(
    path.join(__dirname, 'purchase-log.txt'), 
    logMessage + '\n', 
    { encoding: 'utf8' }
  );
}

// 専用フォーマットのログをファイルに記録するための関数
function purchaseLog(logInfo, logFileName) {
  // logsディレクトリの確認と作成
  const logsDir = path.join(__dirname, '..', 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  const logFilePath = path.join(logsDir, logFileName);
  
  // ログエントリを追加
  fs.appendFileSync(logFilePath, logInfo + '\n', { encoding: 'utf8' });
}

// テスト処理
function testLogger() {
  // ログファイル名の生成
  const logFileName = generateLogFileName();
  let purchaseUrl = 'https://l-tike.com/orderpage/test';
  
  log('ログ機能のテストを開始します');
  
  // 処理開始時刻を記録
  const startTime = new Date().toISOString();
  purchaseLog(`[START] ${startTime}`, logFileName);
  
  // URLの記録
  purchaseLog(`[URL] ${purchaseUrl}`, logFileName);
  
  // テスト処理
  try {
    // 成功のテスト
    if (process.argv.includes('--success')) {
      log('処理が成功しました', 'success');
      purchaseLog(`[STATUS] SUCCESS`, logFileName);
    } 
    // 失敗のテスト
    else if (process.argv.includes('--fail')) {
      throw new Error('テスト用のエラーメッセージ');
    }
    // キャプチャのテスト
    else if (process.argv.includes('--captcha')) {
      throw new Error('CAPTCHA が検出されました。手動での対応が必要です。');
    }
    // デフォルトは成功
    else {
      log('テスト実行完了', 'success');
      purchaseLog(`[STATUS] SUCCESS`, logFileName);
    }
  } catch (error) {
    const errorMessage = `エラーが発生しました: ${error.message}`;
    log(errorMessage, 'error');
    
    // 失敗ログの記録
    purchaseLog(`[STATUS] FAILED`, logFileName);
    purchaseLog(`[ERROR] ${errorMessage}`, logFileName);
    
    // CAPTCHAの検出
    if (error.message.includes('CAPTCHA')) {
      log('CAPTCHAが検出されました。手動での操作をお願いします。', 'warning');
      
      // CAPTCHA対応を模擬
      if (process.argv.includes('--recover')) {
        log('CAPTCHA後の処理を再開します...');
        purchaseLog(`[STATUS] SUCCESS`, logFileName);
      } else {
        const continuationErrorMessage = 'CAPTCHA対応後も失敗しました: 手動対応失敗';
        log(continuationErrorMessage, 'error');
        purchaseLog(`[ERROR] ${continuationErrorMessage}`, logFileName);
      }
    }
  } finally {
    // 終了時刻を記録
    purchaseLog(`[END] ${new Date().toISOString()}`, logFileName);
    
    log(`ログファイル ${logFileName} が logs ディレクトリに作成されました`);
    log(`ログのパス: ${path.join(__dirname, '..', 'logs', logFileName)}`);
  }
}

// テスト実行
testLogger(); 