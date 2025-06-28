const CANVA_SDK_URL = 'https://sdk.canva.com/designbutton/v2/api.js';
const CANVA_API_KEY = process.env.NEXT_PUBLIC_CANVA_KEY || "";

declare global {
    interface Window {
        Canva?: any;
        canvaApi?: any;
    }
}

function loadCanvaSDK() {
    if (typeof window === 'undefined') return;
    if (window.canvaApi || document.getElementById('canva-sdk-script')) return;

    const script = document.createElement('script');
    script.id = 'canva-sdk-script';
    script.src = CANVA_SDK_URL;
    script.async = true;
    script.onload = async () => {
        if (!window.Canva || !window.Canva.DesignButton) {
            console.warn('Canva SDK not loaded');
            return;
        }
        const api = await window.Canva.DesignButton.initialize({
            apiKey: CANVA_API_KEY,
        });
        window.canvaApi = api;
    };
    document.body.appendChild(script);
}

export default loadCanvaSDK;