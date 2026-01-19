
import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, LabelList
} from 'recharts';
import { ChartConfig, DataRow } from '../types';

interface ChartRendererProps {
  config: ChartConfig;
  data: DataRow[];
}

const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#14b8a6'];

const PODIUM_COLORS = {
  first: '#3b82f6',
  second: '#ef4444',
  third: '#f59e0b'
};

const ChartRenderer: React.FC<ChartRendererProps> = ({ config, data }) => {
  const renderChart = () => {
    switch (config.type) {
      case 'stackedBar':
        return (
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
            <XAxis
              dataKey={config.xAxis}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' }}
              angle={-45}
              textAnchor="end"
              interval={0}
            />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #334155', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)' }}
              itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
            />
            <Legend verticalAlign="top" height={40} iconType="rect" />

            <Bar dataKey="first" name="1st" stackId="a" fill={PODIUM_COLORS.first}>
              <LabelList dataKey="first" position="center" fill="#fff" fontSize={10} fontWeight="bold" formatter={(val: number) => val > 0 ? val : ''} />
            </Bar>
            <Bar dataKey="second" name="2nd" stackId="a" fill={PODIUM_COLORS.second}>
              <LabelList dataKey="second" position="center" fill="#fff" fontSize={10} fontWeight="bold" formatter={(val: number) => val > 0 ? val : ''} />
            </Bar>
            <Bar dataKey="third" name="3rd" stackId="a" fill={PODIUM_COLORS.third} radius={[4, 4, 0, 0]}>
              <LabelList dataKey="third" position="center" fill="#fff" fontSize={10} fontWeight="bold" formatter={(val: number) => val > 0 ? val : ''} />
            </Bar>
          </BarChart>
        );
      case 'bar':
        const isRelative = config.yAxis === 'relativeScore';
        return (
          <BarChart data={data} margin={{ top: 30, bottom: 80 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
            <XAxis
              dataKey={config.xAxis}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              angle={-45}
              textAnchor="end"
              interval={0}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              domain={isRelative ? [0, 100] : [0, 'auto']}
              ticks={isRelative ? [0, 25, 50, 75, 100] : undefined}
            />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b' }}
            />
            <Bar dataKey={config.yAxis} fill={config.color || '#3b82f6'} radius={[4, 4, 0, 0]}>
              <LabelList
                dataKey={config.yAxis}
                position="top"
                fill="#3b82f6"
                fontSize={11}
                fontWeight="bold"
                formatter={(val: number) => isRelative ? val.toFixed(2) : val}
              />
            </Bar>
          </BarChart>
        );
      case 'pie':
        return (
          <PieChart margin={{ top: 40, right: 60, bottom: 40, left: 60 }}>
            <Pie
              data={data}
              cx="50%"
              cy="45%"
              innerRadius={55}
              outerRadius={80} // Reduced radius to allow more room for labels
              paddingAngle={5}
              minAngle={20}
              dataKey={config.yAxis}
              nameKey={config.xAxis}
              // Truncate name and check percent to avoid clutter
              label={({ name, percent }) => {
                if (percent < 0.05) return '';
                const cleanName = name.length > 12 ? `${name.substring(0, 10)}...` : name;
                return `${cleanName} (${(percent * 100).toFixed(0)}%)`;
              }}
              labelLine={{ stroke: '#475569', strokeWidth: 1 }}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.part === 'Others' ? '#334155' : COLORS[index % COLORS.length]}
                  stroke="none"
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}
              itemStyle={{ color: '#fff' }}
              formatter={(value, name) => [value, name]}
            />
            <Legend
              verticalAlign="bottom"
              align="center"
              iconType="circle"
              layout="horizontal"
              wrapperStyle={{
                paddingTop: '30px',
                fontSize: '9px',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                maxWidth: '100%'
              }}
            />
          </PieChart>
        );
      default:
        return <div className="flex items-center justify-center h-full text-slate-400">Select data to visualize</div>;
    }
  };

  return (
    <div className="w-full h-full min-h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
};

export default ChartRenderer;
