const puppeteer = require('puppeteer');
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

// 指定した時刻まで待機する関数
async function waitUntil(targetTime) {
  const now = new Date();
  const target = new Date(targetTime);
  
  // 指定時刻が過去の場合はすぐに実行
  if (now >= target) {
    log(`指定時刻(${targetTime})は既に過ぎています。すぐに実行します。`);
    return;
  }
  
  const waitMs = target.getTime() - now.getTime();
  log(`販売開始時刻(${targetTime})まで ${Math.floor(waitMs / 1000)} 秒待機します...`);
  
  // 残り時間が5分以上なら1分ごとにログ出力
  if (waitMs > 300000) {
    const intervalId = setInterval(() => {
      const remainMs = target.getTime() - new Date().getTime();
      if (remainMs <= 60000) {
        clearInterval(intervalId);
        log(`残り ${Math.floor(remainMs / 1000)} 秒で実行開始します...`);
      } else {
        log(`残り ${Math.floor(remainMs / 60000)} 分 ${Math.floor((remainMs % 60000) / 1000)} 秒で実行開始します...`);
      }
    }, 60000);
  }
  
  return new Promise(resolve => {
    setTimeout(() => {
      log(`指定時刻(${targetTime})になりました。実行を開始します。`);
      resolve();
    }, waitMs);
  });
}

// メイン処理
async function autoPurchase() {
  // ログファイル名の生成
  const logFileName = generateLogFileName();
  let purchaseUrl = 'unknown';
  
  // 処理開始時刻を記録
  const startTime = new Date().toISOString();
  purchaseLog(`[START] ${startTime}`, logFileName);
  
  // 購入情報の読み込み
  let purchaseInfo;
  try {
    // 異なるパスから情報を読み込めるようにする
    // 1. コマンドライン引数から指定されたパス
    // 2. localStorage から保存された情報
    // 3. デフォルトの purchase-info.json
    
    const infoPath = process.argv[2] || path.join(__dirname, 'purchase-info.json');
    
    if (process.argv[2]) {
      log(`指定されたパス ${infoPath} から購入情報を読み込みます`);
    } else {
      log(`デフォルトパス ${infoPath} から購入情報を読み込みます`);
    }
    
    if (fs.existsSync(infoPath)) {
      const data = fs.readFileSync(infoPath, 'utf8');
      purchaseInfo = JSON.parse(data);
    } else if (typeof localStorage !== 'undefined') {
      // ブラウザ環境の場合、localStorageから読み込む
      log('LocalStorageから購入情報を読み込みます');
      const data = localStorage.getItem('ticketFormData');
      if (data) {
        purchaseInfo = JSON.parse(data);
      } else {
        throw new Error('LocalStorage に購入情報が保存されていません');
      }
    } else {
      throw new Error(`購入情報ファイルが見つかりません: ${infoPath}`);
    }
    
    log('購入情報の読み込みに成功しました');
    
    // URLが設定されていればログに記録
    if (purchaseInfo.url) {
      purchaseUrl = purchaseInfo.url;
      purchaseLog(`[URL] ${purchaseUrl}`, logFileName);
    }
  } catch (error) {
    const errorMessage = `購入情報の読み込みに失敗しました: ${error.message}`;
    log(errorMessage, 'error');
    
    // 失敗ログの記録
    purchaseLog(`[STATUS] FAILED`, logFileName);
    purchaseLog(`[ERROR] ${errorMessage}`, logFileName);
    purchaseLog(`[END] ${new Date().toISOString()}`, logFileName);
    process.exit(1);
  }
  
  // 実行時引数からヘッドレスモードを決定
  const headless = process.argv.includes('--headless') ? 'new' : false;
  
  // ブラウザの起動
  log('ブラウザを起動しています...');
  const browser = await puppeteer.launch({
    headless: headless,
    defaultViewport: null,
    args: [
      '--window-size=1280,920',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process'
    ]
  });
  
  // 新しいページを開く
  const page = await browser.newPage();
  
  // ユーザーエージェントの設定
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
  
  // タイムアウトの設定
  page.setDefaultNavigationTimeout(60000); // 60秒
  
  try {
    // ログイン処理
    await login(page, purchaseInfo);
    
    // 販売ページにアクセス
    await accessTicketPage(page, purchaseInfo);
    
    // URLを更新して記録（実際にアクセスしたURLに更新）
    const actualUrl = page.url();
    if (actualUrl && actualUrl !== purchaseUrl) {
      purchaseUrl = actualUrl;
      purchaseLog(`[URL] ${purchaseUrl}`, logFileName);
    }
    
    // チケット選択
    await selectTicket(page, purchaseInfo);
    
    // 購入者情報入力
    await inputPurchaserInfo(page, purchaseInfo);
    
    // 支払い方法と配送方法の選択
    await selectPaymentAndDelivery(page, purchaseInfo);
    
    // 申し込みボタン押下
    await submitPurchase(page);
    
    log('チケット購入処理が正常に完了しました！', 'success');
    
    // 成功ログの記録
    purchaseLog(`[STATUS] SUCCESS`, logFileName);
  } catch (error) {
    const errorMessage = `エラーが発生しました: ${error.message}`;
    log(errorMessage, 'error');
    
    // 失敗ログの記録
    purchaseLog(`[STATUS] FAILED`, logFileName);
    purchaseLog(`[ERROR] ${errorMessage}`, logFileName);
    
    // CAPTCHAの検出
    if (error.message.includes('CAPTCHA')) {
      log('CAPTCHAが検出されました。手動での操作をお願いします。', 'warning');
      
      // ユーザーの入力を待つ
      log('処理を続行するには何かキーを押してください...');
      process.stdin.setRawMode(true);
      process.stdin.resume();
      await new Promise(resolve => process.stdin.once('data', () => {
        process.stdin.setRawMode(false);
        resolve();
      }));
      
      // 手動操作後に処理を再開
      log('処理を再開します...');
      try {
        await continuePurchaseAfterCaptcha(page, purchaseInfo);
        // CAPTCHA対応後に成功した場合
        purchaseLog(`[STATUS] SUCCESS`, logFileName);
      } catch (continuationError) {
        // CAPTCHA対応後も失敗した場合
        const continuationErrorMessage = `CAPTCHA対応後も失敗しました: ${continuationError.message}`;
        log(continuationErrorMessage, 'error');
        purchaseLog(`[ERROR] ${continuationErrorMessage}`, logFileName);
      }
    }
  } finally {
    // スクリーンショット撮影
    await page.screenshot({ path: path.join(__dirname, 'purchase-result.png') });
    
    // 終了時刻を記録
    purchaseLog(`[END] ${new Date().toISOString()}`, logFileName);
    
    // 処理が完了したらブラウザを閉じる（ヘッドレスモードの場合のみ）
    if (headless === 'new') {
      await browser.close();
    } else {
      log('ブラウザを開いたままにしています。確認後、手動で閉じてください。');
    }
  }
}

