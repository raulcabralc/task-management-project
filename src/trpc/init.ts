import { initTRPC } from "@trpc/server";
import type { TaskRepository } from "@/server/tasks/repository";

export type TRPCContext = { taskRepository: TaskRepository };

const trpc = initTRPC.context<TRPCContext>().create();

export const createTRPCRouter = trpc.router;
export const publicProcedure = trpc.procedure;
