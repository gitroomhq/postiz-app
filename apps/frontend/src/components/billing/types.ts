interface Tiers {
    month: Array<{
        name: 'Pro' | 'Standard';
        recurring: 'month' | 'year';
        price: number;
    }>;
    year: Array<{
        name: 'Pro' | 'Standard';
        recurring: 'month' | 'year';
        price: number;
    }>;
}

export {
    Tiers
}