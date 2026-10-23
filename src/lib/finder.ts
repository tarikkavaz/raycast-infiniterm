import { statSync } from "node:fs";
import { dirname } from "node:path";
import { getSelectedFinderItems } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

function asDir(path: string): string {
  try {
    return statSync(path).isDirectory() ? path : dirname(path);
  } catch {
    return dirname(path);
  }
}

// The folders to open: the Finder selection (a selected file contributes its folder),
// else the folder of the front Finder window, else the Desktop.
export async function getFinderDirs(): Promise<string[]> {
  try {
    const items = await getSelectedFinderItems();
    const dirs = [...new Set(items.map((i) => asDir(i.path)))];
    if (dirs.length > 0) return dirs;
  } catch {
    // Finder is not frontmost or nothing is selected: use the window below.
  }
  const front = await runAppleScript(`
    tell application "Finder"
      if (count of Finder windows) > 0 then
        return POSIX path of (target of front Finder window as alias)
      end if
      return POSIX path of (path to desktop folder)
    end tell
  `);
  return [front.replace(/\/$/, "") || "/"];
}
