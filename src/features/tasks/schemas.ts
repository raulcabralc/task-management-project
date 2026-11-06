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

export const listPaginatedSchema = z.object({
  limit: z.number().int().min(1).max(50).optional(),
  cursor: z.string().min(1, "Invalid task cursor.").max(256, "Invalid task cursor.").optional(),
}).strict().optional();

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ListPaginatedInput = NonNullable<z.infer<typeof listPaginatedSchema>>;
