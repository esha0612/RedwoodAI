import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI environment variable is not set");
}

export async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: "redwoodai",
    });
    console.log("[MongoDB] Connected to MongoDB Atlas");
  } catch (error) {
    console.error("[MongoDB] Connection error:", error);
    throw error;
  }
}

const documentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    originalContent: { type: String, required: true },
    redactedContent: { type: String, default: null },
    propertyAddress: { type: String, default: null },
    status: { type: String, required: true, default: "pending" },
    uploadedAt: { type: Date, default: Date.now },
  },
  {
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

const piiFindingSchema = new mongoose.Schema(
  {
    documentId: { type: String, required: true, index: true },
    type: { type: String, required: true },
    originalValue: { type: String, required: true },
    redactedValue: { type: String, required: true },
    confidence: { type: Number, required: true },
  },
  {
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

const riskAssessmentSchema = new mongoose.Schema(
  {
    documentId: { type: String, required: true, index: true },
    propertyAddress: { type: String, required: true },
    overallScore: { type: Number, required: true },
    floodRisk: { type: Number, required: true },
    wildfireRisk: { type: Number, required: true },
    earthquakeRisk: { type: Number, required: true },
    hurricaneRisk: { type: Number, required: true },
    ghgEmissions: { type: Number, required: true },
    airQualityIndex: { type: Number, required: true },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    sasbMetrics: { type: mongoose.Schema.Types.Mixed, default: null },
    assessedAt: { type: Date, default: Date.now },
  },
  {
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const DocumentModel = mongoose.model("Document", documentSchema);
export const PiiFindingModel = mongoose.model("PiiFinding", piiFindingSchema);
export const RiskAssessmentModel = mongoose.model("RiskAssessment", riskAssessmentSchema);
