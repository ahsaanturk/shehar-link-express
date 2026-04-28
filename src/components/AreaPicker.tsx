import { ChevronDown, MapPin, Check } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useArea } from "@/hooks/useArea";
import { useState } from "react";

export const AreaPicker = () => {
  const { areas, selectedArea, setSelectedArea } = useArea();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="flex items-center gap-1 text-sm font-semibold">
          <MapPin className="h-4 w-4 text-primary" />
          <span className="max-w-[200px] truncate">{selectedArea?.name ?? "Select area"}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Choose your delivery area</SheetTitle>
        </SheetHeader>
        <p className="mt-1 text-xs text-muted-foreground">
          Muzaffarabad is split into smaller zones for faster delivery.
        </p>
        <ul className="mt-4 space-y-1">
          {areas.map((a) => {
            const active = selectedArea?.id === a.id;
            return (
              <li key={a.id}>
                <button
                  onClick={() => {
                    setSelectedArea(a);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left transition ${
                    active ? "border-primary bg-secondary" : "border-border bg-card"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <MapPin className={`h-4 w-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="text-sm font-semibold">{a.name}</span>
                  </span>
                  {active && <Check className="h-4 w-4 text-primary" />}
                </button>
              </li>
            );
          })}
          {areas.length === 0 && (
            <li className="py-6 text-center text-sm text-muted-foreground">No areas available.</li>
          )}
        </ul>
      </SheetContent>
    </Sheet>
  );
};
