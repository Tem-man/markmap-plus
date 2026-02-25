## markmap-plus

markmap-plus is an enhanced version of markmap for building interactive mind maps directly in the browser.

It keeps the original “Markdown → mind map” workflow, and adds rich editing features on top of the rendered diagram:
- create new nodes in the mind map
- edit text of existing nodes
- delete nodes you no longer need
- select nodes for keyboard-driven operations
- export the current mind map back to Markdown

All these operations are applied incrementally without re-rendering the whole SVG tree, which keeps large diagrams responsive.

### Features

- Markdown-driven mind map rendering
- Display and editable modes
- In-place node editing
- Keyboard shortcuts for adding and removing nodes
- Incremental updates for better performance
- Export mind maps back to Markdown

### Installation

Use your preferred package manager to install:

```bash
npm install markmap-plus
# or
yarn add markmap-plus
# or
pnpm add markmap-plus
```

### Basic Usage (Vanilla JavaScript)

The basic workflow is:
- transform Markdown into a mind map tree using Transformer
- render the tree into an SVG using Markmap

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

### React Example

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

### Vue 3 Example

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

### More Documentation

For more details about interaction, keyboard shortcuts, and full API reference, see the docs in `docs/` or the published documentation site.
