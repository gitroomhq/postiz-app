import React from 'react';
import { Paper, Title, Table, Text, Group, Avatar } from '@mantine/core';

const mockPosts = [
    {
        id: '1',
        title: 'Hến Ngon Mê Ngày',
        thumbnail: '/mock-post-1.jpg',
        stats: {
            likes: 355,
            comments: 42,
            shares: 15
        },
        createdAt: 'Có thẻ bài'
    },
    {
        id: '2',
        title: 'Món ăn thú vị, món ngon đường phố',
        thumbnail: '/mock-post-2.jpg',
        stats: {
            likes: 244,
            comments: 35,
            shares: 12
        },
        createdAt: 'Có thẻ bài'
    },
    // Add more mock posts as needed
];

export const TopPosts = () => {
    return (
        <Paper shadow="xs" p="md">
            <Title order={3} mb="md">Top 20 bài viết nhiều Like nhất 10 ngày qua</Title>
            <Table>
                <tbody>
                    {mockPosts.map(post => (
                        <tr key={post.id}>
                            <td style={{ width: 60 }}>
                                <Avatar src={post.thumbnail} size="lg" radius="sm" />
                            </td>
                            <td>
                                <Text size="sm">{post.title}</Text>
                                <Text size="xs" color="dimmed">{post.createdAt}</Text>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                                <Group spacing={4} position="right">
                                    <Text size="sm">{post.stats.likes}</Text>
                                    <Text size="sm" color="dimmed">likes</Text>
                                </Group>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        </Paper>
    );
};
