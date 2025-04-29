"use client";

import { useEffect, useRef } from "react";
import { formatCurrency } from "./utils";

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
    fill?: boolean;
  }[];
}

const defaultData: ChartData = {
  labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  datasets: [
    {
      label: "Revenue",
      data: [1500, 2500, 3500, 3700, 4500, 5200, 6000, 7000, 8000, 8500, 9200, 10000],
      borderColor: "hsl(var(--primary))",
      backgroundColor: "hsl(var(--primary) / 0.1)",
      fill: true,
    },
    {
      label: "Expenses",
      data: [1000, 1800, 2800, 3200, 3800, 4100, 4700, 5300, 5800, 6200, 6700, 7200],
      borderColor: "hsl(var(--destructive))",
      backgroundColor: "hsl(var(--destructive) / 0.1)",
      fill: true,
    },
  ],
};

// This is a placeholder for a real chart library
// In a real implementation, this would use a library like Chart.js, Recharts, or D3
export function SalesChart({ data = defaultData }: { data?: ChartData }) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // This would normally be where we initialize the chart
    // For now, we'll just render a placeholder
    if (chartRef.current) {
      renderPlaceholderChart(chartRef.current, data);
    }
  }, [data]);

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-medium">Sales Overview</h3>
        <div className="flex gap-4">
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-full bg-primary"></div>
            <span className="text-sm">Revenue</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-full bg-destructive"></div>
            <span className="text-sm">Expenses</span>
          </div>
        </div>
      </div>
      <div ref={chartRef} className="h-80">
        {/* Chart will be rendered here by the chart library */}
        <div className="flex h-full w-full items-center justify-center">
          <p className="text-muted-foreground">
            Chart placeholder - implement with your preferred charting library
          </p>
        </div>
      </div>
      
      {/* Summary stats below the chart */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border p-3">
          <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
          <p className="text-2xl font-bold">{formatCurrency(67000)}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
          <p className="text-2xl font-bold">{formatCurrency(46000)}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-sm font-medium text-muted-foreground">Net Profit</p>
          <p className="text-2xl font-bold">{formatCurrency(21000)}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-sm font-medium text-muted-foreground">Profit Margin</p>
          <p className="text-2xl font-bold">31.3%</p>
        </div>
      </div>
    </div>
  );
}

// This is a placeholder function that would normally be replaced with actual chart rendering
function renderPlaceholderChart(element: HTMLDivElement, data: ChartData) {
  // In a real implementation, this would use a chart library
  // For now, we'll just set a data attribute for demonstration
  element.setAttribute("data-chart-data", JSON.stringify(data));
} 