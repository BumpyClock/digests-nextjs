declare namespace JSX {
    interface IntrinsicElements {
      'ms-store-badge': {
        productid: string;
        productname: string;
        'window-mode'?: 'direct' | 'popup';
        theme?: 'light' | 'dark' | 'auto';
        size?: 'small' | 'medium' | 'large';
        language?: string;
        animation?: 'on' | 'off';
      }
    }
  }