(function (root) {
  const translateContent = () => {
    const content = document.getElementById('content');
    if (content) I18n.translate(content);
  };
  Object.keys(root.M || {}).forEach(key => {
    const render = root.M[key];
    if (typeof render !== 'function' || render.__localized) return;
    const localized = function (...args) {
      const result = render.apply(this, args);
      if (result && typeof result.then === 'function') result.finally(translateContent);
      else translateContent();
      return result;
    };
    localized.__localized = true;
    root.M[key] = localized;
  });
  ['modal','toast'].forEach(key => {
    const render = UI[key];
    UI[key] = function (...args) {
      const result = render.apply(this, args);
      const target = key === 'modal' ? document.getElementById('modal-overlay') : document.getElementById('toast-container');
      if (target) I18n.translate(target);
      return result;
    };
  });
})(window);