// ログイン処理
async function login(page, info) {
  log('ログインページにアクセスしています...');
  await page.goto('https://l-tike.com/login');
  
  // ログインフォームが表示されるまで待機
  await page.waitForSelector('#login_mail');
  
  log('ログイン情報を入力しています...');
  await page.type('#login_mail', info.email);
  await page.type('#login_pass', info.password);
  
  // ログインボタンをクリック
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0' }),
    page.click('input[type="submit"]')
  ]);
  
  // ログイン成功の確認
  try {
    // マイページなどのログイン後の要素を確認
    await page.waitForSelector('.user-menu', { timeout: 5000 });
    log('ログインに成功しました');
  } catch (error) {
    // CAPTCHAの確認
    const content = await page.content();
    if (content.includes('captcha') || content.includes('CAPTCHA')) {
      throw new Error('CAPTCHA が検出されました。手動での対応が必要です。');
    }
    
    // その他のログインエラー
    log('ログインに失敗しました', 'error');
    throw new Error('ログインに失敗しました。メールアドレスとパスワードを確認してください。');
  }
}

// チケット販売ページにアクセス
async function accessTicketPage(page, info) {
  log(`チケット販売ページ(${info.url})にアクセスしています...`);
  
  const response = await page.goto(info.url, { waitUntil: 'networkidle0' });
  
  // サーバーエラーのチェック
  if (response.status() >= 500) {
    log(`サーバーエラーが発生しました: ${response.status()}`, 'error');
    throw new Error(`サーバーエラー: ${response.status()}`);
  }
  
  // 「まだ販売開始していません」などのメッセージをチェック
  const pageContent = await page.content();
  if (pageContent.includes('販売開始前') || pageContent.includes('まだ販売していません')) {
    log('販売がまだ開始されていません。リロードして再試行します...', 'warning');
    
    // リトライ処理
    let retryCount = 0;
    const maxRetries = 10;
    
    while (retryCount < maxRetries) {
      log(`リトライ中... (${retryCount + 1}/${maxRetries})`);
      await page.waitForTimeout(3000); // 3秒待機
      await page.reload({ waitUntil: 'networkidle0' });
      
      const newContent = await page.content();
      if (!newContent.includes('販売開始前') && !newContent.includes('まだ販売していません')) {
        log('販売ページが正常に表示されました');
        break;
      }
      
      retryCount++;
      
      if (retryCount >= maxRetries) {
        throw new Error('販売ページの読み込みに失敗しました。販売開始時間を確認してください。');
      }
    }
  }
  
  log('チケット販売ページにアクセスしました');
}

