import { useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { Button, Card, CardHeader, DataTable, EmptyState, TextField, type DataTableColumn } from '@/components/ui'
import { useMe } from '@/features/auth/api'
import { formatDateTime, formatNumber } from '@/lib/format'
import { toast } from '@/stores/toastStore'
import { defaultSettings, settingByKey, settingDefinitions, settingGroups, validateSettings, type SettingKey, type Settings } from './definitions'
import { useSettingsStore, type SettingChange } from './store'

type Draft = Record<SettingKey, string>

const toDraft = (values: Settings) => Object.fromEntries(Object.entries(values).map(([k, v]) => [k, String(v)])) as Draft
const fromDraft = (draft: Draft) => Object.fromEntries(Object.entries(draft).map(([k, v]) => [k, v.trim() === '' ? NaN : Number(v)])) as Settings

const withUnit = (key: SettingKey, value: number) => `${formatNumber(value)} ${settingByKey(key).unit}`

/** System-wide business rules, admin only. Every value only drives warnings; reports always use the current value. */
export function SettingsPage() {
  const { data: me } = useMe()
  const values = useSettingsStore((s) => s.values)
  const history = useSettingsStore((s) => s.history)
  const save = useSettingsStore((s) => s.save)
  const [draft, setDraft] = useState(() => toDraft(values))

  if (me && !me.isAdmin) {
    return (
      <>
        <Topbar title="ตั้งค่าระบบ" subtitle="เกณฑ์ที่ใช้แจ้งเตือนทั้งระบบ" />
        <Card>
          <EmptyState className="py-10" title="ไม่มีสิทธิ์เข้าหน้านี้" description="หน้าตั้งค่าระบบใช้ได้เฉพาะผู้ดูแลระบบ" />
        </Card>
      </>
    )
  }

  const next = fromDraft(draft)
  const errors = validateSettings(next)
  const dirty = settingDefinitions.some((d) => next[d.key] !== values[d.key])
  const set = (key: SettingKey, value: string) => setDraft((d) => ({ ...d, [key]: value }))

  const submit = () => {
    if (Object.keys(errors).length) return
    const count = save(next, me?.name ?? '-')
    toast.success(`บันทึกแล้ว ${count} ค่า`)
  }

  const columns: DataTableColumn<SettingChange>[] = [
    { key: 'changedAt', label: 'เมื่อ', sortValue: (c) => c.changedAt, render: (c) => formatDateTime(c.changedAt) },
    { key: 'setting', label: 'ค่า', sortValue: (c) => settingByKey(c.key)?.label ?? c.key, render: (c) => settingByKey(c.key)?.label ?? c.key },
    { key: 'from', label: 'จาก', sortValue: (c) => c.from, render: (c) => withUnit(c.key, c.from), headerClassName: 'text-right', cellClassName: 'text-right tabular-nums' },
    { key: 'to', label: 'เป็น', sortValue: (c) => c.to, render: (c) => withUnit(c.key, c.to), headerClassName: 'text-right', cellClassName: 'text-right tabular-nums' },
    { key: 'by', label: 'โดย', sortValue: (c) => c.changedBy, render: (c) => c.changedBy },
  ]

  return (
    <>
      <Topbar title="ตั้งค่าระบบ" subtitle="เกณฑ์ที่ใช้แจ้งเตือนทั้งระบบ ใช้เตือนเท่านั้น ไม่บล็อกการทำงาน และรายงานย้อนหลังคิดใหม่ตามค่าปัจจุบัน" />
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
          {settingGroups.map((g) => (
            <Card key={g.id}>
              <CardHeader title={g.label} subtitle={g.description} />
              <div className="flex flex-col gap-5">
                {settingDefinitions
                  .filter((d) => d.group === g.id)
                  .map((d) => {
                    const changed = next[d.key] !== d.defaultValue
                    return (
                      <div key={d.key} className="flex items-start gap-2">
                        <TextField
                          containerClassName="flex-1"
                          label={`${d.label} (${d.unit})`}
                          type="number"
                          inputMode="decimal"
                          min={d.min}
                          max={d.max}
                          value={draft[d.key]}
                          onChange={(e) => set(d.key, e.target.value)}
                          error={errors[d.key]}
                          hint={d.hint}
                        />
                        {changed && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-8 shrink-0"
                            tooltip={`ค่าเริ่มต้น ${withUnit(d.key, defaultSettings[d.key])}`}
                            onClick={() => set(d.key, String(defaultSettings[d.key]))}
                          >
                            คืนค่าเริ่มต้น
                          </Button>
                        )}
                      </div>
                    )
                  })}
              </div>
            </Card>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" disabled={!dirty} onClick={() => setDraft(toDraft(values))}>
            ยกเลิกการแก้
          </Button>
          <Button disabled={!dirty || Object.keys(errors).length > 0} onClick={submit}>
            บันทึก
          </Button>
        </div>

        <Card>
          <CardHeader title="ประวัติการแก้ค่า" subtitle="เก็บไว้ตรวจสอบเท่านั้น ไม่มีผลกับการคำนวณ" />
          <DataTable
            columns={columns}
            rows={history}
            rowKey={(c) => c.id}
            defaultSort={{ key: 'changedAt', dir: 'desc' }}
            pageSize={10}
            emptyTitle="ยังไม่มีการแก้ค่า"
            emptyDescription="ทุกค่ายังเป็นค่าเริ่มต้น"
          />
        </Card>
      </div>
    </>
  )
}
