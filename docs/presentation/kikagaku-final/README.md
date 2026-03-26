# キカガク最終発表

このフォルダは、「高架下点検マップ＆報告書システム」に関するキカガク講義内の最終発表資料をまとめたものです。

## 目的
この発表では、高架下点検業務における写真・位置情報・所見・報告書を一元管理する業務支援システムについて、
企画背景、作成したGPTs／システムの内容、デモンストレーション、振り返り、今後の展望を整理します。

## このフォルダ内のファイルの役割
- `slide-outline.md` : 人間が読む構成案
- `talk-track.md` : 発表原稿
- `manus-prompt.md` : 初期版の Manus 向けプロンプト
- `manus-prompt-compact.md` : 今回の発表の内容正本
- `github-ai-slide-prompt.md` : GitHub AI Slide 向けプロンプト
- `manus-instruction-final.md` : 実行時指示の履歴的ファイル

## 補足
- 今回の発表内容の正本は `manus-prompt-compact.md`
- 再利用可能な共通プロンプトは `docs/prompts/presentation/` 配下に置く

## 発表構成
1. 企画の概要
2. 作成したGPTsについて
3. デモンストレーション
4. 最終成果物作成の振り返り
5. 今後に向けて

## 備考
- 発表時間は約10分を想定
- デモは、写真登録・地図表示・報告書作成までを通して見せる構成
- 主役はGPT単体ではなく、業務システム全体とする

## 共通資産との関係
- このフォルダは「今回のキカガク最終発表」に特化した資料群
- 再利用可能な共通資産は以下を参照
  - [docs/skills/ai-presentation-generation.md](../../skills/ai-presentation-generation.md)
  - [docs/prompts/presentation/claude-slide-template.md](../../prompts/presentation/claude-slide-template.md)
  - [docs/prompts/presentation/manus-instruction-final.md](../../prompts/presentation/manus-instruction-final.md)
  - [docs/presentation/template/slide-content-template.md](../template/slide-content-template.md)
  - [docs/presentation/projects/kikagaku-final/slide-content.md](../projects/kikagaku-final/slide-content.md)