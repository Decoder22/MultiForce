import { Action, ActionPanel, Detail, Keyboard } from "@raycast/api";
import { AuthenticateNewOrg } from "./AuthenticateNewOrg";
import { useMultiForceContext } from "../providers/OrgListProvider";

export function EmptyOrgList() {
  const markdown =
    "# Welcome to MultiForce!\nYour easy tool for logging in to your Salesforce orgs!\n\nIt doesn't look like you have added any orgs yet. Press **Enter** to authenticate your first org!";
    const {dispatch} = useMultiForceContext()
    
  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.Push
            title="Authenticate a New Org"
            target={<AuthenticateNewOrg dispatch={dispatch} />}
            shortcut={Keyboard.Shortcut.Common.New}
          />
        </ActionPanel>
      }
    />
  );
}
