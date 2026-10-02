const { Modal, Notice } = window[Symbol.for("typora-plugin-core@v2")];

import { MAX_SUGGESTIONS } from "../constants.js";
import { renderBibSuggestion } from "../suggest/render.js";

const TEXT_NODE = 3;

/**
 * 功能：根据光标前缀判断引用插入格式，避免在已有方括号引用块内重复包裹方括号。
 * 输入：光标所在文本节点内、光标之前的文本；citation key。
 * 输出：应插入的引用文本（方括号内只补 `@key`，其余补完整 `[@key]`）。
 */
export function getCitationInsertText(prefixText, key) {
  const prefix = String(prefixText || "");
  const open = prefix.lastIndexOf("[");
  if (open > prefix.lastIndexOf("]")) {
    return `@${key}`;
  }
  return `[@${key}]`;
}

/**
 * 功能：按命令统一格式执行文档级动作，并复用侧边栏按钮的同一组反馈文案。
 * 输入：插件实例，以及包含 action 与三类文案格式化器的动作配置。
 * 输出：无返回值。
 */
async function runDocumentAction(plugin, config) {
  const t = plugin.i18n.t;
  try {
    const result = await config.action();
    if (!result.changed) {
      new Notice(config.formatNoChanges(t));
      return;
    }
    new Notice(config.formatSuccess(t, result));
  } catch (error) {
    new Notice(config.formatErrorPrefix(t) + (error?.message || String(error)));
  }
}

/**
 * 功能：重读 BibTeX 文献库并以通知反馈条目数量，行为与侧边栏刷新按钮一致。
 * 输入：插件实例。
 * 输出：无返回值。
 */
function runRefreshCache(plugin) {
  try {
    plugin.reloadLibraryNow();
    new Notice(
      plugin.i18n.t.commands.refreshDone.replace(
        "{n}",
        String(plugin.getBibEntries().length),
      ),
    );
  } catch (error) {
    new Notice(
      plugin.i18n.t.commands.refreshErrorPrefix + (error?.message || String(error)),
    );
  }
}

/**
 * 功能：捕获编辑器当前光标的 rangy 选区，供弹窗操作完成后回填插入位置。
 * 输入：无。
 * 输出：编辑器选区对象；不可用时返回 null。
 */
function captureEditorRange() {
  try {
    return window.editor?.selection?.getRangy?.() || null;
  } catch (error) {
    return null;
  }
}

/**
 * 功能：把选中的 citation key 写回编辑器光标位置。
 * 输入：插件实例、弹窗打开前捕获的编辑器选区、citation key。
 * 输出：无返回值。
 */
function insertCitationAtSavedRange(plugin, savedRange, key) {
  const editor = window.editor;
  const t = plugin.i18n.t;
  if (!editor?.UserOp?.pasteHandler || !editor?.selection?.setRange) {
    new Notice(t.commands.insertUnavailable);
    return;
  }

  let prefixText = "";
  if (savedRange?.startContainer?.nodeType === TEXT_NODE) {
    prefixText = String(savedRange.startContainer.textContent || "").slice(
      0,
      savedRange.startOffset,
    );
  }

  try {
    if (savedRange) {
      editor.selection.setRange(savedRange, true);
    }
    editor.UserOp.pasteHandler(editor, getCitationInsertText(prefixText, key), true);
    new Notice(t.commands.insertDone.replace("{key}", key));
  } catch (error) {
    new Notice(t.commands.insertErrorPrefix + (error?.message || String(error)));
  }
}

/**
 * 功能：提供 F1 命令使用的文献检索弹窗：输入查询词、键盘选择、回车插入。
 * 输入：插件实例。
 * 输出：Modal 子类实例。
 */
class BibSearchModal extends Modal {
  constructor(plugin) {
    super({ className: "typ-bibtex-citation" });
    this.plugin = plugin;
    this.savedRange = captureEditorRange();
    this.selectedIndex = 0;
    this.currentEntries = [];
    this._build();
  }

