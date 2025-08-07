#!/usr/bin/env python3
import urllib.request
import urllib.parse
import json
import ssl

# ログイン情報
url = "http://localhost:8080/api/v1/auth/login"
email = "admin@duesk.co.jp"
password = "AdminPass123!"

# リクエストデータ
data = {
    "email": email,
    "password": password
}

# JSONエンコード
json_data = json.dumps(data).encode('utf-8')

# リクエストの作成
request = urllib.request.Request(
    url,
    data=json_data,
    headers={
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0'
    }
)

try:
    # HTTPリクエストの送信
    with urllib.request.urlopen(request) as response:
        # レスポンスの読み取り
        response_data = response.read().decode('utf-8')
        response_json = json.loads(response_data)
        
        print("✅ ログイン成功！")
        print(f"Status Code: {response.status}")
        print("\nレスポンス:")
        print(json.dumps(response_json, indent=2, ensure_ascii=False))
        
        # Cookieヘッダーの確認
        if 'Set-Cookie' in response.headers:
            print("\nCookie設定:")
            print(response.headers['Set-Cookie'])
            
except urllib.error.HTTPError as e:
    print(f"❌ ログイン失敗")
    print(f"Status Code: {e.code}")
    error_data = e.read().decode('utf-8')
    try:
        error_json = json.loads(error_data)
        print("\nエラーレスポンス:")
        print(json.dumps(error_json, indent=2, ensure_ascii=False))
    except:
        print(f"Error Response: {error_data}")
except Exception as e:
    print(f"❌ リクエストエラー: {str(e)}")