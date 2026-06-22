export interface GeocodeResult {
    lat: number;
    lng: number;
    ianaTz: string;
    resolvedName: string;
}
export declare function geocodePlace(place: string): Promise<GeocodeResult | null>;
