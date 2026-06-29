import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface SeoFaqProps {
  items: Array<{ question: string; answer: string }>;
}

const SeoFaq = ({ items }: SeoFaqProps) => {
  return (
    <Accordion type="single" collapsible className="w-full">
      {items.map((item, index) => (
        <AccordionItem
          key={item.question}
          value={`faq-${index}`}
          className="rounded-2xl border border-white/10 bg-card/60 px-5 mb-3"
        >
          <AccordionTrigger className="text-left font-display text-base text-foreground hover:no-underline">
            {item.question}
          </AccordionTrigger>
          <AccordionContent className="text-sm leading-7 text-muted-foreground">
            {item.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
};

export default SeoFaq;
