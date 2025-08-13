package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider"
)

func main() {
	// 環境変数から設定を取得
	region := os.Getenv("COGNITO_REGION")
	userPoolID := os.Getenv("COGNITO_USER_POOL_ID")
	accessKey := os.Getenv("COGNITO_AWS_ACCESS_KEY_ID")
	secretKey := os.Getenv("COGNITO_AWS_SECRET_ACCESS_KEY")
	sessionToken := os.Getenv("COGNITO_AWS_SESSION_TOKEN")

	if region == "" || userPoolID == "" {
		log.Fatal("COGNITO_REGION and COGNITO_USER_POOL_ID must be set")
	}

	// AWS SDK設定
	awsCfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithRegion(region),
		config.WithCredentialsProvider(aws.CredentialsProviderFunc(func(ctx context.Context) (aws.Credentials, error) {
			return aws.Credentials{
				AccessKeyID:     accessKey,
				SecretAccessKey: secretKey,
				SessionToken:    sessionToken,
			}, nil
		})),
	)
	if err != nil {
		log.Fatal("Failed to load AWS config:", err)
	}

	// Cognitoクライアント作成
	client := cognitoidentityprovider.NewFromConfig(awsCfg)

	// ユーザーの存在確認
	emails := []string{
		"engineer_test@duesk.co.jp",
		"admin@duesk.co.jp",
		"manager@duesk.co.jp",
		"super_admin@duesk.co.jp",
	}

	fmt.Printf("Checking users in User Pool: %s\n", userPoolID)
	fmt.Println("=====================================")

	for _, email := range emails {
		getUserInput := &cognitoidentityprovider.AdminGetUserInput{
			UserPoolId: aws.String(userPoolID),
			Username:   aws.String(email),
		}

		result, err := client.AdminGetUser(context.TODO(), getUserInput)
		if err != nil {
			fmt.Printf("❌ %s: NOT FOUND\n", email)
			continue
		}

		// ユーザーの詳細を表示
		fmt.Printf("✅ %s: FOUND\n", email)
		fmt.Printf("   Status: %s\n", result.UserStatus)
		fmt.Printf("   Enabled: %v\n", result.Enabled)
		
		// 属性を表示
		for _, attr := range result.UserAttributes {
			if *attr.Name == "custom:role" || *attr.Name == "email_verified" {
				fmt.Printf("   %s: %s\n", *attr.Name, *attr.Value)
			}
		}
		fmt.Println()
	}

	// ユーザー一覧を取得（最大10件）
	fmt.Println("\n=== All Users in User Pool ===")
	listUsersInput := &cognitoidentityprovider.ListUsersInput{
		UserPoolId: aws.String(userPoolID),
		Limit:      aws.Int32(10),
	}

	listResult, err := client.ListUsers(context.TODO(), listUsersInput)
	if err != nil {
		log.Fatal("Failed to list users:", err)
	}

	fmt.Printf("Total users: %d (showing max 10)\n", len(listResult.Users))
	for i, user := range listResult.Users {
		email := ""
		role := ""
		for _, attr := range user.Attributes {
			if *attr.Name == "email" {
				email = *attr.Value
			}
			if *attr.Name == "custom:role" {
				role = *attr.Value
			}
		}
		fmt.Printf("%d. %s (Username: %s, Status: %s, Role: %s)\n",
			i+1, email, *user.Username, user.UserStatus, role)
	}
}