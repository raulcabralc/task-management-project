import { z } from "zod";

const titleSchema = z.string().trim().min(1, "Title is required.");

export const createTaskSchema = z.object({
  title: titleSchema,
  description: z.string().optional(),
}).strict();

export const updateTaskSchema = z
  .object({
    id: z.uuid(),
    title: titleSchema.optional(),
    description: z.string().optional(),
  })
  .strict()
  .refine(
    ({ title, description }) => title !== undefined || description !== undefined,
    { message: "Provide a title or description to update." },
  );

export const deleteTaskSchema = z.object({ id: z.uuid() }).strict();

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
