'use client'

import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import type { ImportExportSettings } from '@/components/import-export-menu'

export type TabularExportColumn = {
  key: string
  label: string
}

export type TabularExportRow = Record<string, string | number | boolean | null | undefined>

export async function exportTabularData({
  title,
  fileName,
  columns,
  rows,
  settings,
}: {
  title: string
  fileName: string
  columns: TabularExportColumn[]
  rows: TabularExportRow[]
  settings: ImportExportSettings
}) {
  const selectedKeys = new Set(
    settings.selectedColumns.length
      ? settings.selectedColumns
      : columns.map((column) => column.key)
  )
  const selected = columns.filter((column) => selectedKeys.has(column.key))

  const normalizedRows = rows.map((row) => {
    const output: Record<string, string | number | boolean> = {}
    for (const column of selected) {
      const value = row[column.key]
      output[column.label] = value == null ? '' : value
    }
    return output
  })

  const datedName = `${fileName}-${new Date().toISOString().slice(0, 10)}`

  if (settings.format === 'excel') {
    const worksheet = XLSX.utils.json_to_sheet(normalizedRows)
    worksheet['!cols'] = selected.map((column) => ({
      wch: Math.max(14, Math.min(32, column.label.length + 8)),
    }))
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Export')
    XLSX.writeFile(workbook, `${datedName}.xlsx`)
    return
  }

  if (settings.format === 'pdf') {
    const doc = new jsPDF({
      orientation: settings.orientation,
      unit: 'mm',
      format: settings.paperSize,
    })
    let startY = 12
    if (settings.showHeader) {
      doc.setFontSize(15)
      doc.text(title, 10, startY)
      startY += 6
    }
    if (settings.showDate) {
      doc.setFontSize(8)
      doc.text(`Édité le ${new Date().toLocaleDateString('fr-FR')}`, 10, startY)
      startY += 5
    }
    autoTable(doc, {
      startY: startY + 1,
      head: [selected.map((column) => column.label)],
      body: rows.map((row) => selected.map((column) => String(row[column.key] ?? ''))),
      styles: {
        fontSize: Math.max(5, settings.fontSize),
        cellPadding: 1.4,
        overflow: 'linebreak',
      },
      margin: { left: 7, right: 7 },
    })
    doc.save(`${datedName}.pdf`)
    return
  }

  const popup = window.open('', '_blank', 'width=1200,height=900')
  if (!popup) {
    window.alert("Impossible d'ouvrir la fenêtre d'impression.")
    return
  }

  const escapeHtml = (value: unknown) =>
    String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;')

  const headerHtml = settings.showHeader
    ? `<h1>${escapeHtml(title)}</h1>`
    : ''
  const dateHtml = settings.showDate
    ? `<div class="date">Édité le ${new Date().toLocaleDateString('fr-FR')}</div>`
    : ''

  popup.document.write(`<!doctype html>
<html lang="fr"><head><meta charset="utf-8"/><title>${escapeHtml(title)}</title>
<style>
@page { size: ${settings.paperSize.toUpperCase()} ${settings.orientation}; margin: 9mm; }
*{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:0;zoom:${settings.scale === 'fit' ? 1 : Number(settings.scale)/100}}
h1{font-size:18px;margin:0 0 4px}.date{font-size:9px;margin-bottom:8px;color:#555}table{width:100%;border-collapse:collapse;font-size:${settings.fontSize}px}th,td{border:1px solid #aaa;padding:3px 4px;text-align:left;vertical-align:top;overflow-wrap:anywhere}th{background:#f2f4f7;font-weight:700}tr{break-inside:avoid}
</style></head><body>${headerHtml}${dateHtml}<table><thead><tr>${selected.map((c)=>`<th>${escapeHtml(c.label)}</th>`).join('')}</tr></thead><tbody>${rows.map((row)=>`<tr>${selected.map((c)=>`<td>${escapeHtml(row[c.key])}</td>`).join('')}</tr>`).join('')}</tbody></table><script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}</script></body></html>`)
  popup.document.close()
}
