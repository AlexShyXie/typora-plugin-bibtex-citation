import test from "node:test";
import assert from "node:assert/strict";

import {
  createFreshModuleUrl,
  setupTyporaTestEnv,
} from "../../support/typora-test-env.mjs";

setupTyporaTestEnv();

const { BIB_PANEL_VIEW_TYPE, BIB_PANEL_VIEW_URI, BibCitationRightDock } =
  await import(createFreshModuleUrl("src/sidebar/right-dock.js"));

test("视图类型与 manifest id 一致，URI 指向核心 ensure-leaf 可解析的格式", () => {
  assert.equal(BIB_PANEL_VIEW_TYPE, "AlexShyXie.bibtex-citation");
  assert.equal(BIB_PANEL_VIEW_URI, "typ://AlexShyXie.bibtex-citation/BibCitations");
});

function createRightSplit(overrides = {}) {
  return {
    findLeaf(predicate) {
      return this.leaves.find(predicate) ?? null;
    },
    filterLeaves(predicate) {
      return this.leaves.filter(predicate);
    },
    expandCalls: 0,
    toggleCalls: 0,
    collapsed: false,
    expand() {
      this.expandCalls += 1;
      this.collapsed = false;
    },
    toggle() {
      this.toggleCalls += 1;
    },
    leaves: [],
    ...overrides,
  };
}

function createPlugin(rightSplitOverrides = {}) {
  const runCalls = [];
  const rightSplit = createRightSplit(rightSplitOverrides);
  const plugin = {
    app: {
      workspace: { rightSplit },
      commands: {
        run(commandId, args) {
          runCalls.push([commandId, args]);
        },
      },
    },
  };
  plugin.runCalls = runCalls;
  return plugin;
}

test("open 在没有 leaf 时请求 ensure-leaf 并展开右侧分栏", () => {
  const plugin = createPlugin();
  const dock = new BibCitationRightDock(plugin);

  dock.open();

  assert.deepEqual(plugin.runCalls, [
    ["core.workspace.right-split:ensure-leaf", [BIB_PANEL_VIEW_URI]],
  ]);
  assert.equal(plugin.app.workspace.rightSplit.expandCalls, 1);
});

test("open 在已有本视图 leaf 时不再请求 ensure-leaf，仅展开", () => {
  const plugin = createPlugin();
  plugin.app.workspace.rightSplit.leaves = [
    { viewType: BIB_PANEL_VIEW_TYPE, view: { isOpen: true } },
  ];
  const dock = new BibCitationRightDock(plugin);

  dock.open();

  assert.deepEqual(plugin.runCalls, []);
  assert.equal(plugin.app.workspace.rightSplit.expandCalls, 1);
});

test("toggle 在没有 leaf 时委托 open，有 leaf 时切换右侧分栏", () => {
  const plugin = createPlugin();
  const dock = new BibCitationRightDock(plugin);

  dock.toggle();

  assert.deepEqual(plugin.runCalls, [
    ["core.workspace.right-split:ensure-leaf", [BIB_PANEL_VIEW_URI]],
  ]);
  assert.equal(plugin.app.workspace.rightSplit.expandCalls, 1);
  assert.equal(plugin.app.workspace.rightSplit.toggleCalls, 0);

  plugin.app.workspace.rightSplit.leaves = [
    { viewType: BIB_PANEL_VIEW_TYPE, view: { isOpen: true } },
  ];
  dock.toggle();

  assert.equal(plugin.runCalls.length, 1);
  assert.equal(plugin.app.workspace.rightSplit.toggleCalls, 1);
});

test("isVisible 仅在 leaf 存在且右侧分栏未折叠时为 true", () => {
  const plugin = createPlugin();
  const dock = new BibCitationRightDock(plugin);

  assert.equal(dock.isVisible(), false);

  plugin.app.workspace.rightSplit.leaves = [
    { viewType: BIB_PANEL_VIEW_TYPE, view: { isOpen: true } },
  ];
  assert.equal(dock.isVisible(), true);

  plugin.app.workspace.rightSplit.collapsed = true;
  assert.equal(dock.isVisible(), false);
});

test("refresh 仅在视图已打开时把 options 透传给 render", () => {
  const plugin = createPlugin();
  const renderCalls = [];
  const view = {
    isOpen: false,
    render(options) {
      renderCalls.push(options);
    },
  };
  plugin.app.workspace.rightSplit.leaves = [{ viewType: BIB_PANEL_VIEW_TYPE, view }];
  const dock = new BibCitationRightDock(plugin);

  dock.refresh({ allowLibraryLoad: false });
  assert.deepEqual(renderCalls, []);

  view.isOpen = true;
  dock.refresh({ allowLibraryLoad: false });
  dock.refresh();
  assert.deepEqual(renderCalls, [{ allowLibraryLoad: false }, undefined]);
});

test("dispose 只 detach 属于本插件视图的 leaf", () => {
  const plugin = createPlugin();
  const detached = [];
  const ownLeaf = {
    viewType: BIB_PANEL_VIEW_TYPE,
    detach() {
      detached.push("own");
    },
  };
  const otherLeaf = {
    viewType: "other.view",
    detach() {
      detached.push("other");
    },
  };
  plugin.app.workspace.rightSplit.leaves = [ownLeaf, otherLeaf];
  const dock = new BibCitationRightDock(plugin);

  dock.dispose();

  assert.deepEqual(detached, ["own"]);
});
