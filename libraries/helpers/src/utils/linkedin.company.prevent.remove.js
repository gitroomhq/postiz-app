export const linkedinCompanyPreventRemove = (text) => {
    const regex = /@\[(.*?)]\(urn:li:organization:(\d+)\)/g;
    return text.replace(regex, `[bold]@$1[/bold]`);
};
export const afterLinkedinCompanyPreventRemove = (text) => {
    const regex = /\[bold]@([^[]+)\[\/bold]/g;
    return text.replace(regex, '<strong>@$1</strong>');
};
//# sourceMappingURL=linkedin.company.prevent.remove.js.map