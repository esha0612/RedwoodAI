import { Fragment, useEffect, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet"; // base library used by react-leaflet for things like LatLngBounds
import type { RiskAssessment } from "@shared/schema";
// Leaflet styles must be imported once for the map to display correctly
import "leaflet/dist/leaflet.css";

// -----------------------------------------------------------------------------
// Helpers for converting numeric risk scores into visual indicators
// -----------------------------------------------------------------------------

/**
 * Return the hex color associated with a given risk score.
 * The thresholds mirror the legend shown at the bottom of the map.
 */
function riskColor(score: number): string {
  if (score >= 75) return "#ef4444"; // high
  if (score >= 55) return "#f97316"; // elevated
  if (score >= 40) return "#eab308"; // moderate
  return "#22c55e"; // low
}

/**
 * Convert a numeric score into a human-readable label.
 * Note that the thresholds are slightly different from the color helper;
 * this mirrors the design in the popup where "Elevated" starts at 60.
 */
function riskLabel(score: number): string {
  if (score >= 75) return "High";
  if (score >= 60) return "Elevated";
  if (score >= 40) return "Moderate";
  return "Low";
}

// small data structure describing one concentric circle (heat zone)
interface HeatCircle {
  lat: number;
  lng: number;
  radius: number;
  color: string;
  opacity: number;
}

/**
 * Given a single assessment and a risk category, build the three concentric
 * circle markers that make up the "heat" visualization.
 *
 * The intensity of each zone is proportional to the score (0-100) and the
 * outermost, middle, and inner circles have progressively smaller radii and
 * higher opacity.  We always fall back to the overall score if the requested
 * layer is missing.
 */
function generateHeatZones(
  assessment: RiskAssessment,
  riskType: string
): HeatCircle[] {
  const { latitude: lat, longitude: lng } = assessment;

  const riskScores: Record<string, number> = {
    flood: assessment.floodRisk,
    wildfire: assessment.wildfireRisk,
    earthquake: assessment.earthquakeRisk,
    hurricane: assessment.hurricaneRisk,
    overall: assessment.overallScore,
  };

  const score = riskScores[riskType] ?? assessment.overallScore;
  const color = riskColor(score);
  const intensity = score / 100;

  return [
    {
      lat,
      lng,
      radius: 35 + intensity * 25,
      color,
      opacity: 0.15 + intensity * 0.15,
    },
    {
      lat,
      lng,
      radius: 22 + intensity * 15,
      color,
      opacity: 0.25 + intensity * 0.2,
    },
    {
      lat,
      lng,
      radius: 10 + intensity * 8,
      color,
      opacity: 0.4 + intensity * 0.25,
    },
  ];
}

/**
 * Retrieve the numeric score for a given layer from an assessment.  This
 * centralizes the mapping and keeps the two usages in sync.
 */
function getRiskScore(assessment: RiskAssessment, layer: RiskLayer): number {
  switch (layer) {
    case "flood":
      return assessment.floodRisk;
    case "wildfire":
      return assessment.wildfireRisk;
    case "earthquake":
      return assessment.earthquakeRisk;
    case "hurricane":
      return assessment.hurricaneRisk;
    case "overall":
    default:
      return assessment.overallScore;
  }
}
 
/**
 * Fit the map viewport to show all the assessments.  The component uses a
 * ref to perform the fit only once; subsequent renders should not trigger
 * additional calls since the map position is preserved by react-leaflet.
 */
function FitBounds({ assessments }: { assessments: RiskAssessment[] }) {
  const map = useMap();
  const fittedRef = useRef(false);

  useEffect(() => {
    if (fittedRef.current || assessments.length === 0) return;
    fittedRef.current = true;

    const bounds = L.latLngBounds(
      assessments.map((a) => [a.latitude, a.longitude] as [number, number])
    );
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 7 });
  }, [assessments, map]);

  return null;
}
// -----------------------------------------------------------------------------
// Map layer configuration
// -----------------------------------------------------------------------------

// available risk categories that can be rendered as separate layers
type RiskLayer = "overall" | "flood" | "wildfire" | "earthquake" | "hurricane";

const layerLabels: Record<RiskLayer, string> = {
  overall: "Overall Risk",
  flood: "Flood Risk",
  wildfire: "Wildfire Risk",
  earthquake: "Earthquake Risk",
  hurricane: "Hurricane Risk",
};

