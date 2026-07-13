import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  useBoard,
  useClaimLead,
  usePipelineStats,
  useReleaseLead,
  useUpdateStage,
} from '../api/queries';
import { initials } from '../lib/initials';
import { timeAgo } from '../lib/time';
import type { CrmLead, PipelineStage } from '../types/leads';

const STAGE_LABELS: Record<PipelineStage, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified',
  WON: 'Won',
  LOST: 'Lost',
};

/** A card "rots" when untouched this long (ms). */
const ROTTING_THRESHOLD_MS = 2 * 24 * 60 * 60_000;

export function PipelinePage() {
  const board = useBoard();
  const stats = usePipelineStats();
  const updateStage = useUpdateStage();
  const claimLead = useClaimLead();
  const releaseLead = useReleaseLead();

  const [activeLead, setActiveLead] = useState<CrmLead | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const leadsByStage = useMemo(() => {
    const map = new Map<PipelineStage, CrmLead[]>();
    for (const lead of board.data?.leads ?? []) {
      if (!lead.pipelineStage) continue;
      const list = map.get(lead.pipelineStage) ?? [];
      list.push(lead);
      map.set(lead.pipelineStage, list);
    }
    return map;
  }, [board.data]);

  const stages = stats.data?.stages.map((entry) => entry.stage) ?? [];

  const onDragStart = (event: DragStartEvent) => {
    const lead = board.data?.leads.find((l) => l.id === event.active.id);
    setActiveLead(lead ?? null);
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveLead(null);
    const leadId = String(event.active.id);
    const stage = event.over?.id as PipelineStage | undefined;
    const lead = board.data?.leads.find((l) => l.id === leadId);
    if (!stage || !lead || lead.pipelineStage === stage) {
      return;
    }
    setNotice(null);
    updateStage.mutate(
      { leadId, stage },
      { onError: (error) => setNotice(error.message) },
    );
  };

  return (
    <div>
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-neutral-900">Pipeline</h2>
        <p className="text-sm text-neutral-500">
          Shared queue — cards show claim state, not fixed assignment.
        </p>
      </header>

      {notice && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          {notice}
        </div>
      )}

      <StatsHeader />

      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-2">
          {stages.map((stage) => (
            <StageColumn
              key={stage}
              stage={stage}
              leads={leadsByStage.get(stage) ?? []}
              onClaim={(leadId) =>
                claimLead.mutate(
                  { leadId },
                  { onError: (error) => setNotice(error.message) },
                )
              }
              onRelease={(leadId) =>
                releaseLead.mutate(
                  { leadId },
                  { onError: (error) => setNotice(error.message) },
                )
              }
            />
          ))}
          {stages.length === 0 && board.isLoading && (
            <div className="w-full rounded-lg border border-dashed border-neutral-300 bg-white px-4 py-10 text-center text-sm text-neutral-400">
              Loading board…
            </div>
          )}
        </div>
        <DragOverlay>
          {activeLead && (
            <div className="w-56 rotate-2 opacity-90">
              <LeadCard lead={activeLead} dragging />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function StatsHeader() {
  const stats = usePipelineStats();
  const data = stats.data;

  const tiles = [
    {
      label: 'Unclaimed leads',
      value: data ? String(data.unclaimedCount) : '—',
      alert: (data?.unclaimedCount ?? 0) > 0,
    },
    {
      label: 'Oldest unclaimed',
      value: data?.oldestUnclaimedAgeSeconds
        ? formatDuration(data.oldestUnclaimedAgeSeconds)
        : '—',
      alert: (data?.oldestUnclaimedAgeSeconds ?? 0) > 2 * 3600,
    },
    {
      label: 'Avg time-to-claim (7d)',
      value: data?.avgTimeToClaimSeconds7d
        ? formatDuration(data.avgTimeToClaimSeconds7d)
        : '—',
      alert: false,
    },
    {
      label: 'Qualified rate (7d)',
      value:
        data?.qualifiedRate7d != null
          ? `${Math.round(data.qualifiedRate7d * 100)}%`
          : '—',
      alert: false,
    },
  ];

  return (
    <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="rounded-lg border border-neutral-200 bg-white px-4 py-3"
        >
          <div
            className={`text-xl font-bold tabular-nums ${
              tile.alert ? 'text-red-600' : 'text-neutral-900'
            }`}
          >
            {tile.value}
          </div>
          <div className="text-[11px] uppercase tracking-wide text-neutral-400">
            {tile.label}
          </div>
        </div>
      ))}
    </div>
  );
}

