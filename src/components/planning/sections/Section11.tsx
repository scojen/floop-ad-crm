import { useFormContext, useWatch } from 'react-hook-form';
import type { BriefFormValues } from '../../../lib/schema/campaign-brief';
import { requiredBuildFor } from '../../../lib/schema/sections/s0-client';
import {
  DateField,
  NumberField,
  SectionCard,
  TextAreaField,
  TextField,
  YesNoField,
} from '../fields';

export function Section11() {
  const { control } = useFormContext<BriefFormValues>();
  const vertical = useWatch({ control, name: 's0.vertical' });
  const leadGen = requiredBuildFor(vertical) === 'leadGen';

  return (
    <SectionCard
      id="s11"
      number="11"
      title="Landing Page & Post-Click"
      subtitle="The ad's job ends at the click; the economics are decided after it. A form change that raises submissions but lowers appointments is not a win. ch. 9"
    >
      <TextAreaField
        name="s11.destinationUrls"
        label="Destination URL(s)"
        rows={2}
        placeholder="One per line"
      />
      <YesNoField
        name="s11.messageMatch.confirmed"
        label="Message match confirmed?"
        help="The page repeats the ad's promise above the fold — same offer, same words."
      />
      <TextField name="s11.messageMatch.notes" label="Message-match notes" />
      <NumberField
        name="s11.lcpSecondsMobile"
        label="Mobile LCP"
        suffix="s"
        help="Largest Contentful Paint on a real phone. Above 2.5s, paid traffic bounces before the page exists."
      />
      <YesNoField
        name="s11.checkoutTested.tested"
        label={leadGen ? 'Form tested end-to-end?' : 'Checkout tested end-to-end?'}
        help="On a phone, with a real card / real submission. Untested flows are a blocking gate."
      />
      <DateField name="s11.checkoutTested.on" label="Tested on" />
      <YesNoField name="s11.inventoryConfirmed" label="Inventory / capacity confirmed for projected volume?" />
      <TextField
        name="s11.downstreamQualityMetric"
        label="Downstream quality metric"
        placeholder="What proves post-click quality? e.g. appointment rate"
      />

      {leadGen && (
        <>
          <div className="sm:col-span-2 mt-1 border-t border-neutral-100 pt-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Intake capacity — speed-to-lead is the #1 conversion lever. ch. 10
            </h4>
          </div>
          <NumberField
            name="s11.intake.medianFirstResponseMinutes"
            label="Median first response"
            suffix="min"
          />
          <NumberField
            name="s11.intake.p90FirstResponseMinutes"
            label="90th-percentile first response"
            suffix="min"
            help="The tail is where leads die — a day-old lead is nearly dead."
          />
          <NumberField
            name="s11.intake.capacityUtilizationPct"
            label="Intake capacity utilization"
            suffix="%"
            help="Above 95%, new leads buy response-time decay, not revenue."
          />
        </>
      )}
    </SectionCard>
  );
}
