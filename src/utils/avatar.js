// src/utils/avatar.js

// Build efficient src and srcSet for avatar images stored on the CDN.
// Falls back to the default avatar when url is missing.
export function avatarSrcSet(url, size) {
  if (!url) {
    return { src: "/default-avatar.png", srcSet: "/default-avatar.png 1x" };
  }
  const base = `${url}?format=auto&quality=60&width=`;
  const src = `${base}${size}`;
  const srcSet = `${base}${size} ${size}w, ${base}${size * 2} ${size * 2}w`;
  return { src, srcSet };
}
