import { useState, useEffect } from "react";
import { List, ActionPanel, Action, showToast, Toast, popToRoot, Keyboard, Icon, confirmAlert } from "@raycast/api";
import { AuthenticateNewOrg } from "./components/AuthenticateNewOrg";
import { DeveloperOrg } from "./models/models";
import { openOrg, getOrgList, deleteOrg } from "./utils/sf";
import { loadOrgs, saveOrgs } from "./utils/storage-management";
import { EmptyOrgList } from "./components/EmptyOrgList";
import { DeveloperOrgDetails } from "./components/DeveloperOrgDetails";
import { MISC_ORGS_SECTION_LABEL } from "./utils/constants";
export default function Command() {
  const [orgs, setOrgs] = useState<Map<string, DeveloperOrg[]>>(new Map<string, DeveloperOrg[]>());
  const [isLoading, setIsLoading] = useState(true);

  const groupOrgs = (orgs: DeveloperOrg[]) => {
    const orgMap = new Map<string, DeveloperOrg[]>();
    for (const org of orgs) {
      const section = org.section ?? MISC_ORGS_SECTION_LABEL;
      if (!orgMap.has(section)) {
        orgMap.set(section, []);
      }
      orgMap.get(section)!.push(org);
    }
    return orgMap;
  };

  useEffect(() => {
    async function checkStorage() {
      console.log("Initializing App");
      const storedOrgs = await loadOrgs();
      if (storedOrgs) {
        console.log("Has Orgs");
        setOrgs(groupOrgs(storedOrgs));
      } else {
        refreshOrgs();
      }
      setIsLoading(false);
    }
    checkStorage();
  }, []);

  const handleOrgSelection = async (orgAlias: string) => {
    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Opening ${orgAlias}`,
    });
    try {
      await openOrg(orgAlias);
      setIsLoading(false);
      toast.hide();
      popToRoot();
    } catch (error) {
      console.error(error);
    }
  };

  const refreshOrgs = async (shouldShowToast: boolean = true) => {
    setIsLoading(true);
    let toast;
    if (shouldShowToast) {
      toast = await showToast({
        style: Toast.Style.Animated,
        title: "Refreshing your orgs.",
      });
    }

    const flatOrgs = Array.from(orgs.values()).flat();

    // Fetch the new list of orgs
    const newOrgs = await getOrgList();

    // Create a map from the new orgs for quick lookup
    const newOrgsMap = new Map(newOrgs.map((org) => [org.username, org]));

    // Filter the existing orgs to include only those that exist in the new list
    const updatedOrgs = flatOrgs.filter((org) => newOrgsMap.has(org.username));

    // Merge the existing org fields with the new org fields
    const mergedOrgs = updatedOrgs.map((org) => ({
      ...org,
      ...newOrgsMap.get(org.username),
    }));

    // Add new orgs that are not present in the existing list
    const additionalOrgs = newOrgs.filter(
      (org) => !flatOrgs.some((existingOrg) => existingOrg.username === org.username),
    );

    // Combine merged orgs and additional new orgs
    const combinedOrgs = [...mergedOrgs, ...additionalOrgs];

    // Sort the combined list by alias
    combinedOrgs.sort((a, b) => a.alias.localeCompare(b.alias));

    // Update the orgs state
    setOrgs(groupOrgs(combinedOrgs));
    saveOrgs(combinedOrgs);
    setIsLoading(false);
    if (shouldShowToast) {
      toast!.hide();
    }
  };


  const confirmDeletion = async (org:DeveloperOrg) => {
    if(await confirmAlert({
      title: `Are you sure you want to delete ${org.alias}?`,
    })){
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: `Deleting ${org.alias}`,
      });
      await deleteOrg(org.username);
      await refreshOrgs(false)
      toast.hide();
    }
  }

  return Array.from(orgs.keys()).length === 0 && !isLoading ? (
    <EmptyOrgList callback={refreshOrgs} />
  ) : (
    <List isLoading={isLoading}>
      {Array.from(orgs.keys())
        .sort()
        .map((key, keyIndex) =>
          orgs.get(key) && orgs.get(key)!.length > 0 ? (
            <List.Section title={key} key={keyIndex}>
              {orgs.get(key)!.map((org, index) => (
                <List.Item
                  key={index}
                  icon={{ source: "Salesforce.com_logo.svg.png", tintColor: org.color ?? "#0000FF" }}
                  title={org.label ? `${org.label} (${org.alias})` : org.alias}
                  actions={
                    <ActionPanel>
                      <Action title="Open" onAction={() => handleOrgSelection(org.alias)} />
                      <Action.Push
                        title="Open Details"
                        target={<DeveloperOrgDetails org={org} callback={refreshOrgs} />}
                        shortcut={{ modifiers: ["cmd"], key: "return" }}
                      />
                      <Action
                        title="Refresh Org List"
                        onAction={() => refreshOrgs()}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                      />
                      <Action.Push
                        title="Authenticate a New Org"
                        target={<AuthenticateNewOrg callback={refreshOrgs} />}
                        shortcut={{ modifiers: ["cmd"], key: "n" }}
                      />
                      <Action
                        title="Delete Org"
                        style={Action.Style.Destructive}
                        onAction={() => confirmDeletion(org)}
                        icon={{ source: Icon.Trash }}
                        shortcut={Keyboard.Shortcut.Common.Remove}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          ) : null,
        )}
    </List>
  );
}

/*

*/
