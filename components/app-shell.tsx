'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { UserMenu } from '@/components/user-menu'

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

const VIEW_MODE_KEY = 'nukustock_view_mode'

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

function getAutoResolved():
  Exclude<ViewMode, 'auto'> {
  if (
    typeof window ===
    'undefined'
  ) {
    return 'pc'
  }

  if (window.innerWidth <= 767) {
    return 'phone'
  }

  if (window.innerWidth <= 1199) {
    return 'tablet'
  }

  return 'pc'
}

export function AppShell({
  children,
}: {
  children: ReactNode
}) {
  const pathname = usePathname()

  const [
    viewMode,
    setViewMode,
  ] = useState<ViewMode>('auto')

  const [
    resolvedAuto,
    setResolvedAuto,
  ] =
    useState<
      Exclude<ViewMode, 'auto'>
    >('pc')

  const [
    selectorOpen,
    setSelectorOpen,
  ] = useState(false)

  const [
    tabletMenuOpen,
    setTabletMenuOpen,
  ] = useState(false)

  const [
    mobileMenuOpen,
    setMobileMenuOpen,
  ] = useState(false)

  const effectiveMode =
    viewMode === 'auto'
      ? resolvedAuto
      : viewMode

  const rootClass = useMemo(
    () =>
      `nukuShell view-${effectiveMode}`,
    [effectiveMode]
  )

  useEffect(() => {
    const saved =
      window.localStorage.getItem(
        VIEW_MODE_KEY
      )

    if (
      saved === 'auto' ||
      saved === 'phone' ||
      saved === 'tablet' ||
      saved === 'pc'
    ) {
      setViewMode(saved)
    }

    const handleResize = () => {
      setResolvedAuto(
        getAutoResolved()
      )
    }

    handleResize()

    window.addEventListener(
      'resize',
      handleResize
    )

    return () => {
      window.removeEventListener(
        'resize',
        handleResize
      )
    }
  }, [])

  useEffect(() => {
    setSelectorOpen(false)
    setTabletMenuOpen(false)
    setMobileMenuOpen(false)
  }, [pathname])

  const chooseView = (
    mode: ViewMode
  ) => {
    setViewMode(mode)

    window.localStorage.setItem(
      VIEW_MODE_KEY,
      mode
    )

    setSelectorOpen(false)
    setTabletMenuOpen(false)
    setMobileMenuOpen(false)
  }

  const modeLabel = {
    auto: 'Automatique',
    phone: 'Téléphone',
    tablet: 'Tablette',
    pc: 'PC',
  }[viewMode]

  return (
    <div className={rootClass}>
      {tabletMenuOpen && (
        <button
          type="button"
          className="tabletOverlay"
          aria-label="Fermer le menu"
          onClick={() =>
            setTabletMenuOpen(false)
          }
        />
      )}

      <aside
        className={`sidebar ${
          tabletMenuOpen
            ? 'tabletOpen'
            : ''
        }`}
      >
        <div className="sidebarBrand">
          <div className="brandMark">
            N
          </div>

          <div className="brandText">
            <strong>
              NukuStock
            </strong>
            <span>
              Nukutepipi
            </span>
          </div>

          <button
            type="button"
            className="tabletClose"
            aria-label="Fermer"
            onClick={() =>
              setTabletMenuOpen(false)
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
                setTabletMenuOpen(true)
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
            <div className="viewSelector">
              <button
                type="button"
                className="viewSelectorButton"
                onClick={() =>
                  setSelectorOpen(
                    (open) => !open
                  )
                }
              >
                <span>
                  Écran
                </span>
                <strong>
                  {modeLabel}
                </strong>
                <b>⌄</b>
              </button>

              {selectorOpen && (
                <div className="viewSelectorMenu">
                  <button
                    type="button"
                    className={
                      viewMode === 'auto'
                        ? 'active'
                        : ''
                    }
                    onClick={() =>
                      chooseView('auto')
                    }
                  >
                    <span>
                      Automatique
                    </span>
                    <small>
                      Détection de l’écran
                    </small>
                  </button>

                  <button
                    type="button"
                    className={
                      viewMode === 'phone'
                        ? 'active'
                        : ''
                    }
                    onClick={() =>
                      chooseView('phone')
                    }
                  >
                    <span>
                      Téléphone
                    </span>
                    <small>
                      Largeur mobile
                    </small>
                  </button>

                  <button
                    type="button"
                    className={
                      viewMode === 'tablet'
                        ? 'active'
                        : ''
                    }
                    onClick={() =>
                      chooseView('tablet')
                    }
                  >
                    <span>
                      Tablette
                    </span>
                    <small>
                      Interface tablette
                    </small>
                  </button>

                  <button
                    type="button"
                    className={
                      viewMode === 'pc'
                        ? 'active'
                        : ''
                    }
                    onClick={() =>
                      chooseView('pc')
                    }
                  >
                    <span>
                      PC
                    </span>
                    <small>
                      Interface complète
                    </small>
                  </button>
                </div>
              )}
            </div>

            <div className="nukutepipiLogoWrap">
              <img
                src="/images/nukutepipi.jpg"
                alt="Nukutepipi"
              />
            </div>

            <UserMenu />
          </div>
        </header>

        <div className="viewStage">
          <div className="viewCanvas">
            {children}
          </div>
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
          <div className="mobileMenuHeader">
            <div>
              <span>
                NUKUTEPIPI
              </span>
              <strong>
                Tous les modules
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
                      : ''
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
      )}

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          min-width: 0;
          max-width: 100%;
        }

        body {
          overflow-x: auto;
        }

        .nukuShell {
          min-height: 100vh;
          background: #f4f6f9;
        }

        .sidebar {
          position: fixed;
          inset: 0 auto 0 0;
          z-index: 60;
          width: 208px;
          display: flex;
          flex-direction: column;
          background: #0c1525;
          color: #fff;
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
          background: #fff;
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

        .tabletClose {
          display: none;
          margin-left: auto;
          width: 36px;
          height: 36px;
          border: 0;
          border-radius: 10px;
          background: rgba(255,255,255,.08);
          color: #fff;
          font-size: 22px;
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
          z-index: 50;
          height: 78px;
          padding: 0 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          background: rgba(255,255,255,.97);
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
          gap: 12px;
        }

        .topbarTitle {
          display: flex;
          flex-direction: column;
          min-width: 0;
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

        .viewSelector {
          position: relative;
        }

        .viewSelectorButton {
          min-width: 118px;
          height: 44px;
          padding: 6px 10px;
          border: 1px solid #dfe3ea;
          border-radius: 12px;
          background: #fff;
          color: #344054;
          display: grid;
          grid-template-columns:
            1fr auto;
          grid-template-rows:
            auto auto;
          column-gap: 8px;
          text-align: left;
          cursor: pointer;
        }

        .viewSelectorButton span {
          grid-column: 1;
          color: #98a2b3;
          font-size: 9px;
        }

        .viewSelectorButton strong {
          grid-column: 1;
          font-size: 11px;
        }

        .viewSelectorButton b {
          grid-column: 2;
          grid-row: 1 / span 2;
          align-self: center;
          font-size: 14px;
        }

        .viewSelectorMenu {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          z-index: 200;
          width: 230px;
          padding: 8px;
          border: 1px solid #dfe3ea;
          border-radius: 14px;
          background: #fff;
          box-shadow: 0 20px 50px rgba(15,23,42,.16);
        }

        .viewSelectorMenu button {
          width: 100%;
          padding: 10px 11px;
          border: 0;
          border-radius: 10px;
          background: transparent;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          color: #344054;
          cursor: pointer;
        }

        .viewSelectorMenu button.active {
          background: #eef3f8;
          color: #0c1525;
        }

        .viewSelectorMenu span {
          font-size: 12px;
          font-weight: 800;
        }

        .viewSelectorMenu small {
          margin-top: 2px;
          color: #98a2b3;
          font-size: 10px;
        }

        .viewStage {
          width: 100%;
          min-width: 0;
          overflow: auto;
        }

        .viewCanvas {
          min-width: 0;
          background: #f4f6f9;
        }

        .mobileNav,
        .mobileMenuScreen,
        .tabletOverlay {
          display: none;
        }

        /* PC */
        .view-pc .sidebar {
          display: flex;
          transform: none;
        }

        .view-pc .main {
          margin-left: 208px;
        }

        .view-pc .viewCanvas {
          width: 100%;
          max-width: none;
          margin: 0;
        }

        /* TABLETTE */
        .view-tablet .sidebar {
          width: 260px;
          transform: translateX(-100%);
          transition: transform .2s ease;
          box-shadow: 18px 0 50px rgba(0,0,0,.18);
        }

        .view-tablet .sidebar.tabletOpen {
          transform: translateX(0);
        }

        .view-tablet .tabletClose {
          display: grid;
          place-items: center;
        }

        .view-tablet .main {
          margin-left: 0;
        }

        .view-tablet .tabletMenuButton {
          display: grid;
          place-items: center;
        }

        .view-tablet .tabletOverlay {
          display: block;
          position: fixed;
          inset: 0;
          z-index: 55;
          border: 0;
          background: rgba(10,18,30,.34);
        }

        .view-tablet .viewStage {
          display: flex;
          justify-content: center;
          padding: 16px;
        }

        .view-tablet .viewCanvas {
          width: min(100%, 1024px);
          min-width: 768px;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 0 0 1px #e6e9ef;
        }

        /* TÉLÉPHONE */
        .view-phone {
          min-width: 0;
          overflow-x: hidden;
          padding-bottom:
            calc(72px + env(safe-area-inset-bottom));
        }

        .view-phone .sidebar,
        .view-phone .tabletOverlay {
          display: none !important;
        }

        .view-phone .main {
          width: 100%;
          min-width: 0;
          margin-left: 0;
        }

        .view-phone .topbar {
          height: 62px;
          padding: 0 10px;
        }

        .view-phone .tabletMenuButton,
        .view-phone .topbarTitle .eyebrow {
          display: none;
        }

        .view-phone .topbarTitle strong {
          font-size: 12px;
        }

        .view-phone .topbarRight {
          gap: 5px;
        }

        .view-phone .viewSelectorButton {
          min-width: 94px;
          height: 38px;
          padding: 4px 7px;
        }

        .view-phone .viewSelectorButton span {
          display: none;
        }

        .view-phone .viewSelectorButton strong {
          font-size: 10px;
          align-self: center;
        }

        .view-phone .nukutepipiLogoWrap {
          width: 48px;
          height: 32px;
        }

        .view-phone .viewStage {
          width: 100%;
          padding: 0;
          overflow-x: hidden;
        }

        .view-phone .viewCanvas {
          width: 100%;
          max-width: 430px;
          min-width: 0;
          margin: 0 auto;
          overflow-x: hidden;
        }

        .view-phone .viewCanvas > * {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
        }

        .view-phone .viewCanvas .toolbar {
          display: grid !important;
          grid-template-columns: 1fr !important;
          gap: 8px !important;
        }

        .view-phone .viewCanvas .toolbar > * {
          width: 100% !important;
          min-width: 0 !important;
        }

        .view-phone .viewCanvas .formGrid {
          grid-template-columns: 1fr !important;
        }

        .view-phone .viewCanvas input,
        .view-phone .viewCanvas select,
        .view-phone .viewCanvas textarea,
        .view-phone .viewCanvas button {
          font-size: 16px;
        }

        .view-phone .viewCanvas .tableWrap {
          max-width: 100%;
          overflow-x: auto !important;
        }

        .view-phone .mobileNav {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 120;
          width: 100%;
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
        }

        .view-phone .mobileNav a,
        .view-phone .mobileNav button {
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
        }

        .view-phone .mobileNav a.active,
        .view-phone .mobileNav button.active {
          color: #0c1525;
        }

        .mobileNavIcon {
          font-size: 18px;
          line-height: 1;
        }

        .mobileNavLabel {
          width: 100%;
          padding: 0 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          text-align: center;
          font-size: 9px;
          font-weight: 700;
        }

        .view-phone .mobileMenuScreen {
          position: fixed;
          inset: 0;
          z-index: 250;
          display: flex;
          flex-direction: column;
          background: #f4f6f9;
        }

        .mobileMenuHeader {
          min-height: 72px;
          padding:
            calc(10px + env(safe-area-inset-top))
            16px
            10px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #fff;
          border-bottom: 1px solid #e7eaf0;
        }

        .mobileMenuHeader > div {
          display: flex;
          flex-direction: column;
        }

        .mobileMenuHeader span {
          color: #98a2b3;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: .08em;
        }

        .mobileMenuHeader strong {
          margin-top: 2px;
          font-size: 19px;
        }

        .mobileMenuHeader button {
          width: 44px;
          height: 44px;
          border: 1px solid #e4e7ec;
          border-radius: 12px;
          background: #fff;
          font-size: 25px;
        }

        .mobileMenuGrid {
          flex: 1;
          overflow-y: auto;
          padding:
            16px
            14px
            calc(24px + env(safe-area-inset-bottom));
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0,1fr));
          gap: 10px;
          align-content: start;
        }

        .mobileMenuGrid a {
          min-width: 0;
          min-height: 72px;
          padding: 11px;
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
        }

        .mobileMenuGrid a.active {
          background: #eef3f8;
          color: #0c1525;
        }

        .mobileMenuIcon {
          width: 34px;
          height: 34px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          border-radius: 10px;
          background: #f2f4f7;
        }

        @media (max-width: 420px) {
          .view-phone .nukutepipiLogoWrap {
            display: none;
          }

          .view-phone .topbarTitle strong {
            max-width: 110px;
            overflow: hidden;
            text-overflow: ellipsis;
          }
        }
      `}</style>
    </div>
  )
}

export default AppShell