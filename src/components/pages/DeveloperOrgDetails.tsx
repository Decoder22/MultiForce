import { Form } from "@raycast/api";
import { loadOrgs, updateOrg } from "../../utils";
import { Dispatch, useEffect, useState } from "react";
import { MISC_ORGS_SECTION_LABEL, NEW_SECTION_LABEL, HEX_REGEX } from "../../constants";
import { OrgListReducerAction, OrgListReducerType, DeveloperOrg } from "../../types";

export function DeveloperOrgDetails(props: {
  org: DeveloperOrg,
  dispatch: Dispatch<OrgListReducerAction>
}) {

  const {org, dispatch} = props
  
  const [label, setLabel] = useState<string>(org.label ?? "");
  const [colorError, setColorError] = useState<string>();
  const [color, setColor] = useState<string>(org.color ?? "#0000FF");
  const [section, setSection] = useState<string>();
  const [showNewSelection, setShowNewSelection] = useState<boolean>(false);
  const [showNewSelectionError, setShowNewSelectionError] = useState<string>();
  const [sections, setSections] = useState<string[]>([]);

  useEffect(() => {
    async function getSectionList() {
      const storedOrgs = await loadOrgs();
      const sects = new Set<string>();
      if (storedOrgs) {
        for (const org of storedOrgs!) {
          if (org.section) sects.add(org.section);
        }
        setSections([MISC_ORGS_SECTION_LABEL, ...Array.from(sects), NEW_SECTION_LABEL]);
        setSection(org.section ?? MISC_ORGS_SECTION_LABEL);
      }
    }
    getSectionList();
  }, []);

  const handleLabelChange = async (lbl: string) => {
    if (lbl !== org.label) {
      org.label = lbl;
      setLabel(lbl);
      await updateOrg(org);
      dispatch({
        type: OrgListReducerType.UPDATE_ORG,
        updatedOrg: org 
      })
    }
  };

  const handleColorChange = async (clr: string) => {
    if (clr != org.color) {
      if (HEX_REGEX.test(clr)) {
        setColorError(undefined);
        (org.color = clr), setColor(clr);
        await updateOrg(org);
        dispatch({
          type: OrgListReducerType.UPDATE_ORG,
          updatedOrg: org 
        })
      } else {
        setColor(clr);
        setColorError("Color must be a valid HEX Color. For example #0000FF for blue.");
      }
    }
  };

  const handleSectionChange = async (sect: string) => {
    if (sect !== org.section) {
      if (sect !== "New Section") {
        setShowNewSelection(false);
        setSection(sect);
        org.section = sect;
        await updateOrg(org);
        dispatch({
          type: OrgListReducerType.UPDATE_ORG,
          updatedOrg: org 
        })
      } else {
        setSection(sect);
        setShowNewSelection(true);
      }
    }
  };

  const createNewSection = async (sect: string) => {
    if (sect) {
      setShowNewSelectionError(undefined);
      org.section = sect;
      await updateOrg(org);
      dispatch({
        type: OrgListReducerType.UPDATE_ORG,
        updatedOrg: org 
      })
    } else {
      setShowNewSelectionError("Please enter a section name.");
    }
  };

  const title = `${org.label ?? ""} Details`;

  return (
    <Form>
      <Form.Description title={title} text="" />
      <Form.Description title="Org URL" text={org.instanceUrl} />
      <Form.Description title="Username" text={org.username} />
      <Form.Description title="Org Alias" text={org.alias} />
      <Form.TextField id="label" title="Label" value={label} onChange={handleLabelChange} />
      <Form.TextField
        id="color"
        title="Color (Hex Code)"
        error={colorError}
        value={color}
        onChange={handleColorChange}
      />
      <Form.Dropdown id="section" title="Section" defaultValue={section} onChange={handleSectionChange}>
        {sections.map((sect, index) => (
          <Form.Dropdown.Item key={index} value={sect} title={sect} />
        ))}
      </Form.Dropdown>
      {showNewSelection ? (
        <Form.TextField
          id="newSectionName"
          error={showNewSelectionError}
          title="New Section Name"
          onChange={createNewSection}
        />
      ) : undefined}
    </Form>
  );
}
