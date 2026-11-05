"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Task } from "./model";
import type { CreateTaskInput } from "./schemas";
import { TaskForm } from "./task-form";
import { getTaskErrorMessage, isTaskNotFound } from "./error-message";
import { trpcClient } from "@/trpc/client";

type Feedback = { kind: "success" | "error"; message: string };

const dateFormatter = new Intl.DateTimeFormat("en", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

export function TaskManager({ tasks }: { tasks: Task[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isRefreshing, startTransition] = useTransition();
  const busy = deletingId !== null || isRefreshing;

  function refreshTasks() {
    startTransition(() => router.refresh());
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
    try {
      await trpcClient.tasks.update.mutate({
        id: task.id,
        title: values.title,
        description: values.description ?? "",
      });
    } catch (error) {
      if (isTaskNotFound(error)) {
        setFeedback({ kind: "error", message: getTaskErrorMessage(error, "update") });
        setEditingId(null);
        refreshTasks();
      }
      throw error;
    }
    setFeedback({ kind: "success", message: "Task updated." });
    refreshTasks();
  }

  async function deleteTask(task: Task) {
    if (busy || !window.confirm(`Delete "${task.title}"? This cannot be undone.`)) {
      return;
    }

    setFeedback(null);
    setDeletingId(task.id);
    try {
      await trpcClient.tasks.delete.mutate({ id: task.id });
      if (editingId === task.id) setEditingId(null);
      setFeedback({ kind: "success", message: "Task deleted." });
      refreshTasks();
    } catch (error) {
      setFeedback({ kind: "error", message: getTaskErrorMessage(error, "delete") });
      if (isTaskNotFound(error)) refreshTasks();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <section aria-labelledby="create-task-heading" className="mb-12 rounded-lg border border-slate-200 bg-white p-5">
        <h2 id="create-task-heading" className="mb-5 text-lg font-semibold">
          Add a task
        </h2>
        <TaskForm mode="create" onSubmit={createTask} disabled={busy} />
      </section>

      <section aria-labelledby="tasks-heading">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 id="tasks-heading" className="text-lg font-semibold">Tasks</h2>
          {isRefreshing && <p role="status" className="text-sm text-slate-500">Updating list…</p>}
        </div>

        {feedback && (
          <p
            role={feedback.kind === "error" ? "alert" : "status"}
            className={`mb-5 rounded-md border px-4 py-3 text-sm ${
              feedback.kind === "error"
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-slate-200 bg-slate-50 text-slate-800"
            }`}
          >
            {feedback.message}
          </p>
        )}

        {tasks.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white px-6 py-10 text-center">
            <p className="font-medium">No tasks yet</p>
            <p className="mt-2 text-sm text-slate-600">
              Tasks you add will appear here.
            </p>
          </div>
        ) : (
          <ul className="space-y-3" aria-busy={isRefreshing}>
            {tasks.map((task) => (
              <li key={task.id}>
                <article className="rounded-lg border border-slate-200 bg-white p-5">
                  {editingId === task.id ? (
                    <>
                      <h3 className="mb-4 font-medium">Edit task</h3>
                      <TaskForm
                        mode="edit"
                        initialTitle={task.title}
                        initialDescription={task.description}
                        disabled={busy}
                        onSubmit={(values) => updateTask(task, values)}
                        onSuccess={() => setEditingId(null)}
                        onCancel={() => setEditingId(null)}
                      />
                    </>
                  ) : (
                    <>
                      <h3 className="font-medium">{task.title}</h3>
                      {task.description && (
                        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                          {task.description}
                        </p>
                      )}
                      <p className="mt-4 text-xs text-slate-500">
                        Created{" "}
                        <time dateTime={task.createdAt}>
                          {dateFormatter.format(new Date(task.createdAt))}
                        </time>
                      </p>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setFeedback(null);
                            setEditingId(task.id);
                          }}
                          disabled={busy}
                          aria-label={`Edit ${task.title}`}
                          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteTask(task)}
                          disabled={busy}
                          aria-label={`Delete ${task.title}`}
                          className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deletingId === task.id ? "Deleting…" : "Delete"}
                        </button>
                      </div>
                    </>
                  )}
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
