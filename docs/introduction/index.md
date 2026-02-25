---
title: Introduction
outline: deep
---

# Introduction

## What is markmap-plus

markmap-plus is an enhanced version of markmap for interactive mind maps.

It keeps the familiar “Markdown → mind map” workflow, but adds richer editing
features directly on the diagram. With markmap-plus you can:

- create new nodes in the mind map
- edit the text of existing nodes
- delete nodes you no longer need
- select nodes for keyboard-driven operations
- export the current mind map back to Markdown text

These capabilities make markmap-plus suitable not only for viewing mind maps,
but also for building and maintaining them entirely in the browser.

All these operations are applied incrementally to the existing SVG scene,
without re-rendering the whole mind map from scratch, which brings a
significant performance improvement for large diagrams.

## Mode

markmap-plus supports two rendering modes:

- `display` mode — read-only view. Users can pan and zoom the mind map, but
  cannot change its structure.
- `editable` mode — fully interactive. Users can add, edit, delete and select
  nodes directly on the diagram (as shown in the examples where
  `mode: 'editable'` is passed to `Markmap.create`).

Choose `display` when you only need to present information, and `editable`
when you want an in-browser editor experience.

Example:

```ts
import { Markmap } from 'markmap-plus';

const mmDisplay = Markmap.create(svgElement, {
  mode: 'display',
});

const mmEditable = Markmap.create(svgElement, {
  mode: 'editable',
});
```
