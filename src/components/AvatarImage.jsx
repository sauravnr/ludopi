import React, { useMemo } from "react";
import { avatarSrcSet } from "../utils/avatar";

export default function AvatarImage({
  avatarUrl,
  size,
  alt = "",
  className = "",
}) {
  const { src, srcSet } = useMemo(
    () => avatarSrcSet(avatarUrl, size),
    [avatarUrl, size]
  );
  return (
    <img
      src={src}
      srcSet={srcSet}
      alt={alt}
      loading="lazy"
      width={size}
      height={size}
      className={className}
    />
  );
}
