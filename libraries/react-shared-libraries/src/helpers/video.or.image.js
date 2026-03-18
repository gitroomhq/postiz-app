import { clsx } from 'clsx';
export const VideoOrImage = (props) => {
    const { src, autoplay, isContain, imageClassName, videoClassName } = props;
    if ((src === null || src === void 0 ? void 0 : src.indexOf('mp4')) > -1) {
        return (<video src={src} autoPlay={autoplay} className={clsx('w-full h-full', videoClassName)} muted={true} loop={true}/>);
    }
    return (<img className={clsx(isContain ? 'object-contain' : 'object-cover', 'w-full h-full', imageClassName)} src={src}/>);
};
//# sourceMappingURL=video.or.image.js.map