# action.ts — ActionManager 类 API 文档

`action.ts` 是 markmap-view-plus 的交互逻辑层，导出 `IMarkmapActionContext` 接口和 `ActionManager` 类。  
它管理节点的新增、编辑、删除操作，以及所有 HTML 浮层（+ 按钮、编辑输入框）的生命周期。

`ActionManager` 依赖 `IMarkmapActionContext` 接口与 `Markmap` 实例通信，避免循环依赖。

---

## 接口：`IMarkmapActionContext`

`ActionManager` 构造时接受此接口，而非直接依赖 `Markmap` 类型。

```ts
interface IMarkmapActionContext {
  svg: ID3SVGElement;
  g: d3.Selection<SVGGElement, INode, HTMLElement, INode>;
  state: IMarkmapState;
  options: IMarkmapOptions;
  renderData: (originData?: INode) => Promise<void>;
  findElement: (node: INode) => { data: INode; g: SVGGElement } | undefined;
}
```

| 字段 | 说明 |
|------|------|
| `svg` | 根 SVG 的 D3 selection，用于获取宿主 DOM 和计算定位 |
| `g` | 节点容器 `<g>` 的 D3 selection，用于更新选中样式 |
| `state` | 运行时状态，主要访问 `state.data`（根节点） |
| `options` | 配置项，访问 `addable`、`editable`、`duration`、`color`、`inputPlaceholder` 等 |
| `renderData` | 触发 D3 diff 重渲染 |
| `findElement` | 按 INode 引用查找对应的 SVG `<g>` DOM 元素 |

---

## 类：`ActionManager`

### 公开状态属性

这些属性由 `view.ts` 中的事件守卫逻辑直接读取。

| 属性 | 类型 | 说明 |
|------|------|------|
| `editingNode` | `INode \| null` | 当前正在编辑的节点；非 null 时阻止其他交互 |
| `selectedNode` | `INode \| null` | 当前选中的节点；null 时不显示 + 按钮 |
| `editOverlay` | `{ wrap, input, contentEl, prevVisibility } \| undefined` | 当前活跃的编辑浮层；`view.ts` 用它判断是否处于编辑态 |
| `addUI` | `{ node, btn, wrap, cleanupDoc } \| undefined` | 当前活跃的 + 按钮浮层 |
| `addInputUI` | `{ node, input, wrap } \| undefined` | 旧路径遗留字段，`view.ts` 用于编辑守卫检查 |

---

## 公开方法

### overlay 生命周期

#### `showAddUI`

```ts
showAddUI(node: INode): void
```

在 `node` 的右下角显示 + 按钮浮层。

- 若 `options.addable` 为 false 或当前处于编辑态，直接返回
- 若已对同一节点显示过，只做重定位（如缩放后）
- 否则销毁旧浮层，创建新的 + 按钮 DOM 并绝对定位
- 点击 + 按钮触发 `showAddInput(node)`
- 注册 `document click` 监听，点击浮层外部时自动隐藏

#### `hideAddUI`

```ts
hideAddUI(): void
```

销毁所有 + 相关浮层（`addInputUI` 和 `addUI`）：移除 DOM 元素，解除 document 事件监听，清空对应状态字段。

#### `repositionOverlays`

```ts
repositionOverlays(): void
```

将所有活跃浮层（+ 按钮、输入框、编辑覆盖层）重新定位到最新的节点位置。  
在 `handleZoom` 中调用，确保缩放 / 平移后浮层不漂移。

---

### 节点操作

#### `deleteNode`

```ts
deleteNode(node: INode): void
```

从父节点的 `children` 数组中移除 `node`，清除选中状态和 + 按钮，触发 `renderData`。  
根节点无法删除（无父节点时直接返回）。

---

### 新增子节点流程

#### `showAddInput`

```ts
async showAddInput(node: INode): Promise<void>
```

点击 + 按钮 或 按 **Tab** 键时调用，完整流程：

1. `hideAddUI()` 隐藏 + 按钮
2. `_insertNewChildNode(node)` 在内存树中插入空白子节点（`&nbsp;` 占位）
3. `await renderData()` 渲染新节点入 SVG DOM
4. `await setTimeout(duration)` 等待入场动画结束
5. `_editNewNode(child, node)` 弹出与编辑现有节点完全一致的编辑覆盖层

#### `showAddSiblingInput`

```ts
async showAddSiblingInput(sibling: INode): Promise<void>
```

选中节点后按 **Enter** 键时调用，完整流程：

1. `hideAddUI()` 立即隐藏 + 按钮（防止动画期间位置错乱）
2. 在内存树中于 `sibling` 之后插入新的空白兄弟节点
3. `await renderData()` 渲染新节点
4. `await setTimeout(duration)` 等待动画
5. `_editNewNode(newNode, parent)` 弹出编辑覆盖层

