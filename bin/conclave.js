#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const packageJson = require("../package.json");

const repoRoot = path.resolve(__dirname, "..");

const DOCUMENT_FILES = [
  ["templates/REQUIREMENTS.template.md", "docs/REQUIREMENTS.md", true],
  ["templates/DESIGN.template.md", "docs/DESIGN.md", true],
  ["templates/IMPLEMENTATION_PLAN.template.md", "docs/IMPLEMENTATION_PLAN.md", true],
  ["templates/PROJECT_STATE.template.md", "docs/PROJECT_STATE.md", true],
  ["templates/HANDOFF.template.md", "docs/HANDOFF.md", true],
  ["templates/REVIEW_REPORT.template.md", "docs/REVIEW_REPORT.md", true],
  ["templates/QA_REPORT.template.md", "docs/QA_REPORT.md", true],
  ["runbook/ORCHESTRATION_RUNBOOK.template.md", "docs/conclave/runbook/ORCHESTRATION_RUNBOOK.template.md"],
  ["runbook/ORCHESTRATION_RUNBOOK.template.md", "docs/conclave/runbook/ORCHESTRATION_RUNBOOK.md"]
];

const INSTALL_DIRECTORIES = [
  ["governance", "docs/conclave/governance"],
  ["principles", "docs/conclave/principles"],
  ["roles", "docs/conclave/roles"]
];

const PROMPT_FILES = [
  "architect.md",
  "implement.md",
  "qa.md",
  "review.md"
];

function usage() {
  return [
    "Conclave governance kit",
    "",
    "Usage:",
    "  conclave init [target] [--dry-run] [--force] [--no-claude-alias]",
    "  conclave check [target]",
    "  conclave version",
    "",
    "Commands:",
    "  init    Copy Conclave governance docs, templates, and role prompts into a project.",
    "  check   Verify that a project has the expected Conclave files.",
    "",
    "Options:",
    "  --dry-run           Print planned writes without changing files.",
    "  --force             Overwrite existing Conclave target files.",
    "  --no-claude-alias   Skip CLAUDE.md -> AGENTS.md alias creation."
  ].join("\n");
}

function parseArgs(argv) {
  const args = [...argv];
  const rawCommand = args.shift();
  const command = rawCommand === "-h" || rawCommand === "--help"
    ? "help"
    : rawCommand || "help";
  let targetProvided = false;
  const options = {
    command,
    target: process.cwd(),
    dryRun: false,
    force: false,
    claudeAlias: true
  };

  for (const arg of args) {
    if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--force") {
      options.force = true;
    } else if (arg === "--no-claude-alias") {
      options.claudeAlias = false;
    } else if (arg === "-h" || arg === "--help") {
      options.command = "help";
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      if (targetProvided) {
        throw new Error(`Unexpected extra positional argument: ${arg}`);
      }
      options.target = arg;
      targetProvided = true;
    }
  }

  return options;
}

function walkFiles(sourceDir) {
  const files = [];
  const pending = [sourceDir];

  while (pending.length > 0) {
    const current = pending.pop();
    for (const dirent of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, dirent.name);
      if (dirent.isDirectory()) {
        pending.push(absolute);
      } else if (dirent.isFile()) {
        files.push(absolute);
      }
    }
  }

  return files.sort();
}

function buildInstallEntries() {
  const entries = [
    {
      source: path.join(repoRoot, "templates/AGENTS.template.md"),
      destination: "AGENTS.md"
    }
  ];

  for (const [source, destination, rewriteProjectLinks] of DOCUMENT_FILES) {
    entries.push({
      source: path.join(repoRoot, source),
      destination,
      rewriteProjectLinks
    });
  }

  for (const [sourceDir, destinationDir] of INSTALL_DIRECTORIES) {
    const absoluteSourceDir = path.join(repoRoot, sourceDir);
    for (const source of walkFiles(absoluteSourceDir)) {
      entries.push({
        source,
        destination: path.join(destinationDir, path.relative(absoluteSourceDir, source))
      });
    }
  }

  for (const fileName of PROMPT_FILES) {
    entries.push({
      source: path.join(repoRoot, "prompts", fileName),
      destination: path.join("prompts", fileName)
    });
    entries.push({
      source: path.join(repoRoot, "prompts", fileName),
      destination: path.join("docs/conclave/prompts", fileName)
    });
  }

  return entries;
}

function resolveTarget(target) {
  return path.resolve(process.cwd(), target);
}

