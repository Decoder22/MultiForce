import path from 'node:path';
import { platform, tmpdir } from 'node:os';
import fs from 'node:fs';
import { SfOrg, AuthOrgValues } from "./models";
import { sleep } from '@salesforce/kit';
import { AuthInfo, Connection, OAuth2Config, Org, SfdcUrl, SfError, WebOAuthServer } from '@salesforce/core';
import { OrgListUtil } from "./orgListUtil";
import isWsl from 'is-wsl';
import { execSync } from 'node:child_process';
import sfOrgUtils from "./sfOrgUtils";
// import common from "./common";
// import open, { apps, AppName } from 'open';

const SF_PATH = '/opt/homebrew/bin'

export async function getOrgList(): Promise<Org[]> {
    process.env['SF_DISABLE_LOG_FILE'] = 'true';

    const getAuthFileNames = async (): Promise<string[]> => {
        try {
          return ((await AuthInfo.listAllAuthorizations()) ?? []).map((auth) => auth.username);
        } catch (err) {
          console.error(err)
          throw err
        }
      };
    // try {
    //     const output = await runAppleScript(`do shell script "export PATH=$PATH:${SF_PATH}; sf org list --json"`);

    //     const orgs = JSON.parse(output);
    //     const flatOrgList = [...orgs.result.other,...orgs.result.sandboxes,...orgs.result.nonScratchOrgs,...orgs.result.devHubs,...orgs.result.scratchOrgs]
    //     const parsedOutput: Org[]  = []
    //     for(const org of flatOrgList){
    //         if(!parsedOutput.find((item) => item.alias === org.alias && item.username === org.username)){
    //         parsedOutput.push({ alias:org.alias, username:org.username})
    //         }
    //     };
    //     return parsedOutput;
    // } catch (error) {
    //     console.error("Error fetching org list:", error);
    //     return [];
    // }

    const metaConfigs = await OrgListUtil.readLocallyValidatedMetaConfigsGroupedByOrgType(
        await getAuthFileNames(),
        false
      );
      console.log(metaConfigs)

    // const authInfos = await AuthInfo.listAllAuthorizations();
    // const orgs = authInfos.map((authInfo) => {
    //   const {username, orgId } = authInfo;
    //   return {
    //     alias: username,
    //     username,
    //     orgId,
    //   };
    // });
    // console.log(orgs);
    return []
}

// export async function executeLoginFlow(oauthConfig: OAuth2Config, browser?: string): Promise<AuthInfo> {
//   const oauthServer = await WebOAuthServer.create({ oauthConfig });
//   await oauthServer.start();
//   const app = browser && browser in apps ? (browser as AppName) : undefined;
//   const openOptions = app ? { app: { name: apps[app] }, wait: false } : { wait: false };
//   await open(oauthServer.getAuthorizationUrl(), openOptions);
//   return oauthServer.authorizeAndSave();
// }


export async function authorizeOrg(toAuth: AuthOrgValues) {
    let script = `do shell script "export PATH=$PATH:${SF_PATH}; `;
    if(toAuth.type === ' dev'){
        script += `sf org login web --set-default-dev-hub --alias ${toAuth.alias};"`
    }
    else {
        script += `sf org login web --alias ${toAuth.alias} --instance-url ${toAuth.url};"`
    }
    console.log(script)
    // return runAppleScript(script);
 /*
    const oauthConfig: OAuth2Config = {
      loginUrl: await common.resolveLoginUrl(toAuth.url)
    };
    

    try {
      const authInfo = await executeLoginFlow(oauthConfig, 'chrome');
      await authInfo.handleAliasAndDefaultSettings({
        alias: toAuth.alias,
        setDefault: false,
        setDefaultDevHub: false,
      });
      const fields = authInfo.getFields(true);
      await AuthInfo.identifyPossibleScratchOrgs(fields, authInfo);

      console.log('SUCCESS')
      return fields;
    } catch (err) {
      console.error(err)
    }
      */
}



export async function openOrg(orgAlias: string) {

  process.env['SF_DISABLE_LOG_FILE'] = 'true';

  const getFileContents = (
    authToken: string,
    instanceUrl: string,
    // we have to defalt this to get to Setup only on the POST version.  GET goes to Setup automatically
    retUrl = '/lightning/setup/SetupOneHome/home'
  ): string => `
  <html>
    <body onload="document.body.firstElementChild.submit()">
      <form method="POST" action="${instanceUrl}/secur/frontdoor.jsp">
        <input type="hidden" name="sid" value="${authToken}" />
        <input type="hidden" name="retURL" value="${retUrl}" /> 
      </form>
    </body>
  </html>`;

  const fileCleanup = (tempFilePath: string): void =>
    fs.rmSync(tempFilePath, { force: true, maxRetries: 3, recursive: true });
      
  const buildFrontdoorUrl = async (org: Org, conn: Connection): Promise<string> => {
    await org.refreshAuth(); // we need a live accessToken for the frontdoor url
    const accessToken = conn.accessToken;
    const instanceUrl = org.getField<string>(Org.Fields.INSTANCE_URL);
    const instanceUrlClean = instanceUrl.replace(/\/$/, '');
    return `${instanceUrlClean}/secur/frontdoor.jsp?sid=${accessToken}`;
  };
  try{
    const targetOrg = (await Org.create({ aliasOrUsername: orgAlias }))
    const conn = targetOrg.getConnection();
    // const env = new Env();
    const [frontDoorUrl, retUrl] = await Promise.all([
      buildFrontdoorUrl(targetOrg, conn),'lightning/setup/FlexiPageList/home'
    ]);

    const url = `${frontDoorUrl}${retUrl ? `&retURL=${retUrl}` : ''}`;

    // const orgId = targetOrg.getOrgId();

    // const username = targetOrg.getUsername() as string;
    
    await new SfdcUrl(url).checkLightningDomain();
    
     // create a local html file that contains the POST stuff.
    const tempFilePath = path.join(tmpdir(), `org-open-${new Date().valueOf()}.html`);
    await fs.promises.writeFile(
      tempFilePath,
      getFileContents(
        conn.accessToken as string,
        conn.instanceUrl,
        // the path flag is URI-encoded in its `parse` func.
        // For the form redirect to work we need it decoded.
        retUrl
      )
    );

    const filePathUrl = isWsl
      ? 'file:///' + execSync(`wslpath -m ${tempFilePath}`).toString().trim()
      : `file:///${tempFilePath}`;
    const cp = await sfOrgUtils.openUrl(filePathUrl, {
      ...{},
      ...{},
    });
    cp.on('error', (err) => {
      fileCleanup(tempFilePath);
      throw SfError.wrap(err);
    });
    // so we don't delete the file while the browser is still using it
    // open returns when the CP is spawned, but there's not way to know if the browser is still using the file
    await sleep(platform() === 'win32' || isWsl ? 7000 : 5000);
    fileCleanup(tempFilePath);

    }
    catch (err){
      console.error(err)
    }
}