// Pure parsing of `ift workspaces` output, kept import-free so node --test can run it.

export type Workspace = {
  id: string;
  name: string;
  cards: number;
  active: boolean;
};

// Piped output is tab separated with no header: id, name, cards, active ("*" or "-").
export function parseWorkspaces(output: string): Workspace[] {
  const rows: Workspace[] = [];
  for (const line of output.split("\n")) {
    if (!line.trim()) continue;
    const [id, name, cards, active] = line.split("\t");
    if (!id || name === undefined) continue;
    rows.push({ id, name, cards: Number.parseInt(cards ?? "0", 10) || 0, active: active?.trim() === "*" });
  }
  return rows;
}

// Argument vector for `ift terminal`. `--` ends the flags; pass undefined for an ift that predates them.
// `workspace` is a workspace id or the word "new"; `name` only applies to "new".
export function terminalArgs(dirs: string[], workspace?: string, name?: string, endFlags = true): string[] {
  const args = ["terminal"];
  if (workspace) args.push("--workspace", workspace);
  if (workspace === "new" && name?.trim()) args.push("--name", name.trim());
  if (endFlags) args.push("--");
  args.push(...dirs);
  return args;
}
