import { storage } from "./storage";
import { detectPii, extractPropertyAddress } from "./pii-detector";
import { assessRisk } from "./risk-assessor";
import { DocumentModel } from "./db";

const SEED_DOCUMENTS = [
  {
    title: "Deed of Trust - 742 Sequoia Drive",
    originalContent: `DEED OF TRUST

This Deed of Trust is made on March 3, 2025.

BORROWER: Michael James Thompson
SSN: 321-65-9874
Date of Birth: July 22, 1978
Phone: (510) 555-0342
Email: m.thompson@outlook.com

PROPERTY ADDRESS: 742 Sequoia Drive, Oakland, CA 94611

LENDER: Bay Area Home Loans Inc.
Account Number: PCM-2025-774512

The undersigned Borrower hereby conveys to the Trustee the following described property situated in Alameda County, State of California.

The property is encumbered by a first lien in the amount of $925,000.00 with an interest rate of 6.50% per annum.

Monthly Payment: $5,845.29
Escrow Account: ESC-2025-331876

Title Insurance provided by: First American Title Insurance Company
Policy Number: FA-2025-8876543

Contact: David Chen, Escrow Officer
Phone: (510) 555-0198
Email: d.chen@firstam.com

Signed: ________________________
Michael James Thompson
Credit Card on file: 4916-7823-5541-9902`,
  },
  {
    title: "Mortgage Agreement - 1580 Palmetto Way",
    originalContent: `MORTGAGE AGREEMENT

Executed on February 10, 2025.

BORROWER: Sarah Elizabeth Martinez
SSN: 589-44-7231
Date of Birth: November 8, 1990
Phone: (305) 555-0487
Email: sarah.martinez92@gmail.com

PROPERTY ADDRESS: 1580 Palmetto Way, Miami, FL 33139

LENDER: SunCoast Federal Credit Union
Account Number: PCM-2025-556789

Property located in Miami-Dade County, State of Florida.

Loan Amount: $675,000.00
Interest Rate: 7.125% per annum
Monthly Payment: $4,556.12
Escrow Account: ESC-2025-889234

Title Insurance: First American Title
Policy Number: FA-2025-6654321

Contact: Roberto Alvarez, Loan Officer
Phone: (305) 555-0621
Email: r.alvarez@suncoastfcu.com

Signed: ________________________
Sarah Elizabeth Martinez
Credit Card on file: 5234-6789-0123-4567`,
  },
  {
    title: "Title Transfer - 2200 Lone Star Circle",
    originalContent: `TITLE TRANSFER DOCUMENT

Date: January 28, 2025

GRANTOR: William Robert Davis
SSN: 445-12-8876
Date of Birth: April 15, 1972
Phone: (512) 555-0776
Email: will.davis@yahoo.com

GRANTEE: Jennifer Ann Wilson
SSN: 667-33-1198
Phone: (512) 555-0234
Email: j.wilson@protonmail.com

PROPERTY ADDRESS: 2200 Lone Star Circle, Austin, TX 78745

Property situated in Travis County, State of Texas.

Sale Price: $545,000.00
Earnest Money: $15,000.00
Account Number: PCM-2025-112233

Title Insurance: First American Title
Policy Number: FA-2025-4432198

Contact: Angela Brooks, Title Officer
Phone: (512) 555-0890
Email: a.brooks@firstam.com

Credit Card on file: 6011-4455-6677-8899`,
  },
  {
    title: "Refinance Package - 88 Harbor View Terrace",
    originalContent: `REFINANCE LOAN PACKAGE

Effective Date: December 15, 2024

BORROWER: Robert K. Nakamura
SSN: 223-78-5544
Date of Birth: September 3, 1985
Phone: (206) 555-0112
Email: r.nakamura@techmail.com

PROPERTY ADDRESS: 88 Harbor View Terrace, Seattle, WA 98101

LENDER: Pacific Northwest Savings Bank
Account Number: PCM-2024-998877

Property in King County, State of Washington.

Original Loan: $780,000.00
Refinanced Amount: $720,000.00
New Interest Rate: 5.875%
Monthly Payment: $4,260.00
Escrow Account: ESC-2024-776655

Title Insurance: First American Title
Policy Number: FA-2024-7789012

Contact: Lisa Yamamoto, Senior Loan Officer
Phone: (206) 555-0445
Email: l.yamamoto@pnwsb.com

Signed: ________________________
Robert K. Nakamura`,
  },
];

export async function seedDatabase() {
  try {
    const count = await DocumentModel.countDocuments();
    if (count > 0) {
      console.log("Database already seeded, skipping.");
      return;
    }

    console.log("Seeding database with sample documents...");

    for (const seedDoc of SEED_DOCUMENTS) {
      const doc = await storage.createDocument({
        title: seedDoc.title,
        originalContent: seedDoc.originalContent,
      });

      const { findings, redactedContent } = await detectPii(seedDoc.originalContent);

      for (const finding of findings) {
        await storage.createPiiFinding({
          documentId: doc.id,
          type: finding.type,
          originalValue: finding.originalValue,
          redactedValue: finding.redactedValue,
          confidence: finding.confidence,
        });
      }

      const address = extractPropertyAddress(seedDoc.originalContent);

      await storage.updateDocument(doc.id, {
        redactedContent,
        propertyAddress: address,
        status: "completed",
      });

      if (address) {
        const scores = assessRisk(address);
        await storage.createRiskAssessment({
          documentId: doc.id,
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
    }

    console.log(`Seeded ${SEED_DOCUMENTS.length} documents successfully.`);
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}
