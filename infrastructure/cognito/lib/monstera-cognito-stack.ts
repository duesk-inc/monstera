import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class MonsteraCognitoStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Cognitoユーザープールの作成
    this.userPool = new cognito.UserPool(this, 'MonsteraDevUserPool', {
      userPoolName: 'monstera-dev-user-pool',
      selfSignUpEnabled: false,  // 管理者による登録のみ
      signInAliases: {
        email: true,
        username: false,
        phone: false
      },
      signInCaseSensitive: false,
      standardAttributes: {
        email: {
          required: true,
          mutable: false
        },
        givenName: {
          required: true,
          mutable: true
        },
        familyName: {
          required: true,
          mutable: true
        },
        phoneNumber: {
          required: false,
          mutable: true
        }
      },
      customAttributes: {
        'role': new cognito.StringAttribute({
          minLen: 1,
          maxLen: 10,
          mutable: true
        }),
        'department_id': new cognito.StringAttribute({
          minLen: 1,
          maxLen: 50,
          mutable: true
        }),
        'employee_id': new cognito.StringAttribute({
          minLen: 1,
          maxLen: 50,
          mutable: true
        })
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
        tempPasswordValidity: cdk.Duration.days(7)
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      autoVerify: {
        email: true
      },
      removalPolicy: cdk.RemovalPolicy.RETAIN  // 開発環境でも安全のため保持
    });

    // アプリクライアントの作成
    this.userPoolClient = new cognito.UserPoolClient(this, 'MonsteraDevAppClient', {
      userPool: this.userPool,
      userPoolClientName: 'monstera-dev-app-client',
      authFlows: {
        adminUserPassword: true,  // AdminInitiateAuth用
        userPassword: true,       // 通常のユーザー認証用
        userSrp: true,           // SRP認証用
        custom: false
      },
      generateSecret: true,  // クライアントシークレットを生成
      preventUserExistenceErrors: true,
      readAttributes: new cognito.ClientAttributes()
        .withStandardAttributes({
          email: true,
          givenName: true,
          familyName: true,
          phoneNumber: true,
          emailVerified: true
        })
        .withCustomAttributes('role', 'department_id', 'employee_id'),
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      refreshTokenValidity: cdk.Duration.days(7),
      enableTokenRevocation: true
    });

    // 管理者グループの作成
    const adminGroup = new cognito.CfnUserPoolGroup(this, 'AdminGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'admins',
      description: 'Administrator user group',
      precedence: 1
    });

    // マネージャーグループの作成
    const managerGroup = new cognito.CfnUserPoolGroup(this, 'ManagerGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'managers',
      description: 'Manager user group',
      precedence: 2
    });

    // 一般ユーザーグループの作成
    const userGroup = new cognito.CfnUserPoolGroup(this, 'UserGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'users',
      description: 'General user group',
      precedence: 3
    });

    // 管理用IAMロールの作成（開発環境での管理作業用）
    const cognitoAdminRole = new iam.Role(this, 'CognitoAdminRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'IAM Role for Cognito Admin Operations',
      inlinePolicies: {
        CognitoAdminPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: [
                'cognito-idp:AdminCreateUser',
                'cognito-idp:AdminDeleteUser',
                'cognito-idp:AdminUpdateUserAttributes',
                'cognito-idp:AdminAddUserToGroup',
                'cognito-idp:AdminRemoveUserFromGroup',
                'cognito-idp:AdminGetUser',
                'cognito-idp:AdminListGroupsForUser',
                'cognito-idp:ListUsers',
                'cognito-idp:ListGroups',
                'cognito-idp:AdminInitiateAuth',
                'cognito-idp:AdminRespondToAuthChallenge',
                'cognito-idp:AdminSetUserPassword'
              ],
              resources: [this.userPool.userPoolArn],
              effect: iam.Effect.ALLOW
            })
          ]
        })
      }
    });

    // CloudFormationの出力
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Cognito User Pool ID',
      exportName: 'MonsteraDevUserPoolId'
    });

    new cdk.CfnOutput(this, 'UserPoolArn', {
      value: this.userPool.userPoolArn,
      description: 'Cognito User Pool ARN',
      exportName: 'MonsteraDevUserPoolArn'
    });

    new cdk.CfnOutput(this, 'AppClientId', {
      value: this.userPoolClient.userPoolClientId,
      description: 'Cognito App Client ID',
      exportName: 'MonsteraDevAppClientId'
    });

    new cdk.CfnOutput(this, 'CognitoAdminRoleArn', {
      value: cognitoAdminRole.roleArn,
      description: 'IAM Role ARN for Cognito Admin Operations',
      exportName: 'MonsteraDevCognitoAdminRoleArn'
    });

    new cdk.CfnOutput(this, 'JwksUri', {
      value: `https://cognito-idp.${this.region}.amazonaws.com/${this.userPool.userPoolId}/.well-known/jwks.json`,
      description: 'JWKS URI for token validation',
      exportName: 'MonsteraDevJwksUri'
    });

    new cdk.CfnOutput(this, 'CognitoIssuer', {
      value: `https://cognito-idp.${this.region}.amazonaws.com/${this.userPool.userPoolId}`,
      description: 'Cognito Issuer URL',
      exportName: 'MonsteraDevCognitoIssuer'
    });
  }
}