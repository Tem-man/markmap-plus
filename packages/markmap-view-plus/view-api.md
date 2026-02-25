# view.ts — Markmap 类 API 文档

`view.ts` 是 markmap-view-plus 的核心渲染层，导出 `Markmap` 类。它负责 SVG 渲染、布局计算、缩放平移、数据管理，以及将用户交互事件分发给 `ActionManager`。

---

## 模块级导出

| 导出项 | 类型 | 说明 |
|--------|------|------|
| `globalCSS` | `string` | 内联的全局 CSS 样式字符串 |
| `refreshHook` | `Hook<[]>` | 全局钩子，调用时刷新所有 Markmap 实例 |
| `Markmap` | `class` | 主类 |

---

## 类：`Markmap`

### 公开属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `options` | `IMarkmapOptions` | 当前配置项（含默认值） |
| `state` | `IMarkmapState` | 运行时状态，包含 `id`、`data`、`rect`、`highlight` |
| `svg` | `ID3SVGElement` | 根 SVG 的 D3 selection |
| `styleNode` | `d3.Selection<HTMLStyleElement, ...>` | 注入样式的 `<style>` 节点 |
| `g` | `d3.Selection<SVGGElement, ...>` | 所有节点 / 连线的容器 `<g>` |
| `zoom` | `d3.ZoomBehavior` | D3 缩放行为实例 |

### 私有属性

| 属性 | 说明 |
|------|------|
| `_observer` | `ResizeObserver`，监听节点尺寸变化，防抖后触发重排 |
| `_disposeList` | 析构时需执行的清理函数列表 |
| `_actions` | `ActionManager` 实例，管理所有新增 / 编辑 / 删除 overlay 逻辑 |

---

## 构造函数

```ts
constructor(svg: string | SVGElement | ID3SVGElement, opts?: Partial<IMarkmapOptions>)
```

初始化 SVG、缩放行为、`ActionManager`，注册以下全局事件：

- **SVG background click** → 清除节点选中状态和 + 按钮
- **document keydown**：
  - `Tab` → 为选中节点新增子节点
  - `Enter` → 为选中节点新增兄弟节点
  - `Delete / Backspace` → 删除选中节点
- **ResizeObserver** → 节点宽高变化时防抖重排（编辑中跳过）

---

## 静态方法

### `Markmap.create`

```ts
static create(
  svg: string | SVGElement | ID3SVGElement,
  opts?: Partial<IMarkmapOptions>,
  data?: IPureNode | null
): Markmap
```

便捷工厂方法：创建实例并在有数据时立即调用 `setData` + `fit`。

---

## 公开实例方法

### 数据管理

#### `setData`

```ts
async setData(data?: IPureNode | null, opts?: Partial<IMarkmapOptions>): Promise<void>
```

- 可选地更新配置（`opts`）
- 将 `IPureNode` 树初始化为带 `state` 的 `INode` 树（分配 id、depth、path、key、颜色等）
- 更新 SVG 样式并触发首次 `renderData`

#### `getData`

```ts
getData(): INode | undefined
getData(pure: true): IPureNode | undefined
```

- 默认返回含运行时 `state` 的内部 `INode` 树
- 传 `pure: true` 时返回去掉 `state` 的纯数据树 `IPureNode`

#### `setOptions`

```ts
setOptions(opts?: Partial<IMarkmapOptions>): void
```

合并配置项；按需启用 / 禁用缩放（`zoom`）和平移（`pan`）事件监听。

### 渲染 & 布局

#### `renderData`

```ts
async renderData(originData?: INode): Promise<void>
```

核心渲染方法，使用 D3 数据绑定 diff 更新 SVG：

1. 遍历树收集可见节点
2. 更新高亮矩形（`SELECTOR_HIGHLIGHT`）
3. D3 enter/update/exit 节点容器 `<g>`
4. 同步更新：底部横线 `<line>`、折叠圆圈 `<circle>`、文字容器 `<foreignObject>`、连线 `<path>`
5. 等一帧（`requestAnimationFrame`）后调用 `_relayout` 计算精确坐标
6. 执行带动画的属性过渡（`transition`）
7. 若 `autoFit` 开启则调用 `fit()`

> `originData` 用于指定新节点的入场动画起始位置（通常为父节点位置）。

