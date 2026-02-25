declare interface Window {
  mm: import('markmap-view-plus').Markmap;
  markmap: typeof import('markmap-toolbar') &
    typeof import('markmap-view-plus') & {
      cliOptions?: unknown;
    };
}
