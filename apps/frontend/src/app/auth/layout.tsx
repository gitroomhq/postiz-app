import '../global.css';
import {ReactNode} from "react";

export default async function AuthLayout({children}: {children: ReactNode}) {
    return (
        <div className="h-[100vh] w-[100vw] overflow-hidden bg-purple-400 flex justify-center items-center">
            <div className="absolute w-60 h-60 rounded-xl bg-purple-300 -top-5 -left-16 z-0 transform rotate-45 hidden md:block"></div>
            <div className="absolute w-48 h-48 rounded-xl bg-purple-300 -bottom-6 -right-10 transform rotate-12 hidden md:block"></div>
            <div className="py-12 px-12 bg-white rounded-2xl shadow-xl z-20">
                {children}
            </div>
            <div className="w-40 h-40 absolute bg-purple-300 rounded-full top-0 right-12 hidden md:block"></div>
            <div className="w-20 h-40 absolute bg-purple-300 rounded-full bottom-20 left-10 transform rotate-45 hidden md:block"></div>
        </div>
    );
}