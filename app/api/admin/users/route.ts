import {
  NextRequest,
  NextResponse,
} from 'next/server'

import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase-admin'

type AppRole =
  | 'admin'
  | 'department_manager'
  | 'requisitionnaire'

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL!

const publishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

async function requireAdmin(
  request: NextRequest
) {
  const authorization =
    request.headers.get(
      'authorization'
    )

  const token =
    authorization?.startsWith(
      'Bearer '
    )
      ? authorization.slice(7)
      : ''

  if (!token) {
    return {
      ok: false as const,
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

  const authClient =
    createClient(
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
    data: {
      user,
    },
    error: userError,
  } =
    await authClient.auth.getUser(
      token
    )

  if (
    userError ||
    !user
  ) {
    return {
      ok: false as const,
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

  const {
    data: profile,
    error: profileError,
  } = await supabaseAdmin
    .from('profiles')
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
    profile.active === false ||
    profile.role !== 'admin'
  ) {
    return {
      ok: false as const,
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
    ok: true as const,
    user,
  }
}

async function listAuthUsers() {
  const users = []
  let page = 1

  while (true) {
    const {
      data,
      error,
    } =
      await supabaseAdmin.auth.admin.listUsers(
        {
          page,
          perPage: 1000,
        }
      )

    if (error) {
      throw error
    }

    users.push(
      ...data.users
    )

    if (
      data.users.length < 1000
    ) {
      break
    }

    page += 1
  }

  return users
}

export async function GET(
  request: NextRequest
) {
  const access =
    await requireAdmin(
      request
    )

  if (!access.ok) {
    return access.response
  }

  try {
    const [
      authUsers,
      profilesResult,
      departmentsResult,
    ] = await Promise.all([
      listAuthUsers(),

      supabaseAdmin
        .from('profiles')
        .select(
          'id, full_name, first_name, last_name, job_title, role, department_id, active, created_at'
        )
        .order(
          'created_at',
          {
            ascending:
              true,
          }
        ),

      supabaseAdmin
        .from('departments')
        .select(
          'id, name, active'
        )
        .order('name'),
    ])

    if (
      profilesResult.error
    ) {
      throw profilesResult.error
    }

    if (
      departmentsResult.error
    ) {
      throw departmentsResult.error
    }

    const authById =
      new Map(
        authUsers.map(
          (user) => [
            user.id,
            user,
          ]
        )
      )

    const users =
      (
        profilesResult.data ||
        []
      ).map(
        (profile) => {
          const authUser =
            authById.get(
              profile.id
            )

          return {
            ...profile,
            email:
              authUser?.email ||
              '',
            email_confirmed:
              Boolean(
                authUser
                  ?.email_confirmed_at
              ),
            last_sign_in_at:
              authUser
                ?.last_sign_in_at ||
              null,
          }
        }
      )

    return NextResponse.json(
      {
        users,
        departments:
          departmentsResult.data ||
          [],
      }
    )
  } catch (error) {
    console.error(error)

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

export async function POST(
  request: NextRequest
) {
  const access =
    await requireAdmin(
      request
    )

  if (!access.ok) {
    return access.response
  }

  try {
    const body =
      await request.json()

    const firstName =
      String(
        body.first_name || ''
      ).trim()

    const lastName =
      String(
        body.last_name || ''
      ).trim()

    const email =
      String(
        body.email || ''
      )
        .trim()
        .toLowerCase()

    const password =
      String(
        body.password || ''
      )

    const jobTitle =
      String(
        body.job_title || ''
      ).trim()

    const departmentId =
      body.department_id
        ? String(
            body.department_id
          )
        : null

    const role =
      String(
        body.role || ''
      ) as AppRole

    if (
      !firstName ||
      !lastName ||
      !email ||
      !password
    ) {
      return NextResponse.json(
        {
          error:
            'Nom, prénom, email et mot de passe sont obligatoires.',
        },
        {
          status: 400,
        }
      )
    }

    if (
      password.length < 8
    ) {
      return NextResponse.json(
        {
          error:
            'Le mot de passe doit contenir au moins 8 caractères.',
        },
        {
          status: 400,
        }
      )
    }

    if (
      ![
        'admin',
        'department_manager',
        'requisitionnaire',
      ].includes(role)
    ) {
      return NextResponse.json(
        {
          error:
            'Rôle invalide.',
        },
        {
          status: 400,
        }
      )
    }

    const {
      data:
        createUserData,
      error:
        createUserError,
    } =
      await supabaseAdmin.auth.admin.createUser(
        {
          email,
          password,
          email_confirm: true,
        }
      )

    if (
      createUserError ||
      !createUserData.user
    ) {
      throw (
        createUserError ||
        new Error(
          "Impossible de créer l'utilisateur."
        )
      )
    }

    const userId =
      createUserData.user.id

    const fullName =
      `${firstName} ${lastName}`.trim()

    const {
      error:
        profileError,
    } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        full_name:
          fullName,
        first_name:
          firstName,
        last_name:
          lastName,
        job_title:
          jobTitle || null,
        role,
        department_id:
          departmentId,
        active: true,
      })

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(
        userId
      )

      throw profileError
    }

    return NextResponse.json(
      {
        success: true,
        id: userId,
      }
    )
  } catch (error) {
    console.error(error)

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

export async function PATCH(
  request: NextRequest
) {
  const access =
    await requireAdmin(
      request
    )

  if (!access.ok) {
    return access.response
  }

  try {
    const body =
      await request.json()

    const id =
      String(
        body.id || ''
      )

    if (!id) {
      return NextResponse.json(
        {
          error:
            'Utilisateur manquant.',
        },
        {
          status: 400,
        }
      )
    }

    const firstName =
      String(
        body.first_name || ''
      ).trim()

    const lastName =
      String(
        body.last_name || ''
      ).trim()

    const email =
      String(
        body.email || ''
      )
        .trim()
        .toLowerCase()

    const password =
      String(
        body.password || ''
      )

    const jobTitle =
      String(
        body.job_title || ''
      ).trim()

    const departmentId =
      body.department_id
        ? String(
            body.department_id
          )
        : null

    const role =
      String(
        body.role || ''
      ) as AppRole

    const active =
      Boolean(
        body.active
      )

    if (
      !firstName ||
      !lastName ||
      !email
    ) {
      return NextResponse.json(
        {
          error:
            'Nom, prénom et email sont obligatoires.',
        },
        {
          status: 400,
        }
      )
    }

    if (
      password &&
      password.length < 8
    ) {
      return NextResponse.json(
        {
          error:
            'Le nouveau mot de passe doit contenir au moins 8 caractères.',
        },
        {
          status: 400,
        }
      )
    }

    if (
      ![
        'admin',
        'department_manager',
        'requisitionnaire',
      ].includes(role)
    ) {
      return NextResponse.json(
        {
          error:
            'Rôle invalide.',
        },
        {
          status: 400,
        }
      )
    }

    if (
      id ===
        access.user.id &&
      (
        !active ||
        role !== 'admin'
      )
    ) {
      return NextResponse.json(
        {
          error:
            'Tu ne peux pas désactiver ton propre compte administrateur ni retirer ton rôle Admin.',
        },
        {
          status: 400,
        }
      )
    }

    const authUpdate:
      {
        email?: string
        password?: string
      } = {
      email,
    }

    if (password) {
      authUpdate.password =
        password
    }

    const {
      error:
        authUpdateError,
    } =
      await supabaseAdmin.auth.admin.updateUserById(
        id,
        authUpdate
      )

    if (
      authUpdateError
    ) {
      throw authUpdateError
    }

    const fullName =
      `${firstName} ${lastName}`.trim()

    const {
      error:
        profileError,
    } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name:
          fullName,
        first_name:
          firstName,
        last_name:
          lastName,
        job_title:
          jobTitle || null,
        role,
        department_id:
          departmentId,
        active,
      })
      .eq(
        'id',
        id
      )

    if (profileError) {
      throw profileError
    }

    return NextResponse.json(
      {
        success: true,
      }
    )
  } catch (error) {
    console.error(error)

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

export async function DELETE(
  request: NextRequest
) {
  const access =
    await requireAdmin(
      request
    )

  if (!access.ok) {
    return access.response
  }

  try {
    const body =
      await request.json()

    const id =
      String(
        body.id || ''
      )

    if (!id) {
      return NextResponse.json(
        {
          error:
            'Utilisateur manquant.',
        },
        {
          status: 400,
        }
      )
    }

    if (
      id ===
      access.user.id
    ) {
      return NextResponse.json(
        {
          error:
            'Tu ne peux pas supprimer ton propre compte administrateur.',
        },
        {
          status: 400,
        }
      )
    }

    const {
      error,
    } =
      await supabaseAdmin.auth.admin.deleteUser(
        id
      )

    if (error) {
      throw error
    }

    return NextResponse.json(
      {
        success: true,
      }
    )
  } catch (error) {
    console.error(error)

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