function lstatIfPresent(filePath) {
  try {
    return fs.lstatSync(filePath);
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

function assertInsideTarget(targetDir, destination) {
  const relative = path.relative(targetDir, destination);
  if (relative && (relative.startsWith("..") || path.isAbsolute(relative))) {
    throw new Error(`Refusing to write outside target project: ${destination}`);
  }
}

function assertNoSymlinkParents(targetDir, destination) {
  let current = path.dirname(destination);

  while (current !== targetDir) {
    assertInsideTarget(targetDir, current);
    const stat = lstatIfPresent(current);
    if (stat && stat.isSymbolicLink()) {
      throw new Error(`Refusing to write through symlinked directory: ${current}`);
    }
    const next = path.dirname(current);
    if (next === current) {
      break;
    }
    current = next;
  }
}

function listConflicts(targetDir, entries, options) {
  if (options.force) {
    return [];
  }

  const conflicts = entries
    .map((entry) => entry.destination)
    .filter((destination) => lstatIfPresent(path.join(targetDir, destination)));

  if (options.claudeAlias && lstatIfPresent(path.join(targetDir, "CLAUDE.md"))) {
    conflicts.push("CLAUDE.md");
  }

  return conflicts;
}

function copyEntry(targetDir, entry, options) {
  const destination = path.resolve(targetDir, entry.destination);
  assertInsideTarget(targetDir, destination);
  assertNoSymlinkParents(targetDir, destination);

  if (options.dryRun) {
    return;
  }

  const stat = lstatIfPresent(destination);
  if (stat) {
    if (stat.isDirectory() && !stat.isSymbolicLink()) {
      throw new Error(`Refusing to replace directory at ${destination}.`);
    }
    if (stat.isSymbolicLink()) {
      if (!options.force) {
        throw new Error(`Refusing to replace symlink without --force: ${destination}`);
      }
      fs.rmSync(destination, { force: true });
    }
  }

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  if (entry.rewriteProjectLinks) {
    fs.writeFileSync(destination, rewriteProjectDocLinks(fs.readFileSync(entry.source, "utf8")), "utf8");
  } else {
    fs.copyFileSync(entry.source, destination);
  }
}

function rewriteProjectDocLinks(content) {
  return content
    .replace(/\.\.\/(governance|principles|roles|runbook|prompts)\//g, "conclave/$1/")
    .replace(/\b(REQUIREMENTS|DESIGN|IMPLEMENTATION_PLAN|PROJECT_STATE|HANDOFF|REVIEW_REPORT|QA_REPORT)\.template\.md/g, "$1.md");
}

function createClaudeAlias(targetDir, options) {
  if (!options.claudeAlias) {
    return { skipped: true, reason: "--no-claude-alias" };
  }

  const aliasPath = path.join(targetDir, "CLAUDE.md");
  if (options.dryRun) {
    return { skipped: false, dryRun: true };
  }

  const stat = lstatIfPresent(aliasPath);
  if (options.force && stat) {
    if (stat.isDirectory() && !stat.isSymbolicLink()) {
      throw new Error(`Refusing to replace directory at ${aliasPath}.`);
    }
    fs.rmSync(aliasPath, { force: true });
  }

  try {
    fs.symlinkSync("AGENTS.md", aliasPath);
    return { skipped: false, mode: "symlink" };
  } catch (error) {
    if (error.code !== "EPERM" && error.code !== "EACCES" && error.code !== "ENOTSUP") {
      throw error;
    }

    fs.copyFileSync(path.join(targetDir, "AGENTS.md"), aliasPath);
    return { skipped: false, mode: "copy" };
  }
}

function initProject(options) {
  const targetDir = resolveTarget(options.target);
  const entries = buildInstallEntries();
  const conflicts = listConflicts(targetDir, entries, options);

  if (conflicts.length > 0) {
    throw new Error(
      [
        `Refusing to overwrite ${conflicts.length} existing file(s) in ${targetDir}.`,
        "Rerun with --force to overwrite Conclave-managed files:",
        ...conflicts.map((filePath) => `  - ${filePath}`)
      ].join("\n")
    );
  }

  if (!options.dryRun) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  for (const entry of entries) {
    copyEntry(targetDir, entry, options);
  }

  const alias = createClaudeAlias(targetDir, options);
  const action = options.dryRun ? "Would install" : "Installed";
  const aliasText = alias.skipped
    ? `CLAUDE.md alias skipped (${alias.reason}).`
    : alias.dryRun
      ? "Would create CLAUDE.md alias."
      : `Created CLAUDE.md alias as ${alias.mode}.`;

  return [
    `${action} ${entries.length} Conclave file(s) into ${targetDir}.`,
    aliasText,
    "Next: edit AGENTS.md and docs/REQUIREMENTS.md placeholders, then run `conclave check`."
  ].join("\n");
}

function countPlaceholders(content) {
  const matches = content.match(/<[^>\n]+>/g);
  return matches ? matches.length : 0;
}

function checkProject(options) {
  const targetDir = resolveTarget(options.target);
  const requiredPaths = buildInstallEntries().map((entry) => entry.destination);
  const missing = requiredPaths.filter((filePath) => {
    const absolute = path.join(targetDir, filePath);
    const stat = lstatIfPresent(absolute);
    return !stat || !stat.isFile();
  });
  const agentsPath = path.join(targetDir, "AGENTS.md");
  const agentsStat = lstatIfPresent(agentsPath);
  const placeholderCount = agentsStat && agentsStat.isFile()
    ? countPlaceholders(fs.readFileSync(agentsPath, "utf8"))
    : null;

  if (missing.length > 0) {
    return {
      ok: false,
      message: [
        `Conclave check failed for ${targetDir}.`,
        "Missing or invalid required file(s):",
        ...missing.map((filePath) => `  - ${filePath}`)
      ].join("\n")
    };
  }

  const warnings = [];
  if (placeholderCount > 0) {
    warnings.push(`${placeholderCount} placeholder marker(s) remain in AGENTS.md.`);
  }

  return {
    ok: true,
    message: [
      `Conclave check passed for ${targetDir}.`,
      warnings.length > 0 ? `Warnings: ${warnings.join(" ")}` : "Warnings: none."
    ].join("\n")
  };
}

function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);

  if (options.command === "help") {
    return { code: 0, output: usage() };
  }

  if (options.command === "version") {
    return { code: 0, output: packageJson.version };
  }

  if (options.command === "init") {
    return { code: 0, output: initProject(options) };
  }

  if (options.command === "check") {
    const result = checkProject(options);
    return { code: result.ok ? 0 : 1, output: result.message };
  }

  throw new Error(`Unknown command: ${options.command}\n\n${usage()}`);
}

if (require.main === module) {
  try {
    const result = main();
    if (result.output) {
      console.log(result.output);
    }
    process.exitCode = result.code;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = {
  buildInstallEntries,
  checkProject,
  countPlaceholders,
  initProject,
  main,
  parseArgs
};
