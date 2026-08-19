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

/*
==================================================
COMPTES BARNUKU
==================================================
*/

const users = [
  {
    employee_id: 'emma',
    name: 'EMMA',
    first_name: 'Emma',
    role_label: 'Assistante Manager',

    email:
      'emma.chadebech@outlook.fr',

    password:
      process.env.BAR_PASSWORD_EMMA,

    bar_role:
      'assistant_manager',

    bar_access:
      'all',
  },

  {
    employee_id: 'jon',
    name: 'JON',
    first_name: 'Jonathan',
    role_label: 'Manager',

    email:
      'jonathan.drouillon@gmail.com',

    password:
      process.env.BAR_PASSWORD_JON,

    bar_role:
      'manager_admin',

    bar_access:
      'all',
  },

  {
    employee_id: 'marie',
    name: 'MARIE',
    first_name: 'Marie',
    role_label: 'Barmaid',

    email:
      'ntsaimarie@gmail.com',

    password:
      process.env.BAR_PASSWORD_MARIE,

    bar_role:
      'staff',

    bar_access:
      'bar_team',
  },

  {
    employee_id: 'lola',
    name: 'LOLA',
    first_name: 'Lola',
    role_label: 'Barmaid',

    /*
     * NOUVELLE ADRESSE LOLA
     */
    email:
      'lolafabre73@gmail.com',

    /*
     * ANCIENNE ADRESSE LOLA
     * utilisée uniquement pour
     * retrouver son ancien compte.
     */
    old_email:
      'fenuaprobartender@gmail.com',

    password:
      process.env.BAR_PASSWORD_LOLA,

    bar_role:
      'staff',

    bar_access:
      'bar_team',
  },

  {
    employee_id: 'jeremy',
    name: 'JEREMY',
    first_name: 'Jeremy',
    role_label: 'Barman',

    email:
      'antoinejeremy@live.fr',

    password:
      process.env.BAR_PASSWORD_JEREMY,

    bar_role:
      'staff',

    bar_access:
      'bar_team',
  },

  {
    employee_id: 'brandon',
    name: 'BRANDON',
    first_name: 'Brandon',
    role_label: 'Barman',

    email:
      'barlabtahiti@gmail.com',

    password:
      process.env.BAR_PASSWORD_BRANDON,

    bar_role:
      'staff',

    bar_access:
      'bar_team',
  },
]

/*
==================================================
VÉRIFICATION DES MOTS DE PASSE
==================================================
*/

for (const item of users) {
  if (!item.password) {
    throw new Error(
      `Mot de passe manquant pour ${item.name}`
    )
  }
}

/*
==================================================
RÉCUPÉRATION DES UTILISATEURS SUPABASE
==================================================
*/

console.log('')
console.log('====================================')
console.log('MISE À JOUR DES COMPTES BARNUKU')
console.log('====================================')
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

const existingUsers =
  listData.users

/*
==================================================
CRÉATION / MISE À JOUR
==================================================
*/

for (const item of users) {
  console.log(
    `Traitement de ${item.name}...`
  )

  /*
   * Recherche avec l'adresse
   * actuellement souhaitée.
   */

  let existing =
    existingUsers.find(
      (user) =>
        user.email
          ?.toLowerCase() ===
        item.email.toLowerCase()
    )

  /*
   * Cas spécial LOLA :
   *
   * Si la nouvelle adresse
   * n'existe pas encore,
   * recherche de son ancien compte.
   */

  if (
    !existing &&
    item.old_email
  ) {
    existing =
      existingUsers.find(
        (user) =>
          user.email
            ?.toLowerCase() ===
          item.old_email
            .toLowerCase()
      )

    if (existing) {
      console.log(
        `Ancien compte trouvé : ${existing.email}`
      )

      console.log(
        `Nouvelle adresse : ${item.email}`
      )
    }
  }

  /*
   * Métadonnées communes
   */

  const userMetadata = {
    full_name:
      item.name,

    first_name:
      item.first_name,

    employee_id:
      item.employee_id,

    department:
      'Bar',

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
   * UTILISATEUR EXISTANT
   */

  if (existing) {
    const oldAddress =
      existing.email || ''

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
                existing.user_metadata ||
                {}
              ),

              ...userMetadata,
            },

            app_metadata: {
              ...(
                existing.app_metadata ||
                {}
              ),

              ...appMetadata,
            },
          }
        )

    if (updateError) {
      console.error('')
      console.error(
        `ERREUR ${item.name}`
      )

      console.error(
        updateError.message
      )

      console.log('')
      continue
    }

    console.log(
      `MIS À JOUR : ${item.name}`
    )

    if (
      oldAddress.toLowerCase() !==
      item.email.toLowerCase()
    ) {
      console.log(
        `ANCIEN EMAIL : ${oldAddress}`
      )

      console.log(
        `NOUVEL EMAIL : ${updated.user.email}`
      )
    } else {
      console.log(
        `EMAIL : ${updated.user.email}`
      )
    }

    console.log(
      `EMPLOYEE ID : ${item.employee_id}`
    )

    console.log(
      `RÔLE : ${item.bar_role}`
    )

    console.log(
      `ACCÈS : ${item.bar_access}`
    )

    console.log(
      'EMAIL CONFIRMÉ : OUI'
    )

    console.log('')

    continue
  }

  /*
   * UTILISATEUR INEXISTANT :
   * création du compte.
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
    console.error('')
    console.error(
      `ERREUR ${item.name}`
    )

    console.error(
      createError.message
    )

    console.log('')
    continue
  }

  console.log(
    `CRÉÉ : ${item.name}`
  )

  console.log(
    `EMAIL : ${created.user.email}`
  )

  console.log(
    `EMPLOYEE ID : ${item.employee_id}`
  )

  console.log(
    `RÔLE : ${item.bar_role}`
  )

  console.log(
    `ACCÈS : ${item.bar_access}`
  )

  console.log(
    'EMAIL CONFIRMÉ : OUI'
  )

  console.log('')
}

console.log('====================================')
console.log('TERMINÉ')
console.log('====================================')