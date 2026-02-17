import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { ChildProcess, spawn } from "node:child_process";
import * as path from "node:path";

type CliOptions = {
  promptPath: string;
  iterationLimit: number;
  iterationsSet: boolean;
  previewLines: number;
  parallelAgents: number;
  pauseMs: number;
  command: string;
  model: string;
  reasoningEffort: "low" | "medium" | "high";
  yolo: boolean;
  logDir: string;
  showRaw: boolean;
};

type IterationState = {
  current_iteration: number;
  max_iterations: number;
};

type StreamResult = {
  status: number | null;
  stdout: string;
  stderr: string;
};

type PreviewEntry = {
  kind: "assistant" | "tool" | "reasoning" | "error" | "message";
  label: string;
  text: string;
};

type UsageSummary = {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
};

type Tone = "neutral" | "info" | "success" | "warn" | "error" | "muted";

const ITERATION_STATE_PATH = ".ai_agents/iteration.json";
const DEFAULT_LOG_DIR = ".ai_agents/logs/codex-loop";
const DEFAULT_MODEL = "gpt-5.3-codex-spark";
const SPINNER_FRAMES = ["-", "\\", "|", "/"];

const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  blue: "\x1b[34m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  gray: "\x1b[90m",
  white: "\x1b[97m",
};

function stylingEnabled(): boolean {
  return Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;
}

function colorize(text: string, ...codes: string[]): string {
  if (!stylingEnabled() || codes.length === 0) {
    return text;
  }
  return `${codes.join("")}${text}${ANSI.reset}`;
}

function toneColor(tone: Tone): string {
  switch (tone) {
    case "info":
      return ANSI.cyan;
    case "success":
      return ANSI.green;
    case "warn":
      return ANSI.yellow;
    case "error":
      return ANSI.red;
    case "muted":
      return ANSI.gray;
    default:
      return ANSI.white;
  }
}

function badge(text: string, tone: Tone): string {
  return colorize(`[${text}]`, ANSI.bold, toneColor(tone));
}

function terminalWidth(): number {
  const width = process.stdout.columns ?? 100;
  return Math.max(70, Math.min(width, 140));
}

function hr(char = "-"): string {
  return char.repeat(Math.min(terminalWidth(), 100));
}

function printSection(title: string): void {
  console.log(colorize(hr("="), ANSI.gray));
  console.log(`${badge("LOOP", "info")} ${colorize(title, ANSI.bold, ANSI.white)}`);
  console.log(colorize(hr("-"), ANSI.gray));
}

function formatTokens(value: number): string {
  return Math.max(0, Math.round(value)).toLocaleString("en-US");
}

function progressBar(current: number, total: number): string {
  const width = 22;
  const safeTotal = Math.max(total, 1);
  const ratio = Math.max(0, Math.min(1, current / safeTotal));
  const filled = Math.round(width * ratio);
  return `[${"#".repeat(filled)}${"-".repeat(width - filled)}] ${Math.round(ratio * 100)}%`;
}

function wrapText(input: string, maxWidth: number): string[] {
  const width = Math.max(24, maxWidth);
  const lines: string[] = [];
  for (const rawLine of input.split("\n")) {
    const words = rawLine.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      if (!line) {
        line = word;
        continue;
      }
      if (`${line} ${word}`.length <= width) {
        line = `${line} ${word}`;
      } else {
        lines.push(line);
        line = word;
      }
    }
    if (line) {
      lines.push(line);
    }
  }
  return lines;
}

function labelTone(label: string): Tone {
  const normalized = label.toLowerCase();
  if (normalized.includes("error")) return "error";
  if (normalized.includes("tool") || normalized.includes("command")) return "info";
  if (normalized.includes("reasoning")) return "muted";
  if (normalized.includes("assistant")) return "success";
  if (normalized.includes("warn")) return "warn";
  return "neutral";
}

function createSpinner(label: string): { stop: (message: string, tone?: Tone) => void } {
  if (!process.stdout.isTTY) {
    console.log(`${badge("RUN", "info")} ${label}`);
    return {
      stop: (message: string, tone = "success") => {
        console.log(`${badge("DONE", tone)} ${message}`);
      },
    };
  }

  const start = Date.now();
  let frame = 0;
  const timer = setInterval(() => {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const cursor = SPINNER_FRAMES[frame % SPINNER_FRAMES.length];
    frame += 1;
    const line = `${cursor} ${label} ${elapsed}s`;
    process.stdout.write(`\r${colorize(line, ANSI.cyan)}`);
  }, 100);

  return {
    stop: (message: string, tone = "success") => {
      clearInterval(timer);
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      process.stdout.write("\r\x1b[2K");
      console.log(`${badge("DONE", tone)} ${message} ${colorize(`(${elapsed}s)`, ANSI.dim)}`);
    },
  };
}

