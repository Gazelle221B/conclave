# Conclave — Git-native Agent Governance Layer for AI Software Development

> **Conclave keeps AI coding agents aligned, auditable, and handoff-safe across long-running software projects.**
> AI 開発における **GitHub Actions + CODEOWNERS + ADR + PMO + QA Gate** に相当する、Git ネイティブな統治レイヤー (AI Agent Governance Kit)。

**Conclave はワークフローではない。プロジェクト固有の AI ワークフローが、その上で動く _ガバナンス基盤 (governance substrate)_ である。**

ワークフローは「あなたのプロジェクトで何を・どの順で作るか」を定める。Conclave はそれを定めない——代わりに、どんなワークフローにも乗る**土台**(役割・憲法・記録・運用書の骨格・工学/実行の規律)を提供し、その上で走る AI 群を **整合 (aligned) / 監査可能 (auditable) / 引き継ぎ安全 (handoff-safe)** に保つ。

- **aligned** — 役割分離と SSOT で、複数 AI(や交代した AI)が矛盾なく同じ目標へ向かう (P1/P3)。
- **auditable** — 判断・証跡・状態が Git 内のファイルに残り、誰が・なぜ・何をしたかを後から追える (P3/P6)。
- **handoff-safe** — オーケストレーターが落ちても・交代しても、ファイルを読めば自走を再開できる (P3/P4)。

> 語源: **Conclave (コンクラーベ)** = 厳格な規則の下、外部の逐次指示なしに高難度の意思決定を行う合議体。複数の AI エージェント (Claude / Codex / Gemini / OpenCode など) を合議体として組織し、人間は要件と最終承認だけを握る。ドメイン非依存・モデル非依存・**Git ネイティブ**(状態はリポジトリのファイル・ブランチ・PR・ADR に住む)。

抽出元: [`panda-tech-news`](../panda-tech-news) (AI コンテンツ生成・配信パイプライン) で実証・運用された自律オーケストレーション基盤。固有名・ドメイン・特定モデルを剥がし、再利用可能な統治基盤として構造化した。v0.2 で 7 つの外部研究 (Cognition / Anthropic / MAST ほか) の検証済み知見を統合([CHANGELOG.md](CHANGELOG.md))。

---

## なぜ「Git ネイティブな統治レイヤー」なのか

人間のソフトウェアチームは、混沌を防ぐために Git/GitHub 上のガバナンス原始機構を使う。Conclave は**その AI 版**を、同じく Git ネイティブに提供する:

| 人間チームのガバナンス | Conclave の AI 版 (担当柱) |
|---|---|
| CODEOWNERS / レビュー必須 / PR 作者 ≠ 承認者 | 役割分離・judging の独立性 (P1) |
| ADR (設計判断記録) | DESIGN.md + `adr/` + The Record (P3) |
| PMO / プロジェクト状態ボード | PROJECT_STATE.md = 真の記憶 (P3/P4) |
| CI の required checks / QA Gate | 二段 DoD + ブロッキング品質ゲート (P6) |
| ブランチ保護 / マージ権限 | 憲法 C-1 + 人間専権ゲート (P2) |
| Runbook / on-call 手順 | ORCHESTRATION_RUNBOOK 決定木 (P4) |
| インシデント分類 | エスカレーション分類 A-E (P2) |

→ あなたは**ワークフロー**(または AI に生成させたワークフロー)を持ち込む。Conclave はそれを**整合・監査可能・引き継ぎ安全**に保つ substrate を敷く。

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
| **3. The Record (記録)** | 真実はどこに住むか | [templates/](templates/) + [FRAMEWORK.md](FRAMEWORK.md) Pillar 3 |
| **4. The Runbook (運用書)** | どう自走するか | [runbook/ORCHESTRATION_RUNBOOK.template.md](runbook/ORCHESTRATION_RUNBOOK.template.md) |
| **5. The Craft (工学不変条件)** | どう堅牢に作るか | [principles/ENGINEERING_INVARIANTS.md](principles/ENGINEERING_INVARIANTS.md) |
| **6. The Discipline (実行規律)** | どう確実に終わらせるか | [principles/EXECUTION_DISCIPLINE.md](principles/EXECUTION_DISCIPLINE.md) |

**v0.2 で追加した原則 (研究駆動):**

| 原則 | 問い | 担当ファイル |
|---|---|---|
| **Context Hygiene** (P5+) | 文脈という有限資源をどう守るか | [principles/CONTEXT_HYGIENE.md](principles/CONTEXT_HYGIENE.md) |
| **Failure Taxonomy** (P6+) | どの失敗モードを実証的に防げているか | [principles/FAILURE_TAXONOMY.md](principles/FAILURE_TAXONOMY.md) |
| **Judge Reliability** (P6+) | 検証者そのものをどう信頼しないか | [principles/JUDGE_RELIABILITY.md](principles/JUDGE_RELIABILITY.md) |

全体の思想と各柱の「なぜ」は **[FRAMEWORK.md](FRAMEWORK.md)** に集約。改訂履歴は **[CHANGELOG.md](CHANGELOG.md)**。

---

## プロダクトとして使う

Conclave は **ゼロ依存の npm CLI パッケージ**として配布できる。CLI はテンプレート、役割プロンプト、憲法、運用書、原則ドキュメントを任意の Git リポジトリへ配置し、導入状態を検査する。

```bash
# このリポジトリから配布 tarball を作る
npm pack

# 生成された tarball をインストールして使う
npm install -g ./conclave-governance-kit-0.3.2.tgz
conclave init <your-project>
conclave check <your-project>
```

