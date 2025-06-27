'use client';
import React from 'react';
import { Container, SimpleGrid } from '@mantine/core';
import { StatsCards } from './components/StatsCards';
import { TrendChart } from './components/TrendChart';
import { TopPosts } from './components/TopPosts';
import { TopFanpages } from './components/TopFanpages';

const Interactions = () => {
    return (
        <Container size="xl" p="md">
            <StatsCards />

            <div style={{ marginTop: '2rem', marginBottom: '2rem' }}>
                <TrendChart />
            </div>

            <SimpleGrid cols={2} spacing="md">
                <TopPosts />
                <TopFanpages />
            </SimpleGrid>
        </Container>
    );
};

export default Interactions;