// チケット選択
async function selectTicket(page, info) {
  log('チケットを選択しています...');
  
  try {
    // 席種選択のセレクタ（実際のページに合わせて調整が必要）
    await page.waitForSelector('.seat-type-selection', { timeout: 10000 });
    
    // 指定された席種を探す
    const seatTypes = await page.$$('.seat-type-item');
    let seatFound = false;
    
    for (const seatElement of seatTypes) {
      const seatText = await page.evaluate(el => el.textContent, seatElement);
      if (seatText.includes(info.seat)) {
        await seatElement.click();
        seatFound = true;
        log(`席種「${info.seat}」を選択しました`);
        break;
      }
    }
    
    if (!seatFound) {
      log(`指定された席種「${info.seat}」が見つかりませんでした。最初の席種を選択します。`, 'warning');
      if (seatTypes.length > 0) {
        await seatTypes[0].click();
      } else {
        throw new Error('選択可能な席種が見つかりませんでした');
      }
    }
    
    // 枚数選択
    await page.waitForSelector('select.ticket-quantity', { timeout: 5000 });
    await page.select('select.ticket-quantity', info.quantity.toString());
    log(`${info.quantity}枚を選択しました`);
    
    // 次へボタンクリック
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
      page.click('.next-button')
    ]);
    
    log('チケット選択が完了しました');
  } catch (error) {
    // セレクタが見つからない場合、ページ構造が異なる可能性がある
    log(`チケット選択中にエラーが発生しました: ${error.message}`, 'error');
    log('ページ構造に合わせて手動で選択操作を行ってください', 'warning');
    
    // スクリーンショットを撮る
    await page.screenshot({ path: path.join(__dirname, 'ticket-selection-error.png') });
    throw new Error('チケット選択に失敗しました');
  }
}

// 購入者情報入力
async function inputPurchaserInfo(page, info) {
  log('購入者情報を入力しています...');
  
  try {
    // 氏名入力
    await page.waitForSelector('input[name="name"]', { timeout: 5000 });
    await page.type('input[name="name"]', info.name);
    
    // 電話番号入力
    await page.type('input[name="tel"]', info.phone);
    
    // 生年月日入力（フォーマットに注意、実際のページに合わせる必要あり）
    const birthParts = info.birth.split('-');
    await page.select('select[name="birth_year"]', birthParts[0]);
    await page.select('select[name="birth_month"]', birthParts[1].replace(/^0/, '')); // 先頭の0を削除
    await page.select('select[name="birth_day"]', birthParts[2].replace(/^0/, '')); // 先頭の0を削除
    
    // 次へボタンクリック
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
      page.click('.next-button')
    ]);
    
    log('購入者情報の入力が完了しました');
  } catch (error) {
    log(`購入者情報入力中にエラーが発生しました: ${error.message}`, 'error');
    throw new Error('購入者情報の入力に失敗しました');
  }
}

// 支払い方法と配送方法の選択
async function selectPaymentAndDelivery(page, info) {
  log('支払い方法と配送方法を選択しています...');
  
  try {
    // 支払い方法の選択
    await page.waitForSelector('.payment-method-selection', { timeout: 5000 });
    
    const paymentMethods = await page.$$('.payment-method-item');
    let paymentFound = false;
    
    for (const paymentElement of paymentMethods) {
      const paymentText = await page.evaluate(el => el.textContent, paymentElement);
      if (paymentText.includes(info.payment)) {
        await paymentElement.click();
        paymentFound = true;
        log(`支払い方法「${info.payment}」を選択しました`);
        break;
      }
    }
    
    if (!paymentFound) {
      log(`指定された支払い方法「${info.payment}」が見つかりませんでした。最初の選択肢を選びます。`, 'warning');
      if (paymentMethods.length > 0) {
        await paymentMethods[0].click();
      }
    }
    
    // 配送方法の選択
    await page.waitForSelector('.delivery-method-selection', { timeout: 5000 });
    
    const deliveryMethods = await page.$$('.delivery-method-item');
    let deliveryFound = false;
    
    for (const deliveryElement of deliveryMethods) {
      const deliveryText = await page.evaluate(el => el.textContent, deliveryElement);
      if (deliveryText.includes(info.delivery)) {
        await deliveryElement.click();
        deliveryFound = true;
        log(`配送方法「${info.delivery}」を選択しました`);
        break;
      }
    }
    
    if (!deliveryFound) {
      log(`指定された配送方法「${info.delivery}」が見つかりませんでした。最初の選択肢を選びます。`, 'warning');
      if (deliveryMethods.length > 0) {
        await deliveryMethods[0].click();
      }
    }
    
    // 次へボタンクリック
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
      page.click('.next-button')
    ]);
    
    log('支払い方法と配送方法の選択が完了しました');
  } catch (error) {
    log(`支払い・配送方法選択中にエラーが発生しました: ${error.message}`, 'error');
    throw new Error('支払い・配送方法の選択に失敗しました');
  }
}

