import { select, zoomTransform } from 'd3';
import type * as d3 from 'd3';
import { INode, walkTree } from 'markmap-common';
import { ID3SVGElement, IMarkmapOptions, IMarkmapState } from './types';
import { childSelector, simpleHash } from './util';

const SELECTOR_NODE = 'g.markmap-node';

/**
 * The subset of Markmap that ActionManager needs to read or call back into.
 * Keeping this as an interface avoids a circular import between action.ts ↔ view.ts.
 */
export interface IMarkmapActionContext {
  svg: ID3SVGElement;
  g: d3.Selection<SVGGElement, INode, HTMLElement, INode>;
  state: IMarkmapState;
  options: IMarkmapOptions;
  renderData: (originData?: INode) => Promise<void>;
  findElement: (node: INode) => { data: INode; g: SVGGElement } | undefined;
}

/**
 * Manages all node add / edit / delete actions and their associated UI overlays.
 *
 * Responsibilities:
 *  - Overlay lifecycle: + button, new-node input, edit input
 *  - Tree mutations: insert child, insert sibling, delete node
 *  - Selection state: editingNode, selectedNode
 *
 * view.ts creates one ActionManager per Markmap instance and delegates to it.
 */
export class ActionManager {
  /** Node currently being edited (null when idle). */
  editingNode: INode | null = null;

  /** Currently selected node (null when nothing is selected). */
  selectedNode: INode | null = null;

  /** Active edit-overlay state (shared by existing-node edits and new-node edits). */
  editOverlay?:
    | {
        wrap: HTMLDivElement;
        input: HTMLInputElement;
        contentEl: HTMLDivElement;
        prevVisibility: string;
      }
    | undefined;

  /** Active + button UI state. */
  addUI?:
    | {
        node: INode;
        btn: HTMLButtonElement;
        wrap: HTMLDivElement;
        cleanupDoc: () => void;
      }
    | undefined;

  /**
   * Kept for overlay-guard checks in view.ts.
   * In the current flow this is only set briefly during legacy paths.
   */
  addInputUI?:
    | {
        node: INode;
        input: HTMLInputElement;
        wrap: HTMLDivElement;
      }
    | undefined;

  constructor(private ctx: IMarkmapActionContext) {}

  // ── Private helpers ──────────────────────────────────────────────────────

  private _getNodeContentEl(node: INode): HTMLDivElement | null {
    const el = this.ctx.findElement(node);
    if (!el) return null;
    const fo = select(el.g).select<SVGForeignObjectElement>('foreignObject');
    const contentDiv = fo
      .select<HTMLDivElement>('div')
      .select<HTMLDivElement>('div');
    return contentDiv.node() || null;
  }

  private _getOverlayRoot(): HTMLElement {
    const svgNode = this.ctx.svg.node() as SVGSVGElement | null;
    return (svgNode?.parentElement || document.body) as HTMLElement;
  }

  private _positionOverlayToEl(
    wrap: HTMLElement,
    targetEl: Element,
    opts?: {
      anchor?: 'br' | 'r';
      dx?: number;
      dy?: number;
      minW?: number;
      minH?: number;
    },
  ) {
    const overlayRoot = this._getOverlayRoot();
    const rootStyle = window.getComputedStyle(overlayRoot);
    if (rootStyle.position === 'static')
      overlayRoot.style.position = 'relative';
    const targetRect = targetEl.getBoundingClientRect();
    const rootRect = overlayRoot.getBoundingClientRect();
    const dx = opts?.dx ?? 0;
    const dy = opts?.dy ?? 0;
    const minW = opts?.minW ?? 0;
    const minH = opts?.minH ?? 0;
    let left = targetRect.left - rootRect.left + dx;
    let top = targetRect.top - rootRect.top + dy;
    if (opts?.anchor === 'br') {
      left = targetRect.right - rootRect.left + dx;
      top = targetRect.bottom - rootRect.top + dy;
    } else if (opts?.anchor === 'r') {
      left = targetRect.right - rootRect.left + dx;
      top = targetRect.top - rootRect.top + dy;
    }
    wrap.style.left = `${left}px`;
    wrap.style.top = `${top}px`;
    if (minW) wrap.style.width = `${Math.max(minW, targetRect.width)}px`;
    if (minH) wrap.style.height = `${Math.max(minH, targetRect.height)}px`;
  }

