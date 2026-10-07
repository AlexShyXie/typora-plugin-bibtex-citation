import test from "node:test";
import assert from "node:assert/strict";

import {
  createFreshModuleUrl,
  setupTyporaTestEnv,
} from "../../support/typora-test-env.mjs";

setupTyporaTestEnv();

const coreSymbol = Symbol.for("typora-plugin-core@v2");

const notices = [];
class MockNotice {
  constructor(message) {
    this.message = message;
    notices.push(this.message);
  }
}

class MockModal {
  static instances = [];
  constructor(options) {
    this.options = options;
    this.containerEl = document.createElement("section");
    MockModal.instances.push(this);
  }
  setHeader() {
    this.header = document.createElement("div");
  }
  setBody(render) {
    this.bodyEl = document.createElement("div");
    render(this.bodyEl);
  }
  onClose(handler) {
    this._onCloseHandler = handler;
  }
  open() {
    this.opened = true;
  }
  close() {
    this._onCloseHandler?.();
  }
}

class MockI18n {
  constructor(options = {}) {
    this.t = options.resources?.[options.userLang] || options.resources?.zh || {};
  }
}

globalThis.window[coreSymbol] = {
  Modal: MockModal,
  Notice: MockNotice,
  I18n: MockI18n,
};

const { createI18n } = await import(createFreshModuleUrl("src/i18n.js"));
const { getCitationInsertText, registerCommands, openInsertCitationModal } =
  await import(createFreshModuleUrl("src/plugin/command-runtime.js"));

const ENTRY_A = {
  key: "einstein2020",
  title: "Relativity",
  year: "2020",
  authors: [],
  journal: "",
  doi: "",
  searchText: "einstein2020 relativity 2020",
};
const ENTRY_B = {
  key: "newton1687",
  title: "Principia",
  year: "1687",
  authors: [],
  journal: "",
  doi: "",
  searchText: "newton1687 principia 1687",
};

function createMockPlugin(entries = [ENTRY_A, ENTRY_B]) {
  const toggleCalls = [];
  const plugin = {
    i18n: createI18n("zh-cn"),
    _commands: [],
    registerCommand(command) {
      this._commands.push(command);
    },
    rightDock: {
      toggle() {
        toggleCalls.push(true);
      },
    },
    bibEntries: entries,
    reloadCalls: 0,
    reloadLibraryNow() {
      this.reloadCalls += 1;
    },
    getBibEntries() {
      return this.bibEntries;
    },
    renderCurrentDocumentCitations: async () => ({ changed: false }),
    restoreCurrentDocumentCitations: async () => ({ changed: false }),
    upsertCurrentDocumentBibliography: async () => ({ changed: false }),
    removeCurrentDocumentBibliography: async () => ({ changed: false }),
  };
  plugin.toggleCalls = toggleCalls;
  return plugin;
}

test("getCitationInsertText 在未闭合方括号内只补 @key，其余补完整 [@key]", () => {
  assert.equal(getCitationInsertText("前文 [", "k1"), "@k1");
  assert.equal(getCitationInsertText("前文 [a; b", "k1"), "@k1");
  assert.equal(getCitationInsertText("嵌套 [[x", "k1"), "@k1");
  assert.equal(getCitationInsertText("", "k1"), "[@k1]");
  assert.equal(getCitationInsertText("[a] 后文", "k1"), "[@k1]");
  assert.equal(getCitationInsertText("普通文本", "k1"), "[@k1]");
});

test("registerCommands 注册 7 条命令且标题取自 commands 文案", () => {
  const plugin = createMockPlugin();
  registerCommands(plugin);

  assert.equal(plugin._commands.length, 7);
  assert.deepEqual(
    plugin._commands.map((command) => command.id),
    [
      "insert-citation",
      "refresh-cache",
      "render-citations",
      "restore-citations",
      "upsert-bibliography",
      "remove-bibliography",
      "toggle-panel",
    ],
  );
  for (const command of plugin._commands) {
    const expectedScope = command.id === "toggle-panel" ? "global" : "editor";
    assert.equal(command.scope, expectedScope);
    assert.equal(typeof command.callback, "function");
  }
  assert.equal(
    plugin._commands[0].title,
    plugin.i18n.t.commands.insertCitation,
  );
  assert.equal(
    plugin._commands[1].title,
    plugin.i18n.t.commands.refreshCache,
  );
  assert.equal(
    plugin._commands[4].title,
    plugin.i18n.t.commands.upsertBibliography,
  );
  assert.equal(
    plugin._commands[6].title,
    plugin.i18n.t.commands.togglePanel,
  );
});

test("toggle-panel 命令通过 rightDock.toggle 切换右侧面板且不抛错", () => {
  const plugin = createMockPlugin();
  registerCommands(plugin);
  const command = plugin._commands.find((item) => item.id === "toggle-panel");

  command.callback();

  assert.deepEqual(plugin.toggleCalls, [true]);
});

test("rightDock 缺失时 toggle-panel 回调不抛错", () => {
  const plugin = createMockPlugin();
  plugin.rightDock = null;
  registerCommands(plugin);
  const command = plugin._commands.find((item) => item.id === "toggle-panel");

  command.callback();
});

test("refresh-cache 命令重载文献库并以条目数反馈", () => {
  notices.length = 0;
  const plugin = createMockPlugin();
  registerCommands(plugin);
  const command = plugin._commands.find((item) => item.id === "refresh-cache");

  command.callback();

  assert.equal(plugin.reloadCalls, 1);
  assert.equal(
    notices.at(-1),
    plugin.i18n.t.commands.refreshDone.replace("{n}", "2"),
  );
});

