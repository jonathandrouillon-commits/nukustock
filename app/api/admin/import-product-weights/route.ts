import {
  NextRequest,
  NextResponse,
} from 'next/server'

import {
  createClient,
} from '@supabase/supabase-js'

import * as XLSX from 'xlsx'

export const runtime = 'nodejs'

const supabaseUrl =
  process.env
    .NEXT_PUBLIC_SUPABASE_URL!

const publishableKey =
  process.env
    .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

const serviceRoleKey =
  process.env
    .SUPABASE_SERVICE_ROLE_KEY!

type WeightRow =
  Record<string, unknown>

type ExistingProduct = {
  id: string
  internal_reference:
    | string
    | null
  name:
    | string
    | null
}

/*
 * Client administrateur serveur.
 *
 * IMPORTANT :
 * SUPABASE_SERVICE_ROLE_KEY
 * reste uniquement côté serveur.
 */
const supabaseAdmin =
  createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        persistSession:
          false,
        autoRefreshToken:
          false,
      },
    }
  )

function normalizeText(
  value: unknown
) {
  return String(
    value ?? ''
  )
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      ''
    )
    .trim()
    .toLowerCase()
}

function valueFrom(
  row: WeightRow,
  candidates: string[]
) {
  const entries =
    Object.entries(
      row
    )

  for (
    const candidate of
    candidates
  ) {
    const wanted =
      normalizeText(
        candidate
      )

    const found =
      entries.find(
        ([key]) =>
          normalizeText(
            key
          ) === wanted
      )

    if (
      found &&
      found[1] !==
        undefined &&
      found[1] !== null &&
      String(
        found[1]
      ).trim() !== ''
    ) {
      return found[1]
    }
  }

  return ''
}

function nullableNumber(
  value: unknown
) {
  if (
    value === null ||
    value ===
      undefined ||
    value === ''
  ) {
    return null
  }

  const normalized =
    String(
      value
    )
      .replace(
        /\s/g,
        ''
      )
      .replace(
        ',',
        '.'
      )

  const parsed =
    Number(
      normalized
    )

  return Number
    .isFinite(
      parsed
    )
    ? parsed
    : null
}

async function requireAdmin(
  request: NextRequest
) {
  /*
   * Vérification configuration
   */
  if (
    !supabaseUrl ||
    !publishableKey
  ) {
    return {
      ok:
        false as const,
      response:
        NextResponse.json(
          {
            error:
              'Configuration Supabase publique manquante.',
          },
          {
            status: 500,
          }
        ),
    }
  }

  if (
    !serviceRoleKey
  ) {
    return {
      ok:
        false as const,
      response:
        NextResponse.json(
          {
            error:
              'SUPABASE_SERVICE_ROLE_KEY manquante.',
          },
          {
            status: 500,
          }
        ),
    }
  }

  /*
   * Token utilisateur
   */
  const authorization =
    request.headers.get(
      'authorization'
    )

  const token =
    authorization
      ?.startsWith(
        'Bearer '
      )
      ? authorization
          .slice(7)
      : ''

  if (!token) {
    return {
      ok:
        false as const,
      response:
        NextResponse.json(
          {
            error:
              'Non authentifié',
          },
          {
            status: 401,
          }
        ),
    }
  }

  /*
   * Client Supabase
   * pour vérifier la session.
   */
  const authClient =
    createClient(
      supabaseUrl,
      publishableKey,
      {
        auth: {
          persistSession:
            false,
          autoRefreshToken:
            false,
        },
      }
    )

  const {
    data: {
      user,
    },
    error:
      userError,
  } =
    await authClient
      .auth
      .getUser(
        token
      )

  if (
    userError ||
    !user
  ) {
    return {
      ok:
        false as const,
      response:
        NextResponse.json(
          {
            error:
              'Session invalide',
          },
          {
            status: 401,
          }
        ),
    }
  }

  /*
   * Vérification du rôle
   * administrateur.
   */
  const {
    data:
      profile,
    error:
      profileError,
  } =
    await supabaseAdmin
      .from(
        'profiles'
      )
      .select(
        'id, role, active'
      )
      .eq(
        'id',
        user.id
      )
      .maybeSingle()

  if (
    profileError ||
    !profile ||
    profile.active ===
      false ||
    profile.role !==
      'admin'
  ) {
    return {
      ok:
        false as const,
      response:
        NextResponse.json(
          {
            error:
              'Accès administrateur requis',
          },
          {
            status: 403,
          }
        ),
    }
  }

  return {
    ok:
      true as const,
    user,
  }
}

