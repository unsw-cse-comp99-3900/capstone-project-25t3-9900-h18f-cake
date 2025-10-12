// src/components/MarkingDifferenceChart.jsx
import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
  Cell
} from 'recharts';

const MarkingDifferenceChart = ({ data }) => {
  // Process data format
  const chartData = data.map(item => ({
    name: item.name,
    aiMarked: item['AI marked'],
    tutorMarked: item['Tutor marked'],
    difference: item.difference
  }));

  // 修复的 CustomTooltip 组件
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length > 0) {
      // 安全地获取值，避免 undefined 错误
      const aiMarkValue = payload[0]?.value || 0;
      const tutorMarkValue = payload[1]?.value || 0;
      const differenceValue = payload[2]?.value || 0;
      
      return (
        <div className="custom-tooltip" style={{ 
          backgroundColor: '#fff', 
          padding: '10px', 
          border: '1px solid #ccc',
          borderRadius: '4px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>{label}</p>
          <p style={{ color: '#8884d8' }}>AI Mark: {aiMarkValue}</p>
          <p style={{ color: '#82ca9d' }}>Tutor Mark: {tutorMarkValue}</p>
          <p style={{ 
            color: differenceValue >= 0 ? '#0088fe' : '#ff7300',
            fontWeight: 'bold'
          }}>
            Difference: {differenceValue}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ 
      backgroundColor: 'white', 
      padding: '20px', 
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      marginBottom: '30px'
    }}>
      <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Marking Difference Analysis</h3>
      
      <div style={{ marginBottom: '30px' }}>
        <h4 style={{ marginBottom: '15px' }}>AI Mark vs Tutor Mark</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 30,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="aiMarked" name="AI Mark" fill="#8884d8" />
            <Bar dataKey="tutorMarked" name="Tutor Mark" fill="#82ca9d" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div>
        <h4 style={{ marginBottom: '15px' }}>Marking Difference (AI - Tutor)</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 30,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar 
              dataKey="difference" 
              name="Difference"
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.difference >= 0 ? '#0088fe' : '#ff7300'} 
                />
              ))}
              <LabelList dataKey="difference" position="top" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MarkingDifferenceChart;