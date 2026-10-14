// Vite replaces this constant at build time; backend-enabled builds stay the default.
export const isStaticPreview =
  typeof __KSPPS_STATIC_PREVIEW__ !== 'undefined' && __KSPPS_STATIC_PREVIEW__;
