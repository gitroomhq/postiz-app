import removeMd from "remove-markdown";
import {useMemo} from "react";

export const useFormatting = (text: Array<{content: string, id?: string}>, params: {
    removeMarkdown?: boolean,
    saveBreaklines?: boolean,
    specialFunc?: (text: string) => string,
}) => {
    return useMemo(() => {
        return text.map((value) => {
            let newText = value.content;
            if (params.saveBreaklines) {
                newText = newText.replace('\n', '𝔫𝔢𝔴𝔩𝔦𝔫𝔢');
            }
            if (params.removeMarkdown) {
                newText = removeMd(value.content);
            }
            if (params.saveBreaklines) {
                newText = newText.replace('𝔫𝔢𝔴𝔩𝔦𝔫𝔢', '\n');
            }
            if (params.specialFunc) {
                newText = params.specialFunc(newText);
            }
            return {
                id: value.id,
                text: newText,
                count: params.removeMarkdown && params.saveBreaklines ? newText.replace(/\n/g, ' ').length : newText.length,
            }
        });
    }, [text]);
}