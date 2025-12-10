# 🚀 デプロイ手順

このアプリは完全に**静的ファイル（HTML/CSS/JavaScript）のみ**で構成されているため、さまざまなホスティングサービスに簡単にデプロイできます。

---

## 📋 目次

1. [Vercel にデプロイ](#vercel-にデプロイ)（最もおすすめ）
2. [Netlify にデプロイ](#netlify-にデプロイ)
3. [Railway にデプロイ](#railway-にデプロイ)
4. [GitHub Pages にデプロイ](#github-pages-にデプロイ)
5. [Cloudflare Pages にデプロイ](#cloudflare-pages-にデプロイ)

---

## 1. Vercel にデプロイ

### ✨ 特徴
- ✅ **無料プランあり**
- ✅ **最も簡単**（設定不要）
- ✅ GitHubと自動連携
- ✅ 高速CDN
- ✅ HTTPS自動対応

### 🚀 デプロイ手順

#### 方法A: GitHub連携（推奨）

1. **GitHubにプッシュ**
   ```bash
   git add .
   git commit -m "Add deployment configs"
   git push
   ```

2. **Vercelにアクセス**
   - https://vercel.com にアクセス
   - 「Sign Up」でGitHubアカウントでログイン

3. **新しいプロジェクトを作成**
   - 「New Project」をクリック
   - GitHubリポジトリを選択
   - 「Import」をクリック

4. **自動デプロイ**
   - 設定は自動認識されます
   - 「Deploy」をクリック
   - 数秒で完了！

5. **公開URLを取得**
   - `https://your-project.vercel.app` のようなURLが発行されます

#### 方法B: Vercel CLI

```bash
# Vercel CLIをインストール
npm i -g vercel

# プロジェクトディレクトリで実行
cd /path/to/Drawing-QR-Generator
vercel

# プロンプトに従って設定
# 完了後、URLが表示されます
```

---

## 2. Netlify にデプロイ

### ✨ 特徴
- ✅ 無料プランあり
- ✅ ドラッグ&ドロップでデプロイ可能
- ✅ GitHubと連携可能
- ✅ 独自ドメイン対応

### 🚀 デプロイ手順

#### 方法A: ドラッグ&ドロップ（最も簡単）

1. **Netlifyにアクセス**
   - https://www.netlify.com にアクセス
   - 「Sign Up」でアカウント作成

2. **ドラッグ&ドロップ**
   - 「Sites」タブを選択
   - プロジェクトフォルダ全体をドラッグ&ドロップ
   - 自動デプロイが開始されます

3. **公開URLを取得**
   - `https://random-name.netlify.app` のようなURLが発行されます

#### 方法B: GitHub連携

1. **Netlifyにアクセス**
   - https://www.netlify.com にログイン

2. **新しいサイトを作成**
   - 「Add new site」→「Import an existing project」
   - GitHubを選択
   - リポジトリを選択

3. **設定（自動認識されます）**
   - Build command: （空欄でOK）
   - Publish directory: `.`（ルートディレクトリ）
   - 「Deploy site」をクリック

4. **完了**
   - 数秒でデプロイ完了！

---

## 3. Railway にデプロイ

### ✨ 特徴
- ✅ 無料枠あり（$5/月分）
- ✅ GitHubから直接デプロイ
- ✅ Dockerサポート

### 🚀 デプロイ手順

1. **GitHubにプッシュ**
   ```bash
   git add .
   git commit -m "Add Dockerfile for Railway"
   git push
   ```

2. **Railwayにアクセス**
   - https://railway.app にアクセス
   - 「Login with GitHub」でログイン

3. **新しいプロジェクトを作成**
   - 「New Project」をクリック
   - 「Deploy from GitHub repo」を選択
   - リポジトリを選択

4. **自動デプロイ**
   - Dockerfileが自動検出されます
   - デプロイが開始されます

5. **ドメイン設定**
   - 「Settings」→「Networking」
   - 「Generate Domain」をクリック
   - `https://your-app.up.railway.app` のようなURLが発行されます

---

## 4. GitHub Pages にデプロイ

### ✨ 特徴
- ✅ **完全無料**
- ✅ GitHubリポジトリから直接公開
- ✅ 独自ドメイン対応
- ✅ GitHub Actionsで自動デプロイ

### 🚀 デプロイ手順

#### 方法A: GitHub Actions（自動デプロイ）

1. **GitHubにプッシュ**
   ```bash
   git add .
   git commit -m "Add GitHub Actions workflow"
   git push origin main
   ```

2. **GitHub Pagesを有効化**
   - GitHubリポジトリのページに移動
   - 「Settings」→「Pages」をクリック
   - Source: 「GitHub Actions」を選択

3. **自動デプロイ**
   - mainブランチにプッシュすると自動デプロイされます
   - 「Actions」タブで進捗を確認できます

4. **公開URLを確認**
   - `https://your-username.github.io/Drawing-QR-Generator/`

#### 方法B: 手動設定

1. **GitHub Pagesを有効化**
   - 「Settings」→「Pages」
   - Source: 「Deploy from a branch」
   - Branch: `main` / `/ (root)`
   - 「Save」をクリック

2. **公開URLを確認**
   - 数分後に `https://your-username.github.io/Drawing-QR-Generator/` でアクセス可能

---

## 5. Cloudflare Pages にデプロイ

### ✨ 特徴
- ✅ 無料プランあり
- ✅ 超高速CDN
- ✅ GitHubと連携
- ✅ 無制限のリクエスト

### 🚀 デプロイ手順

1. **Cloudflareにアクセス**
   - https://pages.cloudflare.com にアクセス
   - アカウント作成またはログイン

2. **新しいプロジェクトを作成**
   - 「Create a project」をクリック
   - 「Connect to Git」を選択
   - GitHubリポジトリを選択

3. **ビルド設定**
   - Build command: （空欄）
   - Build output directory: `.`
   - 「Save and Deploy」をクリック

4. **完了**
   - `https://your-project.pages.dev` でアクセス可能

---

## 📝 各サービスの比較

| サービス | 無料プラン | 速度 | 簡単さ | おすすめ度 |
|---------|----------|------|--------|----------|
| **Vercel** | ✅ | ⚡⚡⚡ | ★★★★★ | ⭐⭐⭐⭐⭐ |
| **Netlify** | ✅ | ⚡⚡⚡ | ★★★★★ | ⭐⭐⭐⭐⭐ |
| **Railway** | 🔸 ($5/月) | ⚡⚡ | ★★★★☆ | ⭐⭐⭐⭐ |
| **GitHub Pages** | ✅ | ⚡⚡ | ★★★★☆ | ⭐⭐⭐⭐ |
| **Cloudflare Pages** | ✅ | ⚡⚡⚡ | ★★★★☆ | ⭐⭐⭐⭐⭐ |

---

## 🎯 おすすめのデプロイ先

### 初心者の方
👉 **Netlify**（ドラッグ&ドロップで超簡単）

### GitHubを使っている方
👉 **Vercel** または **GitHub Pages**

### 最速を求める方
👉 **Cloudflare Pages**

### Dockerに慣れている方
👉 **Railway**

---

## ⚙️ デプロイ後の設定

### 独自ドメインの設定

どのサービスでも、独自ドメイン（例: `drawing-qr.example.com`）を設定できます。

**例：Vercelの場合**
1. 「Settings」→「Domains」
2. ドメインを入力
3. DNS設定を変更（指示に従う）
4. HTTPS自動対応

### 環境変数（このアプリでは不要）

このアプリは完全にフロントエンドなので、環境変数は不要です。

### アクセス制限

もし社内限定で使いたい場合：
- **Vercel**: Password Protection（Pro プラン）
- **Netlify**: Password Protection（Pro プラン）
- **Cloudflare**: Access（無料枠あり）

---

## 🔧 トラブルシューティング

### デプロイが失敗する

**確認事項：**
- すべてのファイルがGitにコミットされているか
- ブランチ名が正しいか（main / master）
- 設定ファイルが正しい場所にあるか

### ページが真っ白

**確認事項：**
- ブラウザのコンソールでエラーを確認
- ファイルパスが正しいか（相対パス）
- CDN（Tesseract.js など）が読み込めているか

### OCRが動作しない

**原因：**
- Tesseract.js がCDNから読み込めていない可能性

**解決方法：**
- ブラウザの開発者ツールでネットワークを確認
- CORSエラーが出ていないか確認

---

## 📞 サポート

問題が発生した場合：

1. **ログを確認**
   - ブラウザの開発者ツール（F12）でエラーを確認

2. **ホスティングサービスのログを確認**
   - Vercel: 「Deployments」タブ
   - Netlify: 「Deploy log」
   - Railway: 「Deployments」タブ

3. **GitHubでissueを作成**
   - リポジトリのIssuesタブで報告

---

## 🎉 デプロイ完了後

デプロイが完了したら：

1. **ブラウザでアクセス**
   - 発行されたURLにアクセス
   - アプリが正常に動作するか確認

2. **テスト**
   - サンプル画像でOCRが動くか確認
   - QRコード生成が動くか確認

3. **URLを共有**
   - チームメンバーに共有
   - 社内ドキュメントに記載

---

おめでとうございます！🎊
アプリが世界中からアクセス可能になりました！
