/**
 * ChannelSettings — a slide-out drawer triggered by the ⚙️ button on each channel tab.
 * Amazon tab: shows SKU Mapping UI + fee estimation toggle
 * Shopify/Faire/Ads: placeholder shells for future settings
 */
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Settings, Plus, Trash2, Wand2, AlertCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useBrand } from "@/lib/brand-context";
import { buildUrl } from "@/lib/data";

// ─── Types ─────────────────────────────────────────────────────────────────

interface SkuAlias {
  id: number;
  brandId: number;
  channel: string;
  channelSku: string;
  canonicalSku: string;
  notes: string | null;
}

interface SkuMismatches {
  mismatches: string[];
  amazonCount: number;
  shopifyCount: number;
}

// ─── SKU Mapping Panel (Amazon Settings) ───────────────────────────────────

function SkuMappingPanel() {
  const { brandId } = useBrand();
  const [newChannelSku, setNewChannelSku] = useState("");
  const [newCanonicalSku, setNewCanonicalSku] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const { data: aliases = [], isLoading } = useQuery<SkuAlias[]>({
    queryKey: ["/api/sku-aliases", brandId],
    queryFn: async () => {
      const res = await apiRequest("GET", buildUrl("/api/sku-aliases", { brandId: String(brandId) }));
      return res.json();
    },
  });

  const { data: mismatches } = useQuery<SkuMismatches>({
    queryKey: ["/api/sku-mismatches", brandId],
    queryFn: async () => {
      const res = await apiRequest("GET", buildUrl("/api/sku-mismatches", { brandId: String(brandId) }));
      return res.json();
    },
  });

  const createAlias = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/sku-aliases", {
        brandId,
        channel: "amazon",
        channelSku: newChannelSku,
        canonicalSku: newCanonicalSku,
        notes: newNotes || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sku-aliases"] });
      setNewChannelSku("");
      setNewCanonicalSku("");
      setNewNotes("");
    },
  });

  const deleteAlias = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/sku-aliases/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sku-aliases"] });
    },
  });

  return (
    <div className="space-y-6">
      {/* Auto-detect mismatches */}
      {mismatches && mismatches.mismatches.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
              {mismatches.mismatches.length} Amazon SKUs not found on Shopify
            </span>
          </div>
          <p className="text-xs text-amber-700 dark:text-amber-400 mb-2">
            These may need mapping if they correspond to Shopify products with different SKUs.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {mismatches.mismatches.slice(0, 10).map((sku) => (
              <Badge
                key={sku}
                variant="outline"
                className="text-[10px] cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900"
                onClick={() => setNewChannelSku(sku)}
              >
                {sku}
              </Badge>
            ))}
            {mismatches.mismatches.length > 10 && (
              <Badge variant="outline" className="text-[10px]">
                +{mismatches.mismatches.length - 10} more
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Add new mapping */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Add SKU Mapping</h4>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Amazon SKU</label>
            <Input
              value={newChannelSku}
              onChange={(e) => setNewChannelSku(e.target.value)}
              placeholder="e.g., US-UAC02-V2"
              className="h-8 text-sm"
              data-testid="input-channel-sku"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Canonical SKU</label>
            <Input
              value={newCanonicalSku}
              onChange={(e) => setNewCanonicalSku(e.target.value)}
              placeholder="e.g., US-UAC02"
              className="h-8 text-sm"
              data-testid="input-canonical-sku"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Notes (optional)</label>
            <Input
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="e.g., Listing recreated"
              className="h-8 text-sm"
              data-testid="input-alias-notes"
            />
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => createAlias.mutate()}
          disabled={!newChannelSku || !newCanonicalSku || createAlias.isPending}
          className="h-8 text-xs gap-1.5"
          data-testid="btn-add-alias"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Mapping
        </Button>
      </div>

      {/* Current mappings */}
      <div>
        <h4 className="text-sm font-medium mb-2">
          Current Mappings {aliases.length > 0 && `(${aliases.length})`}
        </h4>
        {aliases.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            No SKU mappings yet. Add one above or click a mismatched SKU to start.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Amazon SKU</TableHead>
                <TableHead className="text-xs">→ Canonical SKU</TableHead>
                <TableHead className="text-xs">Notes</TableHead>
                <TableHead className="text-xs w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aliases.map((alias) => (
                <TableRow key={alias.id}>
                  <TableCell className="text-xs font-mono">{alias.channelSku}</TableCell>
                  <TableCell className="text-xs font-mono">{alias.canonicalSku}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{alias.notes || "—"}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => deleteAlias.mutate(alias.id)}
                      data-testid={`btn-delete-alias-${alias.id}`}
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

// ─── Placeholder Settings Panel ────────────────────────────────────────────

function PlaceholderSettings({ channel }: { channel: string }) {
  const labels: Record<string, string[]> = {
    shopify_dtc: ["Payment processor rate override", "Discount attribution rules", "Subscription app integration"],
    faire: ["Commission rate configuration", "Minimum order rules", "Wholesale pricing tiers"],
    advertising: ["ACOS target alerts", "Budget alerts", "Attribution window settings"],
  };

  const items = labels[channel] || ["No settings configured"];

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Settings for this channel will be available in a future update.
      </p>
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item}
            className="flex items-center gap-2 p-3 border border-dashed border-border rounded-lg"
          >
            <Settings className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{item}</span>
            <Badge variant="outline" className="text-[10px] ml-auto">Coming soon</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Settings Drawer ──────────────────────────────────────────────────

interface ChannelSettingsProps {
  channel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const channelNames: Record<string, string> = {
  amazon: "Amazon",
  shopify_dtc: "Shopify DTC",
  faire: "Faire / Wholesale",
  advertising: "Advertising",
};

export function ChannelSettingsDrawer({ channel, open, onOpenChange }: ChannelSettingsProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[500px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            {channelNames[channel] || channel} Settings
          </SheetTitle>
          <SheetDescription>
            Configure channel-specific settings and mappings.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-120px)] mt-4 pr-4">
          {channel === "amazon" ? (
            <SkuMappingPanel />
          ) : (
            <PlaceholderSettings channel={channel} />
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

// ─── Settings Button (to be placed in each tab header) ─────────────────────

interface SettingsButtonProps {
  channel: string;
}

export function ChannelSettingsButton({ channel }: SettingsButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-8 text-xs gap-1.5"
        data-testid={`btn-settings-${channel}`}
      >
        <Settings className="w-3.5 h-3.5" />
        Settings
      </Button>
      <ChannelSettingsDrawer channel={channel} open={open} onOpenChange={setOpen} />
    </>
  );
}
