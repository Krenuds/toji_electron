/// <reference types="vite/client" />

declare module '*.png?asset' {
  const content: string
  export default content
}

declare module '*.jpg?asset' {
  const content: string
  export default content
}

declare module '*.svg?asset' {
  const content: string
  export default content
}

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>
  }
}
