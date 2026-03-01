import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, ShieldCheck, ShieldAlert, Eye, EyeOff, Leaf, Droplets, Flame, Mountain, Wind, Brain, Cpu, Loader2 } from "lucide-react";
import type { Document, PiiFinding, RiskAssessment } from "@shared/schema";
import { RiskGauge } from "@/components/risk-gauge";
import { useState } from "react";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, PolarRadiusAxis } from "recharts";

function PiiTypeIcon({ type }: { type: string }) {
  const colors: Record<string, string> = {
    ssn: "bg-destructive/10 text-destructive",
    phone: "bg-chart-2/10 text-chart-2",
    email: "bg-chart-4/10 text-chart-4",
    credit_card: "bg-destructive/10 text-destructive",
    account_number: "bg-chart-2/10 text-chart-2",
    date_of_birth: "bg-chart-5/10 text-chart-5",
    name: "bg-chart-3/10 text-chart-3",
  };
  return (
    <div className={`w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-semibold ${colors[type] || "bg-muted text-muted-foreground"}`}>
      {type.substring(0, 2).toUpperCase()}
    </div>
  );
}

function RiskCategory({ icon: Icon, label, score, description }: {
  icon: React.ElementType;
  label: string;
  score: number;
  description: string;
}) {
  const getColor = () => {
    if (score >= 70) return "text-destructive";
    if (score >= 40) return "text-chart-2";
    return "text-chart-3";
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-md bg-accent/30">
      <div className="w-9 h-9 rounded-md bg-background flex items-center justify-center shrink-0 mt-0.5">
        <Icon className={`w-4 h-4 ${getColor()}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">{label}</span>
          <span className={`text-sm font-semibold tabular-nums ${getColor()}`}>{score.toFixed(1)}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        <div className="w-full rounded-full bg-muted h-1.5 mt-2">
          <div
            className={`h-1.5 rounded-full transition-all duration-700 ease-out ${score >= 70 ? "bg-destructive" : score >= 40 ? "bg-chart-2" : "bg-chart-3"}`}
            style={{ width: `${Math.min(score, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default function DocumentDetail() {
  const [, params] = useRoute("/documents/:id");
  const docId = params?.id;
  const [showRedacted, setShowRedacted] = useState(true);

  const { data: doc, isLoading: docLoading } = useQuery<Document>({
    queryKey: ["/api/documents", docId],
    enabled: !!docId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "pending" || status === "processing" ? 1500 : false;
    },
  });

  const isProcessing = doc?.status === "pending" || doc?.status === "processing";
  const isCompleted = doc?.status === "completed";

  const { data: piiFindings, isLoading: piiLoading } = useQuery<PiiFinding[]>({
    queryKey: ["/api/documents", docId, "pii"],
    enabled: !!docId,
    refetchInterval: (query) => {
      // Keep polling while document is processing
      if (isProcessing) return 2000;
      // Keep polling after completion until PII results are available
      if (isCompleted && (!query.state.data || query.state.data.length === 0)) return 1500;
      return false;
    },
  });

  const { data: assessment, isLoading: assessLoading } = useQuery<RiskAssessment>({
    queryKey: ["/api/documents", docId, "assessment"],
    enabled: !!docId,
    refetchInterval: (query) => {
      // Keep polling while document is processing
      if (isProcessing) return 2000;
      // Keep polling after completion until risk assessment is available
      if (isCompleted && !query.state.data) return 1500;
      return false;
    },
  });

  const isLoading = docLoading || piiLoading || assessLoading;

  const radarData = assessment ? [
    { category: "Flood", value: assessment.floodRisk },
    { category: "Wildfire", value: assessment.wildfireRisk },
    { category: "Earthquake", value: assessment.earthquakeRisk },
    { category: "Hurricane", value: assessment.hurricaneRisk },
    { category: "GHG", value: assessment.ghgEmissions },
    { category: "Air Quality", value: assessment.airQualityIndex },
  ] : [];

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Skeleton className="h-96 lg:col-span-2" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-lg font-medium">Document not found</p>
          <Link href="/documents">
            <Button variant="secondary" data-testid="button-back-to-docs">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Documents
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const piiTypeLabels: Record<string, string> = {
    ssn: "Social Security Number",
    phone: "Phone Number",
    email: "Email Address",
    credit_card: "Credit Card",
    account_number: "Account Number",
    date_of_birth: "Date of Birth",
    name: "Personal Name",
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/documents">
            <Button size="icon" variant="ghost" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight truncate" data-testid="text-document-title">{doc.title}</h1>
            <p className="text-sm text-muted-foreground">{doc.propertyAddress || "Address pending extraction"}</p>
          </div>
        </div>

        {isProcessing && (
          <Card className="border-chart-2/30 bg-chart-2/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Loader2 className="w-4 h-4 animate-spin text-chart-2 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Processing document...</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Extracting PII and performing risk assessment. This may take a moment.
                  </p>
                  <div className="flex items-center gap-2 mt-3 text-xs">
                    <span className={piiFindings && piiFindings.length > 0 ? "text-chart-3" : "text-muted-foreground"}>
                      ✓ PII Detection
                    </span>
                    <span className={assessment ? "text-chart-3" : "text-muted-foreground"}>
                      ✓ Risk Assessment
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {doc?.status === "failed" && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-4 flex items-center gap-3">
              <ShieldAlert className="w-4 h-4 text-destructive" />
              <div>
                <p className="text-sm font-medium">Processing failed</p>
                <p className="text-xs text-muted-foreground">An error occurred while analyzing this document. Try uploading it again.</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="pii" className="space-y-4">
          <TabsList data-testid="tabs-document-detail">
            <TabsTrigger value="pii" data-testid="tab-pii">
              <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
              PII Redaction
            </TabsTrigger>
            <TabsTrigger value="risk" data-testid="tab-risk">
              <Leaf className="w-3.5 h-3.5 mr-1.5" />
              Climate Risk
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pii" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <CardTitle className="text-base font-medium">Document Content</CardTitle>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setShowRedacted(!showRedacted)}
                      data-testid="button-toggle-redaction"
                    >
                      {showRedacted ? (
                        <><EyeOff className="w-3.5 h-3.5 mr-1.5" />Show Original</>
                      ) : (
                        <><Eye className="w-3.5 h-3.5 mr-1.5" />Show Redacted</>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[420px]">
                    <pre className="text-sm font-mono whitespace-pre-wrap leading-relaxed" data-testid="text-document-content">
                      {showRedacted ? (doc.redactedContent || doc.originalContent) : doc.originalContent}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-chart-2" />
                    PII Detected ({piiFindings?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {piiFindings && piiFindings.length > 0 ? (
                    <ScrollArea className="h-[380px]">
                      <div className="space-y-2">
                        {piiFindings.map((finding) => (
                          <div key={finding.id} className="flex items-start gap-2.5 p-2.5 rounded-md bg-accent/30" data-testid={`pii-finding-${finding.id}`}>
                            <PiiTypeIcon type={finding.type} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-medium">
                                  {piiTypeLabels[finding.type] || finding.type}
                                </span>
                                <span className="text-[10px] text-muted-foreground tabular-nums">
                                  {(finding.confidence * 100).toFixed(0)}%
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
                                {finding.originalValue} → {finding.redactedValue}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
                      <div className="text-center space-y-1">
                        <ShieldCheck className="w-6 h-6 mx-auto text-chart-3" />
                        <p>No PII detected</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="risk" className="space-y-4">
            {assessment ? (
              <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="lg:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium">Risk Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <RiskCategory
                      icon={Droplets}
                      label="Flood Risk"
                      score={assessment.floodRisk}
                      description="FEMA flood zone classification and historical flood data"
                    />
                    <RiskCategory
                      icon={Flame}
                      label="Wildfire Risk"
                      score={assessment.wildfireRisk}
                      description="WUI proximity, vegetation density, and historical fire data"
                    />
                    <RiskCategory
                      icon={Mountain}
                      label="Earthquake Risk"
                      score={assessment.earthquakeRisk}
                      description="Fault proximity, soil liquefaction, and seismic activity"
                    />
                    <RiskCategory
                      icon={Wind}
                      label="Hurricane Risk"
                      score={assessment.hurricaneRisk}
                      description="Coastal exposure, wind speed zones, and storm surge risk"
                    />
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-medium">Overall Score</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <RiskGauge score={assessment.overallScore} size="lg" />
                      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-muted-foreground">GHG Emissions</p>
                          <p className="font-medium mt-0.5">{assessment.ghgEmissions.toFixed(1)} tCO2e</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Air Quality</p>
                          <p className="font-medium mt-0.5">AQI {assessment.airQualityIndex.toFixed(0)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-medium">Risk Profile</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                          <PolarGrid stroke="hsl(var(--border))" />
                          <PolarAngleAxis dataKey="category" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                          <Radar
                            name="Risk"
                            dataKey="value"
                            stroke="hsl(var(--primary))"
                            fill="hsl(var(--primary))"
                            fillOpacity={0.2}
                            strokeWidth={2}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {(() => {
                const metrics = assessment.sasbMetrics && typeof assessment.sasbMetrics === "object" && "_modelMetrics" in assessment.sasbMetrics
                  ? (assessment.sasbMetrics as Record<string, unknown>)._modelMetrics as Record<string, unknown> | undefined
                  : undefined;
                if (!metrics) return null;
                return (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-medium flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-chart-4" />
                        Model Prediction Metadata
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div className="p-3 rounded-md bg-accent/30">
                          <p className="text-xs text-muted-foreground">Devaluation Probability</p>
                          <p className="font-semibold mt-1" data-testid="text-devaluation-prob">
                            {typeof metrics.devaluationProbability === "number"
                              ? `${(metrics.devaluationProbability * 100).toFixed(1)}%`
                              : "N/A"}
                          </p>
                        </div>
                        <div className="p-3 rounded-md bg-accent/30">
                          <p className="text-xs text-muted-foreground">Feature Dimensions</p>
                          <p className="font-semibold mt-1" data-testid="text-feature-dims">
                            {Array.isArray(metrics.featuresUsed) ? (metrics.featuresUsed as string[]).length : "N/A"}
                          </p>
                        </div>
                        <div className="p-3 rounded-md bg-accent/30">
                          <p className="text-xs text-muted-foreground">Model Confidence</p>
                          <p className="font-semibold mt-1" data-testid="text-model-confidence">
                            {typeof metrics.confidence === "number"
                              ? `${(metrics.confidence * 100).toFixed(1)}%`
                              : "N/A"}
                          </p>
                        </div>
                        <div className="p-3 rounded-md bg-accent/30">
                          <p className="text-xs text-muted-foreground">Model Type</p>
                          <p className="font-semibold mt-1 text-xs" data-testid="text-model-type">
                            {typeof metrics.modelType === "string" ? metrics.modelType : "N/A"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}
              </>
            ) : (
              <Card>
                <CardContent className="p-12">
                  <div className="text-center space-y-2">
                    <Leaf className="w-8 h-8 mx-auto text-muted-foreground/40" />
                    <p className="font-medium">No risk assessment available</p>
                    <p className="text-sm text-muted-foreground">
                      Risk assessment will be generated once a valid property address is extracted
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
