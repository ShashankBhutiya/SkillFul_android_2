import { useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Check, Compass, Zap } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUserMode } from "@/hooks/useUserMode";

interface FirstTimeTutorialProps {
  open: boolean;
  onClose: () => void;
  onStart: () => void;
}

export default function FirstTimeTutorial({ open, onClose, onStart }: FirstTimeTutorialProps) {
  const { mode, hasChosen } = useUserMode();
  const [step, setStep] = useState(0);
  const [answer, setAnswer] = useState<boolean | null>(null);
  const student = hasChosen && mode === "student";
  const steps = [
    {
      title: "Welcome to Skillful",
      description: "Build your skills one short practice session at a time. Here’s a quick tour to help you get started.",
      icon: Compass,
    },
    {
      title: "Find your practice",
      description: student
        ? "Open Explore, enter a topic and choose a level to generate AI practice. You can also try interview practice or browse classic topics."
        : "Open Explore and choose your student or working professional path. Pick a topic from the classic catalog, or use AI practice in student mode.",
      icon: BookOpen,
    },
    {
      title: "Try a practice question",
      description: student
        ? "In AI practice, tap an answer and read the explanation. In classic practice, swipe right for True or left for False, or tap the answer buttons. Try the buttons below."
        : "In classic practice, swipe right for True or left for False. You can also tap the answer buttons. Read the explanation after each answer. Try it below.",
      icon: Check,
    },
    {
      title: "Make it a daily habit",
      description: "Answer a question each day to build your streak. Check Leaderboard to see your ranking and Profile for your account and settings. Replay this tutorial anytime using the help button at the top.",
      icon: Zap,
    },
  ];
  const current = steps[step];
  const Icon = current.icon;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-2xl p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden="true">
          <Icon className="h-6 w-6" />
        </div>
        <div aria-live="polite" aria-atomic="true" className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick tour · {step + 1} of {steps.length}</p>
          <DialogTitle className="font-display text-2xl leading-tight">{current.title}</DialogTitle>
          <DialogDescription className="leading-relaxed">{current.description}</DialogDescription>
        </div>

        {step === 2 && (
          <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-xs font-medium text-muted-foreground">Sample only · does not affect your score or streak</p>
            <p className="text-sm font-semibold">Regular practice helps you build a skill.</p>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" aria-pressed={answer === false} onClick={() => setAnswer(false)}>← False</Button>
              <Button variant="outline" aria-pressed={answer === true} onClick={() => setAnswer(true)}>True →</Button>
            </div>
            {answer !== null && (
              <p role="status" className="text-sm leading-relaxed text-foreground">
                {answer ? "Correct!" : "This one is True."} Consistent practice helps you remember and apply what you learn.
              </p>
            )}
          </div>
        )}

        <div className="flex gap-1.5" role="progressbar" aria-label="Tutorial progress" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={step + 1}>
          {steps.map((_, index) => <span key={index} className={`h-1 flex-1 rounded-full ${index <= step ? "bg-primary" : "bg-muted"}`} />)}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="ghost" onClick={onClose}>Skip tutorial</Button>
          <div className="flex gap-2">
            {step > 0 && <Button variant="outline" onClick={() => setStep(step - 1)} aria-label="Previous tutorial step"><ArrowLeft className="h-4 w-4" /></Button>}
            {step < steps.length - 1
              ? <Button onClick={() => setStep(step + 1)}>Next <ArrowRight className="ml-2 h-4 w-4" /></Button>
              : <Button onClick={onStart}>Start practising <ArrowRight className="ml-2 h-4 w-4" /></Button>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
