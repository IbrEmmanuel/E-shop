"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  saveVendorApplicationDraftAction,
  submitApplicationAction,
  uploadVendorDocumentAction,
  type ActionResult,
} from "@/app/actions/vendor";
import {
  sendVerificationEmailAction,
  type VerifyActionResult,
} from "@/app/actions/email-verification";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/money";
import { NG_STATES } from "@/lib/shipping";
import { cn } from "@/lib/utils";

type Plan = {
  id: string;
  name: string;
  monthlyPriceMinor: number;
  currency: string;
};

type Category = { id: string; name: string };

type Doc = {
  id: string;
  docType: string;
  fileName: string | null;
  label: string | null;
};

type AppDraft = {
  id: string;
  status: string;
  reviewNotes: string | null;
  wizardStep: number;
  storeName: string;
  businessName: string | null;
  businessType: string | null;
  description: string | null;
  contactEmail: string;
  contactPhone: string | null;
  website: string | null;
  businessAddress: string | null;
  businessCity: string | null;
  businessState: string | null;
  businessCountry: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  categoryIdsJson: string;
  shippingPolicy: string | null;
  returnsPolicy: string | null;
  processingDays: number | null;
  taxId: string | null;
  payoutBankName: string | null;
  payoutAccountName: string | null;
  payoutAccountNumber: string | null;
  rentalPlanId: string | null;
  documents: Doc[];
};

const STEPS = [
  "Contact",
  "Business",
  "Documents",
  "Store",
  "Ops & payout",
  "Review",
];

