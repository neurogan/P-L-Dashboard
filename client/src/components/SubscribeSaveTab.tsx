import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  TrendingUp,
  PieChart,
  Gift,
  Upload,
  Info,
} from "lucide-react";

const placeholderCards = [
  {
    title: "S&S Revenue vs One-Time Revenue",
    description:
      "Stacked bar chart showing Subscribe & Save revenue compared to one-time purchase revenue over time.",
    icon: BarChart3,
  },
  {
    title: "S&S Subscriber Trend",
    description:
      "Track the number of active subscribers over time and identify growth patterns.",
    icon: TrendingUp,
  },
  {
    title: "S&S % of Total Units by Product",
    description:
      "See which products have the highest subscription penetration rate.",
    icon: PieChart,
  },
  {
    title: "Coupon Costs vs Retention Value",
    description:
      "Compare the cost of S&S coupons against the lifetime value of retained subscribers.",
    icon: Gift,
  },
];

export function SubscribeSaveTab() {
  return (
    <div className="space-y-4" data-testid="subscribe-save-tab">
      {/* Info banner */}
      <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30">
        <CardContent className="p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Subscribe &amp; Save Analytics
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              S&S analytics will appear here once subscription data is connected.
              Upload your S&S report from Amazon Seller Central to unlock these insights.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Placeholder cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {placeholderCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.title}
              className="border-dashed border-2 border-border/60"
              data-testid={`sns-card-${card.title.toLowerCase().replace(/[^a-z]+/g, "-")}`}
            >
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  {card.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="h-28 flex items-center justify-center border border-dashed border-border/40 rounded-md bg-muted/30">
                  <p className="text-xs text-muted-foreground/60 text-center px-4">
                    {card.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Upload button */}
      <div className="flex justify-center pt-2">
        <Button
          variant="outline"
          disabled
          className="gap-2"
          data-testid="btn-upload-sns"
        >
          <Upload className="w-4 h-4" />
          Upload S&S Data
        </Button>
      </div>
    </div>
  );
}
