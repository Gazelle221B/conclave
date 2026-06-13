# Conclave 導入手順 — 新規プロジェクトへ落とし込む

> 既存/新規プロジェクトに Conclave を導入し、AI 合議体による自走運用を立ち上げるまでの手順。
> 所要: 初回セットアップ 30-60 分 (要件記述を除く)。

---

## 前提: Conclave が向くプロジェクト・向かないプロジェクト

| 向く | 向かない |
|---|---|
| 複数日〜数ヶ月の継続開発 | 1 回きりの使い捨てスクリプト |
| AI に大量の実装を委任したい | 全部自分で書きたい小規模変更 |
| セッション/担当が交代しうる | 単発の質問・調査 |
| 品質ゲートと監査証跡が要る | プロトタイプの即興実装 |
| LLM をプロダクトに組み込む | — |

軽量に始めたいなら、まず **Pillar 2 (憲法) + Pillar 3 (PROJECT_STATE) + Pillar 6 (DoD)** の 3 つだけ導入し、規模が育ったら Pillar 1/4 (役割分離・運用書) を足す。

---

## ステップ 1 — ファイルを配置する

```bash
PROJ=<your-project-path>

# 最上位指示書 (全 AI ツールが読む)
cp conclave/templates/AGENTS.template.md "$PROJ/AGENTS.md"
cd "$PROJ" && ln -s AGENTS.md CLAUDE.md     # Claude Code 用エイリアス

# 運用ドキュメント
mkdir -p "$PROJ/docs/adr"
cp conclave/runbook/ORCHESTRATION_RUNBOOK.template.md "$PROJ/docs/ORCHESTRATION_RUNBOOK.md"
cp conclave/templates/PROJECT_STATE.template.md "$PROJ/docs/PROJECT_STATE.md"
cp conclave/templates/HANDOFF.template.md "$PROJ/docs/HANDOFF.md"
cp conclave/templates/REQUIREMENTS.template.md "$PROJ/docs/REQUIREMENTS.md"

# 役割プロンプト
cp -r conclave/prompts "$PROJ/prompts"

# 統治ドキュメント (憲法・エスカレーション・役割) はリンクするか docs/ にコピー
cp conclave/governance/*.md conclave/roles/*.md conclave/principles/*.md "$PROJ/docs/" 2>/dev/null || true
```

---

## ステップ 2 — プレースホルダを埋める

`<...>` を自プロジェクトの値で置換する。優先順位順:

| ファイル | 埋めるもの | 必須度 |
|---|---|---|
| `AGENTS.md` §1 | プロジェクト概要・言語・実行コマンド | ★必須 |
| `AGENTS.md` §3 | **絶対 NG (憲法)** — 6 分類を自プロジェクトに具体化 | ★必須 |
| `AGENTS.md` §4 | 品質ゲートコマンド (test/lint/type) | ★必須 |
| `AGENTS.md` §7 | 役割スロットへのモデル割り当て | ★必須 |
| `ORCHESTRATION_RUNBOOK.md` §2 | 状態判定決定木 (フェーズ固有の行) | ★必須 |
| `ORCHESTRATION_RUNBOOK.md` §3 | 外部 AI ルーティング (CLI・モデル・fallback) | 委任するなら必須 |
| `ROLE_TOPOLOGY.md` §2 | モデルバインディング表 | ★必須 |
| `ORCHESTRATION_RUNBOOK.md` §6 | 定常運用ループ | 本番運用があれば |

> **憲法 (§3) の起草が最重要。** ここで「やってはいけないこと」を具体に書くほど、AI の暴走・スコープ膨張が止まる。テンプレートの 6 分類 ([CONSTITUTION](governance/CONSTITUTION.md)) を 1 つずつ自問して埋める。

---

## ステップ 3 — 上流を起動する

```text
1. [人間] docs/REQUIREMENTS.md を書く (目的・スコープ・非スコープ・受け入れ条件)
2. [ARCHITECT] DESIGN.md を生成   ← prompts/architect.md を使う
3. [ARCHITECT] IMPLEMENTATION_PLAN.md でタスク分解
4. [IMPLEMENTER] agent/<task-id>-impl で実装 + TEST_LOG  ← prompts/implement.md
5. [REVIEWER] REVIEW_REPORT (証跡必須)                   ← prompts/review.md
6. [QA_MEMORY] QA_REPORT + PROJECT_STATE 更新            ← prompts/qa.md
7. [人間] merge 承認
```

---

## ステップ 4 — 自走を確認する

オーケストレーター AI に「`docs/ORCHESTRATION_RUNBOOK.md` の起動シーケンスを実行し、決定木で現在地を判定して次の一手を述べよ」と指示する。**人間が次の手を指示しなくても、決定木から次アクションが導出されれば成功。**

健全性チェック:
- [ ] AI がコールドスタートで読むべきファイルを正しい順で読んだか
- [ ] 現在地を決定木の 1 行に正しくマップしたか
- [ ] 人間ゲートに当たったとき、追加作業を発明せず停止したか
- [ ] 状態を `PROJECT_STATE.md` に書き出したか (内部記憶で済ませていないか)

---

## 段階的導入 (最小構成から)

全部を一度に入れる必要はない。価値の高い順:

1. **憲法だけ** (`AGENTS.md` §3) — AI の暴走を即座に止める。1 ファイルで効果大。
2. **+ 真の記憶** (`PROJECT_STATE.md`) — セッション跨ぎの継続性。
3. **+ DoD** (品質ゲートのフレッシュ実行) — 「動いた気がする」完了の撲滅。
4. **+ 役割分離** (実装≠レビュー≠QA) — 自己承認の盲点を消す。複数 AI が要る。
5. **+ 運用書** (決定木) — 人間の逐次指示なしの自走。フル Conclave。

---

## よくある失敗

| 失敗 | 対策 |
|---|---|
| `AGENTS.md` が 300 行を超え、AI が守らない | 要旨だけ残し詳細は各 md へポインタ。CLAUDE.md は 200 行以下が確実 |
| 状態をチャットだけで伝え PROJECT_STATE に書かない | 「永続化 > 内部記憶」を徹底。チャット合意で実装を進めない |
| 実装した AI に同じ文脈でレビューさせる | 別セッション・別モデルに分離。PR 作者 ≠ レビュアー |
| 委任結果を無検証で事実として記録 | 出典 URL の実在確認・コードは品質ゲート通過を確認 |
| 環境エラーで AI がトークンを溶かし続ける | 2 回連続失敗で区分 D として停止・人間へ |
| 憲法が抽象的で違反を検出できない | 「誰が見ても合否が判定できる」粒度で書く |
