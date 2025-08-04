#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { MonsteraCognitoStack } from './lib/monstera-cognito-stack';

const app = new cdk.App();

// 開発環境用のCognitoスタック
new MonsteraCognitoStack(app, 'MonsteraCognitoDev', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'ap-northeast-1'
  },
  stackName: 'monstera-cognito-dev',
  description: 'Monstera開発環境用Cognitoユーザープール',
  tags: {
    Environment: 'development',
    Project: 'monstera',
    ManagedBy: 'cdk'
  }
});

app.synth();