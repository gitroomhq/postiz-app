import {FC} from "react";
import {Stars} from "@gitroom/frontend/components/analytics/stars.and.forks.interface";
import {UtcToLocalDateRender} from "../../../../../libraries/react-shared-libraries/src/helpers/utc.date.render";

export const StarsTableComponent: FC<{stars: Stars[]}> = (props) => {
    const {stars} = props;
    return (
        <table className="table1">
            <thead>
            <tr>
                <th>Repository</th>
                <th>Date</th>
                <th>Total</th>
                <th>Stars</th>
                <th>Media</th>
            </tr>
            </thead>
            <tbody>
            {stars.map(p => (<tr key={p.date}>
                    <td>{p.login}</td>
                    <td><UtcToLocalDateRender date={p.date} format="DD/MM/YYYY" /></td>
                    <td>{p.totalStars}</td>
                    <td>{p.stars}</td>
                    <td>Media</td>
                </tr>
            ))}
            </tbody>
        </table>
    )
}