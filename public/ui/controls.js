(function () {
  const t = key => I18n.t(key);
  function close() { const panel = document.getElementById('appearance-panel'); if (panel) panel.remove(); }
  function open(event) {
    if (event) event.stopPropagation();
    if (document.getElementById('appearance-panel')) return close();
    const panel = document.createElement('section');
    panel.id = 'appearance-panel'; panel.className = 'appearance-panel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', t('appearance.title'));
    const themeOptions = Object.entries(Appearance.themes).map(([key, item]) => `<button type="button" data-theme="${key}" class="theme-style-card ${key === Appearance.theme ? 'active' : ''}" aria-pressed="${key === Appearance.theme}"><i class="theme-preview ${key}"></i><span>${t(item.label)}</span></button>`).join('');
    const randomCard = `<button type="button" class="theme-card random-card ${Appearance.randomEnabled ? 'active' : ''}" data-random="true" aria-pressed="${Appearance.randomEnabled}"><i class="random-swatch"></i><span>${t('appearance.random')}</span><small>${t('appearance.randomHint')}</small></button>`;
    const paletteOptions = Object.entries(Appearance.palettes).map(([key, item]) => `<button type="button" class="theme-card ${!Appearance.randomEnabled && key === Appearance.palette ? 'active' : ''}" data-palette="${key}" aria-pressed="${!Appearance.randomEnabled && key === Appearance.palette}"><i style="--swatch-a:${item.colors[0]};--swatch-b:${item.colors[1]}"></i><span>${t(item.label)}</span></button>`).join('');
    panel.innerHTML = `<div class="appearance-head"><strong>${t('appearance.title')}</strong><button class="icon-button" type="button" data-action="close" title="${t('appearance.close')}" aria-label="${t('appearance.close')}">${ICON.close}</button></div>
      <div class="appearance-label">${t('appearance.style')}</div><div class="theme-style-grid">${themeOptions}</div>
      <div class="appearance-label">${t('appearance.palette')}</div><div class="theme-grid">${randomCard}${paletteOptions}</div>
      <div class="appearance-label">${t('appearance.mode')}</div><div class="segmented">${[['system','monitor'],['light','sun'],['dark','moon']].map(([mode, icon]) => `<button type="button" data-mode="${mode}" class="${mode === Appearance.mode ? 'active' : ''}" aria-pressed="${mode === Appearance.mode}">${ICON[icon]}<span>${t('appearance.' + mode)}</span></button>`).join('')}</div>
      <div class="appearance-label">${t('appearance.language')}</div><div class="segmented language-segmented"><button type="button" data-locale="zh-CN" class="${I18n.locale === 'zh-CN' ? 'active' : ''}">中文</button><button type="button" data-locale="en-US" class="${I18n.locale === 'en-US' ? 'active' : ''}">English</button></div>`;
    document.body.appendChild(panel);
    panel.onclick = e => {
      e.stopPropagation(); const button = e.target.closest('button'); if (!button) return;
      if (button.dataset.action === 'close') return close();
      if (button.dataset.random) Appearance.setRandomEnabled(true);
      if (button.dataset.palette) Appearance.setPalette(button.dataset.palette);
      if (button.dataset.theme) Appearance.setTheme(button.dataset.theme);
      if (button.dataset.mode) Appearance.setMode(button.dataset.mode);
      if (button.dataset.locale) {
        I18n.setLocale(button.dataset.locale); close(); setTimeout(() => open(), 0); return;
      }
      close(); open();
    };
    requestAnimationFrame(() => panel.querySelector('button').focus());
  }
  window.toggleAppearancePanel = open;
  document.addEventListener('appearancechange', () => {
    const content = document.getElementById('content');
    if (window.App && content && content.childNodes.length) window.App.navigate(window.App.currentModule);
  });
  Appearance.apply();
  document.addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
})();
