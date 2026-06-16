# Changelog

Conclave フレームワークの改訂履歴。形式は [Keep a Changelog](https://keepachangelog.com/) 準拠。

---

## [0.3.2] — 2026-06-16 — agmsg peer messaging guidance

[fujibee/agmsg](https://github.com/fujibee/agmsg) を Conclave の任意 peer messaging transport として取り込んだ。agmsg 自体は vendoring せず、Conclave の統治・記録・品質ゲートを保ったまま、複数 live CLI エージェント間の copy-paste 仲介を減らす導線として位置づけた。

### Added

- **`references/agmsg-peer-messaging.md`**: agmsg の役割、導入判断、Conclave との境界、ガードレールを整理。
- **`templates/AGENTS.template.md`**: 任意 peer messaging 欄を追加。`agmsg` メッセージは SSOT ではなく、判断・ブロッカー・レビュー/QA 結果は repo 内記録へ転記する規律を明記。
- **`runbook/ORCHESTRATION_RUNBOOK.template.md`**: 外部 AI ルーティングに `agmsg` の利用判断・導入例・失敗時扱いを追加。

### Changed

- **`ADOPTION.md` / `README.md`**: 複数 live agent のときだけ agmsg を併用する任意手順を追加。
- **`roles/ROLE_TOPOLOGY.md`**: peer transport は権限を持たず、レビュー独立性・QA・PROJECT_STATE の代替にならないことを委任の鉄則へ追加。
- **`package.json`**: version 0.3.1 → 0.3.2。

### Tested

- `npm run check`
- `node --check bin/conclave.js`
- `node --check test/conclave-cli.test.js`
- `git diff --check`

---

## [0.3.1] — 2026-06-14 — Fable 5 リファレンス標本の取り込み

本番 AI エージェントの統治文書の一次資料(Claude Fable 5 システムプロンプト)を、学習用リファレンス標本として `references/` に取り込んだ。raw を verbatim ダンプするのでなく、**出典付き標本 + Conclave 視点の読み解き**として整理(distillation 規律の実践)。

### Added

- **`references/claude-fable-5-system-prompt.md`**: Claude Fable 5 のシステムプロンプト(原文標本、出典/取り扱いヘッダ付き)。ベンダーのコンテンツであり Conclave 自身の成果物ではない。
- **`references/system-prompt-as-governance.md`**: ↑を Conclave の目で読み解き、各統治技法を 6 本柱へ対応づけた解説(節構成・優先順位つき不可侵則・検証規律・注入耐性の実例)。
- **`references/README.md`**: `references/` の位置づけ(外部標本、`init` では撒かない study material)。

### Changed

- `principles/CONTEXT_HYGIENE.md` CH-7(右の高度)から、実例として references/ を参照。
- `package.json`: `files` に `references/` を追加(npm キットに同梱)。version 0.3.0 → 0.3.1。
- `test/conclave-cli.test.js`: 「実験的プロンプトは init されない」回帰アサートを、`references/`(study material)が init されないことの確認に更新。

### Notes

- `references/` は `conclave init` の対象外(統治キットの構成要素ではない)。`INSTALL_DIRECTORIES` は governance/principles/roles のみで不変。
- 標本は原文のまま収録。解説側は逐語引用を最小化した。

---

## [0.3.0] — 2026-06-14 — CLI 配布物化

Conclave を読むだけのドキュメント集合から、導入・検査できる最小プロダクトへ切り出した。

### Added

- **`package.json`**: npm パッケージメタデータ、`conclave` bin、`npm test`、`npm run pack:check`、`npm run check` を追加。
- **`bin/conclave.js`**: ゼロ依存 CLI。`conclave init <project>` で governance kit を配置し、`conclave check <project>` で導入状態を検査する。
- **`test/conclave-cli.test.js`**: Node 組み込み test runner による初期化、衝突防止、dry-run、check、help の回帰テスト。

### Changed

- **README / ADOPTION**: 手動コピーを主経路にせず、CLI 導入と tarball 配布を正面の利用手順にした。
- Conclave 本体ドキュメントは `docs/conclave/` に source layout のまま配置し、相対リンクを壊さない導入形にした。
- 配布対象の役割プロンプトを `architect.md` / `implement.md` / `review.md` / `qa.md` に明示し、未追跡のローカル実験ファイルが tarball に混ざらないようにした。

### Tested

- `npm test`
- `npm run pack:check`
- `node bin/conclave.js --help`
- tarball install smoke test (`conclave version/init/check`)

---

## [0.2.0] — 2026-06-13 — 研究駆動のハードニング

7 つの外部資料を研究し(各々を独立エージェントで深読み → 敵対的検証)、**検証済み**の知見のみを統合した。研究は読み取り専用・独立タスクとして並列ファンアウトし、実装は全体整合のため単一スレッドで行った——これ自体が後述の知見(acting は単一スレッド、research は並列可)のドッグフーディング。

### 研究した資料

| # | 資料 | 検証結果 |
|---|---|---|
| 1 | Cognition「Don't Build Multi-Agents」 | grounded ✓ |
| 2 | Anthropic「Effective Context Engineering for AI Agents」 | grounded ✓ |
| 3 | Cemri et al.「Why Do Multi-Agent LLM Systems Fail?」(MAST), arXiv:2503.13657 | grounded ✓(高忠実) |
| 4 | Jamshidi et al.「Hallucination Cascade」, arXiv:2606.07937 | grounded ✓(一部外挿をフラグ) |
| 5 | Gu et al.「A Survey on LLM-as-a-Judge」, arXiv:2411.15594 (The Innovation) | 概念は本物・**引用文に捏造**を検出 |
| 6 | GitHub spec-kit (Spec-Driven Development) | grounded ✓ |
| 7 | BMAD-METHOD | grounded ✓ |

### 中核的発見: 7 資料中 5 つが独立に同じ結論へ収束

①context engineering / persistence > internal memory、②上流(計画)と下流(実装)の役割分割、③検証が最高レバレッジの層、④「失敗は能力でなく組織設計の欠陥」。この収束が Conclave 既存設計の最強の裏付けとなった。

### Added (新規)

- **`principles/CONTEXT_HYGIENE.md`** (新柱 P5+): 文脈は有限資源。flush-then-compact / tool-result clearing / JIT loading / 蒸留戻り契約 / 段階的コールドスタート / リセット・カデンス / 右の高度プロンプト。[Anthropic, Cognition, BMAD]
- **`principles/FAILURE_TAXONOMY.md`** (P6+): MAST 14 失敗モード(実測頻度付き)× Conclave 防御のクロスウォーク + 未カバーモードの明示。自己監査チェックリスト。[MAST]
- **`principles/JUDGE_RELIABILITY.md`** (P6+): 検証者そのものを信頼しない。モデル系統独立 / バイアス・チェックリスト / 基準分解判定 / クレーム分解検証 / 過剰修正ガード / split-verdict / 委任判定の検証。[LLM-as-Judge survey, Hallucination Cascade, MAST]
- **FRAMEWORK.md**: 第4の土台原則「文脈は有限資源 (Context Hygiene)」を追加。「Conclave はマルチエージェントの反パターンではない」スコープ節(逐次 multi-ROLE + 共有永続 SSOT)。収束エビデンス節。正直な限界 + モデル改善の留保。

### Changed (変更)

- **`roles/ROLE_TOPOLOGY.md`**: 視点独立性を「acting (設計・実装) は完全な上流コンテキストを受け取る / judging (レビュー・QA) は意図的に独立」へ分割。判定者のモデル系統独立をハード制約化。cascade 配置(速い生成→低幻覚の修正)を選定基準に追加。委任の鉄則に推論-行動整合チェック(差分 vs 宣言計画)。per-slot lean context manifest。
- **`governance/CONSTITUTION.md`**: C-7「終了 NG」(全委任タスクに明示的終了条件 + 最大反復上限)。過剰修正ガード(unverifiable ≠ false)。
- **`governance/ESCALATION.md`**: 先行的 clarify ゲート(着手前に曖昧さを問う、Class C の事前版)。split-verdict エスカレーション(REVIEWER vs QA の不一致 → ARCHITECT 裁定)。
- **`runbook/ORCHESTRATION_RUNBOOK.template.md`**: acting 委任は SSOT を運ぶ。段階的コールドスタート(EAGER コア / ON-DEMAND)。蒸留戻り契約。ANALYZE 整合ゲート(独立スロットへ)。per-task 終了チェック。委任判定の検証。ドメイン別検証強度。
- **`principles/ENGINEERING_INVARIANTS.md`**: INV-7「トークン効率・非重複のツール/委任インターフェース」。
- **`principles/EXECUTION_DISCIPLINE.md`**: DoD を2層化(低レベル: テスト/lint/型 + 高レベル: 目的充足)。クレーム分解検証。事実性後退ガード。「最長の単一スレッドを優先」既定。先行的明確化。
- **テンプレート**: REQUIREMENTS/DESIGN に `[NEEDS CLARIFICATION: ...]` 規約 + 完了ゲート。IMPLEMENTATION_PLAN に憲法ゲート・チェックリスト + `[P]` 並列マーカー。HANDOFF に「主要決定」「却下した代替案」。REVIEW_REPORT/QA_REPORT に判定者メタ + 構造化ゲート状態 (PASS/CONCERNS/FAIL/WAIVED, 但し blocking 維持) + リスクプロファイル。
- **プロンプト**: review.md / qa.md に基準分解・CoT・バイアス対策・クレーム grounding。
- **ADOPTION.md**: 右の高度プロンプト注記。spec-kit / BMAD との「意図的な相違」注記。

### Rejected / Relabeled (採用せず・出典外として再ラベル) — verify before adopt の実演

- **LLM-as-Judge サーベイの逐語引用**: 研究エージェントが付した「引用文」の複数(reliability triad の定義、self-preference と self-enhancement の2分割、"numeric rating suboptimal" 主張、"Knowledge Recency"・"Format Bias")が**出典に存在しない捏造**と検証で判明。→ 概念のみ採用し逐語引用は不使用。バイアス名は出典の実名 (Position / Length / Concreteness / Self-Enhancement / Style) に修正。
- **「unverifiable ≠ false」を出典付き不変条件として導入**: Hallucination Cascade は**この規則を勧めていない**(実測は trade-off まで)。→ **Conclave 由来の設計判断**として明示ラベル(JR-5)、出典に帰さない。
- **「propagation budget / いつ修正をやめるか」ポリシー**: 同論文に停止基準は無い。→ 不採用。
- **過剰修正の規模**: 研究の「15.2% の正しいクレームが削除」は2行の自己合算で誇張。出典の実値は**過剰修正 3.8%**(+ 削除 11.4% は「正しい」とは主張されない)。→ 3.8% に修正して引用。
- **MAST の「High-Reliability Organizations」帰属**: 出典に明記なし。→ 一般的な「組織理解」レンズとしてのみ言及。
- **「役割純度は過剰設計」論**: 役割仕様改善で +9.4% の実測ゲインがあるため**不採用**。役割の明示は過剰でなく有効(役割違反が 1.5% と低いのは仕様が効いている証拠)。
- **spec-kit の `/analyze` をそのまま導入**: 原典は同一エージェントの自己分析。→ Conclave では**独立スロット**(REVIEWER/QA)へルーティングして P1 を保持。
- **spec-kit の「コードは使い捨ての再生成物」**: → 不採用。merged コードベースは C-1/C-2 で守る耐久資産。spec-as-upstream-truth のみ採用。
- **BMAD の「ゲートは助言的・非ブロッキング」「QA が直接リファクタ」「BMad-Master が全役割兼任」**: → 不採用。Conclave のゲートは blocking、レビュアーはコードを編集しない、役割は分離。BMAD の planning/sharding/story-bundling 機構のみ採用。
- **BMAD 風 STORY バンドル**: SSOT 重複ドリフトのリスクがあるため、**ポインタ方式 + DESIGN 変更時の再生成規律**を条件に低優先で採用(embedded コンテンツの複製は避ける)。

### Reviewed (独立レビュー — P1 のドッグフーディング)

統合後、**作者とは別の独立レビュー Workflow**(3 次元: 整合性 / 出典忠実性 / 一貫性・slop)で検証。結果: source-fidelity=**PASS**(捏造・誤帰属の漏れなし)、consistency / coherence=**CONCERNS**。指摘 (Critical 0 / High 4 / Medium 2) を JR-7(委任判定も検証)に従い実ファイルで確認のうえ修正:

- 憲法を 6→8 分類に増やした際の「6 分類」残存(ADOPTION ×2 / RUNBOOK)を「8 分類 (C-1〜C-8)」へ統一。
- `WORKFLOW.md`(panda 由来)を Conclave の `ROLE_TOPOLOGY`(組織契約)へ統合し、孤立参照を解消(AGENTS テンプレ / RUNBOOK / architect プロンプト / FRAMEWORK)。
- architect プロンプトが要求する「非機能要件」節を DESIGN テンプレに追加(プロンプト ↔ テンプレの不一致解消)。
- FRAMEWORK Pillar 2 に C-7/C-8 追加の補注、README の `§3` ダングリング参照を `Pillar 3` へ、`Pn+` 記法の凡例を追加。

### Provenance

研究 Workflow: 14 エージェント(7 深読み + 7 敵対的検証)、約 103 万トークン。レビュー Workflow: 3 エージェント、約 32 万トークン。完全な研究・検証・レビューノートはセッションの workflow トランスクリプトに保存。

---

## [0.1.0] — 2026-06-13 — 初版

panda-tech-news の自律オーケストレーション基盤を抽出し、6 本柱の汎用フレームワークとして構造化。全 22 ドキュメント。