公開済みパッケージとして配る場合の利用形:

```bash
npx conclave-governance-kit init <your-project>
npx conclave-governance-kit check <your-project>
```

### 任意: peer messaging with agmsg

複数の CLI エージェントを同時に動かすプロジェクトでは、[fujibee/agmsg](https://github.com/fujibee/agmsg) をローカル peer messaging transport として併用できる。Conclave は統治・記録・品質ゲートを担い、agmsg は live agent 間のメッセージ配送だけを担う。

```bash
npx agmsg
# or
npm i -g agmsg && agmsg install
```

`agmsg` メッセージは SSOT ではない。合意した判断・ブロッカー・レビュー/QA 結果は Conclave の `PROJECT_STATE` / `HANDOFF` / report に記録する。

---

## 60 秒クイックスタート (新規プロジェクトへの導入)

```bash
# 1. Conclave を対象プロジェクトへ導入
conclave init <your-project>
conclave check <your-project>

# 2. プレースホルダ <...> を自プロジェクトの値で埋める (ADOPTION.md のチェックリスト)
# 3. docs/REQUIREMENTS.md を書く → アーキテクトに DESIGN.md を作らせる → 委任サイクル開始
```

導入の完全手順は **[ADOPTION.md](ADOPTION.md)**。

---

## ファイルマップ

```text
conclave/
├── README.md                  # 本書 — 正面玄関・6 本柱・クイックスタート
├── package.json               # npm 配布メタデータ + テスト/pack チェック
├── bin/
│   └── conclave.js            # ゼロ依存 CLI (init/check/version)
├── test/
│   └── conclave-cli.test.js   # CLI の回帰テスト
├── FRAMEWORK.md               # ★ 思想の背骨 — 6 柱の詳説と設計判断の根拠
├── ADOPTION.md                # 新規プロジェクトへ落とし込む手順 + プレースホルダ表
├── CHANGELOG.md               # 改訂履歴
├── roles/
│   └── ROLE_TOPOLOGY.md       # Pillar 1 — 役割スロット (モデル非依存)・acting/judging・cascade 配置
├── governance/
│   ├── CONSTITUTION.md        # Pillar 2 — 絶対 NG の 8 分類 (C-1〜C-8) と自プロジェクト版の書き方
│   └── ESCALATION.md          # 失敗分類 A-E + 先行 clarify + split-verdict + 人間専権ゲート
├── runbook/
│   └── ORCHESTRATION_RUNBOOK.template.md  # Pillar 4 — 段階的起動・決定木・委任ルーティング・委任前2ゲート
├── principles/
│   ├── ENGINEERING_INVARIANTS.md  # Pillar 5 — fail-open / 設定駆動 / LLM抽象 / fallback / 状態外部化 / ツール効率
│   ├── EXECUTION_DISCIPLINE.md     # Pillar 6 — Karpathy 4 原則 + 二段 DoD + クレーム分解検証
│   ├── CONTEXT_HYGIENE.md          # P5+ — 文脈は有限資源 (flush-then-compact / JIT / 蒸留戻り)
│   ├── FAILURE_TAXONOMY.md         # P6+ — MAST 14 失敗モード × 防御クロスウォーク (自己監査)
│   └── JUDGE_RELIABILITY.md        # P6+ — 検証者を信頼しない (バイアス / クレーム分解 / split-verdict)
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
│   └── architect.md  implement.md  review.md  qa.md
├── examples/
│   └── panda-tech-news.md     # 抽出元の具体マッピング (抽象 ↔ 実体の対応表)
└── references/                # 外部リファレンス標本 (init では撒かない study material)
    ├── README.md                        # references/ の位置づけと索引
    ├── claude-fable-5-system-prompt.md  # 本番システムプロンプトの一次資料 (ベンダー標本)
    ├── system-prompt-as-governance.md   # ↑を 6 本柱へ対応づけた読み解き
    └── agmsg-peer-messaging.md          # agmsg を peer messaging transport として使う境界
```

---

## 設計原則 (1 行ずつ)

1. **視点の独立性** — 計画者・実装者・レビュアーは必ず別エージェント。実装した本人にレビューさせない。
2. **希少資源の集中投下** — 最高コストのモデルは上流設計と難所エスカレーションの 2 点のみに投入。
3. **問題定義は人間が握る** — 各役割に人間超えの性能を置く以上、堂々巡りは能力ではなく**要件・スコープの欠陥**のシグナル。
4. **永続化 > 内部記憶** — 状態・判断・証跡はモデルの記憶ではなくリポジトリ内ファイルに残す。
5. **ドキュメントが唯一の真実の源** — 受け渡しは自然言語チャットではなく成果物ドキュメントで行う。
6. **疑ったら止める** — 憲法 (絶対NG) に抵触しそうなら実装を止め、判断材料を添えて人間へエスカレーション。
7. **完了は検証で定義する** — 「動いた気がする」を採用しない。フレッシュ実行の証跡が緑になって初めて完了(低レベル + 高レベルの二段)。
8. **文脈は有限資源** — どのエージェントの文脈窓も枯渇する注意予算を持つ。重い読み込みは委任し、軽量参照を保持し、ファイルに逃がす (v0.2)。

> 出典思想: Andrej Karpathy の LLM コーディング 4 原則、健全なエンジニアリング組織のガバナンス、`tc-newsflow` (Go 版) からの設計継承、および v0.2 の 7 外部研究(Cognition「Don't Build Multi-Agents」/ Anthropic context engineering / MAST ほか、[CHANGELOG.md](CHANGELOG.md))。詳細は [FRAMEWORK.md](FRAMEWORK.md)。