  /**
   * 功能：搭建弹窗头部、检索输入框、结果列表与操作提示。
   * 输入：无。
   * 输出：无返回值。
   */
  _build() {
    const t = this.plugin.i18n.t;
    this.setHeader("bibtex-citation");
    this.header.textContent = t.commands.insertCitation;
    this.setBody((body) => this._renderBody(body));
    this.onClose(() => {
      this.containerEl.remove();
    });
  }

  /**
   * 功能：渲染检索输入框与结果容器，并立即展示无查询词时的默认候选。
   * 输入：core 传入的弹窗内容容器。
   * 输出：无返回值。
   */
  _renderBody(body) {
    const t = this.plugin.i18n.t;

    const search = document.createElement("input");
    search.type = "text";
    search.className = "bibtex-modal-search";
    search.placeholder = t.commands.searchPlaceholder;
    search.addEventListener("input", () => this._refreshResults());
    search.addEventListener("keydown", (event) => this._handleKeydown(event));
    this.searchInput = search;

    this.resultsEl = document.createElement("div");
    this.resultsEl.className = "bibtex-modal-results";

    const hint = document.createElement("div");
    hint.className = "bibtex-modal-hint";
    hint.textContent = t.commands.searchHint;

    body.append(search, this.resultsEl, hint);
    this._refreshResults();
  }

  /**
   * 功能：按查询词获取候选条目，优先复用建议器的检索排序逻辑。
   * 输入：查询词。
   * 输出：排序并截断后的文献条目数组。
   */
  _getEntries(query) {
    const suggest = this.plugin._suggest;
    if (suggest?.getSuggestions) {
      return suggest.getSuggestions(query);
    }

    const normalized = String(query || "").trim().toLowerCase();
    const entries = this.plugin.getBibEntries();
    if (!normalized) {
      return entries.slice(0, MAX_SUGGESTIONS);
    }
    return entries
      .filter((item) => item.searchText.includes(normalized))
      .slice(0, MAX_SUGGESTIONS);
  }

  /**
   * 功能：根据当前输入重绘候选列表，并把选中项复位到第一条。
   * 输入：无。
   * 输出：无返回值。
   */
  _refreshResults() {
    const t = this.plugin.i18n.t;
    const entries = this._getEntries(this.searchInput?.value || "");
    this.currentEntries = entries;
    this.selectedIndex = 0;

    this.resultsEl.empty?.();
    this.resultsEl.innerHTML = "";

    if (!entries.length) {
      const empty = document.createElement("div");
      empty.className = "bibtex-modal-empty";
      empty.textContent = t.commands.searchEmpty;
      this.resultsEl.append(empty);
      return;
    }

    entries.forEach((item, index) => {
      const row = document.createElement("div");
      row.className = "bibtex-modal-item";
      row.setAttribute("data-index", String(index));
      row.innerHTML = renderBibSuggestion(item, this.searchInput?.value || "");
      row.addEventListener("click", () => this._applyIndex(index));
      row.addEventListener("mousemove", () => this._setActiveIndex(index));
      this.resultsEl.append(row);
    });

    this._paintActive();
  }

  /**
   * 功能：更新列表行的选中态样式。
   * 输入：无。
   * 输出：无返回值。
   */
  _paintActive() {
    const rows = this.resultsEl?.children || [];
    rows.forEach((row, index) => {
      const isActive = index === this.selectedIndex;
      row.classList.toggle("bibtex-modal-active", isActive);
      if (isActive) {
        row.scrollIntoView?.({ block: "nearest" });
      }
    });
  }

  /**
   * 功能：响应键盘上下键与回车：移动选中项或把选中项插入文档。
   * 输入：键盘事件对象。
   * 输出：无返回值。
   */
  _handleKeydown(event) {
    const entries = this.currentEntries || [];
    if (!entries.length) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      this._setActiveIndex((this.selectedIndex + 1) % entries.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      this._setActiveIndex(
        (this.selectedIndex - 1 + entries.length) % entries.length,
      );
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      this._applyIndex(this.selectedIndex);
    }
  }

