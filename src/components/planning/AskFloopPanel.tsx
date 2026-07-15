/**
 * "Ask Floop" — a chat drawer grounded on the current brief. Floop reads
 * the brief via its mcp_get_campaign_brief tool and explains gates /
 * numbers against the playbook in its knowledge base. Floop advises;
 * the form's calc engine and gates remain the source of truth.
 */
import { useEffect, useRef, useState } from 'react';
import { CLIENT_ID } from '../../api/crmClient';
import { askFloop, floopConfigured } from '../../api/floopClient';

interface ChatMessage {
  role: 'user' | 'floop' | 'error';
  text: string;
}

const SUGGESTIONS = [
  'Why is this brief blocked?',
  'Explain the break-even ROAS number to the client in one paragraph.',
  'What would you try first to fix the economics?',
];

export function AskFloopPanel({
  briefId,
  briefName,
}: {
  briefId: string;
  briefName: string;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, pending]);

  if (!floopConfigured) return null;

  const send = (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || pending) return;
    setInput('');
    setMessages((current) => [...current, { role: 'user', text }]);
    setPending(true);

    // Ground every message: brief + client ids and the instruction to read
    // the brief through MCP rather than guessing.
    const grounded = `[Context: campaign preparation brief "${briefName}" (briefId ${briefId}) for clientId ${CLIENT_ID}. Read it with mcp_get_campaign_brief before answering; explain gates using their playbook § references. Do not recompute the derived numbers — explain them.]\n\n${text}`;

    askFloop(grounded, `brief:${briefId}`)
      .then((reply) =>
        setMessages((current) => [
          ...current,
          { role: 'floop', text: reply.message },
        ]),
      )
      .catch((error: Error) =>
        setMessages((current) => [
          ...current,
          {
            role: 'error',
            text: `Floop is unavailable (${error.message}). The form works without it.`,
          },
        ]),
      )
      .finally(() => setPending(false));
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-16 right-4 z-40 flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-3.5 py-2 text-sm font-medium text-neutral-700 shadow-md hover:border-neutral-500 lg:bottom-4"
        title="Ask Floop about this brief"
      >
        ✳ Ask Floop
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/20"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex h-full w-full max-w-md flex-col bg-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold text-neutral-900">
                  ✳ Ask Floop
                </h3>
                <p className="text-[11px] text-neutral-400">
                  Grounded on “{briefName}” — Floop explains; the form decides.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-neutral-400 hover:text-neutral-600"
              >
                ✕
              </button>
            </header>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.length === 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-neutral-400">
                    Try one of these:
                  </p>
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => send(suggestion)}
                      className="block w-full rounded-md border border-neutral-200 px-3 py-2 text-left text-xs text-neutral-600 hover:border-neutral-400"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={
                    message.role === 'user'
                      ? 'ml-8 rounded-lg bg-neutral-800 px-3 py-2 text-sm text-white'
                      : message.role === 'floop'
                        ? 'mr-4 whitespace-pre-wrap rounded-lg bg-neutral-100 px-3 py-2 text-sm text-neutral-800'
                        : 'rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800'
                  }
                >
                  {message.text}
                </div>
              ))}
              {pending && (
                <div className="mr-4 rounded-lg bg-neutral-100 px-3 py-2 text-sm text-neutral-400">
                  Floop is reading the brief…
                </div>
              )}
            </div>

            <div className="border-t border-neutral-100 p-3">
              <div className="flex gap-2">
                <textarea
                  rows={2}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      send();
                    }
                  }}
                  placeholder="Ask about gates, numbers, or what to do next…"
                  className="flex-1 resize-none rounded-md border border-neutral-200 px-2.5 py-1.5 text-sm outline-none focus:border-neutral-500"
                />
                <button
                  type="button"
                  disabled={pending || !input.trim()}
                  onClick={() => send()}
                  className="self-end rounded-md bg-neutral-800 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
                >
                  →
                </button>
              </div>
              <p className="mt-1.5 text-[10px] text-neutral-300">
                Floop reads this brief via MCP and cites the playbook. It never
                changes gates or numbers.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
