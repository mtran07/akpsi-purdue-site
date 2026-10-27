"use client";

import { startTransition, useActionState } from "react";
import { saveProfile, type ProfileState } from "@/app/portal/actions";
import type { Brother } from "@/lib/portal-types";

const inputClass =
  "mt-1 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-ink focus:border-navy focus:outline-none";

function Field({
  label,
  name,
  defaultValue,
  hint,
  ...rest
}: { label: string; name: string; defaultValue?: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink">{label}</span>
      <input name={name} defaultValue={defaultValue ?? ""} className={inputClass} {...rest} />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function ProfileForm({ profile }: { profile: Brother & { show: boolean } }) {
  const [state, formAction, isPending] = useActionState<ProfileState, FormData>(saveProfile, { status: "idle" });

  return (
    <form
      // Submitted by hand (not action=) so React doesn't reset the fields to
      // their old values after saving.
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => formAction(data));
      }}
      className="max-w-2xl space-y-8 rounded-xl border border-line bg-white p-6 sm:p-8">
      <div>
        <p className="font-display text-2xl font-bold text-navy">{profile.name}</p>
        <p className="mt-1 text-sm text-muted">
          {[profile.position, profile.email].filter(Boolean).join(" · ") || "Active brother"}
        </p>
        <p className="mt-2 text-xs text-muted">
          Name, position and Purdue email are managed by the officers. Ask the VP of Membership to change them.
        </p>
      </div>

      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="mb-4 text-xs font-semibold uppercase tracking-widest text-gold">About you</legend>
        <Field label="Pledge class" name="pledgeClass" defaultValue={profile.pledgeClass} maxLength={40} placeholder="e.g. Beta Alpha" />
        <Field
          label="Class year"
          name="gradYear"
          defaultValue={profile.gradYear}
          inputMode="numeric"
          pattern="20[2-3][0-9]"
          maxLength={4}
          placeholder="2028"
          title="A year like 2028"
        />
        <div className="sm:col-span-2">
          <Field label="Major" name="major" defaultValue={profile.major} maxLength={80} placeholder="e.g. Finance, minor in Economics" />
        </div>
      </fieldset>

      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="mb-4 text-xs font-semibold uppercase tracking-widest text-gold">Contact (brothers only)</legend>
        <Field label="Phone" name="phone" type="tel" autoComplete="tel" defaultValue={profile.phone} maxLength={30} placeholder="(317) 555-0101" />
        <Field
          label="Personal email"
          name="personalEmail"
          type="email"
          autoComplete="email"
          defaultValue={profile.personalEmail}
          maxLength={200}
          hint="One that works after graduation."
        />
        <div className="sm:col-span-2">
          <Field
            label="LinkedIn"
            name="linkedin"
            defaultValue={profile.linkedin}
            maxLength={200}
            placeholder="linkedin.com/in/your-name"
            hint="Shown publicly on the roster, like your name and major."
          />
        </div>
      </fieldset>

      <label className="flex items-start gap-3">
        <input type="checkbox" name="show" defaultChecked={profile.show} className="mt-1 h-4 w-4 accent-navy" />
        <span className="text-sm text-ink">
          Show me on the public roster
          <span className="block text-muted">
            Name, pledge class, class year, major and LinkedIn only. Your phone and emails are never public.
          </span>
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-navy px-6 py-3 text-sm font-semibold text-white hover:bg-navy-deep disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save changes"}
        </button>
        {state.status === "saved" && !isPending && (
          <p role="status" className="text-sm font-medium text-green-700">
            Saved. The directory shows it now; the public roster within an hour.
          </p>
        )}
        {state.status === "error" && !isPending && (
          <p role="alert" className="text-sm text-red-700">
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
