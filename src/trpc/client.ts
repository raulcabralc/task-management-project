import "client-only";
import { createTRPCClient, httpLink } from "@trpc/client";
import type { AppRouter } from "./routers/_app";

export const trpcClient = createTRPCClient<AppRouter>({
  links: [httpLink({ url: "/api/trpc" })],
});
