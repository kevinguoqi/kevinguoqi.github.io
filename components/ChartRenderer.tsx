
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
          <BarChart data={data} margin={{ top: 40, right: 30, left: 20, bottom: 80 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
            <XAxis 
              dataKey={config.xAxis} 
              axisLine={false} 
              tickLine={false} 
              tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 'bold'}} 
              angle={-45}
              textAnchor="end"
              interval={0}
            />
            <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
            <Tooltip 
              cursor={{fill: 'rgba(255,255,255,0.05)'}}
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
          <BarChart data={data} margin={{ top: 50, right: 20, left: 10, bottom: 90 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
            <XAxis 
              dataKey={config.xAxis} 
              axisLine={false} 
              tickLine={false} 
              tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} 
              angle={-45} 
              textAnchor="end"
              interval={0}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{fill: '#94a3b8', fontSize: 10}}
              domain={isRelative ? [0, 100] : [0, 'auto']}
              ticks={isRelative ? [0, 25, 50, 75, 100] : undefined}
            />
            <Tooltip 
              cursor={{fill: 'rgba(255,255,255,0.05)'}}
              contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b' }} 
            />
            <Bar dataKey={config.yAxis} fill={config.color || '#3b82f6'} radius={[4, 4, 0, 0]}>
              <LabelList 
                dataKey={config.yAxis} 
                position="top" 
                fill={config.color || "#3b82f6"} 
                fontSize={11} 
                fontWeight="black" 
                formatter={(val: number) => isRelative ? val.toFixed(1) : val} 
                offset={10}
              />
            </Bar>
          </BarChart>
        );
      case 'pie':
        return (
          <PieChart margin={{ top: 60, right: 80, bottom: 60, left: 80 }}>
            <Pie
              data={data}
              cx="50%"
              cy="40%"
              innerRadius={50}
              outerRadius={75} 
              paddingAngle={6}
              minAngle={25}
              dataKey={config.yAxis}
              nameKey={config.xAxis}
              label={({name, percent, cx, x, y}) => {
                if (percent < 0.04) return '';
                const cleanName = name.length > 10 ? `${name.substring(0, 8)}..` : name;
                const textAnchor = x > cx ? 'start' : 'end';
                return (
                  <text 
                    x={x} 
                    y={y} 
                    fill="#94a3b8" 
                    textAnchor={textAnchor} 
                    dominantBaseline="central" 
                    fontSize="10" 
                    fontWeight="bold"
                  >
                    {`${cleanName} ${(percent * 100).toFixed(0)}%`}
                  </text>
                );
              }}
              labelLine={{ stroke: '#334155', strokeWidth: 1.5 }}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.part === 'Others' ? '#334155' : COLORS[index % COLORS.length]} 
                  stroke="rgba(15, 23, 42, 0.8)" 
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }} 
              itemStyle={{ color: '#fff' }}
            />
            <Legend 
              verticalAlign="bottom" 
              align="center" 
              iconType="circle"
              layout="horizontal"
              wrapperStyle={{ 
                paddingTop: '40px', 
                fontSize: '9px', 
                fontWeight: 'bold', 
                textTransform: 'uppercase'
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
