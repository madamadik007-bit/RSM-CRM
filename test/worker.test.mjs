import assert from "node:assert/strict";
import { pbkdf2Sync } from "node:crypto";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import worker from "../worker.js";

class D1Statement {
  constructor(database, sql) {
    this.database = database;
    this.sql = sql;
    this.values = [];
  }

  bind(...values) {
    this.values = values;
    return this;
  }

  async run() {
    const result = this.database.prepare(this.sql).run(...this.values);
    return { success: true, meta: { changes: Number(result.changes) } };
  }

  async all() {
    return { success: true, results: this.database.prepare(this.sql).all(...this.values) };
  }
}

class D1Database {
  constructor() {
    this.database = new DatabaseSync(":memory:");
  }

  prepare(sql) {
    return new D1Statement(this.database, sql);
  }

  async batch(statements) {
    this.database.exec("BEGIN");
    try {
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      this.database.exec("COMMIT");
      return results;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }
}

function makeRequest(path, init = {}) {
  return new Request(`https://crm.test${path}`, init);
}

function authHeaders(cookie) {
  return { cookie, origin: "https://crm.test", "content-type": "application/json" };
}

test("RSM CRM authentication and CRUD flow", async () => {
  const env = { DB: new D1Database() };

  let response = await worker.fetch(makeRequest("/"), {});
  assert.equal(response.status, 500);

  response = await worker.fetch(makeRequest("/"), env);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /RSM Gayrimenkul CRM/);
  assert.match(response.headers.get("content-security-policy"), /default-src 'self'/);

  response = await worker.fetch(makeRequest("/api/auth/status"), env);
  assert.deepEqual(await response.json(), { authenticated: false });

  response = await worker.fetch(makeRequest("/api/all"), env);
  assert.equal(response.status, 401);

  const password = "only-for-automated-tests";
  const salt = Buffer.from("rsm-crm-test-salt").toString("base64url");
  const hash = pbkdf2Sync(password, Buffer.from(salt, "base64url"), 210000, 32, "sha256").toString("base64url");
  env.DB.database.prepare("UPDATE app_settings SET value=? WHERE key='password_salt'").run(salt);
  env.DB.database.prepare("UPDATE app_settings SET value=? WHERE key='password_hash'").run(hash);

  response = await worker.fetch(makeRequest("/api/auth/login", {
    method: "POST",
    headers: { origin: "https://crm.test", "content-type": "application/json" },
    body: JSON.stringify({ password: "wrong" }),
  }), env);
  assert.equal(response.status, 401);

  response = await worker.fetch(makeRequest("/api/auth/login", {
    method: "POST",
    headers: { origin: "https://crm.test", "content-type": "application/json" },
    body: JSON.stringify({ password }),
  }), env);
  assert.equal(response.status, 200);
  const cookie = response.headers.get("set-cookie").split(";", 1)[0];
  assert.match(cookie, /^rsm_crm_session=/);

  response = await worker.fetch(makeRequest("/api/all", { headers: authHeaders(cookie) }), env);
  assert.deepEqual(await response.json(), { customers: [], owners: [], properties: [], demands: [], tasks: [] });

  const records = [
    ["/api/customers", { name: "Test Müşteri", phone: "0500 000 00 00", role: "Alıcı", status: "Aktif", district: "Selçuklu", neighborhood: "Sancak", budget_min: 3000000, budget_max: 5000000, rooms: "3+1", net_min: 100, net_max: 150 }],
    ["/api/owners", { name: "Test Mülk Sahibi", phone: "0500 111 11 11", district: "Selçuklu" }],
    ["/api/properties", { title: "Sancak 3+1 Daire", type: "Satılık", status: "Aktif", property_type: "Daire", city: "Konya", district: "Selçuklu", neighborhood: "Sancak", price: 4500000, rooms: "3+1", net_m2: 125, owner_name: "Test Mülk Sahibi", listing_no: "123456" }],
    ["/api/demands", { customer_id: 1, type: "Satılık", status: "Aktif", property_type: "Daire", district: "Selçuklu", neighborhood: "Sancak", budget_min: 3000000, budget_max: 5000000, rooms: "3+1", net_min: 100, net_max: 150 }],
    ["/api/tasks", { title: "Müşteriyi ara", due_date: "2026-09-09", type: "Telefon", customer_id: 1, property_id: 1, status: "Açık" }],
  ];
  for (const [path, body] of records) {
    response = await worker.fetch(makeRequest(path, { method: "POST", headers: authHeaders(cookie), body: JSON.stringify(body) }), env);
    assert.equal(response.status, 201);
  }

  response = await worker.fetch(makeRequest("/api/all", { headers: authHeaders(cookie) }), env);
  let data = await response.json();
  assert.equal(data.customers.length, 1);
  assert.equal(data.owners.length, 1);
  assert.equal(data.properties.length, 1);
  assert.equal(data.demands[0].customer_name, "Test Müşteri");
  assert.equal(data.tasks[0].property_title, "Sancak 3+1 Daire");

  response = await worker.fetch(makeRequest("/api/customers/1", {
    method: "PUT",
    headers: authHeaders(cookie),
    body: JSON.stringify({ ...data.customers[0], name: "Güncel Müşteri" }),
  }), env);
  assert.equal(response.status, 200);

  response = await worker.fetch(makeRequest("/api/tasks/1/done", { method: "POST", headers: authHeaders(cookie), body: "{}" }), env);
  assert.equal(response.status, 200);
  data = await (await worker.fetch(makeRequest("/api/all", { headers: authHeaders(cookie) }), env)).json();
  assert.equal(data.customers[0].name, "Güncel Müşteri");
  assert.equal(data.tasks[0].status, "Tamamlandı");

  response = await worker.fetch(makeRequest("/api/backup", { headers: authHeaders(cookie) }), env);
  assert.equal(response.status, 200);
  const backup = await response.json();
  assert.equal(backup.format, "rsm-crm-backup");
  assert.equal(backup.data.properties.length, 1);

  response = await worker.fetch(makeRequest("/api/properties/1", { method: "DELETE", headers: authHeaders(cookie), body: "{}" }), env);
  assert.equal(response.status, 200);
  response = await worker.fetch(makeRequest("/api/restore", {
    method: "POST",
    headers: authHeaders(cookie),
    body: JSON.stringify({ confirm: "RSM CRM", data: backup.data }),
  }), env);
  assert.equal(response.status, 200);
  data = await (await worker.fetch(makeRequest("/api/all", { headers: authHeaders(cookie) }), env)).json();
  assert.equal(data.properties.length, 1);

  response = await worker.fetch(makeRequest("/api/auth/change-password", {
    method: "POST",
    headers: authHeaders(cookie),
    body: JSON.stringify({ current_password: password, new_password: "new-test-password-123" }),
  }), env);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("set-cookie"), /^rsm_crm_session=/);

  response = await worker.fetch(makeRequest("/api/not-found", { headers: authHeaders(cookie) }), env);
  assert.equal(response.status, 401, "Parola değişince eski oturum geçersiz olmalı");
});
