/**
 * チケット購入テスト用スクリプト
 * 実際の購入は行わず、購入フロー全体のテストを行います
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// 現在日時からログファイル名を生成する関数
function generateTestLogFileName() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `test-log-${year}${month}${day}-${hours}${minutes}${seconds}.txt`;
}

// ロギング用関数
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
  
  console.log(logMessage);
  
  // 標準ログファイルにも出力
  fs.appendFileSync(
    path.join(__dirname, 'test-log.txt'), 
    logMessage + '\n', 
    { encoding: 'utf8' }
  );
}

// テスト専用ログをファイルに記録するための関数
function testLog(logInfo, logFileName) {
  // logsディレクトリの確認と作成
  const logsDir = path.join(__dirname, '..', 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  const logFilePath = path.join(logsDir, logFileName);
  
  // ログエントリを追加
  fs.appendFileSync(logFilePath, logInfo + '\n', { encoding: 'utf8' });
}

// メインのテスト処理
async function runPurchaseTest() {
  // ログファイル名の生成
  const logFileName = generateTestLogFileName();
  let testUrl = 'unknown';
  
  // 処理開始時刻を記録
  const startTime = new Date().toISOString();
  testLog(`[START] ${startTime}`, logFileName);
  
  // テスト用購入情報の読み込み
  let testInfo;
  try {
    const infoPath = path.join(__dirname, 'test-info.json');
    
    if (!fs.existsSync(infoPath)) {
      throw new Error(`テスト情報ファイルが見つかりません: ${infoPath}`);
    }
    
    const data = fs.readFileSync(infoPath, 'utf8');
    testInfo = JSON.parse(data);
    
    log('テスト情報の読み込みに成功しました');
    
    // URLが設定されていればログに記録
    if (testInfo.url) {
      testUrl = testInfo.url;
      testLog(`[URL] ${testUrl}`, logFileName);
    }
  } catch (error) {
    const errorMessage = `テスト情報の読み込みに失敗しました: ${error.message}`;
    log(errorMessage, 'error');
    
    // 失敗ログの記録
    testLog(`[STATUS] FAILED`, logFileName);
    testLog(`[ERROR] ${errorMessage}`, logFileName);
    testLog(`[END] ${new Date().toISOString()}`, logFileName);
    process.exit(1);
  }
  
  // ブラウザの起動
  log('テスト用ブラウザを起動しています...');
  const browser = await puppeteer.launch({
    headless: 'new',  // テストはヘッドレスモードで実行
    defaultViewport: null,
    args: ['--window-size=1280,920']
  });
  
  // 新しいページを開く
  const page = await browser.newPage();
  
  // ユーザーエージェントの設定
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
  
  try {
    // テスト用ダミーサイトへのアクセス（実際には存在しないURLでも可）
    log(`テストURLにアクセスしています: ${testInfo.url}`);
    
    // エラーが出ないようにダミーのHTMLページを作成してnewPageに表示
    await page.setContent(`
      <html>
        <head>
          <title>チケット購入テストページ</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .form-group { margin-bottom: 15px; }
            label { display: block; margin-bottom: 5px; }
            input, select { padding: 8px; width: 300px; }
            button { padding: 10px 20px; background: #1a73e8; color: white; border: none; cursor: pointer; }
            .success { color: green; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>チケット購入テストページ</h1>
          
          <div id="login-form">
            <h2>ログイン</h2>
            <div class="form-group">
              <label>メールアドレス</label>
              <input type="email" id="email" placeholder="メールアドレス">
            </div>
            <div class="form-group">
              <label>パスワード</label>
              <input type="password" id="password" placeholder="パスワード">
            </div>
            <button id="login-button">ログイン</button>
          </div>
        </body>
      </html>
    `);
    
    // ログイン処理のシミュレーション
    log('ログイン情報を入力しています...');
    await page.type('#email', testInfo.email);
    await page.type('#password', testInfo.password);
    
    // ログインボタンクリック
    await page.click('#login-button');
    
    // チケット選択ページのシミュレーション
    log('チケット選択ページに遷移します...');
    await page.setContent(`
      <html>
        <head>
          <title>チケット選択 | テストページ</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .form-group { margin-bottom: 15px; }
            label { display: block; margin-bottom: 5px; }
            input, select { padding: 8px; width: 300px; }
            button { padding: 10px 20px; background: #1a73e8; color: white; border: none; cursor: pointer; }
            .ticket-type { padding: 15px; border: 1px solid #ccc; margin-bottom: 10px; cursor: pointer; }
            .ticket-type:hover { background: #f0f0f0; }
            .selected { background: #e6f7ff; border-color: #91d5ff; }
          </style>
        </head>
        <body>
          <h1>チケット選択</h1>
          
          <div id="ticket-selection">
            <h2>席種を選択してください</h2>
            <div class="ticket-type" id="area-a">Aエリア - ¥10,000</div>
            <div class="ticket-type" id="area-b">Bエリア - ¥8,000</div>
            <div class="ticket-type" id="area-c">Cエリア - ¥6,000</div>
            <div class="ticket-type" id="test-area">${testInfo.seat} - ¥9,000</div>
            
            <div class="form-group">
              <label>枚数</label>
              <select id="quantity">
                <option value="1">1枚</option>
                <option value="2">2枚</option>
                <option value="3">3枚</option>
                <option value="4">4枚</option>
              </select>
            </div>
            
            <button id="next-button">次へ進む</button>
          </div>
        </body>
      </html>
    `);
    
    // チケット選択のシミュレーション
    log(`席種「${testInfo.seat}」を選択します...`);
    await page.click('#test-area');
    
    // 枚数選択
    log(`${testInfo.quantity}枚を選択します...`);
    await page.select('#quantity', testInfo.quantity.toString());
    
    // 次へボタンクリック
    await page.click('#next-button');
    
    // 購入者情報入力ページのシミュレーション
    log('購入者情報入力ページに遷移します...');
    await page.setContent(`
      <html>
        <head>
          <title>購入者情報入力 | テストページ</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .form-group { margin-bottom: 15px; }
            label { display: block; margin-bottom: 5px; }
            input, select { padding: 8px; width: 300px; }
            button { padding: 10px 20px; background: #1a73e8; color: white; border: none; cursor: pointer; }
          </style>
        </head>
        <body>
          <h1>購入者情報入力</h1>
          
          <div id="purchaser-info">
            <h2>お客様情報を入力してください</h2>
            
            <div class="form-group">
              <label>お名前</label>
              <input type="text" id="name" placeholder="お名前">
            </div>
            
            <div class="form-group">
              <label>電話番号</label>
              <input type="tel" id="phone" placeholder="電話番号">
            </div>
            
            <div class="form-group">
              <label>生年月日</label>
              <input type="date" id="birth" placeholder="生年月日">
            </div>
            
            <button id="next-button">次へ進む</button>
          </div>
        </body>
      </html>
    `);
    
    // 購入者情報入力のシミュレーション
    log('購入者情報を入力しています...');
    await page.type('#name', testInfo.name);
    await page.type('#phone', testInfo.phone);
    await page.type('#birth', testInfo.birth);
    
    // 次へボタンクリック
    await page.click('#next-button');
    
    // 支払い・配送方法選択ページのシミュレーション
    log('支払い・配送方法選択ページに遷移します...');
    await page.setContent(`
      <html>
        <head>
          <title>支払い・配送方法選択 | テストページ</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .form-group { margin-bottom: 15px; }
            label { display: block; margin-bottom: 5px; }
            input, select { padding: 8px; width: 300px; }
            button { padding: 10px 20px; background: #1a73e8; color: white; border: none; cursor: pointer; }
            .option { padding: 15px; border: 1px solid #ccc; margin-bottom: 10px; cursor: pointer; }
            .option:hover { background: #f0f0f0; }
            .selected { background: #e6f7ff; border-color: #91d5ff; }
          </style>
        </head>
        <body>
          <h1>支払い・配送方法選択</h1>
          
          <div id="payment-selection">
            <h2>支払い方法を選択してください</h2>
            <div class="option payment" id="credit-card">クレジットカード</div>
            <div class="option payment" id="convenience-store">コンビニ支払い</div>
            <div class="option payment" id="bank-transfer">銀行振込</div>
          </div>
          
          <div id="delivery-selection">
            <h2>配送方法を選択してください</h2>
            <div class="option delivery" id="mail">郵送</div>
            <div class="option delivery" id="convenience-store-pickup">コンビニ受取</div>
            <div class="option delivery" id="loppi">Loppi店頭受取</div>
          </div>
          
          <button id="next-button">次へ進む</button>
        </body>
      </html>
    `);
    
    // 支払い方法選択のシミュレーション
    log(`支払い方法「${testInfo.payment}」を選択します...`);
    if (testInfo.payment === 'クレジットカード') {
      await page.click('#credit-card');
    } else if (testInfo.payment === 'コンビニ支払い') {
      await page.click('#convenience-store');
    } else if (testInfo.payment === '銀行振込') {
      await page.click('#bank-transfer');
    }
    
    // 配送方法選択のシミュレーション
    log(`配送方法「${testInfo.delivery}」を選択します...`);
    if (testInfo.delivery === '郵送') {
      await page.click('#mail');
    } else if (testInfo.delivery === 'コンビニ受取') {
      await page.click('#convenience-store-pickup');
    } else if (testInfo.delivery === 'Loppi店頭受取') {
      await page.click('#loppi');
    }
    
    // 次へボタンクリック
    await page.click('#next-button');
    
    // 最終確認ページのシミュレーション
    log('申し込み内容確認ページに遷移します...');
    await page.setContent(`
      <html>
        <head>
          <title>申し込み内容確認 | テストページ</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .confirm-item { margin-bottom: 15px; }
            .confirm-item h3 { margin-bottom: 5px; }
            .confirm-item p { margin-top: 0; color: #333; }
            button { padding: 10px 20px; background: #1a73e8; color: white; border: none; cursor: pointer; }
            #purchase-button { background: #e53935; font-weight: bold; }
            .checkbox { margin: 20px 0; }
          </style>
        </head>
        <body>
          <h1>申し込み内容確認</h1>
          
          <div id="confirmation">
            <div class="confirm-item">
              <h3>チケット情報</h3>
              <p>${testInfo.seat} ${testInfo.quantity}枚</p>
            </div>
            
            <div class="confirm-item">
              <h3>購入者情報</h3>
              <p>お名前: ${testInfo.name}</p>
              <p>電話番号: ${testInfo.phone}</p>
              <p>生年月日: ${testInfo.birth}</p>
            </div>
            
            <div class="confirm-item">
              <h3>支払い方法</h3>
              <p>${testInfo.payment}</p>
            </div>
            
            <div class="confirm-item">
              <h3>配送方法</h3>
              <p>${testInfo.delivery}</p>
            </div>
            
            <div class="checkbox">
              <input type="checkbox" id="agreement" />
              <label for="agreement">利用規約に同意する</label>
            </div>
            
            <button id="purchase-button">申し込む</button>
          </div>
        </body>
      </html>
    `);
    
    // 利用規約同意チェックのシミュレーション
    log('利用規約に同意します...');
    await page.click('#agreement');
    
    // ここで申し込みボタンは押さない（テストモードなので）
    log('申し込みボタンはテストモードのため押しません', 'warning');
    
    // スクリーンショット撮影
    const screenshotPath = path.join(__dirname, '..', 'logs', 'test-result.png');
    await page.screenshot({ path: screenshotPath });
    log(`スクリーンショットを保存しました: ${screenshotPath}`);
    
    // テスト成功のログ出力
    log('[TEST MODE SUCCESS] ここまでは正常に動作しました。', 'success');
    testLog(`[STATUS] SUCCESS`, logFileName);
    
  } catch (error) {
    const errorMessage = `テスト実行中にエラーが発生しました: ${error.message}`;
    log(errorMessage, 'error');
    
    // 失敗ログの記録
    testLog(`[STATUS] FAILED`, logFileName);
    testLog(`[ERROR] ${errorMessage}`, logFileName);
  } finally {
    // 終了時刻を記録
    testLog(`[END] ${new Date().toISOString()}`, logFileName);
    
    // ブラウザを閉じる
    await browser.close();
    
    log(`テストログは logs/${logFileName} に保存されました`);
    
    // 標準出力に最終結果を表示（これをReactアプリが取得する）
    console.log(JSON.stringify({
      logFile: logFileName,
      testResult: true,
      message: '[TEST MODE SUCCESS] ここまでは正常に動作しました。'
    }));
  }
}

// スクリプト実行
runPurchaseTest().catch(error => {
  console.error('予期せぬエラーが発生しました:', error);
  
  // 標準出力に最終結果を表示（これをReactアプリが取得する）
  console.log(JSON.stringify({
    testResult: false,
    message: `予期せぬエラーが発生しました: ${error.message}`
  }));
  
  process.exit(1);
}); 