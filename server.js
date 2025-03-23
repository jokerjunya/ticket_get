const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3001;

// JSONボディパーサー
app.use(express.json());

// 静的ファイルの提供（Reactビルド後のファイル）
app.use(express.static(path.join(__dirname, 'build')));

// CORS対応（本番環境でも必要）
app.use((req, res, next) => {
  // 環境変数からフロントエンドURLを取得、なければワイルドカード
  const allowedOrigins = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : ['*'];
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// リクエストロガー（デバッグ用）
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// 必要なディレクトリを確認・作成する関数
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    console.log(`ディレクトリが存在しないため作成します: ${dirPath}`);
    fs.mkdirSync(dirPath, { recursive: true });
    return true;
  }
  return false;
}

// ファイルの存在確認と作成する関数
function ensureFileExists(filePath, defaultContent = '{}') {
  if (!fs.existsSync(filePath)) {
    console.log(`ファイルが存在しないため作成します: ${filePath}`);
    fs.writeFileSync(filePath, defaultContent, { encoding: 'utf8' });
    return true;
  }
  return false;
}

// データディレクトリの設定
const dataDir = path.join(__dirname, 'data');
ensureDirectoryExists(dataDir);

// ユーザーデータファイルのパス
const usersFilePath = path.join(dataDir, 'users.json');
ensureFileExists(usersFilePath, JSON.stringify({ users: [] }));

// ヘルスチェックエンドポイント
app.get('/api/healthcheck', (req, res) => {
  console.log('ヘルスチェックリクエストを受信しました');
  res.status(200).json({ status: 'ok', message: 'サーバーは正常に動作しています' });
});

// ユーザー認証関連のエンドポイント ============================

// ログインAPI
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'メールアドレスとパスワードを入力してください' });
    }
    
    // ユーザーデータの読み込み
    let userData = { users: [] };
    try {
      const fileContent = fs.readFileSync(usersFilePath, 'utf8');
      userData = JSON.parse(fileContent);
    } catch (error) {
      console.error('ユーザーデータ読み込みエラー:', error);
    }
    
    // ユーザーの検索
    const user = userData.users.find(u => u.email === email);
    
    // 実際のシステムではパスワードのハッシュ化と比較を行うべき
    if (user && user.password === password) {
      // パスワードをレスポンスから除外
      const { password: _, ...userWithoutPassword } = user;
      
      // トークンの代わりにユーザーIDをセット（デモ用の簡易実装）
      return res.status(200).json({
        ...userWithoutPassword,
        token: `demo-token-${userWithoutPassword.id}`
      });
    }
    
    // ユーザーが存在しない場合、デモモードではデフォルトユーザーを作成
    if (email === 'demo@example.com' && password === 'demo123') {
      const demoUser = {
        id: 'demo-user-1',
        email: 'demo@example.com',
        name: 'デモユーザー',
        createdAt: new Date().toISOString()
      };
      
      // デモユーザーを保存
      userData.users.push({
        ...demoUser,
        password: 'demo123' // 実際のシステムではハッシュ化すべき
      });
      
      fs.writeFileSync(usersFilePath, JSON.stringify(userData, null, 2));
      
      return res.status(200).json({
        ...demoUser,
        token: `demo-token-${demoUser.id}`
      });
    }
    
    return res.status(401).json({ message: 'メールアドレスまたはパスワードが正しくありません' });
  } catch (error) {
    console.error('ログインエラー:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

// ユーザープロファイル管理 ============================

// プロファイル情報取得API
app.get('/api/user/profile', (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    
    if (!userId) {
      return res.status(401).json({ message: '認証されていません' });
    }
    
    // ユーザープロファイルファイルのパス
    const profilePath = path.join(dataDir, `user-${userId}.json`);
    
    // ファイルが存在しない場合は空のプロファイルを返す
    if (!fs.existsSync(profilePath)) {
      return res.status(200).json({});
    }
    
    // ファイルの内容を読み込んで返す
    const profileData = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
    
    // パスワードなどの機密情報を除外
    const { password, ...safeData } = profileData;
    
    res.status(200).json(safeData);
  } catch (error) {
    console.error('プロファイル取得エラー:', error);
    res.status(500).json({ message: 'プロファイル情報の取得に失敗しました' });
  }
});

// プロファイル情報更新API
app.post('/api/user/profile', (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    
    if (!userId) {
      return res.status(401).json({ message: '認証されていません' });
    }
    
    const profileData = req.body;
    
    // ユーザープロファイルファイルのパス
    const profilePath = path.join(dataDir, `user-${userId}.json`);
    
    // 既存のデータと統合
    let existingData = {};
    if (fs.existsSync(profilePath)) {
      try {
        existingData = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
      } catch (e) {
        console.error('既存プロファイルの読み込みエラー:', e);
      }
    }
    
    // 新しいデータで更新
    const updatedData = {
      ...existingData,
      ...profileData,
      updatedAt: new Date().toISOString()
    };
    
    // ファイルに保存
    fs.writeFileSync(profilePath, JSON.stringify(updatedData, null, 2));
    
    // user-info.json にも同じ情報を保存（互換性のため）
    const userInfoPath = path.join(__dirname, 'scripts', 'user-info.json');
    fs.writeFileSync(userInfoPath, JSON.stringify(updatedData, null, 2));
    
    res.status(200).json({ message: 'プロファイル情報を更新しました' });
  } catch (error) {
    console.error('プロファイル更新エラー:', error);
    res.status(500).json({ message: 'プロファイル情報の更新に失敗しました' });
  }
});

