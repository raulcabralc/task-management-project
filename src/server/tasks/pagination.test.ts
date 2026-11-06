import assert from "node:assert/strict";
import { test } from "node:test";
import { createTaskRepository } from "./repository";
import { appRouter } from "../../trpc/routers/_app";

function createCaller() {
  return appRouter.createCaller({ taskRepository: createTaskRepository() });
}

test("returns an empty page when there are no tasks", async () => {
  assert.deepEqual(await createCaller().tasks.listPaginated(), {
    items: [],
    nextCursor: null,
  });
});

test("handles short and exactly full pages without a next cursor", async () => {
  const caller = createCaller();
  for (let index = 0; index < 3; index += 1) {
    await caller.tasks.create({ title: `Short ${index}` });
  }

  const shortPage = await caller.tasks.listPaginated();
  assert.equal(shortPage.items.length, 3);
  assert.equal(shortPage.nextCursor, null);

  for (let index = 3; index < 8; index += 1) {
    await caller.tasks.create({ title: `Full ${index}` });
  }

  const fullPage = await caller.tasks.listPaginated();
  assert.equal(fullPage.items.length, 8);
  assert.equal(fullPage.nextCursor, null);
  assert.equal(new Set(fullPage.items.map((task) => task.id)).size, 8);

  fullPage.items[0].title = "Changed outside repository";
  assert.notEqual((await caller.tasks.listPaginated()).items[0].title, fullPage.items[0].title);
});

test("walks multiple pages without duplicates and ends on a partial page", async (context) => {
  const start = Date.parse("2026-01-01T00:00:00.000Z");
  context.mock.timers.enable({ apis: ["Date"], now: start });
  try {
    const caller = createCaller();
    const created = [];
    for (let index = 0; index < 19; index += 1) {
      context.mock.timers.setTime(start + index * 1000);
      created.push(await caller.tasks.create({ title: `Task ${index}` }));
    }

    const first = await caller.tasks.listPaginated();
    const second = await caller.tasks.listPaginated({ cursor: first.nextCursor ?? undefined });
    const third = await caller.tasks.listPaginated({ cursor: second.nextCursor ?? undefined });

    assert.deepEqual([first.items.length, second.items.length, third.items.length], [8, 8, 3]);
    assert.ok(first.nextCursor);
    assert.ok(second.nextCursor);
    assert.equal(third.nextCursor, null);

    const allItems = [...first.items, ...second.items, ...third.items];
    assert.deepEqual(allItems.map((task) => task.id), created.reverse().map((task) => task.id));
    assert.equal(new Set(allItems.map((task) => task.id)).size, 19);
  } finally {
    context.mock.timers.reset();
  }
});

test("uses IDs to paginate tasks with identical creation timestamps", async (context) => {
  context.mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-01-01T00:00:00.000Z") });
  try {
    const caller = createCaller();
    const created = [];
    for (let index = 0; index < 6; index += 1) {
      created.push(await caller.tasks.create({ title: `Same time ${index}` }));
    }

    const expected = created.map((task) => task.id).sort().reverse();
    const first = await caller.tasks.listPaginated({ limit: 2 });
    const second = await caller.tasks.listPaginated({ limit: 2, cursor: first.nextCursor ?? undefined });
    const third = await caller.tasks.listPaginated({ limit: 2, cursor: second.nextCursor ?? undefined });

    assert.deepEqual([...first.items, ...second.items, ...third.items].map((task) => task.id), expected);
    assert.ok(first.nextCursor);
    assert.deepEqual(JSON.parse(Buffer.from(first.nextCursor, "base64url").toString("utf8")), {
      createdAt: first.items[1].createdAt,
      id: first.items[1].id,
    });
    assert.ok(second.nextCursor);
    assert.equal(third.nextCursor, null);
  } finally {
    context.mock.timers.reset();
  }
});

test("rejects invalid limits and malformed cursors", async () => {
  const caller = createCaller();
  for (const limit of [0, -1, 1.5, 51]) {
    await assert.rejects(caller.tasks.listPaginated({ limit }), { code: "BAD_REQUEST" });
  }

  const invalidPayload = Buffer.from(JSON.stringify({ createdAt: "invalid", id: "invalid" }))
    .toString("base64url");
  for (const cursor of ["", "!", "not-base64", invalidPayload]) {
    await assert.rejects(caller.tasks.listPaginated({ cursor }), { code: "BAD_REQUEST" });
  }
  await assert.rejects(caller.tasks.listPaginated({ cursor: invalidPayload }), {
    code: "BAD_REQUEST",
    message: "Invalid task cursor.",
  });
});

test("continues after the cursor task is deleted", async (context) => {
  context.mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-01-01T00:00:00.000Z") });
  try {
    const caller = createCaller();
    const created = [];
    for (let index = 0; index < 5; index += 1) {
      created.push(await caller.tasks.create({ title: `Task ${index}` }));
    }

    const expected = created.map((task) => task.id).sort().reverse();
    const first = await caller.tasks.listPaginated({ limit: 2 });
    await caller.tasks.delete({ id: first.items[1].id });
    const second = await caller.tasks.listPaginated({ limit: 2, cursor: first.nextCursor ?? undefined });

    assert.deepEqual(first.items.map((task) => task.id), expected.slice(0, 2));
    assert.deepEqual(second.items.map((task) => task.id), expected.slice(2, 4));
    assert.ok(second.nextCursor);
  } finally {
    context.mock.timers.reset();
  }
});

test("does not insert a newer task into an already started traversal", async (context) => {
  const start = Date.parse("2026-01-01T00:00:00.000Z");
  context.mock.timers.enable({ apis: ["Date"], now: start });
  try {
    const caller = createCaller();
    const created = [];
    for (let index = 0; index < 4; index += 1) {
      created.push(await caller.tasks.create({ title: `Original ${index}` }));
    }

    const expected = created.map((task) => task.id).sort().reverse();
    const first = await caller.tasks.listPaginated({ limit: 2 });
    context.mock.timers.setTime(start + 1000);
    const newTask = await caller.tasks.create({ title: "New task" });
    const second = await caller.tasks.listPaginated({ limit: 2, cursor: first.nextCursor ?? undefined });

    assert.deepEqual(second.items.map((task) => task.id), expected.slice(2));
    assert.equal(second.nextCursor, null);
    assert.equal((await caller.tasks.listPaginated({ limit: 1 })).items[0].id, newTask.id);
  } finally {
    context.mock.timers.reset();
  }
});
