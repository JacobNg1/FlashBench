(function () {
  const t = key => I18n.t(key);
  function close() { const panel = document.getElementById('appearance-panel'); if (panel) panel.remove(); }
  function open(event) {
    if (event) event.stopPropagation();
    if (document.getElementById('appearance-panel')) return close();
    const panel = document.createElement('section');
    panel.id = 'appearance-panel'; panel.className = 'appearance-panel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', t('appearance.title'));
    panel.innerHTML = `<div class="appearance-head"><strong>${t('appearance.title')}</strong><button class="icon-button" type="button" data-action="close" title="${t('appearance.title')}" aria-label="${t('appearance.title')}">${ICON.close}</button></div>
      <div class="appearance-label">${t('appearance.theme')}</div><div class="theme-grid">${Object.entries(Appearance.themes).map(([key, item]) => `<button type="button" class="theme-card ${key === Appearance.theme ? 'active' : ''}" data-theme="${key}" aria-pressed="${key === Appearance.theme}"><i style="--swatch:${item.color}"></i><span>${t(item.label)}</span></button>`).join('')}</div>
      <button type="button" class="appearance-random" data-action="random">${ICON.random}<span>${t('appearance.random')}</span></button>
      <div class="appearance-label">${t('appearance.mode')}</div><div class="segmented">${[['system','monitor'],['light','sun'],['dark','moon']].map(([mode, icon]) => `<button type="button" data-mode="${mode}" class="${mode === Appearance.mode ? 'active' : ''}" aria-pressed="${mode === Appearance.mode}">${ICON[icon]}<span>${t('appearance.' + mode)}</span></button>`).join('')}</div>
      <div class="appearance-label">${t('appearance.language')}</div><div class="segmented"><button type="button" data-locale="zh-CN" class="${I18n.locale === 'zh-CN' ? 'active' : ''}">中文</button><button type="button" data-locale="en-US" class="${I18n.locale === 'en-US' ? 'active' : ''}">English</button></div>`;
    document.body.appendChild(panel);
    panel.onclick = e => {
      e.stopPropagation(); const button = e.target.closest('button'); if (!button) return;
      if (button.dataset.action === 'close') return close();
      if (button.dataset.action === 'random') { Appearance.randomize(); close(); return open(); }
      if (button.dataset.theme) { Appearance.setTheme(button.dataset.theme); close(); return open(); }
      if (button.dataset.mode) { Appearance.setMode(button.dataset.mode); close(); return open(); }
      if (button.dataset.locale) { I18n.setLocale(button.dataset.locale); close(); }
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
