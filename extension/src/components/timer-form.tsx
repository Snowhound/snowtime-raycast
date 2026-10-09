import { Action, ActionPanel, Form, Icon, Keyboard } from "@raycast/api";
import { useCachedPromise, useForm } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { api, snowtimeUrl } from "../api";
import { showApiFailure } from "../api/toast";
import { pickOrganization, rememberedOrganization, rememberedProject, rememberOrganization } from "../lib/organization";
import { detectTicket, TICKET_PATTERN } from "../lib/tickets";
import { projectIcon } from "./project-icon";
import { startTimer } from "./start";

const TICKET_INFO = "Left empty, a ticket key in the description, such as ABC-123, becomes the ticket.";
const PROJECT_INFO = "Remembered for the next timer. Changing the organization clears it.";
const NO_PROJECT = "";

export interface TimerFormProps {
  navigationTitle: string;
  // A note above the fields, such as which entry Continue Timer continues.
  intro?: string;
  description?: string;
  ticket?: string | null;
  // The project to preselect: an id, null for no project, or undefined for the remembered one.
  projectId?: string | null;
  organizationId?: string;
}

interface Values {
  description: string;
  ticket: string;
  projectId: string;
}

// The timer form (docs/architecture/README.md, "Starting and continuing"). Start Timer
// pushes it, Continue Timer opens it, and Recent Entries' Edit and Start pushes it.
export function TimerForm(props: TimerFormProps) {
  const [organizationId, setOrganizationId] = useState(props.organizationId);
  // The organization the Project field was last preselected for, and whether the user
  // changed the organization, which leaves the field at No project.
  const projectsSetFor = useRef<string>(undefined);
  const organizationChanged = useRef(false);

  // The organizations, and the one the form starts in: the one passed in, else the
  // remembered one.
  const orgs = useCachedPromise(
    async (preferred?: string) => {
      const { organizations } = await api().me();
      const initial =
        organizations.find((org) => org.id === preferred) ?? (await rememberedOrganization(organizations));
      return { organizations, initialId: initial?.id };
    },
    [props.organizationId],
    { onError: (error) => showApiFailure(error, { title: "Couldn't load organizations" }) },
  );
  const organizations = orgs.data?.organizations ?? [];
  const organization = pickOrganization(organizations, organizationId ?? orgs.data?.initialId);

  const projects = useCachedPromise(
    async (id: string) => ({ organizationId: id, projects: await api().projects(id) }),
    [organization?.id ?? ""],
    {
      execute: !!organization,
      onError: (error) =>
        showApiFailure(error, { title: "Couldn't load projects", organizationSlug: organization?.slug }),
    },
  );
  // The projects of the organization shown, not of the one before it.
  const projectList =
    organization && projects.data?.organizationId === organization.id ? projects.data.projects : undefined;

  const { handleSubmit, itemProps, setValue } = useForm<Values>({
    initialValues: { description: props.description ?? "", ticket: props.ticket ?? "", projectId: NO_PROJECT },
    validation: {
      description: (value) => (value && value.trim().length > 500 ? "Use at most 500 characters." : undefined),
      ticket: (value) =>
        value?.trim() && !TICKET_PATTERN.test(value.trim()) ? "Use a ticket key such as ABC-123." : undefined,
    },
    async onSubmit(values) {
      if (!organization) return;
      let description = values.description.trim();
      let ticket = values.ticket.trim() || null;
      // A ticket the user typed is never replaced (docs/architecture/README.md, "Tickets from
      // the description").
      if (!ticket) ({ description, ticket } = detectTicket(description, new Set(), null));
      const project = projectList?.find((p) => p.id === values.projectId) ?? null;
      await startTimer(organization, { description, ticket, project });
    },
  });

  // Once an organization's projects load, preselect the project: none after the user changed
  // the organization, else the one passed in, else the remembered one, if still listed.
  useEffect(() => {
    const list = projectList;
    if (!organization || !list || projectsSetFor.current === organization.id) return;
    projectsSetFor.current = organization.id;
    if (organizationChanged.current) return setValue("projectId", NO_PROJECT);
    if (props.projectId !== undefined) {
      return setValue(
        "projectId",
        list.some((p) => p.id === props.projectId) ? (props.projectId ?? NO_PROJECT) : NO_PROJECT,
      );
    }
    rememberedProject(organization.id, list).then((project) => setValue("projectId", project?.id ?? NO_PROJECT));
  }, [organization?.id, projectList]);

  function changeOrganization(id: string) {
    if (!organization || id === organization.id) return;
    organizationChanged.current = true;
    setValue("projectId", NO_PROJECT);
    setOrganizationId(id);
    rememberOrganization(id);
  }

  const noProjects = projectList?.length === 0;
  // Start Timer's list fills in the description, so the cursor waits in Ticket, unless the
  // list already found one. Continue Timer, with its note, opens at the description.
  const focusTicket = !!props.description && !props.ticket && !props.intro;

  return (
    <Form
      navigationTitle={props.navigationTitle}
      isLoading={orgs.isLoading || projects.isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Timer" icon={Icon.Play} onSubmit={handleSubmit} />
          <Action.OpenInBrowser
            title="Open Snowtime"
            url={snowtimeUrl(organization ? `/${organization.slug}` : "")}
            shortcut={Keyboard.Shortcut.Common.Open}
          />
        </ActionPanel>
      }
    >
      {props.intro && <Form.Description text={props.intro} />}
      <Form.TextField
        title="Description"
        placeholder="What are you working on?"
        autoFocus={!focusTicket}
        {...itemProps.description}
      />
      <Form.TextField
        title="Ticket"
        placeholder="ABC-123"
        info={TICKET_INFO}
        autoFocus={focusTicket}
        {...itemProps.ticket}
      />
      <Form.Dropdown
        title="Project"
        info={noProjects && organization ? `${organization.name} has no projects you can log time on.` : PROJECT_INFO}
        {...itemProps.projectId}
      >
        <Form.Dropdown.Item value={NO_PROJECT} title="No project" icon={projectIcon(null)} />
        {projectList?.map((project) => (
          <Form.Dropdown.Item key={project.id} value={project.id} title={project.name} icon={projectIcon(project)} />
        ))}
      </Form.Dropdown>
      {organizations.length > 1 && organization && (
        <>
          <Form.Separator />
          <Form.Dropdown
            id="organizationId"
            title="Organization"
            info="Remembered for every command."
            value={organization.id}
            onChange={changeOrganization}
          >
            {organizations.map((org) => (
              <Form.Dropdown.Item key={org.id} value={org.id} title={org.name} icon={Icon.Building} />
            ))}
          </Form.Dropdown>
        </>
      )}
    </Form>
  );
}
