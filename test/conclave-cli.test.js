"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const cli = require("../bin/conclave.js");

function makeTempProject() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "conclave-cli-"));
}

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
  assert.equal(fs.existsSync(path.join(target, "prompts/CLAUDE-FABLE-5.md")), false);
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
