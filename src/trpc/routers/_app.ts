import { createTRPCRouter } from "../init";
import { tasksRouter } from "./tasks";

export const appRouter = createTRPCRouter({ tasks: tasksRouter });

export type AppRouter = typeof appRouter;
