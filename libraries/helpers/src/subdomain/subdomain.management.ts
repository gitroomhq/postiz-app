import {allTwoLevelSubdomain} from "./all.two.level.subdomain";
const ipRegex = /^(https?:\/\/)?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?$/;

export function removeSubdomain(domain: string) {
    // Check if the domain is an IP address with optional port
    if (ipRegex.test(domain)) {
        return domain; // Return the original domain if it's an IP address
    }
    // Split the domain into its parts
    const parts = domain.split('.');

    // Check if there are at least two parts (e.g., 'example.com')
    if (parts.length < 2) {
        return domain; // Return the original domain if it's too short to have a subdomain
    }

    if (parts.length > 2) {
        const lastTwo = parts.slice(-2).join('.');
        if (allTwoLevelSubdomain.includes(lastTwo)) {
            return 'https://' + parts.slice(-3).join('.'); // Return the last three parts for known second-level domains
        }
    }

    // Return the last two parts for standard domains
    return 'https://' + parts.slice(-2).join('.');
}


export function getCookieUrlFromDomain(domain: string) {
    const url = removeSubdomain(domain);
    const urlObj = new URL(url);
    if (!ipRegex.test(domain)) {
        return '.' + urlObj.hostname
    }

    return urlObj.hostname;
}