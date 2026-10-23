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

// An ift without the verb treats `ift workspaces` as a path and opens an editor card for it,
// so ask the help text (local, no side effects) before sending it.
async function supportsWorkspaces(): Promise<boolean> {
  try {
    const { stdout } = await run(iftPath(), ["--help"], { timeout: 10_000 });
    return /^\s*ift workspaces\b/m.test(stdout);
  } catch {
    return false;
  }
}

// Fails when the app is not running or is too old to know the verb.
export async function listWorkspaces(): Promise<Workspace[]> {
  if (!(await supportsWorkspaces())) throw new Error("This ift has no `workspaces` verb yet");
  try {
    const { stdout } = await run(iftPath(), ["workspaces"], { timeout: 10_000 });
    return parseWorkspaces(stdout);
  } catch (e) {
    throw reason(e);
  }
}

export async function openFolders(dirs: string[], workspace?: string, name?: string): Promise<void> {
  await closeMainWindow({ clearRootSearch: true });
  try {
    // An ift before the workspace flags reads `--` as a directory, so send it only to one that has them.
    const newIft = await supportsWorkspaces();
    await run(iftPath(), terminalArgs(dirs, workspace, name, newIft), { timeout: LAUNCH_TIMEOUT_MS });
    await showHUD(dirs.length === 1 ? "Opened in infiniterm" : `Opened ${dirs.length} folders in infiniterm`);
  } catch (e) {
    await showFailureToast(reason(e), { title: "Could not open in infiniterm" });
  }
}
