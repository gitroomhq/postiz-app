import React, { createContext, useContext, useState, useCallback } from 'react';

export interface SocialPost {
    id: string;
    platform: 'douyin' | 'tiktok' | 'threads' | 'instagram';
    selected: boolean;
}

interface SocialManagementContextType {
    selectedPosts: Set<string>;
    togglePostSelection: (postId: string) => void;
    selectAll: () => void;
    deselectAll: () => void;
    saveToCollection: () => void;
}

const SocialManagementContext = createContext<SocialManagementContextType | null>(null);

export const SocialManagementProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());

    const togglePostSelection = useCallback((postId: string) => {
        setSelectedPosts((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(postId)) {
                newSet.delete(postId);
            } else {
                newSet.add(postId);
            }
            return newSet;
        });
    }, []);

    const selectAll = useCallback(() => {
        // This will be implemented by each platform component
    }, []);

    const deselectAll = useCallback(() => {
        setSelectedPosts(new Set());
    }, []);

    const saveToCollection = useCallback(() => {
        // TODO: Implement save to collection functionality
        console.log('Saving posts to collection:', Array.from(selectedPosts));
    }, [selectedPosts]);

    return (
        <SocialManagementContext.Provider
            value={{
                selectedPosts,
                togglePostSelection,
                selectAll,
                deselectAll,
                saveToCollection,
            }}
        >
            {children}
        </SocialManagementContext.Provider>
    );
};

export const useSocialManagement = () => {
    const context = useContext(SocialManagementContext);
    if (!context) {
        throw new Error('useSocialManagement must be used within a SocialManagementProvider');
    }
    return context;
};
