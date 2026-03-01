<script setup lang="ts">
import { Markmap, Transformer, toMarkdown } from 'markmap-plus';
import { onMounted, ref, watch, nextTick } from 'vue';

const transformer = new Transformer();

      const initialMarkdown = `# Markmap Editor Demo

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

`;

const value = ref(initialMarkdown);
const svgRef = ref<SVGSVGElement | null>(null);
const mmRef = ref<Markmap | null>(null);

onMounted(() => {
  if (mmRef.value || !svgRef.value) return;
  
  // Use nextTick to ensure element is mounted
  nextTick(() => {
    const mm = Markmap.create(svgRef.value!, {
      mode: 'editable',
    });
    mmRef.value = mm;
    
    const { root } = transformer.transform(value.value);
    mm.setData(root).then(() => {
      mm.fit();
    });
  });
});

watch(value, () => {
    const mm = mmRef.value;
    if (!mm) return;
    const { root } = transformer.transform(value.value);
    mm.setData(root).then(() => {
      mm.fit(); // Optional: refit on change? Maybe annoying if user is zooming
    });
});

function exportMarkdown() {
  const mm = mmRef.value;
  if (!mm) return;
  const pureNode = mm.getData(true);
  if (!pureNode) return;
  const markdown = toMarkdown(pureNode);
  
  // Create download
  const blob = new Blob([markdown], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'markmap-export.md';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
</script>

<template>
  <div class="markmap-demo">
    <div class="editor-pane">
      <textarea
        v-model="value"
        placeholder="Type Markdown here..."
      ></textarea>
    </div>
    <div class="preview-pane">
      <div class="toolbar">
        <button @click="exportMarkdown">Export MD</button>
      </div>
      <svg ref="svgRef"></svg>
    </div>
  </div>
</template>

<style scoped>
.markmap-demo {
  display: flex;
  gap: 0; /* Remove gap, use border */
  height: 500px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
  margin: 1rem 0;
  background-color: var(--vp-c-bg);
}

.editor-pane {
  flex: 1;
  border-right: 1px solid var(--vp-c-divider);
  display: flex;
  flex-direction: column;
  min-width: 200px;
}

textarea {
  width: 100%;
  height: 100%;
  padding: 1rem;
  border: none;
  resize: none;
  background-color: var(--vp-c-bg-alt);
  color: var(--vp-c-text-1);
  font-family: monospace;
  font-size: 14px;
  outline: none;
}

.preview-pane {
  flex: 2;
  display: flex;
  flex-direction: column;
  position: relative;
  min-width: 300px;
}

.toolbar {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 10;
}

button {
  padding: 6px 12px;
  background-color: var(--vp-c-brand);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: background-color 0.2s;
}

button:hover {
  background-color: var(--vp-c-brand-dark);
}

svg {
  width: 100%;
  height: 100%;
  display: block;
}
</style>