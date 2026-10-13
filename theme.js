// Loaded in <head> so a saved theme applies before the first paint, with no flash of the other one.
try { const t = localStorage.getItem('theme'); if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t; } catch {}
