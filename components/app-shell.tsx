'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { UserMenu } from '@/components/user-menu'
import {
  useInventories,
  useOrders,
  useProducts,
  useRequests,
  useStockMovements,
} from '@/lib/store'

type ViewMode =
  | 'auto'
  | 'phone'
  | 'tablet'
  | 'pc'

type NavItem = {
  href: string
  label: string
  icon: string
}

type NavGroup = {
  label: string
  icon: string
  items: NavItem[]
}