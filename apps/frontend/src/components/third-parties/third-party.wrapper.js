export const thirdPartyList = [];
export const thirdPartyWrapper = (identifier, Component) => {
    if (thirdPartyList.map(p => p.identifier).includes(identifier)) {
        return null;
    }
    thirdPartyList.push({
        identifier,
        Component
    });
    return null;
};
//# sourceMappingURL=third-party.wrapper.js.map