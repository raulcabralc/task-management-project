import "server-only";
import { createTaskRepository, type TaskRepository } from "./repository";

// One ephemeral store per Node.js process lets SSR and tRPC requests see the same tasks.
// It does not persist data or coordinate across instances.
const globalStore = globalThis as typeof globalThis & {
  __artefactTaskRepository?: TaskRepository;
};

export const taskRepository =
  (globalStore.__artefactTaskRepository ??= createTaskRepository());
