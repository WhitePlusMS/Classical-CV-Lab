export const APP_BASE_PATH = '/Classical-CV-Lab';

export function getAppBasePath(): string {
  return process.env.NODE_ENV === 'production' ? APP_BASE_PATH : '';
}
