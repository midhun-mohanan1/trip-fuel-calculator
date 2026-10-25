export function getMapsUrl(origin, destination) {
    if (!origin || !destination) return '#';
    const encOrigin = encodeURIComponent(origin);
    const encDest = encodeURIComponent(destination);
    return `https://www.google.com/maps/dir/?api=1&origin=${encOrigin}&destination=${encDest}&travelmode=driving`;
}