  /**
   * 功能：切换选中行并刷新样式。
   * 输入：目标条目下标。
   * 输出：无返回值。
   */
  _setActiveIndex(index) {
    this.selectedIndex = index;
    this._paintActive();
  }

  /**
   * 功能：把指定下标的 citation key 写回编辑器并关闭弹窗。
   * 输入：目标条目下标。
   * 输出：无返回值。
   */
  _applyIndex(index) {
    const item = (this.currentEntries || [])[index];
    if (!item?.key) {
      return;
    }
    insertCitationAtSavedRange(this.plugin, this.savedRange, item.key);
    this.close();
  }
}

/**
 * 功能：打开「插入引用」检索弹窗。
 * 输入：插件实例。
 * 输出：弹窗实例。
 */
export function openInsertCitationModal(plugin) {
  const modal = new BibSearchModal(plugin);
  modal.open();
  modal.searchInput?.focus?.();
  return modal;
}

/**
 * 功能：注册插件全部 F1 命令面板命令：一条检索插入命令 + 五条与侧边栏按钮同源的动作命令。
 * 输入：插件实例。
 * 输出：无返回值。
 */
export function registerCommands(plugin) {
  const t = () => plugin.i18n.t;

  plugin.registerCommand({
    id: "insert-citation",
    title: t().commands.insertCitation,
    scope: "editor",
    callback: () => openInsertCitationModal(plugin),
  });

  plugin.registerCommand({
    id: "refresh-cache",
    title: t().commands.refreshCache,
    scope: "editor",
    callback: () => runRefreshCache(plugin),
  });

  plugin.registerCommand({
    id: "render-citations",
    title: t().commands.renderCitations,
    scope: "editor",
    callback: () =>
      runDocumentAction(plugin, {
        action: () => plugin.renderCurrentDocumentCitations(),
        formatNoChanges: (t2) => t2.sidebar.renderNoChanges,
        formatSuccess: (t2, result) =>
          t2.sidebar.renderSuccess
            .replace("{blocks}", String(result.renderedBlocks))
            .replace("{keys}", String(result.renderedKeys)),
        formatErrorPrefix: (t2) => t2.sidebar.renderErrorPrefix,
      }),
  });

  plugin.registerCommand({
    id: "restore-citations",
    title: t().commands.restoreCitations,
    scope: "editor",
    callback: () =>
      runDocumentAction(plugin, {
        action: () => plugin.restoreCurrentDocumentCitations(),
        formatNoChanges: (t2) => t2.sidebar.restoreNoChanges,
        formatSuccess: (t2, result) =>
          t2.sidebar.restoreSuccess
            .replace("{blocks}", String(result.renderedBlocks))
            .replace("{keys}", String(result.renderedKeys)),
        formatErrorPrefix: (t2) => t2.sidebar.restoreErrorPrefix,
      }),
  });

  plugin.registerCommand({
    id: "upsert-bibliography",
    title: t().commands.upsertBibliography,
    scope: "editor",
    callback: () =>
      runDocumentAction(plugin, {
        action: () => plugin.upsertCurrentDocumentBibliography(),
        formatNoChanges: (t2) => t2.sidebar.insertBibliographyNoChanges,
        formatSuccess: (t2, result) =>
          t2.sidebar.insertBibliographySuccess.replace(
            "{keys}",
            String(result.keyCount),
          ),
        formatErrorPrefix: (t2) => t2.sidebar.insertBibliographyErrorPrefix,
      }),
  });

  plugin.registerCommand({
    id: "remove-bibliography",
    title: t().commands.removeBibliography,
    scope: "editor",
    callback: () =>
      runDocumentAction(plugin, {
        action: () => plugin.removeCurrentDocumentBibliography(),
        formatNoChanges: (t2) => t2.sidebar.removeBibliographyNoChanges,
        formatSuccess: (t2) => t2.sidebar.removeBibliographySuccess,
        formatErrorPrefix: (t2) => t2.sidebar.removeBibliographyErrorPrefix,
      }),
  });
}
