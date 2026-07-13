interface ComingSoonPageProps {
  title: string;
  phase: string;
  description: string;
}

export function ComingSoonPage({
  title,
  phase,
  description,
}: ComingSoonPageProps) {
  return (
    <div>
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
        <p className="text-sm text-neutral-500">{description}</p>
      </header>
      <div className="rounded-lg border border-dashed border-neutral-300 bg-white px-6 py-16 text-center">
        <p className="text-sm font-medium text-neutral-500">
          Ships in {phase}
        </p>
        <p className="mt-1 text-xs text-neutral-400">
          See meta-leads-crm-spec.md for what this screen will do.
        </p>
      </div>
    </div>
  );
}
