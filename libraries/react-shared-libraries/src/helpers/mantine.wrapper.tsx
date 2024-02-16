"use client";
import {ReactNode} from "react";
import {MantineProvider} from "@mantine/core";
import {ModalsProvider} from "@mantine/modals";

export const MantineWrapper = (props: { children: ReactNode }) => {
    return (
        <MantineProvider>
            <ModalsProvider modalProps={{
                classNames: {
                    modal: 'bg-primary text-white border-fifth border',
                    close: 'bg-black hover:bg-black cursor-pointer',
                }
            }}>
                {props.children}
            </ModalsProvider>
        </MantineProvider>
    )
};
