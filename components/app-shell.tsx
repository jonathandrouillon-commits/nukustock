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

const VIEW_MODE_KEY = 'nukustock_view_mode'
const BAR_NUKU_HOST = 'barnuku.fenuaprobartender.com'

const barNukuNavItems: NavItem[] = [
  { href: '/bar', label: 'Accueil Bar', icon: '◉' },
  { href: '/planning-bar', label: 'Planning', icon: '▦' },
  { href: '/checklist-setup', label: 'Check List & Set Up', icon: '☑' },
]

const BAR_NUKU_ALLOWED_ROUTES = [
  '/bar',
  '/planning-bar',
  '/checklist-setup',
  '/login',
  '/forgot-password',
  '/update-password',
]

function isBarNukuPathAllowed(pathname: string) {
  return BAR_NUKU_ALLOWED_ROUTES.some(
    (href) => pathname === href || pathname.startsWith(`${href}/`)
  )
}

const navItems: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: '⌂' },
  { href: '/scan', label: 'Scan QR', icon: '⌗' },
  { href: '/products', label: 'Produits', icon: '▣' },
  { href: '/equipment-glassware', label: 'Matériel & Verrerie', icon: '▦' },
  { href: '/product-images', label: 'Photos produits', icon: '▧' },
  { href: '/stocks', label: 'Stocks', icon: '▤' },
  { href: '/stock-entry', label: 'Entrée rapide', icon: '＋' },
  { href: '/locations', label: 'Lieux de stockage', icon: '⌖' },
  { href: '/movements', label: 'Mouvements', icon: '↕' },
  { href: '/requests', label: 'Réquisitions', icon: '☷' },
  { href: '/orders', label: 'Commandes', icon: '▧' },
  { href: '/transfers', label: 'Transferts', icon: '⇄' },
  { href: '/inventory', label: 'Inventaires', icon: '☑' },
  { href: '/suppliers', label: 'Fournisseurs', icon: '◇' },
  { href: '/transport', label: 'Transport', icon: '✈' },
  { href: '/planning-bar', label: 'Planning Bar', icon: '▦' },
  { href: '/labels', label: 'Étiquettes', icon: '▦' },
  { href: '/checklist-setup', label: 'Check List & Set Up', icon: '☑' },
  { href: '/import', label: 'Import / Export', icon: '⇩' },
  { href: '/settings', label: 'Réglages', icon: '⚙' },
]

const navGroups: NavGroup[] = [
  {
    label: 'PRODUITS',
    icon: '▣',
    items: [
      { href: '/products', label: 'Produits', icon: '▣' },
      { href: '/equipment-glassware', label: 'Matériel & Verrerie', icon: '▦' },
      { href: '/product-images', label: 'Photos produits', icon: '▧' },
      { href: '/labels', label: 'Étiquettes', icon: '▦' },
    ],
  },
  {
    label: 'STOCKS',
    icon: '▤',
    items: [
      { href: '/stocks', label: 'Stocks', icon: '▤' },
      { href: '/stock-entry', label: 'Entrée rapide', icon: '＋' },
      { href: '/movements', label: 'Mouvements', icon: '↕' },
      { href: '/transfers', label: 'Transferts', icon: '⇄' },
      { href: '/inventory', label: 'Inventaires', icon: '☑' },
      { href: '/locations', label: 'Lieux de stockage', icon: '⌖' },
    ],
  },
  {
    label: 'APPROVISIONNEMENT',
    icon: '☷',
    items: [
      { href: '/requests', label: 'Réquisitions', icon: '☷' },
      { href: '/orders', label: 'Commandes', icon: '▧' },
      { href: '/suppliers', label: 'Fournisseurs', icon: '◇' },
      { href: '/transport', label: 'Transport', icon: '✈' },
    ],
  },
  {
    label: 'BAR TEAM',
    icon: '♟',
    items: [
      { href: '/planning-bar', label: 'Planning', icon: '▦' },
      { href: '/checklist-setup', label: 'Check List & Set Up', icon: '☑' },
    ],
  },
]

