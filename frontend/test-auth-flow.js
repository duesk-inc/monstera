#!/usr/bin/env node

// 認証フローの手動テストスクリプト
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('=== 認証システム統合テスト ===\n');

console.log('テスト項目:');
console.log('1. ログイン後のユーザーメニュー表示確認');
console.log('2. ログアウト機能の動作確認');
console.log('3. ロール切り替え機能の動作確認');
console.log('4. ページリロード後の認証状態保持確認\n');

console.log('テスト手順:');
console.log('1. ブラウザで http://localhost:3000 を開く');
console.log('2. テストユーザーでログイン:');
console.log('   - Email: admin@example.com');
console.log('   - Password: Admin123!');
console.log('3. ログイン成功後、右上のユーザーメニューボタンを確認');
console.log('4. ユーザーメニューをクリックして以下を確認:');
console.log('   - ユーザー名が表示される');
console.log('   - メールアドレスが表示される');
console.log('   - 現在のロールが表示される');
console.log('   - ログアウトボタンが表示される');
console.log('5. ページをリロードして認証状態が保持されることを確認');
console.log('6. ログアウトボタンをクリックしてログアウトを確認\n');

const tests = [
  {
    name: 'ログイン後のユーザーメニュー表示',
    question: 'ログイン後、ユーザーメニューに情報が正しく表示されましたか？ (y/n): '
  },
  {
    name: 'ページリロード後の認証状態保持',
    question: 'ページリロード後も認証状態が保持されていますか？ (y/n): '
  },
  {
    name: 'ロール切り替え機能',
    question: '複数ロールがある場合、ロール切り替えは機能しますか？ (y/n/該当なし): '
  },
  {
    name: 'ログアウト機能',
    question: 'ログアウトボタンで正常にログアウトできましたか？ (y/n): '
  }
];

let results = [];
let currentTest = 0;

function askQuestion() {
  if (currentTest < tests.length) {
    rl.question(tests[currentTest].question, (answer) => {
      results.push({
        test: tests[currentTest].name,
        result: answer.toLowerCase()
      });
      currentTest++;
      askQuestion();
    });
  } else {
    console.log('\n=== テスト結果 ===');
    results.forEach(r => {
      const status = r.result === 'y' ? '✅ PASS' : 
                    r.result === '該当なし' ? '⏭️  SKIP' : '❌ FAIL';
      console.log(`${status} ${r.test}`);
    });
    
    const passed = results.filter(r => r.result === 'y').length;
    const failed = results.filter(r => r.result === 'n').length;
    const skipped = results.filter(r => r.result === '該当なし').length;
    
    console.log(`\n総合結果: ${passed}/${results.length - skipped} テスト成功`);
    
    if (failed > 0) {
      console.log('\n失敗したテストがあります。詳細を確認してください。');
    }
    
    rl.close();
  }
}

console.log('\n各テストを実行し、結果を入力してください:\n');
askQuestion();