function parseArgs(): CliOptions {
  const defaults: Omit<CliOptions, "promptPath"> = {
    iterationLimit: 50,
    iterationsSet: false,
    previewLines: 3,
    parallelAgents: 1,
    pauseMs: 0,
    command: "codex",
    model: DEFAULT_MODEL,
    reasoningEffort: "high",
    yolo: true,
    logDir: DEFAULT_LOG_DIR,
    showRaw: false,
  };
  let promptPath = ".ai_agents/prompt.md";

  const toInt = (value: string | undefined, fallback: number) => {
    const parsed = Number.parseInt(value ?? "", 10);
    return Number.isNaN(parsed) || parsed <= 0 ? fallback : parsed;
  };

  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--prompt" || arg === "-p") {
      promptPath = argv[i + 1];
      i += 1;
    } else if (arg === "--iterations" || arg === "-n") {
      defaults.iterationLimit = toInt(argv[i + 1], defaults.iterationLimit);
      defaults.iterationsSet = true;
      i += 1;
    } else if (arg === "--preview" || arg === "-l") {
      defaults.previewLines = toInt(argv[i + 1], defaults.previewLines);
      i += 1;
    } else if (arg === "--parallel" || arg === "-P") {
      defaults.parallelAgents = toInt(argv[i + 1], defaults.parallelAgents);
      i += 1;
    } else if (arg === "--pause-ms") {
      defaults.pauseMs = toInt(argv[i + 1], defaults.pauseMs);
      i += 1;
    } else if (arg === "--command" || arg === "-c") {
      defaults.command = argv[i + 1];
      i += 1;
    } else if (arg === "--model" || arg === "-m") {
      defaults.model = argv[i + 1] ?? "";
      i += 1;
    } else if (arg === "--reasoning-effort") {
      const value = (argv[i + 1] ?? "").toLowerCase();
      if (value === "low" || value === "medium" || value === "high") {
        defaults.reasoningEffort = value;
      }
      i += 1;
    } else if (arg === "--yolo") {
      defaults.yolo = true;
    } else if (arg === "--no-yolo") {
      defaults.yolo = false;
    } else if (arg === "--log-dir") {
      defaults.logDir = argv[i + 1];
      i += 1;
    } else if (arg === "--show-raw") {
      defaults.showRaw = true;
    } else if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    }
  }

  return {
    promptPath,
    ...defaults,
  };
}

function printUsage() {
  console.log(`Usage:
  bun scripts/codex-beads-loop.ts [options]

Options:
  -p, --prompt <path>      Prompt file path. default: .ai_agents/prompt.md
  -n, --iterations <n>     Max loops. default: 50
                            Sets .ai_agents/iteration.json max_iterations.
  -l, --preview <n>        Number of recent jsonl messages to show. default: 3
  -P, --parallel <n>       Run n codex agents in parallel per iteration. default: 1
      --pause-ms <ms>      Pause between loops in milliseconds. default: 0
  -c, --command <cmd>      Base command to run. default: codex
  -m, --model <model>      Model passed to codex exec -m. default: gpt-5.3-codex-spark
      --reasoning-effort   low|medium|high for codex reasoning_effort config (default: high)
      --yolo               Pass --yolo to codex exec (default: on)
      --no-yolo            Disable --yolo
      --log-dir <path>     Directory for per-iteration logs. default: .ai_agents/logs/codex-loop
      --show-raw           Stream raw Codex JSONL/events to terminal (default: off)
  -h, --help               Show this help message

Notes:
  - Script runs codex as: exec --json --output-last-message <file> -
  - Prompt is piped through stdin each iteration.`);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return isObject(value);
}

