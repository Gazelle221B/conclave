# AGENTS.md — `<プロジェクト名>`

> このファイルは Claude Code / Codex CLI / Copilot CLI / Gemini CLI など **AGENTS.md 対応の全 AI ツールが自動読込する最上位の指示書**である。`CLAUDE.md` は本ファイルへのシンボリックリンク (`ln -s AGENTS.md CLAUDE.md`)。
> **要旨と禁止事項に絞り 300 行以内に収める。** 詳細は各 `docs/` へポインタを置く。
> 🔧 `<...>` を自プロジェクトの値で埋める。

## 1. プロジェクト概要

`<1-2 段落: 何を作るか、誰のために、北極星指標は何か>`

| 項目 | 値 |
|---|---|
| 配布名 / リポジトリ | `<...>` |
| 主要言語 / ランタイム | `<...>` (ADR-0001) |
| パッケージ管理 | `<...>` |
| 実行コマンド | `<...>` |

## 2. 現在のフェーズ (随時更新は `docs/PROJECT_STATE.md`)

- `<現在のスプリント/フェーズと残作業を 2-3 行>`
- 作業ブランチ: `agent/<task-id>-impl`

## 3. 絶対 NG (禁止事項) — 最優先

> 全文・分類は [CONSTITUTION](docs/conclave/governance/CONSTITUTION.md) 相当。**いずれか抵触しそうなら実装を止めてエスカレーション** ([ESCALATION](docs/conclave/governance/ESCALATION.md))。

- **C-1 リポジトリ**: 保護ブランチ直 push 禁止 / merge は人間専権 / hook スキップ禁止 / `.env` commit 禁止
- **C-2 データ**: `<一意制約・キー生成順・エンコーディング単位の不変条件>`
- **C-3 耐障害性**: 単位 fail-open / 副系失敗で主系を落とさない / タイムアウト+リトライ必須
- **C-4 スコープ境界**: 現フェーズ DoD 充足まで次フェーズ機能を入れない / コスト上限超過は人間判断 / 「ついで」禁止
- **C-5 コンテンツ・法務**: `<プロジェクト固有の禁止>`
- **C-6 スタック**: 確定済み ADR を勝手に覆さない
- **C-7 終了**: 全委任タスクに明示的終了条件 + 最大反復上限。出口なしループ禁止 / 早すぎる完了宣言禁止
- **C-8 過剰修正**: 確認できないだけで先行エージェントの事実主張を削除・書換しない (unverifiable ≠ false)。フラグして escalate

## 4. 主要コマンド

```bash
# セットアップ
<setup>
# 品質ゲート (PR 前に必ず通す — フレッシュ実行)
<test>   # ユニットテスト
<lint>   # Lint
<type>   # 型チェック
# 定常運用
<run>
```

## 5. アーキテクチャ方針

`docs/DESIGN.md` が **単一の真実の源 (Single Source of Truth)**。要旨:
- `<中核原則を 3 つ程度。例: 最小構成・fail-open・状態の外部永続化>`
- 依存最小 / 設定駆動 / 逆向き依存禁止
- 判断基準の知識ベース: レイヤー責務は `docs/architecture.md`、規約は `docs/styleguide.md`。

## 6. ディレクトリ構造

```text
<tree>
```

## 7. マルチエージェント運用 (最重要原則)

→ 組織契約・役割: `docs/conclave/roles/ROLE_TOPOLOGY.md`。**実装者・レビュアー・QA は必ず別エージェント** (PR 作者 ≠ レビュアー)。

| 役割スロット | 基盤+モデル | 責務 |
|---|---|---|
| `HUMAN` | — | 要件・スコープ・merge 承認 |
| `ARCHITECT` | `<...>` | 上流設計・計画・難所 |
| `IMPLEMENTER` | `<...>` | 実装主軸 |
| `REVIEWER` | `<...>` | 独立レビュー |
| `QA_MEMORY` | `<...>` | 最終 QA・整合性 |

