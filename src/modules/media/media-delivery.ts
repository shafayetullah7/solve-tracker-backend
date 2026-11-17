/** Build a stable HTTPS delivery URL (not stored in Postgres). */
export function buildCloudinaryImageUrl(
  cloudName: string,
  publicId: string,
  extension: string,
): string {
  const encoded = publicId
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  const format = extension.replace(/^\./, '');
  return `https://res.cloudinary.com/${encodeURIComponent(cloudName)}/image/upload/${encoded}.${encodeURIComponent(format)}`;
}