function safeJsonParse(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function ensureDirectory(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function firstStringValue(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }
  if (Array.isArray(value)) {
    const combined = value
      .map((entry) => firstStringValue(entry))
      .filter(Boolean)
      .join("\n")
      .trim();
    return combined;
  }
  if (!isRecord(value)) {
    return "";
  }

  const keyPriority = ["text", "content", "output", "message", "data", "summary"];
  for (const key of keyPriority) {
    const nested = firstStringValue(value[key]);
    if (nested) {
      return nested;
    }
  }

  const merged = Object.values(value)
    .map((entry) => firstStringValue(entry))
    .filter(Boolean)
    .join(" ")
    .trim();
  return merged;
}

function formatShort(text: string, maxLength = 300): string {
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.length <= maxLength ? compact : `${compact.slice(0, maxLength)}...`;
}

function summarizeCommand(command: string): string {
  const compact = command.replace(/\s+/g, " ").trim();
  const commandMatch = compact.match(/-Command\s+(.+)$/i);
  if (commandMatch) {
    const extracted = commandMatch[1].trim().replace(/^['"]|['"]$/g, "");
    return formatShort(extracted, 140);
  }
  return formatShort(compact, 140);
}

function toJsonCandidates(line: string): unknown[] {
  const values: unknown[] = [];
  const direct = safeJsonParse(line);
  if (direct !== null) {
    values.push(direct);
    return values;
  }

  const start = line.indexOf("{");
  const end = line.lastIndexOf("}");
  if (start >= 0 && end > start) {
    const embedded = safeJsonParse(line.slice(start, end + 1));
    if (embedded !== null) {
      values.push(embedded);
    }
  }

  return values;
}

function extractCodexPreviewLine(event: Record<string, unknown>): PreviewEntry | null {
  const type = typeof event.type === "string" ? event.type : "";

  if (type === "item.started" || type === "item.completed" || type === "item.delta") {
    const item = isRecord(event.item) ? event.item : null;
    if (!item) {
      return null;
    }

    const itemType = typeof item.type === "string" ? item.type : "item";
    if (itemType === "agent_message") {
      const payload = firstStringValue(item.text ?? item.content ?? item.message);
      return payload ? { kind: "assistant", label: "assistant", text: formatShort(payload) } : null;
    }
    if (itemType === "reasoning") {
      const payload = firstStringValue(item.text ?? item.summary ?? item.content ?? item.message);
      return payload
        ? { kind: "reasoning", label: "reasoning", text: formatShort(payload, 200) }
        : null;
    }
    if (
      itemType === "command_execution" ||
      itemType.includes("tool") ||
      itemType.includes("call")
    ) {
      const commandText = firstStringValue(item.command ?? item.input ?? item.name);
      const status = typeof item.status === "string" ? item.status : "";
      const exitCode = typeof item.exit_code === "number" ? item.exit_code : null;
      if (!commandText) {
        return null;
      }
      const summarized = summarizeCommand(commandText);
      const statusPrefix = status ? `${status}: ` : type === "item.started" ? "in_progress: " : "";
      const suffix = exitCode === null ? "" : ` (exit ${exitCode})`;
      return {
        kind: "tool",
        label: "tool",
        text: `${statusPrefix}${summarized}${suffix}`,
      };
    }

    const fallbackItemText = firstStringValue(item);
    if (!fallbackItemText) {
      return null;
    }
    const fallbackKind: PreviewEntry["kind"] = itemType.includes("reason")
      ? "reasoning"
      : itemType.includes("error")
        ? "error"
        : "message";
    return { kind: fallbackKind, label: itemType, text: formatShort(fallbackItemText) };
  }

  if (type === "error") {
    const payload = firstStringValue(event.error ?? event.message ?? event);
    return payload ? { kind: "error", label: "error", text: formatShort(payload) } : null;
  }

  const genericPayload = firstStringValue(event.message ?? event.content ?? event.text);
  if (!genericPayload) {
    return null;
  }
  const label = type || "message";
  return {
    kind: label.includes("reason") ? "reasoning" : label.includes("error") ? "error" : "message",
    label,
    text: formatShort(genericPayload),
  };
}

function previewEntriesFromLine(line: string): PreviewEntry[] {
  const entries: PreviewEntry[] = [];
  const trimmed = line.trim();
  if (!trimmed) {
    return entries;
  }

  const values = toJsonCandidates(trimmed);
  for (const value of values) {
    if (Array.isArray(value)) {
      for (const nested of value) {
        if (!isRecord(nested)) {
          continue;
        }
        const entry = extractCodexPreviewLine(nested);
        if (entry) {
          entries.push(entry);
        }
      }
    } else if (isRecord(value)) {
      const entry = extractCodexPreviewLine(value);
      if (entry) {
        entries.push(entry);
      }
    }
  }
  return entries;
}

function collectMessages(output: string): PreviewEntry[] {
  const messages: PreviewEntry[] = [];
  const lines = output.split(/\r?\n/);
  for (const line of lines) {
    messages.push(...previewEntriesFromLine(line));
  }
  return messages;
}

function collectRawJsonLines(output: string, previewCount: number): string[] {
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => line.includes("{") || line.includes("}"));
  return lines.slice(-previewCount);
}

function selectPreviewEntries(lines: PreviewEntry[], previewCount: number): PreviewEntry[] {
  if (lines.length <= previewCount) {
    return lines;
  }

  const picked = new Set<number>();
  const desiredOrder: PreviewEntry["kind"][] = ["assistant", "tool", "reasoning", "error"];
  for (const kind of desiredOrder) {
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].kind === kind) {
        picked.add(i);
        break;
      }
    }
    if (picked.size >= previewCount) {
      break;
    }
  }

  for (let i = lines.length - 1; i >= 0 && picked.size < previewCount; i--) {
    picked.add(i);
  }

  return [...picked]
    .sort((a, b) => a - b)
    .map((index) => lines[index])
    .slice(-previewCount);
}

