import {FC} from "react";
import {StarsAndForksInterface} from "@gitroom/frontend/components/analytics/stars.and.forks.interface";
import {Chart} from "@gitroom/frontend/components/analytics/chart";
import Image from "next/image";
import {UtcToLocalDateRender} from "../../../../../libraries/react-shared-libraries/src/helpers/utc.date.render";
import clsx from "clsx";

export const StarsAndForks: FC<StarsAndForksInterface> = (props) => {
    const {list} = props;
    return (
        <>
            {list.map(item => (
                <div className="flex gap-[24px] h-[272px]" key={item.login}>
                    {[1,2].map(p => (
                        <div key={p} className="flex-1 bg-secondary py-[10px] px-[16px] flex flex-col">
                            <div className="flex items-center gap-[14px]">
                                <div>
                                    <Image src="/icons/star-circle.svg" alt="Stars" width={40} height={40}/>
                                </div>
                                <div className="text-[20px]">
                                    {item.login.split('/')[1].split('').map(((char, index) => index === 0 ? char.toUpperCase() : char)).join('')} {p === 1 ? 'Stars' : 'Forks'}
                                </div>
                            </div>
                            <div className="flex-1 relative">
                                <div className="absolute w-full h-full left-0 top-0">
                                    {item.stars.length ? <Chart list={item.stars}/> : <div className="w-full h-full flex items-center justify-center text-3xl">Processing stars...</div>}
                                </div>
                            </div>
                            <div className="text-[50px] leading-[60px]">
                                {item?.stars[item.stars.length - 1]?.totalStars}
                            </div>
                        </div>
                    ))}
                </div>
            ))}
            <div className="flex gap-[24px]">
                {[0, 1].map( p => (
                    <div key={p} className="flex-1 bg-secondary py-[24px] px-[16px] gap-[16px] flex flex-col">
                        <div className="flex items-center gap-[14px]">
                            <div>
                                <Image src="/icons/trending.svg" width={36} height={36} alt="Trending" />
                            </div>
                            <div className="text-[20px]">
                                {p === 0 ? 'Last Github Trending' : 'Next Predicted GitHub Trending'}
                            </div>
                        </div>
                        <div className="flex items-center">
                            <div className="w-[2px] h-[30px] bg-[#8B90FF] mr-[16px]"></div>
                            <div className="text-[24px] flex-1">
                                <UtcToLocalDateRender date={p === 0 ? props.trending.last : props.trending.predictions} format="dddd"/>
                            </div>
                            <div className={clsx("text-[24px]", p === 0 ? 'text-[#B7C1FF]' : 'text-[#FFAC30]')}>
                                <UtcToLocalDateRender date={p === 0 ? props.trending.last : props.trending.predictions} format="DD MMM YYYY"/>
                            </div>
                            <div>
                                <div className="rounded-full bg-[#576A9A] w-[5px] h-[5px] mx-[8px]"/>
                            </div>
                            <div className={clsx("text-[24px]", p === 0 ? 'text-[#B7C1FF]' : 'text-[#FFAC30]')}>
                                <UtcToLocalDateRender date={p === 0 ? props.trending.last : props.trending.predictions} format="HH:mm"/>
                            </div>
                        </div>
                    </div>))}
            </div>
        </>);
}