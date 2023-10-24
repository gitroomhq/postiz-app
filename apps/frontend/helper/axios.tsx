import axios from 'axios';

export const axiosInstance = axios.create({
  withCredentials: true,
});

axiosInstance.interceptors.request.use((value) => {
  value.baseURL =
    process.env.INTERNAL_BACKEND_PATH || process.env.NEXT_PUBLIC_BACKEND_PATH;
  return value;
});
