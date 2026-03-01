import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { FileText, Upload, ChevronRight, Calendar, MapPin } from "lucide-react";
import type { Document } from "@shared/schema";

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
    pending: { label: "Pending", variant: "secondary" },
    processing: { label: "Processing", variant: "default" },
    completed: { label: "Completed", variant: "default" },
    failed: { label: "Failed", variant: "destructive" },
  };
  const c = config[status] || config.pending;
  return <Badge variant={c.variant}>{c.label}</Badge>;
}

export default function DocumentsPage() {
  const { data: documents, isLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
            <p className="text-muted-foreground text-sm mt-1">All uploaded title documents and their processing status</p>
          </div>
          <Link href="/upload">
            <Button data-testid="button-upload-new">
              <Upload className="w-4 h-4 mr-2" />
              Upload New
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
            ))}
          </div>
        ) : documents && documents.length > 0 ? (
          <div className="space-y-2">
            {documents.map((doc) => (
              <Link key={doc.id} href={`/documents/${doc.id}`}>
                <Card className="cursor-pointer hover-elevate transition-all" data-testid={`card-document-${doc.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-md bg-accent flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{doc.title}</p>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            {doc.propertyAddress && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {doc.propertyAddress}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(doc.uploadedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <StatusBadge status={doc.status} />
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
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
                  <FileText className="w-8 h-8 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="font-medium">No documents uploaded</p>
                  <p className="text-sm text-muted-foreground">
                    Upload a title document to begin PII redaction and risk assessment
                  </p>
                </div>
                <Link href="/upload">
                  <Button data-testid="button-upload-empty-state">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Document
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
