import {Metadata} from "next";
import { useTranslations } from "next-intl";

export const metadata: Metadata = {
  title: 'Error',
  description: '',
}

export default async function Page() {
  const t= useTranslations('Error')
    return (
        <div>{t("We are experiencing some difficulty, try to refresh the page")}</div>
    )
}