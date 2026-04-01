import { Sun, Moon, Download, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme";
import { data } from "@/lib/data";

interface Props {
  onExport: () => void;
}

export function DashboardHeader({ onExport }: Props) {
  const { theme, toggleTheme } = useTheme();

  const generatedAt = new Date(data.generatedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Left: Logo */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground flex-shrink-0">
            <BarChart3 className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold tracking-tight truncate">
              Neurogan P&L Analytics
            </h1>
            <p className="text-[11px] text-muted-foreground leading-none">
              Amazon + Shopify DTC + Faire
            </p>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="hidden sm:block text-xs text-muted-foreground tabular-nums">
            Updated {generatedAt}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            data-testid="btn-export-csv"
            className="h-8 text-xs gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            data-testid="btn-theme-toggle"
            className="h-8 w-8"
          >
            {theme === "light" ? (
              <Moon className="w-3.5 h-3.5" />
            ) : (
              <Sun className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
