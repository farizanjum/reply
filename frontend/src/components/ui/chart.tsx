"use client"

import * as React from "react"
import { ResponsiveContainer, Tooltip, TooltipProps } from "recharts"

import { cn } from "@/lib/utils"

// Format: { theme: { light: string, dark: string }, label: string, color?: string }
export type ChartConfig = Record<
    string,
    {
        label?: React.ReactNode
        icon?: React.ComponentType
        color?: string
        theme?: Record<"light" | "dark", string>
    }
>

interface ChartContextProps {
    config: ChartConfig
}

const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
    const context = React.useContext(ChartContext)

    if (!context) {
        throw new Error("useChart must be used within a <ChartContainer />")
    }

    return context
}

const ChartContainer = React.forwardRef<
    HTMLDivElement,
    React.ComponentProps<"div"> & {
        config: ChartConfig
        children: React.ComponentProps<typeof ResponsiveContainer>["children"]
    }
>(({ id, className, children, config, ...props }, ref) => {
    const uniqueId = React.useId()
    const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`

    return (
        <ChartContext.Provider value={{ config }}>
            <div
                data-chart={chartId}
                ref={ref}
                className={cn(
                    "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted/50 [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
                    className
                )}
                {...props}
            >
                <ChartStyle id={chartId} config={config} />
                <ResponsiveContainer>
                    {children}
                </ResponsiveContainer>
            </div>
        </ChartContext.Provider>
    )
})
ChartContainer.displayName = "ChartContainer"

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
    const colorConfig = Object.entries(config).filter(
        ([_, config]) => config.theme || config.color
    )

    if (!colorConfig.length) {
        return null
    }

    return (
        <style dangerouslySetInnerHTML={{
            __html: `
        [data-chart=${id}] {
          ${colorConfig
                    .map(([key, item]) => {
                        const color = item.theme?.light || item.color
                        const colorDark = item.theme?.dark || item.color
                        return `
                --color-${key}: ${color};
                --chart-${key}: ${color};
              `
                    })
                    .join("\n")}
        }

        .dark [data-chart=${id}] {
          ${colorConfig
                    .map(([key, item]) => {
                        const color = item.theme?.dark || item.color
                        return `
                --color-${key}: ${color};
                --chart-${key}: ${color};
              `
                    })
                    .join("\n")}
        }
      `
        }} />
    )
}

const ChartTooltip = Tooltip

const ChartTooltipContent = React.forwardRef<
    HTMLDivElement,
    React.ComponentProps<"div"> &
    TooltipProps<any, any> & {
        hideLabel?: boolean
        hideIndicator?: boolean
        indicator?: "line" | "dot" | "dashed"
        nameKey?: string
        labelKey?: string
    }
>(
    (
        {
            active,
            payload,
            className,
            indicator = "dot",
            hideLabel = false,
            hideIndicator = false,
            label,
            labelFormatter,
            labelClassName,
            formatter,
            color,
            nameKey,
            labelKey,
        },
        ref
    ) => {
        const { config } = useChart()

        if (payload && payload.length) {
            // Simple implementation for tooltip content
            return (
                <div className={cn("rounded-lg border bg-background p-2 shadow-sm text-foreground bg-black/80 border-white/10 backdrop-blur-md", className)}>
                    {!hideLabel && (
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-xs text-white">{label}</span>
                        </div>
                    )}
                    <div className="flex flex-col gap-1">
                        {payload.map((item: any, index: number) => {
                            const key = item.dataKey || item.name
                            const itemConfig = config[key as keyof typeof config] || {}
                            const itemColor = item.color || item.payload.fill || item.stroke || itemConfig.color || "var(--color-desktop)"

                            return (
                                <div key={index} className="flex items-center gap-2">
                                    {!hideIndicator && (
                                        <div
                                            className="h-2 w-2 rounded-full"
                                            style={{ backgroundColor: itemColor }}
                                        />
                                    )}
                                    <span className="text-xs text-muted-foreground text-gray-400">
                                        {itemConfig.label || item.name}:
                                    </span>
                                    <span className="text-xs font-mono font-medium text-white">
                                        {item.value}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )
        }
        return null
    }
)
ChartTooltipContent.displayName = "ChartTooltipContent"

export {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    useChart,
}
