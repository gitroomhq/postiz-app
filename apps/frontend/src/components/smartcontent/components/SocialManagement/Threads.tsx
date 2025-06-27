'use client';
import React from 'react';
import { Card, Image, Text, Group, Stack, Checkbox, Avatar } from '@mantine/core';
import { IconHeart, IconMessageCircle2, IconShare, IconRepeat } from '@tabler/icons-react';
import SocialManagementBase from './SocialManagementBase';
import { useSocialManagement } from './context';

interface ThreadsPost {
    id: string;
    content: string;
    image?: string;
    author: {
        name: string;
        username: string;
        avatar: string;
    };
    stats: {
        likes: number;
        replies: number;
        reposts: number;
    };
    timestamp: string;
    selected?: boolean;
}

const mockPosts: ThreadsPost[] = [
    {
        id: '1',
        content: 'Just launched our new product! 🚀 Super excited to share this with everyone. Let me know what you think!',
        image: '/mock-threads-1.jpg',
        author: {
            name: 'Sarah Johnson',
            username: '@sarahjohnson',
            avatar: '/mock-avatar-1.jpg'
        },
        stats: {
            likes: 1542,
            replies: 89,
            reposts: 234
        },
        timestamp: '2h'
    },
    {
        id: '2',
        content: 'A thread on building successful habits 🧵\n\n1. Start small\n2. Be consistent\n3. Track progress\n4. Stay accountable\n\nWhat habits are you building?',
        author: {
            name: 'Growth Mindset',
            username: '@growthmindset',
            avatar: '/mock-avatar-2.jpg'
        },
        stats: {
            likes: 3254,
            replies: 156,
            reposts: 789
        },
        timestamp: '4h'
    },
    {
        id: '1',
        content: 'Just launched our new product! 🚀 Super excited to share this with everyone. Let me know what you think!',
        image: '/mock-threads-1.jpg',
        author: {
            name: 'Sarah Johnson',
            username: '@sarahjohnson',
            avatar: '/mock-avatar-1.jpg'
        },
        stats: {
            likes: 1542,
            replies: 89,
            reposts: 234
        },
        timestamp: '2h'
    },
    {
        id: '2',
        content: 'A thread on building successful habits 🧵\n\n1. Start small\n2. Be consistent\n3. Track progress\n4. Stay accountable\n\nWhat habits are you building?',
        author: {
            name: 'Growth Mindset',
            username: '@growthmindset',
            avatar: '/mock-avatar-2.jpg'
        },
        stats: {
            likes: 3254,
            replies: 156,
            reposts: 789
        },
        timestamp: '4h'
    },
    {
        id: '1',
        content: 'Just launched our new product! 🚀 Super excited to share this with everyone. Let me know what you think!',
        image: '/mock-threads-1.jpg',
        author: {
            name: 'Sarah Johnson',
            username: '@sarahjohnson',
            avatar: '/mock-avatar-1.jpg'
        },
        stats: {
            likes: 1542,
            replies: 89,
            reposts: 234
        },
        timestamp: '2h'
    },
    {
        id: '2',
        content: 'A thread on building successful habits 🧵\n\n1. Start small\n2. Be consistent\n3. Track progress\n4. Stay accountable\n\nWhat habits are you building?',
        author: {
            name: 'Growth Mindset',
            username: '@growthmindset',
            avatar: '/mock-avatar-2.jpg'
        },
        stats: {
            likes: 3254,
            replies: 156,
            reposts: 789
        },
        timestamp: '4h'
    },
    {
        id: '1',
        content: 'Just launched our new product! 🚀 Super excited to share this with everyone. Let me know what you think!',
        image: '/mock-threads-1.jpg',
        author: {
            name: 'Sarah Johnson',
            username: '@sarahjohnson',
            avatar: '/mock-avatar-1.jpg'
        },
        stats: {
            likes: 1542,
            replies: 89,
            reposts: 234
        },
        timestamp: '2h'
    },
    {
        id: '2',
        content: 'A thread on building successful habits 🧵\n\n1. Start small\n2. Be consistent\n3. Track progress\n4. Stay accountable\n\nWhat habits are you building?',
        author: {
            name: 'Growth Mindset',
            username: '@growthmindset',
            avatar: '/mock-avatar-2.jpg'
        },
        stats: {
            likes: 3254,
            replies: 156,
            reposts: 789
        },
        timestamp: '4h'
    },
    {
        id: '1',
        content: 'Just launched our new product! 🚀 Super excited to share this with everyone. Let me know what you think!',
        image: '/mock-threads-1.jpg',
        author: {
            name: 'Sarah Johnson',
            username: '@sarahjohnson',
            avatar: '/mock-avatar-1.jpg'
        },
        stats: {
            likes: 1542,
            replies: 89,
            reposts: 234
        },
        timestamp: '2h'
    },
    {
        id: '2',
        content: 'A thread on building successful habits 🧵\n\n1. Start small\n2. Be consistent\n3. Track progress\n4. Stay accountable\n\nWhat habits are you building?',
        author: {
            name: 'Growth Mindset',
            username: '@growthmindset',
            avatar: '/mock-avatar-2.jpg'
        },
        stats: {
            likes: 3254,
            replies: 156,
            reposts: 789
        },
        timestamp: '4h'
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

const ThreadsPost = ({ post }: { post: ThreadsPost }) => {
    const { selectedPosts, togglePostSelection } = useSocialManagement();
    const isSelected = selectedPosts.has(post.id);

    return (
        <Card shadow="sm" p="lg" radius="md" withBorder>
            <Group position="apart" mb="xs">
                <Group>
                    <Avatar
                        src={post.author.avatar}
                        radius="xl"
                        size="md"
                        alt={post.author.name}
                    />
                    <Stack spacing={2}>
                        <Group spacing="xs" align="center">
                            <Text size="sm" weight={500}>
                                {post.author.name}
                            </Text>
                            <Text size="xs" color="dimmed">
                                {post.author.username}
                            </Text>
                        </Group>
                        <Text size="xs" color="dimmed">
                            {post.timestamp}
                        </Text>
                    </Stack>
                </Group>
                <Checkbox
                    checked={isSelected}
                    onChange={() => togglePostSelection(post.id)}
                />
            </Group>

            <Text size="sm" mb="md">
                {post.content}
            </Text>

            {post.image && (
                <Card.Section mb="md">
                    <Image
                        src={post.image}
                        height={200}
                        alt="Post image"
                        style={{ objectFit: 'cover' }}
                    />
                </Card.Section>
            )}

            <Group spacing="xl">
                <Group spacing="xs">
                    <IconHeart size={18} stroke={1.5} />
                    <Text size="sm">{formatNumber(post.stats.likes)}</Text>
                </Group>
                <Group spacing="xs">
                    <IconMessageCircle2 size={18} stroke={1.5} />
                    <Text size="sm">{formatNumber(post.stats.replies)}</Text>
                </Group>
                <Group spacing="xs">
                    <IconRepeat size={18} stroke={1.5} />
                    <Text size="sm">{formatNumber(post.stats.reposts)}</Text>
                </Group>
                <Group spacing="xs">
                    <IconShare size={18} stroke={1.5} />
                </Group>
            </Group>
        </Card>
    );
};

const Threads = () => {
    return (
        <SocialManagementBase platform="threads">
            <Stack spacing="md">
                {mockPosts.map((post) => (
                    <ThreadsPost key={post.id} post={post} />
                ))}
            </Stack>
        </SocialManagementBase>
    );
};

export default Threads;
