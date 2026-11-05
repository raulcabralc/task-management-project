import "server-only";
import { createTaskRepository, type TaskRepository } from "./repository";

const globalStore = globalThis as typeof globalThis & {
  __artefactTaskRepository?: TaskRepository;
};

export const taskRepository =
  (globalStore.__artefactTaskRepository ??= createTaskRepository());
