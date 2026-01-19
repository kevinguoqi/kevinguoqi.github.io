
export interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'area' | 'scatter' | 'stackedBar';
  title: string;
  description: string;
  xAxis: string;
  yAxis: string; // For stackedBar, this might be a primary key or comma-separated list
  color?: string;
  dataKeys?: string[]; // Specifically for stacked charts
}



export interface DataRow {
  [key: string]: any;
}


