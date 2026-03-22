"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MapPinIcon } from "lucide-react"
import { useTranslations } from "@/lib/i18n"
import type { Location } from "@/types"

interface LocationSelectorProps {
  locations: Location[]
  value: string
  onChange: (value: string) => void
}

export function LocationSelector({ locations, value, onChange }: LocationSelectorProps) {
  const t = useTranslations()

  return (
    <Select value={value} onValueChange={(val) => val && onChange(val)}>
      <SelectTrigger className="w-[200px]">
        <MapPinIcon className="size-4 mr-2 text-muted-foreground" />
        <SelectValue placeholder={t.common.selectLocation} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{t.common.allLocations}</SelectItem>
        {locations.map((location) => (
          <SelectItem key={location.id} value={location.id}>
            {location.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
