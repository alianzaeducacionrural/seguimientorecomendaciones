// Contraparte de public/404.html: decodifica el path real que 404.html
// codificó en la query string (?/lider&token=x) y lo restaura con
// history.replaceState ANTES de que BrowserRouter lea la URL — por eso
// este módulo se importa primero, como efecto secundario, en main.jsx.
const l = window.location
if (l.search[1] === '/') {
  const decoded = l.search
    .slice(1)
    .split('&')
    .map((s) => s.replace(/~and~/g, '&'))
    .join('?')
  window.history.replaceState(null, null, l.pathname.slice(0, -1) + decoded + l.hash)
}
