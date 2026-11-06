import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { Task } from "@/features/tasks/model";
import type {
  CreateTaskInput,
  ListPaginatedInput,
  UpdateTaskInput,
} from "@/features/tasks/schemas";

const cursorSchema = z.object({
  createdAt: z.iso.datetime().refine((value) =>
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value,
  ),
  id: z.uuid(),
}).strict();

type TaskPosition = Pick<Task, "createdAt" | "id">;

function compareNewestFirst(first: TaskPosition, second: TaskPosition): number {
  if (first.createdAt !== second.createdAt) {
    return first.createdAt > second.createdAt ? -1 : 1;
  }
  return first.id > second.id ? -1 : first.id < second.id ? 1 : 0;
}

function encodeCursor(task: TaskPosition): string {
  return Buffer.from(JSON.stringify({ createdAt: task.createdAt, id: task.id }))
    .toString("base64url");
}

function decodeCursor(cursor: string): TaskPosition {
  const invalidCursor = () => new TRPCError({ code: "BAD_REQUEST", message: "Invalid task cursor." });
  if (!/^[A-Za-z0-9_-]+$/.test(cursor)) throw invalidCursor();

  const decoded = Buffer.from(cursor, "base64url");
  if (decoded.toString("base64url") !== cursor) throw invalidCursor();

  let payload: unknown;
  try {
    payload = JSON.parse(decoded.toString("utf8"));
  } catch {
    throw invalidCursor();
  }

  const result = cursorSchema.safeParse(payload);
  if (!result.success) throw invalidCursor();
  return result.data;
}

export function createTaskRepository() {
  const tasks = new Map<string, Task>();

  return {
    list(): Task[] {
      return Array.from(tasks.values(), (task) => ({ ...task })).reverse();
    },

    // Value-based cursors survive deletion; concurrent inserts are not snapshotted.
    listPaginated({ limit = 8, cursor }: ListPaginatedInput = {}) {
      const position = cursor === undefined ? null : decodeCursor(cursor);
      const ordered = Array.from(tasks.values()).sort(compareNewestFirst);
      const start = position === null
        ? 0
        : ordered.findIndex((task) => compareNewestFirst(task, position) > 0);
      if (start === -1) return { items: [], nextCursor: null };

      const page = ordered.slice(start, start + limit);
      const last = page[page.length - 1];
      return {
        items: page.map((task) => ({ ...task })),
        nextCursor: ordered.length > start + limit && last ? encodeCursor(last) : null,
      };
    },

    create(input: CreateTaskInput): Task {
      const task: Task = {
        id: randomUUID(),
        title: input.title,
        ...(input.description !== undefined && { description: input.description }),
        createdAt: new Date().toISOString(),
      };

      tasks.set(task.id, task);
      return { ...task };
    },

    update(input: UpdateTaskInput): Task {
      const current = tasks.get(input.id);
      if (!current) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Task not found." });
      }

      if (
        (input.title === undefined || input.title === current.title) &&
        (input.description === undefined || input.description === current.description)
      ) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Task has no changes." });
      }

      const updated: Task = {
        ...current,
        ...(input.title !== undefined && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
      };

      tasks.set(updated.id, updated);
      return { ...updated };
    },

    delete(id: string): Task {
      const task = tasks.get(id);
      if (!task) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Task not found." });
      }

      tasks.delete(id);
      return { ...task };
    },
  };
}

export type TaskRepository = ReturnType<typeof createTaskRepository>;
