"use client";

import { useActionState } from "react";
import {
  addAddressAction,
  changePasswordAction,
  savePreferencesAction,
  updateProfileAction,
  type ProfileActionResult,
} from "@/app/actions/profile";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProfileDetailsForm({
  firstName,
  lastName,
  phone,
}: {
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
}) {
  const [state, action, pending] = useActionState(
    updateProfileAction,
    null as ProfileActionResult | null,
  );

  return (
    <form action={action} className="card space-y-4 p-6 shadow-[var(--shadow-sm)]">
      <h2 className="text-lg font-semibold">Personal Information</h2>
      {state?.ok ? <Alert tone="success">{state.message}</Alert> : null}
      {state && !state.ok ? <Alert tone="danger">{state.error}</Alert> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            name="firstName"
            required
            defaultValue={firstName ?? ""}
          />
        </div>
        <div>
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            name="lastName"
            required
            defaultValue={lastName ?? ""}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="phone">Phone Number</Label>
        <Input id="phone" name="phone" defaultValue={phone ?? ""} />
      </div>
      <Button type="submit" variant="primary" loading={pending}>
        Update Profile
      </Button>
    </form>
  );
}

export function AddAddressForm() {
  const [state, action, pending] = useActionState(
    addAddressAction,
    null as ProfileActionResult | null,
  );
  return (
    <form action={action} className="space-y-3 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border-strong)] p-4">
      <p className="text-sm font-semibold">+ Add New</p>
      {state?.ok ? <Alert tone="success">{state.message}</Alert> : null}
      {state && !state.ok ? <Alert tone="danger">{state.error}</Alert> : null}
      <Input name="fullName" placeholder="Full name" required />
      <Input name="line1" placeholder="Address line" required />
      <Input name="line2" placeholder="Apartment, suite (optional)" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input name="city" placeholder="City" required />
        <Input name="state" placeholder="State" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input name="postalCode" placeholder="Postal code" />
        <Input name="phone" placeholder="Phone" />
      </div>
      <Button type="submit" size="sm" variant="outline" loading={pending}>
        Save address
      </Button>
    </form>
  );
}

export function PreferencesForm({
  emailAlerts,
  smsAlerts,
}: {
  emailAlerts: boolean;
  smsAlerts: boolean;
}) {
  const [state, action, pending] = useActionState(
    savePreferencesAction,
    null as ProfileActionResult | null,
  );
  return (
    <form action={action} className="card space-y-4 p-6">
      <h2 className="text-lg font-semibold">Notifications</h2>
      {state?.ok ? <Alert tone="success">{state.message}</Alert> : null}
      <label className="flex items-center justify-between gap-3 text-sm">
        <span>
          <span className="font-medium">Email Alerts</span>
          <span className="block text-[var(--color-text-muted)]">
            Orders & Promotions
          </span>
        </span>
        <input
          type="checkbox"
          name="emailAlerts"
          defaultChecked={emailAlerts}
          className="h-4 w-4"
        />
      </label>
      <label className="flex items-center justify-between gap-3 text-sm">
        <span>
          <span className="font-medium">SMS Status</span>
          <span className="block text-[var(--color-text-muted)]">
            Delivery Updates
          </span>
        </span>
        <input
          type="checkbox"
          name="smsAlerts"
          defaultChecked={smsAlerts}
          className="h-4 w-4"
        />
      </label>
      <Button type="submit" variant="primary" loading={pending}>
        Save Preferences
      </Button>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(
    changePasswordAction,
    null as ProfileActionResult | null,
  );

  return (
    <form action={action} className="card space-y-4 p-6">
      <h2 className="text-lg font-semibold">Security</h2>
      <p className="text-sm text-[var(--color-text-secondary)]">
        Manage your account security and data
      </p>
      {state?.ok ? <Alert tone="success">{state.message}</Alert> : null}
      {state && !state.ok ? <Alert tone="danger">{state.error}</Alert> : null}
      <Input
        name="currentPassword"
        type="password"
        placeholder="Current password"
        required
        minLength={8}
      />
      <Input
        name="newPassword"
        type="password"
        placeholder="New password"
        required
        minLength={8}
      />
      <Input
        name="confirmPassword"
        type="password"
        placeholder="Confirm new password"
        required
        minLength={8}
      />
      <Button type="submit" variant="outline" loading={pending}>
        Update password
      </Button>
    </form>
  );
}