function printPreview(lines: PreviewEntry[], previewCount: number, contextLabel?: string): void {
  const preview = selectPreviewEntries(lines, previewCount);
  if (preview.length === 0) {
    console.log(`${badge("PREVIEW", "muted")} No message payloads found in this iteration.`);
    return;
  }
  const contextSuffix = contextLabel ? ` ${colorize(`(${contextLabel})`, ANSI.dim)}` : "";
  console.log(`${badge("PREVIEW", "info")} Recent activity (${preview.length}):${contextSuffix}`);
  const width = Math.max(40, terminalWidth() - 10);
  for (let i = 0; i < preview.length; i++) {
    const entry = preview[i];
    const tone = labelTone(entry.label);
    const header = `${i + 1}. ${badge(entry.label.toUpperCase(), tone)}`;
    console.log(header);
    const wrapped = wrapText(entry.text, width);
    for (const line of wrapped) {
      console.log(`   ${colorize(line, toneColor(tone))}`);
    }
  }
}

function extractUsageSummary(output: string): UsageSummary | null {
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  for (const line of lines) {
    const parsed = safeJsonParse(line);
    if (!isRecord(parsed)) {
      continue;
    }
    if (parsed.type !== "turn.completed") {
      continue;
    }
    if (!isRecord(parsed.usage)) {
      continue;
    }

    const usage = parsed.usage;
    const inputTokens = toPositiveNumber(usage.input_tokens) ?? 0;
    const cachedInputTokens = toPositiveNumber(usage.cached_input_tokens) ?? 0;
    const outputTokens = toPositiveNumber(usage.output_tokens) ?? 0;
    return { inputTokens, cachedInputTokens, outputTokens };
  }
  return null;
}

function printUsageSummary(usage: UsageSummary, contextLabel?: string): void {
  const contextSuffix = contextLabel ? ` ${colorize(`(${contextLabel})`, ANSI.dim)}` : "";
  console.log(
    `${badge("TOKENS", "muted")} in ${formatTokens(usage.inputTokens)} | cached ${formatTokens(
      usage.cachedInputTokens
    )} | out ${formatTokens(usage.outputTokens)}${contextSuffix}`
  );
}

function resolveCommandExecutable(command: string): string | null {
  if (!command) {
    return null;
  }

  const isWindows = process.platform === "win32";
  const pathExtEntries = (process.env.PATHEXT ?? ".COM;.EXE;.BAT;.CMD")
    .split(";")
    .map((entry) => entry.toLowerCase())
    .filter(Boolean);

  const resolveWindowsBase = (basePath: string): string | null => {
    const ext = path.extname(basePath).toLowerCase();
    if (ext) {
      return existsSync(basePath) ? basePath : null;
    }
    for (const extension of pathExtEntries) {
      const withExt = `${basePath}${extension}`;
      if (existsSync(withExt)) {
        return withExt;
      }
    }
    return existsSync(basePath) ? basePath : null;
  };

  if (path.isAbsolute(command) || command.includes(path.sep)) {
    const absolute = path.isAbsolute(command) ? command : path.resolve(process.cwd(), command);
    return isWindows ? resolveWindowsBase(absolute) : existsSync(absolute) ? absolute : null;
  }

  const pathEntries = (process.env.PATH ?? "")
    .split(path.delimiter)
    .map((entry) => entry.trim())
    .filter(Boolean);

  const ext = path.extname(command).toLowerCase();
  const extensions = isWindows ? (ext ? [ext] : pathExtEntries) : [""];

  for (const dir of pathEntries) {
    const base = path.join(dir, command);
    if (isWindows) {
      const resolved = resolveWindowsBase(base);
      if (resolved) {
        return resolved;
      }
      continue;
    }

    if (existsSync(base)) {
      return base;
    }
    for (const extension of extensions) {
      if (!extension) continue;
      const withExt = `${base}${extension}`;
      if (existsSync(withExt)) {
        return withExt;
      }
    }
  }

  return null;
}

function formatCommandHint(command: string): string {
  if (process.platform !== "win32") {
    return `make sure "${command}" is installed and available in PATH`;
  }
  return `on Windows, pass --command with a full path like "C:/Users/<user>/AppData/Local/pnpm/codex.CMD"`;
}

