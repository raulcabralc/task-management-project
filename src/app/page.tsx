import { createServerCaller } from "@/trpc/server";
import { TaskManager } from "@/features/tasks/task-manager";

// Mutable tasks need request-time rendering; the server caller puts the initial list in HTML.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function HomePage() {
  const tasks = await createServerCaller().tasks.list();

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 pb-20 pt-10 sm:px-6 sm:pt-14 lg:px-8 lg:pt-16">
      <header className="mb-10 max-w-2xl sm:mb-12">
        <span aria-hidden="true" className="mb-5 block h-1 w-10 rounded-full bg-accent" />
        <h1 className="text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Task Manager
        </h1>
        <p className="mt-3 max-w-xl text-base leading-7 text-muted sm:text-lg">
          A simple place to keep track of your work.
        </p>
      </header>

      <TaskManager tasks={tasks} />
    </main>
  );
}
