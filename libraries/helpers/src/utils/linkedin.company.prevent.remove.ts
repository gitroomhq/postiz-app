export const linkedinCompanyPreventRemove = (text: string) => {
  const regex = /@\[(.*?)]\(urn:li:organization:(\d+)\)/g;

  return text.replace(regex, `[bold]@$1[/bold]`);
};

export const afterLinkedinCompanyPreventRemove = (text: string) => {
  const regex = /\[bold]@([^[]+)\[\/bold]/g;
  return text.replace(regex, '<strong>@$1</strong>');
};
