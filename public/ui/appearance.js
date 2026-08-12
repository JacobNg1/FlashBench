(function (root) {
  const themes = {
    aurora: { family: 'premium', label: 'theme.aurora', color: '#695cff' }, ocean: { family: 'premium', label: 'theme.ocean', color: '#078f9d' }, obsidian: { family: 'premium', label: 'theme.obsidian', color: '#b89246' },
    peach: { family: 'cute', label: 'theme.peach', color: '#f4729f' }, mint: { family: 'cute', label: 'theme.mint', color: '#39b98a' }, lavender: { family: 'cute', label: 'theme.lavender', color: '#9b78ef' },
    indigo: { family: 'solid', label: 'theme.indigo', color: '#4f46e5' }, emerald: { family: 'solid', label: 'theme.emerald', color: '#059669' }, graphite: { family: 'solid', label: 'theme.graphite', color: '#475569' }
  };
  const storage = { theme: 'power-workspace-theme', mode: 'power-workspace-mode' };
  const validMode = mode => ['system', 'light', 'dark'].includes(mode) ? mode : 'system';
  const effectiveMode = mode => mode === 'system' && root.matchMedia ? (root.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : mode;
  const Appearance = {
    themes, theme: 'aurora', mode: 'system',
    apply() {
      if (typeof document === 'undefined') return;
      const theme = themes[this.theme] || themes.aurora;
      const resolved = effectiveMode(this.mode);
      const html = document.documentElement;
      html.dataset.theme = this.theme; html.dataset.themeFamily = theme.family; html.dataset.mode = resolved; html.dataset.modePreference = this.mode;
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.content = resolved === 'dark' ? '#11131a' : theme.color;
      if (root.Chart) { root.Chart.defaults.color = getComputedStyle(html).getPropertyValue('--text-secondary').trim(); root.Chart.defaults.borderColor = getComputedStyle(html).getPropertyValue('--border').trim(); }
      document.dispatchEvent(new CustomEvent('appearancechange', { detail: { theme: this.theme, mode: this.mode, resolved } }));
    },
    setTheme(theme) { this.theme = themes[theme] ? theme : 'aurora'; if (typeof localStorage !== 'undefined') localStorage.setItem(storage.theme, this.theme); this.apply(); return this.theme; },
    setMode(mode) { this.mode = validMode(mode); if (typeof localStorage !== 'undefined') localStorage.setItem(storage.mode, this.mode); this.apply(); return this.mode; },
    randomize(random = Math.random) { const choices = Object.keys(themes).filter(key => key !== this.theme); return this.setTheme(choices[Math.floor(random() * choices.length)]); },
    init() {
      if (typeof localStorage !== 'undefined') { this.theme = themes[localStorage.getItem(storage.theme)] ? localStorage.getItem(storage.theme) : 'aurora'; this.mode = validMode(localStorage.getItem(storage.mode)); }
      this.apply();
      if (root.matchMedia) { const media = root.matchMedia('(prefers-color-scheme: dark)'); const listener = () => { if (this.mode === 'system') this.apply(); }; media.addEventListener ? media.addEventListener('change', listener) : media.addListener(listener); }
      return this;
    }
  };
  root.Appearance = Appearance;
  if (typeof module !== 'undefined' && module.exports) module.exports = Appearance;
  Appearance.init();
})(typeof window !== 'undefined' ? window : globalThis);
