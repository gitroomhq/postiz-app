import { useEffect } from 'react';
export const useClickOutside = (callback) => {
    const handleClick = (event) => {
        const selector = document.querySelector('#add-edit-modal');
        const copilotkit = document.querySelector('.copilotKitPopup');
        const emoji = document.querySelector('.EmojiPickerReact');
        if (!(selector === null || selector === void 0 ? void 0 : selector.contains(event.target)) &&
            !(copilotkit === null || copilotkit === void 0 ? void 0 : copilotkit.contains(event.target)) &&
            !emoji) {
            callback();
        }
    };
    useEffect(() => {
        var _a;
        (_a = document
            .querySelector('.mantine-Modal-root')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', handleClick);
        return () => {
            var _a;
            (_a = document
                .querySelector('.mantine-Modal-root')) === null || _a === void 0 ? void 0 : _a.removeEventListener('click', handleClick);
        };
    });
};
//# sourceMappingURL=click.outside.js.map