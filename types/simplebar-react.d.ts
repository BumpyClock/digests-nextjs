/**
 * Type definitions for simplebar-react
 */

declare module 'simplebar-react' {
  import { CSSProperties, ReactNode } from 'react'
  
  export interface SimpleBarOptions {
    autoHide?: boolean
    forceVisible?: boolean | 'x' | 'y'
    clickOnTrack?: boolean
    scrollbarMinSize?: number
    scrollbarMaxSize?: number
    classNames?: {
      contentEl?: string
      contentWrapper?: string
      offset?: string
      mask?: string
      wrapper?: string
      placeholder?: string
      scrollbar?: string
      track?: string
      heightAutoObserverWrapperEl?: string
      heightAutoObserverEl?: string
      visible?: string
      horizontal?: string
      vertical?: string
      hover?: string
      dragging?: string
    }
  }
  
  export interface SimpleBarProps extends SimpleBarOptions {
    children?: ReactNode
    className?: string
    style?: CSSProperties
    onScroll?: (event: Event) => void
    scrollableNodeProps?: object
    tag?: string
  }
  
  export default function SimpleBar(props: SimpleBarProps): JSX.Element
}