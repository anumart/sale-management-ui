import { Topbar } from '@/components/layout/Topbar'
import { IconBox, IconCart, IconMoneyBag, IconReceipt } from '@/components/icons'
import { formatCurrency, formatNumber } from '@/lib/format'
import { PipelineCard } from './components/PipelineCard'
import { ProductionCard } from './components/ProductionCard'
import { RisksCard } from './components/RisksCard'
import { RunSheetsCard } from './components/RunSheetsCard'
import { StatCard } from './components/StatCard'
import { TodoCard } from './components/TodoCard'
import { SALES_DAYS, useDashboard } from './useDashboard'

/**
 * Operations overview across the whole flow in the spec: purchasing → pickup → production → finished goods → sales.
 * Answers "what needs doing", "where is work piling up" and "what could go wrong". Numbers come from the in-memory stores.
 */
export function DashboardPage() {
  const data = useDashboard()
  const today = new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <>
      <Topbar subtitle={`ภาพรวมงาน${today}`} />
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            variant="theme"
            icon={<IconMoneyBag />}
            label={`ยอดขาย ${SALES_DAYS} วันล่าสุด`}
            value={formatCurrency(data.recentSales)}
            hint={`ชำระแล้ว ${formatCurrency(data.recentPaid)}`}
            to="/sales/invoices"
          />
          <StatCard
            variant="accent"
            icon={<IconCart />}
            label="ใบสั่งซื้อรอรับของ"
            value={`${formatNumber(data.openPos.length)} ใบ`}
            hint={`มูลค่า ${formatCurrency(data.openPoValue)}`}
            to="/procurement/purchase-orders"
          />
          <StatCard
            variant="primary"
            icon={<IconReceipt />}
            label="คำสั่งซื้อที่ยังไม่ส่ง"
            value={`${formatNumber(data.openCustomerOrders.length)} รายการ`}
            hint={`พร้อมส่ง ${formatNumber(data.readyToShip.length)} รายการ`}
            to="/sales/orders"
          />
          <StatCard
            variant="warning"
            icon={<IconBox />}
            label="สินค้าพร้อมขาย"
            value={`${formatNumber(data.availableUnits)} ชิ้น`}
            hint={`จาก ${formatNumber(data.liveLots.length)} LOT ในคลัง`}
            to="/production/finished-goods"
          />
        </div>

        <PipelineCard data={data} />

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          <TodoCard data={data} />
          <RisksCard data={data} />
        </div>

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          <ProductionCard data={data} />
          <RunSheetsCard data={data} />
        </div>
      </div>
    </>
  )
}
