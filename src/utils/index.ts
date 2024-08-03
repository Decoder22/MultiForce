import { deduplicateList, combineOrgList, orgListsAreDifferent } from "./orgUtility";
import { getOrgList, authorizeOrg, openOrg, deleteOrg } from "./salesforceUtility";
import { loadOrgs, saveOrgs, updateOrg } from "./storageUtility"

export {
    deduplicateList,
    combineOrgList,
    orgListsAreDifferent,
    getOrgList,
    authorizeOrg,
    openOrg,
    deleteOrg,
    loadOrgs,
    saveOrgs,
    updateOrg
}