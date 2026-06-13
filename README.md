# Conclave — 自律マルチエージェント・プロジェクト統治フレームワーク

> **Conclave (コンクラーベ)** = 厳格な規則の下、外部の逐次指示なしに高難度の意思決定を行う合議体。
> このフレームワークは、複数の AI エージェント (Claude / Codex / Gemini / OpenCode など) を「合議体」として組織し、**人間が要件と最終承認だけを握り、残りの設計・実装・レビュー・QA・運用を AI 群が自走で回す**ための、ドメイン非依存・モデル非依存の運用基盤である。

抽出元: [`panda-tech-news`](../panda-tech-news) (中華圏テック AI ポッドキャストの生成・配信パイプライン) で実証・運用された自律オーケストレーション基盤。固有名・ドメイン・特定モデルを剥がし、再利用可能な構造として整理した。

---

## なぜこれが要るのか

単一の AI に「このプロジェクトを完成させて」と投げると、次の壊れ方をする:

| 失敗モード | 単一エージェントで起きること | Conclave の対処 |
|---|---|---|
| **自己承認** | 実装した本人がレビューし「動きました」と宣言 (盲点が残る) | 実装者 ≠ レビュアー ≠ QA を**別エージェント**に強制 (Pillar 1) |
| **記憶の蒸発** | セッションが切れると進捗・判断理由が消える | 状態を**ファイルに永続化**し内部記憶を真実の源にしない (Pillar 3) |
| **暴走 / スコープ膨張** | 「ついでに」機能追加・大規模リファクタ | **憲法 (絶対NG)** が全行動に優先し、抵触したら停止 (Pillar 2) |
| **指示待ちで停止** | 人間が次を指示するまで何もできない | **決定木**で現在地→次の一手を機械的に引く (Pillar 4) |
| **「動いた気がする」完了** | テスト未実行のまま完了宣言 | **フレッシュ実行の品質ゲート**を完了の定義に (Pillar 6) |
| **トークンの浪費** | 最高コストのモデルで雑用まで回す | **希少資源を上流設計と難所だけに集中**投下 (Pillar 1) |

Conclave は、これらを「個々のエージェントの賢さ」ではなく**組織設計と運用規律**で解く。健全なエンジニアリング組織のガバナンス (指揮系統・責務分離・エスカレーションパス・受け入れ条件・権限ゲート) を AI 群へ写経したものである。

---

## 6 本の柱

| 柱 | 問い | 担当ファイル |
|---|---|---|
| **1. The Council (合議体)** | 誰が動くか | [roles/ROLE_TOPOLOGY.md](roles/ROLE_TOPOLOGY.md) |
| **2. The Constitution (憲法)** | 何が絶対に起きてはならないか | [governance/CONSTITUTION.md](governance/CONSTITUTION.md) / [governance/ESCALATION.md](governance/ESCALATION.md) |
| **3. The Record (記録)** | 真実はどこに住むか | [templates/](templates/) + [FRAMEWORK.md](FRAMEWORK.md) §3 |
| **4. The Runbook (運用書)** | どう自走するか | [runbook/ORCHESTRATION_RUNBOOK.template.md](runbook/ORCHESTRATION_RUNBOOK.template.md) |
| **5. The Craft (工学不変条件)** | どう堅牢に作るか | [principles/ENGINEERING_INVARIANTS.md](principles/ENGINEERING_INVARIANTS.md) |
| **6. The Discipline (実行規律)** | どう確実に終わらせるか | [principles/EXECUTION_DISCIPLINE.md](principles/EXECUTION_DISCIPLINE.md) |

全体の思想と各柱の「なぜ」は **[FRAMEWORK.md](FRAMEWORK.md)** に集約。

---

## 60 秒クイックスタート (新規プロジェクトへの導入)

