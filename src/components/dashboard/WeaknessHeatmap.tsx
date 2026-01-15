import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SubTopicPerformance {
  id: string;
  name: string;
  subject: string;
  averagePercentage: number;
}

interface WeaknessHeatmapProps {
  data: SubTopicPerformance[];
  className?: string;
}

const getPerformanceColor = (percentage: number): string => {
  if (percentage >= 80) return "bg-success/80 text-success-foreground";
  if (percentage >= 70) return "bg-success/50 text-foreground";
  if (percentage >= 60) return "bg-warning/50 text-foreground";
  if (percentage >= 50) return "bg-warning/80 text-warning-foreground";
  return "bg-destructive/70 text-destructive-foreground";
};

const getPerformanceLabel = (percentage: number): string => {
  if (percentage >= 80) return "Excellent";
  if (percentage >= 70) return "Good";
  if (percentage >= 60) return "Average";
  if (percentage >= 50) return "Needs Work";
  return "Critical";
};

export function WeaknessHeatmap({ data, className }: WeaknessHeatmapProps) {
  const sortedData = [...data].sort((a, b) => a.averagePercentage - b.averagePercentage);
  const weakest = sortedData.slice(0, 8);
  const strongest = sortedData.slice(-4).reverse();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <Card className={className}>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">
            Sub-Topic Performance Analysis
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Identifying areas that need improvement across all students
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="mb-3 text-sm font-medium text-destructive">
              ⚠️ Areas Needing Attention
            </h4>
            <div className="grid gap-2">
              {weakest.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="flex items-center gap-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{item.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {item.subject}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${item.averagePercentage}%` }}
                        transition={{ duration: 0.6, delay: 0.3 + index * 0.05 }}
                        className={cn(
                          "h-full rounded-full transition-all",
                          getPerformanceColor(item.averagePercentage)
                        )}
                      />
                    </div>
                  </div>
                  <span
                    className={cn(
                      "min-w-[60px] rounded-md px-2 py-1 text-center text-xs font-medium",
                      getPerformanceColor(item.averagePercentage)
                    )}
                  >
                    {item.averagePercentage.toFixed(0)}%
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="mb-3 text-sm font-medium text-success">
              ✓ Top Performing Areas
            </h4>
            <div className="grid gap-2">
              {strongest.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 + index * 0.05 }}
                  className="flex items-center gap-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{item.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {item.subject}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${item.averagePercentage}%` }}
                        transition={{ duration: 0.6, delay: 0.5 + index * 0.05 }}
                        className={cn(
                          "h-full rounded-full transition-all",
                          getPerformanceColor(item.averagePercentage)
                        )}
                      />
                    </div>
                  </div>
                  <span
                    className={cn(
                      "min-w-[60px] rounded-md px-2 py-1 text-center text-xs font-medium",
                      getPerformanceColor(item.averagePercentage)
                    )}
                  >
                    {item.averagePercentage.toFixed(0)}%
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 border-t pt-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-sm bg-destructive/70" />
              <span>Critical (&lt;50%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-sm bg-warning/80" />
              <span>Needs Work</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-sm bg-success/80" />
              <span>Excellent (&gt;80%)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
