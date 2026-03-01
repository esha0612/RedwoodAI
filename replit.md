# RedwoodAI - PII & Climate-Aware Underwriting Engine

## Overview
A dual-purpose automated underwriting tool for residential purchase transactions. It ingests raw title documents to automatically redact PII using a hybrid ML pipeline (BERT NER + regex patterns), while cross-referencing property data against localized SASB metrics to assign environmental risk scores using a feature-engineered MLP ensemble.

## Architecture
- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui components + Recharts
- **Backend**: Express.js with Node.js
- **Database**: MongoDB Atlas (Mongoose ODM)
- **ML Pipeline**: @xenova/transformers (BERT NER via ONNX), custom MLP risk ensemble
- **Routing**: wouter (frontend), Express (backend API)
- **State Management**: TanStack React Query

## Key Features
1. **Document Upload & Processing** - Upload title documents (deeds, mortgages, loan packages)
2. **Hybrid PII Detection** - BERT-based NER for person/org/location entities + regex patterns for SSNs, phone numbers, emails, credit cards, account numbers, dates of birth
3. **ML Risk Prediction** - 12-dimensional geospatial feature vector feeds multi-model ensemble with sigmoid devaluation probability output
4. **SASB Metrics** - Sustainability Accounting Standards Board aligned metrics (IF-RE series) with model metadata
5. **Visual Dashboard** - Charts, risk gauges, radar charts for risk visualization
6. **Geospatial Risk Map** - Interactive Leaflet.js map with color-coded heatmap overlays for flood, wildfire, earthquake, hurricane risk by property
7. **ML Pipeline Page** - Real-time model status, architecture overview, processing stage visualization

## Data Model (MongoDB Collections)
- `documents` - Uploaded title documents with original and redacted content
- `piifindings` - Detected PII items linked to documents by documentId
- `riskassessments` - Environmental risk scores with SASB metrics and model metadata (stored in `sasbMetrics._modelMetrics`)

## File Structure
### Frontend
- `client/src/App.tsx` - Main app with sidebar navigation and routing
- `client/src/pages/dashboard.tsx` - Overview dashboard with stats and charts
- `client/src/pages/upload.tsx` - Document upload with drag-and-drop
- `client/src/pages/documents.tsx` - Document list view
- `client/src/pages/document-detail.tsx` - Document detail with PII redaction, risk tabs, and model metadata display
- `client/src/pages/assessments.tsx` - Risk assessments grid view
- `client/src/pages/risk-map.tsx` - Interactive geospatial risk map with heatmap overlays
- `client/src/pages/pipeline.tsx` - ML Pipeline status and architecture visualization
- `client/src/components/app-sidebar.tsx` - Navigation sidebar
- `client/src/components/risk-gauge.tsx` - Reusable risk score gauge component
- `client/src/components/risk-map.tsx` - Leaflet.js map component with risk heatmap circles and layer switching
- `client/src/components/theme-provider.tsx` - Dark/light theme toggle

### Backend
- `server/routes.ts` - API routes (GET/POST for documents, PII findings, risk assessments, pipeline status)
- `server/storage.ts` - Database storage layer using Mongoose ODM with clean JSON serialization
- `server/pii-detector.ts` - Hybrid PII detection: BERT NER (Xenova/bert-base-NER) + regex patterns + context heuristics
- `server/risk-assessor.ts` - Feature-engineered MLP ensemble with 12 geospatial features and sigmoid devaluation probability
- `server/seed.ts` - Database seeding with sample documents (uses async detectPii)
- `server/db.ts` - MongoDB connection and Mongoose model definitions

### Shared
- `shared/schema.ts` - Zod validation schemas and TypeScript interfaces (plain types, no Drizzle)

## Environment
- `MONGODB_URI` - MongoDB Atlas connection string
- `SESSION_SECRET` - Session secret key
- Database name: `redwoodai`

## Theme
Redwood-themed with warm earth tones (hue 14 primary). Inter font family for clean professional look. Supports dark mode.
