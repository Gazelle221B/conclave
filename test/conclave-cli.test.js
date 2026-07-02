"use strict";

const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const cli = require("../bin/conclave.js");
const packageJson = require("../package.json");

const binPath = path.join(__dirname, "..", "bin", "conclave.js");

function sha256(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

const tempProjects = [];

function makeTempProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "conclave-cli-"));
  tempProjects.push(dir);
  return dir;
}

// Tie temp-dir lifetime to the test run: remove every project created via
// makeTempProject so repeated local or CI runs don't accumulate directories
// under the OS temp folder. rmSync(recursive) removes symlinks themselves
// (it does not follow them), so external-target tests stay safe.
test.after(() => {
  for (const dir of tempProjects) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function walkMarkdownFiles(root) {
  const files = [];
  const pending = [root];

  while (pending.length > 0) {
    const current = pending.pop();
    for (const dirent of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, dirent.name);
      if (dirent.isDirectory()) {
        pending.push(absolute);
      } else if (dirent.isFile() && absolute.endsWith(".md")) {
        files.push(absolute);
      }
    }
  }

  return files;
}

test("init installs the Conclave governance kit into a project", () => {
  const target = makeTempProject();
  const result = cli.main(["init", target]);

  assert.equal(result.code, 0);
  assert.match(result.output, /Installed \d+ Conclave file/);
  assert.equal(fs.existsSync(path.join(target, "AGENTS.md")), true);
  assert.equal(fs.existsSync(path.join(target, "docs/REQUIREMENTS.md")), true);
  assert.equal(fs.existsSync(path.join(target, "docs/conclave/runbook/ORCHESTRATION_RUNBOOK.md")), true);
  assert.equal(fs.existsSync(path.join(target, "docs/conclave/governance/CONSTITUTION.md")), true);
  assert.equal(fs.existsSync(path.join(target, "docs/conclave/governance/ESCALATION.md")), true);
  assert.equal(fs.existsSync(path.join(target, "docs/conclave/roles/ROLE_TOPOLOGY.md")), true);
  assert.equal(fs.existsSync(path.join(target, "docs/conclave/principles/EXECUTION_DISCIPLINE.md")), true);
  assert.equal(fs.existsSync(path.join(target, "docs/conclave/prompts/review.md")), true);
  assert.equal(fs.existsSync(path.join(target, "prompts/architect.md")), true);
  // references/ holds study material (e.g. the Claude Fable 5 system-prompt exhibit)
  // and must never be installed into a target project by `conclave init`.
  assert.equal(fs.existsSync(path.join(target, "references")), false);
});

test("check reports a valid initialized project", () => {
  const target = makeTempProject();
  cli.main(["init", target]);

  const result = cli.main(["check", target]);

  assert.equal(result.code, 0);
  assert.match(result.output, /Conclave check passed/);
});

test("check fails when any installed file is missing", () => {
  const target = makeTempProject();
  cli.main(["init", target]);
  fs.rmSync(path.join(target, "docs/IMPLEMENTATION_PLAN.md"));

  const result = cli.main(["check", target]);

  assert.equal(result.code, 1);
  assert.match(result.output, /docs\/IMPLEMENTATION_PLAN.md/);
});

test("check rejects directories where files are required", () => {
  const target = makeTempProject();
  cli.main(["init", target]);
  fs.rmSync(path.join(target, "docs/conclave/governance/CONSTITUTION.md"));
  fs.mkdirSync(path.join(target, "docs/conclave/governance/CONSTITUTION.md"));

  const result = cli.main(["check", target]);

  assert.equal(result.code, 1);
  assert.match(result.output, /docs\/conclave\/governance\/CONSTITUTION.md/);
});

test("installed markdown files keep relative links resolvable", () => {
  const target = makeTempProject();
  cli.main(["init", target]);
  const missingLinks = [];

  for (const filePath of walkMarkdownFiles(target)) {
    const content = fs.readFileSync(filePath, "utf8");
    const links = content.matchAll(/\[[^\]]+\]\((?!https?:|#)([^)#]+\.md)(?:#[^)]+)?\)/g);
    for (const match of links) {
      const resolved = path.resolve(path.dirname(filePath), match[1]);
      if (!fs.existsSync(resolved)) {
        missingLinks.push(`${path.relative(target, filePath)} -> ${match[1]}`);
      }
    }
  }

  assert.deepEqual(missingLinks, []);
});

test("init installs optional agmsg peer messaging guardrails", () => {
  const target = makeTempProject();
  cli.main(["init", target]);

  const agents = fs.readFileSync(path.join(target, "AGENTS.md"), "utf8");
  const runbook = fs.readFileSync(path.join(target, "docs/conclave/runbook/ORCHESTRATION_RUNBOOK.md"), "utf8");

  assert.match(agents, /Peer messaging/);
  assert.match(agents, /agmsg/);
  assert.match(agents, /SSOT ではない/);
  assert.match(runbook, /Peer messaging transport/);
  assert.match(runbook, /npx agmsg/);
  assert.match(runbook, /PROJECT_STATE/);
});

test("init refuses to overwrite managed files without --force", () => {
  const target = makeTempProject();
  cli.main(["init", target]);

  assert.throws(
    () => cli.main(["init", target]),
    /Refusing to overwrite/
  );
});

test("force can refresh an initialized project", () => {
  const target = makeTempProject();
  cli.main(["init", target]);
  fs.rmSync(path.join(target, "CLAUDE.md"), { force: true });
  fs.writeFileSync(path.join(target, "CLAUDE.md"), "stale alias", "utf8");

  const result = cli.main(["init", target, "--force"]);

  assert.equal(result.code, 0);
  assert.match(result.output, /Installed \d+ Conclave file/);
  assert.notEqual(fs.readFileSync(path.join(target, "CLAUDE.md"), "utf8"), "stale alias");
});

test("force replaces file symlinks without writing through them", () => {
  const target = makeTempProject();
  const externalFile = path.join(makeTempProject(), "external-requirements.md");
  fs.writeFileSync(externalFile, "external content", "utf8");
  cli.main(["init", target]);
  fs.rmSync(path.join(target, "docs/REQUIREMENTS.md"));
  fs.symlinkSync(externalFile, path.join(target, "docs/REQUIREMENTS.md"));

  const result = cli.main(["init", target, "--force"]);

  assert.equal(result.code, 0);
  assert.equal(fs.readFileSync(externalFile, "utf8"), "external content");
  assert.equal(fs.lstatSync(path.join(target, "docs/REQUIREMENTS.md")).isSymbolicLink(), false);
});

test("dangling destination symlinks are conflicts without force", () => {
  const target = makeTempProject();
  const externalFile = path.join(makeTempProject(), "missing-requirements.md");
  fs.mkdirSync(path.join(target, "docs"));
  fs.symlinkSync(externalFile, path.join(target, "docs/REQUIREMENTS.md"));

  assert.throws(
    () => cli.main(["init", target]),
    /Refusing to overwrite/
  );
});

test("force replaces dangling file symlinks without creating outside targets", () => {
  const target = makeTempProject();
  const externalFile = path.join(makeTempProject(), "missing-requirements.md");
  cli.main(["init", target]);
  fs.rmSync(path.join(target, "docs/REQUIREMENTS.md"));
  fs.symlinkSync(externalFile, path.join(target, "docs/REQUIREMENTS.md"));

  const result = cli.main(["init", target, "--force"]);

  assert.equal(result.code, 0);
  assert.equal(fs.existsSync(externalFile), false);
  assert.equal(fs.lstatSync(path.join(target, "docs/REQUIREMENTS.md")).isSymbolicLink(), false);
});

test("init refuses to write through symlinked parent directories", () => {
  const target = makeTempProject();
  const externalDir = makeTempProject();
  fs.symlinkSync(externalDir, path.join(target, "docs"));

  assert.throws(
    () => cli.main(["init", target, "--force"]),
    /Refusing to write through symlinked directory/
  );
});

test("dry-run reports planned work without writing files", () => {
  const target = makeTempProject();
  const result = cli.main(["init", target, "--dry-run"]);

  assert.equal(result.code, 0);
  assert.match(result.output, /Would install \d+ Conclave file/);
  assert.equal(fs.existsSync(path.join(target, "AGENTS.md")), false);
});

test("check reports missing files for a non-initialized project", () => {
  const target = makeTempProject();
  const result = cli.main(["check", target]);

  assert.equal(result.code, 1);
  assert.match(result.output, /Missing or invalid required file/);
});

test("top-level help is available", () => {
  const result = cli.main(["--help"]);

  assert.equal(result.code, 0);
  assert.match(result.output, /Usage:/);
});

test("multiple target arguments are rejected", () => {
  assert.throws(
    () => cli.main(["init", "one", "two"]),
    /Unexpected extra positional argument/
  );
});

// --- CLI surface -----------------------------------------------------------

test("version command prints the package version", () => {
  const result = cli.main(["version"]);

  assert.equal(result.code, 0);
  assert.equal(result.output, packageJson.version);
});

test("--version and -V are aliases of version", () => {
  assert.equal(cli.main(["--version"]).output, packageJson.version);
  assert.equal(cli.main(["-V"]).output, packageJson.version);
});

test("bare invocation shows help", () => {
  const result = cli.main([]);

  assert.equal(result.code, 0);
  assert.match(result.output, /Usage:/);
});

test("unknown commands are rejected", () => {
  assert.throws(() => cli.main(["frobnicate"]), /Unknown command/);
});

test("check rejects init-only options", () => {
  const target = makeTempProject();

  assert.throws(() => cli.main(["check", target, "--force"]), /Unknown option for check/);
});

test("init --json requires --dry-run", () => {
  const target = makeTempProject();

  assert.throws(() => cli.main(["init", target, "--json"]), /--dry-run/);
});

test("CLI process exits non-zero on failure", () => {
  const empty = makeTempProject();
  const check = spawnSync(process.execPath, [binPath, "check", empty], { encoding: "utf8" });
  assert.equal(check.status, 1);
  assert.match(check.stdout, /Missing or invalid required file/);

  const bad = spawnSync(process.execPath, [binPath, "frobnicate"], { encoding: "utf8" });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /Unknown command/);
});

// --- honest install: plan before execute -----------------------------------

test("dry-run --force predicts the same directory failure as the real run, which aborts before any write", () => {
  const target = makeTempProject();
  fs.mkdirSync(path.join(target, "docs/DESIGN.md"), { recursive: true });

  assert.throws(
    () => cli.main(["init", target, "--dry-run", "--force"]),
    /Refusing to replace directory/
  );
  assert.throws(
    () => cli.main(["init", target, "--force"]),
    /Refusing to replace directory/
  );
  assert.equal(fs.existsSync(path.join(target, "AGENTS.md")), false);
});

test("directory at CLAUDE.md is detected before any write", () => {
  const target = makeTempProject();
  fs.mkdirSync(path.join(target, "CLAUDE.md"));

  assert.throws(
    () => cli.main(["init", target, "--dry-run", "--force"]),
    /Refusing to replace directory/
  );
  assert.throws(
    () => cli.main(["init", target, "--force"]),
    /Refusing to replace directory/
  );
  assert.equal(fs.existsSync(path.join(target, "AGENTS.md")), false);
});

test("existing CLAUDE.md survives init --no-claude-alias without --force", () => {
  const target = makeTempProject();
  fs.writeFileSync(path.join(target, "CLAUDE.md"), "mine", "utf8");

  const result = cli.main(["init", target, "--no-claude-alias"]);

  assert.equal(result.code, 0);
  assert.match(result.output, /alias skipped/);
  assert.equal(fs.readFileSync(path.join(target, "CLAUDE.md"), "utf8"), "mine");
});

test("conflict message points CLAUDE.md owners at --no-claude-alias", () => {
  const target = makeTempProject();
  fs.writeFileSync(path.join(target, "CLAUDE.md"), "mine", "utf8");

  assert.throws(() => cli.main(["init", target]), /--no-claude-alias/);
});

test("init rejects a target that is a regular file", () => {
  const parent = makeTempProject();
  const target = path.join(parent, "not-a-directory");
  fs.writeFileSync(target, "file", "utf8");

  assert.throws(() => cli.main(["init", target]), /not a directory/i);
});

test("a regular file blocking a parent directory fails identically in dry-run and real run", () => {
  const target = makeTempProject();
  fs.writeFileSync(path.join(target, "prompts"), "not a dir", "utf8");

  assert.throws(
    () => cli.main(["init", target, "--dry-run"]),
    /non-directory path component/
  );
  assert.throws(
    () => cli.main(["init", target]),
    /non-directory path component/
  );
  assert.equal(fs.existsSync(path.join(target, "AGENTS.md")), false);
});

test("a regular file at .conclave is caught before any write", () => {
  const target = makeTempProject();
  fs.writeFileSync(path.join(target, ".conclave"), "not a dir", "utf8");

  assert.throws(() => cli.main(["init", target]), /non-directory path component/);
  assert.equal(fs.existsSync(path.join(target, "AGENTS.md")), false);
});

// --- placeholder counting ---------------------------------------------------

test("countPlaceholders ignores documentation angle-bracket text", () => {
  assert.equal(cli.countPlaceholders("branch: `agent/<task-id>-impl`"), 0);
  assert.equal(cli.countPlaceholders("Conventional Commits: `<type>: <description>`"), 0);
  assert.equal(cli.countPlaceholders("<https://example.com/docs> and <mailto:a@b.co>"), 0);
  assert.equal(cli.countPlaceholders("contact <maintainer@example.com>"), 0);
  assert.equal(cli.countPlaceholders("line<br>break and <!-- <a note> -->"), 0);
});

test("countPlaceholders still counts genuine placeholders", () => {
  assert.equal(cli.countPlaceholders("`<プロジェクト名>`"), 1);
  assert.equal(cli.countPlaceholders("`<1-2 段落: 何を作るか>`"), 1);
  assert.equal(cli.countPlaceholders("```bash\n<test>   # unit tests\n```"), 1);
  assert.equal(cli.countPlaceholders("<課題を書く>"), 1);
});

test("countPlaceholders counts English placeholders that start with an HTML tag name", () => {
  assert.equal(cli.countPlaceholders("<a short description>"), 1);
  assert.equal(cli.countPlaceholders("<summary of the change>"), 1);
  assert.equal(cli.countPlaceholders("<code owner>"), 1);
  assert.equal(cli.countPlaceholders('cell: <td colspan="2">'), 0);
});

test("countPlaceholders reaches zero on a completed AGENTS.md", () => {
  const target = makeTempProject();
  cli.main(["init", target]);
  const agents = fs.readFileSync(path.join(target, "AGENTS.md"), "utf8");

  assert.ok(cli.countPlaceholders(agents) > 10, "fresh template should report many placeholders");

  const filled = agents
    .replace(/`<[^`<>\n]+>`/g, "`filled-value`")
    .replace(/^<[^>\n]+>/gm, "npm run gate");

  assert.match(filled, /agent\/<task-id>-impl/);
  assert.match(filled, /<type>: <description>/);
  assert.equal(cli.countPlaceholders(filled), 0);
});

// --- install manifest -------------------------------------------------------

test("init records an install manifest with content hashes", () => {
  const target = makeTempProject();
  cli.main(["init", target]);

  const manifest = JSON.parse(
    fs.readFileSync(path.join(target, ".conclave/manifest.json"), "utf8")
  );

  assert.equal(manifest.kitVersion, packageJson.version);
  assert.equal(manifest.claudeAlias, "symlink");
  assert.equal(
    manifest.files["AGENTS.md"],
    sha256(fs.readFileSync(path.join(target, "AGENTS.md")))
  );
  assert.equal(
    manifest.files["docs/PROJECT_STATE.md"],
    sha256(fs.readFileSync(path.join(target, "docs/PROJECT_STATE.md")))
  );
});

test("dry-run does not write a manifest", () => {
  const target = makeTempProject();
  cli.main(["init", target, "--dry-run"]);

  assert.equal(fs.existsSync(path.join(target, ".conclave")), false);
});

// --- check verifies substance ------------------------------------------------

test("check fails when an installed file is empty", () => {
  const target = makeTempProject();
  cli.main(["init", target]);
  fs.writeFileSync(path.join(target, "docs/conclave/governance/CONSTITUTION.md"), "", "utf8");

  const result = cli.main(["check", target]);

  assert.equal(result.code, 1);
  assert.match(result.output, /Empty required file/);
  assert.match(result.output, /CONSTITUTION\.md/);
});

test("check fails when the recorded CLAUDE.md alias is gone", () => {
  const target = makeTempProject();
  cli.main(["init", target]);
  fs.rmSync(path.join(target, "CLAUDE.md"));

  const result = cli.main(["check", target]);

  assert.equal(result.code, 1);
  assert.match(result.output, /CLAUDE\.md alias is missing/);
});

test("check passes without an alias when installed with --no-claude-alias", () => {
  const target = makeTempProject();
  cli.main(["init", target, "--no-claude-alias"]);

  const result = cli.main(["check", target]);

  assert.equal(result.code, 0);
  assert.match(result.output, /Conclave check passed/);
});

test("check reports per-file placeholder counts", () => {
  const target = makeTempProject();
  cli.main(["init", target]);

  const result = cli.main(["check", target]);

  assert.equal(result.code, 0);
  assert.match(result.output, /placeholder marker\(s\) remain in AGENTS\.md/);
  assert.match(result.output, /docs\/REQUIREMENTS\.md/);
});

test("check warns when governance kit files are locally modified", () => {
  const target = makeTempProject();
  cli.main(["init", target]);
  fs.appendFileSync(path.join(target, "docs/conclave/governance/CONSTITUTION.md"), "\nlocal edit\n");

  const result = cli.main(["check", target]);

  assert.equal(result.code, 0);
  assert.match(result.output, /locally modified/);
  assert.match(result.output, /CONSTITUTION\.md/);
});

test("check degrades gracefully without a manifest", () => {
  const target = makeTempProject();
  cli.main(["init", target]);
  fs.rmSync(path.join(target, ".conclave"), { recursive: true });

  const result = cli.main(["check", target]);

  assert.equal(result.code, 0);
  assert.match(result.output, /Conclave check passed/);
  assert.match(result.output, /manifest/);
});

test("check treats a genuine pre-0.4 layout as warnings, not failure", () => {
  // model a 0.3.x install: no manifest AND no docs/adr/.gitkeep
  const target = makeTempProject();
  cli.main(["init", target]);
  fs.rmSync(path.join(target, ".conclave"), { recursive: true });
  fs.rmSync(path.join(target, "docs/adr/.gitkeep"));

  const result = cli.main(["check", target]);

  assert.equal(result.code, 0);
  assert.match(result.output, /Conclave check passed/);
  assert.match(result.output, /docs\/adr\/\.gitkeep/);
  assert.match(result.output, /manifest/);
});

test("check warns when the installed kit is older than the CLI", () => {
  const target = makeTempProject();
  cli.main(["init", target]);
  const manifestPath = path.join(target, ".conclave/manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  manifest.kitVersion = "0.3.0";
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

  const result = cli.main(["check", target]);

  assert.equal(result.code, 0);
  assert.match(result.output, /older than CLI/);
});

test("check verifies a copy-mode CLAUDE.md alias from the manifest", () => {
  const target = makeTempProject();
  cli.main(["init", target]);
  const manifestPath = path.join(target, ".conclave/manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  manifest.claudeAlias = "copy";
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
  fs.rmSync(path.join(target, "CLAUDE.md"));
  fs.copyFileSync(path.join(target, "AGENTS.md"), path.join(target, "CLAUDE.md"));

  assert.equal(cli.main(["check", target]).code, 0);

  fs.rmSync(path.join(target, "CLAUDE.md"));
  const result = cli.main(["check", target]);

  assert.equal(result.code, 1);
  assert.match(result.output, /CLAUDE\.md alias is missing/);
});

test("check accepts a symlinked AGENTS.md", () => {
  const target = makeTempProject();
  cli.main(["init", target]);
  fs.renameSync(path.join(target, "AGENTS.md"), path.join(target, "AGENTS.real.md"));
  fs.symlinkSync("AGENTS.real.md", path.join(target, "AGENTS.md"));

  const result = cli.main(["check", target]);

  assert.equal(result.code, 0);
  assert.match(result.output, /Conclave check passed/);
});

// --- machine-readable output --------------------------------------------------

test("check --json emits machine-readable results", () => {
  const target = makeTempProject();
  cli.main(["init", target]);

  const pass = cli.main(["check", target, "--json"]);
  const passPayload = JSON.parse(pass.output);

  assert.equal(pass.code, 0);
  assert.equal(passPayload.ok, true);
  assert.equal(passPayload.installedVersion, packageJson.version);
  assert.deepEqual(passPayload.missing, []);
  assert.ok(passPayload.placeholders["docs/REQUIREMENTS.md"] > 0);

  fs.rmSync(path.join(target, "docs/DESIGN.md"));
  const fail = cli.main(["check", target, "--json"]);
  const failPayload = JSON.parse(fail.output);

  assert.equal(fail.code, 1);
  assert.equal(failPayload.ok, false);
  assert.deepEqual(failPayload.missing, ["docs/DESIGN.md"]);
});

test("init --dry-run --json lists planned writes without touching disk", () => {
  const target = makeTempProject();

  const result = cli.main(["init", target, "--dry-run", "--json"]);
  const payload = JSON.parse(result.output);

  assert.equal(result.code, 0);
  assert.equal(payload.ok, true);
  assert.ok(payload.plannedWrites.includes("AGENTS.md"));
  assert.ok(payload.plannedWrites.includes(".conclave/manifest.json"));
  assert.equal(fs.existsSync(path.join(target, "AGENTS.md")), false);
});

test("init --dry-run --json reports conflicts structurally", () => {
  const target = makeTempProject();
  fs.writeFileSync(path.join(target, "AGENTS.md"), "existing", "utf8");

  const result = cli.main(["init", target, "--dry-run", "--json"]);
  const payload = JSON.parse(result.output);

  assert.equal(result.code, 1);
  assert.equal(payload.ok, false);
  assert.ok(payload.conflicts.includes("AGENTS.md"));
});

test("init --dry-run --json stays machine-readable for directory blockers", () => {
  const target = makeTempProject();
  fs.mkdirSync(path.join(target, "docs/DESIGN.md"), { recursive: true });

  const result = cli.main(["init", target, "--dry-run", "--json"]);
  const payload = JSON.parse(result.output);

  assert.equal(result.code, 1);
  assert.equal(payload.ok, false);
  assert.match(payload.error, /Refusing to replace directory/);
});

test("dry-run --force lists the files it would overwrite", () => {
  const target = makeTempProject();
  cli.main(["init", target]);

  const result = cli.main(["init", target, "--dry-run", "--force"]);

  assert.equal(result.code, 0);
  assert.match(result.output, /Would overwrite \d+ existing file\(s\)/);
  assert.match(result.output, /AGENTS\.md/);
});

// --- installed content fixes ---------------------------------------------------

test("installed project docs link the runnable runbook copy", () => {
  const target = makeTempProject();
  cli.main(["init", target]);

  const state = fs.readFileSync(path.join(target, "docs/PROJECT_STATE.md"), "utf8");
  const handoff = fs.readFileSync(path.join(target, "docs/HANDOFF.md"), "utf8");

  assert.ok(!state.includes("ORCHESTRATION_RUNBOOK.template.md"));
  assert.ok(!handoff.includes("ORCHESTRATION_RUNBOOK.template.md"));
  assert.match(state, /conclave\/runbook\/ORCHESTRATION_RUNBOOK\.md/);
});

test("init creates docs/adr for decision records", () => {
  const target = makeTempProject();
  cli.main(["init", target]);

  assert.equal(fs.existsSync(path.join(target, "docs/adr/.gitkeep")), true);

  const result = cli.main(["check", target]);
  assert.equal(result.code, 0);
});
