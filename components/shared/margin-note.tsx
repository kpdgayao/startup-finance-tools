import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { NOTES } from "@/lib/notes";

interface MarginNoteProps {
  toolId: string;
  noteIndex?: number;
  className?: string;
}

export function MarginNote({ toolId, noteIndex = 0, className }: MarginNoteProps) {
  const notes = NOTES[toolId];
  // A tool with no note content renders nothing — the absence is invisible.
  // Do not render a placeholder.
  if (!notes || notes.length === 0 || noteIndex >= notes.length) return null;
  const note = notes[noteIndex];

  return (
    <aside
      className={cn(
        "border-l-[2px] border-ochre pl-[15px]",
        className
      )}
      aria-label="Editor's note"
    >
      <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ochre-deep dark:text-ochre">
        Note
      </p>
      <div
        className="mt-2 font-serif text-[14.5px] leading-[1.5] text-ink-2 [&_a]:text-link [&_a:hover]:text-ochre-deep [&_a]:underline [&_a]:underline-offset-[3px] [&_code]:font-mono [&_code]:text-[13px]"
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.body}</ReactMarkdown>
      </div>
    </aside>
  );
}
