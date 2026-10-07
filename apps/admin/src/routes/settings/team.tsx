import { useEffect, useState, type FormEvent } from "react";
import { useAdmin } from "@/src/admin-context";
import { apiFetch } from "@/src/lib/api";
import { PageFrame } from "@/components/admin/frontend/page-frame";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Capability =
  | "content:read"
  | "content:write"
  | "commerce:read"
  | "commerce:write"
  | "enquiries:read"
  | "enquiries:write"
  | "growth:read"
  | "growth:write"
  | "settings:read"
  | "settings:write"
  | "publish"
  | "media:read"
  | "media:write";
type Role = {
  id: string;
  name: string;
  capabilities: Capability[];
  isOwner: boolean;
};
type Member = {
  id: string;
  name: string | null;
  email: string;
  roleId: string;
};
type Invite = {
  id: string;
  email: string;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  roleId: string;
};
type Team = { roles: Role[]; members: Member[]; invitations: Invite[] };
const capabilities: { id: Capability; label: string; group: string }[] = [
  { id: "content:read", label: "View pages and content", group: "Content" },
  { id: "content:write", label: "Edit pages and content", group: "Content" },
  { id: "commerce:read", label: "View commerce", group: "Commerce" },
  { id: "commerce:write", label: "Manage commerce", group: "Commerce" },
  { id: "enquiries:read", label: "View enquiries", group: "Enquiries" },
  { id: "enquiries:write", label: "Manage enquiries", group: "Enquiries" },
  { id: "growth:read", label: "View growth analytics", group: "Growth" },
  { id: "growth:write", label: "Manage growth tools", group: "Growth" },
  { id: "settings:read", label: "View settings", group: "Settings" },
  { id: "settings:write", label: "Change settings", group: "Settings" },
  { id: "media:read", label: "View media", group: "Media" },
  { id: "media:write", label: "Manage media", group: "Media" },
  { id: "publish", label: "Publish changes", group: "Publishing" },
];
const capabilityGroups = [
  ...new Set(capabilities.map((capability) => capability.group)),
];

