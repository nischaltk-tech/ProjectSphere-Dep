export const FAVORITE_PROFILES_KEY = "projectsphere.favoriteProfiles";
export const FAVORITE_PROJECTS_KEY = "projectsphere.favoriteProjects";

export function getFavoriteStorageKey(baseKey: string, studentId: string) {
  return `${baseKey}:${studentId}`;
}

export function readStoredFavoriteIds(baseKey: string, studentId: string) {
  try {
    const storedValue = localStorage.getItem(getFavoriteStorageKey(baseKey, studentId));
    return storedValue ? (JSON.parse(storedValue) as string[]) : [];
  } catch {
    return [];
  }
}

export function writeStoredFavoriteIds(baseKey: string, studentId: string, ids: string[]) {
  localStorage.setItem(getFavoriteStorageKey(baseKey, studentId), JSON.stringify(ids));
}
