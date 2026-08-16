'use client'

import { useRouter } from 'next/navigation'

type Props = {
  requestId: string
  className?: string
  label?: string
}

export default function RequisitionTreatment({
  requestId,
  className = 'button',
  label = 'Traiter la demande',
}: Props) {
  const router = useRouter()

  return (
    <button
      type="button"
      className={className}
      onClick={() =>
        router.push(
          `/bar?request=${encodeURIComponent(
            requestId
          )}&from=backoffice`
        )
      }
    >
      {label}
    </button>
  )
}