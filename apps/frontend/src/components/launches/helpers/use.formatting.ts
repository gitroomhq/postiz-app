import removeMd from "remove-markdown";
import {useMemo} from "react";

export const useFormatting = (text: string[], params: {
    removeMarkdown?: boolean,
    saveBreaklines?: boolean,
    specialFunc?: (text: string) => string,
}) => {
    return useMemo(() => {
        return text.map((value) => {
            let newText = value;
            if (params.saveBreaklines) {
                newText = newText.replace('\n', '𝔫𝔢𝔴𝔩𝔦𝔫𝔢');
            }
            if (params.removeMarkdown) {
                newText = removeMd(value);
            }
            if (params.saveBreaklines) {
                newText = newText.replace('𝔫𝔢𝔴𝔩𝔦𝔫𝔢', '\n');
            }
            if (params.specialFunc) {
                newText = params.specialFunc(newText);
            }
            return {
                text: newText,
                count: params.removeMarkdown && params.saveBreaklines ? newText.replace(/\n/g, ' ').length : newText.length,
            }
        });
    }, [text]);
}