"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Check, LoaderCircle, Plus } from "lucide-react";
import { createTaskSchema, type CreateTaskInput } from "./schemas";
import { getTaskErrorMessage } from "./error-message";

type TaskFormProps = {
  mode: "create" | "edit";
  initialTitle?: string;
  initialDescription?: string;
  disabled?: boolean;
  onSubmit: (values: CreateTaskInput) => Promise<void>;
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function TaskForm({
  mode,
  initialTitle = "",
  initialDescription = "",
  disabled = false,
  onSubmit,
  onSuccess,
  onCancel,
}: TaskFormProps) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const busy = isPending || disabled;
  const submitLabel = mode === "create" ? "Add task" : "Save changes";
  const pendingLabel = mode === "create" ? "Adding…" : "Saving…";

  useEffect(() => {
    if (mode === "edit") titleRef.current?.focus({ preventScroll: true });
  }, [mode]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const result = createTaskSchema.safeParse({ title, description });
    if (!result.success) {
      setTitleError(
        result.error.issues.find((issue) => issue.path[0] === "title")
          ?.message ?? "Please check the task details.",
      );
      titleRef.current?.focus();
      return;
    }

    setTitleError(null);
    setSubmitError(null);
    setIsPending(true);

    try {
      await onSubmit(result.data);
      if (mode === "create") {
        setTitle("");
        setDescription("");
      }
      onSuccess?.();
    } catch (error) {
      setSubmitError(getTaskErrorMessage(error, mode === "create" ? "create" : "update"));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} aria-busy={isPending} className="space-y-5">
      <div>
        <label htmlFor={`${id}-title`} className="block text-sm font-semibold text-ink">
          Title <span aria-hidden="true" className="text-[#b43800]">*</span>
        </label>
        <input
          ref={titleRef}
          id={`${id}-title`}
          name="title"
          type="text"
          required
          placeholder="What needs to be done?"
          value={title}
          disabled={busy}
          aria-invalid={titleError ? true : undefined}
          aria-describedby={titleError ? `${id}-title-error` : undefined}
          onChange={(event) => {
            setTitle(event.target.value);
            setTitleError(null);
            setSubmitError(null);
          }}
          className="focus-ring mt-2 block min-h-11 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-base text-ink placeholder:text-[#81796f] disabled:cursor-not-allowed disabled:bg-[#f5f0e8]"
        />
        {titleError && (
          <p id={`${id}-title-error`} role="alert" className="mt-2 text-sm font-medium text-[#a43227]">
            {titleError}
          </p>
        )}
      </div>

      <div>
        <label htmlFor={`${id}-description`} className="block text-sm font-semibold text-ink">
          Description <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea
          id={`${id}-description`}
          name="description"
          rows={4}
          placeholder="Add a few details, if useful."
          value={description}
          disabled={busy}
          onChange={(event) => {
            setDescription(event.target.value);
            setSubmitError(null);
          }}
          className="focus-ring mt-2 block w-full resize-y rounded-xl border border-line bg-white px-3.5 py-3 text-base leading-6 text-ink placeholder:text-[#81796f] disabled:cursor-not-allowed disabled:bg-[#f5f0e8]"
        />
      </div>

      {submitError && (
        <p role="alert" className="rounded-xl border border-[#e8c5c1] bg-[#fff3f0] px-4 py-3 text-sm font-medium text-[#a43227]">
          {submitError}
        </p>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="submit"
          disabled={busy}
          className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-action px-5 py-2.5 text-sm font-semibold text-white motion-safe:transition-colors enabled:hover:bg-[#c73b00] enabled:active:bg-[#b83700] disabled:cursor-not-allowed disabled:bg-[#8f6654] disabled:text-white"
        >
          {isPending ? (
            <LoaderCircle aria-hidden="true" size={17} className="motion-safe:animate-spin" />
          ) : mode === "create" ? (
            <Plus aria-hidden="true" size={17} strokeWidth={2} />
          ) : (
            <Check aria-hidden="true" size={17} strokeWidth={2} />
          )}
          {isPending ? pendingLabel : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="focus-ring min-h-11 rounded-xl border border-line bg-surface px-5 py-2.5 text-sm font-semibold text-ink motion-safe:transition-colors hover:bg-[#f5f0e8] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
