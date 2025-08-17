#!/usr/bin/env node

/**
 * スキルシート保存機能のテストスクリプト
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:8080/api/v1';

// テスト用データ
const testSkillSheet = {
  name: 'テストエンジニア',
  skills: {
    programming_languages: ['JavaScript', 'TypeScript', 'Go'],
    frameworks: ['React', 'Next.js', 'Gin'],
    databases: ['PostgreSQL', 'Redis'],
    cloud_services: ['AWS', 'Docker'],
    tools: ['Git', 'Docker Compose', 'VSCode']
  },
  experience_years: 5,
  certifications: [],
  projects: [
    {
      name: 'Monstera開発',
      role: 'フルスタックエンジニア',
      period: '2024-01 ~ 現在',
      description: 'SES企業向け業務管理システムの開発'
    }
  ]
};

async function testSkillSheetSave() {
  console.log('====================================');
  console.log('スキルシート保存機能テスト');
  console.log('====================================\n');
  
  try {
    console.log('1. スキルシート保存API呼び出し:');
    console.log('-------------------');
    console.log('リクエストURL:', `${API_BASE_URL}/skill-sheet`);
    console.log('リクエストデータ:', JSON.stringify(testSkillSheet, null, 2));
    
    const response = await axios.post(
      `${API_BASE_URL}/skill-sheet`,
      testSkillSheet,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true,
        validateStatus: () => true
      }
    );
    
    console.log('\nレスポンスステータス:', response.status);
    
    if (response.status === 200 || response.status === 201) {
      console.log('✅ スキルシート保存成功');
      console.log('レスポンスデータ:', JSON.stringify(response.data, null, 2));
    } else if (response.status === 401) {
      console.log('⚠️ 認証が必要です（期待される動作）');
      console.log('レスポンス:', response.data);
    } else if (response.status === 404) {
      console.log('❌ エンドポイントが見つかりません');
    } else {
      console.log('❌ 予期しないエラー');
      console.log('レスポンス:', response.data);
    }
    
  } catch (error) {
    console.error('❌ リクエストエラー:', error.message);
  }
  
  console.log('\n====================================');
  console.log('テスト完了');
  console.log('====================================\n');
}

// テスト実行
testSkillSheetSave();