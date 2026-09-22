import { Link } from "react-router-dom";
import { KeyRound } from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";

export function NotConfiguredBanner() {
  return (
    <Card className="p-6 flex flex-col sm:flex-row sm:items-center gap-4">
      <span className="w-11 h-11 rounded-xl bg-amber/15 text-amber flex items-center justify-center flex-shrink-0">
        <KeyRound className="w-5 h-5" />
      </span>
      <div className="flex-1">
        <h3 className="font-display font-semibold">AI provider not configured</h3>
        <p className="text-sm text-paper/60 mt-0.5">
          To generate reviewers, quizzes, or flashcards, connect an AI provider using your own API key.
        </p>
      </div>
      <Link to="/ai-settings">
        <Button variant="primary">Configure AI</Button>
      </Link>
    </Card>
  );
}
