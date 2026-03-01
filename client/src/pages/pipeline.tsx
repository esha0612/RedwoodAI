import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Brain, Cpu, CheckCircle, Loader2, ArrowRight, Layers, Database, ShieldCheck, Leaf } from "lucide-react";

interface PipelineStatus {
  nerModel: {
    status: string;
    name: string;
    type: string;
    framework: string;
    architecture: string;
    parameters: string;
  };
  riskModel: {
    status: string;
    name: string;
    type: string;
    features: number;
    subModels: string[];
    sasbAlignment: string;
  };
  pipeline: {
    stages: Array<{ name: string; status: string }>;
  };
}

function StageNode({ name, status, index, total }: { name: string; status: string; index: number; total: number }) {
  const isReady = status === "ready";
  return (
    <div className="flex items-center gap-2">
      <div className={`flex items-center gap-2.5 p-3 rounded-md flex-1 ${isReady ? "bg-chart-3/8" : "bg-chart-2/8"}`}>
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${isReady ? "bg-chart-3/20 text-chart-3" : "bg-chart-2/20 text-chart-2"}`}>
          {isReady ? <CheckCircle className="w-3.5 h-3.5" /> : <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium">{name}</p>
          <p className="text-[10px] text-muted-foreground">Stage {index + 1}/{total}</p>
        </div>
      </div>
      {index < total - 1 && (
        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      )}
    </div>
  );
}

export default function PipelinePage() {
  const { data: status, isLoading } = useQuery<PipelineStatus>({
    queryKey: ["/api/pipeline/status"],
    refetchInterval: 5000,
  });

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">ML Pipeline</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Real-time status of the NER transformer and climate risk prediction models
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}><CardContent className="p-5"><Skeleton className="h-32 w-full" /></CardContent></Card>
            ))}
          </div>
        ) : status ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Brain className="w-4 h-4 text-primary" />
                    NER Transformer Model
                    <Badge variant={status.nerModel.status === "loaded" ? "default" : "secondary"} data-testid="badge-ner-status">
                      {status.nerModel.status === "loaded" ? "Online" : "Loading"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Model</span>
                      <span className="font-mono text-xs text-right">{status.nerModel.name}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Type</span>
                      <span className="text-xs text-right">{status.nerModel.type}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Framework</span>
                      <span className="text-xs text-right">{status.nerModel.framework}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Architecture</span>
                      <span className="text-xs text-right">{status.nerModel.architecture}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Parameters</span>
                      <span className="text-xs text-right">{status.nerModel.parameters}</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-md bg-accent/30 text-xs space-y-1">
                    <p className="font-medium">NER Entity Types:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {["PER (Person Names)", "MISC (Miscellaneous Entities)"].map((t) => (
                        <span key={t} className="px-1.5 py-0.5 rounded-sm bg-background text-muted-foreground">{t}</span>
                      ))}
                    </div>
                    <p className="font-medium mt-2">Pattern-Based PII:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {["SSN", "Phone", "Email", "Credit Card", "DOB", "Account #"].map((t) => (
                        <span key={t} className="px-1.5 py-0.5 rounded-sm bg-background text-muted-foreground">{t}</span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Leaf className="w-4 h-4 text-chart-3" />
                    Climate Risk Prediction Model
                    <Badge variant="default" data-testid="badge-risk-status">Online</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Model</span>
                      <span className="text-xs text-right">{status.riskModel.name}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Type</span>
                      <span className="text-xs text-right">{status.riskModel.type}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Input Features</span>
                      <span className="text-xs text-right">{status.riskModel.features} geospatial features</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">SASB Alignment</span>
                      <span className="text-xs text-right">{status.riskModel.sasbAlignment}</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-md bg-accent/30 text-xs space-y-1">
                    <p className="font-medium">Sub-Models:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {status.riskModel.subModels.map((m) => (
                        <span key={m} className="px-1.5 py-0.5 rounded-sm bg-background text-muted-foreground">{m}</span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Layers className="w-4 h-4 text-chart-4" />
                  Processing Pipeline Stages
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {status.pipeline.stages.map((stage, i) => (
                    <StageNode
                      key={stage.name}
                      name={stage.name}
                      status={stage.status}
                      index={i}
                      total={status.pipeline.stages.length}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-muted-foreground" />
                  Architecture Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="p-4 rounded-md bg-accent/30 space-y-2">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-chart-4" />
                      <span className="font-medium">Document Ingestion</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Raw title documents are ingested via REST API. Text content is extracted and tokenized for downstream NLP processing.
                    </p>
                  </div>
                  <div className="p-4 rounded-md bg-accent/30 space-y-2">
                    <div className="flex items-center gap-2">
                      <Brain className="w-4 h-4 text-primary" />
                      <span className="font-medium">NER + Pattern Pipeline</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Hybrid detection: BERT-based NER for person names and entities, combined with regex patterns for structured PII (SSN, CC, phone). Entity deduplication resolves conflicts.
                    </p>
                  </div>
                  <div className="p-4 rounded-md bg-accent/30 space-y-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-chart-3" />
                      <span className="font-medium">Risk Prediction</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      12-dimensional geospatial feature vector feeds into a multi-model ensemble. Each sub-model predicts category-specific risk, with sigmoid activation for devaluation probability.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  );
}
