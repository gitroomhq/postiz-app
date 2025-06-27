'use client';
import React, { useEffect, useState } from 'react';
import { Container, Title, SimpleGrid, Paper, Text, Group, Button, Card, Avatar, Box } from '@mantine/core';
import { IconPlus, IconCalendarEvent } from '@tabler/icons-react';
import { PlanDialog } from './components/PlanDialog';
import { Calendar } from '@mantine/dates';
import dayjs from 'dayjs';

const CreateContent = () => {
    const [dialogOpened, setDialogOpened] = useState(true);
    const [currentDate] = useState(new Date());

    const emptySlots = Array(8).fill(null); // 8 slots for content creation

    const renderCalendarHeader = () => {
        const month = currentDate.toLocaleString('vi-VN', { month: 'long' });
        const year = currentDate.getFullYear();
        return `${month} ${year}`;
    };

    // Dữ liệu mẫu cho trending
    const trendingList = [
        {
            id: 1,
            name: 'Tuyết Vân HQ',
            avatar: '/mock-avatar-1.jpg',
            desc: 'Bí quyết tăng tương tác và bán hàng triệu view',
            likes: 124,
            comments: 12
        },
        {
            id: 2,
            name: 'ThanhBIZ Entertainment',
            avatar: '/mock-avatar-2.jpg',
            desc: 'Âm nhạc, giải trí, viral',
            likes: 98,
            comments: 8
        },
        {
            id: 3,
            name: 'Kênh Không Ngủ',
            avatar: '/mock-avatar-3.jpg',
            desc: 'Chủ đề hot, giải trí, review',
            likes: 76,
            comments: 5
        },
        {
            id: 4,
            name: 'MCU Confessions',
            avatar: '/mock-avatar-4.jpg',
            desc: 'Tin tức phim ảnh, bình luận',
            likes: 65,
            comments: 3
        },
        {
            id: 5,
            name: 'Hội những người thích chơi tiktok 24h',
            avatar: '/mock-avatar-5.jpg',
            desc: 'Cộng đồng chia sẻ video viral',
            likes: 54,
            comments: 2
        },
    ];

    return (
        <>
            <PlanDialog opened={dialogOpened} onClose={() => setDialogOpened(false)} />

            <Container size="xl" p="md" style={{ maxWidth: 1600 }}>
                <Group align="flex-start" noWrap>
                    <Box style={{ flex: 1, minWidth: 0 }}>
                        <Group position="apart" mb="xl">
                            <Title order={3}>LỊCH ĐĂNG BÀI HÔM NAY</Title>
                            <Button variant="subtle" color="blue">Xem lịch đăng gần đây</Button>
                        </Group>
                        <SimpleGrid cols={4} spacing="lg" mb="xl">
                            {emptySlots.map((_, index) => (
                                <Paper
                                    key={index}
                                    shadow="sm"
                                    p="lg"
                                    style={{
                                        height: 200,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <IconPlus size={24} style={{ opacity: 0.5 }} />
                                </Paper>
                            ))}
                        </SimpleGrid>
                        <Group position="apart" mb="md">
                            <Title order={3}>ĐANG THEO DÕI ĐẶC BIỆT</Title>
                            <Button variant="subtle" color="blue">Xem tất cả</Button>
                        </Group>
                        <SimpleGrid cols={4} spacing="lg" mb="xl">
                            {emptySlots.slice(0, 4).map((_, index) => (
                                <Paper
                                    key={index}
                                    shadow="sm"
                                    p="lg"
                                    style={{
                                        height: 200,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <IconPlus size={24} style={{ opacity: 0.5 }} />
                                </Paper>
                            ))}
                        </SimpleGrid>
                        {/* Video sections */}
                        {['VIDEO TIKTOK', 'VIDEO DOUYIN', 'BÀI VIẾT INSTAGRAM'].map((title, sectionIndex) => (
                            <React.Fragment key={title}>
                                <Group position="apart" mb="md">
                                    <Title order={3}>{title} ĐANG THỊNH HÀNH</Title>
                                    <Button variant="subtle" color="blue">Xem tất cả</Button>
                                </Group>
                                <SimpleGrid cols={4} spacing="md" mb="xl">
                                    {Array(4).fill(null).map((_, index) => (
                                        <Card
                                            key={index}
                                            shadow="sm"
                                            p="md"
                                            radius="md"
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <Card.Section>
                                                <div
                                                    style={{
                                                        height: sectionIndex === 2 ? 320 : 240,
                                                        backgroundColor: '#f0f0f0',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        position: 'relative'
                                                    }}
                                                >
                                                    <Text align="center" color="dimmed">NO IMAGE</Text>
                                                    {(sectionIndex === 0 || sectionIndex === 1) && (
                                                        <div
                                                            style={{
                                                                position: 'absolute',
                                                                bottom: 10,
                                                                right: 10,
                                                                backgroundColor: 'rgba(0,0,0,0.6)',
                                                                color: 'white',
                                                                padding: '2px 6px',
                                                                borderRadius: 4,
                                                                fontSize: 12
                                                            }}
                                                        >
                                                            00:30
                                                        </div>
                                                    )}
                                                </div>
                                            </Card.Section>
                                            <Group mt="md" mb="xs">
                                                <Avatar size="sm" radius="xl" />
                                                <Text size="sm" weight={500}>User name</Text>
                                            </Group>
                                            <Group position="apart">
                                                <Text size="xs" color="dimmed">100K views</Text>
                                                <Text size="xs" color="dimmed">2 days ago</Text>
                                            </Group>
                                        </Card>
                                    ))}
                                </SimpleGrid>
                            </React.Fragment>
                        ))}
                    </Box>
                    {/* Sidebar phải: Sự kiện tháng này (lịch) và Đang thịnh hành */}
                    <Box style={{ width: 370, minWidth: 320, marginLeft: 6 }}>
                        <Paper shadow="sm" p="md" radius={12} mb="lg" style={{ background: '#fff', border: '1.5px solid #E3EAFD' }}>
                            <Title order={4} mb={16} style={{ fontWeight: 700, color: '#1846A3' }}>SỰ KIỆN THÁNG NÀY</Title>
                            <Calendar
                                locale="vi"
                                value={new Date()}
                                fullWidth
                                size="md"
                                styles={{
                                    calendarHeader: { marginBottom: 8 },
                                    cell: { fontWeight: 600, fontSize: 16 },
                                    weekday: { color: '#1846A3', fontWeight: 700 },
                                    day: { borderRadius: 8 },
                                }}
                            />
                        </Paper>
                        <Paper shadow="sm" p="md" radius={12} mb="lg" style={{ background: '#fff', border: '1.5px solid #E3EAFD' }}>
                            <Group position="apart" mb={16}>
                                <Title order={4} style={{ fontWeight: 700, color: '#1846A3' }}>ĐANG THỊNH HÀNH</Title>
                                <Button variant="subtle" color="blue" size="sm">Xem tất cả</Button>
                            </Group>
                            <Box style={{ maxHeight: 800, overflowY: 'auto', background: '#F8FAFF', borderRadius: 8, border: '1.5px solid #E3EAFD', padding: 0 }}>
                                {trendingList.map((item, idx) => (
                                    <Group key={item.id} align="flex-start" spacing={12} style={{ padding: 12, borderBottom: idx !== trendingList.length - 1 ? '1px solid #E3EAFD' : 'none' }}>
                                        <Avatar src={item.avatar} radius={8} size={44} style={{ marginTop: 2 }} />
                                        <Box style={{ flex: 1 }}>
                                            <Text weight={600} size={15} style={{ color: '#1846A3', marginBottom: 2 }}>{item.name}</Text>
                                            <Text size={13} color="dimmed" style={{ marginBottom: 2 }}>{item.desc}</Text>
                                            <Group spacing={8}>
                                                <Text size={12} color="blue" style={{ fontWeight: 600 }}>❤ {item.likes}</Text>
                                                <Text size={12} color="gray">💬 {item.comments}</Text>
                                            </Group>
                                        </Box>
                                    </Group>
                                ))}
                            </Box>
                        </Paper>
                    </Box>
                </Group>
            </Container>
        </>
    );
};

export default CreateContent;
