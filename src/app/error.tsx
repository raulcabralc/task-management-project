"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-slate-900">
      <div role="alert" className="rounded-lg border border-slate-200 p-6">
        <h1 className="text-xl font-semibold">Unable to load tasks</h1>
        <p className="mt-2 text-sm text-slate-600">
          Something went wrong. Please try again.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
