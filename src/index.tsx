import { useState, useEffect } from 'react';
import { List, ActionPanel, Action, Form, showToast, Toast, popToRoot } from '@raycast/api';
import { getOrgList, openOrg, authorizeOrg } from './sf';
import { Org, AuthOrgValues } from "./models";
import { loadOrgs, saveOrgs } from './storage-management';



export default function Command() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [isLoading, setIsLoading] = useState(true)
  // const [isMissingSfPath, setIsMissingSfPath] = useState(false)

  // const setSFPath = (path:string) => {

  //   console.log("onSubmit", path);
  // }

  useEffect(() => {
    async function checkStorage(){
      console.log('Initializing App')
      const storedOrgs = await loadOrgs()
      if(storedOrgs){
        console.log('Has Orgs')
        setOrgs(storedOrgs)
      }
      else{
        console.log('Has homebrew path but no orgs')
        refreshOrgs()
      }
      // else {
      //   console.log('Has no store or Homebrew path')
      //   setIsMissingSfPath(true)
      //   //Prompt for homebrew path
      // }
      setIsLoading(false)
    }
    checkStorage()
  }, []);

  const handleOrgSelection = async (orgAlias: string) => {
    setIsLoading(true)
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Opening ${orgAlias}`
    });
    await openOrg(orgAlias)
    setIsLoading(false)
    toast.hide()
    popToRoot()
  }

  const refreshOrgs = async () => {
    setIsLoading(true)
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Refreshing your orgs."
    });
    const newOrgs = await getOrgList()
    // Create a set of usernames that already exist in orgs
    const existingUsernames = new Set(orgs.map(org => org.username));

    // Filter out newOrgs that have usernames already in orgs
    const uniqueNewOrgs = newOrgs.filter(org => !existingUsernames.has(org.username));

    // Add the unique newOrgs to orgs
    const newOrgsUnique = [...orgs, ...uniqueNewOrgs];
    //
    newOrgsUnique.sort((a, b) => a.alias.localeCompare(b.alias));
    setOrgs(newOrgsUnique)
    saveOrgs(newOrgsUnique)
    setIsLoading(false)
    toast.hide()
  }


  return (
    // isMissingSfPath ? 
    // <Form
    //   actions={
    //     <ActionPanel>
    //       <Action.SubmitForm title="Submit Path" onSubmit={(values) => console.log(values)} />
    //     </ActionPanel>
    //   }
    // >
    //   <Form.TextField id="sfPath" title="Path to SF Command" />
    // </Form> :
    <List isLoading={isLoading}>
      {orgs.map((org, index) => (
        <List.Item
          key={index}
          icon="list-icon.png"
          title={org.alias ? `${org.alias} (${org.username})` : org.username}
          actions={
            <ActionPanel>
              <Action title="Open" onAction={() => handleOrgSelection(org.alias)} />
              <Action title="Refresh Org List" onAction={() => refreshOrgs()} shortcut={{ modifiers: ["cmd"], key: "r" }}/>
              <Action.Push title="Authenticate to a New Org" target={<Pong />} shortcut={{ modifiers: ["cmd"], key: "n" }} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function Pong() {

  const [orgType, setOrgType] = useState<string>();

  return (
    <Form 
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={(values: AuthOrgValues) => {
              if(values.type === 'sandbox'){
                values.url = 'test.salesforce.com'
              }
              else if(values.type === 'prod'){
                values.url = 'login.salesforce.com'
              }
              console.log("onSubmit", values);
              authorizeOrg(values).then(() => {
                console.log('done')
                popToRoot();
              })
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Authenticating a New Salesforce Org"
        text="Choose the org type, an org alias, and label. When you hit submit, your browser should open. "
      />
      <Form.Dropdown id="type" title="Org Type" onChange={(option) => setOrgType(option)}>
      <Form.Dropdown.Item value="sandbox" title="Sandbox" icon="🏝️" />
        <Form.Dropdown.Item value="custom" title="Custom" icon="🚀" />
        <Form.Dropdown.Item value="prod" title="Production" icon="💼" />
        <Form.Dropdown.Item value="dev" title="Developer Hub" icon="💻" />
      </Form.Dropdown>
      {orgType === 'custom' ? (<Form.TextField id="url" title='Custom URL' defaultValue="" />) : <></> }
      <Form.TextField id="alias" title='Org Alias' />
      <Form.TextField id="label" title="Label" />
    </Form>
    );
}