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

type DisplayMode =
  | 'auto'
  | 'mobile'
  | 'tablet'
  | 'desktop'

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

const DISPLAY_MODE_KEY =
  'nukustock_display_mode'

const navItems: NavItem[] = [
  {
    href: '/',
    label: 'Dashboard',
    icon: '⌂',
    group: 'Stock',
  },
  {
    href: '/products',
    label: 'Produits',
    icon: '▣',
    group: 'Stock',
  },
  {
    href: '/stocks',
    label: 'Stocks',
    icon: '▤',
    group: 'Stock',
  },
  {
    href: '/locations',
    label: 'Lieux de stockage',
    icon: '⌖',
    group: 'Stock',
  },
  {
    href: '/movements',
    label: 'Mouvements',
    icon: '↕',
    group: 'Stock',
  },
  {
    href: '/requests',
    label: 'Réquisitions',
    icon: '☷',
    group: 'Opérations',
  },
  {
    href: '/orders',
    label: 'Commandes',
    icon: '▧',
    group: 'Opérations',
  },
  {
    href: '/transfers',
    label: 'Transferts',
    icon: '⇄',
    group: 'Opérations',
  },
  {
    href: '/inventory',
    label: 'Inventaires',
    icon: '☑',
    group: 'Inventaires',
  },
  {
    href: '/reports',
    label: 'Rapports',
    icon: '▥',
    group: 'Inventaires',
  },
  {
    href: '/suppliers',
    label: 'Fournisseurs',
    icon: '◇',
    group: 'Administration',
  },
  {
    href: '/import',
    label: 'Import / Export',
    icon: '⇅',
    group: 'Administration',
  },
  {
    href: '/labels',
    label: 'Étiquettes',
    icon: '▦',
    group: 'Administration',
  },
  {
    href: '/setup',
    label: 'SET UP',
    icon: '◫',
    group: 'Administration',
  },
  {
    href: '/settings',
    label: 'Réglages',
    icon: '⚙',
    group: 'Administration',
  },
]

const mobileQuickLinks = [
  '/',
  '/stocks',
  '/requests',
  '/inventory',
]

