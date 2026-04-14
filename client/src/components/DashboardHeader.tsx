import { Sun, Moon, Download, BarChart3, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/lib/theme";
import { useMeta } from "@/lib/data";
import { useBrand } from "@/lib/brand-context";

interface Props {
  onExport: () => void;
}

export function DashboardHeader({ onExport }: Props) {
  const { theme, toggleTheme } = useTheme();
  const { data: meta } = useMeta();
  const { brandId, setBrandId, brands, currentBrand } = useBrand();

  const generatedAt = meta?.["generatedAt"]
    ? new Date(meta["generatedAt"]).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Left: Logo + Brand Selector */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground flex-shrink-0">
            <BarChart3 className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-1.5 text-sm font-semibold tracking-tight truncate hover:text-primary transition-colors"
                  data-testid="brand-selector"
                >
                  {currentBrand?.brandName || "Loading..."}
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {brands.map((brand) => (
                  <DropdownMenuItem
                    key={brand.id}
                    onClick={() => setBrandId(brand.id)}
                    className={brandId === brand.id ? "bg-accent font-medium" : ""}
                    data-testid={`brand-option-${brand.brandKey}`}
                  >
                    <div className="flex flex-col">
                      <span>{brand.brandName}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {brand.platforms?.join(", ")}
                      </span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <p className="text-[11px] text-muted-foreground leading-none">
              P&L Analytics
            </p>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {generatedAt && (
            <span className="hidden sm:block text-xs text-muted-foreground tabular-nums">
              Updated {generatedAt}
            </span>
          )}
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
