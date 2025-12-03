import { Metadata } from "next";

import { TimelineDemo } from "@/components/ui/timeline-demo";

export const metadata: Metadata = {
  title: "Product Journey Timeline",
  description: "Animated changelog of our recent milestones.",
};

export default function TimelinePage() {
  return (
    <main className="min-h-screen w-full bg-background">
      <TimelineDemo />
    </main>
  );
}
