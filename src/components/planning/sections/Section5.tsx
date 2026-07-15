import { useFormContext, useWatch } from 'react-hook-form';
import type { BriefFormValues } from '../../../lib/schema/campaign-brief';
import {
  ChipListField,
  NumberField,
  SectionCard,
  TextAreaField,
  TextField,
  YesNoField,
} from '../fields';

export function Section5() {
  const { control } = useFormContext<BriefFormValues>();
  const detailedUsed = useWatch({ control, name: 's5.detailedTargeting.used' });
  const specialCategory = useWatch({ control, name: 's9.specialAdCategory' });
  const restricted =
    specialCategory !== null && specialCategory !== undefined && specialCategory !== 'NONE';

  return (
    <SectionCard
      id="s5"
      number="5"
      title="Audience"
      subtitle="Deliberately short: post-ATT, the ad is the targeting. Broad + strong creative beats interest stacking. §3.5"
    >
      {restricted && (
        <div className="sm:col-span-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
          Special Ad Category selected in Section 9 — age, gender, and radius
          targeting are disabled by Meta for this campaign; the fields below
          are locked accordingly.
        </div>
      )}
      <TextField name="s5.geography" label="Geography" placeholder="e.g. US, CA · 25mi radius around store" />
      <TextField name="s5.language" label="Language" placeholder="e.g. English" />
      <AgeRange disabled={restricted} />
      <ChipListField
        name="s5.exclusions"
        label="Exclusions"
        help="A prospecting ad set with no purchaser exclusion pays to advertise to people who already bought. §3.5"
        placeholder="e.g. Purchasers 180d"
      />
      <ChipListField
        name="s5.customAudiences"
        label="Custom audiences (retargeting / lookalike seeds)"
        placeholder="e.g. Site visitors 30d"
      />
      <TextAreaField
        name="s5.customerStatusDefinition"
        label='How is "existing customer" defined?'
        rows={2}
        help="Required for Advantage+ — Meta needs the definition to cap existing-customer spend."
      />
      <YesNoField
        name="s5.detailedTargeting.used"
        label="Using detailed (interest/behavior) targeting?"
        help="If yes: write the hypothesis. Interest targeting without a reason is a superstition with a budget."
      />
      {detailedUsed === true && (
        <TextAreaField
          name="s5.detailedTargeting.hypothesis"
          label="Detailed-targeting hypothesis"
          rows={2}
          placeholder="Why would this interest predict purchase, and how will you know?"
        />
      )}
    </SectionCard>
  );
}

function AgeRange({ disabled }: { disabled: boolean }) {
  return (
    <fieldset disabled={disabled} className={disabled ? 'opacity-40' : ''}>
      <div className="grid grid-cols-2 gap-3">
        <NumberField name="s5.ageRange.min" label="Age min" />
        <NumberField name="s5.ageRange.max" label="Age max" />
      </div>
    </fieldset>
  );
}
