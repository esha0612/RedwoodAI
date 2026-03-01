import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertDocumentSchema } from "@shared/schema";
import { detectPii, extractPropertyAddress, initNerModel, isModelReady } from "./pii-detector";
import { assessRisk } from "./risk-assessor";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  initNerModel().catch(console.error);

  app.get("/api/documents", async (_req, res) => {
    try {
      const docs = await storage.getDocuments();
      res.json(docs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.get("/api/documents/:id", async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.id);
      if (!doc) return res.status(404).json({ message: "Document not found" });
      res.json(doc);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch document" });
    }
  });

  app.get("/api/documents/:id/pii", async (req, res) => {
    try {
      const findings = await storage.getPiiFindings(req.params.id);
      res.json(findings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch PII findings" });
    }
  });

  app.get("/api/documents/:id/assessment", async (req, res) => {
    try {
      const assessment = await storage.getRiskAssessment(req.params.id);
      if (!assessment) return res.json(null);
      res.json(assessment);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch risk assessment" });
    }
  });

  app.post("/api/documents", async (req, res) => {
    try {
      const parsed = insertDocumentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid document data", errors: parsed.error.issues });
      }

      const doc = await storage.createDocument(parsed.data);

      processDocument(doc.id).catch(console.error);

      res.status(201).json(doc);
    } catch (error) {
      console.error("Error creating document:", error);
      res.status(500).json({ message: "Failed to create document" });
    }
  });

  app.get("/api/assessments", async (_req, res) => {
    try {
      const assessments = await storage.getRiskAssessments();
      res.json(assessments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch assessments" });
    }
  });

  app.get("/api/pipeline/status", async (_req, res) => {
    res.json({
      nerModel: {
        status: isModelReady() ? "loaded" : "loading",
        name: "Xenova/bert-base-NER",
        type: "BERT Token Classification (ONNX Quantized)",
        framework: "Transformers.js (HuggingFace)",
        architecture: "bert-base-cased fine-tuned on CoNLL-2003",
        parameters: "110M (quantized to INT8)",
      },
      riskModel: {
        status: "ready",
        name: "Climate Risk MLP Ensemble",
        type: "Feature-Engineered Linear Ensemble",
        features: 12,
        subModels: ["Flood Risk Predictor", "Wildfire Risk Predictor", "Seismic Risk Predictor", "Hurricane Risk Predictor"],
        sasbAlignment: "IF-RE series (Real Estate)",
      },
      pipeline: {
        stages: [
          { name: "Document Ingestion", status: "ready" },
          { name: "Text Tokenization", status: "ready" },
          { name: "Transformer NER Inference", status: isModelReady() ? "ready" : "loading" },
          { name: "Pattern-Based Entity Detection", status: "ready" },
          { name: "Context-Aware Name Recognition", status: "ready" },
          { name: "Entity Deduplication", status: "ready" },
          { name: "Geospatial Feature Engineering", status: "ready" },
          { name: "Risk Prediction (MLP)", status: "ready" },
          { name: "SASB Metric Computation", status: "ready" },
          { name: "Span-Based Redaction", status: "ready" },
        ],
      },
    });
  });

  return httpServer;
}

async function processDocument(documentId: string) {
  try {
    await storage.updateDocument(documentId, { status: "processing" });

    const doc = await storage.getDocument(documentId);
    if (!doc) return;

    const { findings, redactedContent, metrics } = await detectPii(doc.originalContent);
    console.log(`[ML Pipeline] Document ${documentId}: ${metrics.totalEntitiesFound} PII entities found in ${metrics.processingTimeMs}ms (NER: ${metrics.nerEntitiesFound}, Pattern: ${metrics.patternEntitiesFound})`);

    for (const finding of findings) {
      await storage.createPiiFinding({
        documentId,
        type: finding.type,
        originalValue: finding.originalValue,
        redactedValue: finding.redactedValue,
        confidence: finding.confidence,
      });
    }

    const address = extractPropertyAddress(doc.originalContent);

    await storage.updateDocument(documentId, {
      redactedContent,
      propertyAddress: address,
      status: "completed",
    });

    if (address) {
      const scores = assessRisk(address);
      console.log(`[ML Pipeline] Risk assessment for "${address}": overall=${scores.overallScore}, devaluation_prob=${(scores.modelMetrics.devaluationProbability * 100).toFixed(1)}%`);
      await storage.createRiskAssessment({
        documentId,
        propertyAddress: address,
        overallScore: scores.overallScore,
        floodRisk: scores.floodRisk,
        wildfireRisk: scores.wildfireRisk,
        earthquakeRisk: scores.earthquakeRisk,
        hurricaneRisk: scores.hurricaneRisk,
        ghgEmissions: scores.ghgEmissions,
        airQualityIndex: scores.airQualityIndex,
        latitude: scores.latitude,
        longitude: scores.longitude,
        sasbMetrics: { ...scores.sasbMetrics, _modelMetrics: scores.modelMetrics },
      });
    }
  } catch (error) {
    console.error("Error processing document:", error);
    await storage.updateDocument(documentId, { status: "failed" });
  }
}
