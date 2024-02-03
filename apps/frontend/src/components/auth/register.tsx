"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import {useFetch} from "@gitroom/helpers/utils/custom.fetch";
import Link from "next/link";

type Inputs = {
    email: string;
    password: string;
    company: string;
}

export function Register() {
    const {
        register,
        handleSubmit,
    } = useForm<Inputs>();

    const fetchData = useFetch();

    const onSubmit: SubmitHandler<Inputs> = (data) => {
        fetchData('/auth/register', {
            method: 'POST',
            body: JSON.stringify({...data, provider: 'LOCAL'})
        });
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <div>
                <h1 className="text-3xl font-bold text-center mb-4 cursor-pointer">Create An Account</h1>
            </div>
            <div className="space-y-4">
                <input {...register('email')} type="email" placeholder="Email Addres" className="block text-sm py-3 px-4 rounded-lg w-full border outline-purple-500"/>
                <input {...register('password')} autoComplete="off" type="password" placeholder="Password" className="block text-sm py-3 px-4 rounded-lg w-full border outline-purple-500"/>
                <input {...register('company')} autoComplete="off" type="text" placeholder="Company" className="block text-sm py-3 px-4 rounded-lg w-full border outline-purple-500"/>
            </div>
            <div className="text-center mt-6">
                <button type="submit" className="w-full py-2 text-xl text-white bg-purple-400 rounded-lg hover:bg-purple-500 transition-all">Create Account</button>
                <p className="mt-4 text-sm">Already Have An Account? <Link href="/auth/login" className="underline  cursor-pointer"> Sign In</Link></p>
            </div>
        </form>
    );
}