const mobileQuickLinks = [
  '/',
  '/stocks',
  '/requests',
  '/inventory',
  '/scan',
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


type GlobalSearchResult = {
  id: string
  title: string
  subtitle: string
  href: string
  type:
    | 'Produit'
    | 'Lieu'
    | 'Commande'
    | 'Réquisition'
    | 'Inventaire'
    | 'Mouvement'
    | 'Entrée rapide'
    | 'Module'
}

function normalizeSearch(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function AppShell({
  children,
}: {
  children: ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()

  const [isBarNuku, setIsBarNuku] = useState(false)
  const [siteModeResolved, setSiteModeResolved] = useState(false)

  const { items: products } = useProducts()
  const { items: orders } = useOrders()
  const { items: requests } = useRequests()
  const { items: inventories } = useInventories()
  const { items: movements } = useStockMovements()

  const [globalSearch, setGlobalSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)


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

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    PRODUITS: true,
    STOCKS: true,
    APPROVISIONNEMENT: true,
    'BAR TEAM': true,
  })

  const toggleGroup = (label: string) => {
    setOpenGroups((current) => ({
      ...current,
      [label]: !current[label],
    }))
  }

  const effectiveMode =
    viewMode === 'auto'
      ? resolvedAuto
      : viewMode

  const rootClass = useMemo(
    () =>
      `nskAppShell view-${effectiveMode}${isBarNuku ? ' barNukuMode' : ''}`,
    [effectiveMode, isBarNuku]
  )

  useEffect(() => {
    const hostname = window.location.hostname.toLowerCase()
    const barMode = hostname === BAR_NUKU_HOST

    setIsBarNuku(barMode)
    setSiteModeResolved(true)
  }, [])

  useEffect(() => {
    if (!siteModeResolved || !isBarNuku) return

    if (!isBarNukuPathAllowed(pathname)) {
      router.replace('/bar')
    }
  }, [isBarNuku, pathname, router, siteModeResolved])

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
      const isDesktopScreen =
        window.innerWidth >= 1200

      if (
        isDesktopScreen &&
        (saved === 'phone' ||
          saved === 'tablet')
      ) {
        setViewMode('pc')
        window.localStorage.setItem(
          VIEW_MODE_KEY,
          'pc'
        )
      } else {
        setViewMode(saved)
      }
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
    setSearchOpen(false)
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


  const globalSearchResults = useMemo<GlobalSearchResult[]>(() => {
    if (isBarNuku) return []

    const query = normalizeSearch(globalSearch)

    if (query.length < 2) return []

    const results: GlobalSearchResult[] = []

    const matches = (...values: unknown[]) =>
      values.some((value) =>
        normalizeSearch(value).includes(query)
      )

    navItems.forEach((item) => {
      if (matches(item.label, item.href)) {
        results.push({
          id: `module-${item.href}`,
          title: item.label,
          subtitle: 'Module NukuStock',
          href: item.href,
          type: 'Module',
        })
      }
    })

    products.forEach((product) => {
      if (
        matches(
          product.name,
          product.internalRef,
          product.supplierRef,
          product.category,
          product.subcategory,
          product.mainSupplier
        )
      ) {
        results.push({
          id: `product-${product.id}`,
          title: product.name,
          subtitle: [
            product.internalRef,
            product.category,
            product.subcategory,
          ]
            .filter(Boolean)
            .join(' · '),
          href: `/products?search=${encodeURIComponent(product.name)}`,
          type: 'Produit',
        })
      }
    })

    const locations = new Set<string>()
    products.forEach((product) => {
      product.lots?.forEach((lot) => {
        if (lot.location) locations.add(lot.location)
      })
    })

    Array.from(locations).forEach((location) => {
      if (matches(location)) {
        results.push({
          id: `location-${location}`,
          title: location,
          subtitle: 'Lieu de stockage',
          href: `/stocks?location=${encodeURIComponent(location)}`,
          type: 'Lieu',
        })
      }
    })

    orders.forEach((order) => {
      if (
        matches(
          order.id,
          order.supplierName,
          order.quoteNumber,
          order.purchaseOrderNumber,
          order.invoiceNumber,
          order.bl,
          order.status
        )
      ) {
        results.push({
          id: `order-${order.id}`,
          title:
            order.purchaseOrderNumber ||
            order.quoteNumber ||
            order.invoiceNumber ||
            order.id,
          subtitle: `${order.supplierName || 'Commande fournisseur'} · ${order.status}`,
          href: '/orders',
          type: 'Commande',
        })
      }
    })

    requests.forEach((request) => {
      if (
        matches(
          request.id,
          request.service,
          request.status,
          request.sourceLocation,
          request.destinationLocation
        )
      ) {
        results.push({
          id: `request-${request.id}`,
          title: request.id,
          subtitle: `${request.service} · ${request.status}`,
          href: '/requests',
          type: 'Réquisition',
        })
      }
    })

    inventories.forEach((inventory) => {
      if (
        matches(
          inventory.id,
          inventory.name,
          inventory.type,
          inventory.inventoryScope,
          inventory.location,
          ...(inventory.locations || [])
        )
      ) {
        results.push({
          id: `inventory-${inventory.id}`,
          title: inventory.name || inventory.id,
          subtitle: `${inventory.type} · ${inventory.location || inventory.locations?.join(', ') || 'Tous lieux'}`,
          href: '/inventory',
          type: 'Inventaire',
        })
      }
    })

    movements.forEach((movement) => {
      if (
        matches(
          movement.id,
          movement.referenceId,
          movement.productName,
          movement.internalRef,
          movement.fromLocation,
          movement.toLocation,
          movement.note,
          movement.supplierName,
          movement.quoteNumber,
          movement.purchaseOrderNumber,
          movement.invoiceNumber
        )
      ) {
        const isQuickEntry =
          movement.type === 'ENTREE_PRODUIT' &&
          Boolean(movement.referenceId?.startsWith('ER-'))

        results.push({
          id: `movement-${movement.id}`,
          title:
            isQuickEntry && movement.referenceId
              ? movement.referenceId
              : movement.productName,
          subtitle: [
            movement.productName,
            movement.fromLocation,
            movement.toLocation,
          ]
            .filter(Boolean)
            .join(' · '),
          href: '/movements',
          type: isQuickEntry ? 'Entrée rapide' : 'Mouvement',
        })
      }
    })

    const unique = new Map<string, GlobalSearchResult>()

    results.forEach((result) => {
      const key =
        result.type === 'Entrée rapide'
          ? `${result.type}-${result.title}`
          : result.id

      if (!unique.has(key)) unique.set(key, result)
    })

    return Array.from(unique.values()).slice(0, 12)
  }, [
    globalSearch,
    products,
    orders,
    requests,
    inventories,
    movements,
    isBarNuku,
  ])

  const openSearchResult = (result: GlobalSearchResult) => {
    setSearchOpen(false)
    setGlobalSearch('')
    router.push(result.href)
  }

  return (
    <div className={rootClass}>
      {tabletMenuOpen && (
        <button
          type="button"
          className="nskTabletOverlay"
          aria-label="Fermer le menu"
          onClick={() =>
            setTabletMenuOpen(false)
          }
        />
      )}

      <aside
        className={`nskSidebar ${
          tabletMenuOpen
            ? 'nskTabletOpen'
            : ''
        }`}
      >
        <div className="nskSidebarBrand">
          <div className="nskSidebarLogo">
            <img
              src="/images/nukutepipi.jpg"
              alt="Nukutepipi"
            />
          </div>

          <div className="nskBrandText">
            <strong>
              {isBarNuku ? 'Bar Nuku' : 'NukuStock'}
            </strong>
            <span className="nskPoweredBy">
              powered by
              <br />
              Fenua Pro Bartender
            </span>
          </div>

          <button
            type="button"
            className="nskTabletClose"
            aria-label="Fermer"
            onClick={() =>
              setTabletMenuOpen(false)
            }
          >
            ×
          </button>
        </div>

        <nav className="nskSidebarNav">
          {isBarNuku ? (
            <>
              {barNukuNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={isActive(pathname, item.href) ? 'active' : ''}
                >
                  <span className="nskSidebarIcon" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </>
          ) : (
            <>
              <Link
                href="/"
                className={isActive(pathname, '/') ? 'active' : ''}
              >
                <span className="nskSidebarIcon" aria-hidden="true">⌂</span>
                <span>Dashboard</span>
              </Link>

              <Link
                href="/scan"
                className={isActive(pathname, '/scan') ? 'active' : ''}
              >
                <span className="nskSidebarIcon" aria-hidden="true">⌗</span>
                <span>Scan QR</span>
              </Link>

              {navGroups.map((group) => {
                const groupActive = group.items.some((item) =>
                  isActive(pathname, item.href)
                )
                const groupOpen = openGroups[group.label] ?? groupActive

                return (
                  <div className="nskNavGroup" key={group.label}>
                    <button
                      type="button"
                      className={`nskNavGroupButton ${groupActive ? 'activeGroup' : ''}`}
                      onClick={() => toggleGroup(group.label)}
                      aria-expanded={groupOpen}
                    >
                      <span className="nskSidebarIcon" aria-hidden="true">
                        {group.icon}
                      </span>
                      <span className="nskNavGroupLabel">{group.label}</span>
                      <span className="nskNavChevron" aria-hidden="true">
                        {groupOpen ? '⌄' : '›'}
                      </span>
                    </button>

                    {groupOpen && (
                      <div className="nskNavGroupItems">
                        {group.items.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={isActive(pathname, item.href) ? 'active' : ''}
                          >
                            <span className="nskSidebarIcon" aria-hidden="true">
                              {item.icon}
                            </span>
                            <span>{item.label}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}

              <Link
                href="/import"
                className={isActive(pathname, '/import') ? 'active' : ''}
              >
                <span className="nskSidebarIcon" aria-hidden="true">⇩</span>
                <span>Import / Export</span>
              </Link>

              <Link
                href="/settings"
                className={isActive(pathname, '/settings') ? 'active' : ''}
              >
                <span className="nskSidebarIcon" aria-hidden="true">⚙</span>
                <span>Réglages</span>
              </Link>
            </>
          )}
        </nav>

        <div className="nskSidebarFoot">
          <strong>
            {isBarNuku ? 'Bar Nuku' : 'NukuStock'}
          </strong>
          <span>
            {isBarNuku
              ? 'Portail équipe Bar · Nukutepipi'
              : 'Gestion des stocks Nukutepipi'}
          </span>
        </div>
      </aside>

      <main className="nskMain">
        <header className="nskTopbar">
          <div className="nskTopbarLeft">
            <button
              type="button"
              className="nskTabletMenuButton"
              aria-label="Ouvrir le menu"
              onClick={() =>
                setTabletMenuOpen(true)
              }
            >
              ☰
            </button>

            <div className="nskTopbarTitle">
              <span className="nskEyebrow">
                {isBarNuku ? 'BAR NUKU' : 'NUKUTEPIPI'}
              </span>
              <strong>
                {isBarNuku ? 'Portail équipe Bar' : 'Gestion des stocks'}
              </strong>
            </div>
          </div>

          {!isBarNuku && (
          <div className="nskGlobalSearch">
            <span
              className="nskGlobalSearchIcon"
              aria-hidden="true"
            >
              ⌕
            </span>

            <input
              value={globalSearch}
              onChange={(event) => {
                setGlobalSearch(event.target.value)
                setSearchOpen(true)
              }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={(event) => {
                if (
                  event.key === 'Enter' &&
                  globalSearchResults[0]
                ) {
                  openSearchResult(globalSearchResults[0])
                }

                if (event.key === 'Escape') {
                  setSearchOpen(false)
                }
              }}
              placeholder="Rechercher produit, lieu, ER, commande..."
              aria-label="Recherche globale NukuStock"
            />

            {globalSearch && (
              <button
                type="button"
                className="nskGlobalSearchClear"
                aria-label="Effacer la recherche"
                onClick={() => {
                  setGlobalSearch('')
                  setSearchOpen(false)
                }}
              >
                ×
              </button>
            )}

            {searchOpen && globalSearch.trim().length >= 2 && (
              <div className="nskGlobalSearchResults">
                {globalSearchResults.length > 0 ? (
                  globalSearchResults.map((result) => (
                    <button
                      type="button"
                      key={result.id}
                      onMouseDown={(event) =>
                        event.preventDefault()
                      }
                      onClick={() =>
                        openSearchResult(result)
                      }
                    >
                      <span className="nskSearchType">
                        {result.type}
                      </span>

                      <span className="nskSearchText">
                        <strong>{result.title}</strong>
                        <small>
                          {result.subtitle || 'Ouvrir'}
                        </small>
                      </span>

                      <span
                        className="nskSearchArrow"
                        aria-hidden="true"
                      >
                        →
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="nskSearchEmpty">
                    Aucun résultat pour « {globalSearch} »
                  </div>
                )}
              </div>
            )}
          </div>
          )}

          <div className="nskTopbarRight">
            <div className="nskViewSelector">
              <button
                type="button"
                className="nskViewSelectorButton"
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
                <div className="nskViewSelectorMenu">
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

            <UserMenu />
          </div>
        </header>

        <div className="nskViewStage">
          <div className="nskViewCanvas">
            {children}
          </div>
        </div>
      </main>

      <nav className={`nskMobileNav ${isBarNuku ? 'nskBarMobileNav' : ''}`}>
        {(isBarNuku
          ? barNukuNavItems
          : navItems.filter((item) =>
              mobileQuickLinks.includes(item.href)
            )
        ).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={
              isActive(pathname, item.href)
                ? 'active'
                : ''
            }
          >
            <span
              className="nskMobileNavIcon"
              aria-hidden="true"
            >
              {item.icon}
            </span>
            <span className="nskMobileNavLabel">
              {item.label}
            </span>
          </Link>
        ))}

        {!isBarNuku && (
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
              className="nskMobileNavIcon"
              aria-hidden="true"
            >
              ☰
            </span>
            <span className="nskMobileNavLabel">
              Menu
            </span>
          </button>
        )}
      </nav>

      {!isBarNuku && mobileMenuOpen && (
        <div className="nskMobileMenuScreen">
          <div className="nskMobileMenuHeader">
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

          <div className="nskMobileMenuGrid">
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
                    className="nskMobileMenuIcon"
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

        .nskAppShell {
          min-height: 100vh;
          background: #f4f6f9;
        }

        .nskSidebar {
          position: fixed;
          inset: 0 auto 0 0;
          z-index: 60;
          width: 230px;
          display: flex;
          flex-direction: column;
          background: #0c1525;
          color: #fff;
        }

        .nskSidebarBrand {
          position: relative;
          min-height: 156px;
          padding: 18px 16px 16px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 10px;
          border-bottom: 1px solid rgba(255,255,255,.08);
        }

        .nskSidebarLogo {
          width: 168px;
          height: 54px;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          overflow: hidden;
          border-radius: 8px;
          background: #fff;
        }

        .nskSidebarLogo img {
          display: block;
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          object-position: left center;
        }

        .nskBrandText {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .nskBrandText strong {
          color: #fff;
          font-size: 18px;
          line-height: 1.1;
          font-weight: 900;
          letter-spacing: -.02em;
        }

        .nskBrandText .nskPoweredBy {
          margin-top: 5px;
          color: #a7b3c6;
          font-size: 10px;
          line-height: 1.35;
          font-weight: 600;
        }

        .nskTabletClose {
          display: none;
          position: absolute;
          top: 14px;
          right: 14px;
          width: 36px;
          height: 36px;
          border: 0;
          border-radius: 10px;
          background: rgba(255,255,255,.08);
          color: #fff;
          font-size: 22px;
        }

        .nskSidebarNav {
          flex: 1;
          overflow-y: auto;
          padding: 14px 10px;
        }

        .nskSidebarNav a {
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

        .nskSidebarNav a.active {
          background: #17243a;
          color: #fff;
        }

        .nskNavGroup {
          margin: 5px 0;
        }

        .nskNavGroupButton {
          width: 100%;
          min-height: 42px;
          padding: 0 12px;
          border: 0;
          border-radius: 10px;
          display: flex;
          align-items: center;
          gap: 10px;
          background: transparent;
          color: #91a0b6;
          cursor: pointer;
          text-align: left;
          font: inherit;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .045em;
        }

        .nskNavGroupButton:hover,
        .nskNavGroupButton.activeGroup {
          color: #fff;
          background: rgba(255,255,255,.035);
        }

        .nskNavGroupLabel {
          flex: 1;
        }

        .nskNavChevron {
          width: 18px;
          text-align: center;
          font-size: 15px;
          color: #728097;
        }

        .nskNavGroupItems {
          padding: 2px 0 4px 12px;
        }

        .nskNavGroupItems a {
          min-height: 38px;
          margin-bottom: 2px;
          padding-left: 10px;
          font-size: 12px;
        }

        .nskSidebarIcon {
          width: 18px;
          display: inline-flex;
          justify-content: center;
          flex: 0 0 auto;
        }

        .nskSidebarFoot {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 3px;
          border-top: 1px solid rgba(255,255,255,.08);
        }

        .nskSidebarFoot span {
          color: #728097;
          font-size: 10px;
        }

        .nskMain {
          min-height: 100vh;
          margin-left: 230px;
        }

        .nskTopbar {
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

        .nskTopbarLeft,
        .nskTopbarRight {
          display: flex;
          align-items: center;
        }

        .nskTopbarLeft {
          min-width: 0;
          gap: 12px;
        }

        .nskTopbarRight {
          flex: 0 0 auto;
          gap: 12px;
        }

        .nskGlobalSearch {
          position: relative;
          width: min(430px, 36vw);
          min-width: 220px;
        }

        .nskGlobalSearch input {
          width: 100%;
          height: 44px;
          padding: 0 42px 0 38px;
          border: 1px solid #dfe3ea;
          border-radius: 12px;
          outline: none;
          background: #fff;
          color: #101828;
          font-size: 12px;
          font-weight: 600;
        }

        .nskGlobalSearch input:focus {
          border-color: #98a2b3;
          box-shadow: 0 0 0 3px rgba(152,162,179,.12);
        }

        .nskGlobalSearchIcon {
          position: absolute;
          left: 13px;
          top: 50%;
          z-index: 2;
          transform: translateY(-50%);
          color: #667085;
          font-size: 18px;
          pointer-events: none;
        }

        .nskGlobalSearchClear {
          position: absolute;
          right: 9px;
          top: 50%;
          z-index: 3;
          width: 28px;
          height: 28px;
          transform: translateY(-50%);
          border: 0;
          border-radius: 8px;
          background: #f2f4f7;
          color: #667085;
          cursor: pointer;
          font-size: 18px;
        }

        .nskGlobalSearchResults {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          right: 0;
          z-index: 300;
          max-height: min(520px, 70vh);
          overflow-y: auto;
          padding: 7px;
          border: 1px solid #dfe3ea;
          border-radius: 14px;
          background: #fff;
          box-shadow: 0 20px 55px rgba(15,23,42,.18);
        }

        .nskGlobalSearchResults > button {
          width: 100%;
          min-height: 58px;
          padding: 8px 10px;
          border: 0;
          border-radius: 10px;
          display: grid;
          grid-template-columns: 92px minmax(0,1fr) 20px;
          align-items: center;
          gap: 9px;
          background: transparent;
          color: #101828;
          text-align: left;
          cursor: pointer;
        }

        .nskGlobalSearchResults > button:hover {
          background: #f4f6f9;
        }

        .nskSearchType {
          padding: 5px 7px;
          border-radius: 8px;
          background: #eef2f6;
          color: #475467;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          text-align: center;
          font-size: 9px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .nskSearchText {
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .nskSearchText strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 12px;
        }

        .nskSearchText small {
          margin-top: 3px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #667085;
          font-size: 10px;
        }

        .nskSearchArrow {
          color: #98a2b3;
          font-size: 15px;
        }

        .nskSearchEmpty {
          padding: 18px 12px;
          color: #667085;
          text-align: center;
          font-size: 11px;
        }

        .nskTopbarTitle {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .nskTopbarTitle .nskEyebrow {
          color: #9aa4b2;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .08em;
        }

        .nskTopbarTitle strong {
          margin-top: 2px;
          font-size: 14px;
          white-space: nowrap;
        }

        .nskTabletMenuButton {
          display: none;
          width: 42px;
          height: 42px;
          border: 1px solid #e4e7ec;
          border-radius: 12px;
          background: #fff;
          font-size: 20px;
        }

        .nskViewSelector {
          position: relative;
        }

        .nskViewSelectorButton {
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

        .nskViewSelectorButton span {
          grid-column: 1;
          color: #98a2b3;
          font-size: 9px;
        }

        .nskViewSelectorButton strong {
          grid-column: 1;
          font-size: 11px;
        }

        .nskViewSelectorButton b {
          grid-column: 2;
          grid-row: 1 / span 2;
          align-self: center;
          font-size: 14px;
        }

        .nskViewSelectorMenu {
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

        .nskViewSelectorMenu button {
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

        .nskViewSelectorMenu button.active {
          background: #eef3f8;
          color: #0c1525;
        }

        .nskViewSelectorMenu span {
          font-size: 12px;
          font-weight: 800;
        }

        .nskViewSelectorMenu small {
          margin-top: 2px;
          color: #98a2b3;
          font-size: 10px;
        }

        .nskViewStage {
          width: 100%;
          min-width: 0;
          overflow: auto;
        }

        .nskViewCanvas {
          min-width: 0;
          background: #f4f6f9;
        }

        .nskMobileNav,
        .nskMobileMenuScreen,
        .nskTabletOverlay {
          display: none;
        }

        /* PC */
        .view-pc .nskSidebar {
          display: flex;
          transform: none;
        }

        .view-pc .nskMain {
          margin-left: 208px;
        }

        .view-pc .nskViewCanvas {
          width: 100%;
          max-width: none;
          margin: 0;
        }

        /* TABLETTE */
        .view-tablet .nskSidebar {
          width: 260px;
          transform: translateX(-100%);
          transition: transform .2s ease;
          box-shadow: 18px 0 50px rgba(0,0,0,.18);
        }

        .view-tablet .nskSidebar.nskTabletOpen {
          transform: translateX(0);
        }

        .view-tablet .nskTabletClose {
          display: grid;
          place-items: center;
        }

        .view-tablet .nskMain {
          margin-left: 0;
        }

        .view-tablet .nskTabletMenuButton {
          display: grid;
          place-items: center;
        }

        .view-tablet .nskGlobalSearch {
          width: min(360px, 42vw);
          min-width: 190px;
        }

        .view-tablet .nskTabletOverlay {
          display: block;
          position: fixed;
          inset: 0;
          z-index: 55;
          border: 0;
          background: rgba(10,18,30,.34);
        }

        .view-tablet .nskViewStage {
          display: flex;
          justify-content: center;
          padding: 16px;
        }

        .view-tablet .nskViewCanvas {
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

        .view-phone .nskSidebar,
        .view-phone .nskTabletOverlay {
          display: none !important;
        }

        .view-phone .nskMain {
          width: 100%;
          min-width: 0;
          margin-left: 0;
        }

        .view-phone .nskTopbar {
          height: 62px;
          padding: 0 10px;
        }

        .view-phone .nskTabletMenuButton,
        .view-phone .nskTopbarTitle .nskEyebrow {
          display: none;
        }

        .view-phone .nskTopbarTitle strong {
          font-size: 12px;
        }

        .view-phone .nskTopbarRight {
          gap: 5px;
        }

        .view-phone .nskGlobalSearch {
          position: static;
          width: auto;
          min-width: 0;
        }

        .view-phone .nskGlobalSearch input {
          width: 42px;
          height: 38px;
          padding: 0;
          color: transparent;
          cursor: pointer;
        }

        .view-phone .nskGlobalSearch input::placeholder {
          color: transparent;
        }

        .view-phone .nskGlobalSearchIcon {
          left: auto;
          right: 0;
          width: 42px;
          text-align: center;
        }

        .view-phone .nskGlobalSearch:focus-within {
          position: fixed;
          inset: 8px 8px auto 8px;
          z-index: 400;
          width: auto;
        }

        .view-phone .nskGlobalSearch:focus-within input {
          width: 100%;
          height: 46px;
          padding: 0 42px 0 38px;
          color: #101828;
          cursor: text;
          box-shadow: 0 12px 35px rgba(15,23,42,.18);
        }

        .view-phone .nskGlobalSearch:focus-within input::placeholder {
          color: #98a2b3;
        }

        .view-phone .nskGlobalSearch:focus-within .nskGlobalSearchIcon {
          left: 13px;
          right: auto;
          width: auto;
        }

        .view-phone .nskGlobalSearchResults {
          top: calc(100% + 7px);
          max-height: calc(100dvh - 80px);
        }

        .view-phone .nskGlobalSearchResults > button {
          grid-template-columns: 76px minmax(0,1fr) 16px;
        }

        .view-phone .nskViewSelectorButton {
          min-width: 94px;
          height: 38px;
          padding: 4px 7px;
        }

        .view-phone .nskViewSelectorButton span {
          display: none;
        }

        .view-phone .nskViewSelectorButton strong {
          font-size: 10px;
          align-self: center;
        }

        .view-phone .nskViewStage {
          width: 100%;
          padding: 0;
          overflow-x: hidden;
        }

        .view-phone .nskViewCanvas {
          width: 100%;
          max-width: 430px;
          min-width: 0;
          margin: 0 auto;
          overflow-x: hidden;
        }

        .view-phone .nskViewCanvas > * {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
        }

        .view-phone .nskViewCanvas .toolbar {
          display: grid !important;
          grid-template-columns: 1fr !important;
          gap: 8px !important;
        }

        .view-phone .nskViewCanvas .toolbar > * {
          width: 100% !important;
          min-width: 0 !important;
        }

        .view-phone .nskViewCanvas .formGrid {
          grid-template-columns: 1fr !important;
        }

        .view-phone .nskViewCanvas input,
        .view-phone .nskViewCanvas select,
        .view-phone .nskViewCanvas textarea,
        .view-phone .nskViewCanvas button {
          font-size: 16px;
        }

        /* Les listes déroulantes doivent rester totalement accessibles
           en mode Téléphone, y compris dans les fenêtres modales. */
        .view-phone .nskViewCanvas select {
          display: block !important;
          width: 100% !important;
          max-width: none !important;
          min-width: 0 !important;
          height: 48px !important;
          min-height: 48px !important;
          overflow: visible !important;
          appearance: auto !important;
          -webkit-appearance: menulist !important;
          position: relative !important;
          z-index: 1 !important;
        }

        .view-phone .nskViewStage,
        .view-phone .nskViewCanvas {
          overflow-y: visible !important;
        }

        .view-phone .modalBackdrop {
          position: fixed !important;
          inset: 0 !important;
          z-index: 500 !important;
          width: 100vw !important;
          max-width: 100vw !important;
          height: 100dvh !important;
          max-height: 100dvh !important;
          overflow: hidden !important;
        }

        .view-phone .modal {
          width: 100% !important;
          max-width: 100% !important;
          max-height: 100dvh !important;
          overflow-y: auto !important;
          overflow-x: visible !important;
          -webkit-overflow-scrolling: touch !important;
        }

        .view-phone .modal .field,
        .view-phone .modal .formGrid {
          overflow: visible !important;
        }

        .view-phone .modal select {
          position: relative !important;
          z-index: 510 !important;
          overflow: visible !important;
        }

        .view-phone .nskViewCanvas .tableWrap {
          max-width: 100%;
          overflow-x: auto !important;
        }

        .view-phone .nskMobileNav {
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

        .view-phone .nskMobileNav.nskBarMobileNav {
          grid-template-columns: repeat(3, minmax(0,1fr));
        }

        .barNukuMode .nskSidebar {
          background: #101827;
        }

        .barNukuMode .nskSidebarNav a.active {
          background: #23324a;
        }

        .barNukuMode .nskTopbar {
          border-bottom-color: #dfe5ec;
        }

        .view-phone .nskMobileNav a,
        .view-phone .nskMobileNav button {
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

        .view-phone .nskMobileNav a.active,
        .view-phone .nskMobileNav button.active {
          color: #0c1525;
        }

        .nskMobileNavIcon {
          font-size: 18px;
          line-height: 1;
        }

        .nskMobileNavLabel {
          width: 100%;
          padding: 0 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          text-align: center;
          font-size: 9px;
          font-weight: 700;
        }

        .view-phone .nskMobileMenuScreen {
          position: fixed;
          inset: 0;
          z-index: 250;
          display: flex;
          flex-direction: column;
          background: #f4f6f9;
        }

        .nskMobileMenuHeader {
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

        .nskMobileMenuHeader > div {
          display: flex;
          flex-direction: column;
        }

        .nskMobileMenuHeader span {
          color: #98a2b3;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: .08em;
        }

        .nskMobileMenuHeader strong {
          margin-top: 2px;
          font-size: 19px;
        }

        .nskMobileMenuHeader button {
          width: 44px;
          height: 44px;
          border: 1px solid #e4e7ec;
          border-radius: 12px;
          background: #fff;
          font-size: 25px;
        }

        .nskMobileMenuGrid {
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

        .nskMobileMenuGrid a {
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

        .nskMobileMenuGrid a.active {
          background: #eef3f8;
          color: #0c1525;
        }

        .nskMobileMenuIcon {
          width: 34px;
          height: 34px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          border-radius: 10px;
          background: #f2f4f7;
        }


        /* Sécurité PC : sur un écran large, le menu latéral ne peut plus
           être masqué par un ancien style global. */
        @media (min-width: 1200px) {
          .nskAppShell.view-pc .nskSidebar {
            display: flex !important;
            visibility: visible !important;
            opacity: 1 !important;
            transform: none !important;
            left: 0 !important;
          }

          .nskAppShell.view-pc .nskMain {
            margin-left: 230px !important;
            width: auto !important;
          }

          .nskAppShell.view-pc .nskMobileNav,
          .nskAppShell.view-pc .nskMobileMenuScreen,
          .nskAppShell.view-pc .nskTabletOverlay,
          .nskAppShell.view-pc .nskTabletMenuButton {
            display: none !important;
          }
        }

        @media (max-width: 420px) {
          .view-phone .nskTopbarTitle strong {
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