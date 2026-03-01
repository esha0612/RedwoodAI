import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload as UploadIcon, FileText, TreePine, Loader2 } from "lucide-react";

const SAMPLE_DOCUMENT = `DEED OF TRUST

This Deed of Trust is made on January 15, 2025.

BORROWER: John Michael Smith
SSN: 478-93-6521
Date of Birth: March 14, 1985
Phone: (415) 555-0173
Email: john.smith@gmail.com

PROPERTY ADDRESS: 1247 Redwood Lane, Mill Valley, CA 94941

LENDER: Pacific Coast Mortgage Corp.
Account Number: PCM-2025-883721

The undersigned Borrower hereby conveys to the Trustee the following described property situated in Marin County, State of California:

Legal Description: Lot 24, Block 7, Tamalpais Valley Subdivision, as per map recorded in Book 12, Page 47 of Maps, in the office of the County Recorder of Marin County.

APN: 052-241-18

The property is encumbered by a first lien in the amount of $875,000.00 (Eight Hundred Seventy-Five Thousand Dollars) with an interest rate of 6.75% per annum.

Monthly Payment: $5,674.82
Escrow Account: ESC-2025-441298

Title Insurance provided by: First American Title Insurance Company
Policy Number: FA-2025-9982341

Contact: Sarah Martinez, Escrow Officer
Phone: (415) 555-0298
Email: s.martinez@firstam.com

The property tax assessment for fiscal year 2024-2025 is $12,450.00.

Signed: ________________________
John Michael Smith
Credit Card on file: 4532-8891-2245-6678`;

export default function UploadPage() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isDragActive, setIsDragActive] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const uploadMutation = useMutation({
    mutationFn: async (data: { title: string; originalContent: string; propertyAddress?: string }) => {
      const res = await apiRequest("POST", "/api/documents", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/assessments"] });
      toast({
        title: "Document uploaded",
        description: "PII detection and risk assessment are now processing.",
      });
      navigate(`/documents/${data.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast({
        title: "Missing fields",
        description: "Please provide both a title and document content.",
        variant: "destructive",
      });
      return;
    }
    uploadMutation.mutate({ title: title.trim(), originalContent: content.trim() });
  };

  const loadSample = () => {
    setTitle("Deed of Trust - 1247 Redwood Lane");
    setContent(SAMPLE_DOCUMENT);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === "text/plain") {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setContent(ev.target?.result as string);
        if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ""));
      };
      reader.readAsText(file);
    }
  }, [title]);

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Upload Document</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Submit a title document for PII redaction and environmental risk assessment
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                Document Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Document Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Deed of Trust - 123 Main St"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  data-testid="input-document-title"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <Label htmlFor="content">Document Content</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={loadSample}
                    data-testid="button-load-sample"
                  >
                    <TreePine className="w-3.5 h-3.5 mr-1.5" />
                    Load Sample
                  </Button>
                </div>
                <div
                  className={`relative rounded-md transition-colors ${isDragActive ? "ring-2 ring-primary" : ""}`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragActive(true); }}
                  onDragLeave={() => setIsDragActive(false)}
                  onDrop={handleDrop}
                >
                  <Textarea
                    id="content"
                    placeholder="Paste document content here or drag and drop a .txt file..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="min-h-[320px] font-mono text-sm resize-none"
                    data-testid="input-document-content"
                  />
                  {isDragActive && (
                    <div className="absolute inset-0 rounded-md bg-primary/5 flex items-center justify-center border-2 border-dashed border-primary">
                      <div className="text-center space-y-1">
                        <UploadIcon className="w-8 h-8 mx-auto text-primary" />
                        <p className="text-sm font-medium">Drop file here</p>
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Supports text content from title documents, deeds, loan packages, and mortgage documents.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-3 flex-wrap">
            <Button type="submit" disabled={uploadMutation.isPending} data-testid="button-upload-submit">
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <UploadIcon className="w-4 h-4 mr-2" />
                  Upload & Analyze
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
