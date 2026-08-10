'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { UserMenu } from '@/components/user-menu'

type NavItem = {
  href: string
  label: string
  icon: string
  group:
    | 'Stock'
    | 'Opérations'
    | 'Inventaires'
    | 'Administration'
}

const navItems: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: '⌂', group: 'Stock' },
  { href: '/products', label: 'Produits', icon: '▣', group: 'Stock' },
  { href: '/stocks', label: 'Stocks', icon: '▤', group: 'Stock' },
  { href: '/locations', label: 'Lieux de stockage', icon: '⌖', group: 'Stock' },
  { href: '/movements', label: 'Mouvements', icon: '↕', group: 'Stock' },

  { href: '/requests', label: 'Réquisitions', icon: '☷', group: 'Opérations' },
  { href: '/orders', label: 'Commandes', icon: '▧', group: 'Opérations' },
  { href: '/transfers', label: 'Transferts', icon: '⇄', group: 'Opérations' },

  { href: '/inventory', label: 'Inventaires', icon: '☑', group: 'Inventaires' },
  { href: '/reports', label: 'Rapports', icon: '▥', group: 'Inventaires' },

  { href: '/suppliers', label: 'Fournisseurs', icon: '◇', group: 'Administration' },
  { href: '/import', label: 'Import / Export', icon: '⇅', group: 'Administration' },
  { href: '/labels', label: 'Étiquettes', icon: '▦', group: 'Administration' },
  { href: '/setup', label: 'SET UP', icon: '◫', group: 'Administration' },
  { href: '/settings', label: 'Réglages', icon: '⚙', group: 'Administration' },
]

const groups: NavItem['group'][] = [
  'Stock',
  'Opérations',
  'Inventaires',
  'Administration',
]

const mobileQuickLinks = [
  '/',
  '/stocks',
  '/requests',
  '/inventory',
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
    pathname.startsWith(`${href}/`)
  )
}

