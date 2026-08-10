'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { UserMenu } from '@/components/user-menu'

type NavItem = {
  href: string
  label: string
  icon: string
}

const navItems: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: '⌂' },
  { href: '/products', label: 'Produits', icon: '▣' },
  { href: '/stocks', label: 'Stocks', icon: '▤' },
  { href: '/locations', label: 'Lieux de stockage', icon: '⌖' },
  { href: '/movements', label: 'Mouvements', icon: '↕' },
  { href: '/requests', label: 'Réquisitions', icon: '☷' },
  { href: '/orders', label: 'Commandes', icon: '▧' },
  { href: '/transfers', label: 'Transferts', icon: '⇄' },
  { href: '/inventory', label: 'Inventaires', icon: '☑' },
  { href: '/suppliers', label: 'Fournisseurs', icon: '◇' },
  { href: '/import', label: 'Import / Export', icon: '⇅' },
  { href: '/labels', label: 'Étiquettes', icon: '▦' },
  { href: '/reports', label: 'Rapports', icon: '▥' },
  { href: '/setup', label: 'SET UP', icon: '◫' },
  { href: '/settings', label: 'Réglages', icon: '⚙' },
]

function isActive(
  pathname: string,
  href: string
) {
  if (href === '/') {
    return pathname === '/'
  }

  return (
    pathname === href ||
    pathname.startsWith(
      `${href}/`
    )
  )
}

function AppShell({
  children,
}: {
  children: ReactNode
}) {
  const pathname =
    usePathname()

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark">
            N
          </div>

          <div>
            <strong>
              NukuStock
            </strong>
            <span>
              Nukutepipi
            </span>
          </div>
        </div>

        <nav>
          {navItems.map(
            (item) => (
              <Link
                key={
                  item.href
                }
                href={
                  item.href
                }
                className={
                  isActive(
                    pathname,
                    item.href
                  )
                    ? 'active'
                    : undefined
                }
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 18,
                    display:
                      'inline-flex',
                    justifyContent:
                      'center',
                    flexShrink: 0,
                  }}
                >
                  {
                    item.icon
                  }
                </span>

                <span>
                  {
                    item.label
                  }
                </span>
              </Link>
            )
          )}
        </nav>

        <div className="sidebarFoot">
          <strong>
            NukuStock
          </strong>
          <span>
            Gestion des stocks Nukutepipi
          </span>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <span className="eyebrow">
              NUKUTEPIPI
            </span>

            <strong
              style={{
                fontSize: 14,
                marginTop: 2,
                whiteSpace:
                  'nowrap',
              }}
            >
              Gestion des stocks
            </strong>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems:
                'center',
              gap: 14,
            }}
          >
            <div
              className="nukutepipiLogoWrap"
              style={{
                width: 110,
                height: 52,
                display: 'grid',
                placeItems:
                  'center',
                overflow:
                  'hidden',
                borderRadius:
                  10,
                background:
                  '#fff',
              }}
            >
              <img
                src="/images/nukutepipi.jpg"
                alt="Nukutepipi"
                style={{
                  maxWidth:
                    '100%',
                  maxHeight:
                    '100%',
                  objectFit:
                    'contain',
                }}
              />
            </div>

            <UserMenu />
          </div>
        </header>

        {children}
      </main>

      <nav className="mobileNav">
        {navItems
          .filter(
            (item) =>
              [
                '/',
                '/products',
                '/stocks',
                '/requests',
                '/settings',
              ].includes(
                item.href
              )
          )
          .map(
            (item) => (
              <Link
                key={
                  item.href
                }
                href={
                  item.href
                }
                className={
                  isActive(
                    pathname,
                    item.href
                  )
                    ? 'active'
                    : undefined
                }
              >
                <span
                  aria-hidden="true"
                  style={{
                    fontSize: 17,
                  }}
                >
                  {
                    item.icon
                  }
                </span>

                <span>
                  {
                    item.label
                  }
                </span>
              </Link>
            )
          )}
      </nav>

      <style jsx global>{`
        @media (max-width: 760px) {
          .nukutepipiLogoWrap {
            width: 72px !important;
            height: 40px !important;
          }

          .topbar .eyebrow {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}

export {
  AppShell,
}

export default AppShell