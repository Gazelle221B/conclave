# Changelog

Conclave フレームワークの改訂履歴。形式は [Keep a Changelog](https://keepachangelog.com/) 準拠。

---

## [0.4.0] — 2026-07-02 — Honest install, verifiable check

`init` を「嘘をつかない」二相構造 (plan → execute) に、`check` を「存在確認」から「実質検証」に強化した。独立エージェント群によるマルチ視点分析 (バグ / テスト / ドキュメント / 機能提案×2 の 5 並列探索 → 敵対的検証) で 6 欠陥を再現付きで confirm し、その全修正 + 一貫した機能群を 1 リリースに束ねた。実装後、**作者とは別の独立レビュー Workflow** (P1 のドッグフーディング: 正しさ/セキュリティ + 互換性/ドキュメントの 2 レンズ → 全指摘を敵対的検証) が 8 件を confirm し、全件を本リリース内で修正した (下記「Reviewed」)。

### Added

- **Install manifest (`.conclave/manifest.json`)**: `init` が kit バージョン・導入日時・全 27 ファイルの SHA-256 (リンク書き換え後の内容に対して計算)・CLAUDE.md エイリアス方式を記録。Git にコミットすればドリフトが diff でも追える。将来の `conclave update` の enabler。
- **`check` の実質検証**: 0 バイトの governance doc は FAIL / manifest 記録に基づく CLAUDE.md エイリアス検証 (消失は FAIL) / kit 管理ファイル (governance・principles・prompts・runbook テンプレ) のローカル改変を警告 / 導入 kit が CLI より古い場合の staleness 警告 / プレースホルダ残数を AGENTS.md + 7 ドキュメント別に報告。manifest がない旧導入・手動導入では従来挙動に degrade (警告のみ)。
- **`--json`**: `check` と `init --dry-run` の機械可読出力。README に GitHub Actions の required check 化レシピを追加 (P2 人間専権ゲートの機械化)。
- **`--version` / `-V`** エイリアス。コマンド別の不正オプション拒否 (`check --force` 等)。`docs/adr/.gitkeep` を init が作成 (Pillar 3 の `adr/` 前提と CLI の整合)。

### Fixed

- **dry-run の嘘 / partial install (確認済み欠陥 D1・D2)**: `init` を plan → execute の二相に再構成。ディレクトリ衝突・symlink 親・CLAUDE.md エイリアス先・manifest 先の全実現可能性チェックを**書き込み前に**完了させるため、dry-run と実 run の判定が定義上一致し、途中失敗による半端なインストール残留が起きない。
- **`countPlaceholders` の誤検知 (D3)**: HTML コメント・autolink (`<https://...>`)・メールアドレス・HTML タグ、および `agent/<task-id>-impl` や `<type>: <description>` のような**大きなインラインコード式に埋め込まれた**恒久ドキュメント記法を除外。単一トークンのコードスパン (`<プロジェクト名>` 等) は引き続きプレースホルダとして数える。完成済み AGENTS.md で警告が 0 に到達可能になった。
- **check の盲点 (D4)**: 空ファイル・エイリアス消失・kit ドリフトを検出 (上記 Added)。symlink された AGENTS.md を誤って「missing」と報告しない (stat follow)。
- **TOCTOU 緩和 (D5)**: 書き込みを temp ファイル + rename に変更 (rename は宛先 symlink を辿らず置換する)。書き込み直前に親ディレクトリの realpath が target 内であることを再検証。完全なレース排除ではない旨をコード内に明記。
- **リンク書き換え漏れ (L5)**: 導入された PROJECT_STATE / HANDOFF のリンクが runbook の**作業コピー** (`ORCHESTRATION_RUNBOOK.md`) を指すように修正 (従来は未編集のテンプレコピーを指していた)。ADOPTION の手動コピー用 perl 書き換えも同期。
- 衝突エラーの改善 (D6): CLAUDE.md 衝突時は破壊的な `--force` へ誘導せず `--no-claude-alias` を案内し、`--dry-run --force` でのプレビューを促す。ファイルを target に指定した `init` は書き込み前に「not a directory」で停止。

### Changed

- **README / ADOPTION**: CLI フラグ一式 (`--dry-run` / `--force` / `--no-claude-alias` / `--json`)・manifest・CI レシピを文書化 (従来は usage にのみ存在)。tarball バージョンのハードコード (`0.3.2.tgz`) を `npm install -g "$(npm pack)"` に置換し、リリース毎のドキュメント腐敗を解消。
- **テスト**: 16 → 53。プロセス境界の smoke テスト (exit code / stderr)、plan/execute の同値性 (祖先ファイル遮断含む)、placeholder 判定、manifest (staleness / copy-mode エイリアス含む)、check の各検出器、本物の 0.3.x レイアウトの graceful degradation、`--json` 契約を追加。

### Reviewed (独立レビュー — 8 件 confirm → 全修正)

- **祖先パス未検査 (High)**: `prompts` や `.conclave` という名の**通常ファイル**が居ると dry-run は成功・実 run は途中失敗し partial install が残った。plan フェーズで全祖先コンポーネントの非ディレクトリを検出して書き込み前に停止 (`Refusing to replace non-directory path component`)。
- **後方互換破壊 (High)**: `docs/adr/.gitkeep` の必須化により 0.3.x 導入済み・手動導入プロジェクトの `check` が hard-FAIL していた。optional 扱いに変更し警告のみに (「警告のみに degrade」の主張を実際に満たす)。「graceful degradation」テストも本物の 0.3.x レイアウト (manifest なし + .gitkeep なし) をモデルするよう修正。
- **データ喪失への誘導 (High)**: check の警告文が無警告で `init --force` を勧めていたが、それは記入済みドキュメントをテンプレートへ戻す。警告文と ADOPTION に「git コミット必須 + 復元手順」の注意を明記。text の `--dry-run --force` も上書き対象ファイル一覧を表示するように。
- **HTML タグ判定の過剰除外 (Medium)**: `<a short description>` 等、HTML タグ名で始まる英語プレースホルダを無視していた。属性形 (`=` を含む) のときのみ HTML タグと判定するよう修正。
- **CI レシピの npx 未固定 (Medium)**: 新リリースの要求ファイル追加で採用者の required check が突然赤になる。README のレシピをバージョン固定に変更し、FAIL 条件 (プレースホルダは警告であり FAIL しない) を明記。
- **ADOPTION 手動経路の虚偽記述 (Medium)**: 手動コピー手順が `.gitkeep` を作らず check が落ちていた。`touch` を手順に追加 (+ optional 化で二重に解消)。
- **manifest 書き込み失敗後の偽 PASS (Medium)**: 決定的ケース (`.conclave` がファイル) は祖先チェックで plan 時に停止。権限起因 (read-only dir) は plan 時に排除不能な残余リスクとしてコードコメントに明記。
- **`init --dry-run --json` の契約破れ (Low)**: conflicts 以外の plan 失敗 (ディレクトリ衝突等) で JSON が出なかった。全 plan 失敗で `{ok:false, error, conflicts}` を返すように。manifest のキーを全プラットフォームで forward-slash に正規化 (Windows 互換)。

### Rejected / Deferred — verify before adopt の実演

- **`conclave update`**: 最有力の次機能だが、manifest が現場に行き渡ってから。v0.5 へ (manifest は本リリースで先行導入)。
- **`check --strict` (REVIEW/QA 証跡ゲート検証・JR-1 判定者独立性リント・C-7 終了条件リント)・`conclave gate`**: doctrine ドキュメントの文言に CLI を結合させるため、独立した governance-enforcement リリースとして v0.5 で検討。
- **`--` 引数セパレータ・`conclave doctor`・`init --git-hooks`**: 効果対複雑性で見送り。

### Provenance

分析 Workflow: 12 エージェント (5 視点並列探索 + 6 敵対的検証 + 1 統合)、約 85 万トークン。独立レビュー Workflow: 11 エージェント (2 レンズ + 9 敵対的検証)、約 93 万トークン、反証 0 件。全 confirmed 欠陥・指摘は scratch 環境での再現手順付き。

### Tested

- `npm run check` (node --test 53 件 + `npm pack --dry-run`)
- scratch dir での手動マトリクス: fresh init / re-init 拒否 / ディレクトリ衝突 dry-run=実 run 同値 / 祖先ファイル遮断 / `--no-claude-alias` / `check --json` / `--version`

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
