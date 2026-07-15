import { useFormContext, useWatch } from 'react-hook-form';
import type { BriefFormValues } from '../../../lib/schema/campaign-brief';
import { PRIMARY_METRICS } from '../../../lib/schema/sections/s12-measurement';
import {
  CheckboxField,
  DateField,
  SectionCard,
  SelectField,
  TextAreaField,
} from '../fields';

const METRIC_LABELS: Record<(typeof PRIMARY_METRICS)[number], string> = {
  CONTRIBUTION_AFTER_MEDIA: 'Contribution after media cost (backend)',
  NEW_CUSTOMERS: 'New customers acquired (backend)',
  COST_PER_CLOSED_DEAL: 'Cost per closed deal (CRM)',
  INCREMENTAL_CONTRIBUTION: 'Incremental contribution (lift-tested)',
  PLATFORM_ROAS: "Platform ROAS (Meta's own attribution) ⚠",
  UNIQUE_REACH: 'Unique reach (awareness)',
  AD_RECALL_LIFT: 'Ad recall lift (awareness)',
  BRANDED_SEARCH_LIFT: 'Branded search lift (awareness)',
  OTHER: 'Other',
};

export function Section12() {
  const { control } = useFormContext<BriefFormValues>();
  const intent = useWatch({ control, name: 's0.campaignIntent' });
  const awareness = intent === 'AWARENESS';
  const metrics = PRIMARY_METRICS.filter((metric) =>
    awareness
      ? metric !== 'PLATFORM_ROAS'
      : true,
  );

  return (
    <SectionCard
      id="s12"
      number="12"
      title="Measurement & Decision Plan"
      subtitle="Decide how you'll be judged before the data arrives — afterwards, every number becomes negotiable. §2.6"
    >
      <SelectField
        name="s12.primaryMetric"
        label="Primary metric — the scoreboard"
        help={
          awareness
            ? 'Awareness campaigns are judged on lift measures, never platform ROAS.'
            : 'Platform-attributed ROAS is Meta grading its own homework — acceptable as a labeled secondary, not the scoreboard.'
        }
        options={metrics.map((value) => ({
          value,
          label: METRIC_LABELS[value],
        }))}
      />
      <DateField
        name="s12.reviewDate"
        label="Review date"
        help="The pre-committed date the decision gets made."
      />
      <TextAreaField
        name="s12.secondaryMetrics"
        label="Secondary metrics (labeled as such)"
        rows={2}
      />
      <TextAreaField
        name="s12.killCriteria"
        label="Kill criteria — what result stops this campaign?"
        rows={2}
        placeholder='e.g. "CAC above allowable for 3 consecutive weeks at stable spend."'
      />
      <TextAreaField
        name="s12.preRegisteredExpectation"
        label="Pre-registered expectation — in numbers, before the data"
        rows={2}
        help="The one field that improves the practitioner rather than the campaign: write what you think will happen, then compare."
        placeholder='e.g. "Blended CAC $38–46 in month 1, improving to $32–38 by month 2."'
      />
      <CheckboxField
        name="s12.reportingCommitment"
        label="Reporting will lead with backend numbers; platform metrics appear only as labeled diagnostics"
      />
    </SectionCard>
  );
}
