---
title: API
outline: deep
---

# API

## view options

The `Markmap.create` call accepts a set of options that control how users can
interact with the mind map
- `mode`: rendering mode, either `'display'` or `'editable'`.
- `editable`: whether node text can be edited in-place.
- `addable`: whether users can create new nodes from the UI.
- `deletable`: whether nodes can be deleted.
- `collapseOnHover`: whether child branches auto-collapse when the mouse
  leaves a node.
- `hoverBorder`: whether a border is shown when the mouse hovers a node.
- `clickBorder`: whether a border is shown when a node is selected by click.
- `inputPlaceholder`: placeholder text shown in the inline input for new nodes.

Example:

```ts
import { Markmap, Transformer } from 'markmap-plus';

const transformer = new Transformer();
const { root } = transformer.transform('# Editable mind map');

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

await mm.setData(root);
```

## Transformer

`Transformer` is responsible for turning Markdown text into the data structure
that Markmap uses to render mind maps.

Basic usage:

```ts
import { Transformer } from 'markmap-plus';

const transformer = new Transformer();
const { root, features, frontmatter } = transformer.transform(markdown);
```

- `root` is the mind map tree (an `IPureNode`) that you pass to
  `mm.setData(root)`.
- `features` describes which plugins and features are used in the Markdown, and
  can be used to load corresponding assets when needed.
- `frontmatter` contains parsed front‑matter metadata (if present).

In most application code you only need `root`:

```ts
import { Markmap, Transformer } from 'markmap-plus';

const transformer = new Transformer();
const { root } = transformer.transform('# My Mind Map');

const mm = Markmap.create(svgElement, { mode: 'editable' });
await mm.setData(root);
```

## setData

`setData` is an instance method on `Markmap`. It applies a new mind map tree
to the current instance and triggers a re-render.

Signature:

```ts
setData(data?: IPureNode | null, opts?: Partial<IMarkmapOptions>): Promise<void>;
```

- `data`: the `IPureNode` tree returned from `Transformer.transform`. When
  omitted, the previous tree is kept.
- `opts`: optional view options to update together with the data (same shape as
  the options passed to `Markmap.create`).

Typical usage:

```ts
import { Markmap, Transformer } from 'markmap-plus';

const transformer = new Transformer();
const mm = Markmap.create(svgElement, { mode: 'editable' });

function update(markdown: string) {
  const { root } = transformer.transform(markdown);
  mm.setData(root);
}
```

`setData` is incremental: it updates the internal tree and reuses existing
nodes where possible, which works together with markmap-plus’s incremental
rendering strategy to keep large diagrams responsive.

## getData

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

Example:

```ts
import { Markmap, Transformer } from 'markmap-plus';

const transformer = new Transformer();
const { root } = transformer.transform('# My Mind Map');

const mm = Markmap.create(svgElement, { mode: 'editable' });
await mm.setData(root);

const runtimeTree = mm.getData();
const pureTree = mm.getData(true);

localStorage.setItem('mindmap', JSON.stringify(pureTree));
console.log('runtime tree:', runtimeTree);
console.log('pure tree:', pureTree);
```

## toMarkdown

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

