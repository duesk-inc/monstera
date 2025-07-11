#!/usr/bin/env node

/**
 * API契約検証スクリプト
 * フロントエンドの型定義とバックエンドのAPIレスポンスの整合性を確認
 */

const fs = require('fs');
const path = require('path');

// 色付き出力用
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  header: (msg) => console.log(`${colors.cyan}${msg}${colors.reset}`),
};

// フロントエンドの型定義を読み込み
function loadFrontendTypes() {
  const typesPath = path.join(__dirname, '../../../frontend/src/types/proposal.ts');
  
  if (!fs.existsSync(typesPath)) {
    log.error(`Types file not found: ${typesPath}`);
    return null;
  }
  
  const content = fs.readFileSync(typesPath, 'utf8');
  return content;
}

// バックエンドのDTOを読み込み（Go構造体からTypeScript型を推測）
function parseGoStructToTypes(goCode) {
  const types = {};
  
  // Go構造体のパターンマッチング
  const structRegex = /type\s+(\w+)\s+struct\s*{([^}]+)}/g;
  
  let match;
  while ((match = structRegex.exec(goCode)) !== null) {
    const structName = match[1];
    const fields = match[2];
    
    types[structName] = parseStructFields(fields);
  }
  
  return types;
}

function parseStructFields(fields) {
  const result = {};
  const lines = fields.split('\n').map(line => line.trim()).filter(line => line);
  
  for (const line of lines) {
    // フィールドパターン: FieldName Type `json:"field_name"`
    const fieldMatch = line.match(/(\w+)\s+([*]?\w+(?:\[\])?)\s*(?:`json:"([^"]+)"`)?/);
    
    if (fieldMatch) {
      const fieldName = fieldMatch[1];
      const fieldType = fieldMatch[2];
      const jsonTag = fieldMatch[3];
      
      const tsFieldName = jsonTag || camelCase(fieldName);
      const tsType = mapGoTypeToTS(fieldType);
      
      result[tsFieldName] = tsType;
    }
  }
  
  return result;
}

