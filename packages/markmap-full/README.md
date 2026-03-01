## markmap-plus

markmap-plus is an enhanced version of markmap with node creation, editing, and deletion capabilities.

It keeps the original “Markdown → mind map” workflow, and adds rich editing features on top of the rendered diagram:
- create new nodes in the mind map
- edit text of existing nodes
- delete nodes you no longer need
- select nodes for keyboard-driven operations
- export the current mind map back to Markdown

All these operations are applied incrementally without re-rendering the whole SVG tree, which keeps large diagrams responsive.

![markmap-plus Demo](https://github.com/Tem-man/markmap-plus/blob/main/public/screen_1.png)

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

### [Live Demo](https://tem-man.github.io/markmap-plus-docs/example/)

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

### API

#### View Options

The `Markmap.create` call accepts a set of options that control how users can interact with the mind map:

- `mode`: rendering mode, either `'display'` or `'editable'`.
- `editable`: whether node text can be edited in-place.
- `addable`: whether users can create new nodes from the UI.
- `deletable`: whether nodes can be deleted.
- `collapseOnHover`: whether child branches auto-collapse when the mouse leaves a node.
- `hoverBorder`: whether a border is shown when the mouse hovers a node.
- `clickBorder`: whether a border is shown when a node is selected by click.
- `inputPlaceholder`: placeholder text shown in the inline input for new nodes.

Example:

```ts
const mm = Markmap.create(svgElement, {
  mode: 'editable',
  editable: true,
  addable: true,
  deletable: true,
  collapseOnHover: true,
  hoverBorder: true,
  clickBorder: true,
  inputPlaceholder: 'Enter text',
});
```

#### Transformer

`Transformer` is responsible for turning Markdown text into the data structure that Markmap uses to render mind maps.

```ts
import { Transformer } from 'markmap-plus';

const transformer = new Transformer();
const { root, features, frontmatter } = transformer.transform(markdown);
```

- `root` is the mind map tree (an `IPureNode`) that you pass to `mm.setData(root)`.
- `features` describes which plugins and features are used in the Markdown.
- `frontmatter` contains parsed front‑matter metadata.

#### setData

`setData` is an instance method on `Markmap`. It applies a new mind map tree to the current instance and triggers a re-render.

```ts
setData(data?: IPureNode | null, opts?: Partial<IMarkmapOptions>): Promise<void>;
```

- `data`: the `IPureNode` tree returned from `Transformer.transform`. When omitted, the previous tree is kept.
- `opts`: optional view options to update together with the data.

#### getData

`getData` is an instance method on `Markmap` used to export data. It returns the current mind map tree data.

```ts
getData(): INode | undefined;
getData(pure: true): IPureNode | undefined;
```

- `mm.getData()` returns the internal runtime tree (`INode`) including layout `state`.
- `mm.getData(true)` returns a plain data tree (`IPureNode`) without layout `state`, suitable for serialization and storage.

#### toMarkdown

`toMarkdown` converts an `IPureNode` tree back into a Markdown string.

```ts
function toMarkdown(root: IPureNode): string;
```

Example:
// Get the current pure data
const pureNode = mm.getData(true);
if (pureNode) {
  // Convert back to Markdown string
  const markdown = toMarkdown(pureNode);
  console.log('Exported Markdown:', markdown);
}
```ts
import { toMarkdown } from 'markmap-plus';

const pureNode = mm.getData(true);
if (pureNode) {
  const markdown = toMarkdown(pureNode);
  console.log(markdown);
}
```

### More Documentation

For more details about interaction, keyboard shortcuts, and full API reference, see the [docs](https://tem-man.github.io/markmap-plus-docs) or the published documentation site.