test("文档级命令复用侧边栏同源文案反馈渲染结果", async () => {
  notices.length = 0;
  const plugin = createMockPlugin();
  plugin.renderCurrentDocumentCitations = async () => ({
    changed: true,
    renderedBlocks: 2,
    renderedKeys: 3,
  });
  registerCommands(plugin);
  const command = plugin._commands.find((item) => item.id === "render-citations");

  await command.callback();

  assert.equal(
    notices.at(-1),
    plugin.i18n.t.sidebar.renderSuccess
      .replace("{blocks}", "2")
      .replace("{keys}", "3"),
  );
});

test("文档级命令在无变更与执行报错时分别给出无变更与错误通知", async () => {
  notices.length = 0;
  const plugin = createMockPlugin();
  registerCommands(plugin);
  const command = plugin._commands.find((item) => item.id === "render-citations");

  await command.callback();
  assert.equal(notices.at(-1), plugin.i18n.t.sidebar.renderNoChanges);

  plugin.renderCurrentDocumentCitations = async () => {
    throw new Error("boom");
  };
  await command.callback();
  assert.equal(
    notices.at(-1),
    plugin.i18n.t.sidebar.renderErrorPrefix + "boom",
  );
});

test("insert-citation 命令打开弹窗并默认列出全部候选", () => {
  notices.length = 0;
  MockModal.instances.length = 0;
  const plugin = createMockPlugin();
  registerCommands(plugin);
  const command = plugin._commands.find((item) => item.id === "insert-citation");

  command.callback();

  const modal = MockModal.instances.at(-1);
  assert.ok(modal.opened);
  assert.equal(modal.searchInput.placeholder, plugin.i18n.t.commands.searchPlaceholder);
  assert.equal(modal.resultsEl.children.length, 2);
  assert.equal(modal.resultsEl.children[0].className, "bibtex-modal-item");
  assert.ok(
    modal.resultsEl.children[0].classList.contains("bibtex-modal-active"),
  );
});

test("检索无匹配时展示空态文案", () => {
  notices.length = 0;
  MockModal.instances.length = 0;
  const plugin = createMockPlugin();
  registerCommands(plugin);
  plugin._commands.find((item) => item.id === "insert-citation").callback();

  const modal = MockModal.instances.at(-1);
  modal.searchInput.value = "zzz-no-match";
  modal.searchInput.dispatch("input");

  assert.equal(modal.resultsEl.children.length, 1);
  assert.equal(
    modal.resultsEl.children[0].className,
    "bibtex-modal-empty",
  );
  assert.equal(
    modal.resultsEl.children[0].textContent,
    plugin.i18n.t.commands.searchEmpty,
  );
});

test("Enter 把选中条目按光标上下文写回编辑器并关闭弹窗", () => {
  notices.length = 0;
  MockModal.instances.length = 0;
  const applied = [];
  globalThis.window.editor = {
    selection: {
      getRangy: () => ({
        startContainer: { nodeType: 3, textContent: "正文 [" },
        startOffset: 4,
      }),
      setRange(range, focus) {
        applied.push(`setRange:${focus ? 1 : 0}`);
      },
    },
    UserOp: {
      pasteHandler(editor, text) {
        applied.push(`paste:${text}`);
      },
    },
  };

  try {
    const plugin = createMockPlugin();
    registerCommands(plugin);
    plugin._commands.find((item) => item.id === "insert-citation").callback();
    const modal = MockModal.instances.at(-1);

    modal.searchInput.dispatch("keydown", {
      key: "Enter",
      preventDefault() {},
    });

    assert.deepEqual(applied, ["setRange:1", "paste:@einstein2020"]);
    assert.equal(
      notices.at(-1),
      plugin.i18n.t.commands.insertDone.replace("{key}", "einstein2020"),
    );
  } finally {
    delete globalThis.window.editor;
  }
});

test("ArrowDown 循环移动选中项，Enter 应用当前选中条目", () => {
  notices.length = 0;
  MockModal.instances.length = 0;
  const applied = [];
  globalThis.window.editor = {
    selection: {
      getRangy: () => null,
      setRange(range) {
        applied.push("setRange");
      },
    },
    UserOp: {
      pasteHandler(editor, text) {
        applied.push(`paste:${text}`);
      },
    },
  };

  try {
    const plugin = createMockPlugin();
    registerCommands(plugin);
    plugin._commands.find((item) => item.id === "insert-citation").callback();
    const modal = MockModal.instances.at(-1);

    modal.searchInput.dispatch("keydown", {
      key: "ArrowDown",
      preventDefault() {},
    });
    modal.searchInput.dispatch("keydown", {
      key: "Enter",
      preventDefault() {},
    });

    // 未捕获到编辑器光标（savedRange 为空）时跳过 setRange，仅按当前光标粘贴
    assert.deepEqual(applied, ["paste:[@newton1687]"]);
  } finally {
    delete globalThis.window.editor;
  }
});

test("编辑器光标不可用时插入命令给出提示且不写回", () => {
  notices.length = 0;
  MockModal.instances.length = 0;
  const plugin = createMockPlugin();
  registerCommands(plugin);
  plugin._commands.find((item) => item.id === "insert-citation").callback();
  const modal = MockModal.instances.at(-1);

  modal._applyIndex(0);

  assert.equal(
    notices.at(-1),
    plugin.i18n.t.commands.insertUnavailable,
  );
});

test("openInsertCitationModal 直接调用同样打开弹窗", () => {
  notices.length = 0;
  MockModal.instances.length = 0;
  const plugin = createMockPlugin();

  const modal = openInsertCitationModal(plugin);

  assert.ok(modal.opened);
  assert.equal(modal.searchInput.type, "text");
});
