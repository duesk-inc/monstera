/**
 * APIクライアント自動移行スクリプト
 * jscodeshift を使用して旧APIクライアントパターンから新システムへ移行
 * 
 * 使用方法:
 * npx jscodeshift -t scripts/migrate-api-client.js src/ --extensions=ts,tsx --dry
 * 
 * オプション:
 * --dry: ドライラン（変更を表示するだけで適用しない）
 * --print: 変更後のコードを表示
 */

module.exports = function transformer(fileInfo, api, options) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);
  
  // 変更フラグ
  let hasChanges = false;
  let needsPresetImport = false;
  let clientVariableName = 'client';
  
  // ファイルタイプを判定（hooks, components, api, etc）
  const filePath = fileInfo.path;
  const isHookFile = filePath.includes('/hooks/');
  const isComponentFile = filePath.includes('/components/');
  const isApiFile = filePath.includes('/lib/api/') && !filePath.includes('/lib/api/index');
  const isTestFile = filePath.includes('.test.') || filePath.includes('.spec.');
  
  // テストファイルはスキップ
  if (isTestFile) {
    return fileInfo.source;
  }
  
  // プリセットタイプを判定
  function determinePresetType(path) {
    const fileContent = fileInfo.source;
    
    // ファイルパスから判定
    if (path.includes('/admin/')) return 'admin';
    if (path.includes('/auth/')) return 'auth';
    if (path.includes('upload') || path.includes('Upload')) return 'upload';
    if (path.includes('batch') || path.includes('Batch')) return 'batch';
    if (path.includes('public')) return 'public';
    
    // APIパスから判定
    if (fileContent.includes('/api/v1/admin')) return 'admin';
    if (fileContent.includes('/api/v1/auth')) return 'auth';
    if (fileContent.includes('multipart/form-data')) return 'upload';
    
    // デフォルトは auth（認証が必要なケースが多い）
    return 'auth';
  }
  
  const presetType = determinePresetType(filePath);
  
  // Pattern 1: import apiClient from '@/lib/api'
  root.find(j.ImportDefaultSpecifier, {
    local: { name: 'apiClient' }
  }).forEach(path => {
    const importDecl = path.parent;
    if (importDecl.value.source.value === '@/lib/api') {
      // 新しいインポートに置き換え
      const newImport = j.importDeclaration(
        [j.importSpecifier(j.identifier('createPresetApiClient'))],
        j.literal('@/lib/api')
      );
      j(importDecl).replaceWith(newImport);
      hasChanges = true;
      needsPresetImport = true;
    }
  });
  
  // Pattern 2: import { apiClient } from '@/lib/api'
  root.find(j.ImportSpecifier, {
    imported: { name: 'apiClient' }
  }).forEach(path => {
    const importDecl = path.parent;
    if (importDecl.value.source.value === '@/lib/api') {
      // createPresetApiClient に置き換え
      path.value.imported.name = 'createPresetApiClient';
      if (path.value.local.name === 'apiClient') {
        path.value.local.name = 'createPresetApiClient';
      }
      hasChanges = true;
      needsPresetImport = true;
    }
  });
  
  // Pattern 3: import { getAuthClient } from '@/lib/api'
  root.find(j.ImportSpecifier, {
    imported: { name: 'getAuthClient' }
  }).forEach(path => {
    const importDecl = path.parent;
    if (importDecl.value.source.value === '@/lib/api') {
      // createPresetApiClient に置き換え
      path.value.imported.name = 'createPresetApiClient';
      path.value.local.name = 'createPresetApiClient';
      hasChanges = true;
      needsPresetImport = true;
    }
  });
  
  // APIクライアントの使用箇所を検索して置き換え
  if (needsPresetImport) {
    // apiClient.get(), apiClient.post() などの呼び出しを検索
    root.find(j.MemberExpression, {
      object: { name: 'apiClient' }
    }).forEach(path => {
      const callExpr = path.parent;
      
      // メソッド名を取得（get, post, put, delete, patch）
      const methodName = path.value.property.name;
      const httpMethods = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'];
      
      if (httpMethods.includes(methodName)) {
        // 関数スコープの開始位置を探す
        let functionScope = j(path).closest(j.FunctionDeclaration);
        if (!functionScope.length) {
          functionScope = j(path).closest(j.FunctionExpression);
        }
        if (!functionScope.length) {
          functionScope = j(path).closest(j.ArrowFunctionExpression);
        }
        if (!functionScope.length) {
          functionScope = j(path).closest(j.MethodDefinition);
        }
        
        if (functionScope.length) {
          const functionBody = functionScope.get().value.body;
          
          // すでにクライアント作成があるか確認
          const hasClientCreation = j(functionBody).find(j.VariableDeclaration, {
            declarations: [{
              id: { name: clientVariableName },
              init: {
                callee: { name: 'createPresetApiClient' }
              }
            }]
          }).length > 0;
          
          if (!hasClientCreation) {
            // クライアント作成文を挿入
            const clientCreation = j.variableDeclaration('const', [
              j.variableDeclarator(
                j.identifier(clientVariableName),
                j.callExpression(
                  j.identifier('createPresetApiClient'),
                  [j.literal(presetType)]
                )
              )
            ]);
            
            // 関数の最初に挿入
            if (functionBody.body) {
              functionBody.body.unshift(clientCreation);
            }
          }
          
          // apiClient を client に置き換え
          path.value.object.name = clientVariableName;
          hasChanges = true;
        }
      }
    });
    
    // getAuthClient() の呼び出しを置き換え
    root.find(j.CallExpression, {
      callee: { name: 'getAuthClient' }
    }).forEach(path => {
      // createPresetApiClient('auth') に置き換え
      path.value.callee.name = 'createPresetApiClient';
      path.value.arguments = [j.literal('auth')];
      hasChanges = true;
    });
  }
  
  // APIパスから /api/v1 プレフィックスを削除
  if (hasChanges) {
    root.find(j.Literal).forEach(path => {
      if (typeof path.value.value === 'string' && path.value.value.startsWith('/api/v1/')) {
        // /api/v1 を削除
        path.value.value = path.value.value.replace('/api/v1', '');
        // 空文字列になった場合は / にする
        if (path.value.value === '') {
          path.value.value = '/';
        }
      }
    });
    
    // テンプレートリテラルの場合も処理
    root.find(j.TemplateLiteral).forEach(path => {
      path.value.quasis.forEach(quasi => {
        if (quasi.value.raw.includes('/api/v1/')) {
          quasi.value.raw = quasi.value.raw.replace('/api/v1/', '/');
          quasi.value.cooked = quasi.value.cooked.replace('/api/v1/', '/');
        }
      });
    });
  }
  
  // エラーハンドリングのインポートを更新
  root.find(j.ImportDeclaration, {
    source: { value: '@/lib/api/error' }
  }).forEach(path => {
    // @/lib/api に統合
    const specifiers = path.value.specifiers;
    const hasHandleApiError = specifiers.some(spec => 
      spec.imported && spec.imported.name === 'handleApiError'
    );
    
    if (hasHandleApiError) {
      // 既存の @/lib/api インポートに追加
      const existingImport = root.find(j.ImportDeclaration, {
        source: { value: '@/lib/api' }
      });
      
      if (existingImport.length > 0) {
        existingImport.forEach(importPath => {
          specifiers.forEach(spec => {
            if (spec.imported && spec.imported.name === 'handleApiError') {
              importPath.value.specifiers.push(spec);
            }
          });
        });
        // 元のインポートを削除
        j(path).remove();
        hasChanges = true;
      }
    }
  });
  
  // 変更がある場合のみ新しいコードを返す
  if (hasChanges) {
    // コメントを追加
    const firstImport = root.find(j.ImportDeclaration).at(0);
    if (firstImport.length > 0 && needsPresetImport) {
      const comment = j.commentLine(' Migrated to new API client system');
      if (!firstImport.get().value.comments) {
        firstImport.get().value.comments = [];
      }
      firstImport.get().value.comments.push(comment);
    }
    
    return root.toSource({
      quote: 'single',
      trailingComma: true,
      tabWidth: 2,
    });
  }
  
  return fileInfo.source;
};

// 変換のヘルパー関数
module.exports.parser = 'tsx';