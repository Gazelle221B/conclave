#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const packageJson = require("../package.json");

const repoRoot = path.resolve(__dirname, "..");

const MANIFEST_PATH = ".conclave/manifest.json";

// editable: adopters are expected to fill/evolve these files, so `check` never
// treats local changes as drift. Non-editable entries are Conclave-managed kit
// files whose modification is reported as drift against the install manifest.
const DOCUMENT_FILES = [
  ["templates/REQUIREMENTS.template.md", "docs/REQUIREMENTS.md", { rewriteProjectLinks: true, editable: true }],
  ["templates/DESIGN.template.md", "docs/DESIGN.md", { rewriteProjectLinks: true, editable: true }],
  ["templates/IMPLEMENTATION_PLAN.template.md", "docs/IMPLEMENTATION_PLAN.md", { rewriteProjectLinks: true, editable: true }],
  ["templates/PROJECT_STATE.template.md", "docs/PROJECT_STATE.md", { rewriteProjectLinks: true, editable: true }],
  ["templates/HANDOFF.template.md", "docs/HANDOFF.md", { rewriteProjectLinks: true, editable: true }],
  ["templates/REVIEW_REPORT.template.md", "docs/REVIEW_REPORT.md", { rewriteProjectLinks: true, editable: true }],
  ["templates/QA_REPORT.template.md", "docs/QA_REPORT.md", { rewriteProjectLinks: true, editable: true }],
  ["runbook/ORCHESTRATION_RUNBOOK.template.md", "docs/conclave/runbook/ORCHESTRATION_RUNBOOK.template.md", { editable: false }],
  ["runbook/ORCHESTRATION_RUNBOOK.template.md", "docs/conclave/runbook/ORCHESTRATION_RUNBOOK.md", { editable: true }]
];

const INSTALL_DIRECTORIES = [
  ["governance", "docs/conclave/governance", { editable: false }],
  ["principles", "docs/conclave/principles", { editable: false }],
  ["roles", "docs/conclave/roles", { editable: true }]
];

const PROMPT_FILES = [
  "architect.md",
  "implement.md",
  "qa.md",
  "review.md"
];

const KNOWN_OPTIONS = new Set(["--dry-run", "--force", "--no-claude-alias", "--json"]);

const COMMAND_OPTIONS = {
  version: new Set(),
  init: new Set(["--dry-run", "--force", "--no-claude-alias", "--json"]),
  check: new Set(["--json"])
};

function usage() {
  return [
    "Conclave governance kit",
    "",
    "Usage:",
    "  conclave init [target] [--dry-run] [--force] [--no-claude-alias] [--json]",
    "  conclave check [target] [--json]",
    "  conclave version | --version | -V",
    "",
    "Commands:",
    "  init    Copy Conclave governance docs, templates, and role prompts into a project.",
    "          Records an install manifest (.conclave/manifest.json) with kit version and",
    "          content hashes so `check` can detect drift.",
    "  check   Verify governance files exist and are non-empty, report remaining",
    "          placeholders per document, verify the CLAUDE.md alias, and flag",
    "          locally modified kit files.",
    "",
    "Options:",
    "  --dry-run           Print planned writes without changing files. Runs the same",
    "                      feasibility checks as a real install.",
    "  --force             Overwrite existing Conclave target files.",
    "  --no-claude-alias   Skip CLAUDE.md -> AGENTS.md alias creation (keeps an existing CLAUDE.md).",
    "  --json              Machine-readable output (for `check`, or `init --dry-run`)."
  ].join("\n");
}

