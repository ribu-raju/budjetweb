import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Lightbulb, AlertTriangle, AlertOctagon } from "lucide-react";
import type { Insight } from "@/lib/insights";

const icon = { info: Lightbulb, warning: AlertTriangle, danger: AlertOctagon };
const tone = { info: "text-info bg-info/10", warning: "text-warning bg-warning/10", danger: "text-danger bg-danger/10" };

export function InsightsPanel({ insights }: { insights: Insight[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending Insights</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {insights.length === 0 ? (
          <p className="text-sm text-muted-foreground">Not enough data yet to generate insights — keep logging transactions.</p>
        ) : (
          insights.map((insight, i) => {
            const Icon = icon[insight.severity];
            return (
              <div key={i} className="flex items-start gap-2.5 rounded-lg border border-border p-3 text-sm">
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${tone[insight.severity]}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <p>{insight.text}</p>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
