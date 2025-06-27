import React from 'react';
import { Modal, TextInput, Button, Group, Card, Text, Select, Box } from '@mantine/core';
import { IconSearch, IconEdit, IconTrash, IconSortAscending2 } from '@tabler/icons-react';

interface PlanDialogProps {
    opened: boolean;
    onClose: () => void;
}

export const PlanDialog = ({ opened, onClose }: PlanDialogProps) => {
    return (
        <Modal
            opened={opened}
            onClose={onClose}
            withCloseButton
            size="xl"
            centered
            styles={{
                modal: {
                    maxWidth: 1100,
                    width: '95%',
                    padding: 0,
                    borderRadius: 14,
                },
                body: { padding: 32, paddingTop: 24, paddingBottom: 32 },
                header: { borderBottom: 'none', padding: 24, paddingBottom: 0 },
                close: {
                    color: 'red',
                    background: 'white',
                    boxShadow: '0 2px 8px #eee',
                    borderRadius: '50%',
                    width: 40,
                    height: 40,
                    right: 24,
                    top: 24,
                },
            }}
        >
            <Group mb={24} spacing={0} align="center">
                <Button
                    variant="filled"
                    color="#3887FE"
                    radius="md"
                    size="md"
                    style={{ fontWeight: 600, fontSize: 18, height: 48, marginRight: 16, minWidth: 220 }}
                >
                    Lập kế hoạch mới
                </Button>
                <Text
                    style={{
                        fontWeight: 700,
                        fontSize: 20,
                        marginLeft: 8,
                        marginRight: 32,
                        letterSpacing: 0.2,
                    }}
                >
                    DANH SÁCH KẾ HOẠCH CỦA BẠN
                </Text>
            </Group>

            <Group mb={24} spacing={16} align="center" style={{ maxWidth: 700 }}>
                <TextInput
                    placeholder="Tìm theo tên hoặc hashtag#"
                    radius="md"
                    size="md"
                    style={{ flex: 1, minWidth: 320 }}
                    rightSection={<IconSearch size={22} color="#3887FE" />}
                />
                <Select
                    radius="md"
                    size="md"
                    data={[{ value: 'oldest', label: 'Cũ nhất' }, { value: 'newest', label: 'Mới nhất' }]}
                    defaultValue="oldest"
                    style={{ minWidth: 180 }}
                    rightSection={<IconSortAscending2 size={22} color="#3887FE" />}
                />
            </Group>

            <Box mt={8} style={{ borderTop: '1.5px dashed #E0E0E0', paddingTop: 32 }}>
                <Card
                    shadow="sm"
                    p={0}
                    radius="md"
                    withBorder
                    style={{
                        background: '#1846A3',
                        color: 'white',
                        minWidth: 300,
                        maxWidth: 320,
                        minHeight: 140,
                        border: '3px solid #7CA6FF',
                        boxShadow: '0 2px 12px #e3eaff',
                        position: 'relative',
                        marginBottom: 16,
                    }}
                >
                    <Group position="right" spacing={8} style={{ position: 'absolute', top: 12, right: 12, zIndex: 2 }}>
                        <Button variant="subtle" color="#E3EAFD" radius="md" p={6} style={{ background: '#E3EAFD' }}>
                            <IconEdit size={22} color="#1846A3" />
                        </Button>
                        <Button variant="subtle" color="#E3EAFD" radius="md" p={6} style={{ background: '#E3EAFD' }}>
                            <IconTrash size={22} color="#1846A3" />
                        </Button>
                    </Group>
                    <Box p={24} pt={40}>
                        <Text align="center" weight={700} size={22} style={{ letterSpacing: 0.5 }}>
                            KIÊN (1)
                        </Text>
                        <Text align="center" size={16} mt={8} style={{ color: '#E3EAFD', fontWeight: 500 }}>
                            #Content hay
                        </Text>
                    </Box>
                </Card>
            </Box>
        </Modal>
    );
};
