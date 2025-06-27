'use client';

import { Group, UnstyledButton, createStyles, Tooltip } from '@mantine/core';
import { MenuItem } from './types';

const useStyles = createStyles((theme) => ({
    menuItem: {
        display: 'block',
        width: '100%',
        padding: theme.spacing.md,
        borderRadius: theme.radius.sm,
        color: theme.black,
        '&:hover': {
            backgroundColor: theme.colors.gray[0],
        },
        transition: 'all 0.3s',
    },
    activeMenuItem: {
        backgroundColor: theme.colors.blue[0],
    },
    collapseButton: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        padding: theme.spacing.xs,
        marginBottom: theme.spacing.md,
        cursor: 'pointer',
        color: theme.colors.gray[6],
        '&:hover': {
            color: theme.colors.dark[6],
        },
    },
    menuContent: {
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.xs,
    },
    iconContainer: {
        width: '24px',
        height: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
}));

interface SideMenuProps {
    items: MenuItem[];
    activeItem: string;
    isCollapsed: boolean;
    onItemClick: (id: string) => void;
    onToggleCollapse: () => void;
}

export function SideMenu({ items, activeItem, isCollapsed, onItemClick, onToggleCollapse }: SideMenuProps) {
    const { classes, cx } = useStyles();

    return (
        <div className={`${isCollapsed ? 'w-24' : 'w-64'} bg-gray-100 p-4 transition-all duration-300`}>
            <div className={classes.collapseButton} onClick={onToggleCollapse}>
                <span className="text-sm">{isCollapsed ? '>>' : '<< Collapse'}</span>
            </div>

            <div className={classes.menuContent}>
                {items.map((item) => (
                    <Tooltip
                        key={item.id}
                        label={isCollapsed ? item.label : ''}
                        position="right"
                        disabled={!isCollapsed}
                    >
                        <UnstyledButton
                            className={cx(classes.menuItem, {
                                [classes.activeMenuItem]: item.id === activeItem,
                            })}
                            onClick={() => onItemClick(item.id)}
                        >
                            {isCollapsed ? (
                                <div className="flex justify-center">
                                    <div className={classes.iconContainer}>
                                        {item.icon}
                                    </div>
                                </div>
                            ) : (
                                <Group spacing="md" noWrap>
                                    <div className={classes.iconContainer}>
                                        {item.icon}
                                    </div>
                                    <span>{item.label}</span>
                                </Group>
                            )}
                        </UnstyledButton>
                    </Tooltip>
                ))}
            </div>
        </div>
    );
}
