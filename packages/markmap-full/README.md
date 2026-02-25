---
title: markmap-plus Guide
---

# markmap-plus

## Introduction

markmap-plus is the full browser + transformer bundle for building interactive mind maps from Markdown.

The npm package name is `markmap-plus`.

## Installation

Install from npm, Yarn, or pnpm:

```bash
# npm
npm install markmap-plus

# Yarn
yarn add markmap-plus

# pnpm
pnpm add markmap-plus
```

## Examples

### Vanilla JavaScript

The simplest way to use markmap-plus in a plain HTML page is to:

- Transform Markdown into a markmap tree using `Transformer`
- Render the tree into an SVG using `Markmap`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>markmap-plus basic example</title>
  </head>
  <body>
    <svg id="mindmap" style="width: 100%; height: 500px"></svg>

    <script type="module">
      import { Markmap, Transformer } from 'markmap-plus';

      const markdown = `# markmap-plus

- Built on markmap-lib
- Renders with markmap-view-plus
`;

      const transformer = new Transformer();
      const { root } = transformer.transform(markdown);

      const svg = document.getElementById('mindmap');
      const mm = Markmap.create(svg, {
        mode: 'editable',
      });

      mm.setData(root).then(() => {
        mm.fit();
      });
    </script>
  </body>
</html>
```

### React

Below is a minimal React component that renders an editable mind map and keeps it in sync with a textarea.

```tsx
import React, { useEffect, useRef, useState } from 'react';
import { Markmap, Transformer, toMarkdown } from 'markmap-plus';

const transformer = new Transformer();

const initialMarkdown = `# markmap-plus in React

- Edit the text on the left
- The mind map updates automatically
`;

export function MarkmapReactDemo() {
  const [value, setValue] = useState(initialMarkdown);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const mmRef = useRef<Markmap | null>(null);

  useEffect(() => {
    if (mmRef.current || !svgRef.current) return;
    const mm = Markmap.create(svgRef.current, {
      mode: 'editable',
    });
    mmRef.current = mm;
  }, []);

  useEffect(() => {
    const mm = mmRef.current;
    if (!mm) return;
    const { root } = transformer.transform(value);
    mm.setData(root).then(() => {
      mm.fit();
    });
  }, [value]);

  const handleExportMarkdown = () => {
    const mm = mmRef.current;
    if (!mm) return;
    const pureNode = mm.getData(true);
    if (!pureNode) return;
    const markdown = toMarkdown(pureNode);
    console.log('[markmap] exported markdown:', markdown);
  };

  return (
    <div style={{ display: 'flex', gap: 16 }}>
      <textarea
        style={{ width: '40%', height: 500 }}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Type Markdown here..."
      />
      <div style={{ flex: 1 }}>
        <button type="button" onClick={handleExportMarkdown}>
          Export current mind map as Markdown
        </button>
        <svg
          ref={svgRef}
          style={{ width: '100%', height: 460, display: 'block', marginTop: 8 }}
        />
      </div>
    </div>
  );
}
```

### Vue 3

This example uses the `<script setup>` syntax in Vue 3 to render an editable mind map with markmap-plus.

```vue
<script setup lang="ts">
import { Markmap, Transformer, toMarkdown } from 'markmap-plus';
import { onMounted, ref, watch } from 'vue';

const transformer = new Transformer();

const initialMarkdown = `# markmap-plus in Vue 3

- Double-click a node to edit it
- Use Tab / Enter to add nodes
`;

const value = ref(initialMarkdown);
const svgRef = ref<SVGSVGElement | null>(null);
const mmRef = ref<Markmap | null>(null);

onMounted(() => {
  if (mmRef.value || !svgRef.value) return;
  const mm = Markmap.create(svgRef.value, {
    mode: 'editable',
  });
  mmRef.value = mm;

  const { root } = transformer.transform(value.value);
  mm.setData(root).then(() => {
    mm.fit();
  });
});

watch(
  () => value.value,
  (newVal) => {
    const mm = mmRef.value;
    if (!mm) return;
    const { root } = transformer.transform(newVal);
    mm.setData(root).then(() => {
      mm.fit();
    });
  },
);

function exportMarkdown() {
  const mm = mmRef.value;
  if (!mm) return;
  const pureNode = mm.getData(true);
  if (!pureNode) return;
  const markdown = toMarkdown(pureNode);
  console.log('[markmap] exported markdown:', markdown);
}
</script>

<template>
  <div style="display: flex; gap: 16px">
    <textarea
      style="width: 40%; height: 500px"
      :value="value"
      @input="(e: Event) => (value = (e.target as HTMLTextAreaElement).value)"
      placeholder="Type Markdown here..."
    />
    <div style="flex: 1">
      <button type="button" @click="exportMarkdown">
        Export current mind map as Markdown
      </button>
      <svg
        ref="svgRef"
        style="width: 100%; height: 460px; display: block; margin-top: 8px"
      />
    </div>
  </div>
</template>
```

## Mind Map Interaction

When `mode: 'editable'` is enabled, markmap-plus provides rich keyboard and mouse interactions:

- Double-click a node to edit its text.
- Press `Tab` on a selected node to create a new child node and start editing it.
- Press `Enter` on a selected node to create a new sibling node and start editing it.
- Press `Delete` or `Backspace` on a selected node to delete it (if deletion is enabled).
- Click the small circle next to a node to expand or collapse its children.
- Click and drag on empty space to pan the viewport.
- Use the mouse wheel (or trackpad scroll) to zoom in and out.

These interactions make it easy to build and refine mind maps directly in the browser.

## API

### getData

`getData` is an instance method on `Markmap`. It returns the current mind map tree.

Type overloads:

```ts
getData(): INode | undefined;
getData(pure: true): IPureNode | undefined;
```

- `mm.getData()` returns the internal runtime tree (`INode`) including layout `state` (positions, sizes, etc.).
- `mm.getData(true)` returns a plain data tree (`IPureNode`) without layout `state`, suitable for serialization and storage.

Common use cases:

- Save the current mind map structure to a database using `mm.getData(true)`.
- Inspect the full runtime state (for debugging or tooling) using `mm.getData()`.

### toMarkdown

`toMarkdown` converts an `IPureNode` tree back into a Markdown string. It is the conceptual inverse of the `Transformer.transform` step.

Signature:

```ts
function toMarkdown(root: IPureNode): string;
```

Typical round-trip usage:

```ts
import { Markmap, Transformer, toMarkdown } from 'markmap-plus';

const transformer = new Transformer();
const { root } = transformer.transform('# My Mind Map');

const mm = Markmap.create(svgElement, { mode: 'editable' });
await mm.setData(root);

const pureNode = mm.getData(true);
if (pureNode) {
  const markdown = toMarkdown(pureNode);
  console.log(markdown);
}
```

The output Markdown is structured as:

- Top-level and second-level nodes rendered as headings (`#`, `##`, `###`).
- Deeper levels rendered as nested bullet lists.
