"use client"

import React, { useEffect, useState } from "react"

interface MasonryGridProps {
  children: React.ReactNode
  columns?: number
  gap?: number
}

export function MasonryGrid({ children, columns: defaultColumns = 3, gap = 24 }: MasonryGridProps) {
  const [columns, setColumns] = useState(defaultColumns)
  const [childrenArray, setChildrenArray] = useState<React.ReactNode[]>([])

  useEffect(() => {
    // Convert children to array
    const childArray = React.Children.toArray(children)
    setChildrenArray(childArray)
  }, [children])

  useEffect(() => {
    // Responsive columns based on viewport width
    const handleResize = () => {
      const cardWidth = 300 // Width of each card
      const containerWidth = window.innerWidth - 48 // Assuming 24px padding on each side
      const maxColumns = Math.floor(containerWidth / (cardWidth + gap))
      setColumns(Math.max(1, Math.min(maxColumns, defaultColumns)))
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [defaultColumns, gap])

  // Create column arrays
  const columnArray: React.ReactNode[][] = Array.from({ length: columns }, () => [])

  // Distribute children among columns
  childrenArray.forEach((child, index) => {
    columnArray[index % columns].push(child)
  })

  return (
    <div
      className="w-full"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, 300px)`,
        gap: `${gap}px`,
        justifyContent: "center",
      }}
    >
      {columnArray.map((column, columnIndex) => (
        <div key={columnIndex} className="flex flex-col space-y-6">
          {column.map((child, childIndex) => (
            <div key={childIndex}>{child}</div>
          ))}
        </div>
      ))}
    </div>
  )
}

