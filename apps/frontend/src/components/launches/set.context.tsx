import { createContext, useContext } from 'react';
import { type CreatePostDto } from '@gitroom/nestjs-libraries/dtos/posts/create.post.dto';

export const SetContext = createContext<{set?: CreatePostDto}>({});
export const useSet = () => useContext(SetContext);