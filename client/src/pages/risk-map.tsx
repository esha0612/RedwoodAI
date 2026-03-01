import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Map } from "lucide-react";
import type { RiskAssessment } from "@shared/schema";
import RiskMap from "@/components/risk-map";

// Returns a Tailwind text color class based on the overall risk score thresholds
function getRiskColor(score: number): string {
  if (score >= 70) return "text-destructive";   // High risk
  if (score >= 40) return "text-chart-2";        // Moderate risk
  return "text-chart-3";                         // Low risk
}

export default function RiskMapPage() {
  // Fetch all assessed properties from the API
  const { data: assessments, isLoading } = useQuery<RiskAssessment[]>({
    queryKey: ["/api/assessments"],
  });

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6">

        {/* Page header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Risk Map</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Geospatial risk heatmap overlay for assessed properties
          </p>
        </div>

        {/* Loading state — show skeleton while assessments are being fetched */}
        {isLoading ? (
          <Card>
            <CardContent className="p-5">
              <Skeleton className="h-[500px] w-full rounded-lg" />
            </CardContent>
          </Card>

        ) : assessments && assessments.length > 0 ? (
          <>
            {/* Interactive Leaflet heatmap */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Map className="w-4 h-4 text-primary" />
                  Climate Risk Heatmap
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RiskMap assessments={assessments} height="550px" />
              </CardContent>
            </Card>

            {/* Score summary cards — one per assessed property */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {assessments.map((a) => (
                <Card key={a.id} data-testid={`card-map-property-${a.id}`}>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground truncate">{a.propertyAddress}</p>
                    <p className={`text-2xl font-bold tabular-nums mt-1 ${getRiskColor(a.overallScore)}`}>
                      {a.overallScore.toFixed(1)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Overall Risk Score</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>

        ) : (
          // Empty state — no assessments exist yet
          <Card>
            <CardContent className="p-12 text-center">
              <Map className="w-8 h-8 mx-auto text-muted-foreground/40" />
              <p className="font-medium mt-2">No properties to map</p>
              <p className="text-sm text-muted-foreground mt-1">
                Upload documents with property addresses to visualize risk zones
              </p>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