  private _safeRemoveEl(el: HTMLElement) {
    try {
      if (el.parentNode) el.remove();
    } catch {
      // element may have already been removed
    }
  }

  private _clearSelectionCss() {
    if (!this.ctx.options.clickBorder) return;
    this.ctx.g
      .selectAll<SVGGElement, INode>(childSelector<SVGGElement>(SELECTOR_NODE))
      .classed('markmap-selected', false);
  }

  private _findParent(target: INode): { parent: INode; index: number } | null {
    if (!this.ctx.state.data) return null;
    let result: { parent: INode; index: number } | null = null;
    walkTree(this.ctx.state.data, (item, next) => {
      if (result) return;
      const children = item.children || [];
      for (let i = 0; i < children.length; i++) {
        if (children[i] === target) {
          result = { parent: item, index: i };
          return;
        }
      }
      next();
    });
    return result;
  }

  /** Create a blank child INode and append it to parent.children. */
  private _insertNewChildNode(parent: INode): INode {
    let maxId = 0;
    walkTree(this.ctx.state.data!, (item, next) => {
      if (item.state?.id > maxId) maxId = item.state.id;
      next();
    });
    const newId = maxId + 1;
    const depth = (parent.state?.depth ?? 0) + 1;
    const placeholder = '&nbsp;';
    const node: INode = {
      content: placeholder,
      children: [],
      payload: {},
      state: {
        id: newId,
        depth,
        key: `${parent.state?.id}.${newId}` + simpleHash(placeholder),
        path: [parent.state?.path, newId].filter(Boolean).join('.'),
        rect: { x: 0, y: 0, width: 0, height: 0 },
        size: [0, 0],
      },
    };
    parent.children = [...(parent.children || []), node];
    this.ctx.options.color(node);
    return node;
  }

  /**
   * Core overlay builder shared by _editNewNode and handleEdit.
   *
   * @param node        - The INode being edited (content will be mutated on save).
   * @param contentNode - The inner <div> whose position / style drives the overlay.
   * @param opts.initialValue  - Starting text in the input ('': new node, textContent: existing).
   * @param opts.minWidth      - Minimum overlay width in px.
   * @param opts.placeholder   - Input placeholder (only shown when initialValue is empty).
   * @param opts.selectAll     - Whether to select all text on focus (true for existing nodes).
   * @param opts.onSave        - Called after the overlay is torn down on a successful save.
   * @param opts.onCancel      - Called after the overlay is torn down on cancel / empty input.
   */
  private _openEditOverlay(
    node: INode,
    contentNode: HTMLDivElement,
    opts: {
      initialValue: string;
      minWidth: number;
      placeholder?: string;
      selectAll?: boolean;
      onSave: (newHtml: string) => void;
      onCancel: () => void;
    },
  ) {
    const overlayRoot = this._getOverlayRoot();
    const rootStyle = window.getComputedStyle(overlayRoot);
    if (rootStyle.position === 'static')
      overlayRoot.style.position = 'relative';

    const targetRect = contentNode.getBoundingClientRect();
    const rootRect = overlayRoot.getBoundingClientRect();

    const wrap = document.createElement('div');
    wrap.className = 'markmap-node-edit-overlay';
    wrap.style.cssText = `
      position: absolute;
      left: ${targetRect.left - rootRect.left}px;
      top: ${targetRect.top - rootRect.top}px;
      width: ${Math.max(opts.minWidth, targetRect.width)}px;
      height: ${Math.max(20, targetRect.height)}px;
      z-index: 9999;
      pointer-events: auto;
    `;

    const computedStyle = window.getComputedStyle(contentNode);
    const input = document.createElement('input');
    input.type = 'text';
    input.value = opts.initialValue;
    if (opts.placeholder) input.placeholder = opts.placeholder;
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.className = 'markmap-node-edit-overlay-input';
    input.style.cssText = `
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 2px 6px;
      border: 2px solid #52c41a;
      border-radius: 14px;
      background: #fff;
      box-sizing: border-box;
      outline: none;
      font-size: ${computedStyle.fontSize};
      font-family: ${computedStyle.fontFamily};
      line-height: ${computedStyle.lineHeight};
      font-weight: ${computedStyle.fontWeight};
      letter-spacing: ${computedStyle.letterSpacing};
      color: ${computedStyle.color};
    `;

    const prevVisibility = contentNode.style.visibility;
    contentNode.style.visibility = 'hidden';

    wrap.appendChild(input);
    overlayRoot.appendChild(wrap);
    this.editOverlay = { wrap, input, contentEl: contentNode, prevVisibility };

    setTimeout(() => {
      input.focus();
      if (opts.selectAll) input.select();
    }, 0);

    const escapeHtml = (text: string) =>
      text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    let cleanedUp = false;
    const cleanup = (cancel: boolean) => {
      if (cleanedUp) return;
      cleanedUp = true;
      input.removeEventListener('keydown', handleKeydown);
      input.removeEventListener('blur', handleBlur);
      // Restore node visibility and remove the overlay DOM
      if (this.editOverlay) {
        this.editOverlay.contentEl.style.visibility =
          this.editOverlay.prevVisibility;
        this.editOverlay.wrap.remove();
        this.editOverlay = undefined;
      } else {
        contentNode.style.visibility = prevVisibility;
        wrap.remove();
      }
      this.editingNode = null;
      if (cancel) {
        opts.onCancel();
      } else {
        opts.onSave(escapeHtml(input.value.trim()));
      }
    };

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        const text = input.value.trim();
        if (text) {
          node.content = escapeHtml(text);
          cleanup(false);
        } else {
          cleanup(true);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        cleanup(true);
      }
    };

