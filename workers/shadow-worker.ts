import { generateCardShadows } from '@/utils/shadow';

self.addEventListener('message', (event) => {
  if (event.data.type === 'GENERATE_SHADOWS') {
    const { id, color, isDarkMode } = event.data.payload;
    const shadows = generateCardShadows(color, isDarkMode);
    self.postMessage({ 
      type: 'SHADOWS_RESULT', 
      payload: {
        id,
        shadows
      }
    });
  }
}); 