async function send(path: string, method = "GET", body?: unknown) {
  const response = await apiFetch(path, {
    method,
    ...(body
      ? {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(result.message || "The request could not be completed.");
  return result;
}

export default function TeamSettings() {
  const { selectedProjectId } = useAdmin();
  const [scope, setScope] = useState<"project" | "organization">("project");
  const [team, setTeam] = useState<Team>({
    roles: [],
    members: [],
    invitations: [],
  });
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("");
  const [roleName, setRoleName] = useState("");
  const [selectedCapabilities, setSelectedCapabilities] = useState<
    Capability[]
  >(["content:read"]);
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [roleError, setRoleError] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function refresh() {
    if (!selectedProjectId) return;
    const data = await send(
      `/api/admin/projects/team?projectId=${selectedProjectId}&scope=${scope}`,
    );
    setTeam(data);
    setRoleId(data.roles.find((role: Role) => !role.isOwner)?.id ?? "");
  }
  useEffect(() => {
    void refresh().catch((cause) => setError(cause.message));
  }, [selectedProjectId, scope]);

  async function action(work: () => Promise<void>, success: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
      setNotice(success);
      await refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The request could not be completed.",
      );
    } finally {
      setBusy(false);
    }
  }

  function openRoleDialog() {
    setRoleName("");
    setSelectedCapabilities(["content:read"]);
    setRoleError("");
    setShowRoleForm(true);
  }

  async function createRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProjectId || !roleName.trim()) return;
    setBusy(true);
    setRoleError("");
    try {
      await send("/api/admin/projects/team/roles", "POST", {
        projectId: selectedProjectId,
        scope,
        name: roleName,
        capabilities: selectedCapabilities,
      });
      await refresh();
      setShowRoleForm(false);
      setRoleName("");
      setNotice("Role created.");
    } catch (cause) {
      setRoleError(
        cause instanceof Error
          ? cause.message
          : "The role could not be created.",
      );
    } finally {
      setBusy(false);
    }
  }

  const activeInvites = team.invitations.filter(
    (invite) =>
      !invite.acceptedAt &&
      !invite.revokedAt &&
      new Date(invite.expiresAt) > new Date(),
  );
  const roleLabel = (id: string) =>
    team.roles.find((role) => role.id === id)?.name ?? "Role";
  const isOwnerRole = (id: string) =>
    team.roles.find((role) => role.id === id)?.isOwner === true;

  return (
    <PageFrame
      title="People & Permissions"
      description="Invite collaborators and choose what they can do. Organization access covers every project in that organization."
    >
      <div className="space-y-6">
        <div className="flex justify-end">
          <div
            className="inline-flex rounded-lg border border-neutral-200 bg-neutral-100 p-1 dark:border-neutral-800 dark:bg-neutral-900"
            aria-label="Access scope"
          >
            {(["project", "organization"] as const).map((item) => (
              <button
                key={item}
                onClick={() => setScope(item)}
                className={`rounded-md px-3 py-2 text-sm capitalize transition-colors ${scope === item ? "bg-white text-neutral-950 shadow-sm dark:bg-neutral-800 dark:text-white" : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"}`}
              >
                {item} access
              </button>
            ))}
          </div>
        </div>
        {error && (
          <p
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"
          >
            {error}
          </p>
        )}
        {notice && (
          <p
            role="status"
            className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
          >
            {notice}
          </p>
        )}
        <section className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="text-base font-medium text-neutral-900 dark:text-neutral-100">
              Invite by email
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              The invitation expires after seven days.
            </p>
            <form
              className="mt-5 space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                void action(async () => {
                  await send("/api/admin/projects/team/invitations", "POST", {
                    projectId: selectedProjectId,
                    scope,
                    email,
                    roleId,
                  });
                  setEmail("");
                }, "Invitation sent.");
              }}
            >
              <label className="block text-sm font-medium">
                Email address
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-1.5 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950"
                  placeholder="name@example.com"
                />
              </label>
              <label className="block text-sm font-medium">
                Role
                <select
                  required
                  value={roleId}
                  onChange={(event) => setRoleId(event.target.value)}
                  className="mt-1.5 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950"
                >
                  <option value="">Choose a role</option>
                  {team.roles
                    .filter((role) => !role.isOwner)
                    .map((role) => (
                      <option value={role.id} key={role.id}>
                        {role.name}
                      </option>
                    ))}
                </select>
              </label>
              <button
                disabled={busy || !selectedProjectId || !roleId}
                className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm text-neutral-800 transition-colors hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                Send invitation
              </button>
            </form>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-medium text-neutral-900 dark:text-neutral-100">
                  Custom roles
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Build a role from specific capabilities.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={openRoleDialog}>
                Add role
              </Button>
            </div>
            <div className="mt-4 divide-y divide-neutral-100 dark:divide-neutral-800">
              {team.roles.map((role) => (
                <div
                  key={role.id}
                  className="flex items-center justify-between py-2.5 text-sm"
                >
                  <span className="font-medium">
                    {role.name}
                    {role.isOwner && (
                      <span className="ml-2 text-xs font-normal text-neutral-500">
                        project owner
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-neutral-500">
                    {role.isOwner
                      ? "Full access"
                      : `${role.capabilities.length} permissions`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
        <Dialog open={showRoleForm} onOpenChange={setShowRoleForm}>
          <DialogContent className="max-h-[90vh] max-w-2xl gap-0 overflow-hidden border-neutral-200 bg-white p-0 dark:border-neutral-800 dark:bg-neutral-950">
            <form onSubmit={createRole} className="flex max-h-[90vh] flex-col">
              <DialogHeader className="border-b border-neutral-200 px-6 py-5 pr-12 text-left dark:border-neutral-800">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                  {scope} access
                </p>
                <DialogTitle className="mt-1 text-lg font-medium text-neutral-950 dark:text-neutral-50">
                  Create a custom role
                </DialogTitle>
                <DialogDescription className="mt-1">
                  Choose a name and the actions this role can perform.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 overflow-y-auto px-6 py-5">
                <div className="space-y-2">
                  <Label htmlFor="team-role-name">Role name</Label>
                  <Input
                    id="team-role-name"
                    autoFocus
                    required
                    minLength={2}
                    maxLength={80}
                    value={roleName}
                    onChange={(event) => setRoleName(event.target.value)}
                    placeholder="For example, Content manager"
                  />
                </div>
                <fieldset className="space-y-4">
                  <legend className="mb-3 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    Permissions
                  </legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {capabilityGroups.map((group) => (
                      <section
                        key={group}
                        className="rounded-lg border border-neutral-200 bg-neutral-50/70 p-3 dark:border-neutral-800 dark:bg-neutral-900/60"
                      >
                        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                          {group}
                        </h3>
                        <div className="space-y-2">
                          {capabilities
                            .filter((capability) => capability.group === group)
                            .map((capability) => (
                              <label
                                key={capability.id}
                                htmlFor={`capability-${capability.id}`}
                                className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-neutral-700 transition-colors hover:bg-white dark:text-neutral-300 dark:hover:bg-neutral-800"
                              >
                                <Checkbox
                                  id={`capability-${capability.id}`}
                                  checked={selectedCapabilities.includes(
                                    capability.id,
                                  )}
                                  onCheckedChange={(checked) =>
                                    setSelectedCapabilities((current) =>
                                      checked === true
                                        ? [...current, capability.id]
                                        : current.filter(
                                            (item) => item !== capability.id,
                                          ),
                                    )
                                  }
                                />
                                <span>{capability.label}</span>
                              </label>
                            ))}
                        </div>
                      </section>
                    ))}
                  </div>
                </fieldset>
                {roleError && (
                  <p
                    role="alert"
                    className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"
                  >
                    {roleError}
                  </p>
                )}
              </div>
              <DialogFooter className="border-t border-neutral-200 bg-neutral-50/70 px-6 py-4 dark:border-neutral-800 dark:bg-neutral-900/60">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowRoleForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    busy ||
                    !roleName.trim() ||
                    selectedCapabilities.length === 0
                  }
                >
                  {busy ? "Creating…" : "Create role"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <div className="border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
            <h2 className="text-base font-medium text-neutral-900 dark:text-neutral-100">
              Members{" "}
              <span className="ml-1 text-sm font-normal text-neutral-500">
                {team.members.length}
              </span>
            </h2>
          </div>
          {team.members.length ? (
            team.members.map((member) => (
              <div
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-5 py-4 last:border-0 dark:border-neutral-800"
              >
                <div>
                  <p className="text-sm font-medium">
                    {member.name || member.email}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {member.email}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {isOwnerRole(member.roleId) ? (
                    <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                      Owner
                    </span>
                  ) : (
                    <>
                      <select
                        aria-label={`Role for ${member.email}`}
                        value={member.roleId}
                        disabled={busy}
                        onChange={(event) =>
                          void action(async () => {
                            await send(
                              "/api/admin/projects/team/members",
                              "PATCH",
                              {
                                projectId: selectedProjectId,
                                scope,
                                memberId: member.id,
                                roleId: event.target.value,
                              },
                            );
                          }, "Member role updated.")
                        }
                        className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs dark:border-neutral-700 dark:bg-neutral-950"
                      >
                        {team.roles
                          .filter((role) => !role.isOwner)
                          .map((role) => (
                            <option value={role.id} key={role.id}>
                              {role.name}
                            </option>
                          ))}
                      </select>
                      <button
                        disabled={busy}
                        onClick={() =>
                          void action(async () => {
                            await send(
                              "/api/admin/projects/team/members",
                              "DELETE",
                              {
                                projectId: selectedProjectId,
                                scope,
                                memberId: member.id,
                              },
                            );
                          }, "Member removed.")
                        }
                        className="text-sm text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="px-5 py-8 text-sm text-neutral-500">
              No members have this access yet.
            </p>
          )}
        </section>
        {activeInvites.length > 0 && (
          <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <div className="border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
              <h2 className="text-base font-medium text-neutral-900 dark:text-neutral-100">
                Pending invitations
              </h2>
            </div>
            {activeInvites.map((invite) => (
              <div
                key={invite.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-5 py-4 last:border-0 dark:border-neutral-800"
              >
                <div>
                  <p className="text-sm font-medium">{invite.email}</p>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {roleLabel(invite.roleId)} · Expires{" "}
                    {new Date(invite.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  disabled={busy}
                  onClick={() =>
                    void action(async () => {
                      await send(
                        "/api/admin/projects/team/invitations",
                        "DELETE",
                        {
                          projectId: selectedProjectId,
                          scope,
                          invitationId: invite.id,
                        },
                      );
                    }, "Invitation revoked.")
                  }
                  className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-700 transition-colors hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  Revoke
                </button>
              </div>
            ))}
          </section>
        )}
      </div>
    </PageFrame>
  );
}