interface RiskMapProps {
  assessments: RiskAssessment[];
  className?: string;
  height?: string;
}

export default function RiskMap({ assessments, className = "", height = "500px" }: RiskMapProps) {
  const [activeLayer, setActiveLayer] = useState<RiskLayer>("overall");

  if (assessments.length === 0) return null;

  const center: [number, number] = [
    assessments.reduce((s, a) => s + a.latitude, 0) / assessments.length, // Calculate average latitude
    assessments.reduce((s, a) => s + a.longitude, 0) / assessments.length, // Calculate average longitude
  ];
// The component renders a map with interactive layer buttons. Each assessment
// is visualized as a set of concentric circles (heat zones) plus a small center
// marker.  Clicking a marker opens a popup that lists the selected layer's
// score along with the full breakdown of all sub-risk scores.
  return (
    <div className={className}>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {(Object.keys(layerLabels) as RiskLayer[]).map((layer) => (
          <button
            key={layer}
            onClick={() => setActiveLayer(layer)}
            data-testid={`button-layer-${layer}`}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              activeLayer === layer
                ? "bg-primary text-primary-foreground"
                : "bg-accent/50 text-muted-foreground hover:bg-accent"
            }`}
          >
            {layerLabels[layer]}
          </button>
        ))}
      </div>

      <div className="rounded-lg overflow-hidden border" style={{ height }}>
        <MapContainer
          center={center}
          zoom={5}
          style={{ height: "100%", width: "100%" }}
          zoomControl={true}
          attributionControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/ copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds assessments={assessments} />

          {assessments.map((assessment) => {
            const zones = generateHeatZones(assessment, activeLayer);
            // use helper to avoid duplicating riskScores mapping
            const score = getRiskScore(assessment, activeLayer);

            return (
              <Fragment key={`${assessment.id}-${activeLayer}`}>
                {zones.map((zone, i) => (
                  <CircleMarker
                    key={`${assessment.id}-zone-${i}`} // Use a unique key for each zone to prevent React warnings
                    center={[zone.lat, zone.lng]}
                    radius={zone.radius}
                    pathOptions={{
                      color: zone.color,
                      fillColor: zone.color,
                      fillOpacity: zone.opacity,
                      weight: i === zones.length - 1 ? 2 : 0,
                    }}
                  />
                ))}
                <CircleMarker
                  center={[assessment.latitude, assessment.longitude]}
                  radius={5}
                  pathOptions={{
                    color: "#ffffff",
                    fillColor: riskColor(score), 
                    fillOpacity: 1,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div className="text-sm min-w-[200px]" data-testid={`popup-assessment-${assessment.id}`}>
                      <p className="font-semibold text-sm mb-1">{assessment.propertyAddress}</p>
                      <div className="space-y-0.5">
                        <p>
                          <span className="text-gray-500">{layerLabels[activeLayer]}:</span>{" "}
                          <span className="font-semibold" style={{ color: riskColor(score) }}>
                            {score.toFixed(1)} ({riskLabel(score)})
                          </span>
                        </p>
                        <p><span className="text-gray-500">Overall:</span> <span className="font-medium">{assessment.overallScore.toFixed(1)}</span></p>
                        <p><span className="text-gray-500">Flood:</span> <span className="font-medium">{assessment.floodRisk.toFixed(1)}</span></p>
                        <p><span className="text-gray-500">Wildfire:</span> <span className="font-medium">{assessment.wildfireRisk.toFixed(1)}</span></p>
                        <p><span className="text-gray-500">Earthquake:</span> <span className="font-medium">{assessment.earthquakeRisk.toFixed(1)}</span></p>
                        <p><span className="text-gray-500">Hurricane:</span> <span className="font-medium">{assessment.hurricaneRisk.toFixed(1)}</span></p>
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              </Fragment>
            );
          })}
        </MapContainer> 
      </div>

      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
        <span className="font-medium">Legend:</span>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#22c55e" }} />
          <span>Low (&lt;40)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#eab308" }} />
          <span>Moderate (40-55)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#f97316" }} />
          <span>Elevated (55-70)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#ef4444" }} />
          <span>High (70+)</span>
        </div>
      </div>
    </div>
  );
}