function parseArgs(argv) {
  const args = [...argv];
  const rawCommand = args.shift();
  let command = rawCommand || "help";
  if (rawCommand === "-h" || rawCommand === "--help") {
    command = "help";
  } else if (rawCommand === "--version" || rawCommand === "-V") {
    command = "version";
  }

  let targetProvided = false;
  const seen = [];
  const options = {
    command,
    target: process.cwd(),
    dryRun: false,
    force: false,
    claudeAlias: true,
    json: false
  };

  for (const arg of args) {
    if (arg === "-h" || arg === "--help") {
      options.command = "help";
    } else if (arg.startsWith("-")) {
      if (!KNOWN_OPTIONS.has(arg)) {
        throw new Error(`Unknown option: ${arg}`);
      }
      seen.push(arg);
    } else {
      if (targetProvided) {
        throw new Error(`Unexpected extra positional argument: ${arg}`);
      }
      options.target = arg;
      targetProvided = true;
    }
  }

  if (options.command !== "help") {
    const allowed = COMMAND_OPTIONS[options.command];
    if (allowed) {
      for (const flag of seen) {
        if (!allowed.has(flag)) {
          throw new Error(`Unknown option for ${options.command}: ${flag}`);
        }
      }
    }
  }

  options.dryRun = seen.includes("--dry-run");
  options.force = seen.includes("--force");
  options.claudeAlias = !seen.includes("--no-claude-alias");
  options.json = seen.includes("--json");

  if (options.command === "init" && options.json && !options.dryRun) {
    throw new Error("--json for init requires --dry-run (machine-readable output covers previews and `check`).");
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
      destination: "AGENTS.md",
      editable: true
    }
  ];

  for (const [source, destination, flags = {}] of DOCUMENT_FILES) {
    entries.push({
      source: path.join(repoRoot, source),
      destination,
      rewriteProjectLinks: Boolean(flags.rewriteProjectLinks),
      editable: Boolean(flags.editable)
    });
  }

  for (const [sourceDir, destinationDir, flags = {}] of INSTALL_DIRECTORIES) {
    const absoluteSourceDir = path.join(repoRoot, sourceDir);
    for (const source of walkFiles(absoluteSourceDir)) {
      entries.push({
        source,
        // manifest keys must stay portable across platforms, so destinations
        // always use forward slashes
        destination: toPosixPath(path.join(destinationDir, path.relative(absoluteSourceDir, source))),
        editable: Boolean(flags.editable)
      });
    }
  }

  for (const fileName of PROMPT_FILES) {
    entries.push({
      source: path.join(repoRoot, "prompts", fileName),
      destination: `prompts/${fileName}`,
      editable: true
    });
    entries.push({
      source: path.join(repoRoot, "prompts", fileName),
      destination: `docs/conclave/prompts/${fileName}`,
      editable: false
    });
  }

  // optional: pre-0.4 installs lack it, so `check` reports it as a warning
  // rather than a failure
  entries.push({ content: "", destination: "docs/adr/.gitkeep", editable: true, optional: true });

  return entries;
}

function toPosixPath(value) {
  return value.split(path.sep).join("/");
}

function resolveTarget(target) {
  return path.resolve(process.cwd(), target);
}

function lstatIfPresent(filePath) {
  try {
    return fs.lstatSync(filePath);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") {
      return null;
    }
    throw error;
  }
}

