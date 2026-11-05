"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { CircleAlert, CircleCheck, ClipboardList, ListTodo, LoaderCircle, Pencil, Trash2 } from "lucide-react";
import type { Task } from "./model";
import type { CreateTaskInput } from "./schemas";
import { TaskForm } from "./task-form";
import { getTaskErrorMessage, isTaskNotFound } from "./error-message";
import { trpcClient } from "@/trpc/client";

type Feedback = { kind: "success" | "error"; message: string };
type TaskDialog = { kind: "edit" | "delete"; task: Task } | null;

const dateFormatter = new Intl.DateTimeFormat("en", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

export function TaskManager({ tasks }: { tasks: Task[] }) {
  const router = useRouter();
  const [activeDialog, setActiveDialog] = useState<TaskDialog>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isRefreshing, startTransition] = useTransition();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const focusListAfterCloseRef = useRef(false);
  const focusEditAfterRefreshRef = useRef<string | null>(null);
  const dialogPending = deletingId !== null || isUpdating;
  const busy = dialogPending || isRefreshing;

  useEffect(() => {
    if (activeDialog || isRefreshing || !focusEditAfterRefreshRef.current) return;
    const button = document.getElementById(focusEditAfterRefreshRef.current);
    if (button) {
      button.focus({ preventScroll: true });
      focusEditAfterRefreshRef.current = null;
    }
  }, [activeDialog, isRefreshing, tasks]);

  function refreshTasks() {
    startTransition(() => router.refresh());
  }

  function openTaskDialog(kind: "edit" | "delete", task: Task, trigger: HTMLButtonElement) {
    triggerRef.current = trigger;
    focusListAfterCloseRef.current = false;
    focusEditAfterRefreshRef.current = null;
    setDeleteError(null);
    setActiveDialog({ kind, task });
  }

  function closeTaskDialog() {
    if (dialogPending) return;
    setActiveDialog(null);
    setDeleteError(null);
  }

  async function createTask(values: CreateTaskInput) {
    setFeedback(null);
    await trpcClient.tasks.create.mutate({
      title: values.title,
      ...(values.description?.trim() && { description: values.description }),
    });
    setFeedback({ kind: "success", message: "Task created." });
    refreshTasks();
  }

  async function updateTask(task: Task, values: CreateTaskInput) {
    setFeedback(null);
    setIsUpdating(true);
    try {
      await trpcClient.tasks.update.mutate({
        id: task.id,
        title: values.title,
        description: values.description ?? "",
      });
    } catch (error) {
      if (isTaskNotFound(error)) refreshTasks();
      throw error;
    } finally {
      setIsUpdating(false);
    }
    setFeedback({ kind: "success", message: "Task updated." });
    refreshTasks();
  }

  async function deleteTask(task: Task) {
    if (busy) return;
    setDeleteError(null);
    setDeletingId(task.id);
    try {
      await trpcClient.tasks.delete.mutate({ id: task.id });
      setFeedback({ kind: "success", message: "Task deleted." });
      focusListAfterCloseRef.current = true;
      setActiveDialog(null);
      refreshTasks();
    } catch (error) {
      setDeleteError(getTaskErrorMessage(error, "delete"));
      if (isTaskNotFound(error)) refreshTasks();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="grid min-w-0 items-start gap-8 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)] lg:gap-10">
      <section aria-labelledby="create-task-heading" className="rounded-2xl border border-line bg-surface p-5 shadow-[0_8px_30px_rgba(55,42,30,0.04)] sm:p-6 lg:sticky lg:top-8">
        <div className="mb-6 flex items-center gap-3">
          <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-white">
            <ListTodo size={20} strokeWidth={2} />
          </span>
          <h2 id="create-task-heading" className="text-xl font-semibold tracking-tight text-ink">
            Add a task
          </h2>
        </div>
        <TaskForm mode="create" onSubmit={createTask} disabled={busy} />
      </section>

      <section aria-labelledby="tasks-heading" className="min-w-0">
        <div className="mb-5 flex items-center justify-between gap-4 border-b border-line pb-4">
          <h2 id="tasks-heading" tabIndex={-1} className="text-xl font-semibold tracking-tight text-ink">Tasks</h2>
          {isRefreshing && (
            <span aria-hidden="true" className="inline-flex items-center gap-2 text-sm text-muted">
              <LoaderCircle size={16} className="motion-safe:animate-spin" />
              Updating list…
            </span>
          )}
        </div>

        {feedback && (
          <p
            role={feedback.kind === "error" ? "alert" : "status"}
            className={`mb-5 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm font-medium leading-6 ${
              feedback.kind === "error"
                ? "border-[#e8c5c1] bg-[#fff3f0] text-[#a43227]"
                : "border-[#cbded0] bg-[#f2f8f2] text-[#245b43]"
            }`}
          >
            {feedback.kind === "error" ? (
              <CircleAlert aria-hidden="true" size={18} className="mt-1 shrink-0" />
            ) : (
              <CircleCheck aria-hidden="true" size={18} className="mt-1 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </p>
        )}

        {tasks.length === 0 ? (
          <div className="rounded-2xl border border-line bg-surface px-6 py-14 text-center shadow-[0_8px_30px_rgba(55,42,30,0.04)]">
            <span aria-hidden="true" className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-[#fff0e8] text-[#a63300]">
              <ClipboardList size={25} strokeWidth={1.8} />
            </span>
            <p className="text-lg font-semibold tracking-tight text-ink">No tasks yet</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Tasks you add will appear here.
            </p>
          </div>
        ) : (
          <ul className="space-y-4" aria-busy={isRefreshing}>
            {tasks.map((task) => (
              <li key={task.id} className="min-w-0">
                <article className="min-w-0 rounded-2xl border border-line bg-surface p-5 shadow-[0_8px_30px_rgba(55,42,30,0.04)] sm:p-6">
                  <h3 className="text-lg font-semibold leading-7 tracking-tight text-ink [overflow-wrap:anywhere]">
                    {task.title}
                  </h3>
                  {task.description && (
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted [overflow-wrap:anywhere]">
                      {task.description}
                    </p>
                  )}
                  <div className="mt-5 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs font-medium text-muted">
                      Created{" "}
                      <time dateTime={task.createdAt}>
                        {dateFormatter.format(new Date(task.createdAt))}
                      </time>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        id={`edit-task-${task.id}`}
                        type="button"
                        onClick={(event) => openTaskDialog("edit", task, event.currentTarget)}
                        disabled={busy}
                        aria-label={`Edit ${task.title}`}
                        className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink motion-safe:transition-colors hover:bg-[#f5f0e8] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Pencil aria-hidden="true" size={16} strokeWidth={1.9} />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={(event) => openTaskDialog("delete", task, event.currentTarget)}
                        disabled={busy}
                        aria-label={`Delete ${task.title}`}
                        className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 py-2 text-sm font-semibold text-[#a43227] motion-safe:transition-colors hover:border-[#e8c5c1] hover:bg-[#fff3f0] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Trash2 aria-hidden="true" size={16} strokeWidth={1.9} />
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog.Root
        open={activeDialog !== null}
        onOpenChange={(open) => {
          if (!open) closeTaskDialog();
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-[#24211d]/45" />
          <Dialog.Content
            role={activeDialog?.kind === "delete" ? "alertdialog" : "dialog"}
            className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[31rem] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-line bg-surface p-5 shadow-[0_24px_70px_rgba(36,33,29,0.20)] sm:p-7"
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              if (activeDialog?.kind === "delete") {
                cancelRef.current?.focus({ preventScroll: true });
              } else {
                document.querySelector<HTMLInputElement>('[role="dialog"] input[name="title"]')
                  ?.focus({ preventScroll: true });
              }
            }}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              if (focusEditAfterRefreshRef.current) return;
              if (focusListAfterCloseRef.current || !triggerRef.current?.isConnected) {
                document.getElementById("tasks-heading")?.focus();
              } else {
                triggerRef.current.focus();
              }
              focusListAfterCloseRef.current = false;
            }}
            onEscapeKeyDown={(event) => {
              if (dialogPending) event.preventDefault();
            }}
            onInteractOutside={(event) => {
              if (dialogPending) event.preventDefault();
            }}
          >
            {activeDialog?.kind === "edit" && (
              <>
                <Dialog.Title className="text-xl font-semibold tracking-tight text-ink">
                  Edit task
                </Dialog.Title>
                <Dialog.Description className="mb-6 mt-2 text-sm leading-6 text-muted">
                  Update this task&apos;s title and description.
                </Dialog.Description>
                <TaskForm
                  key={activeDialog.task.id}
                  mode="edit"
                  initialTitle={activeDialog.task.title}
                  initialDescription={activeDialog.task.description}
                  disabled={busy}
                  onSubmit={(values) => updateTask(activeDialog.task, values)}
                  onSuccess={() => {
                    focusEditAfterRefreshRef.current = `edit-task-${activeDialog.task.id}`;
                    setActiveDialog(null);
                  }}
                  onCancel={closeTaskDialog}
                />
              </>
            )}

            {activeDialog?.kind === "delete" && (
              <>
                <Dialog.Title className="text-xl font-semibold tracking-tight text-ink">
                  Delete task?
                </Dialog.Title>
                <Dialog.Description className="mt-3 text-sm leading-6 text-muted [overflow-wrap:anywhere]">
                  Are you sure you want to delete &apos;{activeDialog.task.title}&apos;? This action cannot be undone.
                </Dialog.Description>
                {deleteError && (
                  <p role="alert" className="mt-5 rounded-xl border border-[#e8c5c1] bg-[#fff3f0] px-4 py-3 text-sm font-medium text-[#a43227]">
                    {deleteError}
                  </p>
                )}
                <div className="mt-7 flex flex-wrap justify-end gap-2">
                  <button
                    ref={cancelRef}
                    type="button"
                    onClick={closeTaskDialog}
                    disabled={dialogPending}
                    className="focus-ring min-h-11 rounded-xl border border-line bg-surface px-5 py-2.5 text-sm font-semibold text-ink motion-safe:transition-colors enabled:hover:bg-[#f5f0e8] disabled:cursor-not-allowed disabled:bg-[#f5f0e8]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteTask(activeDialog.task)}
                    disabled={dialogPending}
                    className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#a43227] px-5 py-2.5 text-sm font-semibold text-white motion-safe:transition-colors enabled:hover:bg-[#8c2b22] disabled:cursor-not-allowed disabled:bg-[#815a54]"
                  >
                    {deletingId === activeDialog.task.id ? (
                      <LoaderCircle aria-hidden="true" size={17} className="motion-safe:animate-spin" />
                    ) : (
                      <Trash2 aria-hidden="true" size={17} />
                    )}
                    {deletingId === activeDialog.task.id ? "Deleting…" : "Delete task"}
                  </button>
                </div>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
