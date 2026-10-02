import test from "node:test";
import assert from "node:assert/strict";

import {
  createFreshModuleUrl,
  setupTyporaTestEnv,
} from "../../support/typora-test-env.mjs";

setupTyporaTestEnv();

const { renderBibSuggestion } = await import(createFreshModuleUrl("src/suggest/render.js"));

test("renderBibSuggestion 渲染标题、作者、年份、期刊和 DOI", () => {
  const html = renderBibSuggestion({
    key: "smith2024",
    title: "Forecast Skill",
    authors: "Smith, John and Doe, Jane",
    year: "2024",
    journal: "Weather Journal",
    doi: "10.1000/example",
  });

  assert.match(html, /data-bibtex-key="smith2024"/);
  assert.match(html, /Forecast Skill/);
  assert.match(html, /2024/);
  assert.match(html, /Smith and Doe/);
  assert.match(html, /Weather Journal/);
  assert.match(html, /10\.1000\/example/);
});

test("renderBibSuggestion 对 HTML 特殊字符做转义", () => {
  const html = renderBibSuggestion({
    key: `bad"key`,
    title: "<Unsafe>",
    authors: "Alpha and Beta",
    year: "",
    journal: "A & B Journal",
    doi: "10.1000/a&b",
  });

  assert.match(html, /&lt;Unsafe&gt;/);
  assert.match(html, /A &amp; B Journal/);
  assert.match(html, /10\.1000\/a&amp;b/);
  assert.match(html, /data-bibtex-key="bad&quot;key"/);
});

test("renderBibSuggestion 总是显示 citation key 行", () => {
  const html = renderBibSuggestion({
    key: "smith2024",
    title: "Forecast Skill",
  });

  assert.match(html, /class="bibtex-cite-key">@smith2024</);
});

test("renderBibSuggestion 未传查询时不高亮", () => {
  const html = renderBibSuggestion({
    key: "nature2024",
    title: "Nature Methods Paper",
    journal: "Nature",
  });

  assert.ok(!html.includes("<mark"));
  assert.ok(!html.includes("bibtex-cite-hit"));
});

test("renderBibSuggestion 按查询大小写不敏感高亮标题、年份、期刊、DOI 与 key", () => {
  const html = renderBibSuggestion(
    {
      key: "nature2024",
      title: "Nature Methods Paper",
      year: "2024",
      journal: "Nature Communications",
      doi: "10.1038/nature11055",
    },
    "NATURE",
  );

  const marks = html.match(/<mark class="bibtex-cite-hit">[^<]*<\/mark>/g) || [];
  assert.ok(marks.length >= 4);
  assert.ok(
    marks.some((mark) => mark.toLowerCase().includes("nature")),
    "命中片段应被 mark 包裹",
  );
  assert.match(html, /<mark class="bibtex-cite-hit">Nature<\/mark> Methods Paper/);
  assert.match(html, /@<mark class="bibtex-cite-hit">nature<\/mark>2024/);
  assert.match(html, /10\.1038\/<mark class="bibtex-cite-hit">nature<\/mark>11055/);
});

test("renderBibSuggestion 查询中的正则元字符按字面量匹配且不注入", () => {
  const html = renderBibSuggestion(
    {
      key: "a2024b",
      title: "C (revised) report",
    },
    "(",
  );

  assert.match(html, /C <mark class="bibtex-cite-hit">\(<\/mark>revised\) report/);
  assert.ok(!html.includes("<script"));
});