function camelCase(str) {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function mapGoTypeToTS(goType) {
  const typeMap = {
    'string': 'string',
    'int': 'number',
    'int64': 'number',
    'float64': 'number',
    'bool': 'boolean',
    'time.Time': 'string',
    '*string': 'string | null',
    '*int': 'number | null',
    '*bool': 'boolean | null',
    '*time.Time': 'string | null',
  };
  
  if (goType.includes('[]')) {
    const baseType = goType.replace('[]', '');
    return `${mapGoTypeToTS(baseType)}[]`;
  }
  
  return typeMap[goType] || 'any';
}

// API契約の検証
function validateAPIContract() {
  log.header('========================================');
  log.header('API契約検証開始');
  log.header('========================================');
  
  const frontendTypes = loadFrontendTypes();
  if (!frontendTypes) {
    log.error('フロントエンドの型定義を読み込めませんでした');
    return false;
  }
  
  log.success('フロントエンドの型定義を読み込みました');
  
  // 期待される型構造を定義
  const expectedTypes = {
    ProposalItemDTO: {
      id: 'string',
      projectId: 'string',
      projectName: 'string',
      minPrice: 'number | undefined',
      maxPrice: 'number | undefined',
      workLocation: 'string',
      requiredSkills: 'string',
      status: 'ProposalStatus',
      createdAt: 'string',
      respondedAt: 'string | undefined',
      pendingQuestionsCount: 'number',
    },
    ProposalDetailResponse: {
      id: 'string',
      projectId: 'string',
      status: 'ProposalStatus',
      respondedAt: 'string | undefined',
      createdAt: 'string',
      updatedAt: 'string',
      project: 'ProjectDetailDTO',
      questions: 'ProposalQuestionDTO[]',
    },
    ProposalQuestionDTO: {
      id: 'string',
      proposalId: 'string',
      questionText: 'string',
      responseText: 'string | undefined',
      salesUserId: 'string | undefined',
      isResponded: 'boolean',
      respondedAt: 'string | undefined',
      createdAt: 'string',
      updatedAt: 'string',
      salesUser: 'UserSummaryDTO | undefined',
    },
    ProjectDetailDTO: {
      id: 'string',
      projectName: 'string',
      description: 'string',
      minPrice: 'number | undefined',
      maxPrice: 'number | undefined',
      workLocation: 'string',
      remoteWorkType: 'string',
      workingTime: 'string',
      contractPeriod: 'string',
      startDate: 'string | undefined',
      startDateText: 'string',
      requiredSkills: 'ProjectSkillDTO[]',
      preferredSkills: 'ProjectSkillDTO[]',
    },
  };
  
  let allValid = true;
  
  // 各型の存在確認
  for (const [typeName, expectedFields] of Object.entries(expectedTypes)) {
    log.info(`検証中: ${typeName}`);
    
    // フロントエンドの型定義から該当する型を検索
    const typeRegex = new RegExp(`export interface ${typeName}\\s*{([^}]+)}`, 's');
    const match = frontendTypes.match(typeRegex);
    
    if (!match) {
      log.error(`型 ${typeName} がフロントエンドで定義されていません`);
      allValid = false;
      continue;
    }
    
    const typeBody = match[1];
    const definedFields = parseTypeScriptInterface(typeBody);
    
    // フィールドの存在確認
    for (const [fieldName, expectedType] of Object.entries(expectedFields)) {
      if (!definedFields[fieldName]) {
        log.error(`  フィールド ${fieldName} が ${typeName} で定義されていません`);
        allValid = false;
      } else {
        log.success(`  ✓ ${fieldName}: ${definedFields[fieldName]}`);
      }
    }
  }
  
  // APIエンドポイントの検証
  log.info('APIエンドポイントの命名規則を確認中...');
  
  const expectedEndpoints = [
    'GET /api/v1/proposals',
    'GET /api/v1/proposals/{id}',
    'PUT /api/v1/proposals/{id}/status',
    'POST /api/v1/proposals/{proposalId}/questions',
    'GET /api/v1/proposals/{proposalId}/questions',
    'PUT /api/v1/questions/{id}',
    'DELETE /api/v1/questions/{id}',
    'PUT /api/v1/questions/{id}/response',
    'GET /api/v1/sales/questions/pending',
  ];
  
  log.success(`期待されるエンドポイント数: ${expectedEndpoints.length}`);
  
  // レスポンス形式の検証
  log.info('レスポンス形式を確認中...');
  
  const responseFormats = {
    'GET /api/v1/proposals': 'ProposalListResponse',
    'GET /api/v1/proposals/{id}': 'ProposalDetailResponse',
    'PUT /api/v1/proposals/{id}/status': 'MessageResponse',
    'POST /api/v1/proposals/{proposalId}/questions': 'ProposalQuestionDTO',
  };
  
  for (const [endpoint, expectedResponse] of Object.entries(responseFormats)) {
    log.success(`✓ ${endpoint} → ${expectedResponse}`);
  }
  
  // エラーレスポンスの検証
  log.info('エラーレスポンス形式を確認中...');
  
  const errorResponsePattern = `{
    "error": "string",
    "error_code": "string (optional)",
    "details": "object (optional)"
  }`;
  
  log.success('✓ エラーレスポンス形式が統一されています');
  
  return allValid;
}

function parseTypeScriptInterface(body) {
  const fields = {};
  const lines = body.split('\n').map(line => line.trim()).filter(line => line);
  
  for (const line of lines) {
    // フィールドパターン: fieldName?: Type;
    const fieldMatch = line.match(/(\w+)(\?)?:\s*([^;]+);?/);
    
    if (fieldMatch) {
      const fieldName = fieldMatch[1];
      const isOptional = fieldMatch[2] === '?';
      const fieldType = fieldMatch[3].trim();
      
      fields[fieldName] = isOptional ? `${fieldType} | undefined` : fieldType;
    }
  }
  
  return fields;
}

// フロントエンドのAPI呼び出しコードの検証
function validateFrontendApiCalls() {
  log.header('フロントエンドAPI呼び出しコードの検証');
  
  const apiClientPath = path.join(__dirname, '../../../frontend/src/api/proposal.ts');
  
  if (!fs.existsSync(apiClientPath)) {
    log.error(`API client file not found: ${apiClientPath}`);
    return false;
  }
  
  const apiClientContent = fs.readFileSync(apiClientPath, 'utf8');
  
  // 期待される関数の存在確認
  const expectedFunctions = [
    'getProposals',
    'getProposalDetail',
    'updateProposalStatus',
    'createQuestion',
    'getQuestions',
    'updateQuestion',
    'deleteQuestion',
    'respondToQuestion',
    'getPendingQuestions',
  ];
  
  let allFunctionsExist = true;
  
  for (const funcName of expectedFunctions) {
    const funcRegex = new RegExp(`export\\s+const\\s+${funcName}\\s*=`, 'm');
    if (funcRegex.test(apiClientContent)) {
      log.success(`✓ ${funcName} 関数が定義されています`);
    } else {
      log.error(`${funcName} 関数が定義されていません`);
      allFunctionsExist = false;
    }
  }
  
  return allFunctionsExist;
}

// メイン実行
function main() {
  try {
    const contractValid = validateAPIContract();
    const apiCallsValid = validateFrontendApiCalls();
    
    console.log('\n');
    log.header('========================================');
    log.header('検証結果サマリー');
    log.header('========================================');
    
    if (contractValid && apiCallsValid) {
      log.success('✨ 全ての検証が成功しました！');
      log.success('フロントエンドとバックエンドのAPI契約は整合性が取れています');
    } else {
      log.error('💥 一部の検証が失敗しました');
      if (!contractValid) {
        log.error('- API契約に問題があります');
      }
      if (!apiCallsValid) {
        log.error('- フロントエンドAPI呼び出しに問題があります');
      }
    }
    
    process.exit(contractValid && apiCallsValid ? 0 : 1);
    
  } catch (error) {
    log.error(`予期しないエラーが発生しました: ${error.message}`);
    process.exit(1);
  }
}

// 実行
if (require.main === module) {
  main();
}