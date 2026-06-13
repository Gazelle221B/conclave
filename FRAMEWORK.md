# Conclave Framework — 思想と設計判断の根拠

本書は Conclave の**概念モデル**を定義する。各柱の具体的な運用手順・テンプレートは個別ファイルへ委ね(リンクを置く)、ここでは「なぜそうするのか」を述べる。

---

## 0. 中核命題

> **個々の AI の賢さではなく、組織設計と運用規律でプロジェクトを完成させる。**

前提として、各役割には「人間のトップタレントを超えうる」性能の AI を配置できる時代になった。その前提が真なら、プロジェクトが炎上する原因は**能力不足ではなく、要件・スコープ・受け渡し・記憶の設計欠陥**である。Conclave は能力ではなくこの構造を直す。

3 つの土台原則:

1. **視点の独立性 (Separation of Viewpoints)** — 計画者・実装者・レビュアーは必ず別エージェント。実装した本人にレビューさせない (PR 作者 ≠ レビュアー)。同一コンテキストでの自己承認は盲点を残す。
2. **希少資源の集中投下 (Scarce-Resource Concentration)** — 最も高コストな Dense モデルは「上流設計」と「難所エスカレーション」の 2 点のみに投入。日常実装・大量生成は低コストモデルに委任し、オーケストレーターのトークンは計画・統合・判断・検証に温存する。
3. **問題定義は人間が握る (Human Owns the Problem)** — 人間は「作ること」ではなく「何を作るべきかを正しく定義し続けること」に純化される。

---

## Pillar 1 — The Council (合議体): 誰が動くか

→ 詳細: [roles/ROLE_TOPOLOGY.md](roles/ROLE_TOPOLOGY.md)

実在のエンジニアリング組織のロールを AI 群へ写経する。**重要なのは具体的なモデル名ではなく「役割スロット (capability slot)」**である。モデルの優劣はリリースごとに入れ替わるため、スロットへのモデル割り当ては差し替え可能な設定として扱う。

| 役割スロット | 組織ロール | 責務 | 投入の頻度 |
|---|---|---|---|
| `HUMAN` | プロダクトオーナー | 要件・スコープ定義、merge 承認 | 起点と最終ゲートのみ |
| `ARCHITECT` | プリンシパル/アーキテクト | 上流設計、計画策定、難所解決 | 起点と難所のみ (希少資源) |
| `IMPLEMENTER` | 実装ミドルチーム | 実装の主軸、大量生成、定型作業 | 日常 (低コスト) |
| `REVIEWER` | 独立レビュアー | DESIGN 基準の検証。実装に関与しない | 各 PR |
| `QA_MEMORY` | テックリード/記憶装置 | 受け入れ条件検証、整合性確認 | 各リリース |

**なぜスロット抽象か**: 「実装主軸=A モデル、レビュー=B モデル」の割り当ては、その時点のベンチ順位と運用観測に依存する。新モデルが出たら**再評価**する (ROLE_TOPOLOGY §再評価条項)。フレームワークはこの差し替えに耐える形で設計する。

---

## Pillar 2 — The Constitution (憲法): 何が絶対に起きてはならないか

→ 詳細: [governance/CONSTITUTION.md](governance/CONSTITUTION.md) / [governance/ESCALATION.md](governance/ESCALATION.md)

プロジェクトには、**他のあらゆる指示・最適化・善意に優先する不変条件 (絶対 NG)** がある。これを憲法として明文化し、全エージェントの全行動の最上位に置く。

抽出元では 6 分類だった (汎用化した枠):

1. **リポジトリ運用** — 例: 保護ブランチへの直 push 禁止、merge は人間専権、hook スキップ禁止、秘密ファイル commit 禁止
2. **データ・スキーマ** — 例: 一意制約の不変、空キー INSERT 禁止、ID 生成順の固定、エンコーディング単位の固定
3. **耐障害性** — 例: 1 単位の失敗で全体を止めない (fail-open)、副系の失敗で主系を落とさない、タイムアウト必須
4. **スコープ境界** — 例: フェーズ越境の禁止 (現フェーズの DoD 充足まで次フェーズ機能を入れない)、コスト上限超過は人間判断
5. **コンテンツ・法務・倫理** — プロジェクト固有の禁止表現・転載・権利
6. **技術スタック** — 言語/構成の決定 (ADR) を勝手に覆さない

