import React, { useEffect, useState } from 'react';
import { Paper, Title } from '@mantine/core';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const mockData = [
    { date: '07 tháng 05', value: 20 },
    { date: '11 tháng 05', value: 30 },
    { date: '12 tháng 05', value: 25 },
    { date: '13 tháng 05', value: 45 },
    { date: '14 tháng 05', value: 20 },
    { date: '15 tháng 05', value: 42 },
    { date: '16 tháng 05', value: 35 },
    { date: '17 tháng 05', value: 28 },
    { date: '18 tháng 05', value: 25 },
    { date: '19 tháng 05', value: 38 }
];

export const TrendChart = () => {
    const [data, setData] = useState(mockData.map(item => ({ ...item, value: 0 })));

    useEffect(() => {
        // Animation effect
        setTimeout(() => {
            setData(mockData);
        }, 100);
    }, []);

    return (
        <Paper shadow="xs" p="md">
            <Title order={3} mb="md">Thống kê xu hướng</Title>
            <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Line
                            type="monotone"
                            dataKey="value"
                            stroke="#2196f3"
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            animationDuration={1500}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </Paper>
    );
};
