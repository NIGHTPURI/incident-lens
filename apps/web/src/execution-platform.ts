export type LearningPlatform = 'windows' | 'linux';
export const platformKey = 'incidentlens.execution.platform.v1';
export function readPlatform(storage: Pick<Storage,'getItem'> & Partial<Pick<Storage,'setItem'>>): LearningPlatform {
  try {
    const current=storage.getItem(platformKey);
    if(current==='windows'||current==='linux')return current;
    const legacy=storage.getItem('incidentlens.learning.platform.v1');
    if(legacy==='windows'||legacy==='linux'){storage.setItem?.(platformKey,legacy);return legacy;}
  }catch{/* OS choice remains manual when storage is blocked. */}
  return 'linux';
}
export function savePlatform(storage: Pick<Storage,'setItem'>, platform: LearningPlatform): boolean {
  try {storage.setItem(platformKey,platform);return true;}catch{return false;}
}