**設計の肝**: 憲法は「やれること」ではなく「やってはいけないこと」を列挙する。AI は善意で機能を足し、コードを「改善」し、スコープを広げる。これを止めるのは能力ではなくルールである。**抵触しそうなら実装を止めて人間へ**(Pillar 4 の決定木が「人間ゲート」を指したら追加作業を発明しない)。

エスカレーションは 5 分類 (A-E) に標準化する → [ESCALATION.md](governance/ESCALATION.md)。

---

## Pillar 3 — The Record (記録): 真実はどこに住むか

→ テンプレート群: [templates/](templates/)

**永続化 > 内部記憶。** 状態・判断・証跡はモデルのコンテキストではなくリポジトリ内ファイルに住む。これにより、どのエージェントが落ちても・交代しても、ファイルを読めば継続できる。

ドキュメントを工程間の**唯一の受け渡し媒体**とする (チャット会話の合意で実装を進めない)。各成果物は「何を入力に受け取り、何を出力したら合格か」が固定される。

| 成果物 | 作成者 | 役割 | テンプレート |
|---|---|---|---|
| `AGENTS.md` | 人間+アーキテクト | 全 AI ツール共通の最上位指示書 (≤300 行) | [AGENTS.template.md](templates/AGENTS.template.md) |
| `REQUIREMENTS.md` | 人間 | 問題定義の起点 | [REQUIREMENTS.template.md](templates/REQUIREMENTS.template.md) |
| `DESIGN.md` | `ARCHITECT` | **設計の単一の真実の源** | [DESIGN.template.md](templates/DESIGN.template.md) |
| `IMPLEMENTATION_PLAN.md` | `ARCHITECT` | 実装単位への分解 | [IMPLEMENTATION_PLAN.template.md](templates/IMPLEMENTATION_PLAN.template.md) |
| `TEST_LOG.md` | `IMPLEMENTER` | テスト実行の証跡 | (自由形式; 実行コマンド+結果) |
| `REVIEW_REPORT.md` | `REVIEWER` | 品質ゲートの判定 (証跡欄必須) | [REVIEW_REPORT.template.md](templates/REVIEW_REPORT.template.md) |
| `QA_REPORT.md` | `QA_MEMORY` | 受け入れ検収 | [QA_REPORT.template.md](templates/QA_REPORT.template.md) |
| `PROJECT_STATE.md` | 全員 | **真の記憶** (随時更新) | [PROJECT_STATE.template.md](templates/PROJECT_STATE.template.md) |
| `HANDOFF.md` | 現オーケストレーター | 時点スナップショット | [HANDOFF.template.md](templates/HANDOFF.template.md) |

**二層の記憶構成**: 大コンテキストモデルの内部記憶は「速い参照」に使い、「真の記憶」は `PROJECT_STATE.md` に置く。`AGENTS.md` (恒久指示) と `ORCHESTRATION_RUNBOOK.md` (恒久手順) は陳腐化しない形に保ち、時点情報は `HANDOFF.md` / `PROJECT_STATE.md` に隔離する。

---

## Pillar 4 — The Runbook (運用書): どう自走するか

→ 詳細: [runbook/ORCHESTRATION_RUNBOOK.template.md](runbook/ORCHESTRATION_RUNBOOK.template.md)

これが Conclave の**自走エンジン**であり、抽出元プロジェクトで最も価値の高い発明である。「オーケストレーターが交代しても、この 1 冊を読めば人間の逐次指示なしに回せる」ことを保証する。

3 つの機構:

1. **起動シーケンス** — コールドスタート時に読むファイルの順序を固定する。「とりあえず実装」を始めさせない。
2. **状態判定 → 次アクションの決定木** — `PROJECT_STATE` と git/PR 状態を突き合わせ、上から最初に当てはまる行を実行する。現在地から次の一手を**機械的に**引けるようにする。決定木が「人間ゲート」を指したら追加作業を発明せず停止する。
3. **外部 AI ルーティング表** — 「どの用途を誰に投げ、どう非対話呼び出しし、トークン上限到達時にどう fallback するか」を表で固定。**委任結果は必ず自分で検証してから採用**(出典 URL の実在確認、コードなら品質ゲート)。役割分離 (実装者≠レビュアー≠QA) を運用レベルで強制する。

