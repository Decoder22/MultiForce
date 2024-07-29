import { Action, ActionPanel, Detail } from "@raycast/api";
import { AuthenticateNewOrg } from "./AuthenticateNewOrg";
import { saveOrgs } from "../utils/storage-management";
import { DeveloperOrg } from "../models/models";

export function EmptyOrgList() {
  const markdown =
    "# Welcome to MultiForce!\nYour easy tool for logging in to your Salesforce orgs!\n\nIt doesn't look like you have added any orgs yet. Press **Enter** to authenticate your first org!";

  const addOrg = async (org: DeveloperOrg) => {
    console.log("Added Org");
    try {
      saveOrgs([org]);
    } catch (ex) {
      console.error(ex);
    }
  };

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.Push
            title="Authenticate a New Org"
            target={<AuthenticateNewOrg addOrg={addOrg} />}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
        </ActionPanel>
      }
    />
  );
}
