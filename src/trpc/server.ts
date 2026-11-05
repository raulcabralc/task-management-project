import "server-only";
import { createTRPCContext } from "./context";
import { appRouter } from "./routers/_app";

export function createServerCaller() {
  return appRouter.createCaller(createTRPCContext());
}
