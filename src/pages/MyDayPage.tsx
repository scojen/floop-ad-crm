import { Link } from 'react-router';
import { useCompleteTask, useTasks } from '../api/queries';
import { initials } from '../lib/initials';
import { timeAgo } from '../lib/time';
import type { CrmTask, TaskBucket } from '../types/v15';

const BUCKETS: { bucket: TaskBucket; label: string; accent: string }[] = [
  { bucket: 'overdue', label: 'Overdue', accent: 'text-red-600' },
  { bucket: 'today', label: 'Due today', accent: 'text-amber-600' },
  { bucket: 'upcoming', label: 'Upcoming', accent: 'text-neutral-500' },
];

/** Rep-facing to-do queue — a list, not a board (spec §2F). */
export function MyDayPage() {
  return (
    <div>
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-neutral-900">My Day</h2>
        <p className="text-sm text-neutral-500">
          Follow-ups across the shared queue, most urgent first.
        </p>
      </header>
      <div className="space-y-5">
        {BUCKETS.map(({ bucket, label, accent }) => (
          <TaskBucketSection
            key={bucket}
            bucket={bucket}
            label={label}
            accent={accent}
          />
        ))}
      </div>
    </div>
  );
}

function TaskBucketSection({
  bucket,
  label,
  accent,
}: {
  bucket: TaskBucket;
  label: string;
  accent: string;
}) {
  const tasks = useTasks(bucket);
  const completeTask = useCompleteTask();

  return (
    <section className="rounded-lg border border-neutral-200 bg-white">
      <h3
        className={`border-b border-neutral-100 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide ${accent}`}
      >
        {label}
        {tasks.data && (
          <span className="ml-2 font-normal text-neutral-400">
            {tasks.data.tasks.length}
          </span>
        )}
      </h3>
      <div className="divide-y divide-neutral-100">
        {tasks.isLoading && (
          <p className="px-4 py-3 text-sm text-neutral-400">Loading…</p>
        )}
        {tasks.data?.tasks.length === 0 && (
          <p className="px-4 py-3 text-sm text-neutral-300">Nothing here.</p>
        )}
        {tasks.data?.tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            onComplete={() => completeTask.mutate({ taskId: task.id, bucket })}
          />
        ))}
      </div>
    </section>
  );
}

function TaskRow({
  task,
  onComplete,
}: {
  task: CrmTask;
  onComplete: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <input
        type="checkbox"
        checked={false}
        onChange={onComplete}
        title="Mark done"
        className="h-4 w-4 accent-neutral-700"
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-neutral-800">{task.title}</div>
        <div className="text-xs text-neutral-400">
          <Link
            to={`/leads/${task.lead.id}`}
            className="text-neutral-500 hover:underline"
          >
            {task.lead.fullName ?? 'Unknown lead'}
          </Link>
          {task.lead.campaignName && ` · ${task.lead.campaignName}`}
          {task.lead.pipelineStage &&
            ` · ${task.lead.pipelineStage.toLowerCase()}`}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-xs tabular-nums text-neutral-500">
          {formatDue(task.dueAt)}
        </div>
        {task.assignee ? (
          <span
            title={task.assignee.displayName}
            className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-semibold text-white"
            style={{
              backgroundColor: task.assignee.avatarColor ?? '#6b7280',
            }}
          >
            {initials(task.assignee.displayName)}
          </span>
        ) : (
          <span className="text-[10px] text-neutral-300">unassigned</span>
        )}
      </div>
    </div>
  );
}

function formatDue(iso: string): string {
  const due = new Date(iso);
  const now = new Date();
  if (due < now) {
    return `${timeAgo(iso)} overdue`;
  }
  const sameDay = due.toDateString() === now.toDateString();
  if (sameDay) {
    return due.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }
  return due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
