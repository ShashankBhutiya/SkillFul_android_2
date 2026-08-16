import categorySummaries from "@/data/categorySummaries.json";
import { CategoryIcon } from "@/lib/categoryIcons";

const topics = categorySummaries.map((c) => ({
  id: c.id,
  name: c.name.split("(")[0].trim(),
}));

const TopicMarquee = () => {
  const row = [...topics, ...topics];

  return (
    <div className="relative z-10 overflow-hidden border-y border-border/40 bg-card/30 py-4 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-background to-transparent sm:w-24" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background to-transparent sm:w-24" />
      <div className="topic-marquee-track flex w-max gap-3">
        {row.map((topic, i) => (
          <span
            key={`${topic.name}-${i}`}
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-foreground/90 shadow-sm"
          >
            <CategoryIcon categoryId={topic.id} className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span>{topic.name}</span>
          </span>
        ))}
      </div>
    </div>
  );
};

export default TopicMarquee;
