// APIクライアント修正確認スクリプト
const fs = require('fs');
const path = require('path');

// 修正されたファイルを読み込み
const indexPath = path.join(__dirname, 'src/lib/api/index.ts');
const fileContent = fs.readFileSync(indexPath, 'utf-8');

// getAuthClient関数の実装を確認
const getAuthClientMatch = fileContent.match(/export const getAuthClient[^}]+\}/s);

if (getAuthClientMatch) {
    const funcBody = getAuthClientMatch[0];
    
    console.log('=== getAuthClient 関数の修正確認 ===\n');
    
    // 修正が正しく適用されているか確認
    if (funcBody.includes('return api;')) {
        console.log('✅ 修正済み: getAuthClient()はキャッシュされたインスタンス(api)を返します');
        console.log('\n該当コード:');
        console.log('----------');
        console.log(funcBody);
        console.log('----------');
        console.log('\n結果: 週報の一時保存・提出ボタンは正常に動作するはずです');
    } else if (funcBody.includes('createApiClient')) {
        console.log('❌ 未修正: getAuthClient()が毎回新しいインスタンスを作成しています');
        console.log('これが週報ボタンが動作しない原因です');
    } else {
        console.log('⚠️ 予期しない実装です');
        console.log(funcBody);
    }
} else {
    console.log('❌ getAuthClient関数が見つかりません');
}