```bash
# 1. テンプレートを新規プロジェクトへコピー
cp -r conclave/templates/* <your-project>/docs/
cp conclave/templates/AGENTS.template.md <your-project>/AGENTS.md
cp conclave/runbook/ORCHESTRATION_RUNBOOK.template.md <your-project>/docs/ORCHESTRATION_RUNBOOK.md
cp -r conclave/prompts <your-project>/prompts
cd <your-project>
ln -s AGENTS.md CLAUDE.md          # 全 AI ツールが AGENTS.md を読む

# 2. プレースホルダ <...> を自プロジェクトの値で埋める (ADOPTION.md のチェックリスト)
# 3. 人間が REQUIREMENTS.md を書く → アーキテクトに DESIGN.md を作らせる → 委任サイクル開始
```

導入の完全手順は **[ADOPTION.md](ADOPTION.md)**。

---

## ファイルマップ

```text
conclave/
├── README.md                  # 本書 — 正面玄関・6 本柱・クイックスタート
├── FRAMEWORK.md               # ★ 思想の背骨 — 6 柱の詳説と設計判断の根拠
├── ADOPTION.md                # 新規プロジェクトへ落とし込む手順 + プレースホルダ表
├── roles/
│   └── ROLE_TOPOLOGY.md       # Pillar 1 — 合議体の役割スロット (モデル非依存) と再評価ルール
├── governance/
│   ├── CONSTITUTION.md        # Pillar 2 — 絶対 NG の 6 分類と自プロジェクト版の書き方
│   └── ESCALATION.md          # 失敗分類 A-E + 人間専権ゲート + 唯一の監視点
├── runbook/
│   └── ORCHESTRATION_RUNBOOK.template.md  # Pillar 4 — 起動順・状態判定決定木・委任ルーティング
├── principles/
│   ├── ENGINEERING_INVARIANTS.md  # Pillar 5 — fail-open / 設定駆動 / LLM抽象 / fallback / 状態外部化
│   └── EXECUTION_DISCIPLINE.md     # Pillar 6 — Karpathy 4 原則の手続き化 + 検証 + DoD
├── templates/                 # Pillar 3 — コピペ可能な SSOT ドキュメント雛形
│   ├── AGENTS.template.md          # 全 AI ツール共通の最上位指示書 (≤300 行)
│   ├── REQUIREMENTS.template.md    # 人間が書く問題定義 (起点)
│   ├── DESIGN.template.md          # アーキテクトが書く単一の真実の源
│   ├── IMPLEMENTATION_PLAN.template.md
│   ├── REVIEW_REPORT.template.md   # レビュアーの判定 (証跡欄必須)
│   ├── QA_REPORT.template.md
│   ├── PROJECT_STATE.template.md   # ★ 真の記憶 (全エージェント随時更新)
│   └── HANDOFF.template.md         # 時点スナップショット (交代時の 5 分把握)
├── prompts/                   # 各役割スロット宛の汎用 system プロンプト
│   ├── architect.md  implement.md  review.md  qa.md
└── examples/
    └── panda-tech-news.md     # 抽出元の具体マッピング (抽象 ↔ 実体の対応表)
```

---

## 設計原則 (1 行ずつ)

1. **視点の独立性** — 計画者・実装者・レビュアーは必ず別エージェント。実装した本人にレビューさせない。
2. **希少資源の集中投下** — 最高コストのモデルは上流設計と難所エスカレーションの 2 点のみに投入。
3. **問題定義は人間が握る** — 各役割に人間超えの性能を置く以上、堂々巡りは能力ではなく**要件・スコープの欠陥**のシグナル。
4. **永続化 > 内部記憶** — 状態・判断・証跡はモデルの記憶ではなくリポジトリ内ファイルに残す。
5. **ドキュメントが唯一の真実の源** — 受け渡しは自然言語チャットではなく成果物ドキュメントで行う。
6. **疑ったら止める** — 憲法 (絶対NG) に抵触しそうなら実装を止め、判断材料を添えて人間へエスカレーション。
7. **完了は検証で定義する** — 「動いた気がする」を採用しない。フレッシュ実行の証跡が緑になって初めて完了。

> 出典思想: Andrej Karpathy の LLM コーディング 4 原則、健全なエンジニアリング組織のガバナンス、`tc-newsflow` (Go 版) からの設計継承。詳細は [FRAMEWORK.md](FRAMEWORK.md)。
