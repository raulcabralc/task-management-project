import { createServerCaller } from "@/trpc/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const dateFormatter = new Intl.DateTimeFormat("en", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

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

      <section aria-labelledby="tasks-heading">
        <h2 id="tasks-heading" className="mb-5 text-lg font-semibold">
          Tasks
        </h2>

        {tasks.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white px-6 py-10 text-center">
            <p className="font-medium">No tasks yet</p>
            <p className="mt-2 text-sm text-slate-600">
              Tasks you add will appear here.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {tasks.map((task) => (
              <li key={task.id}>
                <article className="rounded-lg border border-slate-200 bg-white p-5">
                  <h3 className="font-medium">{task.title}</h3>
                  {task.description && (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                      {task.description}
                    </p>
                  )}
                  <p className="mt-4 text-xs text-slate-500">
                    Created{" "}
                    <time dateTime={task.createdAt}>
                      {dateFormatter.format(new Date(task.createdAt))}
                    </time>
                  </p>
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
