import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type ToolVerificationBadgeProps = {
  toolName: string;
  claimed: boolean;
  verified: boolean | null;
  verifiedAt: string | null;
};

export function ToolVerificationBadge({
  toolName,
  claimed,
  verified,
  verifiedAt,
}: ToolVerificationBadgeProps) {
  const status = verified === true ? "verified" : verified === false ? "failed" : "pending";

  const variants: Record<
    string,
    { variant: "default" | "secondary" | "destructive" | "outline"; icon: string }
  > = {
    verified: { variant: "default", icon: "V" },
    failed: { variant: "destructive", icon: "X" },
    pending: { variant: "outline", icon: "?" },
  };

  const { variant, icon } = variants[status];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={variant} className="gap-1">
            <span className="font-mono text-xs">{icon}</span>
            {toolName}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {status === "verified" &&
              `Verified${verifiedAt ? ` on ${new Date(verifiedAt).toLocaleDateString()}` : ""}`}
            {status === "failed" && "Verification failed — integration could not be confirmed"}
            {status === "pending" && (claimed ? "Claimed but not yet verified" : "Not claimed")}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
