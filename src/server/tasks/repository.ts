import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import type { Task } from "@/features/tasks/model";
import type {
  CreateTaskInput,
  UpdateTaskInput,
} from "@/features/tasks/schemas";

export function createTaskRepository() {
  const tasks = new Map<string, Task>();

  return {
    list(): Task[] {
      return Array.from(tasks.values(), (task) => ({ ...task })).reverse();
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
