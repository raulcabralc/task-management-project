import "server-only";
import { taskRepository } from "@/server/tasks/store";
import type { TRPCContext } from "./init";

export function createTRPCContext(): TRPCContext {
  return { taskRepository };
}
