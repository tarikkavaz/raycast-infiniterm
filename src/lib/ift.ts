import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { closeMainWindow, getPreferenceValues, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { parseWorkspaces, terminalArgs, type Workspace } from "./parse.ts";

const run = promisify(execFile);

// `ift terminal` may start the app first and waits up to 30s for it.
const LAUNCH_TIMEOUT_MS = 40_000;

function iftPath(): string {
  const { iftPath } = getPreferenceValues<{ iftPath?: string }>();
  return iftPath?.trim() || "/opt/homebrew/bin/ift";
}

// ift prints "ift: <reason>" on stderr; show that, not Node's "Command failed" wrapper.
function reason(e: unknown): Error {
  const stderr = (e as { stderr?: string }).stderr?.trim();
  return new Error(stderr || (e instanceof Error ? e.message : String(e)));
}

async function ift(args: string[], timeout = 10_000): Promise<string> {
  try {
    return (await run(iftPath(), args, { timeout })).stdout;
  } catch (e) {
    throw reason(e);
  }
}

// An ift without the verb treats `ift workspaces` as a path and opens an editor card for it,
// so ask the help text (local, no side effects) before sending it.
async function supportsWorkspaces(): Promise<boolean> {
  try {
    return /^\s*ift workspaces\b/m.test(await ift(["--help"]));
  } catch {
    return false;
  }
}

// Fails when the app is not running or is too old to know the verb.
export async function listWorkspaces(): Promise<Workspace[]> {
  if (!(await supportsWorkspaces())) throw new Error("This ift has no `workspaces` verb yet");
  return parseWorkspaces(await ift(["workspaces"]));
}

async function appIsRunning(): Promise<boolean> {
  try {
    await ift(["ls"]);
    return true;
  } catch {
    return false;
  }
}

// Only `ift terminal` starts the app itself; `ift -n` and `ift diff` fail when it is closed.
// Bare `ift` launches it (or focuses it), then wait for its socket.
async function ensureRunning(): Promise<void> {
  if (await appIsRunning()) return;
  await ift([]);
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (await appIsRunning()) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("infiniterm did not start");
}

// The window closes first so a slow app start never leaves Raycast hanging; the result comes back as a HUD or toast.
async function perform(hud: string, failTitle: string, action: () => Promise<void>): Promise<void> {
  await closeMainWindow({ clearRootSearch: true });
  try {
    await action();
    await showHUD(hud);
  } catch (e) {
    await showFailureToast(e, { title: failTitle });
  }
}

export async function openFolders(dirs: string[], workspace?: string, name?: string): Promise<void> {
  await perform(
    dirs.length === 1 ? "Opened in infiniterm" : `Opened ${dirs.length} folders in infiniterm`,
    "Could not open in infiniterm",
    async () => {
      // An ift before the workspace flags reads `--` as a directory, so send it only to one that has them.
      const newIft = await supportsWorkspaces();
      await ift(terminalArgs(dirs, workspace, name, newIft), LAUNCH_TIMEOUT_MS);
    },
  );
}

// Each file in an editor card of its own; `-n` returns at once instead of waiting for the card to close.
export async function openFiles(paths: string[]): Promise<void> {
  await perform(
    paths.length === 1 ? "Opened file in infiniterm" : `Opened ${paths.length} files in infiniterm`,
    "Could not open in infiniterm",
    async () => {
      await ensureRunning();
      for (const p of paths) await ift(["-n", p]);
    },
  );
}

// Changes against git HEAD as a card; a file or a directory.
export async function openDiffs(paths: string[]): Promise<void> {
  await perform("Opened diff in infiniterm", "Could not open diff in infiniterm", async () => {
    await ensureRunning();
    for (const p of paths) await ift(["diff", p]);
  });
}
