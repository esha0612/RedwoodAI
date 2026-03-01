import { Fragment, useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import type { RiskAssessment } from "@shared/schema";
import "leaflet/dist/leaflet.css";

function riskColor(score: number): string {
  if (score >= 70) return "#ef4444";
  if (score >= 55) return "#f97316";
  if (score >= 40) return "#eab308";
  return "#22c55e";
}

function riskLabel(score: number): string {
  if (score >= 70) return "High";
  if (score >= 55) return "Elevated";
  if (score >= 40) return "Moderate";
  return "Low";
}

interface HeatCircle {
  lat: number;
  lng: number;
  radius: number;
  color: string;
  opacity: number;
}

function generateHeatZones(assessment: RiskAssessment, riskType: string): HeatCircle[] {
  const circles: HeatCircle[] = [];
  const lat = assessment.latitude;
  const lng = assessment.longitude;

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

  circles.push({
    lat,
    lng,
    radius: 35 + intensity * 25,
    color,
    opacity: 0.15 + intensity * 0.15,
  });

  circles.push({
    lat,
    lng,
    radius: 22 + intensity * 15,
    color,
    opacity: 0.25 + intensity * 0.2,
  });

  circles.push({
    lat,
    lng,
    radius: 10 + intensity * 8,
    color,
    opacity: 0.4 + intensity * 0.25,
  });

  return circles;
}

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
    assessments.reduce((s, a) => s + a.latitude, 0) / assessments.length,
    assessments.reduce((s, a) => s + a.longitude, 0) / assessments.length,
  ];

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
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <FitBounds assessments={assessments} />

          {assessments.map((assessment) => {
            const zones = generateHeatZones(assessment, activeLayer);
            const riskScores: Record<string, number> = {
              overall: assessment.overallScore,
              flood: assessment.floodRisk,
              wildfire: assessment.wildfireRisk,
              earthquake: assessment.earthquakeRisk,
              hurricane: assessment.hurricaneRisk,
            };
            const score = riskScores[activeLayer];

            return (
              <Fragment key={`${assessment.id}-${activeLayer}`}>
                {zones.map((zone, i) => (
                  <CircleMarker
                    key={`${assessment.id}-zone-${i}`}
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
