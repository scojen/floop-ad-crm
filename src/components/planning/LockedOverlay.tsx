/**
 * Section lock: always-visible but inert until unit economics validate —
 * "nothing else unlocks until §1 validates". Teaching by architecture:
 * the greyed sections show what's coming; the banner says why it's locked.
 */
export function LockedOverlay({
  locked,
  children,
}: {
  locked: boolean;
  children: React.ReactNode;
}) {
  if (!locked) return <>{children}</>;
  return (
    <div className="relative">
      <div className="absolute inset-0 z-10 flex items-start justify-center rounded-lg bg-white/60 backdrop-blur-[1px]">
        <div className="mt-10 rounded-md border border-neutral-300 bg-white px-4 py-2 text-xs font-medium text-neutral-600 shadow-sm">
          🔒 Locked until unit economics are valid (§2.1) — the contribution
          math decides whether anything else matters.
        </div>
      </div>
      <fieldset
        disabled
        className="pointer-events-none select-none opacity-60"
      >
        {children}
      </fieldset>
    </div>
  );
}
