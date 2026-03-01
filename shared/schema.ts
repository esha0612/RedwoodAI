import { z } from "zod";

export interface Document {
  id: string;
  title: string;
  originalContent: string;
  redactedContent: string | null;
  propertyAddress: string | null;
  status: string;
  uploadedAt: Date;
}

export interface PiiFinding {
  id: string;
  documentId: string;
  type: string;
  originalValue: string;
  redactedValue: string;
  confidence: number;
}

export interface RiskAssessment {
  id: string;
  documentId: string;
  propertyAddress: string;
  overallScore: number;
  floodRisk: number;
  wildfireRisk: number;
  earthquakeRisk: number;
  hurricaneRisk: number;
  ghgEmissions: number;
  airQualityIndex: number;
  latitude: number | null;
  longitude: number | null;
  sasbMetrics: unknown;
  assessedAt: Date;
}

export const insertDocumentSchema = z.object({
  title: z.string().min(1),
  originalContent: z.string().min(1),
});

export const insertPiiFindingSchema = z.object({
  documentId: z.string(),
  type: z.string(),
  originalValue: z.string(),
  redactedValue: z.string(),
  confidence: z.number(),
});

export const insertRiskAssessmentSchema = z.object({
  documentId: z.string(),
  propertyAddress: z.string(),
  overallScore: z.number(),
  floodRisk: z.number(),
  wildfireRisk: z.number(),
  earthquakeRisk: z.number(),
  hurricaneRisk: z.number(),
  ghgEmissions: z.number(),
  airQualityIndex: z.number(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  sasbMetrics: z.any().optional(),
});

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type InsertPiiFinding = z.infer<typeof insertPiiFindingSchema>;
export type InsertRiskAssessment = z.infer<typeof insertRiskAssessmentSchema>;
