import React, { useEffect, useRef } from "react";
import { CanvaDesignConfig, CanvaLiterals } from "./constants";
import loadCanvaSDK from "./canva-sdk";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare global {
    interface Window {
        canvaApi?: any;
    }
}

type CanvaPublishedOpts = {
    designId: string;
    exportUrl: string;
};

interface CanvaModalProps {
    open: boolean;
    onClose?: () => void;
    onDesignPublish?: (opts: CanvaPublishedOpts) => void;
    designConfig?: CanvaDesignConfig;
    designId?: string;
}

const CanvaModal: React.FC<CanvaModalProps> = ({
    open,
    onClose,
    onDesignPublish,
    designConfig,
    designId,
}) => {
    const embedRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadCanvaSDK();
    }, []);

    useEffect(() => {
        if (!open || !embedRef.current || !window.canvaApi) return;

        let canvaFunc;
        let design;

        if (designId) {
            canvaFunc = window.canvaApi.editDesign;
            design = { id: designId };
        } else if (designConfig) {
            canvaFunc = window.canvaApi.createDesign;
            design = {
                title: designConfig.title,
                dimensions: {
                    width: Number(designConfig.dimensions.width),
                    height: Number(designConfig.dimensions.height),
                    units: designConfig.dimensions.units,
                },
            };
        }

        if (canvaFunc) {
            canvaFunc({
                design,
                container: embedRef.current,
                editor: {
                    publishLabel: CanvaLiterals.PublishLabel,
                    fileType: CanvaLiterals.FileType,
                },
                onDesignPublish: (opts: CanvaPublishedOpts) => {
                    onDesignPublish?.(opts);
                    onClose?.();
                },
                onDesignOpen: () => { },
                onDesignClose: () => {
                    onClose?.();
                },
            });
        }
    }, [open, designConfig, designId, onClose, onDesignPublish]);

    if (!open) return null;

    return (
        <div
            ref={embedRef}
            style={{
                flex: 1,
                background: "#f4f6f8",
                position: "relative",
            }}
        />
    );
};

export default CanvaModal;