function resolveRunnableCommand(command: string): string {
  const resolved = resolveCommandExecutable(command);
  if (resolved) {
    return resolved;
  }

  if (path.isAbsolute(command) || command.includes(path.sep)) {
    throw new Error(`Command not found: "${command}"`);
  }

  if (process.platform === "win32") {
    throw new Error(`Unable to find command "${command}". ${formatCommandHint(command)}.`);
  }

  return command;
}

function buildCodexExecArgs(
  lastMessagePath: string,
  model: string,
  reasoningEffort: "low" | "medium" | "high",
  yolo: boolean
): string[] {
  const args = ["exec", "--json"];
  if (model.trim()) {
    args.push("-m", model.trim());
  }
  args.push("-c", `reasoning_effort="${reasoningEffort}"`);
  if (yolo) {
    args.push("--yolo");
  }
  args.push("--output-last-message", lastMessagePath, "-");
  return args;
}

function appendLogChunk(logPath: string, text: string): void {
  ensureDirectory(path.dirname(logPath));
  try {
    appendFileSync(logPath, text, "utf8");
  } catch (error) {
    const maybeErrno = error as NodeJS.ErrnoException;
    if (maybeErrno.code === "ENOENT") {
      ensureDirectory(path.dirname(logPath));
      appendFileSync(logPath, text, "utf8");
      return;
    }
    throw error;
  }
}

async function terminateChildProcess(child: ChildProcess): Promise<void> {
  const pid = child.pid;
  if (!pid) {
    return;
  }

  if (process.platform === "win32") {
    await new Promise<void>((resolve) => {
      const killer = spawn("taskkill", ["/PID", String(pid), "/T", "/F"], {
        stdio: "ignore",
      });
      killer.on("close", () => resolve());
      killer.on("error", () => {
        try {
          child.kill();
        } catch {
          // no-op
        }
        resolve();
      });
    });
    return;
  }

  try {
    child.kill("SIGTERM");
  } catch {
    return;
  }

  await sleep(300);
  if (!child.killed) {
    try {
      child.kill("SIGKILL");
    } catch {
      // no-op
    }
  }
}

function runCodex(
  prompt: string,
  command: string,
  args: string[],
  logPath: string,
  showRaw: boolean,
  onChildChange?: (child: ChildProcess | null) => void,
  onStdoutLine?: (line: string) => void
): Promise<StreamResult> {
  return new Promise((resolve, reject) => {
    let child: ChildProcess;
    try {
      child = spawn(command, args, {
        stdio: ["pipe", "pipe", "pipe"],
      });
      onChildChange?.(child);
    } catch (error) {
      onChildChange?.(null);
      reject(error);
      return;
    }

    let stdout = "";
    let stderr = "";
    let stdoutBuffer = "";
    let settled = false;

    const fail = (error: unknown) => {
      if (settled) {
        return;
      }
      settled = true;
      onChildChange?.(null);
      reject(error);
    };

    child.on("error", (error) => {
      const maybeErrno = error as NodeJS.ErrnoException;
      if (maybeErrno.code === "ENOENT") {
        fail(new Error(`Unable to spawn "${command}". ${formatCommandHint(command)}.`));
        return;
      }
      fail(error);
    });

    if (child.stdout) {
      child.stdout.on("data", (chunk) => {
        const text = chunk.toString();
        stdout += text;
        stdoutBuffer += text;
        try {
          appendLogChunk(logPath, text);
        } catch (error) {
          fail(error);
          return;
        }

        const lines = stdoutBuffer.split(/\r?\n/);
        stdoutBuffer = lines.pop() ?? "";
        for (const line of lines) {
          onStdoutLine?.(line);
        }

        if (showRaw) {
          process.stdout.write(text);
        }
      });
      child.stdout.on("end", () => {
        if (stdoutBuffer.trim().length > 0) {
          onStdoutLine?.(stdoutBuffer);
        }
        stdoutBuffer = "";
      });
    }

    if (child.stderr) {
      child.stderr.on("data", (chunk) => {
        const text = chunk.toString();
        stderr += text;
        try {
          appendLogChunk(logPath, text);
        } catch (error) {
          fail(error);
          return;
        }
        if (showRaw) {
          process.stderr.write(text);
        }
      });
    }

    child.on("close", (status) => {
      if (settled) {
        return;
      }
      settled = true;
      onChildChange?.(null);
      resolve({ status, stdout, stderr });
    });

    child.stdin?.write(prompt);
    child.stdin?.end();
  });
}

function resolveIterationStatePath(cwd: string): string {
  return path.resolve(cwd, ITERATION_STATE_PATH);
}

