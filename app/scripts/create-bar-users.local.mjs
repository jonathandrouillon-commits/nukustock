import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    'NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant dans .env.local'
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

const users = [
  {
    employee_id: 'emma',
    name: 'EMMA',
    first_name: 'Emma',
    role_label: 'Assistante Manager',
    email: 'emma.chadebech@outlook.fr',
    password:
      process.env.BAR_PASSWORD_EMMA,
    bar_role: 'assistant_manager',
    bar_access: 'all',
  },

  {
    employee_id: 'jon',
    name: 'JON',
    first_name: 'Jonathan',
    role_label: 'Manager',
    email: 'jonathan.drouillon@gmail.com',
    password:
      process.env.BAR_PASSWORD_JON,
    bar_role: 'manager_admin',
    bar_access: 'all',
  },

  {
    employee_id: 'marie',
    name: 'MARIE',
    first_name: 'Marie',
    role_label: 'Barmaid',
    email: 'ntsaimarie@gmail.com',
    password:
      process.env.BAR_PASSWORD_MARIE,
    bar_role: 'staff',
    bar_access: 'bar_team',
  },

  {
    employee_id: 'lola',
    name: 'LOLA',
    first_name: 'Lola',
    role_label: 'Barmaid',

    // Nouvelle adresse
    email: 'lolafabre73@gmail.com',

    // Ancienne adresse recherchée
    // pour conserver le même compte
    old_email:
      'fenuaprobartender@gmail.com',

    password:
      process.env.BAR_PASSWORD_LOLA,
    bar_role: 'staff',
    bar_access: 'bar_team',
  },

  {
    employee_id: 'jeremy',
    name: 'JEREMY',
    first_name: 'Jeremy',
    role_label: 'Barman',
    email: 'antoinejeremy@live.fr',
    password:
      process.env.BAR_PASSWORD_JEREMY,
    bar_role: 'staff',
    bar_access: 'bar_team',
  },

  {
    employee_id: 'brandon',
    name: 'BRANDON',
    first_name: 'Brandon',
    role_label: 'Barman',
    email: 'barlabtahiti@gmail.com',
    password:
      process.env.BAR_PASSWORD_BRANDON,
    bar_role: 'staff',
    bar_access: 'bar_team',
  },
]

for (const item of users) {
  if (!item.password) {
    throw new Error(
      `Mot de passe manquant dans .env.local pour ${item.name}`
    )
  }
}

console.log('')
console.log(
  '=== COMPTES BARNUKU ==='
)
console.log('')

const {
  data: listData,
  error: listError,
} =
  await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })

if (listError) {
  throw listError
}

for (const item of users) {
  console.log(
    `Traitement de ${item.name}...`
  )

  /*
   * Recherche d'abord avec
   * l'adresse actuelle.
   */
  let existing =
    listData.users.find(
      user =>
        user.email?.toLowerCase() ===
        item.email.toLowerCase()
    )

  /*
   * Pour Lola, si la nouvelle
   * adresse n'existe pas encore,
   * on recherche l'ancienne.
   */
  if (
    !existing &&
    item.old_email
  ) {
    existing =
      listData.users.find(
        user =>
          user.email
            ?.toLowerCase() ===
          item.old_email
            .toLowerCase()
      )
  }

  const userMetadata = {
    full_name: item.name,
    first_name:
      item.first_name,
    employee_id:
      item.employee_id,
    department: 'Bar',
    role:
      item.role_label,
  }

  const appMetadata = {
    employee_id:
      item.employee_id,

    employee_name:
      item.name,

    bar_role:
      item.bar_role,

    bar_access:
      item.bar_access,
  }

  /*
   * COMPTE EXISTANT
   */
  if (existing) {
    const {
      data: updated,
      error: updateError,
    } =
      await supabase.auth.admin
        .updateUserById(
          existing.id,
          {
            email:
              item.email,

            password:
              item.password,

            email_confirm:
              true,

            user_metadata: {
              ...(
                existing
                  .user_metadata ||
                {}
              ),
              ...userMetadata,
            },

            app_metadata: {
              ...(
                existing
                  .app_metadata ||
                {}
              ),
              ...appMetadata,
            },
          }
        )

    if (updateError) {
      console.error(
        `ERREUR ${item.name} :`,
        updateError.message
      )

      console.log('')
      continue
    }

    console.log(
      `MIS À JOUR : ${item.name}`
    )

    console.log(
      `Email : ${updated.user.email}`
    )

    console.log(
      `Employee ID : ${item.employee_id}`
    )

    console.log(
      `Rôle : ${item.bar_role}`
    )

    console.log('')

    continue
  }

  /*
   * NOUVEAU COMPTE
   */
  const {
    data: created,
    error: createError,
  } =
    await supabase.auth.admin
      .createUser({
        email:
          item.email,

        password:
          item.password,

        email_confirm:
          true,

        user_metadata:
          userMetadata,

        app_metadata:
          appMetadata,
      })

  if (createError) {
    console.error(
      `ERREUR ${item.name} :`,
      createError.message
    )

    console.log('')
    continue
  }

  console.log(
    `CRÉÉ : ${item.name}`
  )

  console.log(
    `Email : ${created.user.email}`
  )

  console.log(
    `Employee ID : ${item.employee_id}`
  )

  console.log(
    `Rôle : ${item.bar_role}`
  )

  console.log('')
}

console.log(
  '=== TERMINÉ ==='
)