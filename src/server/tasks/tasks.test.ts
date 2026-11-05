import assert from "node:assert/strict";
import { test } from "node:test";
import { createTaskRepository } from "./repository";
import { appRouter } from "../../trpc/routers/_app";
import { createTaskSchema } from "../../features/tasks/schemas";

function createCaller() {
  return appRouter.createCaller({ taskRepository: createTaskRepository() });
}

const missingId = "00000000-0000-4000-8000-000000000000";

test("creates and lists tasks newest first", async () => {
  const caller = createCaller();
  const first = await caller.tasks.create({ title: "  Plan sprint  " });
  const second = await caller.tasks.create({
    title: "Review notes",
    description: "Fictional project notes",
  });

  assert.match(first.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  assert.equal(first.title, "Plan sprint");
  assert.equal(first.description, undefined);
  assert.equal(new Date(first.createdAt).toISOString(), first.createdAt);
  assert.notEqual(first.id, second.id);
  assert.deepEqual(await caller.tasks.list(), [second, first]);
});

test("rejects empty and whitespace-only titles", async () => {
  const caller = createCaller();

  await assert.rejects(caller.tasks.create({ title: "" }), {
    code: "BAD_REQUEST",
  });
  await assert.rejects(caller.tasks.create({ title: "   " }), {
    code: "BAD_REQUEST",
  });
  assert.deepEqual(await caller.tasks.list(), []);
});

test("requires a title in task input", () => {
  const result = createTaskSchema.safeParse({ description: "No title" });

  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.error.issues[0]?.path[0], "title");
  }
});

test("updates a task while preserving its identity and creation time", async () => {
  const caller = createCaller();
  const original = await caller.tasks.create({ title: "Draft" });

  const updated = await caller.tasks.update({
    id: original.id,
    title: "  Final draft  ",
    description: "Ready for review",
  });

  assert.equal(updated.id, original.id);
  assert.equal(updated.createdAt, original.createdAt);
  assert.equal(updated.title, "Final draft");
  assert.equal(updated.description, "Ready for review");
  assert.deepEqual(await caller.tasks.list(), [updated]);
});

test("rejects invalid or unchanged updates", async () => {
  const caller = createCaller();
  const task = await caller.tasks.create({ title: "Draft" });

  await assert.rejects(caller.tasks.update({ id: task.id, title: "  " }), {
    code: "BAD_REQUEST",
  });
  await assert.rejects(caller.tasks.update({ id: task.id }), {
    code: "BAD_REQUEST",
  });
  await assert.rejects(caller.tasks.update({ id: task.id, title: "Draft" }), {
    code: "BAD_REQUEST",
  });
  assert.deepEqual(await caller.tasks.list(), [task]);
});

test("rejects updates to nonexistent tasks", async () => {
  const caller = createCaller();

  await assert.rejects(caller.tasks.update({ id: missingId, title: "Missing" }), {
    code: "NOT_FOUND",
    message: "Task not found.",
  });
});

test("deletes a task and rejects repeated deletion", async () => {
  const caller = createCaller();
  const task = await caller.tasks.create({ title: "Temporary" });

  assert.deepEqual(await caller.tasks.delete({ id: task.id }), task);
  assert.deepEqual(await caller.tasks.list(), []);
  await assert.rejects(caller.tasks.delete({ id: task.id }), {
    code: "NOT_FOUND",
    message: "Task not found.",
  });
});

test("rejects invalid task IDs", async () => {
  const caller = createCaller();

  await assert.rejects(caller.tasks.delete({ id: "not-a-uuid" }), {
    code: "BAD_REQUEST",
  });
});

test("repository results cannot mutate stored tasks", async () => {
  const repository = createTaskRepository();
  const created = repository.create({ title: "Original" });

  created.title = "Changed outside repository";
  const listed = repository.list();
  assert.equal(listed[0].title, "Original");

  listed[0].title = "Changed list result";
  assert.equal(repository.list()[0].title, "Original");
});
