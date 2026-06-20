import { createContext, useContext } from 'react';

export const VideoContextWrapper = createContext({value: ''});
export const useVideo = () => useContext(VideoContextWrapper);