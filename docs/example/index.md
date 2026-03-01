---
title: Example
outline: deep
---

# Example

## Live Demo

Try the interactive demo below. You can edit the Markdown on the left, and the mind map on the right will update automatically. You can also edit nodes directly on the mind map.

<ClientOnly>
  <MarkmapDemo />
</ClientOnly>

## Vanilla JavaScript

The simplest way to use markmap-plus in a plain HTML page is to:

- Transform Markdown into a mind map tree using `Transformer`
- Render the tree into an SVG using `Markmap`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>markmap-plus basic example</title>
  </head>
  <body>
    <button id="export-btn">Export to Markdown</button>
    <svg id="mindmap" style="width: 100%; height: 800px"></svg>
    <script type="module">
      import { Markmap, Transformer, toMarkdown } from 'markmap-plus';

      const initValue = `# Markmap Editor Demo

## How to use
- Edit node
    - Double-click any node to edit
    - Press Enter to save edits
    - Press Esc to cancel edits
    - Clicking elsewhere also saves
- Add node
    - Press Enter to add sibling node
    - Press Tab to add child node
    - Click + button to add arbitrary node
- Delete node
    - Press Delete to remove node

## Supported Markdown Syntax
### Heading Levels
- Level 1 Heading
- Level 2 Heading
- Level 3 Heading

### Text Formatting
- **Bold text**
- *Italic text*
- ~~Strikethrough~~
- \`Inline code\`

## Interaction
### Node Operations
- Click to expand/collapse
- Double-click to edit content
- Drag to pan
- Scroll to zoom
`;

      const transformer = new Transformer();
      const { root } = transformer.transform(initValue);

      const svg = document.getElementById('mindmap');
      const mm = Markmap.create(svg, {
        mode: 'editable',
      });

      mm.setData(root).then(() => {
        mm.fit();
      });

      document.getElementById('export-btn').addEventListener('click', () => {
        const pureNode = mm.getData(true);
        if (pureNode) {
          const exportedMarkdown = toMarkdown(pureNode);
          console.log(exportedMarkdown);
          // Create Blob object
          const blob = new Blob([exportedMarkdown], { type: 'text/markdown' });
          // Create download link
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'markmap.md';
          // Trigger download
          document.body.appendChild(a);
          a.click();
          // Cleanup
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      });
    </script>
  </body>
</html>
```

## React

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

## Vue 3

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
