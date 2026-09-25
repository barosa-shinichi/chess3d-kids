# 3Dちぇす

こども むけの 3D チェス Android アプリです。がめんの もじは すべて ひらがな です。

- 🌐 あそぶ・ダウンロード: https://barosa-shinichi.github.io/chess3d-kids/
- ▶ ブラウザで すぐ あそぶ: https://barosa-shinichi.github.io/chess3d-kids/play/
- 📱 APK: https://barosa-shinichi.github.io/chess3d-kids/3Dchess.apk

## できること
- ふたりで あそぶ／ろぼっとと あそぶ（やさしい・ふつう・つよい）
- こまを さわると うごける ますが ひかる、うごきかたの せつめい
- まった（いってもどす）・ひんと・ばんを まわす
- キャスリング・アンパッサン・プロモーション・ひきわけ など せいしきな ルール
- とちゅうの たいきょくを ほぞん（つづきから）

## しくみ
- `app/src/main/assets/` … ゲーム本体（HTML + JavaScript + three.js r160）
  - `engine.js` … ルールとAI（アルファベータ探索）
  - `game.js` … 3D表示・操作・ひらがなUI
- `MainActivity.java` … WebView でアセットを表示するだけの薄いラッパー

## GitHub Pages
`docs/` フォルダを そのまま公開しています（Settings → Pages → Branch: `main` / `/docs`）。
- `docs/index.html` … 紹介ページ
- `docs/play/` … ブラウザ版（`app/src/main/assets/` の コピー）
- `docs/3Dchess.apk` … ダウンロード用 APK

ゲームを 直したら `app/src/main/assets/` の中身を `docs/play/` にも コピーしてください。

## ビルド
```
./gradlew assembleDebug      # デバッグ版
./gradlew assembleRelease    # リリース版
```
リリース版は、ルートに `chess3d.keystore` があればそれで署名します（鍵はリポジトリに含めていません）。
