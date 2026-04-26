import { cn } from "@/lib/utils";

export type OrderStatus = "pending" | "preparing" | "picked_up" | "delivered" | "cancelled";

const map: Record<OrderStatus, { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "bg-status-pending text-status-pending-foreground" },
  preparing: { label: "Preparing", cls: "bg-status-preparing text-status-preparing-foreground" },
  picked_up: { label: "Picked Up", cls: "bg-status-pickedup text-status-pickedup-foreground" },
  delivered: { label: "Delivered", cls: "bg-status-delivered text-status-delivered-foreground" },
  cancelled: { label: "Cancelled", cls: "bg-status-cancelled text-status-cancelled-foreground" },
};

export const StatusBadge = ({ status, className }: { status: OrderStatus; className?: string }) => {
  const { label, cls } = map[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        cls,
        className,
      )}
    >
      {label}
    </span>
  );
};
