const fs = require('fs');
const path = require('path');

/**
 * Reactフォームで保存された情報をPuppeteer用JSONに変換するスクリプト
 * 
 * 使用方法:
 * node form-to-json.js [出力ファイルパス]
 * 
 * 出力ファイルパスが指定されていない場合はpurchase-info.jsonに出力します。
 */

// LocalStorageからデータを読み取る関数（Node.js環境ではモック処理）
function getLocalStorageData() {
  // ブラウザのlocalStorageデータをエクスポートしたJSONファイルパス
  const localStoragePath = path.join(__dirname, 'localStorage-export.json');
  
  if (fs.existsSync(localStoragePath)) {
    try {
      const data = fs.readFileSync(localStoragePath, 'utf8');
      const localStorageData = JSON.parse(data);
      return localStorageData.ticketFormData || null;
    } catch (error) {
      console.error('LocalStorageデータの読み込みに失敗しました:', error);
      return null;
    }
  }
  
  return null;
}

// フォームデータを変換する関数
function convertFormData(formData) {
  // 文字列で渡された場合はオブジェクトに変換
  if (typeof formData === 'string') {
    try {
      formData = JSON.parse(formData);
    } catch (error) {
      console.error('JSONパースに失敗しました:', error);
      return null;
    }
  }
  
  // 変換処理
  return {
    url: formData.ticketUrl,
    email: formData.email,
    password: formData.password,
    quantity: parseInt(formData.quantity, 10) || 1,
    seat: formData.seatType,
    payment: formData.paymentMethod,
    delivery: formData.deliveryMethod,
    name: formData.name,
    phone: formData.phone.replace(/-/g, ''), // ハイフンを削除
    birth: formData.birthdate,
    saleStartTime: formData.saleStartTime // 販売開始時刻
  };
}

// メイン処理
function main() {
  // 出力先ファイルパスの取得
  const outputPath = process.argv[2] || path.join(__dirname, 'purchase-info.json');
  
  // フォームデータを取得
  let formData = null;
  
  // 1. 直接JSONファイルから読み込む
  const formDataPath = path.join(__dirname, '..', 'public', 'form-data.json');
  if (fs.existsSync(formDataPath)) {
    try {
      const data = fs.readFileSync(formDataPath, 'utf8');
      formData = JSON.parse(data);
      console.log('フォームデータファイルから情報を読み込みました');
    } catch (error) {
      console.error('フォームデータファイルの読み込みに失敗しました:', error);
    }
  }
  
  // 2. localStorage のエクスポートファイルから読み込む
  if (!formData) {
    const localStorageData = getLocalStorageData();
    if (localStorageData) {
      formData = JSON.parse(localStorageData);
      console.log('LocalStorageデータから情報を読み込みました');
    }
  }
  
  // データが取得できなかった場合
  if (!formData) {
    console.error('フォームデータが見つかりませんでした');
    console.error('以下のいずれかの方法でデータを用意してください:');
    console.error('1. public/form-data.json ファイルにフォームデータを保存');
    console.error('2. localStorage-export.json ファイルにlocalStorageデータをエクスポート');
    process.exit(1);
  }
  
  // データを変換
  const purchaseInfo = convertFormData(formData);
  if (!purchaseInfo) {
    console.error('データの変換に失敗しました');
    process.exit(1);
  }
  
  // 変換後のデータを出力
  try {
    fs.writeFileSync(outputPath, JSON.stringify(purchaseInfo, null, 2), 'utf8');
    console.log(`購入情報を ${outputPath} に保存しました`);
  } catch (error) {
    console.error('ファイルの書き込みに失敗しました:', error);
    process.exit(1);
  }
}

// スクリプト実行
main(); 