'use client';
import React from 'react';
import { Title, Paper, Container } from '@mantine/core';

const VideoEditor = () => {
    return (
        <Container size="xl">
            <Title order={2} mb="lg">TikTok Video Player</Title>
            <Paper shadow="xs" p="md">
                <div style={{ position: 'relative', paddingTop: '56.25%' }}>
                    <iframe
                        src="https://www.tiktok.com/embed/v2/7513088572048657671"
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            border: 'none',
                            borderRadius: '8px',
                            background: '#000'
                        }}
                        allow="autoplay; encrypted-media"
                        allowFullScreen
                        title="TikTok Video"
                    />
                </div>
            </Paper>
        </Container>
    );
};

export default VideoEditor;
