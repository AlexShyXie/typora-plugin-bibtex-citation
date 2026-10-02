# typora-plugin-bibtex-citation

[简体中文](./README.zh.md) | English

`typora-plugin-bibtex-citation` is a Typora Community Plugin that, when you type a bracketed or narrative `@query` in Typora, searches entries from one or more configured local BibTeX files and inserts the corresponding citation keys. It also supports rendering valid citation sources into in-text citations based on a single local `.csl` file.

The plugin only reads the `.bib` and `.csl` files you configure in its settings, and inserts citation keys or rendered in-text citations into the document. It never modifies any `.bib` file, nor does it depend on any external reference manager or SQLite.

This project is forked from [adam-coates/typora-plugin-zotero](https://github.com/adam-coates/typora-plugin-zotero) -> [Li-Lazenca-Qiuqi/typora-plugin-bibtex-citation](https://github.com/Li-Lazenca-Qiuqi/typora-plugin-bibtex-citation), and has been gradually reshaped into a citation workflow oriented toward local BibTeX files.

![Version](https://img.shields.io/badge/version-v0.4.5-2f6feb)![Platform](https://img.shields.io/badge/platform-Windows-1f883d)![Node](https://img.shields.io/badge/node-%3E%3D22-8a2be2)![Typora Plugin](https://img.shields.io/badge/Typora-Community%20Plugin-0a7ea4)

## Features

- Search entries from one or more local `.bib` files by typing `@query` inside a bracketed citation
- Search by `citation key`, title, author, journal, year and other fields, then insert the citation key
- Support configuring a single local `.csl` file for citation rendering and bibliography updates
- Support reading document-level `bib` and `csl` file configuration from the YAML frontmatter at the beginning of the current Markdown file
- Provide a BibTeX panel button in the left activity bar for cache refresh, citation render/restore, and bibliography operations
- All operations are also registered in the command palette (`F1`), plus an "Insert Citation…" search dialog, so the full workflow is available even when the sidebar is disabled
- Under numeric styles (e.g. IEEE, Nature), narrative `@key` automatically falls back to bracketed rendering and never outputs a `[NO_PRINTED_FORM]` placeholder
- Support switching the UI language between `English` and `简体中文` in plugin settings
- Support multiple BibTeX files, per-entry `sourceType` path sources, and duplicate-key priority control

## Requirements

- Typora
- Typora Community Plugin Framework
- Node.js `>=22` (for running `npm install` inside the plugin directory)
- One or more local `.bib` files
- A readable local `.csl` file, if you want to use `Render / Update Citations`

## Platform Notes

- Currently verified and used daily only on Windows.
- Linux and macOS have not been system-tested; compatibility is not guaranteed for now.

## Installation
### Prerequisites
1. Install and enable the Typora Community Plugin Framework
   - Project: <https://github.com/typora-community-plugin/typora-community-plugin>
2. Prepare at least one local `.bib` file
### Install the Plugin
Clone or copy this repository into the plugin directory of the Typora Community Plugin Framework. If you also rename the GitHub repository later, it is recommended to keep the plugin directory name consistent with the repository name, i.e. `typora-plugin-bibtex-citation`; the current plugin runtime `id` remains `bibtex-citation`.
The following example uses the Typora Community Plugin Framework directory on Windows:
```powershell
cd $env:UserProfile\.typora\community-plugins\plugins\
git clone https://github.com/Lazenca-Liqiuqi/typora-plugin-bibtex-citation.git typora-plugin-bibtex-citation
```
After placing the plugin directory in the correct location, run `npm install` once inside the plugin directory. No additional build step is required.
The `npm install` step mainly installs citation rendering dependencies such as `@citation-js/core` and `@citation-js/plugin-csl`.
## Testing
The repository ships with version-controlled Node unit tests; the usual regression entry point is:
Run directly inside the plugin directory:
```powershell
npm test
```
The default test entry executes the formal unit tests under `tests/unit/`; the CSL style files under `tests/fixtures/` participate in the regression as real style fixtures. The number of tests and results depend on your local run output.
The complete behavior rules, edge cases and constraints of the current implementation are documented in [doc/note/behavior-rules.md](doc/note/behavior-rules.md).
### Enable the Plugin
1. Open Typora
2. Press `Ctrl + .` to open the global settings
3. Go to the Community Plugins page
4. Enable `BibTeX Citations` in the installed plugin list
## Configure BibTeX File Paths
After enabling the plugin, open the plugin settings. In the `BibTeX Files` area you can maintain `.bib` file entries one by one, and in the `CSL File` area configure a single `.csl` style file.
You can also switch the plugin UI language via `Display Language / 显示语言` at the top of the settings page. After switching, the plugin immediately updates the settings page and sidebar texts, but does not force a re-read of the `.bib` files.
Recommended workflow:
1. Enter a `.bib` file path in the input box
2. Choose a source category for this path
3. Click `Add BibTeX File` to add it to the list
4. To modify an existing entry, edit its input box or source category directly
5. To delete an entry, click `Remove` on the right of that row
6. In `CSL File`, enter a `.csl` path and choose its source category separately; only one file can be configured here
Example paths you can enter:
```text
./references.bib
../bib/library.bib
D:/Literature/shared.bib
./styles/american-meteorological-society.csl
```
Three source categories are currently supported:
- `Relative to the current Markdown file`
- `Relative to the folder currently opened in Typora`
- `Absolute path`
For the full path resolution, duplicate-key priority and caching rules, see [doc/note/behavior-rules.md](doc/note/behavior-rules.md).
### Document-level Configuration in Markdown YAML
You can also declare document-specific BibTeX and CSL files in the YAML frontmatter at the beginning of the current Markdown file:
```yaml
---
bib:
  - ./references.bib
  - ../shared/library.bib
csl: ./apa.csl
---
```
Only the `bib` and `csl` fields are supported. `bib` can be a single string or a list of strings, and `csl` is a single string. Paths in YAML are always resolved relative to the directory of the current Markdown file; switching to the Typora directory or absolute-path sources is not supported.
Document-level BibTeX files are merged before the `BibTeX Files` from the settings page; if duplicate citation keys occur, files listed earlier in the current Markdown YAML take priority. A document-level `csl` takes precedence over the global `CSL File` in the settings page.
## Usage
### 1. Prepare BibTeX Entries
Make sure your `.bib` file contains common BibTeX entries, for example:
```bibtex
@article{smith2024example,
  title   = {An Example Paper},
  author  = {Smith, John},
  year    = {2024},
  journal = {Journal of Examples}
}
```
### 2. Type `@query`
In a Markdown document, type a bracketed `[@query`, or a narrative `@query` at a standalone position in the body text. You can search by:
- `citation key`
- title
- author
- journal
- year
For example:
```text
[@smith
[@2024
[@example
[@smith2024example; @doe
@smith
According to @smith
```
### 3. Pick a Candidate and Insert the Citation
The plugin pops up a candidate list. You can navigate with the arrow keys and press Enter, or simply click a candidate. If the candidate bar is open but no item is selected yet, pressing Enter inserts the first suggestion by default. Example insertion result:
```text
[@smith2024example]
```
Multi-reference citation example:
```text
[@smith2024example; @doe2023study]
```
Narrative citation example:
```text
@smith2024example argues that the method improves forecast skill.
```
Under author–year styles such as APA, a narrative citation is usually rendered as `Smith (2024) argues...`. To avoid treating emails, URLs, or ordinary handles as citations, a bare `@key` must stand at an independent body-text boundary, and the key must exist in the current BibTeX library.
The candidate list insertion step only writes the citation key; it does not expand the full reference format, nor modify the original `.bib` file.

#### Matching Rules for Candidate List

Candidates are filtered by ‘inclusive matching’: perform a case-insensitive substring comparison between the search term and the retrieval text of each entry, and include it if there’s a match. The retrieval text is concatenated from the following fields:

`citation key`, title, author, editor, year/date, journal, journal alias, book title, volume, issue, number, page number, DOI, publisher, institution, school, organization.

- Matching is not limited to the beginning of fields: substrings anywhere in the title, DOI, journal name, etc., are considered matches.
- The search term is treated as a whole without spaces; in parenthetical citations, multiple references can be separated by `;` and followed by `@` to search for the next entry.
- Sorting rules: entries with `citation key` starting with the search term are placed first, followed by the rest in alphabetical order of the key, with a maximum display of 50 items.
- When the input exactly matches a complete citation key, the candidate list automatically closes (considered as completed input).
- Each candidate will display its citation key and highlight the matched segment to facilitate confirmation of ‘why this one’.

Inserting the candidate list writes only the citation key, without automatically expanding to the full reference format or modifying the original `.bib` file.

### 4. Use the Sidebar
After enabling the activity bar of the Typora Community Plugin Framework, a new BibTeX icon button appears on the left. Click it to open the plugin's sidebar panel, where you can view the current configuration and document status, and perform the following operations:
- `Refresh Cache`
- `Render / Update Citations`
- `Restore Citations`
- `Insert / Update Bibliography`
- `Remove Bibliography`
The panel also shows the current `CSL File`, the number of configured BibTeX files, the number of indexed entries, and citation statistics for the current document (e.g. "x entries / y citations"). BibTeX and CSL path summaries are displayed in the form `path (sourceType)`.
If you modify the BibTeX file list, the `Indexed Entries` in the sidebar first shows "pending refresh". At that point, manually clicking `Refresh Cache`, or directly typing `[@query` / a standalone `@query` in the document to trigger suggestion search, will re-read the library and restore the real entry count.
The four core buttons can be understood as follows:
- `Render / Update Citations`: renders strictly valid `[@key]` / `[@a; @b]`, narrative `@key`, or existing controlled citation blocks into in-text citations in the current CSL style
- `Restore Citations`: restores controlled citation blocks back to the original `[@key]`, `[@a; @b]`, or `@key`
- `Insert / Update Bibliography`: generates or updates the controlled bibliography block based on the valid citation sources in the current document
- `Remove Bibliography`: removes only the controlled bibliography block generated by this plugin
For finer citation syntax, controlled comment formats, source-of-truth rules, error stop conditions, and bibliography update behavior, see [doc/note/behavior-rules.md](doc/note/behavior-rules.md).
### 5. Use the Command Palette (F1)
All sidebar operations are also registered in the command palette, plus one search-and-insert command. Press `F1` to open the command palette, then search and run:
| Command                        | Description                                                  |
| ------------------------------ | ------------------------------------------------------------ |
| `Insert Citation…`             | Opens a search dialog: filter entries by `key` / title / author / year / journal, select with `↑↓`, insert with `Enter`, close with `Esc`; if the cursor is inside an unclosed bracket, only `@key` is inserted, otherwise a full `[@key]` is inserted |
| `Refresh BibTeX Cache`         | Force re-reads all `.bib` files and reports the current entry count via a notification |
| `Render / Update Citations`    | Same as the sidebar `Render / Update Citations`              |
| `Restore Citation Blocks`      | Same as the sidebar `Restore Citations`                      |
| `Insert / Update Bibliography` | Same as the sidebar `Insert / Update Bibliography`           |
| `Remove Bibliography`          | Same as the sidebar `Remove Bibliography`                    |
| A few notes:                   |                                                              |
- The command palette does not depend on the activity bar or the sidebar; even if the workspace sidebar is disabled, all operations remain available via `F1`
- Commands and sidebar buttons invoke the same set of plugin methods; the two entry points can be mixed freely, and repeated triggers are safe (a corresponding notice appears when nothing changes)
- If you need a shortcut, you can bind a `hotkey` to a command in the framework settings
- Command titles follow the plugin `Display Language` setting; if you change the language after startup, command titles require a Typora restart to update
## CSL Support Boundaries
- Currently supported: strict bracketed forms `[@key]` / `[@a; @b]` and Pandoc-style narrative `@key`, plus bibliography updates, same-author-same-year disambiguation, numeric citations, and superscript numeric citations.
- Numeric styles have no narrative form: a narrative `@key` under such styles automatically falls back to a whole-block re-render in normal mode (equivalent to Pandoc treating `@key` as `[@key]`), and never outputs a `[NO_PRINTED_FORM]` placeholder; author–year styles are unaffected and still render as `Smith et al. (2012)`.
- Citation sorting, citation-number and bibliography order are currently decided by the `.csl` style and the CSL processor; the plugin does not hand-write sorting rules.
- Currently NOT supported: `-@key`, narrative locators, prefixes, suffixes, more complex citation clusters, and note-style citations.
- For the full rules, boundaries and source-of-truth constraints, see [doc/note/behavior-rules.md](doc/note/behavior-rules.md).
## Troubleshooting
### Candidates and Search
- If no candidates appear after typing `@query` inside a bracketed citation, first confirm that both the Typora Community Plugin Framework and the `BibTeX Citations` plugin are enabled
- Make sure you are typing inside an unclosed bracketed citation, e.g. `[@smith`, not a bare `@smith` in body text
- If search results are incomplete or inaccurate, check whether the `.bib` file uses standard BibTeX syntax and whether entries contain common fields such as `title`, `author`, `year`, `journal`, `journaltitle`, `booktitle`, `publisher`, etc.
- If multiple files contain the same `citation key`, the file earlier in the configuration order takes precedence
### Paths and Files
- Confirm that each path in the `BibTeX Files` list still exists and has the `.bib` extension
- If a path does not take effect, first check spelling, permissions, and whether it matches the source category declared by that entry
- If using a relative path, confirm whether the entry declares "relative to the current Markdown file" or "relative to the currently opened Typora folder"; if declared as `Absolute path`, an absolute path must be provided
- Missing or unreadable BibTeX files are skipped, and a warning is printed to the console
### Citations and CSL
- If `Render / Update Citations` or `Insert / Update Bibliography` fails, first confirm that a readable `.csl` file has been configured
- If rendering or bibliography update fails, check whether the current document contains unknown keys or unsupported citation syntax
- Narrative `@key` under numeric styles falls back to bracketed rendering automatically; if you still see `[NO_PRINTED_FORM]`, confirm the plugin has been updated to a version containing the fallback logic, and check that the entry data is complete
- If you switched the `CSL File` and want to refresh already-rendered citations, simply run `Render / Update Citations` again
- For more detailed error stop conditions and rule boundaries, see [doc/note/behavior-rules.md](doc/note/behavior-rules.md)
## Notes
- Plugin ID: `bibtex-citation`
- Plugin name: `BibTeX Citations`
- The recommended repository package name is `typora-plugin-bibtex-citation`
- The plugin runtime identifier and controlled comment prefix remain `bibtex-citation`