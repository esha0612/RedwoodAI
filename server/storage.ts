import { DocumentModel, PiiFindingModel, RiskAssessmentModel } from "./db";
import type { Document, InsertDocument, PiiFinding, InsertPiiFinding, RiskAssessment, InsertRiskAssessment } from "@shared/schema";

export interface IStorage {
  getDocuments(): Promise<Document[]>;
  getDocument(id: string): Promise<Document | undefined>;
  createDocument(doc: InsertDocument): Promise<Document>;
  updateDocument(id: string, updates: Partial<Document>): Promise<Document | undefined>;
  getPiiFindings(documentId: string): Promise<PiiFinding[]>;
  createPiiFinding(finding: InsertPiiFinding): Promise<PiiFinding>;
  getRiskAssessments(): Promise<RiskAssessment[]>;
  getRiskAssessment(documentId: string): Promise<RiskAssessment | undefined>;
  createRiskAssessment(assessment: InsertRiskAssessment): Promise<RiskAssessment>;
}

function toClean<T>(doc: any): T {
  const { _id, __v, ...rest } = doc;
  return { ...rest, id: _id.toString() } as T;
}

export class DatabaseStorage implements IStorage {
  async getDocuments(): Promise<Document[]> {
    const docs = await DocumentModel.find().sort({ uploadedAt: -1 }).lean();
    return docs.map((d) => toClean<Document>(d));
  }

  async getDocument(id: string): Promise<Document | undefined> {
    const doc = await DocumentModel.findById(id).lean();
    if (!doc) return undefined;
    return toClean<Document>(doc);
  }

  async createDocument(doc: InsertDocument): Promise<Document> {
    const result = await DocumentModel.create(doc);
    return result.toJSON() as unknown as Document;
  }

  async updateDocument(id: string, updates: Partial<Document>): Promise<Document | undefined> {
    const result = await DocumentModel.findByIdAndUpdate(id, { $set: updates }, { new: true }).lean();
    if (!result) return undefined;
    return toClean<Document>(result);
  }

  async getPiiFindings(documentId: string): Promise<PiiFinding[]> {
    const findings = await PiiFindingModel.find({ documentId }).lean();
    return findings.map((f) => toClean<PiiFinding>(f));
  }

  async createPiiFinding(finding: InsertPiiFinding): Promise<PiiFinding> {
    const result = await PiiFindingModel.create(finding);
    return result.toJSON() as unknown as PiiFinding;
  }

  async getRiskAssessments(): Promise<RiskAssessment[]> {
    const assessments = await RiskAssessmentModel.find().sort({ assessedAt: -1 }).lean();
    return assessments.map((a) => toClean<RiskAssessment>(a));
  }

  async getRiskAssessment(documentId: string): Promise<RiskAssessment | undefined> {
    const result = await RiskAssessmentModel.findOne({ documentId }).lean();
    if (!result) return undefined;
    return toClean<RiskAssessment>(result);
  }

  async createRiskAssessment(assessment: InsertRiskAssessment): Promise<RiskAssessment> {
    const result = await RiskAssessmentModel.create(assessment);
    return result.toJSON() as unknown as RiskAssessment;
  }
}

export const storage = new DatabaseStorage();
