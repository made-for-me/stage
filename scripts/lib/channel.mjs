export function branchChannel(branch) {
  const slug = branch
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42);
  return `branch-${slug || "preview"}-${shortHash(branch)}`;
}

function shortHash(value) {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }
  return (hash >>> 0).toString(36).padStart(6, "0").slice(-6);
}
