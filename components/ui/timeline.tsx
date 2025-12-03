"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import React, { useEffect, useRef, useState } from "react";

export interface TimelineEntry {
  title: string;
  content: React.ReactNode;
}

interface TimelineProps {
  data: TimelineEntry[];
}

export function Timeline({ data }: TimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const setTimelineHeight = () => {
      if (timelineRef.current) {
        setHeight(timelineRef.current.getBoundingClientRect().height);
      }
    };

    setTimelineHeight();
    window.addEventListener("resize", setTimelineHeight);

    return () => {
      window.removeEventListener("resize", setTimelineHeight);
    };
  }, [data]);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 10%", "end 50%"],
  });

  const heightTransform = useTransform(scrollYProgress, [0, 1], [0, height]);
  const opacityTransform = useTransform(scrollYProgress, [0, 0.1], [0, 1]);

  return (
    <div
      ref={containerRef}
      className="w-full bg-white font-sans md:px-10 dark:bg-neutral-950"
    >
      <div className="max-w-7xl mx-auto px-4 py-20 md:px-8 lg:px-10">
        <h2 className="text-lg text-black md:text-4xl mb-4 max-w-4xl dark:text-white">
          Changelog from my journey
        </h2>
        <p className="text-neutral-700 text-sm md:text-base max-w-sm dark:text-neutral-300">
          I&apos;ve been working on Aceternity for the past 2 years. Here&apos;s a
          timeline of my journey.
        </p>
      </div>

      <div ref={timelineRef} className="relative max-w-7xl mx-auto pb-20">
        {data.map((item, index) => (
          <div
            key={`${item.title}-${index}`}
            className="flex justify-start pt-10 md:pt-40 md:gap-10"
          >
            <div className="sticky top-40 z-40 flex flex-col items-center self-start max-w-xs lg:max-w-sm w-full md:flex-row">
              <div className="absolute left-3 md:left-3 flex items-center justify-center w-10 h-10 bg-white dark:bg-black rounded-full">
                <div className="h-4 w-4 rounded-full bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 p-2" />
              </div>
              <h3 className="hidden md:block text-xl md:pl-20 md:text-5xl font-bold text-neutral-500 dark:text-neutral-500">
                {item.title}
              </h3>
            </div>

            <div className="relative pl-20 pr-4 md:pl-4 w-full">
              <h3 className="md:hidden block text-2xl mb-4 text-left font-bold text-neutral-500 dark:text-neutral-500">
                {item.title}
              </h3>
              {item.content}
            </div>
          </div>
        ))}
        <div
          style={{ height: `${height}px` }}
          className="absolute md:left-8 left-8 top-0 overflow-hidden w-[2px] bg-[linear-gradient(to_bottom,var(--tw-gradient-stops))] from-transparent from-[0%] via-neutral-200 dark:via-neutral-700 to-transparent to-[99%] [mask-image:linear-gradient(to_bottom,transparent_0%,black_10%,black_90%,transparent_100%)]"
        >
          <motion.div
            style={{ height: heightTransform, opacity: opacityTransform }}
            className="absolute inset-x-0 top-0 w-[2px] bg-gradient-to-t from-purple-500 via-blue-500 via-[10%] from-[0%] to-transparent rounded-full"
          />
        </div>
      </div>
    </div>
  );
}
