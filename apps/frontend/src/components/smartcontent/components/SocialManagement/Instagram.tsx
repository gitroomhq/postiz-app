'use client';
import React, { useState } from 'react';
import { Card, Image, Text, Group, Stack, Checkbox, SegmentedControl, SimpleGrid, Badge, Avatar } from '@mantine/core';
import { IconHeart, IconMessageCircle2, IconShare, IconBookmark } from '@tabler/icons-react';
import SocialManagementBase from './SocialManagementBase';
import { useSocialManagement } from './context';

interface InstagramPost {
    id: string;
    type: 'feed' | 'reel';
    image: string;
    caption: string;
    author: {
        name: string;
        username: string;
        avatar: string;
    };
    stats: {
        likes: number;
        comments: number;
        shares: number;
        saves: number;
    };
    selected?: boolean;
}

const mockPosts: InstagramPost[] = [
    {
        id: '1',
        type: 'feed',
        image: '/mock-insta-1.jpg',
        caption: 'Perfect morning vibes ☕️ #morningroutine #lifestyle',
        author: {
            name: 'Lifestyle Blog',
            username: '@lifestyleblog',
            avatar: '/mock-avatar-1.jpg'
        },
        stats: {
            likes: 2543,
            comments: 128,
            shares: 45,
            saves: 156
        }
    },
    {
        id: '2',
        type: 'reel',
        image: '/mock-insta-2.jpg',
        caption: 'Quick makeup tutorial 💄 #beauty #makeup',
        author: {
            name: 'Beauty Tips',
            username: '@beautytips',
            avatar: '/mock-avatar-2.jpg'
        },
        stats: {
            likes: 15632,
            comments: 843,
            shares: 2156,
            saves: 3421
        }
    },
    {
        id: '1',
        type: 'feed',
        image: '/mock-insta-1.jpg',
        caption: 'Perfect morning vibes ☕️ #morningroutine #lifestyle',
        author: {
            name: 'Lifestyle Blog',
            username: '@lifestyleblog',
            avatar: '/mock-avatar-1.jpg'
        },
        stats: {
            likes: 2543,
            comments: 128,
            shares: 45,
            saves: 156
        }
    },
    {
        id: '2',
        type: 'reel',
        image: '/mock-insta-2.jpg',
        caption: 'Quick makeup tutorial 💄 #beauty #makeup',
        author: {
            name: 'Beauty Tips',
            username: '@beautytips',
            avatar: '/mock-avatar-2.jpg'
        },
        stats: {
            likes: 15632,
            comments: 843,
            shares: 2156,
            saves: 3421
        }
    },
    {
        id: '1',
        type: 'feed',
        image: '/mock-insta-1.jpg',
        caption: 'Perfect morning vibes ☕️ #morningroutine #lifestyle',
        author: {
            name: 'Lifestyle Blog',
            username: '@lifestyleblog',
            avatar: '/mock-avatar-1.jpg'
        },
        stats: {
            likes: 2543,
            comments: 128,
            shares: 45,
            saves: 156
        }
    },
    {
        id: '2',
        type: 'reel',
        image: '/mock-insta-2.jpg',
        caption: 'Quick makeup tutorial 💄 #beauty #makeup',
        author: {
            name: 'Beauty Tips',
            username: '@beautytips',
            avatar: '/mock-avatar-2.jpg'
        },
        stats: {
            likes: 15632,
            comments: 843,
            shares: 2156,
            saves: 3421
        }
    },
    {
        id: '1',
        type: 'feed',
        image: '/mock-insta-1.jpg',
        caption: 'Perfect morning vibes ☕️ #morningroutine #lifestyle',
        author: {
            name: 'Lifestyle Blog',
            username: '@lifestyleblog',
            avatar: '/mock-avatar-1.jpg'
        },
        stats: {
            likes: 2543,
            comments: 128,
            shares: 45,
            saves: 156
        }
    },
    {
        id: '2',
        type: 'reel',
        image: '/mock-insta-2.jpg',
        caption: 'Quick makeup tutorial 💄 #beauty #makeup',
        author: {
            name: 'Beauty Tips',
            username: '@beautytips',
            avatar: '/mock-avatar-2.jpg'
        },
        stats: {
            likes: 15632,
            comments: 843,
            shares: 2156,
            saves: 3421
        }
    },
    {
        id: '1',
        type: 'feed',
        image: '/mock-insta-1.jpg',
        caption: 'Perfect morning vibes ☕️ #morningroutine #lifestyle',
        author: {
            name: 'Lifestyle Blog',
            username: '@lifestyleblog',
            avatar: '/mock-avatar-1.jpg'
        },
        stats: {
            likes: 2543,
            comments: 128,
            shares: 45,
            saves: 156
        }
    },
    {
        id: '2',
        type: 'reel',
        image: '/mock-insta-2.jpg',
        caption: 'Quick makeup tutorial 💄 #beauty #makeup',
        author: {
            name: 'Beauty Tips',
            username: '@beautytips',
            avatar: '/mock-avatar-2.jpg'
        },
        stats: {
            likes: 15632,
            comments: 843,
            shares: 2156,
            saves: 3421
        }
    },
];

const formatNumber = (num: number): string => {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
};

const Instagram = () => {
    const [view, setView] = useState<'feed' | 'reel'>('feed');

    const InstagramPost = ({ post }: { post: InstagramPost }) => {
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
                        src={post.image}
                        height={post.type === 'reel' ? 400 : 300}
                        alt={post.caption}
                        style={{ objectFit: 'cover' }}
                    />
                    {post.type === 'reel' && (
                        <Badge
                            variant="filled"
                            style={{
                                position: 'absolute',
                                bottom: 10,
                                left: 10,
                                backgroundColor: 'rgba(0, 0, 0, 0.7)'
                            }}
                        >
                            Reel
                        </Badge>
                    )}
                </Card.Section>

                <Stack mt="md" spacing="xs">
                    <Group>
                        <Avatar
                            src={post.author.avatar}
                            size="sm"
                            radius="xl"
                        />
                        <Text size="sm" weight={500}>
                            {post.author.username}
                        </Text>
                    </Group>

                    <Text size="sm" lineClamp={2}>
                        {post.caption}
                    </Text>

                    <Group position="apart" mt="xs">
                        <Group spacing="lg">
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
                        <Group spacing="xs">
                            <IconBookmark size={18} />
                            <Text size="sm">{formatNumber(post.stats.saves)}</Text>
                        </Group>
                    </Group>
                </Stack>
            </Card>
        );
    };

    return (
        <SocialManagementBase platform="instagram">
            <Group position="center" mb="lg">
                <SegmentedControl
                    data={[
                        { label: 'Feed', value: 'feed' },
                        { label: 'Reels', value: 'reel' }
                    ]}
                    value={view}
                    onChange={(value) => setView(value as 'feed' | 'reel')}
                />
            </Group>

            <SimpleGrid cols={2} spacing="lg">
                {mockPosts
                    .filter((post) => post.type === view)
                    .map((post) => (
                        <InstagramPost key={post.id} post={post} />
                    ))}
            </SimpleGrid>
        </SocialManagementBase>
    );
};

export default Instagram;
