"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CircleCheckBig, KeyRound, UserRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageFrame } from "@/components/admin/frontend/page-frame";
import { apiFetch } from "@/src/lib/api";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

interface ApiResponse {
  user?: UserProfile;
  error?: string;
}

export default function UserSettings() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    let cancelled = false;
    const fetchProfile = async () => {
      try {
        const response = await apiFetch("/api/admin/account");
        const data: ApiResponse = await response.json();
        if (!response.ok || !data.user) throw new Error(data.error || "Failed to load user data");
        if (cancelled) return;
        setProfile(data.user);
        setName(data.user.name || "");
        setEmail(data.user.email || "");
      } catch (error) {
        console.error("Error fetching user profile:", error);
        if (!cancelled) toast.error(error instanceof Error ? error.message : "Failed to load user data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetchProfile();
    return () => { cancelled = true; };
  }, []);

  const handleSave = async () => {
    if (!profile) return;
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if ((newPassword || confirmPassword) && newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    try {
      setSaving(true);
      const response = await apiFetch("/api/admin/account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
        }),
      });
      const data: ApiResponse = await response.json();
      if (!response.ok || !data.user) throw new Error(data.error || "Failed to update account");
      setProfile(data.user);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast("Account updated", { icon: <CircleCheckBig className="text-green-500" /> });
    } catch (error) {
      console.error("Error updating user profile:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update account");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageFrame title="Account" description="Manage your personal information and password." headerAction={<Button disabled className="h-9 min-w-32">Save changes</Button>}>
        <div className="animate-pulse space-y-4">
          <div className="h-44 rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900" />
          <div className="h-64 rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900" />
        </div>
      </PageFrame>
    );
  }

  if (!profile) {
    return (
      <PageFrame title="Account" description="Manage your personal information and password.">
        <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-amber-500" />
          <p className="text-sm text-neutral-600 dark:text-neutral-300">Your account details could not be loaded. Refresh the page to try again.</p>
        </div>
      </PageFrame>
    );
  }

  return (
    <PageFrame
      title="Account"
      description="Manage your personal information and password."
      headerAction={
        <Button onClick={() => void handleSave()} disabled={saving} className="h-9 min-w-32">
          {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save changes"}
        </Button>
      }
    >
      <div className="space-y-5">
        <section className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"><UserRound className="h-4 w-4" /></span>
            <div>
              <h2 className="text-base text-neutral-900 dark:text-neutral-100">Personal information</h2>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Your name appears in your account and workspace.</p>
            </div>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="account-name">Full name</Label>
              <Input id="account-name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your full name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-email">Email address</Label>
              <div className="relative">
                <Input id="account-email" type="email" value={email} disabled className="pr-24" />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-neutral-500">Read only</span>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"><KeyRound className="h-4 w-4" /></span>
            <div>
              <h2 className="text-base text-neutral-900 dark:text-neutral-100">Change password</h2>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Leave these fields blank to keep your current password.</p>
            </div>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="current-password">Current password</Label>
              <Input id="current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} placeholder="Enter current password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input id="new-password" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Enter new password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input id="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirm new password" />
            </div>
          </div>
        </section>
      </div>
    </PageFrame>
  );
}
