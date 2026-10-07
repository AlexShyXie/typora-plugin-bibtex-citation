/**
 * 功能：声明 BibTeX 引用面板在右侧分栏中的视图类型与视图 URI。
 * 说明：视图类型与 manifest 的 id 保持一致；URI 供核心命令 ensure-leaf 创建 leaf。
 * 输入：无。
 * 输出：视图类型与视图 URI 常量。
 */
export const BIB_PANEL_VIEW_TYPE = "AlexShyXie.bibtex-citation";
export const BIB_PANEL_VIEW_URI = `typ://${BIB_PANEL_VIEW_TYPE}/BibCitations`;

/**
 * 功能：管理 BibTeX 引用面板在 workspace.rightSplit 中的 leaf 生命周期，提供打开、切换与轻量重绘入口。
 * 输入：插件实例，用于访问 app 运行时。
 * 输出：右侧停靠控制器实例。
 */
export class BibCitationRightDock {
  constructor(plugin) {
    this.plugin = plugin;
  }

  /**
   * 功能：查找当前属于本插件视图的右侧分栏 leaf。
   * 输入：无。
   * 输出：匹配的 leaf；不存在时返回 null。
   */
  findLeaf() {
    return (
      this.plugin.app?.workspace?.rightSplit?.findLeaf?.(
        (leaf) => leaf?.viewType === BIB_PANEL_VIEW_TYPE,
      ) ?? null
    );
  }

  /**
   * 功能：确保右侧分栏中存在本插件视图的 leaf，并展开右侧分栏。
   * 输入：无。
   * 输出：无返回值。
   */
  open() {
    const rightSplit = this.plugin.app?.workspace?.rightSplit;
    if (!rightSplit) {
      return;
    }
    if (!this.findLeaf()) {
      this.plugin.app?.commands?.run?.("core.workspace.right-split:ensure-leaf", [
        BIB_PANEL_VIEW_URI,
      ]);
    }
    rightSplit.expand?.();
  }

  /**
   * 功能：切换右侧面板显隐；尚未创建 leaf 时等价于打开。
   * 输入：无。
   * 输出：无返回值。
   */
  toggle() {
    if (!this.findLeaf()) {
      this.open();
      return;
    }
    this.plugin.app?.workspace?.rightSplit?.toggle?.();
  }

  /**
   * 功能：判断右侧面板当前是否可见。
   * 输入：无。
   * 输出：leaf 存在且右侧分栏未折叠时为 true。
   */
  isVisible() {
    if (!this.findLeaf()) {
      return false;
    }
    return this.plugin.app?.workspace?.rightSplit?.collapsed !== true;
  }

  /**
   * 功能：获取当前 leaf 上的面板视图实例。
   * 输入：无。
   * 输出：视图实例；不存在时返回 null。
   */
  getView() {
    return this.findLeaf()?.view ?? null;
  }

  /**
   * 功能：轻量重绘面板内容；仅在面板视图已打开时执行。
   * 输入：透传给视图 render 的 options。
   * 输出：无返回值。
   */
  refresh(options) {
    const view = this.getView();
    if (!view?.isOpen) {
      return;
    }
    view.render?.(options);
  }

  /**
   * 功能：卸载本插件视图的全部右侧 leaf。
   * 输入：无。
   * 输出：无返回值。
   */
  dispose() {
    const leaves =
      this.plugin.app?.workspace?.rightSplit?.filterLeaves?.(
        (leaf) => leaf?.viewType === BIB_PANEL_VIEW_TYPE,
      ) ?? [];
    for (const leaf of leaves) {
      leaf?.detach?.();
    }
  }
}
