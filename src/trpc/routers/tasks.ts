import {
  createTaskSchema,
  deleteTaskSchema,
  updateTaskSchema,
} from "@/features/tasks/schemas";
import { createTRPCRouter, publicProcedure } from "../init";

export const tasksRouter = createTRPCRouter({
  list: publicProcedure.query(({ ctx }) => ctx.taskRepository.list()),
  create: publicProcedure
    .input(createTaskSchema)
    .mutation(({ ctx, input }) => ctx.taskRepository.create(input)),
  update: publicProcedure
    .input(updateTaskSchema)
    .mutation(({ ctx, input }) => ctx.taskRepository.update(input)),
  delete: publicProcedure
    .input(deleteTaskSchema)
    .mutation(({ ctx, input }) => ctx.taskRepository.delete(input.id)),
});
