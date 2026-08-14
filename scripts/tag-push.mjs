#!/usr/bin/env bun
/**
 * Safe Electron release tag helper (no force).
 *
 * Requires a clean working tree, refuses if the tag already exists locally or on
 * origin, creates an annotated tag, and pushes without --force.
 *
 * Usage:
 *   bun run tp
 *   bun scripts/tag-push.mjs
 *   bun scripts/tag-push.mjs 0.1.16
 *   bun scripts/tag-push.mjs --check 0.1.16   # run check + test first
 */
import { spawnSync } from "node:child_process";
import readline from "node:readline";

const VERSION_RE = /^[0-9]+\.[0-9]+\.[0-9]+([.-].*)?$/;

/**
 * @param {string} question
 * @param {string} [defaultValue]
 */
async function prompt(question, defaultValue = "") {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const suffix = defaultValue ? ` [${defaultValue}]` : "";
  const answer = await new Promise((resolve) => {
    rl.question(`${question}${suffix}: `, resolve);
  });
  rl.close();
  const trimmed = answer.trim();
  return trimmed || defaultValue;
}

/**
 * @param {string} question
 * @param {boolean} defaultYes
 */
async function promptYesNo(question, defaultYes = true) {
  const hint = defaultYes ? "Y/n" : "y/N";
  const answer = (await prompt(`${question} (${hint})`, "")).toLowerCase();
  if (!answer) return defaultYes;
  return answer === "y" || answer === "yes";
}

/**
 * @param {string[]} args
 * @param {{ allowFail?: boolean }} [opts]
 */
function git(args, opts = {}) {
  const result = spawnSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0 && !opts.allowFail) {
    const detail = (result.stderr || result.stdout || "").trim();
    throw new Error(`git ${args.join(" ")} failed${detail ? `: ${detail}` : ""}`);
  }
  return {
    status: result.status ?? 1,
    stdout: (result.stdout || "").trim(),
    stderr: (result.stderr || "").trim(),
  };
}

/**
 * @param {string} input
 */
function normalizeTag(input) {
  const raw = input.trim();
  if (!raw) return null;
  const version = raw.startsWith("v") ? raw.slice(1) : raw;
  if (!VERSION_RE.test(version)) return null;
  return `v${version}`;
}

function latestTag() {
  const sorted = git(["tag", "-l", "v*", "--sort=-v:refname"], { allowFail: true });
  if (sorted.status === 0 && sorted.stdout) {
    return sorted.stdout.split(/\r?\n/).find(Boolean) ?? null;
  }
  const describe = git(["describe", "--tags", "--abbrev=0"], { allowFail: true });
  return describe.status === 0 && describe.stdout ? describe.stdout : null;
}

function mainArgTag() {
  const arg = process.argv.slice(2).find((a) => !a.startsWith("-"));
  return arg ? normalizeTag(arg) : null;
}

function wantsCheck() {
  return process.argv.includes("--check") || process.argv.includes("--with-check");
}

function assertCleanWorkingTree() {
  const status = git(["status", "--porcelain"]);
  if (status.stdout) {
    throw new Error(
      "Working tree is not clean. Commit or stash changes before tagging.\n" + status.stdout,
    );
  }
}

/**
 * @param {string} tag
 */
function assertTagDoesNotExist(tag) {
  const local = git(["rev-parse", "-q", "--verify", `refs/tags/${tag}`], { allowFail: true });
  if (local.status === 0) {
    throw new Error(`Tag ${tag} already exists locally. Refusing to overwrite.`);
  }
  const remote = git(["ls-remote", "--tags", "origin", `refs/tags/${tag}`], { allowFail: true });
  if (remote.status === 0 && remote.stdout) {
    throw new Error(`Tag ${tag} already exists on origin. Refusing to overwrite.`);
  }
}

/**
 * @param {string} command
 * @param {string[]} args
 */
function runBun(command, args) {
  const result = spawnSync("bun", ["run", command, ...args], {
    encoding: "utf8",
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`bun run ${command} failed (exit ${result.status ?? 1})`);
  }
}

async function main() {
  assertCleanWorkingTree();

  console.log("Fetching tags from origin…");
  git(["fetch", "--tags", "origin"], { allowFail: true });

  const latest = latestTag();
  console.log(latest ? `Latest tag: ${latest}` : "No v* tags found yet.");

  const fromArg = mainArgTag();
  let tag = fromArg;
  if (!tag) {
    const entered = await prompt("New tag (semver, with or without leading v)");
    tag = normalizeTag(entered);
  }
  if (!tag) {
    console.error("Invalid version. Expected something like 0.1.16 or v0.1.16.");
    process.exit(1);
  }

  assertTagDoesNotExist(tag);

  let runChecks = wantsCheck();
  if (!runChecks) {
    runChecks = await promptYesNo("Run bun run check and bun run test first?", false);
  }
  if (runChecks) {
    console.log("\nRunning check…");
    runBun("check", []);
    console.log("Running test…");
    runBun("test", []);
  }

  const branch = git(["branch", "--show-current"], { allowFail: true }).stdout || "(detached)";
  const head = git(["rev-parse", "--short", "HEAD"]).stdout;
  console.log(`\nWill annotate HEAD ${head} on ${branch} as ${tag}`);
  console.log(`  git tag -a ${tag} -m "${tag}"`);
  console.log(`  git push origin ${tag}`);

  const ok = await promptYesNo("Proceed?", true);
  if (!ok) {
    console.log("Aborted.");
    process.exit(0);
  }

  git(["tag", "-a", tag, "-m", tag]);
  const push = spawnSync("git", ["push", "origin", tag], {
    encoding: "utf8",
    stdio: "inherit",
  });
  if (push.status !== 0) {
    process.exit(push.status ?? 1);
  }

  console.log(`\nPushed ${tag}. Electron Release CI should start on GitHub Actions.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
