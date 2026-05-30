declare global {
  interface Window {
    Toastify?: (options: {
      text: string;
      duration: number;
      gravity: "top" | "bottom";
      position: "left" | "center" | "right";
      stopOnFocus: boolean;
      className?: string;
    }) => { showToast: () => void };
  }
}

export {};
