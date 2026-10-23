import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { homedir } from "node:os";
import { basename } from "node:path";
import { WorkspacePicker } from "./components/workspace-picker.tsx";
import { openFolders } from "./lib/ift.ts";

// `ift terminal` needs a directory, so ask for one (home by default), then which workspace.
export default function Command() {
  const { push } = useNavigation();
  const pick = (values: { dir: string[] }) => values.dir[0] ?? homedir();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Choose Workspace"
            icon={Icon.ArrowRight}
            onSubmit={(values: { dir: string[] }) => {
              const dir = pick(values);
              push(<WorkspacePicker dirs={[dir]} title={basename(dir) || dir} />);
            }}
          />
          <Action.SubmitForm
            title="Open in Current Workspace"
            icon={Icon.Window}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
            onSubmit={(values: { dir: string[] }) => openFolders([pick(values)])}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="dir"
        title="Directory"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        defaultValue={[homedir()]}
      />
    </Form>
  );
}
