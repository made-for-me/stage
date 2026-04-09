import React from "react";

export function PhoneFrame(props: React.PropsWithChildren) {
  return (
    <div
      style={{
        width: 390,
        height: 844,
        padding: 14,
        borderRadius: 48,
        background: "#050608",
        boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          borderRadius: 36,
          background: "#0a0a0b",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 10,
            left: "50%",
            transform: "translateX(-50%)",
            width: 120,
            height: 28,
            borderRadius: 16,
            background: "#000",
            zIndex: 2,
          }}
        />
        <div style={{ width: "100%", height: "100%" }}>{props.children}</div>
      </div>
    </div>
  );
}