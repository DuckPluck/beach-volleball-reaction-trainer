// Resolve the shared CSS palette for Three.js and exported result cards.
export const theme = (name: string) =>
  getComputedStyle(document.documentElement)
    .getPropertyValue(`--${name}`)
    .trim();