两个方法的取消 / 确认行为均由 `_editNewNode` 内部的 `cleanup` 函数统一处理。

---

### 编辑节点

#### `handleEdit`

```ts
handleEdit(e: MouseEvent, d: INode): void
```

**双击**节点时由 `view.ts` 调用，对**已有节点**打开编辑覆盖层。

流程：
1. 若 `options.editable` 为 false，直接返回
2. 若已有节点在编辑，先调用 `saveEdit()` 提交
3. 查找 `d` 对应的 `<foreignObject>` → 内部 `<div>`，读取当前文字和计算样式
4. 在节点原位置创建绝对定位的 `<input>` 覆盖层（`markmap-node-edit-overlay`）
5. 将原节点内容设为 `visibility: hidden`，视觉上被 input 覆盖
6. 监听 `keydown` 和 `blur`：
   - **Enter / blur（有内容）** → 更新 `d.content`，触发 `onNodeEdit` 回调，调用 `cleanup(false)`
   - **Escape / blur（空）** → 恢复 `originalHtml`，调用 `cleanup(true)`
7. `cleanup(false)` 成功路径：等动画结束后把 + 按钮重新显示在当前节点（节点宽度因文字改变需重新定位）

#### `saveEdit`

```ts
saveEdit(): void
```

强制立即结束当前编辑覆盖层（不保存新内容），恢复节点可见性，清空 `editOverlay` 和 `editingNode`。  
通常在"开始编辑新节点前已有另一个节点在编辑"时由 `handleEdit` 自动调用。

---

## 私有方法

| 方法 | 说明 |
|------|------|
| `_getNodeContentEl(node)` | 通过 `findElement` 拿到 SVG `<g>`，再深入查找 `foreignObject > div > div`，返回节点文字容器的 `HTMLDivElement` |
| `_getOverlayRoot()` | 返回浮层挂载的宿主 DOM 元素（SVG 的父元素，fallback 为 `document.body`） |
| `_positionOverlayToEl(wrap, targetEl, opts)` | 根据 `targetEl` 的 `BoundingClientRect` 和锚点（`br` / `r`）计算浮层的绝对位置，写入 `wrap.style.left/top` |
| `_safeRemoveEl(el)` | 安全移除 DOM 元素（catch 避免已移除时报错） |
| `_clearSelectionCss()` | 移除所有节点的 `markmap-selected` CSS class |
| `_findParent(target)` | 深度优先遍历树，返回 `target` 节点的父节点引用及其在父节点 `children` 中的下标 |
| `_insertNewChildNode(parent)` | 遍历树求最大 id，构造带 `&nbsp;` 占位内容的空白 `INode`，追加到 `parent.children`，预加载颜色，返回新节点引用 |
| `_editNewNode(node, parent)` | 为**新插入节点**打开编辑覆盖层；input 初始值为空，confirm → 写入内容 + `onNodeAdd` 回调 + 移动 + 按钮；cancel → 从树中删除节点 |

---

## 交互流程图

```
点击节点
  └─► view.ts click handler
        ├─► _actions.selectedNode = node
        └─► _actions.showAddUI(node)          // + 按钮出现

双击节点
  └─► view.ts dblclick handler
        └─► _actions.handleEdit(e, node)      // 编辑覆盖层出现

点击 + 按钮
  └─► showAddInput(node)
        ├─► hideAddUI()
        ├─► _insertNewChildNode()             // 内存树插入子节点
        ├─► renderData()                      // D3 渲染
        ├─► setTimeout(duration)             // 等动画
        └─► _editNewNode(child, node)         // 编辑覆盖层出现
              ├─ Enter → 保存 → renderData() → showAddUI(child)
              └─ Esc   → 取消 → 删除子节点 → renderData()

按 Tab（选中节点时）
  └─► view.ts keydown → _actions.showAddInput(selectedNode)   // 同上

按 Enter（选中节点时）
  └─► view.ts keydown → _actions.showAddSiblingInput(selectedNode)
        ├─► hideAddUI()
        ├─► 插入兄弟节点到内存树
        ├─► renderData() + setTimeout(duration)
        └─► _editNewNode(newNode, parent)     // 同上分支

按 Delete/Backspace（选中节点时）
  └─► view.ts keydown → _actions.deleteNode(selectedNode)
        └─► 从树移除 → renderData()
```

---

## + 按钮显示时机总结

| 触发时机 | 出现位置 |
|----------|----------|
| 点击节点 | 当前点击的节点 |
| 新增子节点成功 | 新创建的子节点 |
| 新增兄弟节点成功 | 新创建的兄弟节点 |
| 编辑现有节点保存后 | 刚编辑完的节点（等布局动画结束后定位） |
| 取消新增 / 点击背景 | 隐藏 |