// ユーザープロファイル保存API（ファイルに直接保存する簡易実装）
app.post('/api/user/save-profile', (req, res) => {
  try {
    const profileData = req.body;
    
    // user-info.json にデータを保存
    const userInfoPath = path.join(__dirname, 'scripts', 'user-info.json');
    
    // scriptsディレクトリの確認
    ensureDirectoryExists(path.join(__dirname, 'scripts'));
    
    fs.writeFileSync(userInfoPath, JSON.stringify(profileData, null, 2));
    
    res.status(200).json({ message: 'ユーザー情報をファイルに保存しました' });
  } catch (error) {
    console.error('ファイル保存エラー:', error);
    res.status(500).json({ message: 'ユーザー情報のファイル保存に失敗しました' });
  }
});

// イベント情報管理 ============================

// イベント情報取得API
app.get('/api/event/info', (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    
    // イベント情報ファイルのパス
    let eventFilePath;
    
    if (userId) {
      // ログイン済みの場合はユーザー固有のファイル
      eventFilePath = path.join(dataDir, `event-${userId}.json`);
    } else {
      // 非ログイン時は汎用ファイル
      eventFilePath = path.join(__dirname, 'scripts', 'event-info.json');
    }
    
    // ファイルが存在しない場合は空のデータを返す
    if (!fs.existsSync(eventFilePath)) {
      return res.status(200).json({});
    }
    
    // ファイルの内容を読み込んで返す
    const eventData = JSON.parse(fs.readFileSync(eventFilePath, 'utf8'));
    
    res.status(200).json(eventData);
  } catch (error) {
    console.error('イベント情報取得エラー:', error);
    res.status(500).json({ message: 'イベント情報の取得に失敗しました' });
  }
});

// イベント情報保存API
app.post('/api/event/save', (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    const eventData = req.body;
    
    // イベント情報ファイルのパス
    let eventFilePath;
    
    if (userId) {
      // ログイン済みの場合はユーザー固有のファイル
      eventFilePath = path.join(dataDir, `event-${userId}.json`);
    } else {
      // 非ログイン時は汎用ファイル
      eventFilePath = path.join(__dirname, 'scripts', 'event-info.json');
    }
    
    // scriptsディレクトリの確認
    ensureDirectoryExists(path.join(__dirname, 'scripts'));
    
    // ファイルに保存
    fs.writeFileSync(eventFilePath, JSON.stringify({
      ...eventData,
      updatedAt: new Date().toISOString()
    }, null, 2));
    
    res.status(200).json({ message: 'イベント情報を保存しました' });
  } catch (error) {
    console.error('イベント情報保存エラー:', error);
    res.status(500).json({ message: 'イベント情報の保存に失敗しました' });
  }
});

// イベント情報をURLから解析するエンドポイント
app.post('/api/parse-event', async (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URLが指定されていません' });
  }
  
  console.log(`イベント情報解析リクエスト: ${url}`);
  
  // URLがローソンチケットのものか確認
  if (!url.includes('l-tike.com')) {
    return res.status(400).json({ error: 'ローソンチケットのURLではありません' });
  }
  
  try {
    // ここではサンプルの応答を返す
    // 実際にはPuppeteerなどを使ってURLからイベント情報をスクレイピングする
    const mockData = {
      title: 'サンプルコンサート2023',
      venue: '東京ドーム',
      date: '2023/12/31',
      saleStartTime: '2023-05-01T10:00',
      seatType: 'S席',
      quantity: 2,
      url: url,
    };
    
    // 実際のスクレイピング実装は以下のようなコードになる
    /*
    // Puppeteerでページを開く
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    
    // ページからイベント情報を抽出
    const title = await page.$eval('.event-title', el => el.textContent.trim()).catch(() => 'タイトル不明');
    const venue = await page.$eval('.venue-name', el => el.textContent.trim()).catch(() => '');
    const date = await page.$eval('.performance-date', el => el.textContent.trim()).catch(() => '');
    
    // 販売開始日時の処理（例）
    let saleStartTime = '';
    try {
      const saleStartText = await page.$eval('.sale-start-datetime', el => el.textContent.trim());
      // テキストから日時を抽出してフォーマット
      const match = saleStartText.match(/(\d{4})年(\d{1,2})月(\d{1,2})日\s*(\d{1,2}):(\d{2})/);
      if (match) {
        const [_, year, month, day, hour, minute] = match;
        saleStartTime = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute}`;
      }
    } catch (e) {
      console.error('販売開始時刻の取得に失敗:', e);
    }
    
    // ブラウザを閉じる
    await browser.close();
    
    const eventData = {
      title,
      venue,
      date,
      saleStartTime,
      seatType: '',  // ページから取得できない場合は空文字
      quantity: 2,   // デフォルト値を設定
      url: url,
    };
    */
    
    // 処理の遅延をシミュレート（実際のスクレイピングには時間がかかる）
    setTimeout(() => {
      res.json(mockData);
    }, 2000);
    
  } catch (error) {
    console.error('イベント情報解析エラー:', error);
    res.status(500).json({ error: 'イベント情報の解析に失敗しました' });
  }
});

