import { useEffect, useState } from 'react';
import type { GrayscaleImage } from '@/lib/algorithms/types';
import {
  centerCropGrayscaleImage,
  loadImageAsGrayscale,
  resizeGrayscaleImage,
} from '@/lib/utils/imageProcessing';

const LENA_ASSET_PATH = '/assets/lena-original.jpg';

/** 加载项目内真实 Lena 图像，并缩放到教学页需要的灰度矩阵尺寸。 */
export function useLenaGrayscaleImage(maxSize: number): GrayscaleImage | null {
  const [image, setImage] = useState<GrayscaleImage | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadImageAsGrayscale(LENA_ASSET_PATH)
      .then(rawImage => {
        if (!cancelled) {
          setImage(resizeGrayscaleImage(centerCropGrayscaleImage(rawImage), maxSize));
        }
      })
      .catch(() => {
        if (!cancelled) setImage(null);
      });

    return () => {
      cancelled = true;
    };
  }, [maxSize]);

  return image;
}
