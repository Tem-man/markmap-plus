import { IPureNode } from 'markmap-common';

/**
 * Convert a single HTML inline-content string to Markdown text.
 * Handles common inline elements produced by markdown-it:
 * strong, em, del/s, code, a, img, br, and HTML entities.
 */
export function htmlInlineToMarkdown(html: string): string {
  if (!html) return '';

  let md = html;

  // --- inline elements (innermost first so nesting resolves correctly) ---

  // Images: <img src="..." alt="..." />   (attr order may vary)
  md = md.replace(
    /<img(?=[^>]*?\bsrc="([^"]*)")(?=[^>]*?\balt="([^"]*)")(?=[^>]*?\btitle="([^"]*)")?[^>]*?\/?>/gi,
    (_, src, alt, title) =>
      title ? `![${alt}](${src} "${title}")` : `![${alt}](${src})`,
  );
  // fallback when alt comes before src
  md = md.replace(/<img\s[^>]*?\/?>/gi, (match) => {
    const src = (match.match(/\bsrc="([^"]*)"/) || [])[1] ?? '';
    const alt = (match.match(/\balt="([^"]*)"/) || [])[1] ?? '';
    const title = (match.match(/\btitle="([^"]*)"/) || [])[1];
    return title ? `![${alt}](${src} "${title}")` : `![${alt}](${src})`;
  });

  // Links: <a href="..." [title="..."]>…</a>
  md = md.replace(
    /<a\s[^>]*?href="([^"]*)"[^>]*?>([\s\S]*?)<\/a>/gi,
    (_, href, inner) => {
      const title = (_.match(/\btitle="([^"]*)"/) || [])[1];
      const innerMd = htmlInlineToMarkdown(inner);
      return title
        ? `[${innerMd}](${href} "${title}")`
        : `[${innerMd}](${href})`;
    },
  );

  // Strong / Bold
  md = md.replace(
    /<strong>([\s\S]*?)<\/strong>/gi,
    (_, t) => `**${htmlInlineToMarkdown(t)}**`,
  );
  md = md.replace(
    /<b>([\s\S]*?)<\/b>/gi,
    (_, t) => `**${htmlInlineToMarkdown(t)}**`,
  );

  // Emphasis / Italic
  md = md.replace(
    /<em>([\s\S]*?)<\/em>/gi,
    (_, t) => `*${htmlInlineToMarkdown(t)}*`,
  );
  md = md.replace(
    /<i>([\s\S]*?)<\/i>/gi,
    (_, t) => `*${htmlInlineToMarkdown(t)}*`,
  );

  // Strikethrough
  md = md.replace(
    /<(?:del|s)>([\s\S]*?)<\/(?:del|s)>/gi,
    (_, t) => `~~${htmlInlineToMarkdown(t)}~~`,
  );

  // Inline code  (do NOT recurse – code content is literal)
  md = md.replace(/<code>([\s\S]*?)<\/code>/gi, (_, t) => {
    // decode entities inside code spans, but don't apply Markdown formatting
    const decoded = t
      .replace(/&#x([0-9a-f]+);/gi, (_: string, hex: string) =>
        String.fromCodePoint(parseInt(hex, 16)),
      )
      .replace(/&#([0-9]+);/g, (_: string, dec: string) =>
        String.fromCodePoint(parseInt(dec, 10)),
      )
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    return '`' + decoded + '`';
  });

  // Line breaks
  md = md.replace(/<br\s*\/?>/gi, '\n');

  // Strip any remaining tags (e.g. span, mark …)
  md = md.replace(/<[^>]+>/g, '');

  // Decode HTML entities
  md = md
    // Numeric entities first (hex &#xHHHH; and decimal &#DDDD;)
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#([0-9]+);/g, (_, dec) =>
      String.fromCodePoint(parseInt(dec, 10)),
    )
    // Named entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');

  return md;
}

/**
 * Serialize an `IPureNode` tree back to a Markdown string.
 *
 * This is the conceptual inverse of `Transformer.transform()`.
 * The algorithm maps tree depth to Markdown heading levels:
 *
 * - depth 0  →  `# text`
 * - depth 1  →  `## text`
 * - depth 2  →  `### text`
 * - depth 3+ →  `- text`  (indented list items, 2 spaces per extra level)
 *
 * A blank line is inserted between heading-level siblings to keep the
 * output readable and round-trip-stable through `transform()`.
 *
 * @param root  Root node of the markmap tree (e.g. from `mm.getData(true)`).
 * @returns     Markdown string.
 *
 * @example
 * ```ts
 * import { toMarkdown } from 'markmap-lib';
 *
 * const pureNode = mm.getData(true);   // IPureNode
 * const markdown = toMarkdown(pureNode);
 * console.log(markdown);
 * ```
 */
export function toMarkdown(root: IPureNode): string {
  const lines: string[] = [];

  function walk(node: IPureNode, depth: number): void {
    const text = htmlInlineToMarkdown(node.content).trim();

    if (text) {
      if (depth <= 2) {
        // Heading level 1–3
        const hashes = '#'.repeat(depth + 1);
        // Separate from previous content with a blank line when using headings
        if (lines.length > 0) lines.push('');
        lines.push(`${hashes} ${text}`);
      } else {
        // List item for depths beyond h3
        const indent = '  '.repeat(depth - 3);
        lines.push(`${indent}- ${text}`);
      }
    }

    for (const child of node.children) {
      walk(child, depth + 1);
    }
  }

  walk(root, 0);

  // Ensure a single trailing newline
  return lines.join('\n').trimStart() + '\n';
}
