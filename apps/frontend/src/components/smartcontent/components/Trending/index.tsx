'use client';
import React, { useState } from 'react';
import { Grid, Card, Text, Group, Avatar, Image, Stack, Box, TextInput, Pagination, ActionIcon } from '@mantine/core';

interface PostData {
    id: string;
    platform: 'facebook';
    author: {
        name: string;
        avatar: string;
        date: string;
    };
    content: {
        text: string;
        image?: string;
    };
    stats: {
        likes: string;
        comments: string;
        shares: string;
    };
}

const PostCard = ({ post }: { post: PostData }) => (
    <Card shadow="sm" p="sm" radius="md" withBorder h="100%">
        <Group position="apart" mb="xs" align="flex-start">
            <Group align="flex-start" noWrap spacing="sm">
                <Avatar src={post.author.avatar} size="md" radius="xl" />
                <Box>
                    <Group spacing={4}>
                        <Text size="sm" weight={500} lineClamp={1}>{post.author.name}</Text>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#1877F2">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                        </svg>
                    </Group>
                    <Text size="xs" color="dimmed">{post.author.date}</Text>
                    <Text size="sm" mt={4} lineClamp={3}>
                        {post.content.text}
                    </Text>
                </Box>
            </Group>
            <Group spacing={4}>
                <Text size="xs" color="dimmed">{post.stats.likes}</Text>
                <Text size="xs" color="dimmed">•</Text>
                <Text size="xs" color="dimmed">{post.stats.comments}</Text>
                <Text size="xs" color="dimmed">•</Text>
                <Text size="xs" color="dimmed">{post.stats.shares}</Text>
            </Group>
        </Group>
        {post.content.image && (
            <Box mt="xs">
                <Image
                    src={post.content.image}
                    radius="md"
                    height={160}
                    fit="cover"
                />
            </Box>
        )}
    </Card>
);

const SearchBar = () => (
    <Group position="apart" mb="md">
        <TextInput
            placeholder="Nhập nội dung tìm kiếm"
            style={{ width: '300px' }}
            rightSection={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                </svg>
            }
        />
        <Group>
            <ActionIcon variant="subtle">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 3h18v18H3zM8 12h8" />
                </svg>
            </ActionIcon>
            <ActionIcon variant="subtle">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                </svg>
            </ActionIcon>
        </Group>
    </Group>
);

