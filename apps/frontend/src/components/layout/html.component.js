'use client';
import { useEffect, useState } from 'react';
import { useTranslationSettings } from "../../../../../libraries/react-shared-libraries/src/translation/get.transation.service.client";
export const HtmlComponent = () => {
    const settings = useTranslationSettings();
    const [dir, setDir] = useState(settings.dir());
    useEffect(() => {
        settings.on('languageChanged', (lng) => {
            setDir(settings.dir());
        });
    }, []);
    useEffect(() => {
        const htmlElement = document.querySelector('html');
        if (htmlElement) {
            htmlElement.setAttribute('dir', dir);
        }
    }, [dir]);
    return null;
};
//# sourceMappingURL=html.component.js.map