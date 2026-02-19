// components/Toast.jsx
import { Toaster } from "react-hot-toast";

export default function Toast() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        // Default options for all toasts
        duration: 4000,
        style: {
          background: "#333",
          color: "#fff",
        },
        success: {
          style: {
            background: "#22c55e", // Tailwind green-500
            color: "#fff",
          },
        },
        error: {
          style: {
            background: "#ef4444", // Tailwind red-500
            color: "#fff",
          },
        },
      }}
    />
  );
}