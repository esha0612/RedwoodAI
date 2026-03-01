import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { FileText, ShieldAlert, ShieldCheck, TrendingUp, Leaf, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import type { Document, RiskAssessment } from "@shared/schema";
import { RiskGauge } from "@/components/risk-gauge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

function StatCard({ title, value, subtitle, icon: Icon, iconColor }: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  iconColor: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1.5">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-semibold tracking-tight" data-testid={`text-stat-${title.toLowerCase().replace(/\s/g, "-")}`}>{value}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <div className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 ${iconColor}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecentDocumentRow({ doc }: { doc: Document }) {
  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
    pending: { label: "Pending", variant: "secondary" },
    processing: { label: "Processing", variant: "default" },
    completed: { label: "Completed", variant: "default" },
    failed: { label: "Failed", variant: "destructive" },
  };
  const config = statusConfig[doc.status] || statusConfig.pending;

  return (
    <Link href={`/documents/${doc.id}`}>
      <div className="flex items-center justify-between gap-3 py-3 cursor-pointer hover-elevate rounded-md px-3" data-testid={`link-document-${doc.id}`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-md bg-accent flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{doc.title}</p>
            <p className="text-xs text-muted-foreground truncate">{doc.propertyAddress || "No address"}</p>
          </div>
        </div>
        <Badge variant={config.variant} data-testid={`badge-status-${doc.id}`}>{config.label}</Badge>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { data: documents, isLoading: docsLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  const { data: assessments, isLoading: assessLoading } = useQuery<RiskAssessment[]>({
    queryKey: ["/api/assessments"],
  });

  const isLoading = docsLoading || assessLoading;

  const totalDocs = documents?.length || 0;
  const completedDocs = documents?.filter(d => d.status === "completed").length || 0;
  const avgRisk = assessments?.length
    ? (assessments.reduce((sum, a) => sum + a.overallScore, 0) / assessments.length).toFixed(1)
    : "N/A";
  const highRiskCount = assessments?.filter(a => a.overallScore >= 70).length || 0;

  const riskDistData = assessments?.map(a => ({
    name: a.propertyAddress.split(",")[0],
    score: a.overallScore,
  })).slice(0, 6) || [];

  const getBarColor = (score: number) => {
    if (score >= 70) return "hsl(0, 72%, 50%)";
    if (score >= 40) return "hsl(35, 92%, 50%)";
    return "hsl(142, 71%, 45%)";
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Overview of your underwriting pipeline and environmental risk assessments</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardContent className="p-5"><Skeleton className="h-20 w-full" /></CardContent></Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Documents"
              value={totalDocs}
              subtitle={`${completedDocs} processed`}
              icon={FileText}
              iconColor="bg-primary/10 text-primary"
            />
            <StatCard
              title="PII Redactions"
              value={completedDocs > 0 ? "Active" : "None"}
              subtitle="AI-powered detection"
              icon={ShieldCheck}
              iconColor="bg-chart-3/10 text-chart-3"
            />
            <StatCard
              title="Avg Risk Score"
              value={avgRisk}
              subtitle="SASB-aligned metrics"
              icon={TrendingUp}
              iconColor="bg-chart-2/10 text-chart-2"
            />
            <StatCard
              title="High Risk"
              value={highRiskCount}
              subtitle="Properties flagged"
              icon={AlertTriangle}
              iconColor="bg-destructive/10 text-destructive"
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Leaf className="w-4 h-4 text-chart-3" />
                Environmental Risk Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              {isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : riskDistData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={riskDistData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                        fontSize: "12px",
                      }}
                      formatter={(value: number) => [`${value.toFixed(1)}`, "Risk Score"]}
                    />
                    <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                      {riskDistData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getBarColor(entry.score)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
                  <div className="text-center space-y-2">
                    <Leaf className="w-8 h-8 mx-auto text-muted-foreground/40" />
                    <p>No risk assessments yet</p>
                    <p className="text-xs">Upload a document to get started</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                Recent Documents
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : documents && documents.length > 0 ? (
                <div className="space-y-0.5">
                  {documents.slice(0, 5).map((doc) => (
                    <RecentDocumentRow key={doc.id} doc={doc} />
                  ))}
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
                  <div className="text-center space-y-2">
                    <FileText className="w-8 h-8 mx-auto text-muted-foreground/40" />
                    <p>No documents uploaded</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {assessments && assessments.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-chart-2" />
                Climate Risk Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {assessments.slice(0, 4).map((assessment) => (
                  <div key={assessment.id} className="space-y-3 p-3 rounded-md bg-accent/30">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-sm font-medium truncate">{assessment.propertyAddress.split(",")[0]}</p>
                    </div>
                    <RiskGauge score={assessment.overallScore} size="sm" />
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Flood</span>
                        <span className="font-medium">{assessment.floodRisk.toFixed(0)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Wildfire</span>
                        <span className="font-medium">{assessment.wildfireRisk.toFixed(0)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Earthquake</span>
                        <span className="font-medium">{assessment.earthquakeRisk.toFixed(0)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Hurricane</span>
                        <span className="font-medium">{assessment.hurricaneRisk.toFixed(0)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
