<script setup lang="ts">
import { Markmap, toMarkdown, Transformer } from 'markmap-plus';
import { ref, onMounted, watch } from 'vue';

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

const value = ref(initValue);
// Ref for SVG element
const refSvg = ref<SVGSVGElement | null>(null);
// Ref for markmap object
const refMm = ref<Markmap | null>(null);

onMounted(() => {
    // Create markmap and save to refMm
    if (refMm.value || !refSvg.value) return;
    const mm = Markmap.create(refSvg.value, {
        mode: 'editable',
        collapseOnHover: false,
        inputPlaceholder: '输入文字',
        onNodeEdit: (node, newContent) => {
            console.log('节点已编辑:', node);
            console.log('新内容:', newContent);
        }
    });
    refMm.value = mm;
    
    // 初始化时设置初始数据
    const transformResult = transformer.transform(value.value);
    mm.setData(transformResult.root).then(() => {
        mm.fit();
    });
});

watch(() => value.value, (newVal) => {
    // Update data for markmap once value is changed
    const mm = refMm.value;
    if (!mm) return;
    const transformResult = transformer.transform(newVal);
    mm.setData(transformResult.root).then(() => {
        mm.fit();
    });
});

const handleChange = (e: Event) => {
    const target = e.target as HTMLTextAreaElement;
    value.value = target.value;
};

const handlePrintData = () => {
    const mm = refMm.value;
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
    const mm = refMm.value;
    if (!mm) return;
    // getData(true) 返回 IPureNode（不含渲染状态，可序列化）
    const pureNode = mm.getData(true);
    if (!pureNode) return;
    // serialize 将 IPureNode 树转换为 Markdown 字符串
    const markdown = toMarkdown(pureNode);
    console.log('[markmap] serialized markdown:\n', markdown);
    // 同步回编辑框，实现"思维导图 → Markdown"的双向绑定
    value.value = markdown;
};
</script>

<template>
    <div>
        <div :style="{ padding: '8px 0', display: 'flex', gap: '8px' }">
            <button type="button" @click="handlePrintData">
                打印思维导图数据（getData）
            </button>
            <button type="button" @click="handleSerialize">
                导出为 Markdown（serialize）
            </button>
        </div>
        <div class="flex-1">
            <textarea
                class="w-full h-full border border-gray-400"
                :value="value"
                @input="handleChange"
                placeholder="在这里输入 Markdown..."
            />
        </div>
        <svg :style="{ width: '80vw', height: '500px' }" ref="refSvg"></svg>
    </div>
</template>

<style scoped>
.flex-1 {
    flex: 1;
}

.w-full {
    width: 50%;
}

.h-full {
    height: 100%;
}

.border {
    border-width: 1px;
}

.border-gray-400 {
    border-color: #9ca3af;
}
</style>