// テスト実行関連 ============================

// テスト情報保存APIエンドポイント
app.post('/api/save-test-info', (req, res) => {
  try {
    console.log('テスト情報保存リクエストを受信しました:', JSON.stringify(req.body).substring(0, 100) + '...');
    
    const testData = req.body;
    const filePath = path.join(__dirname, 'scripts', 'test-info.json');
    
    // テストデータをJSONファイルに保存
    fs.writeFileSync(filePath, JSON.stringify(testData, null, 2));
    
    console.log(`テスト情報を保存しました: ${filePath}`);
    res.status(200).json({ message: 'テスト情報を保存しました' });
  } catch (error) {
    console.error('テスト情報保存エラー:', error);
    res.status(500).json({ error: error.message });
  }
});

// テスト実行APIエンドポイント
app.get('/api/run-purchase-test', (req, res) => {
  try {
    console.log('テスト実行リクエストを受信しました');
    const scriptPath = path.join(__dirname, 'scripts', 'purchase-test.js');
    
    // スクリプトファイルの存在確認
    if (!fs.existsSync(scriptPath)) {
      console.error(`テストスクリプトファイルが見つかりません: ${scriptPath}`);
      return res.status(404).json({ 
        testResult: false, 
        message: `テストスクリプトファイルが見つかりません: ${scriptPath}` 
      });
    }
    
    // Node.jsスクリプトを子プロセスとして実行
    const child = exec(`node ${scriptPath}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`テスト実行エラー: ${error.message}`);
        return res.status(500).json({ testResult: false, message: error.message });
      }
      
      if (stderr) {
        console.error(`テスト標準エラー: ${stderr}`);
      }
      
      console.log(`テスト標準出力: ${stdout}`);
      
      // 最後の行がJSON形式の結果であることを想定
      try {
        const outputLines = stdout.trim().split('\n');
        const lastLine = outputLines[outputLines.length - 1];
        const result = JSON.parse(lastLine);
        
        res.status(200).json(result);
      } catch (parseError) {
        console.error('テスト出力のパースエラー:', parseError);
        res.status(200).json({ 
          testResult: false, 
          message: '出力結果のパースに失敗しました' 
        });
      }
    });
  } catch (error) {
    console.error('テスト実行リクエストエラー:', error);
    res.status(500).json({ 
      testResult: false, 
      message: error.message 
    });
  }
});

// ユーティリティ関数 ============================

// リクエストからユーザーIDを取得する関数
function getUserIdFromRequest(req) {
  try {
    // Authorization ヘッダーからトークンを取得
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    const token = authHeader.split(' ')[1];
    
    // デモ用の簡易実装: トークンからユーザーIDを取得
    // 実際のシステムではJWTなどを使用して検証すべき
    if (token.startsWith('demo-token-')) {
      return token.replace('demo-token-', '');
    }
    
    return null;
  } catch (error) {
    console.error('ユーザーID取得エラー:', error);
    return null;
  }
}

// 最後に、すべてのルートがマッチしなかった場合はReactアプリを返す
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`サーバーを起動しました: http://localhost:${PORT}`);
  
  // 必要なディレクトリの存在を確認
  ensureDirectoryExists(path.join(__dirname, 'data'));
  ensureDirectoryExists(path.join(__dirname, 'scripts'));
  ensureDirectoryExists(path.join(__dirname, 'logs'));
  
  // ユーザーデータファイルの存在確認
  const usersFilePath = path.join(__dirname, 'data', 'users.json');
  const usersDefaultContent = JSON.stringify({ 
    users: [
      {
        id: "demo1",
        email: "demo@example.com",
        name: "デモユーザー",
        phone: "09012345678",
        birthdate: "1990-01-01",
        paymentMethod: "クレジットカード",
        deliveryMethod: "電子チケット"
      }
    ] 
  }, null, 2);
  
  if (ensureFileExists(usersFilePath, usersDefaultContent)) {
    console.log('デフォルトユーザーデータを作成しました');
  }
}); 