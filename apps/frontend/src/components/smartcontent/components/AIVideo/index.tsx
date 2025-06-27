'use client';
import React from 'react';
import { Title, Paper, Container } from '@mantine/core';

const AIVideoGenerator = () => {
    return (
        <Container size="xl" p="sm">
            <Paper shadow="xs" p={0} style={{ height: 'calc(100vh - 120px)' }}>
                <iframe
                    src="https://mona.media/gioi-thieu/?gidzl=LAa178x2l1HJjm0UZzo-45Ao2noLZx0IJE845yRRxnjDjrGJmTpj7Hso0Hd4ZRKI7k1U6c7fMuqzZyUy4G"
                    style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                    }}
                    title="Tabler Icons"
                />
            </Paper>
        </Container>
    );
};

export default AIVideoGenerator;
