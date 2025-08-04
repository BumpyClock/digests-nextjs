declare namespace JSX {
  interface IntrinsicElements {
    "ms-store-badge": React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        productid?: string;
        productname?: string;
        "window-mode"?: "full" | "mini" | "direct";
        theme?: "auto" | "light" | "dark";
        language?: string;
        animation?: "on" | "off";
        size?: "small" | "medium" | "large";
      },
      HTMLElement
    >;
  }
}
