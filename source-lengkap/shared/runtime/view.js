/** A view contains a compiled Svelte component and explicit data, never HTML. */
export function view(component, props = {}) {
  return { component, props };
}

/** Input/button options are explicit objects, never fragments of HTML attributes. */
export function attributeProps(options) {
  if (!options) return {};
  if (typeof options !== 'object') throw new TypeError('Attributes must be an object.');
  return options;
}

export function fallbackView(content, fallback) {
  const hasContent = (item) => (Array.isArray(item) ? item.some(hasContent) : !!item);
  return hasContent(content) ? content : fallback;
}

/** Small related views can share one .svelte module without adding wrapper elements. */
export function snippetView(snippet, props = {}) {
  return { snippet, props };
}