function StageColumn({
  stage,
  leads,
  onClaim,
  onRelease,
}: {
  stage: PipelineStage;
  leads: CrmLead[];
  onClaim: (leadId: string) => void;
  onRelease: (leadId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div
      ref={setNodeRef}
      className={`w-60 shrink-0 rounded-lg border bg-white p-2 transition-colors ${
        isOver ? 'border-neutral-500 bg-neutral-50' : 'border-neutral-200'
      }`}
    >
      <div className="mb-2 flex items-center justify-between border-b border-neutral-100 px-1 pb-2">
        <span className="text-xs font-semibold text-neutral-700">
          {STAGE_LABELS[stage]}
        </span>
        <span className="text-xs text-neutral-400">{leads.length}</span>
      </div>
      <div className="min-h-16 space-y-2">
        {leads.map((lead) => (
          <DraggableCard
            key={lead.id}
            lead={lead}
            onClaim={() => onClaim(lead.id)}
            onRelease={() => onRelease(lead.id)}
          />
        ))}
      </div>
    </div>
  );
}

function DraggableCard({
  lead,
  onClaim,
  onRelease,
}: {
  lead: CrmLead;
  onClaim: () => void;
  onRelease: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: lead.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={isDragging ? 'opacity-40' : ''}
    >
      <LeadCard lead={lead} onClaim={onClaim} onRelease={onRelease} />
    </div>
  );
}

function LeadCard({
  lead,
  dragging,
  onClaim,
  onRelease,
}: {
  lead: CrmLead;
  dragging?: boolean;
  onClaim?: () => void;
  onRelease?: () => void;
}) {
  const lastTouch = lead.lastActivityAt ?? lead.stageEnteredAt;
  const rotting =
    !dragging &&
    lastTouch != null &&
    Date.now() - new Date(lastTouch).getTime() > ROTTING_THRESHOLD_MS &&
    (lead.pipelineStage === 'NEW' || lead.pipelineStage === 'CONTACTED');

  return (
    <div
      className={`rounded-md border p-2.5 text-xs shadow-sm ${
        rotting
          ? 'border-red-300 bg-red-50'
          : lead.claimedBy
            ? 'border-neutral-300 bg-white'
            : 'border-dashed border-neutral-300 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-1">
        <Link
          to={`/leads/${lead.id}`}
          className="font-semibold text-neutral-900 hover:underline"
          onPointerDown={(event) => event.stopPropagation()}
        >
          {lead.fullName ?? 'Unknown'}
        </Link>
        {lead.claimedBy && (
          <span
            title={lead.claimedBy.displayName}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold text-white"
            style={{
              backgroundColor: lead.claimedBy.avatarColor ?? '#6b7280',
            }}
          >
            {initials(lead.claimedBy.displayName)}
          </span>
        )}
      </div>
      <div className="mt-1 truncate text-[10px] text-neutral-500">
        {lead.campaignName ?? lead.adName ?? lead.platform}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span
          className={`text-[10px] ${rotting ? 'font-semibold text-red-600' : 'text-neutral-400'}`}
        >
          {lead.stageEnteredAt ? `${timeAgo(lead.stageEnteredAt)} in stage` : ''}
          {rotting && ' — stalling'}
        </span>
        {!dragging &&
          (lead.claimedBy ? (
            rotting && (
              <button
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={onRelease}
                className="rounded border border-neutral-300 px-1.5 py-0.5 text-[9px] text-neutral-500 hover:bg-neutral-50"
              >
                Release
              </button>
            )
          ) : (
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={onClaim}
              className="rounded border border-neutral-300 px-1.5 py-0.5 text-[9px] text-neutral-600 hover:bg-neutral-50"
            >
              Claim
            </button>
          ))}
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 3600) return `${Math.max(1, Math.round(seconds / 60))}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  const days = Math.floor(seconds / 86400);
  const hours = Math.round((seconds % 86400) / 3600);
  return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
}
