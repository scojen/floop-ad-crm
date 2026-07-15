import {
  BUSINESS_MODEL_LABELS,
  BUSINESS_MODELS,
  VERTICAL_LABELS,
  VERTICALS,
} from '../../../lib/schema/sections/s0-client';
import { FIELD_INFO } from '../../../lib/planning-copy';
import { DateField, SectionCard, SelectField, TextField } from '../fields';

export function Section0() {
  return (
    <SectionCard
      id="s0"
      number="0"
      title="Client & Engagement"
      subtitle="Who this is for and whether we can even measure it."
    >
      <TextField name="s0.clientName" label="Client name" />
      <SelectField
        name="s0.vertical"
        label="Vertical"
        options={VERTICALS.map((value) => ({
          value,
          label: VERTICAL_LABELS[value],
        }))}
      />
      <SelectField
        name="s0.businessModel"
        label="Business model"
        options={BUSINESS_MODELS.map((value) => ({
          value,
          label: BUSINESS_MODEL_LABELS[value],
        }))}
      />
      <DateField name="s0.engagementStart" label="Engagement start" />
      <TextField name="s0.mediaLead" label="Media lead" />
      <TextField name="s0.creativeLead" label="Creative lead" />
      <SelectField
        name="s0.backendDataAccess"
        label="Backend data access"
        info={FIELD_INFO.backendAccess}
        help="Without backend revenue or CRM outcome data, every number you report will be Meta's."
        options={[
          { value: 'full', label: 'Full read access' },
          { value: 'partial', label: 'Partial' },
          { value: 'none', label: 'None' },
        ]}
      />
    </SectionCard>
  );
}