**永続化 > 内部記憶**: 状態は必ず `docs/PROJECT_STATE.md` に書く。
**エスカレーション分類** A-E: → [ESCALATION](docs/conclave/governance/ESCALATION.md)。

## 8. コミット規約とブランチ運用

- Conventional Commits: `<type>: <description>` (`feat`/`fix`/`refactor`/`docs`/`test`/`chore`/`perf`/`ci`)
- `main`: 常に安定。直接 push 禁止。実装は `agent/<task-id>-impl`。**PR マージ後はブランチを使い回さず最新 main から切り直す。**
- merge は **レビュー PASS + QA PASS + 人間承認** の三条件後のみ。
- PR 前チェック: テスト緑 / lint クリーン / 型クリーン / TEST_LOG 追記 / PROJECT_STATE 最新化 / 絶対NG 自己点検 / 秘密混入なし

## 9. 品質ゲート (Definition of Done)

→ 全文: [EXECUTION_DISCIPLINE](docs/conclave/principles/EXECUTION_DISCIPLINE.md)。`<カバレッジ目標、本番完走条件、N 日連続稼働などプロジェクト固有の DoD>`

## 10. ドキュメント地図

| 種別 | パス | 役割 |
|---|---|---|
| 要件 | docs/REQUIREMENTS.md | 問題定義の起点 |
| 設計 | docs/DESIGN.md | **単一の真実の源** |
| 運用書 | docs/conclave/runbook/ORCHESTRATION_RUNBOOK.md | ★ 自律オーケストレーション手順。交代した AI はまずここ |
| 引き継ぎ | docs/HANDOFF.md | 時点スナップショット |
| 状態 | docs/PROJECT_STATE.md | ★ 真の記憶 |
| 組織契約 | docs/conclave/roles/ROLE_TOPOLOGY.md | 役割スロット・委任の鉄則 (誰が何の役割か) |
| 憲法 | docs/conclave/governance/CONSTITUTION.md / docs/conclave/governance/ESCALATION.md | 絶対 NG (C-1〜C-8) + 失敗分類 A-E |
| 原則 | docs/conclave/principles/EXECUTION_DISCIPLINE.md ほか | 実行規律 / 工学不変条件 / 文脈衛生 / 失敗分類 / 判定信頼性 |
| ADR | docs/adr/INDEX.md | 設計判断記録 |
| 証跡 | docs/TEST_LOG.md / REVIEW_REPORT.md / QA_REPORT.md | 実装/レビュー/QA |

## 11. AI エージェント向け運用ルール

1. **作業開始時に必ず読む**: 本書 → `docs/PROJECT_STATE.md` → `docs/conclave/runbook/ORCHESTRATION_RUNBOOK.md` → `docs/DESIGN.md` → 該当 Ticket。
2. **判断ログを残す**: 設計判断は ADR へ。
3. **状態を必ず書く**: 進捗・人間判断待ちは `PROJECT_STATE.md` へ。
4. **疑ったら止める**: 絶対 NG (§3) 抵触で停止しエスカレーション。
5. **フェーズ越境禁止**: 現フェーズ DoD 充足まで次フェーズ機能を入れない。
6. **ドキュメントが SSOT**: チャット合意のみで実装を進めない。

## 12. コーディング原則 (Karpathy 4 原則)

→ 手続き化の全文: [EXECUTION_DISCIPLINE](docs/conclave/principles/EXECUTION_DISCIPLINE.md)。**§3 絶対NG と矛盾する場合は §3 を優先**。
Think Before Coding / Simplicity First / Surgical Changes / Goal-Driven Execution。

---

> 改訂方針: 重大な設計判断は ADR を追加 → 本書 §3 / §5 / §10 を更新 → `PROJECT_STATE` の改訂履歴に同期。300 行制限維持のため詳細は該当 md へポインタを置く。
