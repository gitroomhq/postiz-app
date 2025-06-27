'use client';
import React from 'react';
import { Grid, TextInput, Group, Card, Text, Button, Avatar, Badge } from '@mantine/core';

interface StatsCardProps {
    title: string;
    value: string;
    subtitle: string;
    color?: string;
}

interface AdCardProps {
    name: string;
    status: 'Active' | 'Paused';
    budget: string;
    spent: string;
    reach: string;
    engagement: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, subtitle, color = "blue" }) => (
    <Card shadow="sm" p="sm" radius="md" withBorder>
        <Text size="sm" color="dimmed" mb={2}>{title}</Text>
        <Text size="xl" weight={700} style={{ color }}>{value}</Text>
        <Text size="xs" color="dimmed" mt={2}>{subtitle}</Text>
    </Card>
);

const AdCard: React.FC<AdCardProps> = ({ name, status, budget, spent, reach, engagement }) => (
    <Card shadow="sm" p="sm" radius="md" withBorder mb="xs">
        <Group position="apart" mb="xs">
            <Group>
                <Avatar size="md" radius="xl" />
                <div>
                    <Text size="sm" weight={500}>{name}</Text>
                    <Text size="xs" color="dimmed">Budget: ${budget} • Spent: ${spent}</Text>
                </div>
            </Group>
            <Badge color={status === 'Active' ? 'green' : 'gray'}>{status}</Badge>
        </Group>
        <Grid>
            <Grid.Col span={6}>
                <Text size="xs" color="dimmed">Reach</Text>
                <Text size="sm" weight={500}>{reach}</Text>
            </Grid.Col>
            <Grid.Col span={6}>
                <Text size="xs" color="dimmed">Engagement</Text>
                <Text size="sm" weight={500}>{engagement}</Text>
            </Grid.Col>
        </Grid>
    </Card>
);

const FilterSection = () => (
    <Group position="apart" mb="sm">
        <TextInput
            placeholder="Tìm kiếm chiến dịch..."
            style={{ width: '300px' }}
            rightSection={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                </svg>
            }
        />
        <Button color="blue">Tạo chiến dịch mới</Button>
    </Group>
);

const RunningAds: React.FC = () => {
    const stats = [
        { title: "Chiến dịch đang chạy", value: "24", subtitle: "Tăng 12% so với tuần trước", color: "#228BE6" },
        { title: "Tổng chi phí", value: "$12,458", subtitle: "Trung bình $519/chiến dịch", color: "#40C057" },
        { title: "Tổng lượt tiếp cận", value: "1.2M", subtitle: "86% organic reach", color: "#FA5252" },
        { title: "Tỷ lệ tương tác", value: "3.2%", subtitle: "Tăng 0.8% so với tuần trước", color: "#FCC419" }
    ];

    const runningAds: AdCardProps[] = [
        { name: "Summer Sale 2025", status: "Active", budget: "1,000", spent: "458", reach: "45.2K", engagement: "2.3K" },
        { name: "New Product Launch", status: "Active", budget: "2,000", spent: "1,245", reach: "98.7K", engagement: "5.1K" },
        { name: "Brand Awareness", status: "Paused", budget: "1,500", spent: "876", reach: "67.4K", engagement: "3.2K" }
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
                        <FilterSection />
                        <Text weight={500} mb="sm">Chiến dịch quảng cáo</Text>
                        {runningAds.map((ad, index) => (
                            <AdCard key={index} {...ad} />
                        ))}
                    </Card>
                </Grid.Col>

                <Grid.Col span={3}>
                    <Card shadow="sm" p="sm" radius="md" withBorder>
                        <Text weight={500} mb="xs">Performance Overview</Text>
                        <Grid>
                            <Grid.Col span={6}>
                                <Text size="xs" color="dimmed">CTR</Text>
                                <Text size="sm" weight={500}>2.4%</Text>
                            </Grid.Col>
                            <Grid.Col span={6}>
                                <Text size="xs" color="dimmed">CPC</Text>
                                <Text size="sm" weight={500}>$0.42</Text>
                            </Grid.Col>
                            <Grid.Col span={6}>
                                <Text size="xs" color="dimmed">CPM</Text>
                                <Text size="sm" weight={500}>$5.67</Text>
                            </Grid.Col>
                            <Grid.Col span={6}>
                                <Text size="xs" color="dimmed">ROAS</Text>
                                <Text size="sm" weight={500}>2.8x</Text>
                            </Grid.Col>
                        </Grid>
                    </Card>

                    <Card shadow="sm" p="sm" radius="md" withBorder mt="xs">
                        <Text weight={500} mb="xs">Campaign Stats</Text>
                        <Grid>
                            <Grid.Col span={12}>
                                <Text size="xs" color="dimmed">Best Performing</Text>
                                <Text size="sm" weight={500}>Summer Sale 2025</Text>
                                <Text size="xs" color="dimmed">ROI: 3.2x</Text>
                            </Grid.Col>
                            <Grid.Col span={12} mt="xs">
                                <Text size="xs" color="dimmed">Needs Attention</Text>
                                <Text size="sm" weight={500}>Brand Awareness</Text>
                                <Text size="xs" color="dimmed">CTR: 0.8%</Text>
                            </Grid.Col>
                        </Grid>
                    </Card>
                </Grid.Col>
            </Grid>
        </div>
    );
};

export default RunningAds;