> **WORKFLOW (組織契約) と RUNBOOK (操作手順) は補完関係**: 前者は「誰が何の役割か」、後者は「どう自走するか」を定義する。両者を分けることで、組織設計を変えずに運用手順だけ改訂できる。

---

## Pillar 5 — The Craft (工学不変条件): どう堅牢に作るか

→ 詳細: [principles/ENGINEERING_INVARIANTS.md](principles/ENGINEERING_INVARIANTS.md)

抽出元のコードに結晶化していた、**ドメイン非依存で移植可能な工学パターン**:

- **単位 fail-open** — 1 ソース/1 タスクの失敗でパイプライン全体を止めない。失敗は記録し、健全な部分は完走する。
- **設定駆動** — 振る舞い (ソース、モデル割り当て、人格、フォーマット) を YAML 化し、コードを触らず差し替える。A/B/C 検証の役割マッピングも設定で切替。
- **LLM プロバイダ抽象** — OpenAI 互換を最大公約数とし profile 単位で provider 切替。リトライ付き。応答は複数フィールド (`content` → `reasoning_content` → `reasoning`) を順に試す頑健パース。秘密キーは環境変数**名**を設定に置き、値はログ・例外に出さない。
- **責務の分離 (LLM vs 決定的コード)** — JSON 判定と散文生成を同一モデルに同時にさせない。並べ替え・トーン選択など決定性が要る所は決定的コードで行い LLM に委ねない。
- **fallback 無しで配信しない** — LLM が出力を崩した日でも成果物を出す「最後の砦」。テンプレ生成は常に契約適合・乱択で単調さを回避。
- **状態の外部永続化** — 進捗・健全性・実行履歴を DB/ファイルに残し、冪等な再実行を可能にする。

---

## Pillar 6 — The Discipline (実行規律): どう確実に終わらせるか

→ 詳細: [principles/EXECUTION_DISCIPLINE.md](principles/EXECUTION_DISCIPLINE.md)

Andrej Karpathy の LLM コーディング 4 原則を、**検証可能な手続き**へ翻訳する:

1. **Think Before Coding** — 設計書を読まずに着手しない。複数解釈は全部出す。不明点は着手前に列挙する。
2. **Simplicity First** — 問題を解く最小コード。単一用途の抽象化・投機的機能を書かない。
3. **Surgical Changes** — タスクに直接トレースできる変更のみ。無関係な整形・リファクタを混ぜない。自分が作った orphan だけ片付ける。
4. **Goal-Driven Execution** — 命令形を検証可能形に変換 (「fail-open を実装」→「1 ソースが例外でも他が完走するテストを緑にする」)。

そして**完了の定義 (DoD)**: 品質ゲート (テスト/lint/型) を**フレッシュ実行**で緑にして初めて「完了」と言う。記憶で代用しない。レビューは必ず `file:line` の根拠に紐付け、証跡なしの PASS を出さない。

**人間が監視すべき唯一の点**: 「同じ場所で 2 回以上詰まる」現象。発火したらコードではなく要件を見直す。これは能力の限界ではなく**問題定義の欠陥**の、最も価値の高いアラートである。

---

## 柱の相互関係 (1 枚の地図)

```text
        [HUMAN] 要件を定義 (Pillar 1 の天井)
            │  REQUIREMENTS.md
            ▼
   ┌─────────────────────────────────────────────┐
   │  THE CONSTITUTION (Pillar 2) — 全行動に優先    │
   │  抵触したら停止して人間へ (ESCALATION A-E)      │
   └─────────────────────────────────────────────┘
            │
   [ARCHITECT] DESIGN.md (単一の真実の源)
            │
   [IMPLEMENTER] 実装 + TEST_LOG ──┐  ← The Craft (Pillar 5) で堅牢に
            │                      │     The Discipline (Pillar 6) で確実に
   [REVIEWER] REVIEW_REPORT ───────┤
            │ (証跡必須)            │
   [QA_MEMORY] QA_REPORT ──────────┘
            │
   [HUMAN] merge 承認 (人間専権ゲート)
            │
   ┌─────────────────────────────────────────────┐
   │  全工程の状態は PROJECT_STATE.md に永続化 (P3) │
   │  自走は ORCHESTRATION_RUNBOOK の決定木 (P4)    │
   └─────────────────────────────────────────────┘
```

抽象 ↔ 実体 (panda-tech-news) の対応は [examples/panda-tech-news.md](examples/panda-tech-news.md)。
