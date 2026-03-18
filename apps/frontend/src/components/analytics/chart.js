'use client';
import { useEffect, useRef } from 'react';
import DrawChart from 'chart.js/auto';
import { newDayjs } from "../layout/set.timezone";
export const Chart = (props) => {
    const { list } = props;
    const ref = useRef(null);
    const chart = useRef(null);
    useEffect(() => {
        var _a;
        const gradient = ref.current
            .getContext('2d')
            .createLinearGradient(0, 0, 0, ref.current.height);
        gradient.addColorStop(0, 'rgba(114, 118, 137, 1)'); // Start color with some transparency
        gradient.addColorStop(1, 'rgb(9, 11, 19, 1)');
        chart.current = new DrawChart(ref.current, {
            type: 'line',
            options: {
                maintainAspectRatio: false,
                responsive: true,
                layout: {
                    padding: {
                        left: 0,
                        right: 0,
                        top: 0,
                        bottom: 0,
                    },
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        display: false,
                    },
                    x: {
                        display: false,
                    },
                },
                plugins: {
                    legend: {
                        display: false,
                    },
                },
            },
            data: {
                labels: list.map((row) => newDayjs(row.date).format('DD/MM/YYYY')),
                datasets: [
                    {
                        borderColor: '#fff',
                        // @ts-ignore
                        label: ((_a = list === null || list === void 0 ? void 0 : list[0]) === null || _a === void 0 ? void 0 : _a.totalForks) ? 'Forks by date' : 'Stars by date',
                        backgroundColor: gradient,
                        fill: true,
                        // @ts-ignore
                        data: list.map((row) => row.totalForks || row.totalStars),
                    },
                ],
            },
        });
        return () => {
            var _a;
            (_a = chart === null || chart === void 0 ? void 0 : chart.current) === null || _a === void 0 ? void 0 : _a.destroy();
        };
    }, []);
    return <canvas className="w-full h-full" ref={ref}/>;
};
//# sourceMappingURL=chart.js.map