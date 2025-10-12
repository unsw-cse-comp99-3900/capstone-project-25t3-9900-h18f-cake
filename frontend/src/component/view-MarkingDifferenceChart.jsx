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
  LabelList
} from 'recharts';

const MarkingDifferenceChart = ({ data }) => {
  // Process data format
  const chartData = data.map(item => ({
    name: item.name,
    aiMarked: item['AI marked'],
    tutorMarked: item['Tutor marked'],
    difference: item.difference
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip" style={{ 
          backgroundColor: '#fff', 
          padding: '10px', 
          border: '1px solid #ccc',
          borderRadius: '4px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>{label}</p>
          <p style={{ color: '#8884d8' }}>AI Mark: {payload[0].value}</p>
          <p style={{ color: '#82ca9d' }}>Tutor Mark: {payload[1].value}</p>
          <p style={{ 
            color: payload[2].value >= 0 ? '#0088fe' : '#ff7300',
            fontWeight: 'bold'
          }}>
            Difference: {payload[2].value}
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
              fill={(entry) => entry.difference >= 0 ? '#0088fe' : '#ff7300'}
            >
              <LabelList dataKey="difference" position="top" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MarkingDifferenceChart;