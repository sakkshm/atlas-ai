import { MapPin, Route } from "lucide-react";

interface RouteDistanceCardProps {
  card: {
    type: string;
    [key: string]: any;
  };
}

const MODE_LABEL: Record<string, string> = {
  driving: "Driving",
  walking: "Walking",
  bicycling: "Biking",
  transit: "Transit",
};

export function RouteDistanceCard({ card }: RouteDistanceCardProps) {
  if (card.type === "distance_matrix") {
    return (
      <div className="glass rounded-xl px-4 py-3 text-sm w-[28rem]">
        <div className="flex items-center gap-2 mb-2 text-muted-foreground">
          <MapPin className="size-3.5" />
          <span className="text-xs font-medium uppercase tracking-wide">Distance</span>
        </div>
        {card.results?.map((result: any, i: number) => (
          <div key={i} className="text-muted-foreground text-xs mt-1">
            <div className="font-medium">{result.distance} · {result.duration}</div>
            <div className="opacity-70">{result.origin} → {result.destination}</div>
          </div>
        ))}
        {card.mode && (
          <div className="opacity-50 text-xs mt-1.5">{MODE_LABEL[card.mode] || card.mode}</div>
        )}
      </div>
    );
  }

  return (
    <div className="glass rounded-xl px-4 py-3 text-sm w-[28rem]">
      <div className="flex items-center gap-2 mb-2 text-muted-foreground">
        <Route className="size-3.5" />
        <span className="text-xs font-medium uppercase tracking-wide">Directions</span>
      </div>
      {card.routes?.slice(0, 2).map((route: any, i: number) => (
        <div key={i} className={i > 0 ? "mt-2 pt-2 border-t border-white/[0.08]" : ""}>
          <div className="font-medium">{route.distance} · {route.duration}</div>
          <div className="text-muted-foreground text-xs">{route.start_address} → {route.end_address}</div>
          {route.summary && <div className="opacity-70 text-xs">via {route.summary}</div>}
        </div>
      ))}
      <div className="flex items-center gap-2 opacity-50 text-xs mt-1.5">
        {card.mode && <span>{MODE_LABEL[card.mode] || card.mode}</span>}
        {card.step_count > 0 && <span>{card.step_count} steps</span>}
      </div>
    </div>
  );
}
