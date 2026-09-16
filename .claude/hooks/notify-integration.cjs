// PostToolUse hook (matcher: Bash) — fires after every Bash call.
// Only acts when the command was a `git commit`. Checks the new commit's
// message + changed files for keywords related to the Impulse2026 <-> IC-coordenacao
// integration, and if found, asks Claude to notify the peer session via SendMessage.
const { execSync } = require("node:child_process");

function readStdin() {
  try {
    return require("node:fs").readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function run(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8" });
  } catch {
    return "";
  }
}

let input;
try {
  input = JSON.parse(readStdin() || "{}");
} catch {
  input = {};
}

const command = (input.tool_input && input.tool_input.command) || "";
if (!/\bgit\s+commit\b/.test(command)) {
  process.exit(0);
}

const subject = run("git log -1 --pretty=%s").trim();
const body = run("git log -1 --pretty=%B");
const hash = run("git log -1 --pretty=%h").trim();
const filesStat = run("git show --stat -1 --pretty=format:");

const haystack = `${body}\n${filesStat}`.toLowerCase();
const keywords = [
  "integra",
  "ic-coordenacao",
  "ic_coordenacao",
  "coordenacao",
  "webhook",
  "sync",
];

const matched = keywords.some((kw) => haystack.includes(kw));
if (!matched) {
  process.exit(0);
}

const filesList = filesStat
  .split("\n")
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith("git show") && !/^\d+ files? changed/.test(l))
  .slice(0, 8)
  .join("; ");

const context =
  `Commit ${hash} ("${subject}") no repo impulse2026 parece tocar a integracao ` +
  `Impulse2026 <-> IC-coordenacao (arquivos: ${filesList}). ` +
  `Chame SendMessage agora para "ic-coordenacao-86" resumindo essa mudanca, ` +
  `para a outra sessao manter o trabalho de integracao em sincronia.`;

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: context,
    },
  })
);
