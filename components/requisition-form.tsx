'use client'

import { useRouter } from 'next/navigation'

type Props = {
  className?: string
  label?: string
}

export default function RequisitionForm({
  className = 'button',
  label = '+ Nouvelle réquisition',
}: Props) {
  const router = useRouter()

  return (
    <button
      type="button"
      className={className}
      onClick={() =>
        router.push('/requisition?from=backoffice')
      }
    >
      {label}
    </button>
  )
}