import { useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  dateRange: { start: string; end: string };
  onDateRangeChange: (range: { start: string; end: string }) => void;
  minDate: string;
  maxDate: string;
}

function subtractWeeks(dateStr: string, weeks: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() - weeks * 7);
  return d.toISOString().slice(0, 10);
}

function getYTDStart(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getFullYear()}-01-01`;
}

export function DateRangeSelector({
  dateRange,
  onDateRangeChange,
  minDate,
  maxDate,
}: Props) {
  const presets = useMemo(
    () => [
      { label: "Last Week", start: subtractWeeks(maxDate, 1), end: maxDate },
      { label: "Last 4 Weeks", start: subtractWeeks(maxDate, 4), end: maxDate },
      {
        label: "Last 12 Weeks",
        start: subtractWeeks(maxDate, 12),
        end: maxDate,
      },
      {
        label: "Last 26 Weeks",
        start: subtractWeeks(maxDate, 26),
        end: maxDate,
      },
      { label: "YTD", start: getYTDStart(maxDate), end: maxDate },
      { label: "All", start: minDate, end: maxDate },
    ],
    [minDate, maxDate]
  );

  const activePreset = useMemo(() => {
    return presets.find(
      (p) => p.start === dateRange.start && p.end === dateRange.end
    )?.label;
  }, [presets, dateRange]);

  const handlePreset = useCallback(
    (preset: (typeof presets)[0]) => {
      onDateRangeChange({ start: preset.start, end: preset.end });
    },
    [onDateRangeChange]
  );

  return (
    <Card data-testid="date-range-selector">
      <CardContent className="p-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground mr-1">
          Date Range:
        </span>
        {presets.map((preset) => (
          <Button
            key={preset.label}
            variant={activePreset === preset.label ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs px-2.5"
            onClick={() => handlePreset(preset)}
            data-testid={`preset-${preset.label.toLowerCase().replace(/\s+/g, "-")}`}
          >
            {preset.label}
          </Button>
        ))}
        <div className="flex items-center gap-1.5 ml-auto">
          <input
            type="date"
            className="h-7 px-2 text-xs bg-background border border-border rounded-md focus:ring-1 focus:ring-ring"
            value={dateRange.start}
            min={minDate}
            max={dateRange.end}
            onChange={(e) =>
              onDateRangeChange({ ...dateRange, start: e.target.value })
            }
            data-testid="input-date-start"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <input
            type="date"
            className="h-7 px-2 text-xs bg-background border border-border rounded-md focus:ring-1 focus:ring-ring"
            value={dateRange.end}
            min={dateRange.start}
            max={maxDate}
            onChange={(e) =>
              onDateRangeChange({ ...dateRange, end: e.target.value })
            }
            data-testid="input-date-end"
          />
        </div>
      </CardContent>
    </Card>
  );
}
