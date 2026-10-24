import Image from "next/image";

/** Keeps unfinished industry artwork in place without requesting a missing file. */
export function IndustryImage({
  src,
  alt,
  sizes,
  className = "object-cover",
  position,
  priority = false,
}: {
  src: string | null;
  alt: string;
  sizes: string;
  className?: string;
  position?: string;
  priority?: boolean;
}) {
  if (!src) {
    return <div aria-hidden="true" className="absolute inset-0 bg-black" />;
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      priority={priority}
      sizes={sizes}
      className={className}
      style={{ objectPosition: position }}
    />
  );
}
