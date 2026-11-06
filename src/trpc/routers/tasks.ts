import {
  createTaskSchema,
  deleteTaskSchema,
  listPaginatedSchema,
  updateTaskSchema,
} from "@/features/tasks/schemas";
import { createTRPCRouter, publicProcedure } from "../init";

export const tasksRouter = createTRPCRouter({
  list: publicProcedure.query(({ ctx }) => ctx.taskRepository.list()),
  listPaginated: publicProcedure
    .input(listPaginatedSchema)
    .query(({ ctx, input }) => ctx.taskRepository.listPaginated(input)),
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