#### `transition`

```ts
transition<T, U, P, Q>(sel: d3.Selection<T, U, P, Q>): d3.Transition<T, U, P, Q>
```

为 D3 selection 附加持续时长为 `options.duration` 的过渡动画。

### 折叠 / 展开

#### `toggleNode`

```ts
async toggleNode(data: INode, recursive?: boolean): Promise<void>
```

切换节点的折叠状态（`payload.fold`）。`recursive=true` 时递归作用于所有子孙节点，然后触发 `renderData`。

#### `handleClick`（箭头函数属性）

```ts
handleClick = (e: MouseEvent, d: INode) => void
```

折叠圆圈的点击处理器。在 macOS 上 Cmd+Click、其他系统 Ctrl+Click 会反转 `toggleRecursively` 配置，然后调用 `toggleNode`。

### 视口控制

#### `fit`

```ts
async fit(maxScale?: number): Promise<void>
```

将整棵思维导图缩放并居中到 SVG 视口内，最大缩放比例由 `maxScale`（默认 `options.maxInitialScale`）和 `fitRatio` 共同限制。

#### `ensureVisible`

```ts
async ensureVisible(node: INode, padding?: Partial<IPadding>): Promise<void>
```

若节点不在视口内，则用最小平移量将其滚入视图。

#### `centerNode`

```ts
async centerNode(node: INode, padding?: Partial<IPadding>): Promise<void>
```

将指定节点平移到视口的几何中心。

#### `rescale`

```ts
async rescale(scale: number): Promise<void>
```

以视口中心为锚点，将画布缩放到绝对比例 `scale`。

### 高亮

#### `setHighlight`

```ts
async setHighlight(node?: INode | null): Promise<void>
```

设置当前高亮节点（在节点背后绘制矩形高亮框），传 `null/undefined` 清除高亮。

### 样式

#### `getStyleContent`

```ts
getStyleContent(): string
```

拼接全局内联 CSS（`embedGlobalCSS` 开启时）和用户自定义 `style` 函数输出。

#### `updateStyle`

```ts
updateStyle(): void
```

将 `getStyleContent()` 写入 `<style>` 节点，并同步更新 SVG 的 `class`（含 markmap id 和 collapseOnHover 类名）。

### 工具

#### `findElement`

```ts
findElement(node: INode): { data: INode; g: SVGGElement } | undefined
```

在 D3 selection 中按引用查找 `INode` 对应的 SVG `<g>` DOM 元素。

#### `handleZoom`（箭头函数属性）

```ts
handleZoom = (e: any) => void
```

D3 zoom 事件处理器：更新 `<g>` 的 `transform` 属性，并调用 `_actions.repositionOverlays()` 重新定位所有浮层。

#### `handlePan`（箭头函数属性）

```ts
handlePan = (e: WheelEvent) => void
```

滚轮平移处理器（仅 `options.pan` 启用时）：将鼠标滚轮的 `deltaX/deltaY` 转换为画布平移。

#### `destroy`

```ts
destroy(): void
```

销毁实例：移除 zoom 事件监听，清空 SVG 内容，执行 `_disposeList` 中的所有清理函数（移除 keydown 监听、隐藏浮层、断开 ResizeObserver）。

---

## 私有方法

| 方法 | 说明 |
|------|------|
| `_initializeData(node)` | 深度优先遍历 IPureNode 树，为每个节点分配 `id`、`depth`、`path`、`key`、`rect`、`size`，应用初始折叠级别 |
| `_relayout()` | 从 DOM 读取各节点实际尺寸，用 `d3-flextree` 计算布局坐标后写入 `node.state.rect`；单子节点时自动缩小水平间距 |
| `_getHighlightRect(highlight)` | 根据当前缩放比例，在节点 rect 四周各扩展 `4/k` px，用于绘制高亮矩形 |

---

## 键盘快捷键（全局监听）

| 按键 | 条件 | 效果 |
|------|------|------|
| `Tab` | 有选中节点且未在编辑 | 在选中节点下新增子节点 |
| `Enter` | 有选中节点且未在编辑 | 在选中节点后新增兄弟节点 |
| `Delete` / `Backspace` | 有选中节点且未在编辑 | 删除选中节点 |
