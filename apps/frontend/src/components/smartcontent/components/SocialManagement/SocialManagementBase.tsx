'use client';
import React, { useState } from 'react';
import {
    Title,
    Paper,
    Container,
    TextInput,
    Tabs,
    Button,
    Group,
    Box,
    Stack,
    LoadingOverlay
} from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { SocialManagementProvider, useSocialManagement } from './context';

interface SocialManagementBaseProps {
    platform: string;
    children?: React.ReactNode;
}

const SocialManagementContent = ({ platform, children }: SocialManagementBaseProps) => {
    const [activeTab, setActiveTab] = useState<string | null>('following');
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { selectedPosts, deselectAll, saveToCollection } = useSocialManagement();

    const handleSearch = (value: string) => {
        setSearchQuery(value);
        // TODO: Implement search functionality
    };

    const handleSaveToCollection = async () => {
        setIsLoading(true);
        try {
            await saveToCollection();
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Box pos="relative" p="md">
            <LoadingOverlay visible={isLoading} overlayBlur={2} />

            <Group position="apart" align="center" mb="md">
                <Group>
                    <IconSearch size={24} />
                    <TextInput
                        placeholder={`Tìm kiếm tên người dùng hoặc hashtag`}
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        styles={{
                            input: {
                                minWidth: '400px'
                            }
                        }}
                    />
                </Group>
                <Group>
                    <Button
                        variant="light"
                        color="red"
                        onClick={deselectAll}
                        disabled={selectedPosts.size === 0}
                    >
                        Bỏ chọn
                    </Button>
                    <Button variant="light" color="green">Chọn toàn bộ</Button>
                    <Button
                        variant="light"
                        color="teal"
                        onClick={handleSaveToCollection}
                        disabled={selectedPosts.size === 0}
                    >
                        Lưu vào bộ sưu tập ({selectedPosts.size})
                    </Button>
                </Group>
            </Group>

            <Paper shadow="xs" p="md">
                <Tabs value={activeTab} onTabChange={setActiveTab}>
                    <Tabs.List>
                        <Tabs.Tab value="following">Đang theo dõi</Tabs.Tab>
                        <Tabs.Tab value="collection">Bộ sưu tập</Tabs.Tab>
                    </Tabs.List>

                    <Box mt="md">
                        {children}
                    </Box>
                </Tabs>
            </Paper>
        </Box>
    );
};

const SocialManagementBase = (props: SocialManagementBaseProps) => (
    <SocialManagementProvider>
        <SocialManagementContent {...props} />
    </SocialManagementProvider>
);

export default SocialManagementBase;
