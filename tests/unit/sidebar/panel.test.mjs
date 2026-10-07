import test from "node:test";
import assert from "node:assert/strict";

import {
  createFreshModuleUrl,
  createMockElement,
  setupTyporaTestEnv,
} from "../../support/typora-test-env.mjs";

setupTyporaTestEnv();

const notices = [];
const coreSymbol = Symbol.for("typora-plugin-core@v2");
globalThis.window[coreSymbol] = {
  WorkspaceView: class WorkspaceView {
    constructor(leaf) {
      this.leaf = leaf;
      this.isOpen = false;
    }
  },
  Notice: class Notice {
    constructor(message) {
      notices.push(message);
    }
  },
};

const { BibCitationPanelView } = await import(createFreshModuleUrl("src/sidebar/panel.js"));

function createPlugin(overrides = {}) {
  return {
    manifest: { id: "bibtex-citation" },
    i18n: {
      t: {
        sidebar: {
          title: "BibTeX",
          renderNoChanges: "No render changes",
          renderSuccess: "Rendered {blocks} / {keys}",
          renderErrorPrefix: "Render failed: ",
          restoreNoChanges: "No restore changes",
          restoreSuccess: "Restored {blocks} / {keys}",
          restoreErrorPrefix: "Restore failed: ",
          insertBibliographyNoChanges: "No bib changes",
          insertBibliographySuccess: "Updated {keys}",
          insertBibliographyErrorPrefix: "Bib failed: ",
          removeBibliographyNoChanges: "No remove changes",
          removeBibliographySuccess: "Removed bibliography",
          removeBibliographyErrorPrefix: "Remove failed: ",
        },
      },
    },
    async renderCurrentDocumentCitations() {
      return { changed: true, renderedBlocks: 2, renderedKeys: 3 };
    },
    async restoreCurrentDocumentCitations() {
      return { changed: true, renderedBlocks: 1, renderedKeys: 1 };
    },
    async upsertCurrentDocumentBibliography() {
      return { changed: true, keyCount: 4 };
    },
    async removeCurrentDocumentBibliography() {
      return { changed: true };
    },
    ...overrides,
  };
}

test("BibCitationPanelView 构造时移除 leaf 自带的失效 resize 把手", () => {
  let removed = false;
  const leaf = createMockLeaf();
  leaf.resizeHandleEl.remove = () => {
    removed = true;
  };

  new BibCitationPanelView(leaf, createPlugin());

  assert.equal(removed, true);
});

test("leaf 缺少 resizeHandleEl 时构造不抛错", () => {
  const leaf = { containerEl: createMockElement("div") };

  new BibCitationPanelView(leaf, createPlugin());
});

test("BibCitationPanelView handle* 方法在成功、无改动和失败时提示正确消息", async () => {
  notices.length = 0;
  const panel = new BibCitationPanelView(createMockLeaf(), createPlugin());
  panel.containerEl = createMockElement("section");

  await panel.handleRenderCitations();
  await panel.handleRestoreCitations();
  await panel.handleUpsertBibliography();
  await panel.handleRemoveBibliography();

  assert.deepEqual(notices, [
    "Rendered 2 / 3",
    "Restored 1 / 1",
    "Updated 4",
    "Removed bibliography",
  ]);

  notices.length = 0;
  const unchanged = new BibCitationPanelView(createMockLeaf(), createPlugin({
    async renderCurrentDocumentCitations() { return { changed: false }; },
    async restoreCurrentDocumentCitations() { return { changed: false }; },
    async upsertCurrentDocumentBibliography() { return { changed: false }; },
    async removeCurrentDocumentBibliography() { return { changed: false }; },
  }));
  unchanged.containerEl = createMockElement("section");
  await unchanged.handleRenderCitations();
  await unchanged.handleRestoreCitations();
  await unchanged.handleUpsertBibliography();
  await unchanged.handleRemoveBibliography();

  assert.deepEqual(notices, [
    "No render changes",
    "No restore changes",
    "No bib changes",
    "No remove changes",
  ]);

  notices.length = 0;
  const failing = new BibCitationPanelView(createMockLeaf(), createPlugin({
    async renderCurrentDocumentCitations() { throw new Error("x"); },
    async restoreCurrentDocumentCitations() { throw new Error("y"); },
    async upsertCurrentDocumentBibliography() { throw new Error("z"); },
    async removeCurrentDocumentBibliography() { throw new Error("w"); },
  }));
  failing.containerEl = createMockElement("section");
  await failing.handleRenderCitations();
  await failing.handleRestoreCitations();
  await failing.handleUpsertBibliography();
  await failing.handleRemoveBibliography();

  assert.deepEqual(notices, [
    "Render failed: x",
    "Restore failed: y",
    "Bib failed: z",
    "Remove failed: w",
  ]);
});

function createMockLeaf() {
  return {
    containerEl: createMockElement("div"),
    resizeHandleEl: createMockElement("hr"),
  };
}
