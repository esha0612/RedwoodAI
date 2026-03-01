import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, MapPin, Droplets, Flame, Mountain, Wind } from "lucide-react";
import type { RiskAssessment } from "@shared/schema";
import { RiskGauge } from "@/components/risk-gauge";

function RiskMini({ icon: Icon, label, score }: { icon: React.ElementType; label: string; score: number }) {
  const getColor = () => {
    if (score >= 70) return "text-destructive";
    if (score >= 40) return "text-chart-2";
    return "text-chart-3";
  };

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5">
        <Icon className={`w-3 h-3 ${getColor()}`} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <span className={`text-xs font-semibold tabular-nums ${getColor()}`}>{score.toFixed(0)}</span>
    </div>
  );
}

export default function AssessmentsPage() {
  const { data: assessments, isLoading } = useQuery<RiskAssessment[]>({
    queryKey: ["/api/assessments"],
  });

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Risk Assessments</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Environmental and climate risk scores aligned with SASB sustainability metrics
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardContent className="p-5"><Skeleton className="h-44 w-full" /></CardContent></Card>
            ))}
          </div>
        ) : assessments && assessments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assessments.map((assessment) => (
              <Link key={assessment.id} href={`/documents/${assessment.documentId}`}>
                <Card className="cursor-pointer hover-elevate" data-testid={`card-assessment-${assessment.id}`}>
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{assessment.propertyAddress}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          {new Date(assessment.assessedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <RiskGauge score={assessment.overallScore} size="sm" />

                    <div className="grid grid-cols-2 gap-2">
                      <RiskMini icon={Droplets} label="Flood" score={assessment.floodRisk} />
                      <RiskMini icon={Flame} label="Wildfire" score={assessment.wildfireRisk} />
                      <RiskMini icon={Mountain} label="Earthquake" score={assessment.earthquakeRisk} />
                      <RiskMini icon={Wind} label="Hurricane" score={assessment.hurricaneRisk} />
                    </div>

                    <div className="flex items-center gap-4 pt-1 border-t text-xs text-muted-foreground">
                      <span>GHG: {assessment.ghgEmissions.toFixed(1)} tCO2e</span>
                      <span>AQI: {assessment.airQualityIndex.toFixed(0)}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-8 h-8 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="font-medium">No risk assessments yet</p>
                  <p className="text-sm text-muted-foreground">
                    Upload a title document with a property address to generate climate risk scores
                  </p>
                </div>
                <Link href="/upload">
                  <Button data-testid="button-upload-from-assessments">Upload Document</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