// 申し込みボタン押下
async function submitPurchase(page) {
  log('申し込み内容を確認しています...');
  
  try {
    // 申し込み内容確認ページの表示を確認
    await page.waitForSelector('.confirm-page', { timeout: 5000 });
    
    // 利用規約同意のチェックボックスがあれば選択
    const hasAgreement = await page.$('.agreement-checkbox');
    if (hasAgreement) {
      await page.click('.agreement-checkbox');
      log('利用規約に同意しました');
    }
    
    // 申し込みボタンをクリック
    log('【重要】申し込みボタンをクリックします...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
      page.click('.apply-button')
    ]);
    
    // 完了ページの確認
    const pageUrl = page.url();
    if (pageUrl.includes('complete') || pageUrl.includes('finish')) {
      log('チケットの申し込みが完了しました！', 'success');
    } else {
      log('申し込み後のページが期待したURLではありません', 'warning');
    }
  } catch (error) {
    log(`申し込み処理中にエラーが発生しました: ${error.message}`, 'error');
    throw new Error('申し込み処理に失敗しました');
  }
}

// CAPTCHA後に処理を継続
async function continuePurchaseAfterCaptcha(page, info) {
  log('CAPTCHA対応後に処理を継続します...');
  
  try {
    // 現在のURLをチェックして適切な処理を続行
    const currentUrl = page.url();
    
    if (currentUrl.includes('login')) {
      // ログインページにいる場合
      await login(page, info);
      await accessTicketPage(page, info);
      await selectTicket(page, info);
      await inputPurchaserInfo(page, info);
      await selectPaymentAndDelivery(page, info);
      await submitPurchase(page);
    } else if (currentUrl.includes(info.url)) {
      // チケットページにいる場合
      await selectTicket(page, info);
      await inputPurchaserInfo(page, info);
      await selectPaymentAndDelivery(page, info);
      await submitPurchase(page);
    } else if (currentUrl.includes('select')) {
      // チケット選択ページにいる場合
      await selectTicket(page, info);
      await inputPurchaserInfo(page, info);
      await selectPaymentAndDelivery(page, info);
      await submitPurchase(page);
    } else if (currentUrl.includes('info')) {
      // 情報入力ページにいる場合
      await inputPurchaserInfo(page, info);
      await selectPaymentAndDelivery(page, info);
      await submitPurchase(page);
    } else if (currentUrl.includes('payment')) {
      // 支払い方法選択ページにいる場合
      await selectPaymentAndDelivery(page, info);
      await submitPurchase(page);
    } else if (currentUrl.includes('confirm')) {
      // 確認ページにいる場合
      await submitPurchase(page);
    } else {
      log('現在のページに対応する処理が見つかりません', 'warning');
    }
  } catch (error) {
    log(`CAPTCHA後の処理継続中にエラーが発生しました: ${error.message}`, 'error');
    throw error;
  }
}

// スケジュール実行するか即時実行するか
if (process.argv.includes('--schedule')) {
  // 購入情報からスケジュール時間を取得
  try {
    const infoPath = process.argv[3] || path.join(__dirname, 'purchase-info.json');
    const data = fs.readFileSync(infoPath, 'utf8');
    const purchaseInfo = JSON.parse(data);
    
    if (purchaseInfo.saleStartTime) {
      waitUntil(purchaseInfo.saleStartTime).then(autoPurchase);
    } else {
      log('販売開始時刻が指定されていません。すぐに実行します。');
      autoPurchase();
    }
  } catch (error) {
    log(`スケジュール設定に失敗しました: ${error.message}`, 'error');
    process.exit(1);
  }
} else {
  // 即時実行
  autoPurchase();
} 