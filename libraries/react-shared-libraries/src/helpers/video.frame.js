'use client';
export const VideoFrame = (props) => {
    const { url } = props;
    return (<video className="w-full h-full object-cover rounded-[4px]" src={url + '#t=0.1'} preload="metadata" autoPlay={!!(props === null || props === void 0 ? void 0 : props.autoplay)}/>);
};
//# sourceMappingURL=video.frame.js.map