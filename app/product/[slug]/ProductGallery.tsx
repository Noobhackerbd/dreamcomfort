"use client";

import Image from "next/image";
import { useState } from "react";

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0);
  const main = images[active];

  return (
    <div>
      <div className="relative aspect-square rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden">
        {main ? (
          <Image
            src={main}
            alt={name}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 500px"
            className="object-cover"
          />
        ) : (
          <span className="text-gray-400">{name}</span>
        )}
      </div>

      {images.length > 1 && (
        <div className="mt-3 flex gap-2 flex-wrap">
          {images.map((img, i) => (
            <button
              key={img}
              onClick={() => setActive(i)}
              className={
                "relative h-16 w-16 rounded-lg overflow-hidden border-2 " +
                (i === active ? "border-brand" : "border-transparent")
              }
            >
              <Image src={img} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
