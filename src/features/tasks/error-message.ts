import { TRPCClientError } from "@trpc/client";

export function isTaskNotFound(error: unknown): boolean {
  return error instanceof TRPCClientError && error.data?.code === "NOT_FOUND";
}

export function getTaskErrorMessage(error: unknown, action: string): string {
  if (isTaskNotFound(error)) {
    return "This task no longer exists. Updating the list.";
  }

  if (error instanceof TRPCClientError) {
    if (error.data?.code === "BAD_REQUEST") {
      return error.message === "Task has no changes."
        ? error.message
        : "Please check the task details and try again.";
    }
  }

  return `Unable to ${action} the task. Please try again.`;
}