function statIfPresent(filePath) {
  try {
    return fs.statSync(filePath);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR" || error.code === "ELOOP") {
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

function assertSafeParents(targetDir, destination) {
  let current = path.dirname(destination);

  while (current !== targetDir) {
    assertInsideTarget(targetDir, current);
    const stat = lstatIfPresent(current);
    if (stat && stat.isSymbolicLink()) {
      throw new Error(`Refusing to write through symlinked directory: ${current}`);
    }
    if (stat && !stat.isDirectory()) {
      throw new Error(`Refusing to replace non-directory path component at ${current}.`);
    }
    const next = path.dirname(current);
    if (next === current) {
      break;
    }
    current = next;
  }
}

function buildConflictMessage(targetDir, conflicts) {
  const lines = [
    `Refusing to overwrite ${conflicts.length} existing file(s) in ${targetDir}.`,
    ...conflicts.map((filePath) => `  - ${filePath}`),
    "Preview the overwrite with `--dry-run --force`, then rerun with --force to overwrite Conclave-managed files."
  ];
  if (conflicts.includes("CLAUDE.md")) {
    lines.push("If CLAUDE.md is your own file, rerun with --no-claude-alias to leave it untouched.");
  }
  return lines.join("\n");
}

// Plan phase: run every feasibility check (target type, escape/symlink guards,
// directory blockers, conflicts) before a single byte is written, so dry-run
// and the real run fail identically and a failing install never half-applies.
function planInstall(targetDir, entries, options) {
  const targetStat = statIfPresent(targetDir);
  if (targetStat && !targetStat.isDirectory()) {
    throw new Error(`Target is not a directory: ${targetDir}`);
  }

  const planned = [];
  const conflicts = [];
  const directoryBlockers = [];

  for (const entry of entries) {
    const destination = path.resolve(targetDir, entry.destination);
    assertInsideTarget(targetDir, destination);
    assertSafeParents(targetDir, destination);
    const stat = lstatIfPresent(destination);
    if (stat && stat.isDirectory() && !stat.isSymbolicLink()) {
      directoryBlockers.push(destination);
    } else if (stat) {
      conflicts.push(entry.destination);
    }
    planned.push({ ...entry, absolute: destination });
  }

  if (options.claudeAlias) {
    const aliasPath = path.join(targetDir, "CLAUDE.md");
    const stat = lstatIfPresent(aliasPath);
    if (stat && stat.isDirectory() && !stat.isSymbolicLink()) {
      directoryBlockers.push(aliasPath);
    } else if (stat) {
      conflicts.push("CLAUDE.md");
    }
  }

  const manifestAbsolute = path.resolve(targetDir, MANIFEST_PATH);
  assertInsideTarget(targetDir, manifestAbsolute);
  assertSafeParents(targetDir, manifestAbsolute);
  const manifestStat = lstatIfPresent(manifestAbsolute);
  if (manifestStat && manifestStat.isDirectory() && !manifestStat.isSymbolicLink()) {
    directoryBlockers.push(manifestAbsolute);
  }

  if (directoryBlockers.length > 0) {
    throw new Error(
      directoryBlockers.map((blocked) => `Refusing to replace directory at ${blocked}.`).join("\n")
    );
  }

  if (conflicts.length > 0 && !options.force) {
    const error = new Error(buildConflictMessage(targetDir, conflicts));
    error.conflicts = conflicts;
    throw error;
  }

  return { planned, conflicts };
}

function readEntryContent(entry) {
  if (entry.content !== undefined) {
    return entry.content;
  }
  const raw = fs.readFileSync(entry.source, "utf8");
  return entry.rewriteProjectLinks ? rewriteProjectDocLinks(raw) : raw;
}

function rewriteProjectDocLinks(content) {
  return content
    .replace(/\.\.\/(governance|principles|roles|runbook|prompts)\//g, "conclave/$1/")
    .replace(/\b(REQUIREMENTS|DESIGN|IMPLEMENTATION_PLAN|PROJECT_STATE|HANDOFF|REVIEW_REPORT|QA_REPORT|ORCHESTRATION_RUNBOOK)\.template\.md/g, "$1.md");
}

function sha256(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

let temporaryFileCounter = 0;

// Write via temp file + rename inside the realpath-verified parent directory.
// rename replaces a destination symlink itself instead of following it, which
// closes the check-then-write race on the final path component. (The parent
// realpath re-check narrows, but cannot fully eliminate, races on parents.)
function writeFileSafely(targetRealRoot, destination, content) {
  const directory = path.dirname(destination);
  fs.mkdirSync(directory, { recursive: true });
  const realDirectory = fs.realpathSync(directory);
  if (realDirectory !== targetRealRoot && !realDirectory.startsWith(targetRealRoot + path.sep)) {
    throw new Error(`Refusing to write outside target project: ${destination}`);
  }

  const temporaryPath = path.join(
    realDirectory,
    `.conclave-write-${process.pid}-${temporaryFileCounter++}.tmp`
  );
  try {
    fs.writeFileSync(temporaryPath, content, "utf8");
    fs.renameSync(temporaryPath, path.join(realDirectory, path.basename(destination)));
  } finally {
    fs.rmSync(temporaryPath, { force: true });
  }
}

function createClaudeAlias(targetRealRoot, options) {
  if (!options.claudeAlias) {
    return { skipped: true, reason: "--no-claude-alias" };
  }

  const aliasPath = path.join(targetRealRoot, "CLAUDE.md");
  const temporaryPath = path.join(targetRealRoot, `.conclave-alias-${process.pid}.tmp`);
  try {
    fs.symlinkSync("AGENTS.md", temporaryPath);
    fs.renameSync(temporaryPath, aliasPath);
    return { skipped: false, mode: "symlink" };
  } catch (error) {
    fs.rmSync(temporaryPath, { force: true });
    if (error.code !== "EPERM" && error.code !== "EACCES" && error.code !== "ENOTSUP") {
      throw error;
    }

    writeFileSafely(targetRealRoot, aliasPath, fs.readFileSync(path.join(targetRealRoot, "AGENTS.md"), "utf8"));
    return { skipped: false, mode: "copy" };
  }
}

function initProject(options) {
  const targetDir = resolveTarget(options.target);
  const entries = buildInstallEntries();

  let plan;
  try {
    plan = planInstall(targetDir, entries, options);
  } catch (error) {
    // keep the --json contract for every plan failure, not just conflicts
    if (options.dryRun && options.json) {
      return {
        code: 1,
        output: JSON.stringify(
          {
            ok: false,
            kitVersion: packageJson.version,
            target: targetDir,
            error: error.message,
            conflicts: error.conflicts || []
          },
          null,
          2
        )
      };
    }
    throw error;
  }

  if (options.dryRun) {
    if (options.json) {
      return {
        code: 0,
        output: JSON.stringify(
          {
            ok: true,
            kitVersion: packageJson.version,
            target: targetDir,
            plannedWrites: [...plan.planned.map((entry) => entry.destination), MANIFEST_PATH],
            claudeAlias: options.claudeAlias ? "symlink-or-copy" : "skipped",
            conflicts: plan.conflicts
          },
          null,
          2
        )
      };
    }
    const aliasText = options.claudeAlias
      ? "Would create CLAUDE.md alias (symlink, or copy fallback)."
      : "CLAUDE.md alias skipped (--no-claude-alias).";
    const lines = [
      `Would install ${plan.planned.length} Conclave file(s) into ${targetDir}.`,
      aliasText,
      `Would record install manifest at ${MANIFEST_PATH}.`
    ];
    if (plan.conflicts.length > 0) {
      lines.push(
        `Would overwrite ${plan.conflicts.length} existing file(s): ${plan.conflicts.join(", ")}`
      );
    }
    return { code: 0, output: lines.join("\n") };
  }

  fs.mkdirSync(targetDir, { recursive: true });
  const targetRealRoot = fs.realpathSync(targetDir);

  const fileHashes = {};
  for (const entry of plan.planned) {
    const content = readEntryContent(entry);
    writeFileSafely(targetRealRoot, entry.absolute, content);
    fileHashes[entry.destination] = sha256(content);
  }

  const alias = createClaudeAlias(targetRealRoot, options);
  const manifest = {
    kitVersion: packageJson.version,
    createdAt: new Date().toISOString(),
    claudeAlias: alias.skipped ? "skipped" : alias.mode,
    files: fileHashes
  };
  // The manifest is written last. Deterministic blockers (a file at .conclave)
  // are rejected at plan time, but a permission failure here (e.g. read-only
  // pre-existing .conclave/) leaves the kit installed without a manifest and
  // `check` degrades to the manifest-less path — an accepted residual risk.
  writeFileSafely(
    targetRealRoot,
    path.resolve(targetDir, MANIFEST_PATH),
    `${JSON.stringify(manifest, null, 2)}\n`
  );

  const aliasText = alias.skipped
    ? `CLAUDE.md alias skipped (${alias.reason}).`
    : `Created CLAUDE.md alias as ${alias.mode}.`;

  return {
    code: 0,
    output: [
      `Installed ${plan.planned.length} Conclave file(s) into ${targetDir}.`,
      aliasText,
      `Recorded install manifest at ${MANIFEST_PATH}.`,
      "Next: edit AGENTS.md and docs/REQUIREMENTS.md placeholders, then run `conclave check`."
    ].join("\n")
  };
}

const HTML_TAG_NAMES = new Set([
  "a", "abbr", "b", "blockquote", "br", "caption", "code", "dd", "del", "details",
  "div", "dl", "dt", "em", "figcaption", "figure", "h1", "h2", "h3", "h4", "h5",
  "h6", "hr", "i", "img", "ins", "kbd", "li", "mark", "ol", "p", "pre", "q", "s",
  "samp", "small", "span", "strong", "sub", "summary", "sup", "table", "tbody",
  "td", "tfoot", "th", "thead", "tr", "u", "ul", "var"
]);

function isHtmlTagToken(inner) {
  const match = inner.match(/^\/?([a-z][a-z0-9]*)(\s+([^<>]*?))?\s*\/?$/i);
  if (!match || !HTML_TAG_NAMES.has(match[1].toLowerCase())) {
    return false;
  }
  // Bare tags (<br>, </td>) are HTML. Tags with trailing words only count as
  // HTML when the words look like attributes (contain =): "<a short summary>"
  // is a placeholder, not an anchor.
  return match[3] === undefined || match[3].includes("=");
}

// A `<...>` token counts as a placeholder unless it is documentation: HTML
// comments, autolinks/emails, HTML tags, or a token embedded in a larger
// inline-code expression (`agent/<task-id>-impl`, `<type>: <description>`).
// An inline-code span that IS exactly one token (`<プロジェクト名>`) still counts.
function countPlaceholders(content) {
  const prose = content
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/`([^`\n]+)`/g, (span, inner) => (/^<[^<>\n]+>$/.test(inner) ? inner : " "));

  const matches = prose.match(/<[^>\n]+>/g) || [];
  return matches.filter((token) => {
    const inner = token.slice(1, -1);
    if (/^(https?|mailto):/i.test(inner)) {
      return false;
    }
    if (/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(inner)) {
      return false;
    }
    if (isHtmlTagToken(inner)) {
      return false;
    }
    return true;
  }).length;
}

function readManifest(targetDir) {
  try {
    const parsed = JSON.parse(fs.readFileSync(path.join(targetDir, MANIFEST_PATH), "utf8"));
    if (!parsed || typeof parsed !== "object" || typeof parsed.files !== "object" || parsed.files === null) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function isOlderVersion(installed, current) {
  const a = String(installed).split(".").map((part) => Number.parseInt(part, 10) || 0);
  const b = String(current).split(".").map((part) => Number.parseInt(part, 10) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const x = a[i] || 0;
    const y = b[i] || 0;
    if (x !== y) {
      return x < y;
    }
  }
  return false;
}

function checkProject(options) {
  const targetDir = resolveTarget(options.target);
  const entries = buildInstallEntries();

  const missing = [];
  const optionalMissing = [];
  const empty = [];
  for (const entry of entries) {
    const absolute = path.join(targetDir, entry.destination);
    const stat = statIfPresent(absolute);
    if (!stat || !stat.isFile()) {
      (entry.optional ? optionalMissing : missing).push(entry.destination);
      continue;
    }
    if (stat.size === 0 && path.basename(entry.destination) !== ".gitkeep") {
      empty.push(entry.destination);
    }
  }

  const placeholders = {};
  const placeholderTargets = [
    "AGENTS.md",
    ...DOCUMENT_FILES.filter(([, , flags]) => flags && flags.rewriteProjectLinks).map(([, destination]) => destination)
  ];
  for (const destination of placeholderTargets) {
    const absolute = path.join(targetDir, destination);
    const stat = statIfPresent(absolute);
    if (!stat || !stat.isFile()) {
      continue;
    }
    const count = countPlaceholders(fs.readFileSync(absolute, "utf8"));
    if (count > 0) {
      placeholders[destination] = count;
    }
  }

  const warnings = [];
  const errors = [];
  const modifiedKitFiles = [];
  const manifest = readManifest(targetDir);
  const installedVersion = manifest ? manifest.kitVersion || null : null;

  if (optionalMissing.length > 0) {
    warnings.push(
      `Optional file(s) missing (created by conclave init >=0.4): ${optionalMissing.join(", ")}. Create them by hand (e.g. \`mkdir -p docs/adr && touch docs/adr/.gitkeep\`).`
    );
  }
  if (!manifest) {
    warnings.push(
      `No ${MANIFEST_PATH} found (pre-0.4 or manual install), so drift detection is off. \`conclave init --force\` records one but RESETS all Conclave-managed files — including filled project docs — to templates; commit to git first and restore filled docs afterwards.`
    );
  } else {
    if (installedVersion && isOlderVersion(installedVersion, packageJson.version)) {
      warnings.push(
        `Installed kit ${installedVersion} is older than CLI ${packageJson.version}. \`conclave init --force\` refreshes kit files but also resets filled project docs to templates — commit to git first.`
      );
    }
    if (manifest.claudeAlias === "symlink" || manifest.claudeAlias === "copy") {
      const aliasStat = statIfPresent(path.join(targetDir, "CLAUDE.md"));
      if (!aliasStat || !aliasStat.isFile()) {
        errors.push(`CLAUDE.md alias is missing (recorded as ${manifest.claudeAlias} at install).`);
      }
    }
    const editableByDestination = new Map(entries.map((entry) => [entry.destination, entry.editable]));
    for (const [destination, recordedHash] of Object.entries(manifest.files)) {
      if (editableByDestination.get(destination) !== false) {
        continue;
      }
      const absolute = path.join(targetDir, destination);
      const stat = statIfPresent(absolute);
      if (!stat || !stat.isFile()) {
        continue;
      }
      if (sha256(fs.readFileSync(absolute)) !== recordedHash) {
        modifiedKitFiles.push(destination);
      }
    }
    if (modifiedKitFiles.length > 0) {
      warnings.push(
        `${modifiedKitFiles.length} Conclave kit file(s) locally modified since install: ${modifiedKitFiles.join(", ")}. Governance docs are kit-managed; keep project-specific rules in AGENTS.md or docs/.`
      );
    }
  }

  for (const [destination, count] of Object.entries(placeholders)) {
    warnings.push(`${count} placeholder marker(s) remain in ${destination}.`);
  }

  const ok = missing.length === 0 && empty.length === 0 && errors.length === 0;

  if (options.json) {
    return {
      ok,
      message: JSON.stringify(
        {
          ok,
          kitVersion: packageJson.version,
          installedVersion,
          target: targetDir,
          missing,
          optionalMissing,
          empty,
          errors,
          modifiedKitFiles,
          placeholders,
          warnings
        },
        null,
        2
      )
    };
  }

  const lines = [];
  if (ok) {
    lines.push(`Conclave check passed for ${targetDir}.`);
  } else {
    lines.push(`Conclave check failed for ${targetDir}.`);
    if (missing.length > 0) {
      lines.push("Missing or invalid required file(s):");
      lines.push(...missing.map((filePath) => `  - ${filePath}`));
    }
    if (empty.length > 0) {
      lines.push("Empty required file(s):");
      lines.push(...empty.map((filePath) => `  - ${filePath}`));
    }
    lines.push(...errors.map((error) => `Error: ${error}`));
  }
  lines.push(warnings.length > 0 ? `Warnings: ${warnings.join(" ")}` : "Warnings: none.");

  return { ok, message: lines.join("\n") };
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
    return initProject(options);
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
