"use client";

import { useId, useState, type FormEvent } from "react";
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
  const id = useId();
  const busy = isPending || disabled;
  const submitLabel = mode === "create" ? "Add task" : "Save changes";
  const pendingLabel = mode === "create" ? "Adding…" : "Saving…";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const result = createTaskSchema.safeParse({ title, description });
    if (!result.success) {
      setTitleError(
        result.error.issues.find((issue) => issue.path[0] === "title")
          ?.message ?? "Please check the task details.",
      );
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
    <form noValidate onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor={`${id}-title`} className="block text-sm font-medium">
          Title <span aria-hidden="true">*</span>
        </label>
        <input
          id={`${id}-title`}
          name="title"
          type="text"
          required
          value={title}
          disabled={busy}
          aria-invalid={titleError ? true : undefined}
          aria-describedby={titleError ? `${id}-title-error` : undefined}
          onChange={(event) => {
            setTitle(event.target.value);
            setTitleError(null);
            setSubmitError(null);
          }}
          className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:bg-slate-100"
        />
        {titleError && (
          <p id={`${id}-title-error`} role="alert" className="mt-1 text-sm text-red-700">
            {titleError}
          </p>
        )}
      </div>

      <div>
        <label htmlFor={`${id}-description`} className="block text-sm font-medium">
          Description <span className="font-normal text-slate-500">(optional)</span>
        </label>
        <textarea
          id={`${id}-description`}
          name="description"
          rows={3}
          value={description}
          disabled={busy}
          onChange={(event) => {
            setDescription(event.target.value);
            setSubmitError(null);
          }}
          className="mt-1 block w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:bg-slate-100"
        />
      </div>

      {submitError && (
        <p role="alert" className="text-sm text-red-700">
          {submitError}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? pendingLabel : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
