import { createServerCaller } from "@/trpc/server";
import { TaskManager } from "@/features/tasks/task-manager";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function HomePage() {
  const tasks = await createServerCaller().tasks.list();

  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-slate-900 sm:py-20">
      <header className="mb-12">
        <h1 className="text-3xl font-semibold tracking-tight">Task Manager</h1>
        <p className="mt-3 text-slate-600">
          A simple place to keep track of your work.
        </p>
      </header>

      <TaskManager tasks={tasks} />
    </main>
  );
}
