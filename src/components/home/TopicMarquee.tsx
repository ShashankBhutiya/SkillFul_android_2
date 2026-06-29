import categorySummaries from "@/data/categorySummaries.json";

const topics = categorySummaries.map((c) => ({
  name: c.name.split("(")[0].trim(),
  emoji: c.emoji,
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
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border/60 bg-background/80 px-4 py-2 text-sm font-medium text-foreground/90 shadow-sm"
          >
            <span className="text-base">{topic.emoji}</span>
            {topic.name}
          </span>
        ))}
      </div>
    </div>
  );
};

export default TopicMarquee;
