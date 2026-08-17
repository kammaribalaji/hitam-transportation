import React from 'react'
import { QRCodeSVG } from 'qrcode.react'

/**
 * Real, scannable QR code. The pass data string (booking/pass info) is encoded
 * in the QR, so a standard QR scanner can read it.
 */
export default function QRCode({ data = '', size = 140 }) {
  return (
    <div style={{ width: size, height: size, background: '#fff', borderRadius: 10, padding: 8, border: '2px solid #e5e7eb', display: 'inline-block' }}>
      <QRCodeSVG value={data || 'HITAM-EMPTY'} size={size - 16} level="M" bgColor="#ffffff" fgColor="#111111" />
    </div>
  )
}
