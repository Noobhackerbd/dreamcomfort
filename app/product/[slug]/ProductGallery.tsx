"use client";

import { useState } from "react";

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0);
  const main = images[active];

  return (
    <div>
      <div className="aspect-square rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden">
        {main ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={main} alt={name} className="h-full w-full object-cover" />
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
                "h-16 w-16 rounded-lg overflow-hidden border-2 " +
                (i === active ? "border-brand" : "border-transparent")
              }
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
