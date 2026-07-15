/**
 * Form field primitives bound to RHF via useFormContext. All numeric inputs
 * map '' → null (never NaN); errors render only after blur (mode: onBlur).
 */
import { useController, useFormContext } from 'react-hook-form';
import type { FieldPath } from 'react-hook-form';
import type { BriefFormValues } from '../../lib/schema/campaign-brief';

type Name = FieldPath<BriefFormValues>;

export function FieldShell({
  label,
  help,
  error,
  children,
  wide,
}: {
  label: string;
  help?: string;
  error?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={`block ${wide ? 'sm:col-span-2' : ''}`}>
      <span className="mb-1 block text-xs font-medium text-neutral-600">
        {label}
      </span>
      {children}
      {help && !error && (
        <span className="mt-1 block text-[11px] text-neutral-400">{help}</span>
      )}
      {error && (
        <span className="mt-1 block text-[11px] text-red-600">{error}</span>
      )}
    </label>
  );
}

export const inputClass =
  'w-full rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-neutral-500 disabled:bg-neutral-50';

export function NumberField({
  name,
  label,
  help,
  prefix,
  suffix,
  step,
}: {
  name: Name;
  label: string;
  help?: string;
  prefix?: string;
  suffix?: string;
  step?: string;
}) {
  const { control } = useFormContext<BriefFormValues>();
  const { field, fieldState } = useController({ control, name });
  return (
    <FieldShell label={label} help={help} error={fieldState.error?.message}>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-neutral-400">
            {prefix}
          </span>
        )}
        <input
          type="number"
          inputMode="decimal"
          step={step ?? 'any'}
          className={`${inputClass} ${prefix ? 'pl-6' : ''} ${suffix ? 'pr-9' : ''}`}
          value={(field.value as number | null) ?? ''}
          onChange={(event) =>
            field.onChange(
              event.target.value === '' ? null : Number(event.target.value),
            )
          }
          onBlur={field.onBlur}
          name={field.name}
          ref={field.ref}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-neutral-400">
            {suffix}
          </span>
        )}
      </div>
    </FieldShell>
  );
}

export function TextField({
  name,
  label,
  help,
  placeholder,
}: {
  name: Name;
  label: string;
  help?: string;
  placeholder?: string;
}) {
  const { control } = useFormContext<BriefFormValues>();
  const { field, fieldState } = useController({ control, name });
  return (
    <FieldShell label={label} help={help} error={fieldState.error?.message}>
      <input
        type="text"
        className={inputClass}
        placeholder={placeholder}
        value={(field.value as string | null) ?? ''}
        onChange={(event) => field.onChange(event.target.value)}
        onBlur={field.onBlur}
        name={field.name}
        ref={field.ref}
      />
    </FieldShell>
  );
}

export function DateField({ name, label, help }: { name: Name; label: string; help?: string }) {
  const { control } = useFormContext<BriefFormValues>();
  const { field, fieldState } = useController({ control, name });
  return (
    <FieldShell label={label} help={help} error={fieldState.error?.message}>
      <input
        type="date"
        className={inputClass}
        value={(field.value as string | null) ?? ''}
        onChange={(event) => field.onChange(event.target.value || null)}
        onBlur={field.onBlur}
        name={field.name}
        ref={field.ref}
      />
    </FieldShell>
  );
}

export function TextAreaField({
  name,
  label,
  help,
  rows,
  minChars,
  placeholder,
  wide,
}: {
  name: Name;
  label: string;
  help?: string;
  rows?: number;
  minChars?: number;
  placeholder?: string;
  wide?: boolean;
}) {
  const { control } = useFormContext<BriefFormValues>();
  const { field, fieldState } = useController({ control, name });
  const value = (field.value as string | null) ?? '';
  return (
    <FieldShell label={label} help={help} error={fieldState.error?.message} wide={wide ?? true}>
      <textarea
        rows={rows ?? 3}
        className={`${inputClass} resize-y`}
        placeholder={placeholder}
        value={value}
        onChange={(event) => field.onChange(event.target.value)}
        onBlur={field.onBlur}
        name={field.name}
        ref={field.ref}
      />
      {minChars !== undefined && (
        <span
          className={`mt-0.5 block text-right text-[10px] tabular-nums ${
            value.trim().length >= minChars
              ? 'text-neutral-400'
              : 'text-amber-600'
          }`}
        >
          {value.trim().length}/{minChars}
        </span>
      )}
    </FieldShell>
  );
}

