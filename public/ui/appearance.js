(function (root) {
  const themes = {
    glass: { label: 'theme.glass' },
    solid: { label: 'theme.solid' }
  };
  const palettes = {
    aurora: { label: 'theme.aurora', colors: ['#6366f1', '#22d3ee', '#a855f7'] },
    ocean: { label: 'theme.ocean', colors: ['#0ea5e9', '#2dd4bf', '#3b82f6'] },
    obsidian: { label: 'theme.obsidian', colors: ['#b89246', '#e3bd70', '#59534b'] },
    peach: { label: 'theme.peach', colors: ['#fb7185', '#f9a8d4', '#f59e0b'] },
    mint: { label: 'theme.mint', colors: ['#10b981', '#84cc16', '#14b8a6'] },
    lavender: { label: 'theme.lavender', colors: ['#8b5cf6', '#c084fc', '#ec4899'] },
    indigo: { label: 'theme.indigo', colors: ['#4f46e5', '#818cf8', '#4338ca'] },
    emerald: { label: 'theme.emerald', colors: ['#059669', '#34d399', '#047857'] },
    graphite: { label: 'theme.graphite', colors: ['#475569', '#94a3b8', '#334155'] }
  };
  const storage = {
    theme: 'power-workspace-theme', palette: 'power-workspace-palette',
    random: 'power-workspace-random-palette', mode: 'power-workspace-mode'
  };
  const validMode = mode => ['system', 'light', 'dark'].includes(mode) ? mode : 'system';
  const effectiveMode = mode => mode === 'system' && root.matchMedia ? (root.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : mode;
  const pick = (current, random = Math.random) => {
    const choices = Object.keys(palettes).filter(key => key !== current);
    return choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))];
  };
  const Appearance = {
    themes, palettes, theme: 'glass', palette: 'aurora', randomEnabled: true, mode: 'system',
    apply() {
      if (typeof document === 'undefined') return;
      const resolved = effectiveMode(this.mode);
      const palette = palettes[this.palette] || palettes.aurora;
      const html = document.documentElement;
      html.dataset.theme = this.theme; html.dataset.themeFamily = this.theme;
      html.dataset.palette = this.palette; html.dataset.randomPalette = String(this.randomEnabled);
      html.dataset.mode = resolved; html.dataset.modePreference = this.mode;
      html.style.setProperty('--palette-primary', palette.colors[0]);
      html.style.setProperty('--palette-secondary', palette.colors[1]);
      html.style.setProperty('--palette-tertiary', palette.colors[2]);
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.content = resolved === 'dark' ? '#0b1020' : palette.colors[0];
      if (root.Chart) {
        root.Chart.defaults.color = getComputedStyle(html).getPropertyValue('--text-secondary').trim();
        root.Chart.defaults.borderColor = getComputedStyle(html).getPropertyValue('--border').trim();
      }
      document.dispatchEvent(new CustomEvent('appearancechange', { detail: { theme: this.theme, palette: this.palette, randomEnabled: this.randomEnabled, mode: this.mode, resolved } }));
    },
    setTheme(theme) {
      this.theme = themes[theme] ? theme : 'glass';
      if (typeof localStorage !== 'undefined') localStorage.setItem(storage.theme, this.theme);
      this.apply(); return this.theme;
    },
    setPalette(palette) {
      this.palette = palettes[palette] ? palette : 'aurora'; this.randomEnabled = false;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(storage.palette, this.palette);
        localStorage.setItem(storage.random, '0');
      }
      this.apply(); return this.palette;
    },
    setRandomEnabled(enabled, random = Math.random) {
      this.randomEnabled = Boolean(enabled);
      if (this.randomEnabled) this.palette = pick(this.palette, random);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(storage.random, this.randomEnabled ? '1' : '0');
        localStorage.setItem(storage.palette, this.palette);
      }
      this.apply(); return this.palette;
    },
    randomize(random = Math.random) { return this.setRandomEnabled(true, random); },
    setMode(mode) {
      this.mode = validMode(mode);
      if (typeof localStorage !== 'undefined') localStorage.setItem(storage.mode, this.mode);
      this.apply(); return this.mode;
    },
    init(random = Math.random) {
      if (typeof localStorage !== 'undefined') {
        const savedTheme = localStorage.getItem(storage.theme);
        const legacyPalette = palettes[savedTheme] ? savedTheme : null;
        this.theme = themes[savedTheme] ? savedTheme : 'glass';
        this.palette = palettes[localStorage.getItem(storage.palette)] ? localStorage.getItem(storage.palette) : (legacyPalette || 'aurora');
        this.randomEnabled = localStorage.getItem(storage.random) !== '0';
        this.mode = validMode(localStorage.getItem(storage.mode));
      }
      if (this.randomEnabled) {
        this.palette = pick(this.palette, random);
        if (typeof localStorage !== 'undefined') localStorage.setItem(storage.palette, this.palette);
      }
      this.apply();
      if (root.matchMedia) {
        const media = root.matchMedia('(prefers-color-scheme: dark)');
        const listener = () => { if (this.mode === 'system') this.apply(); };
        media.addEventListener ? media.addEventListener('change', listener) : media.addListener(listener);
      }
      return this;
    }
  };
  root.Appearance = Appearance;
  if (typeof module !== 'undefined' && module.exports) module.exports = Appearance;
  Appearance.init();
})(typeof window !== 'undefined' ? window : globalThis);
