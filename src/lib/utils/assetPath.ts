import { getAppBasePath } from '../config/basePath';

export function resolveAssetPath(path: string): string {
  if (!path.startsWith('/')) {
    return path;
  }

  const basePath = getAppBasePath();
  if (!basePath || path.startsWith(basePath + '/')) {
    return path;
  }

  return `${basePath}${path}`;
}
