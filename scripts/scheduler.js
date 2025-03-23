/**
 * 購入処理スクリプトを指定時刻に自動実行するスケジューラー
 * 
 * 使用方法:
 * node scheduler.js [purchase-info.json へのパス]
 * node scheduler.js --all (すべての購入情報ファイルを処理)
 * node scheduler.js [purchase-info.json へのパス] --headless (ヘッドレスモードで実行)
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { glob } = require('glob');

// ロギング用関数
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
  
  console.log(logMessage);
  
  // ファイルにも出力
  fs.appendFileSync(
    path.join(__dirname, 'scheduler-log.txt'), 
    logMessage + '\n', 
    { encoding: 'utf8' }
  );
}

// 日本時間表示用の関数
function getJapanTimeString(date) {
  return date.toLocaleString('ja-JP', { 
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

// 指定時刻まで待機する関数
async function waitUntil(targetTime, callback) {
  const now = new Date();
  const target = new Date(targetTime);
  
  // ミリ秒単位での待機時間を計算
  const waitMs = target.getTime() - now.getTime();
  
  // 指定時刻が過去の場合
  if (waitMs <= 0) {
    log(`指定時刻(${getJapanTimeString(target)})は既に過ぎています。今すぐ実行します。`);
    callback();
    return;
  }
  
  log(`販売開始時刻(${getJapanTimeString(target)})まで ${Math.floor(waitMs / 1000)} 秒待機します...`);
  log(`現在時刻: ${getJapanTimeString(now)} / 実行予定時刻: ${getJapanTimeString(target)}`);
  
  // 残り時間が5分以上なら1分ごとにログ出力
  if (waitMs > 300000) {
    const minuteInterval = setInterval(() => {
      const remainMs = target.getTime() - new Date().getTime();
      const remainMinutes = Math.floor(remainMs / 60000);
      const remainSeconds = Math.floor((remainMs % 60000) / 1000);
      
      if (remainMs <= 60000) {
        clearInterval(minuteInterval);
        log(`残り ${remainSeconds} 秒で実行開始します...`);
      } else {
        log(`残り ${remainMinutes} 分 ${remainSeconds} 秒で実行開始します...`);
      }
    }, 60000);
  }
  
  // 残り時間が1分以内なら10秒ごとにログ出力
  if (waitMs <= 60000) {
    const secondInterval = setInterval(() => {
      const remainMs = target.getTime() - new Date().getTime();
      if (remainMs <= 10000) {
        clearInterval(secondInterval);
        log(`間もなく実行します... 残り約 ${Math.ceil(remainMs / 1000)} 秒`);
      } else {
        log(`残り約 ${Math.floor(remainMs / 1000)} 秒で実行開始します...`);
      }
    }, 10000);
  }
  
  // setTimeout を使って指定時刻まで待機
  return new Promise(resolve => {
    setTimeout(() => {
      log(`指定時刻(${getJapanTimeString(target)})になりました。実行を開始します。`);
      callback();
      resolve();
    }, waitMs);
  });
}

// コマンドライン引数からオプションを抽出する関数
function parseOptions(args) {
  const options = [];
  const filePaths = [];
  
  for (const arg of args) {
    if (arg.startsWith('--')) {
      options.push(arg);
    } else {
      filePaths.push(arg);
    }
  }
  
  return { options, filePaths };
}

// 購入スクリプトを実行する関数
function executePurchaseScript(infoFilePath, extraOptions = []) {
  const scriptPath = path.join(__dirname, 'auto-purchase.js');
  
  if (!fs.existsSync(scriptPath)) {
    log(`購入スクリプト ${scriptPath} が見つかりません。`, 'error');
    return;
  }
  
  log(`購入スクリプト ${scriptPath} を実行します...`);
  
  // コマンドライン引数を構築
  const args = [scriptPath];
  
  // 情報ファイルパスを追加
  if (infoFilePath) {
    args.push(infoFilePath);
  }
  
  // 追加オプションがあれば追加
  if (extraOptions && extraOptions.length > 0) {
    args.push(...extraOptions);
    
    // オプションのログ出力
    const optionsStr = extraOptions.join(' ');
    log(`追加オプション: ${optionsStr}`);
  }
  
  // 子プロセスを作成して実行
  const child = spawn('node', args, {
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  
  // 実行プロセスのPIDをログに出力
  log(`購入スクリプトを実行しました (PID: ${child.pid})`);
  
  // 標準出力を処理
  child.stdout.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => {
      log(`[PURCHASE] ${line}`);
    });
  });
  
  // 標準エラー出力を処理
  child.stderr.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => {
      log(`[PURCHASE ERROR] ${line}`, 'error');
    });
  });
  
  // プロセス終了時の処理
  child.on('close', (code) => {
    if (code === 0) {
      log(`購入スクリプト(PID: ${child.pid})が正常終了しました。`, 'success');
    } else {
      log(`購入スクリプト(PID: ${child.pid})が異常終了しました。終了コード: ${code}`, 'error');
    }
  });
  
  // 親プロセスが終了しても子プロセスは実行し続ける
  child.unref();
}

// 指定されたJSONファイルから実行スケジュールを設定
function scheduleFromFile(filePath, options = []) {
  try {
    log(`購入情報ファイル ${filePath} を読み込みます...`);
    
    if (!fs.existsSync(filePath)) {
      log(`ファイル ${filePath} が見つかりません。`, 'error');
      return false;
    }
    
    const data = fs.readFileSync(filePath, 'utf8');
    const purchaseInfo = JSON.parse(data);
    
    // 販売開始時刻の取得 (saleTime または saleStartTime を使用)
    const saleTime = purchaseInfo.saleTime || purchaseInfo.saleStartTime;
    
    if (!saleTime) {
      log(`販売開始時刻が指定されていません。ファイル: ${filePath}`, 'warning');
      return false;
    }
    
    log(`販売開始時刻 ${saleTime} でスケジュールを設定します。ファイル: ${filePath}`);
    
    // 実行時刻になったらスクリプトを実行
    waitUntil(saleTime, () => {
      executePurchaseScript(filePath, options);
    });
    
    return true;
  } catch (error) {
    log(`スケジュール設定中にエラーが発生しました: ${error.message}`, 'error');
    return false;
  }
}

// 複数の購入情報ファイルを処理
async function processMultipleFiles(pattern = 'purchase-info*.json', options = []) {
  try {
    const files = await glob(pattern, { cwd: __dirname });
    
    if (files.length === 0) {
      log(`パターン ${pattern} に一致するファイルが見つかりません。`, 'warning');
      return false;
    }
    
    log(`${files.length} 件の購入情報ファイルを処理します...`);
    
    let successCount = 0;
    
    for (const file of files) {
      const filePath = path.join(__dirname, file);
      const success = scheduleFromFile(filePath, options);
      if (success) successCount++;
    }
    
    log(`${successCount}/${files.length} 件のスケジュール設定に成功しました。`);
    return successCount > 0;
  } catch (error) {
    log(`ファイル検索中にエラーが発生しました: ${error.message}`, 'error');
    return false;
  }
}

// メイン処理
async function main() {
  // 起動メッセージ
  log('購入スケジューラーを起動しました');
  log(`現在の日時: ${getJapanTimeString(new Date())}`);
  
  // コマンドライン引数を解析
  const args = process.argv.slice(2);
  const { options, filePaths } = parseOptions(args);
  
  // --all オプションが指定された場合は全ファイルを処理
  if (options.includes('--all')) {
    log('全ての購入情報ファイルを処理します...');
    const success = await processMultipleFiles('purchase-info*.json', options);
    
    if (!success) {
      log('有効な購入情報ファイルが見つからないか、処理に失敗しました。', 'warning');
      process.exit(1);
    }
    return;
  }
  
  // 特定のファイルが指定された場合
  if (filePaths.length > 0) {
    const filePath = path.resolve(filePaths[0]);
    const success = scheduleFromFile(filePath, options);
    
    if (!success) {
      log(`指定されたファイル ${filePath} の処理に失敗しました。`, 'error');
      process.exit(1);
    }
    return;
  }
  
  // ファイルが指定されなかった場合は、デフォルトの purchase-info.json を使用
  const defaultPath = path.join(__dirname, 'purchase-info.json');
  
  if (fs.existsSync(defaultPath)) {
    const success = scheduleFromFile(defaultPath, options);
    
    if (!success) {
      log('デフォルトファイルの処理に失敗しました。', 'error');
      process.exit(1);
    }
  } else {
    // デフォルトファイルがない場合は複数ファイルのパターンで検索
    log('デフォルトの purchase-info.json が見つかりません。複数ファイルを検索します...');
    const success = await processMultipleFiles('purchase-info*.json', options);
    
    if (!success) {
      log('有効な購入情報ファイルが見つかりませんでした。', 'warning');
      process.exit(1);
    }
  }
}

// スクリプト実行
main().catch(error => {
  log(`予期せぬエラーが発生しました: ${error.message}`, 'error');
  process.exit(1);
}); 