import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { createTRPCClient, httpLink } from "@trpc/client";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const nextCli = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));

async function availablePort() {
  const listener = createServer();
  await new Promise((resolve, reject) => {
    listener.once("error", reject);
    listener.listen(0, "127.0.0.1", resolve);
  });
  const port = listener.address().port;
  await new Promise((resolve) => listener.close(resolve));
  return port;
}

async function waitForServer(url, server, getStartupError) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (getStartupError()) throw getStartupError();
    if (server.exitCode !== null) throw new Error(`Next.js exited with code ${server.exitCode}.`);

    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
      if (response.ok) return;
    } catch {
      // The production server may still be starting.
    }
    await delay(200);
  }
  throw new Error("Next.js did not start within 20 seconds.");
}

function renderedMain(html) {
  const main = html.match(/<main\b[^>]*>[\s\S]*?<\/main>/)?.[0];
  assert.ok(main, "The page must contain server-rendered <main> HTML.");
  return main;
}

async function pageMain(url) {
  const response = await fetch(url, { cache: "no-store" });
  assert.equal(response.status, 200);
  return renderedMain(await response.text());
}

async function verify() {
  const port = await availablePort();
  const url = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, [nextCli, "start", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: projectRoot,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let startupError;
  let serverOutput = "";
  server.on("error", (error) => { startupError = error; });
  for (const stream of [server.stdout, server.stderr]) {
    stream.on("data", (chunk) => { serverOutput += chunk.toString(); });
  }

  try {
    await waitForServer(url, server, () => startupError);
    const client = createTRPCClient({ links: [httpLink({ url: `${url}/api/trpc` })] });
    const marker = randomUUID();
    const originalTitle = `SSR original ${marker}`;
    const updatedTitle = `SSR updated ${marker}`;

    assert.match(await pageMain(url), /No tasks yet/);
    const created = await client.tasks.create.mutate({ title: originalTitle, description: "Fictional QA task" });
    assert.equal(created.title, originalTitle);
    assert.deepEqual(await client.tasks.list.query(), [created]);

    let main = await pageMain(url);
    assert.ok(main.includes(`>${originalTitle}</h3>`), "Created title must be in rendered task HTML.");
    assert.ok(main.includes("Fictional QA task"), "Created description must be rendered.");
    assert.ok(main.includes(`<time dateTime="${created.createdAt}"`) || main.includes(`<time datetime="${created.createdAt}"`), "Creation date must be rendered.");

    const updated = await client.tasks.update.mutate({ id: created.id, title: updatedTitle, description: "Updated details" });
    assert.equal(updated.id, created.id);
    assert.equal(updated.createdAt, created.createdAt);
    assert.deepEqual(await client.tasks.list.query(), [updated]);
    main = await pageMain(url);
    assert.ok(main.includes(`>${updatedTitle}</h3>`), "Updated title must be in rendered task HTML.");
    assert.ok(main.includes("Updated details"), "Updated description must be rendered.");
    assert.ok(!main.includes(`>${originalTitle}</h3>`), "Original title must be gone.");

    await client.tasks.delete.mutate({ id: created.id });
    assert.deepEqual(await client.tasks.list.query(), []);
    main = await pageMain(url);
    assert.ok(!main.includes(`>${updatedTitle}</h3>`), "Deleted title must be gone from rendered HTML.");
    assert.match(main, /No tasks yet/);
    console.log("PASS: tRPC create, list, update, and delete are reflected in server-rendered HTML.");
  } catch (error) {
    if (serverOutput) console.error(serverOutput);
    throw error;
  } finally {
    if (server.exitCode === null && server.signalCode === null) {
      const exited = new Promise((resolve) => server.once("exit", resolve));
      server.kill();
      await Promise.race([exited, delay(5000)]);
      if (server.exitCode === null && server.signalCode === null) server.kill("SIGKILL");
    }
  }
}

await verify();
