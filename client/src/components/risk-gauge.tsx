interface RiskGaugeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function RiskGauge({ score, size = "md", showLabel = true }: RiskGaugeProps) {
  const clampedScore = Math.max(0, Math.min(100, score));

  const getColor = () => {
    if (clampedScore >= 70) return "text-destructive";
    if (clampedScore >= 40) return "text-chart-2";
    return "text-chart-3";
  };

  const getLabel = () => {
    if (clampedScore >= 70) return "High Risk";
    if (clampedScore >= 40) return "Moderate";
    return "Low Risk";
  };

  const getBgColor = () => {
    if (clampedScore >= 70) return "bg-destructive/15";
    if (clampedScore >= 40) return "bg-chart-2/15";
    return "bg-chart-3/15";
  };

  const getTrackColor = () => {
    if (clampedScore >= 70) return "bg-destructive";
    if (clampedScore >= 40) return "bg-chart-2";
    return "bg-chart-3";
  };

  const sizeConfig = {
    sm: { text: "text-lg", label: "text-[10px]", track: "h-1.5" },
    md: { text: "text-2xl", label: "text-xs", track: "h-2" },
    lg: { text: "text-4xl", label: "text-sm", track: "h-2.5" },
  };

  const config = sizeConfig[size];

  return (
    <div className="space-y-1.5" data-testid={`risk-gauge-${score}`}>
      <div className="flex items-end justify-between gap-1">
        <span className={`${config.text} font-semibold tabular-nums ${getColor()}`}>
          {clampedScore.toFixed(1)}
        </span>
        {showLabel && (
          <span className={`${config.label} px-1.5 py-0.5 rounded-sm font-medium ${getBgColor()} ${getColor()}`}>
            {getLabel()}
          </span>
        )}
      </div>
      <div className={`w-full rounded-full bg-muted ${config.track}`}>
        <div
          className={`${config.track} rounded-full transition-all duration-700 ease-out ${getTrackColor()}`}
          style={{ width: `${clampedScore}%` }}
        />
      </div>
    </div>
  );
}