    const handleBlur = () => {
      setTimeout(() => {
        if (document.activeElement !== input) {
          const text = input.value.trim();
          if (text) {
            node.content = escapeHtml(text);
            cleanup(false);
          } else {
            cleanup(true);
          }
        }
      }, 100);
    };

    input.addEventListener('keydown', handleKeydown);
    input.addEventListener('blur', handleBlur);
  }

  /**
   * Open an edit overlay for a freshly-inserted node.
   * Empty input → confirm saves; blank input → cancels and removes the node from the tree.
   */
  private _editNewNode(node: INode, parent: INode) {
    const element = this.ctx.findElement(node);
    if (!element) return;

    this.editingNode = node;

    const contentNode = select(element.g)
      .select<SVGForeignObjectElement>('foreignObject')
      .select<HTMLDivElement>('div')
      .select<HTMLDivElement>('div')
      .node();
    if (!contentNode) return;

    this._openEditOverlay(node, contentNode, {
      initialValue: '',
      minWidth: 120,
      placeholder: this.ctx.options.inputPlaceholder,
      selectAll: false,
      onCancel: () => {
        // Remove the placeholder node, clear selection
        parent.children = (parent.children || []).filter((c) => c !== node);
        this.hideAddUI();
        this.selectedNode = null;
        this._clearSelectionCss();
        void this.ctx.renderData();
      },
      onSave: () => {
        // node.content already updated by _openEditOverlay before onSave is called
        this.ctx.options.onNodeAdd?.(parent, node);
        this.hideAddUI();
        void this.ctx.renderData().then(() => {
          const showPlus = () => {
            this.selectedNode = node;
            if (this.ctx.options.clickBorder) {
              this.ctx.g
                .selectAll<
                  SVGGElement,
                  INode
                >(childSelector<SVGGElement>(SELECTOR_NODE))
                .classed('markmap-selected', (n) => n === node);
            }
            this.showAddUI(node);
          };
          if (this.ctx.options.duration > 0) {
            setTimeout(showPlus, this.ctx.options.duration);
          } else {
            showPlus();
          }
        });
      },
    });
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /** Reposition all active overlays after zoom / pan. */
  repositionOverlays() {
    if (this.addUI) {
      const contentEl = this._getNodeContentEl(this.addUI.node);
      if (contentEl) {
        // Sync button size with current zoom scale
        const svgEl = this.ctx.svg.node() as SVGSVGElement | null;
        const scale = svgEl ? zoomTransform(svgEl).k : 1;
        const btnSize = Math.round(16 * scale);
        const fontSize = Math.round(14 * scale);
        this.addUI.btn.style.width = `${btnSize}px`;
        this.addUI.btn.style.height = `${btnSize}px`;
        this.addUI.btn.style.fontSize = `${fontSize}px`;

        this._positionOverlayToEl(this.addUI.wrap, contentEl, {
          anchor: 'br',
          dx: Math.round(14 * scale),
          dy: 0,
        });
      }
    }
    if (this.addInputUI) {
      const contentEl = this._getNodeContentEl(this.addInputUI.node);
      if (contentEl) {
        this._positionOverlayToEl(this.addInputUI.wrap, contentEl, {
          anchor: 'r',
          dx: 16,
          dy: 0,
        });
        const inputH = 30;
        const nodeH = contentEl.getBoundingClientRect().height;
        const currentTop = parseFloat(this.addInputUI.wrap.style.top) || 0;
        this.addInputUI.wrap.style.top = `${currentTop + nodeH / 2 - inputH / 2}px`;
      }
    }
    if (this.editOverlay) {
      const overlayRoot = this._getOverlayRoot();
      const targetRect = this.editOverlay.contentEl.getBoundingClientRect();
      const rootRect = overlayRoot.getBoundingClientRect();
      this.editOverlay.wrap.style.left = `${targetRect.left - rootRect.left}px`;
      this.editOverlay.wrap.style.top = `${targetRect.top - rootRect.top}px`;
      this.editOverlay.wrap.style.width = `${Math.max(40, targetRect.width)}px`;
      this.editOverlay.wrap.style.height = `${Math.max(20, targetRect.height)}px`;
    }
  }

  /** Hide and destroy the + button and any associated input overlay. */
  hideAddUI() {
    if (this.addInputUI) {
      this._safeRemoveEl(this.addInputUI.wrap);
      this.addInputUI = undefined;
    }
    if (this.addUI) {
      this.addUI.cleanupDoc();
      this._safeRemoveEl(this.addUI.wrap);
      this.addUI = undefined;
    }
  }

  /** Show the + button anchored to the bottom-right corner of `node`. */
  showAddUI(node: INode) {
    if (!this.ctx.options.addable) return;
    if (this.editingNode) return;

    const contentEl = this._getNodeContentEl(node);
    if (!contentEl) return;

    // Same node: just reposition (e.g. after a zoom).
    if (this.addUI?.node === node) {
      this._positionOverlayToEl(this.addUI.wrap, contentEl, {
        anchor: 'br',
        dx: 14,
        dy: 0,
      });
      return;
    }

    this.hideAddUI();

    const overlayRoot = this._getOverlayRoot();
    const wrap = document.createElement('div');
    wrap.style.cssText = `
      position: absolute;
      z-index: 9999;
      pointer-events: auto;
    `;

    // Read current zoom scale so the button renders at the right size immediately
    const svgEl = this.ctx.svg.node() as SVGSVGElement | null;
    const scale = svgEl ? zoomTransform(svgEl).k : 1;
    const btnSize = Math.round(16 * scale);
    const fontSize = Math.round(14 * scale);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'markmap-add-btn';
    btn.textContent = '+';
    btn.style.cssText = `
      width: ${btnSize}px;
      height: ${btnSize}px;
      border-radius: 50%;
      background: #b4b4b4;
      color: #fff;
      font-weight: 600;
      font-size: ${fontSize}px;
      line-height: 1;
      padding: 0;
      cursor: pointer;
      box-shadow: none;
      outline: none;
      border: none;
      user-select: none;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.showAddInput(node);
    });

    wrap.style.transform = 'translate(-50%, -50%)';
    wrap.appendChild(btn);
    overlayRoot.appendChild(wrap);
    this._positionOverlayToEl(wrap, contentEl, {
      anchor: 'br',
      dx: Math.round(14 * scale),
      dy: 0,
    });

    const onDocDown = (ev: MouseEvent) => {
      const t = ev.target as Node | null;
      if (!t) return;
      if (wrap.contains(t)) return;
      if (this.addInputUI?.wrap.contains(t)) return;
      const nodeEl = this._getNodeContentEl(node);
      if (nodeEl && nodeEl.contains(t)) return;
      this.hideAddUI();
    };
    document.addEventListener('click', onDocDown, true);
    const cleanupDoc = () =>
      document.removeEventListener('click', onDocDown, true);

    this.addUI = { node, btn, wrap, cleanupDoc };
  }

  /** Delete `node` from the tree and re-render. */
  deleteNode(node: INode) {
    if (!this.ctx.options.deletable) return;
    if (!this.ctx.state.data) return;
    const found = this._findParent(node);
    if (!found) return; // root node cannot be deleted

    const { parent, index } = found;
    const children = [...(parent.children || [])];
    children.splice(index, 1);
    parent.children = children;

    this.selectedNode = null;
    this.hideAddUI();
    this._clearSelectionCss();
    void this.ctx.renderData();
  }

  /**
   * Insert a new sibling node after `sibling`, render it, then open an edit overlay.
   * Called when the user presses Enter on a selected node.
   */
  async showAddSiblingInput(sibling: INode) {
    if (!this.ctx.state.data) return;
    const found = this._findParent(sibling);
    if (!found) return; // can't add sibling to root
    const { parent, index } = found;

    // Immediately hide the + button to avoid it floating to a wrong position.
    this.hideAddUI();

    let maxId = 0;
    walkTree(this.ctx.state.data, (item, next) => {
      if (item.state?.id > maxId) maxId = item.state.id;
      next();
    });
    const newId = maxId + 1;
    const depth = sibling.state?.depth ?? 1;
    const placeholder = '&nbsp;';
    const newNode: INode = {
      content: placeholder,
      children: [],
      payload: {},
      state: {
        id: newId,
        depth,
        key: `${parent.state?.id}.${newId}` + simpleHash(placeholder),
        path: [parent.state?.path, newId].filter(Boolean).join('.'),
        rect: { x: 0, y: 0, width: 0, height: 0 },
        size: [0, 0],
      },
    };
    const children = [...(parent.children || [])];
    children.splice(index + 1, 0, newNode);
    parent.children = children;
    this.ctx.options.color(newNode);

    await this.ctx.renderData();
    if (this.ctx.options.duration > 0) {
      await new Promise<void>((resolve) =>
        setTimeout(resolve, this.ctx.options.duration),
      );
    }

    this._editNewNode(newNode, parent);
  }

  /**
   * Insert a new child node under `node`, render it, then open an edit overlay.
   * Called when the user clicks the + button or presses Tab.
   */
  async showAddInput(node: INode) {
    if (!this.ctx.state.data) return;
    this.hideAddUI();
    const child = this._insertNewChildNode(node);
    await this.ctx.renderData();
    if (this.ctx.options.duration > 0) {
      await new Promise<void>((resolve) =>
        setTimeout(resolve, this.ctx.options.duration),
      );
    }
    this._editNewNode(child, node);
  }

  /**
   * Open an edit overlay for an *existing* node.
   * Called on double-click. On confirm the node content is updated in-place.
   */
  handleEdit(e: MouseEvent, d: INode) {
    if (!this.ctx.options.editable) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    // If already editing another node, commit it first.
    if (this.editingNode) {
      this.saveEdit();
    }

    const element = this.ctx.findElement(d);
    if (!element) return;

    const contentNode = select(element.g)
      .select<SVGForeignObjectElement>('foreignObject')
      .select<HTMLDivElement>('div')
      .select<HTMLDivElement>('div')
      .node();
    if (!contentNode) return;

    // Safety: discard any stale overlay before opening a new one.
    if (this.editOverlay) {
      try {
        this.editOverlay.contentEl.style.visibility =
          this.editOverlay.prevVisibility;
        this.editOverlay.wrap.remove();
      } catch {
        /* ignore */
      }
      this.editOverlay = undefined;
    }

    const originalHtml = d.content;
    this.editingNode = d;

    this._openEditOverlay(d, contentNode, {
      initialValue: contentNode.textContent || '',
      minWidth: 40,
      selectAll: true,
      onCancel: () => {
        // 取消：恢复原始内容
        d.content = originalHtml;
        void this.ctx.renderData();
      },
      onSave: (newHtml) => {
        // node.content already updated by _openEditOverlay before onSave is called
        this.ctx.options.onNodeEdit?.(d, newHtml);
        this.hideAddUI();
        void this.ctx.renderData().then(() => {
          if (!this.ctx.options.addable) return;
          const showPlus = () => {
            this.selectedNode = d;
            if (this.ctx.options.clickBorder) {
              this.ctx.g
                .selectAll<
                  SVGGElement,
                  INode
                >(childSelector<SVGGElement>(SELECTOR_NODE))
                .classed('markmap-selected', (n) => n === d);
            }
            this.showAddUI(d);
          };
          if (this.ctx.options.duration > 0) {
            setTimeout(showPlus, this.ctx.options.duration);
          } else {
            showPlus();
          }
        });
      },
    });
  }

  /** Immediately discard any in-progress edit overlay without saving. */
  saveEdit() {
    if (this.editOverlay) {
      const { input, contentEl, prevVisibility, wrap } = this.editOverlay;
      input.remove();
      contentEl.style.visibility = prevVisibility;
      wrap.remove();
      this.editOverlay = undefined;
    }
    if (this.editingNode) this.editingNode = null;
  }
}
