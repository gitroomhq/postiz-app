import {allTwoLevelSubdomain} from "./all.two.level.subdomain";

export function removeSubdomain(domain: string) {
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
