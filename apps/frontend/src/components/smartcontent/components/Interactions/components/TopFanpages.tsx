import React from 'react';
import { Paper, Title, Table, Text, Avatar } from '@mantine/core';

const mockFanpages = [
    {
        id: '1',
        name: 'Món Món Ăn Ngon',
        avatar: '/fanpage-1.jpg',
        stats: '981 bài viết'
    },
    {
        id: '2',
        name: 'Món ăn ZOZZ',
        avatar: '/fanpage-2.jpg',
        stats: '687 bài viết'
    },
    // Add more fanpages as needed
];

export const TopFanpages = () => {
    return (
        <Paper shadow="xs" p="md">
            <Title order={3} mb="md">Top Fanpages</Title>
            <Table>
                <tbody>
                    {mockFanpages.map(page => (
                        <tr key={page.id}>
                            <td style={{ width: 40 }}>
                                <Avatar src={page.avatar} size="md" radius="sm" />
                            </td>
                            <td>
                                <Text size="sm">{page.name}</Text>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                                <Text size="sm" color="dimmed">{page.stats}</Text>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        </Paper>
    );
};
