import type { ConsignmentEstimate, ConsignmentRoute } from './types'
import { buildEstimateLines, ymdFromToday } from './estimates'
import { initialConsignmentWeeks, initialShopStock } from './mockData'

const stops = (prefix: string, customerIds: string[]) => customerIds.map((customerId, i) => ({ id: `${prefix}-s${i + 1}`, sequence: i + 1, customerId }))

/** Shops can sit on several routes: Tops พระราม 9 is on both the Ladprao and the Rama 9 routes, which both run on Saturday. */
export const initialRoutes: ConsignmentRoute[] = [
  {
    id: 'cr-1',
    code: 'CR-01',
    name: 'สายใจกลางเมือง',
    daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    isActive: true,
    stops: stops('cr-1', ['cus-tops-chidlom', 'cus-mall-paragon', 'cus-lotuss-sukhumvit50', 'cus-thonglor']),
  },
  {
    id: 'cr-2',
    code: 'CR-02',
    name: 'สายลาดพร้าว–อารีย์',
    daysOfWeek: ['Mon', 'Wed', 'Fri', 'Sat'],
    isActive: true,
    stops: stops('cr-2', ['cus-ari', 'cus-tops-ladprao', 'cus-tops-rama9', 'cus-lotuss-fortune']),
  },
  {
    id: 'cr-3',
    code: 'CR-03',
    name: 'สายพระราม 9–นนทบุรี',
    daysOfWeek: ['Tue', 'Thu', 'Sat'],
    isActive: true,
    stops: stops('cr-3', ['cus-tops-rama9', 'cus-villa-ratchaphruek', 'cus-makro-wangnoi']),
  },
]

const finishedGoodIds = ['fg-rose', 'fg-tulip', 'fg-mixed', 'fg-orchid', 'fg-sunflower']

const estimateFor = (route: ConsignmentRoute, offset: number, n: number, status: ConsignmentEstimate['status']): ConsignmentEstimate => {
  const deliveryDate = ymdFromToday(offset)
  return {
    id: `ce-${n}`,
    estimateNumber: `CE-${deliveryDate.replaceAll('-', '')}-00${n}`,
    deliveryDate,
    consignmentRouteId: route.id,
    status,
    confirmedAt: status === 'confirmed' ? new Date(Date.now() - 3_600_000).toISOString() : null,
    lines: buildEstimateLines(route, finishedGoodIds, initialConsignmentWeeks, initialShopStock),
  }
}

/** Tomorrow's central route is confirmed (feeds production planning); the day after is still a draft. */
export const initialEstimates: ConsignmentEstimate[] = [estimateFor(initialRoutes[0], 1, 1, 'confirmed'), estimateFor(initialRoutes[0], 2, 2, 'draft')]
