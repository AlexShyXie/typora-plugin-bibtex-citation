import { DISPLAY_LANGUAGE } from "../constants.js";
import {
  parseBibFileList,
  parseSingleFileConfig,
  serializeBibFileList,
  serializeSingleFileConfig,
} from "../bibtex/settings.js";
import { BibCitationSettingTab } from "../settings/tab.js";
import {
  BIB_PANEL_VIEW_TYPE,
  BibCitationRightDock,
} from "../sidebar/right-dock.js";
import { BibCitationPanelView } from "../sidebar/panel.js";
import { BibCitationSuggest } from "../suggest/suggest.js";
import { registerSuggestInteractions } from "../suggest/interactions.js";
import { registerCommands } from "./command-runtime.js";

/**
 * 功能：把设置中的关键字段规范化为运行时约定格式。
 * 输入：插件实例。
 * 输出：无返回值。
 */
export function normalizePluginSettings(plugin) {
  plugin.settings.set(
    "bibFiles",
    serializeBibFileList(parseBibFileList(plugin.settings.get("bibFiles"))),
  );
  plugin.settings.set(
    "cslFile",
    serializeSingleFileConfig(parseSingleFileConfig(plugin.settings.get("cslFile"))),
  );
  plugin.settings.set(
    "displayLanguage",
    plugin.settings.get("displayLanguage") || DISPLAY_LANGUAGE.ZH_CN,
  );
}

/**
 * 功能：注册设置页、右侧停靠面板与建议器，完成主控层的运行时装配。
 * 输入：插件实例。
 * 输出：无返回值。
 */
export function registerPluginRuntime(plugin) {
  plugin.registerSettingTab(new BibCitationSettingTab(plugin));
  plugin.rightDock = new BibCitationRightDock(plugin);
  plugin.register(
    plugin.app.viewManager.registerView(BIB_PANEL_VIEW_TYPE, (leaf) =>
      new BibCitationPanelView(leaf, plugin),
    ),
  );
  plugin.register(() => plugin.rightDock.dispose());

  plugin._suggest = null;
  registerSuggestInteractions(plugin);

  const suggest = new BibCitationSuggest(plugin.app, plugin);
  plugin._suggest = suggest;
  plugin.registerMarkdownSugguest(suggest);

  registerCommands(plugin);
}