export function VendorApplyWizard({
  plans,
  categories,
  application,
  emailVerified,
  defaultEmail,
}: {
  plans: Plan[];
  categories: Category[];
  application: AppDraft;
  emailVerified: boolean;
  defaultEmail: string;
}) {
  const [step, setStep] = useState(
    Math.min(Math.max(application.wizardStep || 1, 1), 6),
  );
  const [draftState, draftAction, draftPending] = useActionState(
    saveVendorApplicationDraftAction,
    null as ActionResult | null,
  );
  const lastSavedRef = useRef<ActionResult | null>(null);

  useEffect(() => {
    if (
      draftState?.ok &&
      draftState !== lastSavedRef.current &&
      draftState.message === "Progress saved."
    ) {
      lastSavedRef.current = draftState;
      setStep((s) => Math.min(6, s + 1));
    }
  }, [draftState]);
  const [submitState, submitAction, submitPending] = useActionState(
    submitApplicationAction,
    null as ActionResult | null,
  );
  const [docState, docAction, docPending] = useActionState(
    uploadVendorDocumentAction,
    null as ActionResult | null,
  );
  const [verifyState, verifyAction, verifyPending] = useActionState(
    sendVerificationEmailAction,
    null as VerifyActionResult | null,
  );

  const locked =
    application.status === "SUBMITTED" ||
    application.status === "UNDER_REVIEW" ||
    application.status === "APPROVED";

  let categoryIds: string[] = [];
  try {
    categoryIds = JSON.parse(application.categoryIdsJson || "[]") as string[];
  } catch {
    categoryIds = [];
  }

  const state = submitState || draftState || docState;

  if (locked) {
    return (
      <div className="card space-y-3 p-6">
        <Alert tone="info">
          Application status: <strong>{application.status}</strong>. Admin will
          review and email you.
        </Alert>
        {application.reviewNotes ? (
          <p className="text-sm text-[var(--color-text-secondary)]">
            Notes: {application.reviewNotes}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {(application.status === "CHANGES_REQUESTED" ||
        application.status === "REJECTED") &&
      application.reviewNotes ? (
        <Alert tone="warning">
          Admin feedback: {application.reviewNotes}
        </Alert>
      ) : null}

      {!emailVerified ? (
        <div className="card space-y-3 p-4">
          <Alert tone="warning">
            Verify {defaultEmail} before you can submit for approval.
          </Alert>
          <form action={verifyAction}>
            <Button type="submit" size="sm" variant="outline" loading={verifyPending}>
              Send verification email
            </Button>
          </form>
          {verifyState?.ok ? (
            <Alert tone="success">{verifyState.message}</Alert>
          ) : null}
          {verifyState && !verifyState.ok ? (
            <Alert tone="danger">{verifyState.error}</Alert>
          ) : null}
        </div>
      ) : (
        <Alert tone="success">Email verified.</Alert>
      )}

      <nav className="flex flex-wrap gap-2" aria-label="Application steps">
        {STEPS.map((label, i) => {
          const n = i + 1;
          return (
            <button
              key={label}
              type="button"
              onClick={() => setStep(n)}
              className={cn(
                "rounded-[var(--radius-pill)] px-3 py-1.5 text-xs font-semibold",
                step === n
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]",
              )}
            >
              {n}. {label}
            </button>
          );
        })}
      </nav>

      {state && !state.ok ? <Alert tone="danger">{state.error}</Alert> : null}
      {state?.ok && state.message ? (
        <Alert tone="success">{state.message}</Alert>
      ) : null}

      <form
        action={step === 6 ? submitAction : draftAction}
        className="card space-y-4 p-6"
        encType="multipart/form-data"
      >
        <input
          type="hidden"
          name="wizardStep"
          value={step < 6 ? Math.min(6, step + 1) : step}
        />

        {step === 1 ? (
          <>
            <h2 className="text-lg font-semibold">Contact</h2>
            <div>
              <Label htmlFor="contactEmail">Email</Label>
              <Input
                id="contactEmail"
                name="contactEmail"
                type="email"
                required
                defaultValue={application.contactEmail || defaultEmail}
              />
            </div>
            <div>
              <Label htmlFor="contactPhone">Phone</Label>
              <Input
                id="contactPhone"
                name="contactPhone"
                required
                defaultValue={application.contactPhone ?? ""}
              />
            </div>
            <div>
              <Label htmlFor="website">Website (optional)</Label>
              <Input
                id="website"
                name="website"
                defaultValue={application.website ?? ""}
              />
            </div>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <h2 className="text-lg font-semibold">Business information</h2>
            <div>
              <Label htmlFor="businessName">Legal business name</Label>
              <Input
                id="businessName"
                name="businessName"
                required
                defaultValue={application.businessName ?? ""}
              />
            </div>
            <div>
              <Label htmlFor="businessType">Business type</Label>
              <Select
                id="businessType"
                name="businessType"
                required
                defaultValue={application.businessType ?? ""}
              >
                <option value="">Select…</option>
                <option value="sole_prop">Sole proprietor</option>
                <option value="ltd">Limited company</option>
                <option value="partnership">Partnership</option>
                <option value="other">Other</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="businessAddress">Business address</Label>
              <Input
                id="businessAddress"
                name="businessAddress"
                required
                defaultValue={application.businessAddress ?? ""}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="businessCity">City</Label>
                <Input
                  id="businessCity"
                  name="businessCity"
                  required
                  defaultValue={application.businessCity ?? ""}
                />
              </div>
              <div>
                <Label htmlFor="businessState">State</Label>
                <select
                  id="businessState"
                  name="businessState"
                  className="select mt-0 w-full"
                  defaultValue={application.businessState ?? ""}
                >
                  <option value="">Select state</option>
                  {NG_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <Label htmlFor="businessCountry">Country</Label>
              <Input
                id="businessCountry"
                name="businessCountry"
                defaultValue={application.businessCountry || "NG"}
              />
            </div>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <h2 className="text-lg font-semibold">Documents</h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Upload ID card, business registration, or proof of address.
            </p>
            <ul className="space-y-1 text-sm">
              {application.documents.map((d) => (
                <li key={d.id}>
                  {d.docType}: {d.fileName || d.label || "Uploaded"}
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {step === 4 ? (
          <>
            <h2 className="text-lg font-semibold">Store setup</h2>
            <div>
              <Label htmlFor="storeName">Store name</Label>
              <Input
                id="storeName"
                name="storeName"
                required
                defaultValue={application.storeName}
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                rows={4}
                defaultValue={application.description ?? ""}
              />
            </div>
            <div>
              <Label htmlFor="logoFile">Logo</Label>
              <Input id="logoFile" name="logoFile" type="file" accept="image/*" />
              {application.logoUrl ? (
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  Logo on file
                </p>
              ) : null}
            </div>
            <div>
              <Label htmlFor="bannerFile">Banner</Label>
              <Input
                id="bannerFile"
                name="bannerFile"
                type="file"
                accept="image/*"
              />
            </div>
            <fieldset>
              <legend className="text-sm font-semibold">Categories</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {categories.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="categoryIds"
                      value={c.id}
                      defaultChecked={categoryIds.includes(c.id)}
                    />
                    {c.name}
                  </label>
                ))}
              </div>
            </fieldset>
          </>
        ) : null}

        {step === 5 ? (
          <>
            <h2 className="text-lg font-semibold">Shipping, returns & payout</h2>
            <div>
              <Label htmlFor="shippingPolicy">Shipping policy</Label>
              <Textarea
                id="shippingPolicy"
                name="shippingPolicy"
                rows={3}
                defaultValue={application.shippingPolicy ?? ""}
              />
            </div>
            <div>
              <Label htmlFor="returnsPolicy">Returns policy</Label>
              <Textarea
                id="returnsPolicy"
                name="returnsPolicy"
                rows={3}
                defaultValue={application.returnsPolicy ?? ""}
              />
            </div>
            <div>
              <Label htmlFor="processingDays">Processing days</Label>
              <Input
                id="processingDays"
                name="processingDays"
                type="number"
                min={0}
                max={60}
                defaultValue={application.processingDays ?? 2}
              />
            </div>
            <div>
              <Label htmlFor="taxId">Tax / TIN (optional)</Label>
              <Input
                id="taxId"
                name="taxId"
                defaultValue={application.taxId ?? ""}
              />
            </div>
            <div>
              <Label htmlFor="payoutBankName">Payout bank</Label>
              <Input
                id="payoutBankName"
                name="payoutBankName"
                required
                defaultValue={application.payoutBankName ?? ""}
              />
            </div>
            <div>
              <Label htmlFor="payoutAccountName">Account name</Label>
              <Input
                id="payoutAccountName"
                name="payoutAccountName"
                required
                defaultValue={application.payoutAccountName ?? ""}
              />
            </div>
            <div>
              <Label htmlFor="payoutAccountNumber">Account number</Label>
              <Input
                id="payoutAccountNumber"
                name="payoutAccountNumber"
                required
                defaultValue={application.payoutAccountNumber ?? ""}
              />
            </div>
            <div>
              <Label htmlFor="rentalPlanId">Rental plan</Label>
              <Select
                id="rentalPlanId"
                name="rentalPlanId"
                required
                defaultValue={application.rentalPlanId || plans[0]?.id || ""}
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {formatMoney(p.monthlyPriceMinor, p.currency)}/mo
                  </option>
                ))}
              </Select>
            </div>
          </>
        ) : null}

        {step === 6 ? (
          <>
            <h2 className="text-lg font-semibold">Review & submit</h2>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-[var(--color-text-muted)]">Store</dt>
                <dd className="font-semibold">{application.storeName || "—"}</dd>
              </div>
              <div>
                <dt className="text-[var(--color-text-muted)]">Business</dt>
                <dd>
                  {application.businessName || "—"} ({application.businessType || "—"})
                </dd>
              </div>
              <div>
                <dt className="text-[var(--color-text-muted)]">Location</dt>
                <dd>
                  {[application.businessAddress, application.businessCity, application.businessState]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--color-text-muted)]">Documents</dt>
                <dd>{application.documents.length} uploaded</dd>
              </div>
              <div>
                <dt className="text-[var(--color-text-muted)]">Email verified</dt>
                <dd>{emailVerified ? "Yes" : "No"}</dd>
              </div>
            </dl>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Submitting sends your application to admin for approval. You can
              still save a draft from earlier steps.
            </p>
          </>
        ) : null}

        {/* Keep hidden copies of critical fields so submit has them after draft saves */}
        {step !== 1 ? (
          <>
            <input type="hidden" name="contactEmail" value={application.contactEmail || defaultEmail} />
            <input type="hidden" name="contactPhone" value={application.contactPhone ?? ""} />
          </>
        ) : null}
        {step !== 4 ? (
          <input type="hidden" name="storeName" value={application.storeName} />
        ) : null}
        {step !== 5 ? (
          <>
            <input type="hidden" name="rentalPlanId" value={application.rentalPlanId ?? plans[0]?.id ?? ""} />
            <input type="hidden" name="payoutBankName" value={application.payoutBankName ?? ""} />
            <input type="hidden" name="payoutAccountName" value={application.payoutAccountName ?? ""} />
            <input type="hidden" name="payoutAccountNumber" value={application.payoutAccountNumber ?? ""} />
          </>
        ) : null}

        <div className="flex flex-wrap gap-2 pt-2">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setStep((s) => s - 1)}
            >
              Back
            </Button>
          ) : null}
          {step < 6 ? (
            <Button type="submit" variant="primary" size="sm" loading={draftPending}>
              Save & continue
            </Button>
          ) : (
            <Button
              type="submit"
              variant="accent"
              size="sm"
              loading={submitPending}
              disabled={!emailVerified}
            >
              Submit for admin approval
            </Button>
          )}
        </div>
      </form>

      {step === 3 ? (
        <form action={docAction} className="card space-y-3 p-6" encType="multipart/form-data">
          <div>
            <Label htmlFor="docType">Document type</Label>
            <Select id="docType" name="docType" defaultValue="id_card">
              <option value="id_card">Identity card</option>
              <option value="business_reg">Business registration</option>
              <option value="proof_of_address">Proof of address</option>
              <option value="other">Other</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="document">File (image or PDF)</Label>
            <Input
              id="document"
              name="document"
              type="file"
              accept="image/*,application/pdf"
              required
            />
          </div>
          <Button type="submit" size="sm" variant="outline" loading={docPending}>
            Upload document
          </Button>
        </form>
      ) : null}
    </div>
  );
}