const Trending = () => {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12;

    const trendingPosts: PostData[] = [
        {
            id: '1',
            platform: 'facebook',
            author: {
                name: 'Thanh247 Entertain...',
                avatar: '/no-picture.jpg',
                date: '19/06/2025'
            },
            content: {
                text: 'Sáp Công: "Không chạy đi vớ vẩn lâu lâu về nhà thì 1 là hụt trend, 2 là mệt đòi đổ bệnh cho xã hội"',
                image: '/images/posts/post1.jpg'
            },
            stats: {
                likes: "2.7k",
                comments: "10",
                shares: "2"
            }
        },
        {
            id: '2',
            platform: 'facebook',
            author: {
                name: 'Ahh Kê...',
                avatar: '/no-picture.jpg',
                date: '19/06/2025'
            },
            content: {
                text: 'Tớ sống với mẹ Pháp. Từ bé bạn vẫn gọi San Lê mới khiến bạn ấy lớn lên bạn ấy luôn nhớ kỷ niệm đấy.',
                image: '/images/posts/post2.jpg'
            },
            stats: {
                likes: "877",
                comments: "38",
                shares: "5"
            }
        },
        {
            id: '3',
            platform: 'facebook',
            author: {
                name: 'Kêm Kháng Ngọ',
                avatar: '/no-picture.jpg',
                date: '19/06/2025'
            },
            content: {
                text: 'Thủ tướng Hàn: Liều đền ơn đất nước tốt nhất là làm tròn bổn phận, dù nhỏ nhoi đến đâu cũng phải thực thi thật tốt.',
                image: '/images/korea-pm.jpg'
            },
            stats: {
                likes: "4.4k",
                comments: "45",
                shares: "90"
            }
        },
        {
            id: '4',
            platform: 'facebook',
            author: {
                name: 'VTV24',
                avatar: '/no-picture.jpg',
                date: '19/06/2025'
            },
            content: {
                text: 'Thời tiết Hà Nội hôm nay: Nhiệt độ cao nhất 36-38 độ C, chiều tối có mưa rào và dông vài nơi',
                image: '/images/posts/weather.jpg'
            },
            stats: {
                likes: "1.2k",
                comments: "234",
                shares: "45"
            }
        },
        {
            id: '5',
            platform: 'facebook',
            author: {
                name: 'Đời Live',
                avatar: '/no-picture.jpg',
                date: '19/06/2025'
            },
            content: {
                text: 'Quá thương và quý lý do hotgirl này hàng đêm, đánh thức Nam Em dậy: "Thật tội em quá. Phải uống thuốc đúng giờ"',
                image: '/images/posts/entertainment.jpg'
            },
            stats: {
                likes: "2.1k",
                comments: "98",
                shares: "12"
            }
        },
        {
            id: '6',
            platform: 'facebook',
            author: {
                name: 'Phóng sự Việt',
                avatar: '/no-picture.jpg',
                date: '19/06/2025'
            },
            content: {
                text: 'Ngày An toàn và 5 điều cần lưu ý cho sinh viên làm thêm trong mùa hè này',
                image: '/images/posts/safety.jpg'
            },
            stats: {
                likes: "3.1k",
                comments: "43",
                shares: "15"
            }
        },
        {
            id: '7',
            platform: 'facebook',
            author: {
                name: 'Kiến thức ngọ',
                avatar: '/no-picture.jpg',
                date: '19/06/2025'
            },
            content: {
                text: 'Sai lầm khi không lắp điều hòa phòng của trẻ sơ sinh và những lưu ý khi lắp',
                image: '/images/posts/health.jpg'
            },
            stats: {
                likes: "1.5k",
                comments: "23",
                shares: "89"
            }
        },
        {
            id: '8',
            platform: 'facebook',
            author: {
                name: 'IPaid',
                avatar: '/no-picture.jpg',
                date: '19/06/2025'
            },
            content: {
                text: 'iPhone 15 giảm giá kỷ lục ngay trung tâm bảo hành Apple tại Việt Nam',
                image: '/images/posts/iphone.jpg'
            },
            stats: {
                likes: "1.4k",
                comments: "56",
                shares: "7"
            }
        },
        {
            id: '9',
            platform: 'facebook',
            author: {
                name: 'Thanh247 Entertain...',
                avatar: '/no-picture.jpg',
                date: '19/06/2025'
            },
            content: {
                text: 'Người dân thủ đô thích nghi với nắng nóng: "Không muốn ra đường nhưng phải kiếm cơm"',
                image: '/images/posts/hanoi.jpg'
            },
            stats: {
                likes: "2.3k",
                comments: "45",
                shares: "26"
            }
        },
        {
            id: '10',
            platform: 'facebook',
            author: {
                name: 'Next TV',
                avatar: '/no-picture.jpg',
                date: '19/06/2025'
            },
            content: {
                text: 'Hơn 1.5 triệu lao động đã được hỗ trợ đào tạo nghề trong 6 tháng đầu năm',
                image: '/images/posts/labor.jpg'
            },
            stats: {
                likes: "3.3k",
                comments: "45",
                shares: "3"
            }
        },
        {
            id: '11',
            platform: 'facebook',
            author: {
                name: 'Kiến thức ngọ',
                avatar: '/no-picture.jpg',
                date: '19/06/2025'
            },
            content: {
                text: 'Tại sao lần khủng hoảng này của V.N có thể khác với những lần trước?',
                image: '/images/posts/economy.jpg'
            },
            stats: {
                likes: "1.2k",
                comments: "23",
                shares: "0"
            }
        },
        {
            id: '12',
            platform: 'facebook',
            author: {
                name: 'IFeels',
                avatar: '/no-picture.jpg',
                date: '19/06/2025'
            },
            content: {
                text: 'Lần đầu tiên tại Cần Thơ mang phố ẩm thực lên trên tàu ngắm hoàng hôn',
                image: '/images/posts/cantho.jpg'
            },
            stats: {
                likes: "1.6k",
                comments: "24",
                shares: "10"
            }
        },
        {
            id: '13',
            platform: 'facebook',
            author: {
                name: 'FnB Story',
                avatar: '/no-picture.jpg',
                date: '19/06/2025'
            },
            content: {
                text: 'Khám phá 5 quán cà phê view đẹp nhất Đà Lạt: Ngắm hoàng hôn và săn mây cực chill',
                image: '/images/posts/dalat-cafe.jpg'
            },
            stats: {
                likes: "2.8k",
                comments: "156",
                shares: "78"
            }
        },
        {
            id: '14',
            platform: 'facebook',
            author: {
                name: 'Tech News 24/7',
                avatar: '/no-picture.jpg',
                date: '19/06/2025'
            },
            content: {
                text: 'Cuối năm 2025: Các nhà sản xuất chip lớn đổ xô vào Việt Nam, cơ hội việc làm cho ngành bán dẫn tăng cao',
                image: '/images/posts/chip-factory.jpg'
            },
            stats: {
                likes: "5.2k",
                comments: "234",
                shares: "445"
            }
        },
        {
            id: '15',
            platform: 'facebook',
            author: {
                name: 'Sống Xanh',
                avatar: '/no-picture.jpg',
                date: '19/06/2025'
            },
            content: {
                text: '10 mẹo tiết kiệm điện mùa nắng nóng: Giảm một nửa tiền điện chỉ với vài thói quen đơn giản',
                image: '/images/posts/save-energy.jpg'
            },
            stats: {
                likes: "3.4k",
                comments: "421",
                shares: "892"
            }
        },
        {
            id: '16',
            platform: 'facebook',
            author: {
                name: 'House Design',
                avatar: '/no-picture.jpg',
                date: '19/06/2025'
            },
            content: {
                text: 'Căn hộ 45m2 được bố trí nội thất thông minh: Перепланировка giúp không gian rộng gấp đôi',
                image: '/images/posts/smart-home.jpg'
            },
            stats: {
                likes: "4.1k",
                comments: "223",
                shares: "534"
            }
        },
        {
            id: '17',
            platform: 'facebook',
            author: {
                name: 'EduShare',
                avatar: '/no-picture.jpg',
                date: '19/06/2025'
            },
            content: {
                text: 'Bí quyết học tiếng Anh hiệu quả của du học sinh: Phương pháp 3-2-1 giúp tăng điểm IELTS nhanh chóng',
                image: '/images/posts/english-study.jpg'
            },
            stats: {
                likes: "2.9k",
                comments: "345",
                shares: "567"
            }
        },
        {
            id: '18',
            platform: 'facebook',
            author: {
                name: 'Startup Insider',
                avatar: '/no-picture.jpg',
                date: '19/06/2025'
            },
            content: {
                text: 'Từ nhân viên văn phòng đến chủ chuỗi F&B: Chia sẻ hành trình khởi nghiệp của founder 9X',
                image: '/images/posts/startup-story.jpg'
            },
            stats: {
                likes: "6.7k",
                comments: "445",
                shares: "893"
            }
        },
        {
            id: '19',
            platform: 'facebook',
            author: {
                name: 'Fitness & Health',
                avatar: '/no-picture.jpg',
                date: '19/06/2025'
            },
            content: {
                text: 'Chế độ ăn Địa Trung Hải: Bí quyết sống thọ và khỏe mạnh được khoa học chứng minh',
                image: '/images/posts/mediterranean-diet.jpg'
            },
            stats: {
                likes: "3.8k",
                comments: "234",
                shares: "567"
            }
        },
        {
            id: '20',
            platform: 'facebook',
            author: {
                name: 'Music Trends',
                avatar: '/no-picture.jpg',
                date: '19/06/2025'
            },
            content: {
                text: 'Album mới của nữ ca sĩ Gen Z phá vỡ kỷ lục streaming: "Hiện tượng âm nhạc của năm 2025"',
                image: '/images/posts/music-record.jpg'
            },
            stats: {
                likes: "8.9k",
                comments: "1.2k",
                shares: "445"
            }
        }
    ];

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentPosts = trendingPosts.slice(startIndex, endIndex);
    const totalPages = Math.ceil(trendingPosts.length / itemsPerPage);

    return (
        <div style={{ padding: '12px', minHeight: '100vh' }}>
            <SearchBar />
            <Grid gutter="xs">
                {currentPosts.map((post) => (
                    <Grid.Col span={4} key={post.id}>
                        <PostCard post={post} />
                    </Grid.Col>
                ))}
            </Grid>
            <Group position="center" mt="xl">
                <Pagination
                    total={totalPages}
                    page={currentPage}
                    onChange={setCurrentPage}
                    radius="md"
                />
            </Group>
        </div>
    );
};

export default Trending;
