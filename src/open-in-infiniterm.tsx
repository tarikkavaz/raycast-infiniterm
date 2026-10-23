import { Action, ActionPanel, Form, Icon, List, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { basename } from "node:path";
import { getFinderDirs } from "./lib/finder.ts";
import { listWorkspaces, openFolders } from "./lib/ift.ts";

function NewWorkspaceForm({ dirs }: { dirs: string[] }) {
  const { pop } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Open in New Workspace"
            onSubmit={async (values: { name: string }) => {
              pop();
              await openFolders(dirs, "new", values.name);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Workspace Name" placeholder="Optional" />
    </Form>
  );
}

export default function Command() {
  const { data: dirs, isLoading: dirsLoading } = useCachedPromise(getFinderDirs, [], { keepPreviousData: false });
  // Fails when the app is not running or predates `ift workspaces`; the list then offers the current workspace only.
  const {
    data: workspaces,
    isLoading: wsLoading,
    error,
  } = useCachedPromise(listWorkspaces, [], { keepPreviousData: false });

  const folders = dirs ?? [];
  const label = folders.length === 1 ? basename(folders[0]) || folders[0] : `${folders.length} folders`;
  const ready = folders.length > 0;

  return (
    <List isLoading={dirsLoading || wsLoading} navigationTitle={ready ? `Open ${label}` : "Open in infiniterm"}>
      {ready && (
        <List.Section title={`Open ${label} in`} subtitle={folders.length === 1 ? folders[0] : undefined}>
          {!error && !wsLoading && (
            <List.Item
              icon={Icon.PlusCircle}
              title="New Workspace"
              actions={
                <ActionPanel>
                  <Action
                    title="Open in New Workspace"
                    icon={Icon.PlusCircle}
                    onAction={() => openFolders(folders, "new")}
                  />
                  <Action.Push
                    title="Open in Named New Workspace…"
                    icon={Icon.Pencil}
                    target={<NewWorkspaceForm dirs={folders} />}
                  />
                </ActionPanel>
              }
            />
          )}
          {error && (
            <List.Item
              icon={Icon.Window}
              title="Current Workspace"
              subtitle="Workspace list unavailable"
              accessories={[{ text: error.message }]}
              actions={
                <ActionPanel>
                  <Action title="Open in Current Workspace" onAction={() => openFolders(folders)} />
                </ActionPanel>
              }
            />
          )}
          {(workspaces ?? []).map((w) => (
            <List.Item
              key={w.id}
              icon={w.active ? Icon.CircleFilled : Icon.Circle}
              title={w.name || w.id}
              accessories={[
                { text: `${w.cards} ${w.cards === 1 ? "card" : "cards"}` },
                ...(w.active ? [{ tag: "Active" }] : []),
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Open in This Workspace"
                    icon={Icon.Window}
                    onAction={() => openFolders(folders, w.id)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