function normalizeIterationState(input: unknown, fallbackMax: number): IterationState {
  if (!isRecord(input)) {
    return { current_iteration: 0, max_iterations: fallbackMax };
  }

  const current = Number.parseInt(String(input.current_iteration ?? "0"), 10);
  const max = Number.parseInt(String(input.max_iterations ?? fallbackMax), 10);
  return {
    current_iteration: Number.isNaN(current) || current < 0 ? 0 : current,
    max_iterations: Number.isNaN(max) || max <= 0 ? fallbackMax : max,
  };
}

function writeIterationState(statePath: string, state: IterationState): void {
  ensureDirectory(path.dirname(statePath));
  writeFileSync(statePath, `${JSON.stringify(state)}\n`, "utf8");
}

function loadIterationState(
  statePath: string,
  fallbackMax: number,
  iterationsSet: boolean
): IterationState {
  if (!existsSync(statePath)) {
    const created: IterationState = { current_iteration: 0, max_iterations: fallbackMax };
    writeIterationState(statePath, created);
    return created;
  }

  const raw = readFileSync(statePath, "utf8");
  const parsed = safeJsonParse(raw);
  const state = normalizeIterationState(parsed, fallbackMax);
  if (iterationsSet) {
    state.max_iterations = fallbackMax;
  }
  if (state.max_iterations <= 0) {
    state.max_iterations = fallbackMax;
  }
  writeIterationState(statePath, state);
  return state;
}

function hasNoBeadsMarker(output: string): boolean {
  const normalized = output.toLowerCase();
  return normalized.includes("no beads available") || normalized.includes("no_beads_available");
}

function isCircuitBroken(state: IterationState): boolean {
  return state.current_iteration >= state.max_iterations;
}

function toPositiveNumber(value: unknown): number | null {
  const numeric = typeof value === "number" ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }
  return numeric;
}

function findRetrySeconds(value: unknown): number | null {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = findRetrySeconds(entry);
      if (found !== null) {
        return found;
      }
    }
    return null;
  }
  if (!isRecord(value)) {
    return null;
  }

  const numericKeys = ["resets_in_seconds", "reset_seconds", "retry_after_seconds"];
  for (const key of numericKeys) {
    const found = toPositiveNumber(value[key]);
    if (found !== null) {
      return found;
    }
  }

  for (const nested of Object.values(value)) {
    const found = findRetrySeconds(nested);
    if (found !== null) {
      return found;
    }
  }
  return null;
}

function extractRetryDelaySeconds(output: string): number | null {
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  for (const line of lines) {
    const parsed = safeJsonParse(line);
    const found = findRetrySeconds(parsed);
    if (found !== null) {
      return found;
    }
  }

  const secondMatch = output.match(/(?:try again|retry).{0,30}?(\d+)\s*(?:seconds?|secs?|s)\b/i);
  if (secondMatch) {
    return Number.parseInt(secondMatch[1], 10);
  }
  const minuteMatch = output.match(/(?:try again|retry).{0,30}?(\d+)\s*(?:minutes?|mins?|m)\b/i);
  if (minuteMatch) {
    return Number.parseInt(minuteMatch[1], 10) * 60;
  }
  return null;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function buildRunFileBase(iteration: number): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `iter-${String(iteration).padStart(3, "0")}-${stamp}`;
}

