import { Action, ActionPanel, Color, Form, Icon, List, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { listCards, sendToCard } from "./lib/ift.ts";
import type { Card } from "./lib/parse.ts";

const STATE_COLORS: Record<string, Color> = {
  working: Color.Purple,
  waiting: Color.Yellow,
  failed: Color.Red,
  done: Color.Green,
};

function SendForm({ card }: { card: Card }) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle={`Send to #${card.number}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Send"
            icon={Icon.Terminal}
            onSubmit={async (values: { text: string; enter: boolean }) => {
              pop();
              await sendToCard(card, values.text, values.enter);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Card" text={`#${card.number}  ${card.cwd}`} />
      <Form.TextArea id="text" title="Text" placeholder="A command or any text" />
      <Form.Checkbox id="enter" label="Press Enter after the text" defaultValue={true} />
    </Form>
  );
}

export default function Command() {
  const { data, isLoading, error } = useCachedPromise(listCards, [], { keepPreviousData: false });
  const cards = [...(data ?? [])].sort((a, b) => a.number - b.number);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter cards by directory or number">
      {error && (
        <List.EmptyView icon={Icon.ExclamationMark} title="infiniterm is not reachable" description={error.message} />
      )}
      {cards.map((c) => (
        <List.Item
          key={c.id}
          icon={Icon.Terminal}
          title={c.cwd}
          subtitle={`#${c.number}`}
          keywords={[String(c.number), `#${c.number}`, c.state, ...(c.remote ? [c.remote] : [])]}
          accessories={[
            ...(c.remote ? [{ text: c.remote }] : []),
            ...(STATE_COLORS[c.state] ? [{ tag: { value: c.state, color: STATE_COLORS[c.state] } }] : []),
          ]}
          actions={
            <ActionPanel>
              <Action.Push title="Send Text…" icon={Icon.Terminal} target={<SendForm card={c} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
