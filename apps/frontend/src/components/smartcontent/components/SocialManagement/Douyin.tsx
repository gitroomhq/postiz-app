'use client';
import React, { useEffect } from 'react';
import { Grid, Card, Image, Text, Badge, Group, Stack, Checkbox } from '@mantine/core';
import SocialManagementBase from './SocialManagementBase';
import { useSocialManagement } from './context';

interface DouyinPost {
    id: string;
    thumbnail: string;
    title: string;
    stats: {
        likes: number;
        comments: number;
        shares: number;
    };
}

const mockPosts: DouyinPost[] = [
    {
        id: '1',
        thumbnail: '/mock-douyin-1.jpg',
        title: '这是一个抖音视频标题 #trending #viral',
        stats: {
            likes: 1234,
            comments: 56,
            shares: 78
        }
    },
    {
        id: '2',
        thumbnail: '/mock-douyin-2.jpg',
        title: '另一个有趣的抖音视频 #dance #music',
        stats: {
            likes: 5678,
            comments: 90,
            shares: 12
        }
    }
    // Add more mock data as needed
];

const DouyinPost = ({ post }: { post: DouyinPost }) => {
    const { selectedPosts, togglePostSelection } = useSocialManagement();
    const isSelected = selectedPosts.has(post.id);

    return (
        <Card shadow="sm" p="lg" radius="md" withBorder>
            <Card.Section pos="relative">
                <Group position="right" style={{ position: 'absolute', top: 10, right: 10, zIndex: 1 }}>
                    <Checkbox
                        checked={isSelected}
                        onChange={() => togglePostSelection(post.id)}
                        styles={{
                            input: {
                                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                borderColor: 'rgba(0, 0, 0, 0.1)'
                            }
                        }}
                    />
                </Group>
                <Image
                    src={post.thumbnail}
                    height={160}
                    alt={post.title}
                    style={{ objectFit: 'cover' }}
                />
            </Card.Section>

            <Stack mt="md" spacing="xs">
                <Text size="sm" lineClamp={2}>
                    {post.title}
                </Text>

                <Group position="apart" mt="md">
                    <Badge color="pink" variant="light">
                        {post.stats.likes} 点赞
                    </Badge>
                    <Badge color="grape" variant="light">
                        {post.stats.comments} 评论
                    </Badge>
                    <Badge color="violet" variant="light">
                        {post.stats.shares} 分享
                    </Badge>
                </Group>
            </Stack>
        </Card>
    );
};

const Douyin = () => {
    return (
        <SocialManagementBase platform="douyin">
            <Grid>
                {mockPosts.map((post) => (
                    <Grid.Col key={post.id} span={3}>
                        <DouyinPost post={post} />
                    </Grid.Col>
                ))}
            </Grid>
        </SocialManagementBase>
    );
};

export default Douyin;
