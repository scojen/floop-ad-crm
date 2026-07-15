import { useFormContext, useWatch } from 'react-hook-form';
import type { BriefFormValues } from '../../../lib/schema/campaign-brief';
import type { DerivedCalcs } from '../../../lib/calc/derive';
import { requiredBuildFor } from '../../../lib/schema/sections/s0-client';
import {
  MATCH_PARAMETERS,
  type MatchParameter,
} from '../../../lib/schema/sections/s3-measurement';
import { FIELD_INFO } from '../../../lib/planning-copy';
import {
  CheckboxField,
  NumberField,
  SectionCard,
  SelectField,
  TriStateField,
  YesNoField,
} from '../fields';

const PARAMETER_LABELS: Record<MatchParameter, string> = {
  hashedEmail: 'hashed email',
  hashedPhone: 'hashed phone',
  firstName: 'first name',
  lastName: 'last name',
  city: 'city',
  state: 'state',
  zip: 'zip',
  country: 'country',
  ip: 'IP',
  userAgent: 'user agent',
  fbc: 'fbc',
  fbp: 'fbp',
  externalId: 'external_id',
};

export function Section3({ calc }: { calc: DerivedCalcs | null }) {
  const { register, control } = useFormContext<BriefFormValues>();
  const vertical = useWatch({ control, name: 's0.vertical' });
  const isLeadGen = requiredBuildFor(vertical) === 'leadGen';

  return (
    <SectionCard
      id="s3"
      number="3"
      title="Measurement Readiness"
      subtitle="If the pipeline can't be trusted, nothing downstream of it can. ch. 5"
      badge={
        <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600">
          BLOCKING GATE
        </span>
      }
    >
      <div className="sm:col-span-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Event pipeline
        </h4>
      </div>
      <TriStateField name="s3.pixelFiring" label="Pixel installed and firing" />
      <SelectField
        name="s3.capiMode"
        label="Conversions API"
        info={FIELD_INFO.capi}
        help="Stock CAPI apps typically drop ~20% of events and pass minimal parameters. §5.2"
        options={[
          { value: 'none', label: 'None' },
          { value: 'platform_app', label: 'Platform app (stock)' },
          { value: 'server_custom', label: 'Server-side custom' },
        ]}
      />
      <NumberField
        name="s3.emqScore"
        label="Event Match Quality (0–10)"
        info={FIELD_INFO.emq}
        help="Blocks below 5, warns below 7. §5.4"
      />
      <TriStateField
        name="s3.eventIdDedup"
        label="event_id deduplication verified — stable business ID, identical across browser and server"
        info={FIELD_INFO.dedup}
      />
      <div className="sm:col-span-2">
        <span className="mb-1 block text-xs font-medium text-neutral-600">
          Parameters passed
        </span>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {MATCH_PARAMETERS.map((key) => (
            <label
              key={key}
              className="flex items-center gap-1.5 text-xs text-neutral-600"
            >
              <input
                type="checkbox"
                className="h-3.5 w-3.5 accent-neutral-700"
                {...register(`s3.parameters.${key}`)}
              />
              {PARAMETER_LABELS[key]}
            </label>
          ))}
        </div>
      </div>

      <div className="sm:col-span-2 mt-1 border-t border-neutral-100 pt-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Reconciliation — the four layers §5.1
        </h4>
      </div>
      <NumberField
        name="s3.reconciliation.backendOrders7d"
        label="Backend orders/leads, last 7 days"
        info={FIELD_INFO.receiptRatio}
      />
      <NumberField
        name="s3.reconciliation.eventsManagerReceived7d"
        label="Received events in Events Manager, same period"
      />
      <div className="sm:col-span-2 rounded-md bg-neutral-50 px-3 py-2 text-[11px] leading-relaxed text-neutral-500">
        Receipt ratio:{' '}
        <span className="font-semibold tabular-nums text-neutral-700">
          {calc?.receiptRatio ?? '—'}
        </span>
        {' · '}The four layers: backend records → received events → matched
        events → <em>attributed</em> conversions. Attributed conversions in Ads
        Manager are NOT expected to equal backend orders — do not chase a 1:1
        match between Ads Manager and Shopify. This gate only checks layer 1 ↔
        layer 2 (receipt).
      </div>

      {isLeadGen && (
        <>
          <div className="sm:col-span-2 mt-1 border-t border-neutral-100 pt-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
              CRM / offline — required for lead gen & B2B §5.7
            </h4>
          </div>
          <YesNoField
            name="s3.crm.connected"
            label="CRM connected to Meta via Conversions API"
          />
          <YesNoField
            name="s3.crm.stageDictionaryDefined"
            label="Stage dictionary defined and mapped"
          />
          <NumberField
            name="s3.crm.uploadLagMedianHours"
            label="Upload lag, median (hours)"
            help="Meta's offline/CRM guidance limits event_time to ≤7 days before upload. Send the close event when it closes."
          />
        </>
      )}

      <div className="sm:col-span-2 mt-1 border-t border-neutral-100 pt-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Privacy — cannot be overridden
        </h4>
      </div>
      <YesNoField name="s3.privacy.dpaExecuted" label="DPA executed with client" info={FIELD_INFO.dpa} />
      <SelectField
        name="s3.privacy.lawfulBasis.kind"
        label="Lawful basis documented"
        options={[
          { value: 'consent', label: 'Consent' },
          { value: 'legitimate_interest', label: 'Legitimate interest' },
          { value: 'other', label: 'Other' },
        ]}
      />
      <YesNoField
        name="s3.privacy.consentGating"
        label="Consent gating implemented — events do not fire for non-consenting users"
        info={FIELD_INFO.consentGating}
      />
      <YesNoField
        name="s3.privacy.retentionPolicyDocumented"
        label="Retention & deletion policy documented"
      />
      <CheckboxField
        name="s3.privacy.prohibitedDataAttestation"
        label="I confirm no diagnoses, treatment details, privileged legal claims, financial account numbers, children's data, or raw free-text fields are transmitted."
      />

      <div className="sm:col-span-2 mt-1 border-t border-neutral-100 pt-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Attribution
        </h4>
      </div>
      <SelectField
        name="s3.attribution.setting"
        label="Attribution setting (recorded)"
        info={FIELD_INFO.attributionSetting}
        options={[
          { value: '7d_click', label: '7d click' },
          { value: '7d_click_1d_engage', label: '7d click + 1d engaged view' },
          {
            value: '7d_click_1d_engage_1d_view',
            label: '7d click + 1d engage + 1d view',
          },
          { value: 'other', label: 'Other' },
        ]}
      />
      <NumberField
        name="s3.attribution.viewThroughSharePct"
        label="View-through share of conversions (historical)"
        suffix="%"
        info={FIELD_INFO.viewThrough}
        help="Above 50%: most conversions come from people who never touched the ad. §6.2"
      />
    </SectionCard>
  );
}
