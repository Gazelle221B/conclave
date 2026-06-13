# 抽出元の対応表 — panda-tech-news ↔ Conclave

> Conclave は架空の理論ではなく、実運用された [`panda-tech-news`](../../panda-tech-news) (中華圏テック AI ポッドキャストの生成・配信パイプライン) から抽出した。
> ここでは「抽象 (Conclave) ↔ 実体 (panda-tech-news)」の対応を示し、各パターンが実プロジェクトでどう具現化したかを記録する。

---

## プロジェクト概要 (実体)

- **何**: 中国語ネイティブの一次/準一次/コミュニティ情報を収集し、日本語リスナー向けに平日朝 5-10 分の AI ポッドキャスト「華流テック通信 — HAL Daily Briefing」を生成・配信
- **パイプライン**: `collect` (収集) → `edit` (LLM 編集判定・選定・アーク配置) → `script` (台本生成+fallback) → `deliver` (Discord)
- **言語**: Python 3.11+ 単一 (ADR-0001)。`uv` パッケージ管理
- **規模**: docs 38 md / src 26 py / tests 242 件 pass。Sprint 1A→1B 完了、Sprint 2 (音声化) は人間 Go 待ち

---

## Pillar 対応

### Pillar 1 — The Council (役割スロット ↔ 実モデル)

| スロット (抽象) | 実体 |
|---|---|
| `HUMAN` | プロダクトオーナー (要件・merge 承認) |
| `ARCHITECT` | Claude Code + Opus |
| `IMPLEMENTER` | OpenCode + Qwen3.7-max / MiniMax-M3 / Kimi-k2.6 (Go プラン)、上限時 Nemotron-3-ultra-free |
| `REVIEWER` | Codex CLI + GPT-5 high reasoning |
| `QA_MEMORY` | Antigravity (agy) + Gemini 大コンテキスト |

→ 抽象化のポイント: フレームワークからは固有モデル名を剥がし、スロット + 差し替え可能なバインディング表にした。実体の「OpenCode ≤1.15.0 の seq バグ → upgrade で解消」のような運用知見は RUNBOOK §3 の「既知の不調」欄に残す形に一般化。

### Pillar 2 — The Constitution (絶対 NG)

実体の `AGENTS.md §3` が原型。6 分類:
- C-1 リポジトリ: main 直 push 禁止 / merge 人間専権 / `--no-verify` 禁止 / `.env` commit 禁止
- C-2 データ: `UNIQUE(source_id, item_key)` のみ / 空 `item_key` INSERT 禁止 / `item_key` 生成順固定 (`external_id`→`link`→`sha256(...)`) / コードポイント単位の切り詰め
- C-3 耐障害性: ソース単位 fail-open / Discord 失敗で collect を落とさない / HTTP 30s タイムアウト + リトライ 2
- C-4 スコープ境界: Sprint 1A で TTS/動画/YouTube を入れない / コスト上限 (月1,500-3,000円) 超過は人間判断
- C-5 コンテンツ・法務: 記事本文転載禁止 / 無断声クローン禁止 / 「中国すごい/日本終わった」型ナラティブ禁止 / AI 音声の明示義務
- C-6 スタック: Go/Node ハイブリッドへ戻さない (ADR-0001)

### Pillar 3 — The Record (SSOT ドキュメント)

実体の `docs/` がそのまま原型: `requirements-v1.0.md` / `DESIGN.md` / `IMPLEMENTATION_PLAN*.md` / `WORKFLOW.md` / `PROJECT_STATE.md` / `TEST_LOG.md` / `REVIEW_REPORT.md` / `QA_REPORT.md` / `HANDOFF.md` / `adr/`。テンプレートは `WORKFLOW.md §9` の雛形を汎用化した。

### Pillar 4 — The Runbook (自走エンジン)

実体の `docs/ORCHESTRATION_RUNBOOK.md` が原型。最も価値の高い発明:「交代した AI が人間の逐次指示なしに、起動シーケンス → 状態判定決定木 → 委任 → 検証 → 記録を回せる」。実体の決定木は T22 (3 日品質観察) の進行を 8 行で機械判定していた。

### Pillar 5 — The Craft (工学不変条件 ↔ 実コード)

| 不変条件 (抽象) | 実体のファイル |
|---|---|
| INV-1 単位 fail-open | `collect/runner.py` (ソース単位の例外封じ込め + `source_health`) |
| INV-2 設定駆動 | `config/llm_profiles.yaml` + `llm/profile.py` (A/B/C 役割マッピング) |
| INV-3 LLM 抽象 | `llm/client.py` (リトライ + `content`/`reasoning_content`/`reasoning` 多フィールドパース) |
| INV-4 責務分離 | `edit/judge.py` (JSON 判定 temp=0) vs `script/generate.py` (散文)。並べ替えは `edit/arc.py` の決定的コード |
| INV-5 fallback の砦 | `script/fallback.py` (再生成 1 回 → テンプレ乱択。`method` を記録) |
| INV-6 状態外部化 | `store/schema.py` (4 テーブル + `UNIQUE` 制約)。逆向き依存禁止 `collect→store←deliver` |

### Pillar 6 — The Discipline (実行規律)

実体の `AGENTS.md §12` (Karpathy 4 原則の手続き化) + `commit-rules.md` (フレッシュ実行ゲート) + `WORKFLOW.md §10` (DoD) + `§5` (唯一の監視点: 同じ場所で 2 回詰まる = 要件欠陥) が原型。

---

## 抽象化で削ぎ落としたもの (ドメイン固有)

Conclave に持ち込まなかった実体固有の要素 (各プロジェクトで再定義する):
- ドメイン: 中華圏テック、ポッドキャスト、HAL 人格、editorial-policy、show-format
- 具体配信先: Discord Webhook、将来の YouTube/TTS
- 具体ソース: RSSHub、掘金、11 ソースの tier 分類
- 具体モデル: MiMo / DeepSeek / Ollama の接続詳細

これらは Conclave の **Pillar 2 (憲法 C-5)** と **Pillar 5 (設定駆動)** の「埋める枠」として残してある。
