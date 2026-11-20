import type { LocationQueryRaw } from 'vue-router'

export type UnknownRecord = Record<string, unknown>
export type RouteQueryRecord = LocationQueryRaw

export function toRouteQuery(query: UnknownRecord): RouteQueryRecord {
  const result: RouteQueryRecord = {}
  for (const [key, value] of Object.entries(query)) {
    if (typeof value === 'string' || typeof value === 'number') result[key] = String(value)
    else if (Array.isArray(value))
      result[key] = value.filter((item): item is string => typeof item === 'string')
  }
  return result
}
