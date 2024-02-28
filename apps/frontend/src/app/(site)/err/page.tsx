import {Metadata} from "next";

export const metadata: Metadata = {
  title: 'Error',
  description: '',
}

export default async function Page() {
    return (
        <div>We are experiencing some difficulty, try to refresh the page</div>
    )
}