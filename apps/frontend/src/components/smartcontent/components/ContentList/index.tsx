'use client';
import React from 'react';
import { Card, Grid, Group, Text, TextInput, Select, Button, Badge } from '@mantine/core';
import { useRouter } from 'next/navigation';

const StatCard = ({ title, value, subtitle, color }: { title: string, value: string, subtitle: string, color: string }) => (
    <Card shadow="sm" p="lg" radius="md" withBorder>
        <Text size="lg" c="dimmed" mb={5}>{title}</Text>
        <Text size="xl" weight={700} style={{ color, fontSize: '2rem' }}>{value}</Text>
        <Text size="sm" c="dimmed" mt={5}>{subtitle}</Text>
    </Card>
);

const ContentList = () => {
    const router = useRouter();
    const stats = [
        {
            title: 'MẪU CONTENTS',
            value: '0',
            subtitle: 'Cập nhật 2h qua: +1,578',
            color: '#ff4444'
        },
        {
            title: 'FANPAGES',
            value: '0',
            subtitle: 'Cập nhật 2h qua: +171',
            color: '#4444ff'
        },
        {
            title: 'ĐỀ XUẤT HÔM NAY',
            value: '28.411',
            subtitle: 'Cập nhật 2h qua: +573',
            color: '#ffaa00'
        },
        {
            title: 'NGÂN HÀNG TRENDING',
            value: '71.118',
            subtitle: 'Cập nhật 2h qua: +767',
            color: '#00cc88'
        }
    ];

    return (
        <div className="p-6">
            <Grid gutter="md" mb="xl">
                {stats.map((stat, index) => (
                    <Grid.Col span={3} key={index}>
                        <StatCard {...stat} />
                    </Grid.Col>
                ))}
            </Grid>

            <Card shadow="sm" p="md" radius="md" withBorder mb="lg">
                <Group position="apart" mb="md">
                    <Group>
                        <TextInput
                            placeholder="Tìm kiếm nhanh danh mục..."
                            icon={
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="11" cy="11" r="8" />
                                    <path d="M21 21l-4.35-4.35" />
                                </svg>
                            }
                            style={{ width: '300px' }}
                        />
                        <Select
                            placeholder="Tất cả"
                            data={['Tất cả', 'Điện thoại', 'Máy tính bảng', 'Phụ kiện']}
                            style={{ width: '150px', height: '40px' }}
                            withinPortal
                        />
                    </Group>
                    <Button color="red" onClick={() => router.push('/smartcontent/create-content')}>Tạo content</Button>
                </Group>
            </Card>

            <Grid>
                {[1, 2, 3].map((item) => (
                    <Grid.Col span={4} key={item}>
                        <Card shadow="sm" p={0} radius="md" withBorder>
                            <div style={{ position: 'relative' }}>
                                <img
                                    src="/no-picture.jpg"
                                    alt="Content preview"
                                    style={{ width: '100%', height: '200px', objectFit: 'cover' }}
                                />
                                <Badge
                                    style={{
                                        position: 'absolute',
                                        bottom: 10,
                                        left: 10
                                    }}
                                    color="orange"
                                >
                                    Danh mục điện thoại
                                </Badge>
                            </div>
                            <div className="p-4">
                                <Text weight={500} size="lg" mb={5}>Điện thoại</Text>
                                <Text size="sm" color="dimmed" mb={5}>📱 Từ khoá: điện thoại, smart phone, điện thoại thông minh...</Text>
                                <Group position="apart" mt="md">
                                    <Text size="sm" color="dimmed">22 phút trước</Text>
                                    <Button variant="light" color="blue" size="xs">
                                        Xem chi tiết
                                    </Button>
                                </Group>
                            </div>
                        </Card>
                    </Grid.Col>
                ))}
            </Grid>
        </div>
    );
};

export default ContentList;
