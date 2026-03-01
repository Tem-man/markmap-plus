import React, { useState, useRef, useEffect } from 'react';
import { Markmap, toMarkdown, Transformer } from 'markmap-plus';

const transformer = new Transformer();

const initValue = `# Markmap 编辑功能演示

## 如何编辑节点
- 双击任意节点即可编辑
- 按 Enter 保存编辑
- 按 Esc 取消编辑
- 点击其他地方也会保存

## 支持的 Markdown 语法
### 标题层级
- 一级标题
- 二级标题
- 三级标题

### 文本格式
- **粗体文本**
- *斜体文本*
- ~~删除线~~
- \`行内代码\`

## 交互功能
### 节点操作
- 点击展开/折叠
- 双击编辑内容
- 拖拽平移
- 滚轮缩放
`;


export default function MarkmapHooks() {
    const [value, setValue] = useState(initValue);
    // Ref for SVG element
    const refSvg = useRef<SVGSVGElement | null>(null);
    // Ref for markmap object
    const refMm = useRef<Markmap | null>(null);

    useEffect(() => {
        // Create markmap and save to refMm
        if (refMm.current || !refSvg.current) return;
        const mm = Markmap.create(refSvg.current, {
            mode: 'editable',
            collapseOnHover: false,
            inputPlaceholder: '输入文字',
            onNodeEdit: (node, newContent) => {
                console.log('节点已编辑:', node);
                console.log('新内容:', newContent);
            }
        });
        refMm.current = mm;
    }, []);

    useEffect(() => {
        // Update data for markmap once value is changed
        const mm = refMm.current;
        if (!mm) return;
        const transformResult = transformer.transform(value);
        mm.setData(transformResult.root).then(() => {
            mm.fit();
        });
    }, [value]); // 只依赖 value；refMm.current 是 ref，React 不追踪其变化，不应放入依赖数组

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setValue(e.target.value);
    };

    const handlePrintData = () => {
        const mm = refMm.current;
        if (!mm) return;
        // 运行时数据（包含 state、rect、size 等渲染状态）
        console.log('[markmap] runtime data:', mm.getData());
        // 纯数据（可序列化存储/传输，不包含 state）
        console.log('[markmap] pure data:', mm.getData(true));
    };

    /**
     * serialize 示例：
     * 将当前思维导图的 IPureNode 树逆向转换回 Markdown 字符串。
     * serialize() 是 Transformer.transform() 的逆操作。
     */
    const handleSerialize = () => {
        const mm = refMm.current;
        if (!mm) return;
        // getData(true) 返回 IPureNode（不含渲染状态，可序列化）
        const pureNode = mm.getData(true);
        if (!pureNode) return;
        // serialize 将 IPureNode 树转换为 Markdown 字符串
        const markdown = toMarkdown(pureNode);
        console.log('[markmap] serialized markdown:\n', markdown);
        // 同步回编辑框，实现"思维导图 → Markdown"的双向绑定
        setValue(markdown);
    };

    return (
        <React.Fragment>
            <div style={{ padding: '8px 0', display: 'flex', gap: '8px' }}>
                <button type="button" onClick={handlePrintData}>
                    打印思维导图数据（getData）
                </button>
                <button type="button" onClick={handleSerialize}>
                    导出为 Markdown（serialize）
                </button>
            </div>
            <div className="flex-1">
                <textarea
                    className="w-full h-full border border-gray-400"
                    value={value}
                    onChange={handleChange}
                    placeholder="在这里输入 Markdown..."
                />
            </div>
            <svg style={{ width: '80vw', height: '800px' }} ref={refSvg} />
        </React.Fragment>
    );
}
