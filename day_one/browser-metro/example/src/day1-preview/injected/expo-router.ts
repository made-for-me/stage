import React from "react";

function noop(..._args: unknown[]) {}

export function useRouter() {
  return {
    push: (...args: unknown[]) => noop(...args),
    replace: (...args: unknown[]) => noop(...args),
    back: () => noop(),
    canGoBack: () => false,
    setParams: (...args: unknown[]) => noop(...args),
  };
}

export function Redirect() {
  return null;
}

export function Link(props: React.PropsWithChildren<{ href: unknown }>) {
  return React.createElement(React.Fragment, null, props.children);
}