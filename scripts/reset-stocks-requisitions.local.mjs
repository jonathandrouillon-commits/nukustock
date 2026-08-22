import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error(
    'NEXT_PUBLIC_SUPABASE_URL manquant dans .env.local'
  )
}

if (!serviceRoleKey) {
  throw new Error(
    'SUPABASE_SERVICE_ROLE_KEY manquant dans .env.local'
  )
}

const supabase = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  }
)

const confirmed =
  process.argv.includes('--confirm')

console.log('')
console.log('========================================')
console.log(' NUKUSTOCK - RESET STOCKS / REQUISITIONS')
console.log('========================================')
console.log('')
console.log('Cette opération va :')
console.log('')
console.log('  ✓ conserver tous les produits')
console.log('  ✓ conserver catégories / sous-catégories')
console.log('  ✓ conserver fournisseurs')
console.log('  ✓ conserver lieux de stockage')
console.log('  ✓ conserver prix / références / photos')
console.log('  ✓ conserver la capacité DLUO des produits')
console.log('  ✓ conserver les inventaires')
console.log('')
console.log('  ✗ supprimer TOUS les lots de stock')
console.log('  ✗ supprimer toutes les quantités de stock')
console.log('  ✗ supprimer toutes les DLUO / DLC saisies')
console.log('  ✗ supprimer tous les numéros de lot')
console.log('  ✗ supprimer toutes les répartitions stock par lieu')
console.log('  ✗ supprimer toutes les réquisitions')
console.log('')

async function countRows(table) {
  const {
    count,
    error,
  } = await supabase
    .from(table)
    .select('*', {
      count: 'exact',
      head: true,
    })

  if (error) {
    throw new Error(
      `Impossible de compter ${table} : ${error.message}`
    )
  }

  return count || 0
}

const [
  productsCount,
  lotsCount,
  requestsCount,
  requestLinesCount,
  inventoriesCount,
  locationsCount,
] = await Promise.all([
  countRows('products'),
  countRows('product_lots'),
  countRows('internal_requests'),
  countRows('internal_request_lines'),
  countRows('inventories').catch(() => null),
  countRows('storage_locations'),
])

console.log('ÉTAT ACTUEL')
console.log('----------------------------------------')
console.log(`Produits                : ${productsCount}`)
console.log(`Lots / lignes de stock  : ${lotsCount}`)
console.log(`Réquisitions            : ${requestsCount}`)
console.log(`Lignes de réquisition   : ${requestLinesCount}`)

console.log(
  `Inventaires             : ${
    inventoriesCount === null
      ? 'table locale / non Supabase'
      : inventoriesCount
  }`
)

console.log(`Lieux de stockage       : ${locationsCount}`)
console.log('----------------------------------------')
console.log('')

if (!confirmed) {
  console.log('AUCUNE DONNÉE N’A ÉTÉ SUPPRIMÉE.')
  console.log('')
  console.log(
    'Si les chiffres ci-dessus sont corrects, relance avec :'
  )
  console.log('')
  console.log(
    'node --env-file=.env.local .\\scripts\\reset-stocks-requisitions.local.mjs --confirm'
  )
  console.log('')
  process.exit(0)
}

console.log('RESET CONFIRMÉ...')
console.log('')

/*
  1. SUPPRESSION DES LIGNES DE RÉQUISITION
*/

if (requestLinesCount > 0) {
  const {
    error: requestLinesError,
  } = await supabase
    .from('internal_request_lines')
    .delete()
    .not('id', 'is', null)

  if (requestLinesError) {
    throw new Error(
      `Erreur suppression lignes de réquisition : ${requestLinesError.message}`
    )
  }

  console.log(
    `✓ ${requestLinesCount} ligne(s) de réquisition supprimée(s)`
  )
} else {
  console.log(
    '✓ Aucune ligne de réquisition à supprimer'
  )
}

/*
  2. SUPPRESSION DES RÉQUISITIONS
*/

if (requestsCount > 0) {
  const {
    error: requestsError,
  } = await supabase
    .from('internal_requests')
    .delete()
    .not('id', 'is', null)

  if (requestsError) {
    throw new Error(
      `Erreur suppression réquisitions : ${requestsError.message}`
    )
  }

  console.log(
    `✓ ${requestsCount} réquisition(s) supprimée(s)`
  )
} else {
  console.log(
    '✓ Aucune réquisition à supprimer'
  )
}

/*
  3. SUPPRESSION DES STOCKS

  On supprime product_lots.

  Cela efface :
  - quantité
  - DLUO / DLC
  - numéro de lot
  - affectation du lot au lieu

  MAIS les produits et les lieux restent.
*/

if (lotsCount > 0) {
  const {
    error: lotsError,
  } = await supabase
    .from('product_lots')
    .delete()
    .not('id', 'is', null)

  if (lotsError) {
    throw new Error(
      `Erreur suppression stocks : ${lotsError.message}`
    )
  }

  console.log(
    `✓ ${lotsCount} ligne(s) de stock / lot supprimée(s)`
  )
} else {
  console.log(
    '✓ Aucun lot de stock à supprimer'
  )
}

/*
  4. VÉRIFICATION
*/

const [
  finalProducts,
  finalLots,
  finalRequests,
  finalRequestLines,
  finalLocations,
] = await Promise.all([
  countRows('products'),
  countRows('product_lots'),
  countRows('internal_requests'),
  countRows('internal_request_lines'),
  countRows('storage_locations'),
])

console.log('')
console.log('========================================')
console.log(' RESET TERMINÉ')
console.log('========================================')

console.log(
  `Produits conservés       : ${finalProducts}`
)

console.log(
  `Lieux conservés          : ${finalLocations}`
)

console.log(
  `Lots / stock restants    : ${finalLots}`
)

console.log(
  `Réquisitions restantes   : ${finalRequests}`
)

console.log(
  `Lignes req. restantes    : ${finalRequestLines}`
)

console.log('========================================')
console.log('')

console.log(
  'IMPORTANT : recharge BarNuku / NukuStock sur les appareils déjà ouverts.'
)

console.log('')