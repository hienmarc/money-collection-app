"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ComposableMap, Geographies, Geography } from "react-simple-maps"

const geoUrl = "https://unpkg.com/world-atlas@2.0.2/countries-110m.json"

export default function CountryMap({ countries }) {
  const [tooltipContent, setTooltipContent] = useState(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const router = useRouter()

  const handleCountryClick = (country) => {
    if (country && country.countryid) {
      router.push(`/countries/${country.countryid}`)
    }
  }

  return (
    <div className="relative w-full border rounded-lg bg-slate-50 overflow-hidden">
      <ComposableMap
        projectionConfig={{
          scale: 147,
        }}
        width={800}
        height={400}
        style={{
          width: "100%",
          height: "auto",
        }}
      >
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const country = countries.find(
                (c) => c.code === geo.properties.ISO_A2 || c.name === geo.properties.NAME
              )
              
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={country ? "#10B981" : "#E2E8F0"}
                  stroke="#FFFFFF"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: "none" },
                    hover: { outline: "none", fill: country ? "#059669" : "#CBD5E1", cursor: country ? "pointer" : "default" },
                    pressed: { outline: "none" },
                  }}
                  onMouseEnter={(e) => {
                    const { NAME } = geo.properties
                    setTooltipContent({
                      name: country?.name || NAME,
                      continent: country?.continent,
                      hasData: !!country
                    })
                  }}
                  onMouseMove={(e) => {
                    setTooltipPosition({ x: e.pageX, y: e.pageY })
                  }}
                  onMouseLeave={() => {
                    setTooltipContent(null)
                  }}
                  onClick={() => handleCountryClick(country)}
                />
              )
            })
          }
        </Geographies>
      </ComposableMap>
      
      {tooltipContent && (
        <div 
          className="fixed pointer-events-none z-50 bg-white border rounded shadow-lg p-2 text-sm"
          style={{ 
            left: tooltipPosition.x + 10, 
            top: tooltipPosition.y + 10 
          }}
        >
          <div className="font-bold">{tooltipContent.name}</div>
          {tooltipContent.continent && (
            <div className="text-gray-500 text-xs">{tooltipContent.continent}</div>
          )}
          {tooltipContent.hasData ? (
            <div className="text-emerald-600 text-xs mt-1">Click to view collection</div>
          ) : (
            <div className="text-gray-400 text-xs mt-1">No data available</div>
          )}
        </div>
      )}
    </div>
  )
}

