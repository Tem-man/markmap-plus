declare interface Window {
  markmap: typeof import('markmap-lib') &
    typeof import('markmap-view-plus') &
    typeof import('markmap-toolbar') & {
      autoLoader?: Partial<import('.').AutoLoaderOptions>;
    };
}
