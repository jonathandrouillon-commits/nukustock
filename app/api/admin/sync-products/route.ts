import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase-admin'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

type LocalProduct = {
  id: string
  internalRef: string
  supplierRef: string
  name: string
  brand?: string
  packaging: string
  unit: string
  purchasePrice: number
  minStock: number
}

async function requireAdmin(request: NextRequest) {
  const authorization = request.headers.get('authorization')
  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice(7)
    : ''

  if (!token) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      ),
    }
  }

  const authClient = createClient(
    supabaseUrl,
    publishableKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  )

  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser(token)

  if (userError || !user) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: 'Session invalide' },
        { status: 401 }
      ),
    }
  }

  const {
    data: profile,
    error: profileError,
  } = await supabaseAdmin
    .from('profiles')
    .select('role, active')
    .eq('id', user.id)
    .maybeSingle()

  if (
    profileError ||
    !profile ||
    profile.active === false ||
    profile.role !== 'admin'
  ) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: 'Accès administrateur requis' },
        { status: 403 }
      ),
    }
  }

  return {
    ok: true as const,
    user,
  }
}

const cleanText = (value: unknown) =>
  String(value ?? '').trim()

export async function POST(request: NextRequest) {
  const access = await requireAdmin(request)

  if (!access.ok) {
    return access.response
  }

  try {
    const body = await request.json()

    const products =
      Array.isArray(body.products)
        ? (body.products as LocalProduct[])
        : []

    if (!products.length) {
      return NextResponse.json(
        {
          error:
            'Aucun produit local à synchroniser.',
        },
        { status: 400 }
      )
    }

    let inserted = 0
    let updated = 0
    let skipped = 0

    const errors: {
      product: string
      message: string
    }[] = []

    for (const product of products) {
      const name =
        cleanText(product.name)

      const internalRef =
        cleanText(
          product.internalRef
        )

      if (
        !name ||
        !internalRef
      ) {
        skipped += 1
        continue
      }

      const row = {
        internal_reference:
          internalRef,
        supplier_reference:
          cleanText(
            product.supplierRef
          ) || null,
        barcode: null,
        name,
        category_id: null,
        brand:
          cleanText(
            product.brand
          ) || null,
        packaging:
          cleanText(
            product.packaging
          ) || null,
        base_unit:
          cleanText(
            product.unit
          ) || 'unité',
        units_per_case: 1,
        default_unit_cost:
          Math.max(
            0,
            Number(
              product.purchasePrice
            ) || 0
          ),
        minimum_stock:
          Math.max(
            0,
            Number(
              product.minStock
            ) || 0
          ),
        active: true,
      }

      const {
        data: existing,
        error: lookupError,
      } = await supabaseAdmin
        .from('products')
        .select('id')
        .eq(
          'internal_reference',
          internalRef
        )
        .maybeSingle()

      if (lookupError) {
        errors.push({
          product: name,
          message:
            lookupError.message,
        })
        continue
      }

      if (existing?.id) {
        const {
          error: updateError,
        } = await supabaseAdmin
          .from('products')
          .update(row)
          .eq(
            'id',
            existing.id
          )

        if (updateError) {
          errors.push({
            product: name,
            message:
              updateError.message,
          })
          continue
        }

        updated += 1
      } else {
        const {
          error: insertError,
        } = await supabaseAdmin
          .from('products')
          .insert({
            id:
              crypto.randomUUID(),
            ...row,
          })

        if (insertError) {
          errors.push({
            product: name,
            message:
              insertError.message,
          })
          continue
        }

        inserted += 1
      }
    }

    return NextResponse.json({
      success:
        errors.length === 0,
      inserted,
      updated,
      skipped,
      errors,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Erreur serveur',
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest
) {
  const access =
    await requireAdmin(request)

  if (!access.ok) {
    return access.response
  }

  try {
    const {
      count: beforeCount,
      error: countBeforeError,
    } = await supabaseAdmin
      .from('products')
      .select(
        'id',
        {
          count: 'exact',
          head: true,
        }
      )
      .eq(
        'active',
        true
      )

    if (countBeforeError) {
      throw countBeforeError
    }

    // Supprime les lots pour éviter que d'anciens stocks
    // réapparaissent lors d'un futur import/réactivation.
    const {
      error: lotsError,
    } = await supabaseAdmin
      .from('product_lots')
      .delete()
      .not(
        'id',
        'is',
        null
      )

    if (lotsError) {
      throw lotsError
    }

    // On désactive tous les produits au lieu de supprimer
    // physiquement les lignes afin de préserver les éventuelles
    // références historiques (commandes, réquisitions, mouvements).
    const {
      error: productsError,
    } = await supabaseAdmin
      .from('products')
      .update({
        active: false,
      })
      .eq(
        'active',
        true
      )

    if (productsError) {
      throw productsError
    }

    const {
      count: remainingActive,
      error: verifyError,
    } = await supabaseAdmin
      .from('products')
      .select(
        'id',
        {
          count: 'exact',
          head: true,
        }
      )
      .eq(
        'active',
        true
      )

    if (verifyError) {
      throw verifyError
    }

    if (
      (remainingActive ?? 0) !== 0
    ) {
      return NextResponse.json(
        {
          error:
            `Suppression incomplète : ${remainingActive} produit(s) actif(s) restent dans Supabase.`,
          deleted:
            (beforeCount ?? 0) -
            (remainingActive ?? 0),
          remaining:
            remainingActive ?? 0,
        },
        {
          status: 409,
        }
      )
    }

    return NextResponse.json({
      success: true,
      deleted:
        beforeCount ?? 0,
      remaining: 0,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Erreur serveur',
      },
      {
        status: 500,
      }
    )
  }
}