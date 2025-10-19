import React from "react"
import { Spinner, Card, CardBody } from "@nextui-org/react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"
  label?: string
  className?: string
}

export function LoadingSpinner({ size = "lg", label = "Loading...", className }: LoadingSpinnerProps) {
  return (
    <div className={cn("flex items-center justify-center min-h-[200px]", className)}>
      <Spinner 
        size={size} 
        label={label}
        classNames={{
          circle1: "border-b-pink-500",
          circle2: "border-b-purple-500",
        }}
      />
    </div>
  )
}

interface PageLoadingProps {
  title?: string
  description?: string
}

export function PageLoading({ title = "Loading...", description }: PageLoadingProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50/30 via-purple-50/20 to-indigo-50/30">
      <div className="container mx-auto max-w-4xl p-6">
        <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-0">
          <CardBody className="p-12 text-center">
            <div className="space-y-6">
              <div className="relative">
                <Spinner 
                  size="lg"
                  classNames={{
                    circle1: "border-b-pink-500",
                    circle2: "border-b-purple-500",
                  }}
                />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
                {description && (
                  <p className="text-gray-600">{description}</p>
                )}
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

interface ContentLoadingProps {
  rows?: number
  className?: string
}

export function ContentLoading({ rows = 3, className }: ContentLoadingProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
    </div>
  )
}

interface TableLoadingProps {
  rows?: number
  columns?: number
}

export function TableLoading({ rows = 5, columns = 4 }: TableLoadingProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`header-${i}`} className="h-6 w-20" />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={`cell-${rowIndex}-${colIndex}`} className="h-8 w-full" />
          ))}
        </div>
      ))}
    </div>
  )
}

interface StatsLoadingProps {
  count?: number
}

export function StatsLoading({ count = 4 }: StatsLoadingProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="bg-white/90 backdrop-blur-sm shadow-lg border-0">
          <CardBody className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <Skeleton className="h-4 w-12" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-24" />
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  )
}

export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action 
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="text-center py-12">
      <Icon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
      {description && (
        <p className="text-gray-600 mb-6">{description}</p>
      )}
      {action}
    </div>
  )
}