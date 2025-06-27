'use client';
import React, { ReactNode } from 'react';
import { AppShell, Header, Grid, TextInput, Group, Card, Text, Button, Avatar, Menu, Image } from '@mantine/core';

// Logo component
const Logo = () => (
    <Group>
        <Image src="/postiz.svg" alt="King Content" height={40} />
        <Text size="xl" weight={700}>KING CONTENT</Text>
    </Group>
);

// Header Component
const HeaderComponent = () => (
    <Header height={60} p="xs">
        <Group position="apart" style={{ height: '100%' }}>
            <Logo />
            <Group>
                <TextInput
                    placeholder="Tìm kiếm chủ đề..."
                    style={{ width: 400 }}
                    rightSection={
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" />
                            <path d="M21 21l-4.35-4.35" />
                        </svg>
                    }
                />
                <Button color="red">Tạo content</Button>
                <Menu>
                    <Menu.Target>
                        <Avatar radius="xl" />
                    </Menu.Target>
                </Menu>
            </Group>
        </Group>
    </Header>
);

interface StatsCardProps {
    icon: ReactNode;
    value: string;
    label: string;
    color?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ icon, value, label, color = "black" }) => (
    <Card shadow="sm" p="md" radius="md" withBorder style={{ height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px' }}>
                {icon}
            </div>
            <div>
                <Text size="xl" weight={700} style={{ color: color, fontSize: '24px' }}>
                    {value}
                </Text>
                <Text size="sm" color="dimmed">
                    {label}
                </Text>
            </div>
        </div>
    </Card>
);

const EmptyState = () => (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <Text size="md" color="dimmed">Bạn chưa thích bài viết nào</Text>
        <Text size="sm" color="red" mt={8}>Không tìm thấy kết quả</Text>
    </div>
);

const StatsSection = () => (
    <Grid gutter="xs">
        <Grid.Col span={6}>
            <Card shadow="sm" p="sm" radius="md" withBorder>
                <Text size="md" weight={500}>1,234</Text>
                <Text size="sm" color="dimmed">Content đã thích</Text>
            </Card>
        </Grid.Col>
        <Grid.Col span={6}>
            <Card shadow="sm" p="sm" radius="md" withBorder>
                <Text size="md" weight={500}>567</Text>
                <Text size="sm" color="dimmed">Hashtag</Text>
            </Card>
        </Grid.Col>
    </Grid>
);

const HashtagSection = () => (
    <Card shadow="sm" p="sm" radius="md" withBorder mt="xs">
        <Text weight={500} mb="xs">Hashtag</Text>
        <TextInput
            placeholder="Nhập nội dung tìm kiếm"
            rightSection={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                </svg>
            }
        />
    </Card>
);

const FanpageSection = () => (
    <Card shadow="sm" p="sm" radius="md" withBorder mt="xs">
        <Text weight={500} mb="xs">Fanpage chứa content đã thích</Text>
        <Grid>
            {[1, 2, 3].map((item) => (
                <Grid.Col span={12} key={item}>
                    <Card withBorder p="xs" radius="md">
                        <Group position="apart">
                            <Group>
                                <Avatar size="md" radius="xl" />
                                <div>
                                    <Text size="sm" weight={500}>Fanpage Name</Text>
                                    <Text size="xs" color="dimmed">123K followers</Text>
                                </div>
                            </Group>
                            <Text size="sm" color="dimmed">12 contents</Text>
                        </Group>
                    </Card>
                </Grid.Col>
            ))}
        </Grid>
    </Card>
);

const LikedContent: React.FC = () => {
    const stats = [
        {
            icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            ),
            value: "9,621,523",
            label: "Mẫu quảng cáo",
            color: "#FF9500"
        },
        {
            icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 2h-3a5 5 0 0 0-5 5v3H6v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
            ),
            value: "368,006",
            label: "Fanpages",
            color: "#0066FF"
        },
        {
            icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                </svg>
            ),
            value: "60,883",
            label: "Nhà sáng tạo",
            color: "#FF9500"
        },
        {
            icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
            ),
            value: "55,046",
            label: "Lịch đã đăng",
            color: "#528BFF"
        }
    ];

    return (
        <div style={{ padding: '12px' }}>
            <Grid mb="sm" gutter="xs">
                {stats.map((stat, index) => (
                    <Grid.Col span={3} key={index}>
                        <StatsCard {...stat} />
                    </Grid.Col>
                ))}
            </Grid>

            <Grid gutter="xs">
                <Grid.Col span={9}>
                    <Card shadow="sm" p="sm" radius="md" withBorder>
                        <div style={{ marginBottom: '8px' }}>
                            <TextInput
                                placeholder="Nhập nội dung tìm kiếm"
                                style={{ maxWidth: '300px' }}
                                rightSection={
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="11" cy="11" r="8" />
                                        <path d="M21 21l-4.35-4.35" />
                                    </svg>
                                }
                            />
                        </div>
                        <Text size="md" mb="xs">Content đã thích</Text>
                        <EmptyState />
                    </Card>
                </Grid.Col>

                <Grid.Col span={3}>
                    <StatsSection />
                    <HashtagSection />
                    <FanpageSection />
                </Grid.Col>
            </Grid>
        </div>
    );
};

export default LikedContent;