const groups:
  NavItem['group'][] = [
  'Stock',
  'Opérations',
  'Inventaires',
  'Administration',
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

function getAutoMode():
  Exclude<
    DisplayMode,
    'auto'
  > {
  if (
    typeof window ===
    'undefined'
  ) {
    return 'desktop'
  }

  if (
    window.innerWidth <=
    767
  ) {
    return 'mobile'
  }

  if (
    window.innerWidth <=
    1199
  ) {
    return 'tablet'
  }

  return 'desktop'
}

export function AppShell({
  children,
}: {
  children: ReactNode
}) {
  const pathname =
    usePathname()

  const [
    selectedMode,
    setSelectedMode,
  ] =
    useState<DisplayMode>(
      'auto'
    )

  const [
    autoMode,
    setAutoMode,
  ] =
    useState<
      Exclude<
        DisplayMode,
        'auto'
      >
    >('desktop')

  const [
    displayMenuOpen,
    setDisplayMenuOpen,
  ] =
    useState(false)

  const [
    mobileMenuOpen,
    setMobileMenuOpen,
  ] =
    useState(false)

  const [
    tabletSidebarOpen,
    setTabletSidebarOpen,
  ] =
    useState(false)

  const effectiveMode =
    selectedMode ===
    'auto'
      ? autoMode
      : selectedMode

  const shellClass =
    useMemo(
      () =>
        `appShellRoot mode-${effectiveMode}`,
      [effectiveMode]
    )

  useEffect(() => {
    const saved =
      window.localStorage.getItem(
        DISPLAY_MODE_KEY
      ) as DisplayMode | null

    if (
      saved === 'auto' ||
      saved === 'mobile' ||
      saved === 'tablet' ||
      saved === 'desktop'
    ) {
      setSelectedMode(
        saved
      )
    }

    const updateAutoMode =
      () => {
        setAutoMode(
          getAutoMode()
        )
      }

    updateAutoMode()

    window.addEventListener(
      'resize',
      updateAutoMode
    )

    return () => {
      window.removeEventListener(
        'resize',
        updateAutoMode
      )
    }
  }, [])

  useEffect(() => {
    setMobileMenuOpen(
      false
    )
    setTabletSidebarOpen(
      false
    )
    setDisplayMenuOpen(
      false
    )
  }, [pathname])

  const changeDisplayMode = (
    mode: DisplayMode
  ) => {
    setSelectedMode(mode)

    window.localStorage.setItem(
      DISPLAY_MODE_KEY,
      mode
    )

    setDisplayMenuOpen(
      false
    )

    setMobileMenuOpen(
      false
    )

    setTabletSidebarOpen(
      false
    )
  }

  return (
    <div className={shellClass}>
      {tabletSidebarOpen && (
        <button
          type="button"
          className="sidebarOverlay"
          aria-label="Fermer le menu"
          onClick={() =>
            setTabletSidebarOpen(
              false
            )
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
            <strong>
              NukuStock
            </strong>

            <span>
              Nukutepipi
            </span>
          </div>

          <button
            type="button"
            className="sidebarClose"
            aria-label="Fermer"
            onClick={() =>
              setTabletSidebarOpen(
                false
              )
            }
          >
            ×
          </button>
        </div>

        <nav className="sidebarNav">
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
                    : ''
                }
              >
                <span
                  className="sidebarIcon"
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
                setTabletSidebarOpen(
                  true
                )
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
            <div className="displayModeWrap">
              <button
                type="button"
                className="displayModeButton"
                onClick={() =>
                  setDisplayMenuOpen(
                    (current) =>
                      !current
                  )
                }
              >
                <span>
                  Affichage
                </span>

                <strong>
                  {selectedMode ===
                    'auto' &&
                    'Auto'}

                  {selectedMode ===
                    'mobile' &&
                    'Téléphone'}

                  {selectedMode ===
                    'tablet' &&
                    'Tablette'}

                  {selectedMode ===
                    'desktop' &&
                    'PC'}
                </strong>
              </button>

              {displayMenuOpen && (
                <div className="displayModeMenu">
                  <button
                    type="button"
                    className={
                      selectedMode ===
                      'auto'
                        ? 'active'
                        : ''
                    }
                    onClick={() =>
                      changeDisplayMode(
                        'auto'
                      )
                    }
                  >
                    <span>
                      Automatique
                    </span>

                    <small>
                      Détection écran
                    </small>
                  </button>

                  <button
                    type="button"
                    className={
                      selectedMode ===
                      'mobile'
                        ? 'active'
                        : ''
                    }
                    onClick={() =>
                      changeDisplayMode(
                        'mobile'
                      )
                    }
                  >
                    <span>
                      Téléphone
                    </span>

                    <small>
                      Interface mobile
                    </small>
                  </button>

                  <button
                    type="button"
                    className={
                      selectedMode ===
                      'tablet'
                        ? 'active'
                        : ''
                    }
                    onClick={() =>
                      changeDisplayMode(
                        'tablet'
                      )
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
                      selectedMode ===
                      'desktop'
                        ? 'active'
                        : ''
                    }
                    onClick={() =>
                      changeDisplayMode(
                        'desktop'
                      )
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

        <div className="pageContent">
          {children}
        </div>
      </main>

      <nav className="mobileNav">
        {navItems
          .filter(
            (item) =>
              mobileQuickLinks.includes(
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
                    : ''
                }
              >
                <span
                  className="mobileNavIcon"
                  aria-hidden="true"
                >
                  {
                    item.icon
                  }
                </span>

                <span className="mobileNavLabel">
                  {
                    item.label
                  }
                </span>
              </Link>
            )
          )}

        <button
          type="button"
          className={
            mobileMenuOpen
              ? 'active'
              : ''
          }
          onClick={() =>
            setMobileMenuOpen(
              true
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
                setMobileMenuOpen(
                  false
                )
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
          max-width: 100%;
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
          gap: 12px;
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

        .displayModeWrap {
          position: relative;
        }

        .displayModeButton {
          min-height: 40px;
          padding: 6px 10px;
          border: 1px solid #e4e7ec;
          border-radius: 10px;
          background: #fff;
          color: #344054;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: center;
          cursor: pointer;
        }

        .displayModeButton span {
          font-size: 9px;
          color: #98a2b3;
        }

        .displayModeButton strong {
          margin-top: 1px;
          font-size: 11px;
        }

        .displayModeMenu {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          z-index: 120;
          width: 220px;
          padding: 8px;
          border: 1px solid #e4e7ec;
          border-radius: 14px;
          background: #fff;
          box-shadow: 0 18px 50px rgba(15,23,42,.14);
        }

        .displayModeMenu button {
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

        .displayModeMenu button.active {
          background: #eef3f8;
          color: #0c1525;
        }

        .displayModeMenu span {
          font-size: 12px;
          font-weight: 800;
        }

        .displayModeMenu small {
          margin-top: 2px;
          color: #98a2b3;
          font-size: 10px;
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

        /*
         * MODE TABLETTE FORCÉ
         */
        .mode-tablet .sidebar {
          width: 260px;
          transform: translateX(-100%);
          box-shadow: 18px 0 50px rgba(0,0,0,.18);
        }

        .mode-tablet .sidebar.sidebarOpen {
          transform: translateX(0);
        }

        .mode-tablet .sidebarClose {
          display: grid;
          place-items: center;
        }

        .mode-tablet .main {
          margin-left: 0;
        }

        .mode-tablet .tabletMenuButton {
          display: grid;
          place-items: center;
        }

        .mode-tablet .sidebarOverlay {
          display: block;
          position: fixed;
          inset: 0;
          z-index: 55;
          border: 0;
          background: rgba(10,18,30,.34);
        }

        /*
         * MODE MOBILE FORCÉ
         */
        .mode-mobile {
          width: 100%;
          max-width: 100vw;
          overflow-x: hidden;
          padding-bottom:
            calc(72px + env(safe-area-inset-bottom));
        }

        .mode-mobile .sidebar,
        .mode-mobile .sidebarOverlay {
          display: none !important;
        }

        .mode-mobile .main {
          width: 100%;
          max-width: 100vw;
          min-width: 0;
          margin-left: 0;
          overflow-x: hidden;
        }

        .mode-mobile .topbar {
          height: 62px;
          padding: 0 10px;
        }

        .mode-mobile .tabletMenuButton,
        .mode-mobile .topbarTitle .eyebrow {
          display: none;
        }

        .mode-mobile .topbarTitle strong {
          font-size: 12px;
        }

        .mode-mobile .topbarRight {
          gap: 5px;
        }

        .mode-mobile .displayModeButton {
          min-height: 34px;
          padding: 4px 7px;
        }

        .mode-mobile .displayModeButton span {
          display: none;
        }

        .mode-mobile .displayModeButton strong {
          font-size: 10px;
        }

        .mode-mobile .nukutepipiLogoWrap {
          width: 52px;
          height: 32px;
        }

        .mode-mobile .pageContent,
        .mode-mobile .pageContent > * {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
        }

        .mode-mobile .pageContent .toolbar {
          display: grid !important;
          grid-template-columns: 1fr !important;
        }

        .mode-mobile .pageContent .formGrid {
          grid-template-columns: 1fr !important;
        }

        .mode-mobile .pageContent .tableWrap {
          max-width: calc(100vw - 24px);
          overflow-x: auto !important;
        }

        .mode-mobile .pageContent input,
        .mode-mobile .pageContent select,
        .mode-mobile .pageContent textarea,
        .mode-mobile .pageContent button {
          font-size: 16px;
        }

        .mode-mobile .mobileNav {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 80;
          width: 100vw;
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

        .mode-mobile .mobileNav a,
        .mode-mobile .mobileNav button {
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
        }

        .mode-mobile .mobileNav a.active,
        .mode-mobile .mobileNav button.active {
          color: #0c1525;
        }

        .mobileNavIcon {
          font-size: 18px;
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

        .mode-mobile .mobileMenuScreen {
          position: fixed;
          inset: 0;
          z-index: 150;
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
        }

        .mobileMenuGrid a.active {
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
        }

        /*
         * MODE DESKTOP FORCÉ
         */
        .mode-desktop .sidebar {
          transform: none !important;
        }

        .mode-desktop .main {
          margin-left: 208px !important;
        }

        .mode-desktop .tabletMenuButton,
        .mode-desktop .mobileNav,
        .mode-desktop .mobileMenuScreen,
        .mode-desktop .sidebarOverlay,
        .mode-desktop .sidebarClose {
          display: none !important;
        }

        /*
         * AUTOMATIQUE :
         * effectiveMode devient déjà
         * mobile / tablet / desktop.
         * Les classes ci-dessus sont
         * donc utilisées directement.
         */

        @media (max-width: 420px) {
          .mode-mobile .topbarTitle strong {
            max-width: 115px;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .mode-mobile .nukutepipiLogoWrap {
            display: none;
          }

          .mobileMenuGrid {
            gap: 8px;
          }

          .mobileMenuGrid a {
            padding: 10px;
            font-size: 11px;
          }
        }
      `}</style>
    </div>
  )
}

export default AppShell