export function SelectField({
  name,
  label,
  help,
  options,
  placeholder,
}: {
  name: Name;
  label: string;
  help?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  const { control } = useFormContext<BriefFormValues>();
  const { field, fieldState } = useController({ control, name });
  return (
    <FieldShell label={label} help={help} error={fieldState.error?.message}>
      <select
        className={inputClass}
        value={(field.value as string | null) ?? ''}
        onChange={(event) => field.onChange(event.target.value || null)}
        onBlur={field.onBlur}
        name={field.name}
        ref={field.ref}
      >
        <option value="">{placeholder ?? 'Select…'}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function RadioGroupField({
  name,
  label,
  options,
  help,
}: {
  name: Name;
  label: string;
  help?: string;
  options: { value: string; label: string; description?: string }[];
}) {
  const { control } = useFormContext<BriefFormValues>();
  const { field, fieldState } = useController({ control, name });
  return (
    <FieldShell label={label} help={help} error={fieldState.error?.message} wide>
      <div className="space-y-1.5">
        {options.map((option) => (
          <label
            key={option.value}
            className={`flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 text-sm ${
              field.value === option.value
                ? 'border-neutral-700 bg-neutral-50'
                : 'border-neutral-200'
            }`}
          >
            <input
              type="radio"
              className="mt-0.5 accent-neutral-700"
              checked={field.value === option.value}
              onChange={() => field.onChange(option.value)}
            />
            <span>
              <span className="font-medium text-neutral-800">{option.label}</span>
              {option.description && (
                <span className="block text-xs text-neutral-500">
                  {option.description}
                </span>
              )}
            </span>
          </label>
        ))}
      </div>
    </FieldShell>
  );
}

export function CheckboxField({
  name,
  label,
  help,
}: {
  name: Name;
  label: string;
  help?: string;
}) {
  const { control } = useFormContext<BriefFormValues>();
  const { field, fieldState } = useController({ control, name });
  return (
    <div className="sm:col-span-2">
      <label className="flex cursor-pointer items-start gap-2 text-sm text-neutral-700">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 accent-neutral-700"
          checked={Boolean(field.value)}
          onChange={(event) => field.onChange(event.target.checked)}
        />
        <span>{label}</span>
      </label>
      {help && <p className="ml-6 mt-0.5 text-[11px] text-neutral-400">{help}</p>}
      {fieldState.error && (
        <p className="ml-6 mt-0.5 text-[11px] text-red-600">
          {fieldState.error.message}
        </p>
      )}
    </div>
  );
}

/** Yes / No / unanswered. */
export function YesNoField({
  name,
  label,
  help,
}: {
  name: Name;
  label: string;
  help?: string;
}) {
  const { control } = useFormContext<BriefFormValues>();
  const { field, fieldState } = useController({ control, name });
  const value = field.value as boolean | null;
  return (
    <FieldShell label={label} help={help} error={fieldState.error?.message}>
      <div className="flex gap-1.5">
        {[
          { v: true, label: 'Yes' },
          { v: false, label: 'No' },
        ].map(({ v, label: optionLabel }) => (
          <button
            key={optionLabel}
            type="button"
            onClick={() => field.onChange(v)}
            className={`rounded-md border px-3 py-1.5 text-sm ${
              value === v
                ? v
                  ? 'border-green-600 bg-green-50 font-medium text-green-700'
                  : 'border-red-400 bg-red-50 font-medium text-red-600'
                : 'border-neutral-200 text-neutral-500'
            }`}
          >
            {optionLabel}
          </button>
        ))}
      </div>
    </FieldShell>
  );
}

/** ✅ Verified / ⚠️ Partial / ❌ Not in place + provenance. */
export function TriStateField({
  name,
  label,
  help,
}: {
  name: Name;
  label: string;
  help?: string;
}) {
  const { control } = useFormContext<BriefFormValues>();
  const status = useController({ control, name: `${name}.status` as Name });
  const verifiedOn = useController({ control, name: `${name}.verifiedOn` as Name });
  const verifiedBy = useController({ control, name: `${name}.verifiedBy` as Name });
  const value = status.field.value as string | null;

  const options = [
    { v: 'pass', label: '✅ Verified', cls: 'border-green-600 bg-green-50 text-green-700' },
    { v: 'warn', label: '⚠️ Partial', cls: 'border-amber-500 bg-amber-50 text-amber-700' },
    { v: 'fail', label: '❌ Not in place', cls: 'border-red-400 bg-red-50 text-red-600' },
  ];

  return (
    <div className="sm:col-span-2">
      <span className="mb-1 block text-xs font-medium text-neutral-600">{label}</span>
      <div className="flex flex-wrap items-center gap-1.5">
        {options.map((option) => (
          <button
            key={option.v}
            type="button"
            onClick={() => status.field.onChange(option.v)}
            className={`rounded-md border px-2.5 py-1.5 text-xs ${
              value === option.v ? `${option.cls} font-medium` : 'border-neutral-200 text-neutral-500'
            }`}
          >
            {option.label}
          </button>
        ))}
        <input
          type="date"
          title="Verified on"
          className="rounded-md border border-neutral-200 px-2 py-1.5 text-xs text-neutral-600"
          value={(verifiedOn.field.value as string | null) ?? ''}
          onChange={(event) => verifiedOn.field.onChange(event.target.value || null)}
        />
        <input
          type="text"
          placeholder="Verified by"
          className="w-28 rounded-md border border-neutral-200 px-2 py-1.5 text-xs"
          value={(verifiedBy.field.value as string | null) ?? ''}
          onChange={(event) => verifiedBy.field.onChange(event.target.value || null)}
        />
      </div>
      {help && <p className="mt-1 text-[11px] text-neutral-400">{help}</p>}
    </div>
  );
}

/** Currency-or-percent dual input (promo/discount). */
export function CurrencyOrPercentField({
  name,
  label,
  help,
}: {
  name: Name;
  label: string;
  help?: string;
}) {
  const { control } = useFormContext<BriefFormValues>();
  const mode = useController({ control, name: `${name}.mode` as Name });
  const amount = useController({ control, name: `${name}.value` as Name });
  return (
    <FieldShell label={label} help={help}>
      <div className="flex">
        <input
          type="number"
          inputMode="decimal"
          step="any"
          className={`${inputClass} rounded-r-none`}
          value={(amount.field.value as number | null) ?? ''}
          onChange={(event) =>
            amount.field.onChange(
              event.target.value === '' ? null : Number(event.target.value),
            )
          }
        />
        <button
          type="button"
          onClick={() =>
            mode.field.onChange(
              mode.field.value === 'percent' ? 'currency' : 'percent',
            )
          }
          className="rounded-r-md border border-l-0 border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-600"
          title="Toggle currency / percent"
        >
          {mode.field.value === 'percent' ? '%' : '$'}
        </button>
      </div>
    </FieldShell>
  );
}

export function SectionCard({
  id,
  number,
  title,
  subtitle,
  badge,
  children,
}: {
  id: string;
  number: string;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="rounded-lg border border-neutral-200 bg-white">
      <header className="flex items-start justify-between gap-2 border-b border-neutral-100 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">
            <span className="mr-1.5 text-neutral-300">{number}</span>
            {title}
          </h3>
          {subtitle && (
            <p className="mt-0.5 text-xs text-neutral-400">{subtitle}</p>
          )}
        </div>
        {badge}
      </header>
      <div className="grid gap-3 px-4 py-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}
