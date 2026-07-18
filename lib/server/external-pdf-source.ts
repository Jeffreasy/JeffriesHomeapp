export function parseExternalPdfSourceHosts(value: string | undefined) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((host) => host.trim().toLowerCase())
      .filter((host) => /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(host)),
  );
}

export function getAllowedExternalPdfUrl(
  value: string,
  allowedHosts = parseExternalPdfSourceHosts(
    process.env.LAVENTECARE_PDF_SOURCE_HOSTS,
  ),
) {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      !allowedHosts.has(url.hostname.toLowerCase())
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}
