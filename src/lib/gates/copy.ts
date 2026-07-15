/**
 * Every gate's user-facing copy in one place. Tone per spec: specific,
 * numeric, cites the playbook (meta-ads-playbook.md §refs) — "a senior
 * practitioner who respects the user enough to tell them something they
 * don't want to hear."
 */
type Meta = Record<string, string | number>;

export interface GateCopy {
  title: string;
  playbookRef: string;
  body: (meta: Meta) => string;
}

const n = (meta: Meta, key: string): string => {
  const value = meta[key];
  return typeof value === 'number' ? String(value) : (value ?? '?').toString();
};

export const GATE_COPY: Record<string, GateCopy> = {
  'G-S0-BACKEND-NONE': {
    title: 'No backend data access',
    playbookRef: '§5.1',
    body: () =>
      "Without backend revenue or CRM outcome data, every number you report will be Meta's. Get at least partial read access before spending.",
  },
  'G-S1-BE-ROAS-GT6': {
    title: 'Break-even ROAS above 6x',
    playbookRef: '§2.1–2.2',
    body: (m) =>
      `Break-even ROAS is ${n(m, 'breakEvenRoas')}x. Cold prospecting rarely clears 3–4x. This business likely cannot support paid acquisition as currently structured. Fix price, bundle, freight, or returns before spending — use the what-if levers below.`,
  },
  'G-S1-TARGET-LTE-BREAKEVEN': {
    title: 'Target ROAS at or below break-even',
    playbookRef: '§2.2',
    body: (m) =>
      `Target ROAS (${n(m, 'targetRoas')}x) does not clear break-even (${n(m, 'breakEvenRoas')}x). This is arithmetically impossible to run profitably: the required contribution leaves no room.`,
  },
  'G-S1-BE-ROAS-4TO6': {
    title: 'Break-even ROAS in the 4–6x band',
    playbookRef: '§2.2',
    body: (m) =>
      `Break-even ROAS is ${n(m, 'breakEvenRoas')}x. KETTLE territory: a low-margin product may require a target that cold acquisition cannot reliably support. The remedy is usually price, bundle, costs, retention, or channel — not account edits.`,
  },
  'G-S1-LTVCAC-LT2': {
    title: 'LTV:CAC below 2:1',
    playbookRef: '§2.3',
    body: (m) =>
      `Discounted contribution LTV to allowable CAC is ${n(m, 'ltvToCac')}:1. Below 2:1 the payback risk is carried entirely by retention assumptions — validate cohorts before scaling.`,
  },
  'G-S1-PAYBACK-GT6MO': {
    title: 'Payback beyond 6 months, no cash buffer confirmed',
    playbookRef: '§2.4',
    body: (m) =>
      `Cohort payback is ~${n(m, 'paybackMonths')} months. A profitable cohort can still create a cash crisis: scaling stacks unrecouped cohorts. Confirm the client's cash buffer in Section 1d or reduce planned spend.`,
  },
  'G-S1-SUB-FIRST-ORDER': {
    title: 'First-order ROAS below 1.0x',
    playbookRef: '§2.4',
    body: (m) =>
      `You will report a ${n(m, 'targetRoas')}x first-order ROAS every month and it will be correct. Set this expectation with the client in writing NOW — subscription economics recoup over the cohort, not the first order.`,
  },
  'G-S2-PREREG-EMPTY': {
    title: 'No pre-registration',
    playbookRef: '§7.9',
    body: () =>
      '"What would change our mind, and when will we decide?" is empty. Without a pre-committed decision standard, every result becomes an argument. This is the pre-registration — write it down.',
  },
  'G-S1-AW-NO-GUARDRAIL': {
    title: 'Awareness budget without a spend guardrail',
    playbookRef: '§1.5',
    body: () =>
      'Awareness effects are cumulative and delayed — which is exactly why the spend needs a pre-agreed cap (% of revenue or currency). Without one, "give it more time" becomes an unbounded budget.',
  },
  'G-S5-NO-PURCHASER-EXCLUSION': {
    title: 'Prospecting without a customer exclusion',
    playbookRef: '§3.5',
    body: () =>
      'A prospecting ad set with no purchaser/customer exclusion will pay to advertise to people who already bought.',
  },
  'G-S6-OFFER-BREAKS-ECONOMICS': {
    title: 'This offer breaks the §1 economics',
    playbookRef: '§1.4',
    body: (m) =>
      `This offer changes your economics: break-even ROAS moves from ${n(m, 'before')}x to ${n(m, 'after')}x — past the 6x line the §1 gate holds. The promotion is paying for itself with margin you don't have.`,
  },
  'G-S7-AWARENESS-CONCENTRATION': {
    title: 'Mining the already-aware',
    playbookRef: 'ch. 8',
    body: () =>
      'This creative targets Product/Most-aware buyers — the population that already knows you exist. That population is small, and it is where ceilings come from. Keep unaware/problem-aware concepts in the mix.',
  },
  'G-S8-CONCEPT-CONCENTRATION': {
    title: 'Angle concentration',
    playbookRef: 'ch. 8',
    body: (m) =>
      `Only ${n(m, 'concepts')} distinct creative concept(s) live. Angle concentration is a single point of failure: when the angle dies, every creative built on it dies together. Keep 3+ distinct concepts live.`,
  },
  'G-S9-HOOK-ATTRIBUTES': {
    title: 'Hooks flagged for personal-attributes review',
    playbookRef: 'ch. 12',
    body: (m) =>
      `${n(m, 'count')} hook(s) combine second-person phrasing with sensitive-attribute keywords — e.g. ${n(m, 'examples')}. This is a heuristic aid, not a compliance determination: the rule is contextual, not a keyword ban. A human must review each flagged hook.`,
  },
  'G-S9-SPECIAL-CATEGORY': {
    title: 'Special Ad Category restrictions apply',
    playbookRef: 'ch. 12',
    body: (m) =>
      `${n(m, 'category')} campaigns lose age, gender, and radius targeting, and audience options are restricted. Section 5's demographic fields are disabled accordingly.`,
  },
  'G-S10-REQUIRED-INCOMPLETE': {
    title: 'Experiment plan required but incomplete',
    playbookRef: 'ch. 7',
    body: (m) =>
      `An experiment plan (estimand, design, power, stopping rule, decision rule) is mandatory here: ${n(m, 'reason')}. An experiment is a design with a pre-committed decision — not two rows in a dashboard.`,
  },
  'G-S10-DAYS-GT45': {
    title: 'This test cannot finish in a reasonable window',
    playbookRef: '§7.3',
    body: (m) =>
      `Estimated ${n(m, 'days')} days to complete at this budget. A smaller expected effect requires MORE sample, not less. Either raise the MDE — test something bigger (offer, angle, awareness level), not a button color — or accept this is a ship-and-monitor decision, not a test.`,
  },
  'G-S10-OBSERVATIONAL': {
    title: 'Observational is not a test',
    playbookRef: '§7.2',
    body: () =>
      'Duplicating ad sets is not an experiment: auction overlap and delivery skew will manufacture a winner from noise. Use Meta A/B Test, a geo holdout, or Conversion Lift for a causal read.',
  },
  'G-S11-CHECKOUT-UNTESTED': {
    title: 'Checkout / form not tested end-to-end',
    playbookRef: 'ch. 9',
    body: () =>
      'You are about to pay for traffic into a flow nobody has verified works. Test the checkout/form end-to-end before spending.',
  },
  'G-S11-LCP-SLOW': {
    title: 'Landing page is slow on mobile',
    playbookRef: 'ch. 9',
    body: (m) =>
      `Mobile LCP is ${n(m, 'lcp')}s — above the 2.5s good-experience threshold. Every 100ms is paid traffic bouncing before the page exists.`,
  },
  'G-S11-P90-RESPONSE': {
    title: 'Slow lead response tail',
    playbookRef: 'ch. 10',
    body: (m) =>
      `90th-percentile first response is ~${n(m, 'p90h')} hours. Speed-to-lead is the #1 conversion lever — a day-old lead is nearly dead.`,
  },
  'G-S11-CAPACITY': {
    title: 'Intake is already at capacity',
    playbookRef: 'ch. 10',
    body: (m) =>
      `Capacity utilization is ${n(m, 'utilization')}%. You are about to buy leads the team cannot serve — that money converts to response-time decay, not revenue.`,
  },
  'G-S12-PLATFORM-ROAS-PRIMARY': {
    title: 'Platform ROAS as the primary metric',
    playbookRef: '§2.6',
    body: () =>
      "Platform-attributed ROAS is Meta grading its own homework — fine as a labeled secondary signal, wrong as the primary scoreboard. Lead with contribution after media or new-customer metrics from backend data.",
  },
  'G-S3-PIXEL-FAIL': {
    title: 'Pixel not verified',
    playbookRef: '§5.2',
    body: (m) =>
      m.status === 'fail'
        ? 'The pixel is not in place. Nothing downstream of this form is measurable until it is.'
        : 'Pixel verification is partial. Complete it before trusting any event volume.',
  },
  'G-S3-CAPI-PLATFORM-APP': {
    title: 'Stock platform CAPI app',
    playbookRef: '§5.2',
    body: () =>
      'Stock CAPI apps typically drop ~20% of events and pass minimal match parameters. Plan the move to a server-side integration.',
  },
  'G-S3-DEDUP-FAIL': {
    title: 'event_id deduplication not verified',
    playbookRef: '§5.3',
    body: () =>
      'Browser and server events are not verifiably deduplicated on a stable business ID. Every count downstream is inflated or undercounted in unknown proportion. Fix before launch.',
  },
  'G-S3-EMQ': {
    title: 'Event Match Quality too low',
    playbookRef: '§5.4',
    body: (m) =>
      `EMQ is ${n(m, 'emqScore')}/10. Below ${n(m, 'threshold')} the platform is matching too few events to optimize or report reliably. Pass more parameters (hashed email/phone, fbp/fbc, external_id).`,
  },
  'G-S3-EMQ-WARN': {
    title: 'Event Match Quality is mediocre',
    playbookRef: '§5.4',
    body: (m) =>
      `EMQ is ${n(m, 'emqScore')}/10 — usable but below ${n(m, 'threshold')}. Each missing parameter (hashed email/phone, fbp/fbc, external_id) costs match rate and therefore optimization quality.`,
  },
  'G-S3-RECEIPT-RATIO': {
    title: 'Events do not reconcile with backend',
    playbookRef: '§5.1',
    body: (m) =>
      `Received events ÷ backend records = ${n(m, 'ratio')}. Outside 0.70–1.15 this is a deduplication or pipeline problem. Note: attributed conversions in Ads Manager are NOT expected to equal backend orders — that is a different layer of the four-layer model.`,
  },
  'G-S3-CRM-CAPI': {
    title: 'CRM not connected via Conversions API',
    playbookRef: '§5.7',
    body: () =>
      'Lead gen / B2B economics live in the CRM. Without CRM → CAPI, Meta optimizes to raw form fills and you report Meta\'s numbers. Connect it before spending.',
  },
  'G-S3-PRIVACY': {
    title: 'Privacy prerequisites not in place',
    playbookRef: 'ch. 12',
    body: (m) =>
      `Missing: ${n(m, 'missing')}. DPA, consent gating, and the prohibited-data attestation are non-negotiable — this gate cannot be overridden.`,
  },
  'G-S3-ATTR-NOT-RECORDED': {
    title: 'Attribution setting not recorded',
    playbookRef: '§6.1',
    body: () =>
      'If the attribution setting is not written down now, next quarter\'s comparison will silently span a definition change and the trend will be fiction.',
  },
  'G-S3-VIEWTHROUGH-GT50': {
    title: 'View-through majority',
    playbookRef: '§6.2',
    body: (m) =>
      `${n(m, 'share')}% of historical conversions are view-through — people who never touched the ad. Recompute on click-through only before trusting this campaign's numbers.`,
  },
  'G-S4-CBO-MIXED-FUNNEL': {
    title: 'CBO with prospecting + retargeting together',
    playbookRef: '§4.3',
    body: () =>
      "Campaign-level allocation chases attributed ROAS. Retargeting's attributed ROAS is inflated by selection, so CBO will starve prospecting and shut off the top of the funnel. Use separate campaigns.",
  },
  'G-S4-ADSETS-EXCEED': {
    title: 'More ad sets than the budget can feed',
    playbookRef: '§3.3',
    body: (m) =>
      `This budget supports ${n(m, 'maxSupportable')} ad set(s) at your target CPA. You have declared ${n(m, 'declared')}. Every ad set below ~50 optimization events/week is delivery-unstable and will produce data that looks usable but isn't. Consolidate.`,
  },
  'G-S4-LEARNING-INFEASIBLE': {
    title: 'Learning phase is structurally out of reach',
    playbookRef: '§3.3',
    body: (m) =>
      `At this budget and CPA the account projects ${n(m, 'weeklyEvents')} optimization events/week — it can never exit learning on this event. That is a structural property of the business, not a budget problem. Options: (a) a validated upstream proxy event, (b) value-based optimization, (c) 30–90 day decision windows with explicit uncertainty. Do NOT optimize to a high-volume proxy just to make the status label say Active. Set a decision window and send the uncertainty disclosure below.`,
  },
  'G-S4-EVENT-VOLUME-LT50': {
    title: 'Expected event volume below 50/week',
    playbookRef: '§3.3',
    body: (m) =>
      `You expect ${n(m, 'volume')} optimization events/week — below Meta's ~50/week learning guideline. Delivery will stay exploratory; treat early numbers as unstable.`,
  },
};
