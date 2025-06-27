'use client';
import React, { useEffect, useState } from 'react';
import { Grid, Card, Image, Text, Group, Stack, Checkbox } from '@mantine/core';
import { IconHeart, IconMessageCircle2, IconShare } from '@tabler/icons-react';
import SocialManagementBase from './SocialManagementBase';
import { useSocialManagement } from './context';

interface TikTokPost {
    id: string;
    thumbnail: string;
    title: string;
    author: {
        name: string;
        avatar: string;
    };
    stats: {
        likes: number;
        comments: number;
        shares: number;
    };
    selected?: boolean;
}

interface TikTokApiVideo {
    id: string;
    cover: string;
    title: string;
    author: {
        name: string;
        avatar: string;
    };
    stats: {
        likes: number;
        comments: number;
        shares: number;
    };
}

const fetchTikTokVideos = async (accessToken: string): Promise<TikTokApiVideo[]> => {
    const res = await fetch('https://open.tiktokapis.com/v2/video/list/?fields=id,cover_image_url,description,author,stats', {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });
    const data = await res.json();
    return (data.data?.videos || []).map((v: any) => ({
        id: v.id,
        cover: v.cover_image_url,
        title: v.description,
        author: {
            name: v.author?.unique_id || '',
            avatar: v.author?.avatar_thumb_url || ''
        },
        stats: {
            likes: v.stats?.digg_count || 0,
            comments: v.stats?.comment_count || 0,
            shares: v.stats?.share_count || 0
        }
    }));
};

const formatNumber = (num: number): string => {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
};

const TikTokPost = ({ post }: { post: TikTokPost }) => {
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
                    height={280}
                    alt={post.title}
                    style={{ objectFit: 'cover' }}
                />
            </Card.Section>

            <Stack mt="md" spacing="xs">
                <Group>
                    <Image
                        src={post.author.avatar}
                        width={24}
                        height={24}
                        radius="xl"
                        alt={post.author.name}
                    />
                    <Text size="sm" weight={500}>
                        {post.author.name}
                    </Text>
                </Group>

                <Text size="sm" lineClamp={2}>
                    {post.title}
                </Text>

                <Group spacing="xl" mt="md">
                    <Group spacing="xs">
                        <IconHeart size={18} />
                        <Text size="sm">{formatNumber(post.stats.likes)}</Text>
                    </Group>
                    <Group spacing="xs">
                        <IconMessageCircle2 size={18} />
                        <Text size="sm">{formatNumber(post.stats.comments)}</Text>
                    </Group>
                    <Group spacing="xs">
                        <IconShare size={18} />
                        <Text size="sm">{formatNumber(post.stats.shares)}</Text>
                    </Group>
                </Group>
            </Stack>
        </Card>
    );
};

const TikTok = () => {
    const [videos, setVideos] = useState<TikTokApiVideo[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    useEffect(() => {
        const accessToken = 'awd5jljw2lo8f83y';
        setLoading(true);
        fetchTikTokVideos(accessToken)
            .then(setVideos)
            .catch((e) => setError('Không lấy được video từ TikTok'))
            .finally(() => setLoading(false));
    }, []);
    return (
        <SocialManagementBase platform="tiktok">
            {loading && <Text>Đang tải video...</Text>}
            {error && <Text color="red">{error}</Text>}
            <Grid>
                {videos.map((post) => (
                    <Grid.Col key={post.id} span={3}>
                        <TikTokPost post={{
                            id: post.id,
                            thumbnail: post.cover,
                            title: post.title,
                            author: post.author,
                            stats: post.stats
                        }} />
                    </Grid.Col>
                ))}
            </Grid>
        </SocialManagementBase>
    );
};

export default TikTok;
