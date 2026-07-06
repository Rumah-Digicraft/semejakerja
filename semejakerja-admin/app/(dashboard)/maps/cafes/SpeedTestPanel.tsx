'use client'

import { useMemo } from 'react'
import type { SpeedTest } from '@/types'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Gauge, Wifi } from 'lucide-react'

interface SpeedTestPanelProps {
  tests: SpeedTest[]
  onUseAverage: (avgDownload: number) => void
}

export default function SpeedTestPanel({ tests, onUseAverage }: SpeedTestPanelProps) {
  const stats = useMemo(() => {
    if (tests.length === 0) return null
    const downs = tests.map(t => Number(t.download_mbps)).filter(n => !Number.isNaN(n))
    const ups = tests.map(t => Number(t.upload_mbps)).filter(n => !Number.isNaN(n))
    const lats = tests.map(t => (t.latency_ms == null ? NaN : Number(t.latency_ms))).filter(n => !Number.isNaN(n))
    const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)
    const sortedDown = [...downs].sort((a, b) => a - b)
    const median = sortedDown.length
      ? sortedDown.length % 2
        ? sortedDown[(sortedDown.length - 1) / 2]
        : (sortedDown[sortedDown.length / 2 - 1] + sortedDown[sortedDown.length / 2]) / 2
      : 0
    return {
      count: tests.length,
      avgDown: avg(downs),
      avgUp: avg(ups),
      avgLat: lats.length ? avg(lats) : null,
      medianDown: median,
      last: tests[0]?.created_at,
    }
  }, [tests])

  const chartData = useMemo(
    () =>
      [...tests]
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map(t => ({
          date: new Date(t.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
          down: Math.round(Number(t.download_mbps) * 10) / 10,
          up: Math.round(Number(t.upload_mbps) * 10) / 10,
        })),
    [tests]
  )

  if (!stats) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center">
        <Gauge className="mx-auto text-slate-300 mb-2" size={28} />
        <p className="text-sm text-slate-500">Belum ada speedtest komunitas untuk kafe ini.</p>
        <p className="text-xs text-slate-400 mt-1">Hasil tes dari peta publik akan muncul di sini.</p>
      </div>
    )
  }

  const tiles = [
    { label: 'Jumlah Tes', value: String(stats.count) },
    { label: 'Rata-rata Down', value: `${stats.avgDown.toFixed(1)} Mbps` },
    { label: 'Rata-rata Up', value: `${stats.avgUp.toFixed(1)} Mbps` },
    { label: 'Median Down', value: `${stats.medianDown.toFixed(1)} Mbps` },
    { label: 'Latency', value: stats.avgLat != null ? `${Math.round(stats.avgLat)} ms` : '—' },
    {
      label: 'Tes Terakhir',
      value: stats.last
        ? new Date(stats.last).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
        : '—',
    },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {tiles.map(tile => (
          <div key={tile.label} className="bg-slate-50 rounded-xl px-3 py-2.5">
            <p className="text-[11px] text-slate-500">{tile.label}</p>
            <p className="text-sm font-bold text-slate-800">{tile.value}</p>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onUseAverage(Math.round(stats.avgDown * 10) / 10)}
        className="flex items-center gap-2 text-sm font-medium text-purple-600 hover:text-purple-500 transition"
      >
        <Wifi size={15} /> Pakai rata-rata ({stats.avgDown.toFixed(1)} Mbps) sebagai WiFi Speed
      </button>

      {chartData.length > 1 && (
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="downFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#9333ea" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#9333ea" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} unit=" Mbps" width={80} />
              <Tooltip
                formatter={(value, name) => [`${value ?? '—'} Mbps`, name === 'down' ? 'Download' : 'Upload']}
                contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
              />
              <Area type="monotone" dataKey="down" stroke="#9333ea" strokeWidth={2} fill="url(#downFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="text-slate-400">
            <tr>
              <th className="py-1.5 pr-3 font-medium">Tanggal</th>
              <th className="py-1.5 pr-3 font-medium">Down</th>
              <th className="py-1.5 pr-3 font-medium">Up</th>
              <th className="py-1.5 pr-3 font-medium">Latency</th>
              <th className="py-1.5 font-medium">Jarak</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-slate-600">
            {tests.slice(0, 10).map(t => (
              <tr key={t.id}>
                <td className="py-1.5 pr-3">
                  {new Date(t.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="py-1.5 pr-3 font-medium">{Number(t.download_mbps).toFixed(1)} Mbps</td>
                <td className="py-1.5 pr-3">{Number(t.upload_mbps).toFixed(1)} Mbps</td>
                <td className="py-1.5 pr-3">{t.latency_ms != null ? `${Math.round(Number(t.latency_ms))} ms` : '—'}</td>
                <td className="py-1.5">{Math.round(Number(t.distance_m))} m</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
