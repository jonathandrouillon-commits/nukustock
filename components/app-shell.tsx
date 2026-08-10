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

const mobileMainItems = [
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
          aria-label="Fermer le menu"
          className="sidebarOverlay"
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
            className="sidebarClose"
            type="button"
            aria-label="Fermer le menu"
            onClick={() =>
              setTabletSidebarOpen(false)
            }
          >
            ×
          </button>
        </div>

        <nav className="sidebarNav">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
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
                className="sidebarIcon"
                aria-hidden="true"
              >
                {item.icon}
              </span>

              <span>
                {item.label}
              </span>
            </Link>
          ))}
        </nav>

        <div className="sidebarFoot">
          <strong>NukuStock</strong>
          <span>
            Gestion des stocks Nukutepipi
          </span>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbarLeft">
            <button
              className="tabletMenuButton"
              type="button"
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
            mobileMainItems.includes(
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
                  : undefined
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
            setMobileMenuOpen(
              (current) =>
                !current
            )
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
        <>
          <button
            type="button"
            aria-label="Fermer le menu"
            className="mobileMenuOverlay"
            onClick={() =>
              setMobileMenuOpen(false)
            }
          />

          <div className="mobileMenuSheet">
            <div className="mobileMenuHandle" />

            <div className="mobileMenuHead">
              <div>
                <strong>
                  Menu NukuStock
                </strong>

                <span>
                  Tous les modules
                </span>
              </div>

              <button
                type="button"
                aria-label="Fermer"
                className="mobileMenuClose"
                onClick={() =>
                  setMobileMenuOpen(false)
                }
              >
                ×
              </button>
            </div>

            <div className="mobileMenuGrid">
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
                        : undefined
                    }
                  >
                    <span
                      className="mobileMenuIcon"
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
            </div>
          </div>
        </>
      )}

      <style jsx global>{`
        html,
        body {
          max-width: 100%;
          overflow-x: hidden;
        }

        body {
          margin: 0;
        }

        .appShellRoot {
          min-height: 100vh;
          background: #f4f6f9;
        }

        .sidebar {
          position: fixed;
          inset: 0 auto 0 0;
          width: 208px;
          background: #0c1525;
          color: #fff;
          z-index: 60;
          display: flex;
          flex-direction: column;
          transition: transform 0.22s ease;
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
          border-radius: 12px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          font-size: 17px;
          font-weight: 900;
          background: #e8edf5;
          color: #0c1525;
        }

        .brandText {
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .brandText strong {
          font-size: 14px;
          line-height: 1.2;
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
          cursor: pointer;
        }

        .sidebarNav {
          flex: 1;
          overflow-y: auto;
          padding: 14px 10px;
        }

        .sidebarNav a {
          min-height: 42px;
          margin-bottom: 3px;
          padding: 0 12px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: #91a0b6;
          font-size: 13px;
          font-weight: 600;
          transition: .15s ease;
        }

        .sidebarNav a:hover {
          background: rgba(255,255,255,.06);
          color: #fff;
        }

        .sidebarNav a.active {
          background: #17243a;
          color: #fff;
        }

        .sidebarIcon {
          width: 18px;
          display: inline-flex;
          justify-content: center;
          flex-shrink: 0;
        }

        .sidebarFoot {
          padding: 16px;
          border-top: 1px solid rgba(255,255,255,.08);
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .sidebarFoot strong {
          font-size: 12px;
        }

        .sidebarFoot span {
          color: #728097;
          font-size: 10px;
          line-height: 1.35;
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
          background: rgba(255,255,255,.96);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid #e7eaf0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
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
          gap: 14px;
          flex-shrink: 0;
        }

        .topbarTitle {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .topbarTitle .eyebrow {
          color: #9aa4b2;
          font-size: 10px;
          letter-spacing: .08em;
          font-weight: 800;
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
          color: #111827;
          font-size: 20px;
          cursor: pointer;
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
          min-width: 0;
        }

        .mobileNav,
        .mobileMenuSheet,
        .mobileMenuOverlay,
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
            border: 0;
            background: rgba(10,18,30,.34);
            z-index: 55;
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

          .pageContent {
            width: 100%;
          }
        }

        @media (max-width: 767px) {
          .appShellRoot {
            padding-bottom: calc(76px + env(safe-area-inset-bottom));
          }

          .sidebar,
          .sidebarOverlay {
            display: none !important;
          }

          .main {
            margin-left: 0;
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
            width: 64px;
            height: 34px;
            border-radius: 7px;
          }

          .topbarRight {
            gap: 7px;
          }

          .pageContent {
            width: 100%;
            min-width: 0;
          }

          .pageContent > * {
            max-width: 100%;
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

          .pageContent .modalBackdrop {
            align-items: flex-end !important;
            padding: 0 !important;
          }

          .pageContent .modal {
            width: 100% !important;
            max-width: none !important;
            max-height: 92dvh !important;
            margin: 0 !important;
            border-radius: 20px 20px 0 0 !important;
            overflow-y: auto !important;
            padding-bottom:
              calc(20px + env(safe-area-inset-bottom)) !important;
          }

          .pageContent .tableWrap {
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch;
            max-width: calc(100vw - 24px);
          }

          .pageContent table {
            font-size: 12px;
          }

          .pageContent .button,
          .pageContent button,
          .pageContent input,
          .pageContent select,
          .pageContent textarea {
            font-size: 16px;
          }

          .mobileNav {
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 80;
            height: calc(66px + env(safe-area-inset-bottom));
            padding-bottom: env(safe-area-inset-bottom);
            background: rgba(255,255,255,.98);
            backdrop-filter: blur(16px);
            border-top: 1px solid #e6e9ef;
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            box-shadow: 0 -8px 30px rgba(15,23,42,.08);
          }

          .mobileNav a,
          .mobileNav button {
            border: 0;
            background: transparent;
            color: #7c8797;
            text-decoration: none;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 4px;
            min-width: 0;
            font-family: inherit;
            cursor: pointer;
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
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-size: 9px;
            font-weight: 700;
          }

          .mobileMenuOverlay {
            display: block;
            position: fixed;
            inset: 0;
            z-index: 85;
            border: 0;
            background: rgba(8,15,27,.48);
          }

          .mobileMenuSheet {
            display: block;
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 90;
            max-height: 82dvh;
            overflow-y: auto;
            padding:
              10px 16px
              calc(22px + env(safe-area-inset-bottom));
            background: #fff;
            border-radius: 24px 24px 0 0;
            box-shadow: 0 -24px 60px rgba(0,0,0,.2);
          }

          .mobileMenuHandle {
            width: 44px;
            height: 5px;
            margin: 0 auto 14px;
            border-radius: 999px;
            background: #d5dae1;
          }

          .mobileMenuHead {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 15px;
          }

          .mobileMenuHead > div {
            display: flex;
            flex-direction: column;
          }

          .mobileMenuHead strong {
            font-size: 18px;
          }

          .mobileMenuHead span {
            margin-top: 2px;
            color: #7b8493;
            font-size: 11px;
          }

          .mobileMenuClose {
            width: 42px;
            height: 42px;
            border: 1px solid #e4e7ec;
            border-radius: 12px;
            background: #fff;
            font-size: 24px;
            cursor: pointer;
          }

          .mobileMenuGrid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0,1fr));
            gap: 9px;
          }

          .mobileMenuGrid a {
            min-height: 64px;
            padding: 10px 12px;
            border: 1px solid #e8ebf0;
            border-radius: 14px;
            color: #344054;
            text-decoration: none;
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 12px;
            font-weight: 700;
          }

          .mobileMenuGrid a.active {
            color: #0c1525;
            border-color: #cbd5e1;
            background: #f2f5f9;
          }

          .mobileMenuIcon {
            width: 31px;
            height: 31px;
            flex: 0 0 auto;
            display: grid;
            place-items: center;
            border-radius: 9px;
            background: #f2f4f7;
          }
        }

        @media (max-width: 390px) {
          .topbarTitle strong {
            max-width: 130px;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .nukutepipiLogoWrap {
            width: 54px;
          }

          .mobileMenuGrid {
            gap: 7px;
          }

          .mobileMenuGrid a {
            padding-inline: 9px;
            font-size: 11px;
          }
        }
      `}</style>
    </div>
  )
}

export default AppShell