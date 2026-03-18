export const videosList = [];
export const videoWrapper = (identifier, Component) => {
    if (videosList.map(p => p.identifier).includes(identifier)) {
        return null;
    }
    videosList.push({
        identifier,
        Component
    });
    return null;
};
//# sourceMappingURL=video.wrapper.js.map