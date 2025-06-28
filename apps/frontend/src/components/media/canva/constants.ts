export const CanvaLiterals = {
    PublishLabel: 'Use this design',
    FileType: 'png',
    CanvaFilename: 'canva.png',
};

export type CanvaDesignConfig = {
    title: string;
    service: string;
    dimensions: {
        width: string;
        height: string;
        units: string;
    };
};

export const CanvaDesignConfigValues: CanvaDesignConfig[] = [
    {
        title: 'New Image',
        service: 'omni',
        dimensions: {
            width: '1200',
            height: '1200',
            units: 'px',
        },
    },
    {
        title: 'Instagram Story',
        service: 'instagramStory',
        dimensions: {
            width: '1080',
            height: '1920',
            units: 'px',
        },
    },
    {
        title: 'Instagram',
        service: 'instagram',
        dimensions: {
            width: '1080',
            height: '1350',
            units: 'px',
        },
    },
];