# ウソつきは誰だ？（オンライン版）

スマホ・PCのブラウザで遊ぶ、オンライン推理パーティーゲームの土台です。
画面は HTML/CSS/JavaScript、リアルタイム同期は Firebase Realtime Database を使います。

## ファイル構成

- `index.html` — 画面とゲームUI
- `style.css` — スマホ・PC対応デザイン
- `app.js` — 部屋作成、参加、ラウンド、投票
- `firebase-config.js` — Firebaseの設定
- `database.rules.json` — Realtime Databaseの初期ルール例

## 先に試す

`index.html` をブラウザで開き、「おためしモード」を選ぶと画面とルールを確認できます。
ただし、ブラウザでファイルを直接開く場合、オンライン機能はFirebase設定がないと動きません。

## オンライン対戦を有効にする

1. Firebase Console（https://console.firebase.google.com/）でプロジェクトを作成します。
2. プロジェクトに Web アプリを追加し、設定情報をコピーします。
3. `firebase-config.js` の `YOUR_...` を実際の値に置き換えます。
4. Firebase Console の **Realtime Database** を作成します。表示されたデータベースURLを `databaseURL` に入れます。
5. `database.rules.json` の内容を、Realtime Database のルールに設定します。
6. GitHub リポジトリにこのフォルダの中身をアップロードし、Settings → Pages で公開します。

### 注意

この版は初期プロトタイプです。オンライン部屋・お題配布・投票同期を実装していますが、本格公開前には Firebase Authentication、サーバー側での役割管理、投票の検証、部屋の期限切れ処理などを追加してください。初期ルール例は試作用であり、公開環境ではアクセス制御の見直しが必要です。

## ルール

- 3〜8人（4人以上推奨）
- 全員は多数派のお題、1人だけ別のお題を受け取る
- 質問タイムで会話する
- 各自1人に投票する
- 結果を発表し、次のラウンドへ進む

## GitHub Pages

`index.html` がリポジトリのルートにある状態で Pages を有効化してください。
GitHub Pages は静的ファイルの配信先であり、リアルタイム通信サーバーの代わりではありません。
