
export interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'area' | 'scatter' | 'stackedBar';
  title: string;
  description: string;
  xAxis: string;
  yAxis: string; // For stackedBar, this might be a primary key or comma-separated list
  color?: string;
  dataKeys?: string[]; // Specifically for stacked charts
}

export interface SheetAnalysis {
  summary: string;
  insights: string[];
  visualizations: ChartConfig[];
}

export interface DataRow {
  [key: string]: any;
}

export interface AppState {
  data: DataRow[];
  headers: string[];
  analysis: SheetAnalysis | null;
  loading: boolean;
  error: string | null;
}
