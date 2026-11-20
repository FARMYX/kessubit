/**
 * Global web styles shared by the static root HTML (`app/+html.tsx`) and the
 * runtime injector (`WebStyles`). With `web.output: "single"` the root HTML
 * component never runs, so the SPA needs these rules injected at runtime.
 */
export const WEB_CSS = `
html, body { background: #FBF7F9; }
body {
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
* { box-sizing: border-box; }
::selection { background: #FBE0EC; color: #211A2B; }
::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-thumb { background: #D8C3D0; border-radius: 999px; border: 2px solid #FBF7F9; }
::-webkit-scrollbar-track { background: transparent; }
:focus-visible { outline: 2px solid #C93A72 !important; outline-offset: 2px !important; }
a { color: inherit; text-decoration: none; }
input, textarea, button { font: inherit; }
`;
