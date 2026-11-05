"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-16 sm:px-6">
      <div role="alert" className="w-full rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8">
        <span aria-hidden="true" className="mb-5 block h-1 w-10 rounded-full bg-accent" />
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Unable to load tasks</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Something went wrong. Please try again.
        </p>
        <button
          type="button"
          onClick={reset}
          className="focus-ring mt-6 min-h-11 rounded-xl bg-action px-5 py-2.5 text-sm font-semibold text-white motion-safe:transition-colors enabled:hover:bg-[#c73b00] enabled:active:bg-[#b83700]"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