async function main() {
  const options = parseArgs();
  const promptPath = path.resolve(process.cwd(), options.promptPath);
  const statePath = resolveIterationStatePath(process.cwd());
  const logDir = path.resolve(process.cwd(), options.logDir);
  const command = resolveRunnableCommand(options.command);
  const activeChildren = new Set<ChildProcess>();
  let activeSpinnerStop: ((message: string, tone?: Tone) => void) | null = null;
  let shuttingDown = false;

  const onSignal = (signal: NodeJS.Signals) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    console.log();
    console.log(`${badge("SHUTDOWN", "warn")} received ${signal}, cleaning up...`);
    void (async () => {
      if (activeSpinnerStop) {
        activeSpinnerStop("cancelled", "warn");
        activeSpinnerStop = null;
      }
      if (activeChildren.size > 0) {
        const count = activeChildren.size;
        await Promise.all([...activeChildren].map((child) => terminateChildProcess(child)));
        activeChildren.clear();
        console.log(
          `${badge("CLEANUP", "success")} terminated ${count} running child process(es).`
        );
      }
      process.exit(signal === "SIGINT" ? 130 : 143);
    })();
  };

  process.on("SIGINT", onSignal);
  process.on("SIGTERM", onSignal);

  try {
    const state = loadIterationState(statePath, options.iterationLimit, options.iterationsSet);
    ensureDirectory(logDir);

    if (isCircuitBroken(state)) {
      console.log(`Circuit breaker hit: max_iterations (${state.max_iterations}) already reached.`);
      return;
    }

    if (!existsSync(promptPath)) {
      throw new Error(`Prompt file not found: ${promptPath}`);
    }

    printSection("Codex Beads Loop");
    console.log(`${badge("COMMAND", "neutral")} ${colorize(command, ANSI.bold)}`);
    console.log(`${badge("PROMPT", "neutral")} ${promptPath}`);
    console.log(`${badge("LOGS", "neutral")} ${logDir}`);
    console.log(`${badge("LIMIT", "neutral")} max iterations: ${state.max_iterations}`);
    console.log(
      `${badge("MODEL", "neutral")} ${options.model.trim() ? options.model.trim() : DEFAULT_MODEL}`
    );
    console.log(`${badge("EFFORT", "neutral")} reasoning_effort=${options.reasoningEffort}`);
    console.log(
      `${badge("PARALLEL", options.parallelAgents > 1 ? "warn" : "neutral")} ${options.parallelAgents}`
    );
    console.log(
      `${badge("YOLO", options.yolo ? "warn" : "muted")} ${options.yolo ? "enabled" : "disabled"}`
    );

    let stoppedByNoBeads = false;
    for (; state.current_iteration < state.max_iterations; ) {
      if (shuttingDown) {
        break;
      }

      const prompt = readFileSync(promptPath, "utf8");
      state.current_iteration += 1;
      writeIterationState(statePath, state);

      const iteration = state.current_iteration;
      const runs = Array.from({ length: options.parallelAgents }, (_, index) => {
        const agentId = index + 1;
        const runBase = `${buildRunFileBase(iteration)}-agent-${String(agentId).padStart(2, "0")}`;
        const jsonlLogPath = path.join(logDir, `${runBase}.jsonl`);
        const lastMessagePath = path.join(logDir, `${runBase}.last-message.txt`);
        const args = buildCodexExecArgs(
          lastMessagePath,
          options.model,
          options.reasoningEffort,
          options.yolo
        );
        return { agentId, jsonlLogPath, lastMessagePath, args };
      });

      const startedAt = new Date().toLocaleTimeString();
      console.log();
      console.log(
        `${badge("ITERATION", "info")} ${iteration}/${state.max_iterations} ${colorize(
          progressBar(iteration, state.max_iterations),
          ANSI.cyan
        )}`
      );
      console.log(`${badge("START", "muted")} ${startedAt}`);
      console.log(`${badge("RUN", "muted")} ${command} ${runs[0].args.join(" ")}`);
      console.log(`${badge("BATCH", "muted")} launching ${runs.length} parallel agent(s)`);
      for (const run of runs) {
        console.log(`${badge(`A${run.agentId}`, "muted")} ${run.jsonlLogPath}`);
      }
      if (options.showRaw) {
        console.log(`${badge("STREAM", "warn")} raw event stream enabled`);
      }

      const spinner = options.showRaw
        ? null
        : createSpinner(`running ${runs.length} codex agent(s) for iteration ${iteration}`);
      activeSpinnerStop = spinner?.stop ?? null;
      const liveSeen = new Set<string>();
      const liveCountByAgent = new Map<number, number>();

      let results: Array<{
        agentId: number;
        jsonlLogPath: string;
        lastMessagePath: string;
        result: StreamResult;
      }>;
      try {
        results = await Promise.all(
          runs.map(async (run) => {
            let trackedChild: ChildProcess | null = null;
            const result = await runCodex(
              prompt,
              command,
              run.args,
              run.jsonlLogPath,
              options.showRaw,
              (child) => {
                if (child) {
                  trackedChild = child;
                  activeChildren.add(child);
                } else if (trackedChild) {
                  activeChildren.delete(trackedChild);
                  trackedChild = null;
                }
              },
              (line) => {
                if (options.showRaw) {
                  return;
                }
                const liveEntries = previewEntriesFromLine(line).filter(
                  (entry) =>
                    entry.kind === "reasoning" ||
                    entry.kind === "tool" ||
                    entry.kind === "assistant" ||
                    entry.kind === "error"
                );
                for (const entry of liveEntries) {
                  const key = `${run.agentId}:${entry.kind}:${entry.text}`;
                  if (liveSeen.has(key)) {
                    continue;
                  }
                  liveSeen.add(key);
                  const count = (liveCountByAgent.get(run.agentId) ?? 0) + 1;
                  liveCountByAgent.set(run.agentId, count);
                  if (count > 20 && entry.kind !== "assistant" && entry.kind !== "error") {
                    continue;
                  }

                  if (process.stdout.isTTY) {
                    process.stdout.write("\r\x1b[2K");
                  }
                  const agentPrefix =
                    runs.length > 1 ? `${badge(`A${run.agentId}`, "muted")} ` : "";
                  const entryBadge = badge(entry.label.toUpperCase(), labelTone(entry.label));
                  console.log(
                    `${badge("LIVE", "info")} ${agentPrefix}${entryBadge} ${formatShort(entry.text, 180)}`
                  );
                }
              }
            );
            return {
              agentId: run.agentId,
              jsonlLogPath: run.jsonlLogPath,
              lastMessagePath: run.lastMessagePath,
              result,
            };
          })
        );

        const allSuccess = results.every((entry) => entry.result.status === 0);
        spinner?.stop(
          allSuccess ? "responses received" : "one or more processes exited",
          allSuccess ? "success" : "warn"
        );
      } catch (error) {
        spinner?.stop("spawn failed", "error");
        activeSpinnerStop = null;
        throw error;
      }
      activeSpinnerStop = null;

      const failed = results.filter((entry) => entry.result.status !== 0);
      if (failed.length > 0) {
        const retryDelays = failed
          .map((entry) =>
            extractRetryDelaySeconds(`${entry.result.stdout}\n${entry.result.stderr}`)
          )
          .filter((value): value is number => value !== null);
        if (retryDelays.length === failed.length && iteration < state.max_iterations) {
          const retrySeconds = Math.max(...retryDelays);
          console.log(
            `${badge("RETRY", "warn")} delay detected (${retrySeconds}s). Waiting before next iteration.`
          );
          await sleep(retrySeconds * 1000);
          continue;
        }

        for (const entry of failed) {
          const combined = `${entry.result.stdout}\n${entry.result.stderr}`.trim();
          console.log(
            `${badge(`A${entry.agentId}`, "error")} exited with status ${entry.result.status}.`
          );
          if (combined) {
            console.log(colorize(formatShort(combined, 600), ANSI.red));
          }
        }
        break;
      }

      let noBeadsDetected = false;
      for (const entry of results) {
        const combined = `${entry.result.stdout}\n${entry.result.stderr}`.trim();
        const context = runs.length > 1 ? `agent ${entry.agentId}` : undefined;
        const preview = collectMessages(combined);

        if (preview.length > 0) {
          printPreview(preview, options.previewLines, context);
        } else if (existsSync(entry.lastMessagePath)) {
          const lastMessage = readFileSync(entry.lastMessagePath, "utf8").trim();
          if (lastMessage) {
            printPreview(
              [{ kind: "assistant", label: "assistant", text: formatShort(lastMessage) }],
              options.previewLines,
              context
            );
          } else {
            printPreview([], options.previewLines, context);
          }
        } else {
          printPreview([], options.previewLines, context);
        }

        if (preview.length === 0) {
          const rawPreview = collectRawJsonLines(combined, options.previewLines);
          if (rawPreview.length > 0) {
            const suffix = context ? ` (${context})` : "";
            console.log(
              `${badge("FALLBACK", "warn")} JSONL preview fallback (raw lines):${suffix}`
            );
            for (const rawLine of rawPreview) {
              console.log(`- ${colorize(formatShort(rawLine, 200), ANSI.dim)}`);
            }
          }
        }

        const usage = extractUsageSummary(combined);
        if (usage) {
          printUsageSummary(usage, context);
        }

        const lastMessageOutput = existsSync(entry.lastMessagePath)
          ? readFileSync(entry.lastMessagePath, "utf8")
          : "";
        if (hasNoBeadsMarker(combined) || hasNoBeadsMarker(lastMessageOutput)) {
          noBeadsDetected = true;
        }
      }

      if (noBeadsDetected) {
        stoppedByNoBeads = true;
        console.log(`${badge("STOP", "success")} 'no beads available' detected.`);
        break;
      }

      if (state.current_iteration < state.max_iterations && options.pauseMs > 0) {
        console.log(`${badge("PAUSE", "muted")} waiting ${options.pauseMs}ms`);
        await sleep(options.pauseMs);
      }
    }

    if (!stoppedByNoBeads && isCircuitBroken(state)) {
      console.log(`${badge("CIRCUIT", "warn")} max_iterations (${state.max_iterations}) reached.`);
    }
  } finally {
    process.off("SIGINT", onSignal);
    process.off("SIGTERM", onSignal);
    if (activeChildren.size > 0) {
      await Promise.all([...activeChildren].map((child) => terminateChildProcess(child)));
      activeChildren.clear();
    }
    if (activeSpinnerStop) {
      activeSpinnerStop("stopped", "warn");
      activeSpinnerStop = null;
    }
  }
}

main().catch((error) => {
  console.error("codex loop failed:", error);
  process.exit(1);
});
