import assert from "node:assert/strict";
import test from "node:test";
import { APP_CSS, APP_HTML, APP_JS, MANIFEST, SERVICE_WORKER } from "../ui.js";

test("UI assets compile and include the required responsive structure", () => {
  assert.doesNotThrow(() => new Function(APP_JS));
  assert.doesNotThrow(() => new Function(SERVICE_WORKER));

  const manifest = JSON.parse(MANIFEST);
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.display, "standalone");
  assert.match(APP_CSS, /@media\(max-width:820px\)/);
  assert.match(APP_JS, /data-action="new-demand"/);
  assert.match(APP_JS, /fillDemandFromCustomer/);
  assert.match(APP_JS, /demandCustomerFields=\[[^\]]*"notes"/);
  assert.match(APP_HTML, /data-tab="emsal"/);
  assert.match(APP_JS, /emsal-import/);
  assert.doesNotMatch(APP_JS, /event\.target===el\("modal"\).*closeModal/);

  for (const id of [
    "loginView",
    "app",
    "modal",
    "customerRows",
    "ownerRows",
    "propertyRows",
    "demandRows",
    "taskRows",
    "matchRows",
  ]) {
    assert.match(APP_HTML, new RegExp(`id=["']${id}["']`));
  }
});