export function AppShell({
  children,
}: {
  children: ReactNode
}) {
  const pathname = usePathname()

  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false)

  const [tabletSidebarOpen, setTabletSidebarOpen] =
    useState(false)

  useEffect(() => {
    setMobileMenuOpen(false)
    setTabletSidebarOpen(false)
  }, [pathname])

  return (
    <div className="appShellRoot">
      {tabletSidebarOpen && (
        <button
          type="button"
          className="sidebarOverlay"
          aria-label="Fermer le menu"
          onClick={() =>
            setTabletSidebarOpen(false)
          }
        />
      )}

      <aside
        className={`sidebar ${
          tabletSidebarOpen
            ? 'sidebarOpen'
            : ''
        }`}
      >
        <div className="sidebarBrand">
          <div className="brandMark">
            N
          </div>

          <div className="brandText">
            <strong>NukuStock</strong>
            <span>Nukutepipi</span>
          </div>

          <button
            type="button"
            className="sidebarClose"
            aria-label="Fermer"
            onClick={() =>
              setTabletSidebarOpen(false)
            }
          >
            ×
          </button>
        </div>

        <nav className="sidebarNav">
          {navItems.map(
            (item) => (
              <Link
                key={item.href}
                href={item.href}
                className={
                  isActive(
                    pathname,
                    item.href
                  )
                    ? 'active'
                    : ''
                }
              >
                <span
                  className="sidebarIcon"
                  aria-hidden="true"
                >
                  {item.icon}
                </span>

                <span>
                  {item.label}
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
          <div className="topbarLeft">
            <button
              type="button"
              className="tabletMenuButton"
              aria-label="Ouvrir le menu"
              onClick={() =>
                setTabletSidebarOpen(true)
              }
            >
              ☰
            </button>

            <div className="topbarTitle">
              <span className="eyebrow">
                NUKUTEPIPI
              </span>

              <strong>
                Gestion des stocks
              </strong>
            </div>
          </div>

          <div className="topbarRight">
            <div className="nukutepipiLogoWrap">
              <img
                src="/images/nukutepipi.jpg"
                alt="Nukutepipi"
              />
            </div>

            <UserMenu />
          </div>
        </header>

        <div className="pageContent">
          {children}
        </div>
      </main>

      <nav className="mobileNav">
        {navItems
          .filter((item) =>
            mobileQuickLinks.includes(
              item.href
            )
          )
          .map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={
                isActive(
                  pathname,
                  item.href
                )
                  ? 'active'
                  : ''
              }
            >
              <span
                className="mobileNavIcon"
                aria-hidden="true"
              >
                {item.icon}
              </span>

              <span className="mobileNavLabel">
                {item.label}
              </span>
            </Link>
          ))}

        <button
          type="button"
          className={
            mobileMenuOpen
              ? 'active'
              : ''
          }
          onClick={() =>
            setMobileMenuOpen(true)
          }
        >
          <span
            className="mobileNavIcon"
            aria-hidden="true"
          >
            ☰
          </span>

          <span className="mobileNavLabel">
            Menu
          </span>
        </button>
      </nav>

      {mobileMenuOpen && (
        <div className="mobileMenuScreen">
          <div className="mobileMenuTopbar">
            <div>
              <span>
                NUKUTEPIPI
              </span>

              <strong>
                Menu NukuStock
              </strong>
            </div>

            <button
              type="button"
              aria-label="Fermer"
              onClick={() =>
                setMobileMenuOpen(false)
              }
            >
              ×
            </button>
          </div>

          <div className="mobileMenuBody">
            {groups.map(
              (group) => (
                <section
                  key={group}
                  className="mobileMenuGroup"
                >
                  <h3>
                    {group}
                  </h3>

                  <div className="mobileMenuGrid">
                    {navItems
                      .filter(
                        (item) =>
                          item.group ===
                          group
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
                                : ''
                            }
                          >
                            <span
                              className="mobileMenuIcon"
                              aria-hidden="true"
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
                  </div>
                </section>
              )
            )}
          </div>
        </div>
      )}

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
        }

        .appShellRoot {
          min-height: 100vh;
          background: #f4f6f9;
        }

        .sidebar {
          position: fixed;
          inset: 0 auto 0 0;
          width: 208px;
          z-index: 60;
          display: flex;
          flex-direction: column;
          background: #0c1525;
          color: #fff;
          transition: transform .2s ease;
        }

        .sidebarBrand {
          min-height: 80px;
          padding: 18px 16px;
          display: flex;
          align-items: center;
          gap: 11px;
          border-bottom: 1px solid rgba(255,255,255,.08);
        }

        .brandMark {
          width: 38px;
          height: 38px;
          flex: 0 0 auto;
          border-radius: 12px;
          display: grid;
          place-items: center;
          background: #e8edf5;
          color: #0c1525;
          font-weight: 900;
        }

        .brandText {
          display: flex;
          flex-direction: column;
        }

        .brandText strong {
          font-size: 14px;
        }

        .brandText span {
          margin-top: 3px;
          color: #7f8ca3;
          font-size: 11px;
        }

        .sidebarClose {
          display: none;
          margin-left: auto;
          width: 36px;
          height: 36px;
          border: 0;
          border-radius: 10px;
          background: rgba(255,255,255,.08);
          color: #fff;
          font-size: 23px;
        }

        .sidebarNav {
          flex: 1;
          overflow-y: auto;
          padding: 14px 10px;
        }

        .sidebarNav a {
          min-height: 42px;
          padding: 0 12px;
          margin-bottom: 3px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          gap: 10px;
          color: #91a0b6;
          text-decoration: none;
          font-size: 13px;
          font-weight: 600;
        }

        .sidebarNav a.active {
          background: #17243a;
          color: #fff;
        }

        .sidebarIcon {
          width: 18px;
          display: inline-flex;
          justify-content: center;
          flex: 0 0 auto;
        }

        .sidebarFoot {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 3px;
          border-top: 1px solid rgba(255,255,255,.08);
        }

        .sidebarFoot span {
          color: #728097;
          font-size: 10px;
        }

        .main {
          min-height: 100vh;
          margin-left: 208px;
        }

        .topbar {
          position: sticky;
          top: 0;
          z-index: 40;
          height: 78px;
          padding: 0 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          background: rgba(255,255,255,.96);
          border-bottom: 1px solid #e7eaf0;
          backdrop-filter: blur(12px);
        }

        .topbarLeft,
        .topbarRight {
          display: flex;
          align-items: center;
        }

        .topbarLeft {
          min-width: 0;
          gap: 12px;
        }

        .topbarRight {
          flex: 0 0 auto;
          gap: 14px;
        }

        .topbarTitle {
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .topbarTitle .eyebrow {
          color: #9aa4b2;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .08em;
        }

        .topbarTitle strong {
          margin-top: 2px;
          font-size: 14px;
          white-space: nowrap;
        }

        .tabletMenuButton {
          display: none;
          width: 42px;
          height: 42px;
          border: 1px solid #e4e7ec;
          border-radius: 12px;
          background: #fff;
          font-size: 20px;
        }

        .nukutepipiLogoWrap {
          width: 110px;
          height: 52px;
          display: grid;
          place-items: center;
          overflow: hidden;
          border-radius: 10px;
          background: #fff;
        }

        .nukutepipiLogoWrap img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        .pageContent {
          width: 100%;
          min-width: 0;
        }

        .mobileNav,
        .mobileMenuScreen,
        .sidebarOverlay {
          display: none;
        }

        @media (max-width: 1199px) {
          .sidebar {
            width: 260px;
            transform: translateX(-100%);
            box-shadow: 18px 0 50px rgba(0,0,0,.18);
          }

          .sidebar.sidebarOpen {
            transform: translateX(0);
          }

          .sidebarClose {
            display: grid;
            place-items: center;
          }

          .sidebarOverlay {
            display: block;
            position: fixed;
            inset: 0;
            z-index: 55;
            border: 0;
            background: rgba(10,18,30,.34);
          }

          .main {
            margin-left: 0;
          }

          .tabletMenuButton {
            display: grid;
            place-items: center;
          }

          .topbar {
            padding-inline: 20px;
          }
        }

        @media (max-width: 767px) {
          html,
          body,
          .appShellRoot,
          .main,
          .pageContent {
            width: 100% !important;
            max-width: 100vw !important;
            min-width: 0 !important;
            overflow-x: hidden !important;
          }

          .appShellRoot {
            padding-bottom:
              calc(72px + env(safe-area-inset-bottom));
          }

          .sidebar,
          .sidebarOverlay {
            display: none !important;
          }

          .main {
            margin-left: 0 !important;
          }

          .topbar {
            height: 62px;
            padding: 0 12px;
          }

          .tabletMenuButton {
            display: none;
          }

          .topbarTitle .eyebrow {
            display: none;
          }

          .topbarTitle strong {
            font-size: 13px;
          }

          .nukutepipiLogoWrap {
            width: 62px;
            height: 34px;
            border-radius: 7px;
          }

          .topbarRight {
            gap: 7px;
          }

          .pageContent,
          .pageContent > * {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
          }

          .pageContent .toolbar {
            display: grid !important;
            grid-template-columns: 1fr !important;
            gap: 8px !important;
          }

          .pageContent .toolbar > * {
            width: 100% !important;
            min-width: 0 !important;
          }

          .pageContent .formGrid {
            grid-template-columns: 1fr !important;
          }

          .pageContent .tableWrap {
            max-width: calc(100vw - 24px);
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch;
          }

          .pageContent input,
          .pageContent select,
          .pageContent textarea,
          .pageContent button {
            font-size: 16px;
          }

          .mobileNav {
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 80;
            width: 100vw;
            max-width: 100vw;
            height:
              calc(66px + env(safe-area-inset-bottom));
            padding-bottom:
              env(safe-area-inset-bottom);
            display: grid;
            grid-template-columns:
              repeat(5, minmax(0,1fr));
            background: rgba(255,255,255,.98);
            border-top: 1px solid #e6e9ef;
            box-shadow: 0 -8px 30px rgba(15,23,42,.08);
            backdrop-filter: blur(16px);
          }

          .mobileNav a,
          .mobileNav button {
            width: 100%;
            min-width: 0;
            border: 0;
            background: transparent;
            color: #7c8797;
            text-decoration: none;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 4px;
            font-family: inherit;
          }

          .mobileNav a.active,
          .mobileNav button.active {
            color: #0c1525;
          }

          .mobileNavIcon {
            font-size: 18px;
            line-height: 1;
          }

          .mobileNavLabel {
            width: 100%;
            padding: 0 2px;
            text-align: center;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-size: 9px;
            font-weight: 700;
          }

          .mobileMenuScreen {
            position: fixed;
            inset: 0;
            z-index: 100;
            width: 100vw;
            height: 100dvh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            background: #f4f6f9;
          }

          .mobileMenuTopbar {
            flex: 0 0 auto;
            min-height: 72px;
            padding:
              calc(10px + env(safe-area-inset-top))
              16px
              10px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            background: #fff;
            border-bottom: 1px solid #e7eaf0;
          }

          .mobileMenuTopbar > div {
            display: flex;
            flex-direction: column;
          }

          .mobileMenuTopbar span {
            color: #98a2b3;
            font-size: 9px;
            font-weight: 800;
            letter-spacing: .08em;
          }

          .mobileMenuTopbar strong {
            margin-top: 2px;
            font-size: 19px;
          }

          .mobileMenuTopbar button {
            width: 44px;
            height: 44px;
            border: 1px solid #e4e7ec;
            border-radius: 12px;
            background: #fff;
            font-size: 25px;
          }

          .mobileMenuBody {
            flex: 1;
            overflow-y: auto;
            padding:
              16px
              14px
              calc(24px + env(safe-area-inset-bottom));
          }

          .mobileMenuGroup {
            margin-bottom: 22px;
          }

          .mobileMenuGroup h3 {
            margin: 0 0 10px;
            color: #667085;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: .05em;
          }

          .mobileMenuGrid {
            display: grid;
            grid-template-columns:
              repeat(2, minmax(0,1fr));
            gap: 10px;
          }

          .mobileMenuGrid a {
            min-width: 0;
            min-height: 76px;
            padding: 12px;
            border: 1px solid #e5e9f0;
            border-radius: 16px;
            display: flex;
            align-items: center;
            gap: 10px;
            background: #fff;
            color: #344054;
            text-decoration: none;
            font-size: 12px;
            font-weight: 700;
            box-shadow: 0 1px 2px rgba(16,24,40,.03);
          }

          .mobileMenuGrid a.active {
            border-color: #b8c3d4;
            background: #eef3f8;
            color: #0c1525;
          }

          .mobileMenuIcon {
            width: 36px;
            height: 36px;
            flex: 0 0 auto;
            display: grid;
            place-items: center;
            border-radius: 11px;
            background: #f2f4f7;
            font-size: 17px;
          }
        }

        @media (max-width: 390px) {
          .mobileMenuGrid {
            gap: 8px;
          }

          .mobileMenuGrid a {
            min-height: 72px;
            padding: 10px;
            font-size: 11px;
          }

          .mobileMenuIcon {
            width: 33px;
            height: 33px;
          }
        }
      `}</style>
    </div>
  )
}

export default AppShell