import React from 'react';
import { SimpleGrid, Card, Text, Group } from '@mantine/core';

const stats = [
    {
        value: '0',
        label: 'Nội dung xuất',
    },
    {
        value: '368,006',
        label: 'Fanpages',
    },
    {
        value: '1,391',
        label: 'NPS đang theo',
    },
    {
        value: '86,019',
        label: 'Lịch hẹn đăng',
    },
];

export const StatsCards = () => {
    return (
        <SimpleGrid cols={4} spacing="md">
            {stats.map((stat, index) => (
                <Card key={index} shadow="sm" p="md">
                    <Group position="apart" align="center">
                        <Text size="xl" weight={500}>{stat.value}</Text>
                        <Text color="dimmed" size="sm">{stat.label}</Text>
                    </Group>
                </Card>
            ))}
        </SimpleGrid>
    );
};