export async function POST(
  request: NextRequest
) {
  const access =
    await requireAdmin(
      request
    )

  if (
    !access.ok
  ) {
    return access
      .response
  }

  try {
    /*
     * Lecture fichier Excel
     */
    const formData =
      await request
        .formData()

    const file =
      formData.get(
        'file'
      )

    if (
      !(
        file instanceof
        File
      )
    ) {
      return NextResponse
        .json(
          {
            error:
              'Aucun fichier Excel reçu.',
          },
          {
            status: 400,
          }
        )
    }

    const buffer =
      Buffer.from(
        await file
          .arrayBuffer()
      )

    const workbook =
      XLSX.read(
        buffer,
        {
          type:
            'buffer',
          cellDates:
            true,
        }
      )

    /*
     * Recherche automatique
     * de la feuille.
     */
    const preferredSheet =
      workbook
        .SheetNames
        .find(
          (
            name
          ) =>
            [
              'stock disponible',
              'produits',
              'products',
            ].includes(
              normalizeText(
                name
              )
            )
        ) ||
      workbook
        .SheetNames[0]

    if (
      !preferredSheet
    ) {
      return NextResponse
        .json(
          {
            error:
              'Le classeur ne contient aucune feuille.',
          },
          {
            status: 400,
          }
        )
    }

    const sheet =
      workbook
        .Sheets[
          preferredSheet
        ]

    if (!sheet) {
      return NextResponse
        .json(
          {
            error:
              'La feuille Excel est introuvable.',
          },
          {
            status: 400,
          }
        )
    }

    const rows =
      XLSX.utils
        .sheet_to_json<
          WeightRow
        >(
          sheet,
          {
            defval:
              '',
            raw:
              true,
          }
        )

    if (
      !rows.length
    ) {
      return NextResponse
        .json(
          {
            error:
              'Aucune ligne trouvée dans le fichier.',
          },
          {
            status: 400,
          }
        )
    }

    /*
     * Lecture des produits
     * existants.
     */
    const {
      data:
        productsData,
      error:
        productsError,
    } =
      await supabaseAdmin
        .from(
          'products'
        )
        .select(
          'id, internal_reference, name'
        )
        .eq(
          'active',
          true
        )

    if (
      productsError
    ) {
      throw productsError
    }

    const existingProducts:
      ExistingProduct[] =
        (
          productsData ||
          []
        ) as ExistingProduct[]

    /*
     * Index des produits
     * par référence interne.
     */
    const byReference =
      new Map<
        string,
        ExistingProduct
      >()

    for (
      const product of
      existingProducts
    ) {
      if (
        !product
          .internal_reference
      ) {
        continue
      }

      byReference.set(
        normalizeText(
          product
            .internal_reference
        ),
        product
      )
    }

    let updated =
      0

    let notFound =
      0

    let ignored =
      0

    let failed =
      0

    const seen =
      new Set<
        string
      >()

    const details:
      Array<{
        reference:
          string
        product:
          string
        status:
          string
        error?:
          string
      }> = []

    /*
     * Lecture de chaque
     * ligne Excel.
     */
    for (
      const row of
      rows
    ) {
      const reference =
        String(
          valueFrom(
            row,
            [
              'Référence',
              'Reference',
              'Réf interne',
              'Ref interne',
              'Référence interne',
              'Reference interne',
            ]
          ) || ''
        ).trim()

      const productName =
        String(
          valueFrom(
            row,
            [
              'Produit',
              'Nom',
              'Désignation',
              'Designation',
              'Name',
            ]
          ) || ''
        ).trim()

      /*
       * Poids d'une unité pleine :
       * liquide + bouteille/canette.
       */
      const unitWeight =
        nullableNumber(
          valueFrom(
            row,
            [
              'Poids unitaire plein (kg)',
              'Poids unitaire (kg)',
              'Poids unitaire plein',
            ]
          )
        )

      /*
       * Poids du conditionnement :
       * contenu + emballage.
       */
      const caseWeight =
        nullableNumber(
          valueFrom(
            row,
            [
              'Poids conditionnement plein (kg)',
              'Poids conditionnement (kg)',
              'Poids conditionnement plein',
            ]
          )
        )

      /*
       * Référence obligatoire.
       */
      if (
        !reference
      ) {
        ignored +=
          1

        continue
      }

      const key =
        normalizeText(
          reference
        )

      /*
       * Évite les doublons
       * dans le fichier Excel.
       */
      if (
        seen.has(
          key
        )
      ) {
        ignored +=
          1

        continue
      }

      seen.add(
        key
      )

      /*
       * Aucun poids :
       * aucune modification.
       */
      if (
        unitWeight ===
          null &&
        caseWeight ===
          null
      ) {
        ignored +=
          1

        continue
      }

      const product:
        ExistingProduct |
        undefined =
          byReference
            .get(
              key
            )

      /*
       * Produit non trouvé
       * dans NukuStock.
       */
      if (
        !product
      ) {
        notFound +=
          1

        details.push(
          {
            reference,
            product:
              productName,
            status:
              'Produit introuvable',
          }
        )

        continue
      }

      const patch: {
        net_unit_weight_kg?:
          number
        case_weight_kg?:
          number
      } = {}

      if (
        unitWeight !==
        null
      ) {
        patch
          .net_unit_weight_kg =
          Math.max(
            0,
            unitWeight
          )
      }

      if (
        caseWeight !==
        null
      ) {
        patch
          .case_weight_kg =
          Math.max(
            0,
            caseWeight
          )
      }

      /*
       * Mise à jour Supabase.
       *
       * Rien d'autre n'est modifié :
       * ni stock, ni prix,
       * ni DLUO, ni nom.
       */
      const {
        error:
          updateError,
      } =
        await supabaseAdmin
          .from(
            'products'
          )
          .update(
            patch
          )
          .eq(
            'id',
            product.id
          )

      if (
        updateError
      ) {
        failed +=
          1

        details.push(
          {
            reference,
            product:
              product.name ||
              productName,
            status:
              'Erreur',
            error:
              updateError.message,
          }
        )

        continue
      }

      updated +=
        1

      details.push(
        {
          reference,
          product:
            product.name ||
            productName,
          status:
            'Mis à jour',
        }
      )
    }

    /*
     * Résultat retourné
     * à la page Import.
     */
    return NextResponse
      .json(
        {
          ok:
            true,

          sheet:
            preferredSheet,

          rows:
            rows.length,

          updated,

          notFound,

          ignored,

          failed,

          details,
        }
      )
  } catch (
    caughtError
  ) {
    console.error(
      'Import poids produits :',
      caughtError
    )

    return NextResponse
      .json(
        {
          error:
            caughtError instanceof
              Error
              ? caughtError
                  .message
              : String(
                  caughtError
                ),
        },
        {
          status: 500,
        }
      )
  }
}