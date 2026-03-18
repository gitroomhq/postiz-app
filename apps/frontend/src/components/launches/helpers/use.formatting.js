import { useMemo } from 'react';
export const useFormatting = (text, params) => {
    return useMemo(() => {
        return text.map((value) => {
            let newText = value.content;
            if (params.beforeSpecialFunc) {
                newText = params.beforeSpecialFunc(newText);
            }
            if (params.saveBreaklines) {
                newText = newText.replace('\n', '𝔫𝔢𝔴𝔩𝔦𝔫𝔢');
            }
            newText = newText.replace(/@\w{1,15}/g, function (match) {
                return `<strong>${match}</strong>`;
            });
            if (params.saveBreaklines) {
                newText = newText.replace('𝔫𝔢𝔴𝔩𝔦𝔫𝔢', '\n');
            }
            if (params.specialFunc) {
                newText = params.specialFunc(newText);
            }
            return {
                id: value.id,
                text: newText,
                images: value.image,
                count: params.removeMarkdown && params.saveBreaklines
                    ? newText.replace(/\n/g, ' ').length
                    : newText.length,
            };
        });
    }, [text]);
};
//# sourceMappingURL=use.formatting.js.map