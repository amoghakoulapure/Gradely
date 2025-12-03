import Image from "next/image";
import React from "react";

import { Timeline, type TimelineEntry } from "@/components/ui/timeline";

const timelineData: TimelineEntry[] = [
  {
    title: "2024",
    content: (
      <div>
        <p className="text-neutral-800 dark:text-neutral-200 text-xs md:text-sm font-normal mb-8">
          Built and launched Aceternity UI and Aceternity UI Pro from scratch.
        </p>
        <div className="grid grid-cols-2 gap-4">
          {["photo-1469474968028-56623f02e42e", "photo-1451187580459-43490279c0fa", "photo-1469474387686-36e0b0b4b52b", "photo-1489515217757-5fd1be406fef"].map(
            (id) => (
              <Image
                key={id}
                src={`https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=80`}
                alt="Project showcase"
                width={500}
                height={500}
                className="rounded-lg object-cover h-20 md:h-44 lg:h-60 w-full shadow-[0_0_24px_rgba(34,42,53,0.06),_0_1px_1px_rgba(0,0,0,0.05),_0_0_0_1px_rgba(34,42,53,0.04),_0_0_4px_rgba(34,42,53,0.08),_0_16px_68px_rgba(47,48,55,0.05),_0_1px_0_rgba(255,255,255,0.1)_inset]"
              />
            )
          )}
        </div>
      </div>
    ),
  },
  {
    title: "Early 2023",
    content: (
      <div>
        <p className="text-neutral-800 dark:text-neutral-200 text-xs md:text-sm font-normal mb-8">
          I usually run out of copy, but when I see content this big, I try to integrate lorem ipsum.
        </p>
        <p className="text-neutral-800 dark:text-neutral-200 text-xs md:text-sm font-normal mb-8">
          Lorem ipsum is for people who are too lazy to write copy. But we are not. Here are some more example of beautiful designs I built.
        </p>
        <div className="grid grid-cols-2 gap-4">
          {["photo-1470246973918-29a93221c455", "photo-1448932223592-d1fc686e76ea", "photo-1470246973918-29a93221c455", "photo-1416339134316-0e91dc9ded92"].map(
            (id, idx) => (
              <Image
                key={`${id}-${idx}`}
                src={`https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=80`}
                alt="Design inspiration"
                width={500}
                height={500}
                className="rounded-lg object-cover h-20 md:h-44 lg:h-60 w-full shadow-[0_0_24px_rgba(34,42,53,0.06),_0_1px_1px_rgba(0,0,0,0.05),_0_0_0_1px_rgba(34,42,53,0.04),_0_0_4px_rgba(34,42,53,0.08),_0_16px_68px_rgba(47,48,55,0.05),_0_1px_0_rgba(255,255,255,0.1)_inset]"
              />
            )
          )}
        </div>
      </div>
    ),
  },
  {
    title: "Changelog",
    content: (
      <div>
        <p className="text-neutral-800 dark:text-neutral-200 text-xs md:text-sm font-normal mb-4">
          Deployed 5 new components on Aceternity today
        </p>
        <div className="mb-8 space-y-2 text-neutral-700 dark:text-neutral-300 text-xs md:text-sm">
          {[
            "✅ Card grid component",
            "✅ Startup template Aceternity",
            "✅ Random file upload lol",
            "✅ Himesh Reshammiya Music CD",
            "✅ Salman Bhai Fan Club registrations open",
          ].map((text) => (
            <div key={text} className="flex gap-2 items-center">
              {text}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {["photo-1454165804606-c3d57bc86b40", "photo-1461749280684-dccba630e2f6", "photo-1500534314209-a25ddb2bd429", "photo-1469474968028-56623f02e42e"].map(
            (id, idx) => (
              <Image
                key={`${id}-${idx}`}
                src={`https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=80`}
                alt="Release asset"
                width={500}
                height={500}
                className="rounded-lg object-cover h-20 md:h-44 lg:h-60 w-full shadow-[0_0_24px_rgba(34,42,53,0.06),_0_1px_1px_rgba(0,0,0,0.05),_0_0_0_1px_rgba(34,42,53,0.04),_0_0_4px_rgba(34,42,53,0.08),_0_16px_68px_rgba(47,48,55,0.05),_0_1px_0_rgba(255,255,255,0.1)_inset]"
              />
            )
          )}
        </div>
      </div>
    ),
  },
];

export function TimelineDemo() {
  return (
    <div className="relative min-h-screen w-full">
      <div className="absolute inset-0">
        <Timeline data={timelineData} />
      </div>
    </div>
  );
}
